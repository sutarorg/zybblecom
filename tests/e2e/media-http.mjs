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
const stubId = "6c3b041b-0d89-4bf6-b5dd-524d00372897";
const stubEmail = "fixture@example.invalid";
const stubUser = {
  id: stubId,
  aud: "authenticated",
  role: "authenticated",
  email: stubEmail,
  email_confirmed_at: "2026-11-20T00:00:00Z",
  created_at: "2026-11-20T00:00:00Z",
  user_metadata: {},
  app_metadata: { provider: "email" },
};
const exp = Math.floor(Date.now() / 1000) + 3600;
const base64 = (value) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");
// Non-production token only; the isolated HTTP fixture owns Auth verification.
const fixtureToken = `${base64({ alg: "HS256", typ: "JWT" })}.${base64({ sub: stubId, session_id: stubId, role: "authenticated", exp })}.test`;
let loginPassword = "long established password";
let wallet = 0;
const passwordUpdates = [];
const stub = createServer(async (req, response) => {
  const path = new URL(req.url, "http://127.0.0.1").pathname;
  const send = (status, payload) =>
    response
      .writeHead(status, { "Content-Type": "application/json" })
      .end(JSON.stringify(payload));
  const body = async () => {
    let text = "";
    for await (const chunk of req) text += chunk;
    return JSON.parse(text);
  };
  if (path === "/auth/v1/token" && req.method === "POST") {
    const input = await body();
    if (input.email !== stubEmail || input.password !== loginPassword)
      return send(400, {
        error_code: "invalid_credentials",
        msg: "Synthetic incorrect password",
      });
    return send(200, {
      access_token: fixtureToken,
      refresh_token: "fixture-refresh",
      token_type: "bearer",
      expires_in: 3600,
      expires_at: exp,
      user: stubUser,
    });
  }
  if (
    path === "/auth/v1/user" &&
    req.headers.authorization === `Bearer ${fixtureToken}`
  ) {
    if (req.method === "GET") return send(200, stubUser);
    if (req.method === "PUT") {
      const input = await body();
      // Deliberately ignore current_password here: application must verify it even
      // when the hosted provider's optional current-password setting is off.
      passwordUpdates.push(input);
      loginPassword = input.password;
      return send(200, stubUser);
    }
  }
  if (path === "/auth/v1/logout" && req.method === "POST")
    return response.writeHead(204).end();
  if (
    path === "/rest/v1/profiles" &&
    req.method === "GET" &&
    req.headers.authorization === `Bearer ${fixtureToken}`
  )
    return send(200, {
      id: stubId,
      full_name: "Browser QA Fixture",
      email: stubEmail,
      onboarding_completed: true,
      suspended_at: null,
      preferences: {},
    });
  if (
    path === "/rest/v1/rpc/get_credit_summary" &&
    req.headers.authorization === `Bearer ${fixtureToken}`
  )
    return wallet === null
      ? send(500, { message: "Synthetic wallet outage" })
      : send(200, { available: wallet, reserved: 0, consumed: 0 });
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
  const input = await body();
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
  assert.equal((await signup("s".repeat(16))).status, 200);
  assert.equal((await signup("s".repeat(17))).status, 400);
  assert.deepEqual(signupPasswords, ["Example8", "s".repeat(16)]);
  const submit = (path, input, site = origin, type = "application/json") =>
    fetch(`${origin}${path}`, {
      method: "POST",
      headers: { Origin: site, "Content-Type": type },
      body: type === "application/json" ? JSON.stringify(input) : input,
    });
  const uploadBegin = {
    action: "begin",
    title: "Local HTTP guard check",
    filename: "short.mp4",
    bytes: 1000,
    mime: "video/mp4",
  };
  assert.equal((await submit("/api/uploads", uploadBegin)).status, 401);
  assert.equal(
    (await submit("/api/uploads", uploadBegin, "https://other.example.invalid"))
      .status,
    403,
  );
  assert.equal(
    (
      await submit("/api/uploads", {
        ...uploadBegin,
        objectKey: "not-a-client-field",
      })
    ).status,
    400,
  );
  const contact = {
    name: "Browser check",
    email: "fixture@example.invalid",
    topic: "Product question",
    message: "Synthetic request only.",
    website: "",
  };
  assert.equal((await submit("/api/contact", contact)).status, 503);
  assert.equal(
    (
      await submit("/api/contact", {
        ...contact,
        to: "arbitrary@example.invalid",
      })
    ).status,
    400,
  );
  assert.equal(
    (await submit("/api/contact", { ...contact, message: "x".repeat(20_000) }))
      .status,
    413,
  );
  assert.equal(
    (await submit("/api/contact", contact, "https://other.example.invalid"))
      .status,
    403,
  );
  assert.equal(
    (
      await submit(
        "/api/settings/avatar",
        "not-an-image",
        origin,
        "application/octet-stream",
      )
    ).status,
    401,
  );
  const change = {
    currentPassword: "long established password",
    password: "Example8",
    confirmPassword: "Example8",
  };
  assert.equal((await submit("/api/auth/change-password", change)).status, 401);
  assert.equal(
    (
      await submit("/api/auth/change-password", {
        ...change,
        confirmPassword: "Example9",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await submit("/api/auth/change-password", {
        ...change,
        email: contact.email,
      })
    ).status,
    400,
  );
  const login = await submit("/api/auth/login", {
    email: stubEmail,
    password: loginPassword,
  });
  assert.equal(login.status, 200);
  const cookies = login.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";", 1)[0]);
  assert(cookies.length > 0);
  const passwordChange = (payload) =>
    fetch(`${origin}/api/auth/change-password`, {
      method: "POST",
      headers: {
        Origin: origin,
        "Content-Type": "application/json",
        Cookie: cookies.join("; "),
      },
      body: JSON.stringify(payload),
    });
  assert.equal(
    (await passwordChange({ ...change, currentPassword: "incorrect" })).status,
    401,
  );
  assert.deepEqual(passwordUpdates, []);
  assert.equal(
    (
      await passwordChange({
        ...change,
        password: "z".repeat(17),
        confirmPassword: "z".repeat(17),
      })
    ).status,
    400,
  );
  assert.equal((await passwordChange(change)).status, 200);
  assert.deepEqual(passwordUpdates, [
    {
      password: change.password,
      current_password: change.currentPassword,
      code_challenge: null,
      code_challenge_method: null,
    },
  ]);
  assert.equal(
    (
      await submit("/api/auth/login", {
        email: stubEmail,
        password: change.currentPassword,
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await submit("/api/auth/login", {
        email: stubEmail,
        password: change.password,
      })
    ).status,
    200,
  );
  const uploadsWithoutR2 = await fetch(`${origin}/api/uploads`, {
    method: "POST",
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      Cookie: cookies.join("; "),
    },
    body: JSON.stringify(uploadBegin),
  });
  assert.equal(uploadsWithoutR2.status, 503);
  assert.equal((await uploadsWithoutR2.json()).error.code, "unavailable");
  if (process.env.CONNECTED_BROWSER_QA === "1") {
    const { connectedWorkspace } =
      await import("./fixtures/connected-workspace.mjs");
    await connectedWorkspace({
      origin,
      cookies,
      setWallet: (amount) => {
        wallet = amount;
      },
    });
  }
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
    "Auth and media HTTP smoke passed: runtime configuration, signup bounds, current-password enforcement, contact validation, raw signatures, receipts and anonymous guards.",
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
