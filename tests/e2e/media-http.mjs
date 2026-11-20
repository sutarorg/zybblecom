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
const signupPasswords = [];
const stub = createServer(async (req, response) => {
  const path = new URL(req.url, "http://127.0.0.1").pathname;
  if (
    req.method !== "POST" ||
    ![
      "/rest/v1/rpc/record_clipsdk_receipt",
      "/rest/v1/rpc/take_request_limit",
      "/auth/v1/signup",
    ].includes(path)
  ) {
    response.writeHead(404).end();
    return;
  }
  let text = "";
  for await (const chunk of req) text += chunk;
  const input = JSON.parse(text);
  let payload;
  if (path === "/auth/v1/signup") {
    signupPasswords.push(input.password);
    payload = {
      id: "6c3b041b-0d89-4bf6-b5dd-524d00372897",
      email: input.email,
    };
  } else if (path === "/rest/v1/rpc/take_request_limit") {
    payload = true;
  } else {
    received.push(input);
    payload = input.p_provider_job === known;
  }
  response
    .writeHead(200, { "Content-Type": "application/json" })
    .end(JSON.stringify(payload));
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
      APP_ORIGIN: `${origin}/`,
      NEXT_PUBLIC_SUPABASE_URL: await bind(stub),
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "synthetic-public",
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
  // Build without provider env, then supply it only to the deployed server.
  for (const path of ["/login", "/signup", "/forgot-password"]) {
    const page = await fetch(`${origin}${path}`, {
      signal: AbortSignal.timeout(5000),
    });
    assert.equal(page.status, 200);
    const html = await page.text();
    assert.doesNotMatch(html, /Form details won’t be sent/, path);
    assert(
      !html.includes("synthetic-private") && !html.includes(secret),
      "No server secrets in HTML",
    );
  }
  const signup = (password) =>
    fetch(`${origin}/api/auth/signup`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "fixture@example.invalid",
        password,
        fullName: "Local Fixture",
        termsAccepted: true,
      }),
      signal: AbortSignal.timeout(5000),
    });
  assert.equal((await signup("short7!")).status, 400);
  assert.deepEqual(signupPasswords, []);
  const verification = await signup("Example8");
  assert.equal(verification.status, 200);
  assert.deepEqual((await verification.json()).data, {
    verificationRequired: true,
  });
  assert.deepEqual(signupPasswords, ["Example8"]);
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
    "Auth and media HTTP smoke passed: runtime auth configuration, eight-character signup, raw signatures, receipts, and anonymous guards.",
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
