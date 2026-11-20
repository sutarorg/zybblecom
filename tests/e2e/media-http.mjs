// Local production-build smoke tests with a synthetic PostgREST receipt endpoint.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHmac } from "node:crypto";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { createServer } from "node:http";
import { setTimeout as delay } from "node:timers/promises";

assert(existsSync(".next/BUILD_ID"), "Run npm run build before testing");
assert(
  ![".env", ".env.local", ".env.production", ".env.production.local"].some(
    existsSync,
  ),
  "Use a clean, unconfigured test worktree",
);
const bind = async (server) => {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return `http://127.0.0.1:${server.address().port}`;
};
const probe = createServer();
const origin = await bind(probe);
await new Promise((resolve) => probe.close(resolve));
const known = "job_q8w2e4r6t1y3u5i7o9p0";
const unknown = "job_abcdefghijklmnopqrst";
const received = [];
const stub = createServer(async (req, response) => {
  if (
    req.method !== "POST" ||
    req.url !== "/rest/v1/rpc/record_clipsdk_receipt"
  ) {
    response.writeHead(404).end();
    return;
  }
  let text = "";
  for await (const chunk of req) text += chunk;
  const input = JSON.parse(text);
  received.push(input);
  response
    .writeHead(200, { "Content-Type": "application/json" })
    .end(JSON.stringify(input.p_provider_job === known));
});
const secret = `whsec_${"s".repeat(32)}`;
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    new URL(origin).port,
  ],
  {
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      APP_ORIGIN: origin,
      SUPABASE_URL: await bind(stub),
      SUPABASE_PUBLISHABLE_KEY: "synthetic-public",
      SUPABASE_SECRET_KEY: "synthetic-private",
      AUTH_STATE_SECRET: "a".repeat(32),
      CLIPSDK_API_KEY: "synthetic-clip-key",
      CLIPSDK_WEBHOOK_SECRET: secret,
      NEXT_TELEMETRY_DISABLED: "1",
    },
    stdio: "inherit",
  },
);
try {
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt++) {
    ready = await fetch(origin, { signal: AbortSignal.timeout(1000) })
      .then((r) => {
        void r.body?.cancel();
        return r.ok;
      })
      .catch(() => false);
    if (ready) break;
    assert.equal(child.exitCode, null, "Next stopped before readiness");
    await delay(125);
  }
  assert(ready, "Next did not start");
  const deliver = (
    id,
    { badSignature = false, wrongCorrelation = false } = {},
  ) => {
    const body = Buffer.from(
      JSON.stringify({
        event: "job.succeeded",
        job: { id, op: "clips", status: "succeeded" },
      }),
    );
    const ts = Math.floor(Date.now() / 1000);
    const sig = createHmac("sha256", badSignature ? "wrong key" : secret)
      .update(`${ts}.`)
      .update(body)
      .digest("hex");
    return fetch(`${origin}/api/webhooks/clipsdk`, {
      method: "POST",
      body,
      headers: {
        "Content-Type": "application/json",
        "Clipsdk-Signature": `t=${ts},v1=${sig}`,
        "Clipsdk-Job-Id": id,
        "Idempotency-Key": `${wrongCorrelation ? unknown : id}:succeeded`,
      },
      signal: AbortSignal.timeout(5000),
    });
  };
  assert.equal((await deliver(known, { badSignature: true })).status, 400);
  assert.equal((await deliver(known, { wrongCorrelation: true })).status, 400);
  assert.equal(received.length, 0);
  assert.equal((await deliver(unknown)).status, 503);
  const accepted = await deliver(known);
  assert.equal(accepted.status, 200);
  assert.match(accepted.headers.get("Cache-Control"), /no-store/);
  assert.deepEqual((await accepted.json()).data, { accepted: true });
  assert.deepEqual(received, [
    { p_provider_job: unknown, p_event: "job.succeeded" },
    { p_provider_job: known, p_event: "job.succeeded" },
  ]);
  const id = "6c3b041b-0d89-4bf6-b5dd-524d00372897";
  const download = (requestOrigin) =>
    fetch(`${origin}/api/clips/download`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: requestOrigin },
      body: JSON.stringify({ projectId: id, clipId: id, asset: "mp4" }),
    });
  assert.equal(
    (await download("https://different.example.invalid")).status,
    403,
  );
  assert.equal((await download(origin)).status, 401);
  assert.equal(
    (await fetch(`${origin}/api/admin/jobs/${id}/provider`)).status,
    401,
  );
  assert.equal(
    received.length,
    2,
    "Unauthorized routes must not access the receipt stub",
  );
  console.log(
    "Media HTTP smoke passed: raw signature, correlation, receipt contract, and anonymous guards.",
  );
} finally {
  if (child.exitCode === null && child.signalCode === null) {
    const exited = once(child, "exit");
    child.kill();
    const timer = setTimeout(() => child.kill("SIGKILL"), 5000).unref();
    await exited;
    clearTimeout(timer);
  }
  stub.closeAllConnections();
  await new Promise((resolve) => stub.close(resolve));
}
