import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:net";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const browserOnly = process.argv.includes("--browser-only");
const engine = process.env.QA_BROWSER ?? "chromium";
assert(
  ["chromium", "firefox", "webkit"].includes(engine),
  "Unsupported QA browser",
);
const output = join("test-results", "launch-readiness", engine);
const suites = [
  "visual",
  "interaction",
  "account",
  "dashboard",
  "workspace",
  "studio",
  "admin",
];
const outcomes = {};
const ciEnv = { ...process.env, NEXT_TELEMETRY_DISABLED: "1" };
// Never inherit a configured application environment into disconnected tests.
for (const key of Object.keys(ciEnv)) {
  if (
    /^(SUPABASE_|AUTH_STATE_SECRET$|APP_ORIGIN$|DODO_|CLIPSDK_|R2_|VERCEL($|_)|ZYBBLE_MAINTENANCE$|SITE_URL$|ORIGIN$)/.test(
      key,
    )
  )
    delete ciEnv[key];
}
ciEnv.PRICING_COUNTRY_HEADER = "1"; // Synthetic geo headers only on this loopback fixture.
if (
  [".env", ".env.local", ".env.production", ".env.production.local"].some(
    existsSync,
  )
) {
  throw new Error(
    "Run launch QA in a clean worktree without Next .env files; the disconnected suite must not reach providers.",
  );
}
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
const node = process.execPath;
function execute(label, command, args, env = ciEnv) {
  const log = createWriteStream(join(output, `${label}.log`));
  const child = spawn(command, args, {
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => {
    log.write(chunk);
    process.stdout.write(chunk);
  });
  child.stderr.on("data", (chunk) => {
    log.write(chunk);
    process.stderr.write(chunk);
  });
  child.on("close", () => log.end());
  return child;
}
async function step(label, command, args, env) {
  console.log(`\n=== ${label} ===`);
  const child = execute(label, command, args, env);
  const timeout = setTimeout(() => child.kill("SIGKILL"), 420_000).unref();
  try {
    const [code, signal] = await once(child, "close");
    outcomes[label] = code === 0 ? "PASS" : `FAIL (${code ?? signal})`;
  } catch (error) {
    outcomes[label] = `FAIL (${error.code ?? "spawn"})`;
  } finally {
    clearTimeout(timeout);
  }
}
async function localPort() {
  const server = createServer();
  server.listen({ host: "127.0.0.1", port: 0 });
  await once(server, "listening");
  const { port } = server.address();
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  return port;
}
async function waitForApp(child, origin) {
  for (let i = 0; i < 60; i++) {
    if (child.exitCode !== null || child.signalCode !== null)
      throw new Error("QA server stopped during startup");
    const result = await fetch(`${origin}/`, {
      signal: AbortSignal.timeout(2000),
    }).catch(() => null);
    if (result?.ok) {
      await result.body?.cancel();
      return;
    }
    await delay(300);
  }
  throw new Error("QA server not ready");
}
let server;
async function startApp(label, env) {
  const port = await localPort();
  const origin = `http://127.0.0.1:${port}`;
  server = execute(
    label,
    node,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    env,
  );
  await waitForApp(server, origin);
  return origin;
}
async function stopApp() {
  if (server?.exitCode === null && server.signalCode === null) {
    const child = server;
    const exited = once(child, "close");
    child.kill("SIGTERM");
    const timer = setTimeout(() => child.kill("SIGKILL"), 5000).unref();
    await exited;
    clearTimeout(timer);
  }
  server = undefined;
}

try {
  if (!browserOnly) {
    for (const name of [
      "lint",
      "typecheck",
      "test:contracts",
      "test:db",
      "build",
    ])
      await step(name.replace(":", "-"), "npm", ["run", name]);
  }
  if (outcomes.build?.startsWith("FAIL"))
    throw new Error("Cannot test a failed build");
  if (!browserOnly)
    await step("media-http", node, ["tests/e2e/media-http.mjs"]);
  const withoutIngress = await startApp("app-untrusted-geo", {
    ...ciEnv,
    PRICING_COUNTRY_HEADER: "0",
  });
  const untrusted = await fetch(`${withoutIngress}/pricing`, {
    headers: { "x-vercel-ip-country": "IN" },
    signal: AbortSignal.timeout(10_000),
  });
  assert.equal(untrusted.status, 200);
  const prices = await untrusted.text();
  assert(
    prices.includes("$39") && !prices.includes("₹2,499"),
    "Untrusted geo must not set the currency",
  );
  outcomes["untrusted-geo"] = "PASS";
  await stopApp();
  const origin = await startApp("app", ciEnv);
  for (const name of suites) {
    await step(name, node, [`scripts/qa/${name}.mjs`], {
      ...ciEnv,
      ORIGIN: origin,
      SHOTS: join(output, name),
    });
  }
  await step("routes", node, ["tests/e2e/routes.mjs"], {
    ...ciEnv,
    ORIGIN: origin,
    SHOTS: join(output, "routes"),
  });
  if (!browserOnly && (process.env.QA_BROWSER ?? "chromium") === "chromium") {
    await step(
      "perf",
      node,
      [
        "scripts/qa/perf.mjs",
        "/",
        "/pricing",
        "/login",
        "/dashboard",
        "/projects/new",
        "/admin",
      ],
      { ...ciEnv, ORIGIN: origin },
    );
  }
} catch (error) {
  console.error(error);
  outcomes.runner = "FAIL";
} finally {
  await stopApp();
  writeFileSync(join(output, "result.json"), JSON.stringify(outcomes, null, 2));
  console.table(outcomes);
  if (Object.values(outcomes).some((outcome) => outcome !== "PASS"))
    process.exitCode = 1;
}
