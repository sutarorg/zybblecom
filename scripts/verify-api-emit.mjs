#!/usr/bin/env node
/**
 * Guards against the "500 FUNCTION_INVOCATION_FAILED on every /api/* route"
 * class of bug.
 *
 * Vercel's Node builder (@vercel/node) transpiles each api/**.ts file with
 * TypeScript's `transpileModule()` using the compilerOptions from this
 * repo's tsconfig.json. The api/ sources import with explicit ".ts"
 * extensions, which only works at runtime if TypeScript rewrites them to
 * ".js" on emit ("rewriteRelativeImportExtensions": true). If that rewrite
 * is ever lost (tsconfig edit, TypeScript downgrade below 5.7), the
 * deployed function throws ERR_MODULE_NOT_FOUND while importing
 * ./_lib/application.ts and Vercel returns a bare 500 with no JSON body.
 *
 * This script emits api/ the same way the builder does, asserts no ".ts"
 * specifiers survive, and then imports the emitted entrypoint in Node and
 * calls GET /api/health to prove it loads.
 *
 * Run: node scripts/verify-api-emit.mjs
 */
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(dirname(new URL(import.meta.url).pathname), "..");
const require = createRequire(join(root, "package.json"));
const ts = require("typescript");

const fail = (msg) => {
  console.error(`verify-api-emit: FAIL\n${msg}`);
  process.exit(1);
};

// ————— Read tsconfig exactly like the builder does —————
const configPath = join(root, "tsconfig.json");
const readResult = ts.readConfigFile(configPath, ts.sys.readFile);
if (readResult.error) fail(ts.flattenDiagnosticMessageText(readResult.error.messageText, "\n"));
const parsed = ts.parseJsonConfigFileContent(readResult.config, ts.sys, root);
const compilerOptions = { ...parsed.options, noEmit: false, sourceMap: false, inlineSourceMap: false, declaration: false };

// ————— Collect api/**/*.ts —————
const inputs = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith(".ts") && !p.endsWith(".d.ts")) inputs.push(p);
  }
};
walk(join(root, "api"));
if (inputs.length === 0) fail("no api/**/*.ts files found");

const outDir = mkdtempSync(join(tmpdir(), "zybble-api-emit-"));
try {
  // ————— Transpile (mirrors @vercel/node's transpileModule path) —————
  const offenders = [];
  for (const file of inputs) {
    const source = readFileSync(file, "utf8");
    const { outputText } = ts.transpileModule(source, { fileName: file, compilerOptions, reportDiagnostics: false });
    const rel = relative(root, file).replace(/\.ts$/, ".js");
    const dest = join(outDir, rel);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, outputText);
    const badImport = outputText.match(/(?:from\s+|import\s*\(\s*)["']([^"']+\.ts)["']/);
    if (badImport) offenders.push(`${rel}  →  ${badImport[1]}`);
  }
  if (offenders.length) {
    fail(
      "Emitted API files still import \".ts\" specifiers — Node cannot resolve these at runtime,\n" +
        "so every /api/* request would fail with 500 FUNCTION_INVOCATION_FAILED on Vercel:\n" +
        offenders.map((o) => "  " + o).join("\n") +
        '\n\nFix: keep "rewriteRelativeImportExtensions": true in tsconfig.json (TypeScript >= 5.7),\n' +
        "or drop the .ts extension from the imports in api/."
    );
  }

  // The emitted tree has no node_modules; let Node find zod/@supabase/… via
  // a symlink to the repo's install.
  const { symlinkSync } = await import("node:fs");
  symlinkSync(join(root, "node_modules"), join(outDir, "node_modules"), "dir");
  writeFileSync(join(outDir, "package.json"), JSON.stringify({ type: "module" }));

  // ————— Import the emitted entrypoint and hit /api/health —————
  process.env.VERCEL_GIT_COMMIT_SHA ??= "verify";
  let mod;
  try {
    mod = await import(pathToFileURL(join(outDir, "api", "router.js")).href);
  } catch (err) {
    fail(`emitted api/router.js failed to import (this is what Vercel would hit on cold start):\n  ${err?.code ?? ""} ${err?.message ?? err}`);
  }
  if (typeof mod.default !== "function") fail("api/router.js default export is not a function");
  const res = await mod.default(new Request("https://zybble.com/api/router?path=health"));
  if (!(res instanceof Response) || res.status !== 200) fail(`GET /api/health returned ${res?.status}`);
  console.log("verify-api-emit: OK — emitted api/router.js loads under Node and GET /api/health → 200");
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
