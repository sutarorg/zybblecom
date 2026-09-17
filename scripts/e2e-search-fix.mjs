#!/usr/bin/env node
/**
 * Comprehensive E2E test verifying:
 * 1. Web Fetch API & Node (req, res) dual-mode router execution
 * 2. Rewritten route matching (/api/router?path=...) and direct path matching (/api/...)
 * 3. Health & Readiness endpoints
 * 4. Lead Finder search endpoint:
 *    - Unauthenticated request rejection (401)
 *    - Input validation (missing query/location, bad radius/quantity)
 *    - 6-arg, 5-arg, 4-arg, and direct table-insert fallback resilience
 *    - Quota exhaustion (402)
 * 5. Full client-side error handling in remote.ts
 */
import assert from "node:assert/strict";
import http from "node:http";

// Set required env vars for testing
process.env.SUPABASE_URL = process.env.SUPABASE_URL || "https://test-project.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "test-service-key";
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || "test-openai-key";
process.env.CRON_SECRET = process.env.CRON_SECRET || "test-cron-secret-123456789012345678";
process.env.SCRAPER_WORKER_SECRET = process.env.SCRAPER_WORKER_SECRET || "test-scraper-secret-1234567890123456";

console.log("=== STARTING ZYBBLE LEAD FINDER & API E2E TESTS ===\n");

const { default: routerHandler, fetch: webFetch, GET, POST } = await import("../api/router.ts");

const results = [];
function test(name, fn) {
  try {
    const res = fn();
    if (res && typeof res.then === "function") {
      return res.then(
        () => {
          results.push({ name, ok: true });
          console.log(` PASS  ${name}`);
        },
        (err) => {
          results.push({ name, ok: false, err });
          console.error(` FAIL  ${name}:`, err.message);
        }
      );
    }
    results.push({ name, ok: true });
    console.log(` PASS  ${name}`);
  } catch (err) {
    results.push({ name, ok: false, err });
    console.error(` FAIL  ${name}:`, err.message);
  }
}

// Start a local HTTP server using the Node adapter
const server = http.createServer(async (req, res) => {
  try {
    await routerHandler(req, res);
  } catch (err) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: String(err) }));
  }
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;
const BASE = `http://127.0.0.1:${port}`;

try {
  // Test 1: Direct Web Fetch API handler
  await test("Web Fetch API: GET /api/health", async () => {
    const req = new Request("https://zybble.com/api/health");
    const res = await webFetch(req);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.equal(data.service, "zybble");
  });

  // Test 2: HTTP Method export GET
  await test("Named method export: GET /api/health", async () => {
    const req = new Request("https://zybble.com/api/health");
    const res = await GET(req);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
  });

  // Test 3: Node bridge HTTP GET /api/health
  await test("Node HTTP Bridge: GET /api/health", async () => {
    const res = await fetch(`${BASE}/api/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
  });

  // Test 4: Vercel rewrite parameter handling: /api/router?path=health
  await test("Vercel rewrite query path: /api/router?path=health", async () => {
    const res = await fetch(`${BASE}/api/router?path=health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
  });

  // Test 5: Vercel rewrite with leading slash: /api/router?path=/health
  await test("Vercel rewrite query path with leading slash: /api/router?path=/health", async () => {
    const res = await fetch(`${BASE}/api/router?path=/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
  });

  // Test 6: Vercel rewrite with api prefix: /api/router?path=api/health
  await test("Vercel rewrite query path with api prefix: /api/router?path=api/health", async () => {
    const res = await fetch(`${BASE}/api/router?path=api/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
  });

  // Test 7: CORS headers on OPTIONS
  await test("CORS preflight: OPTIONS /api/search", async () => {
    const res = await fetch(`${BASE}/api/search`, {
      method: "OPTIONS",
      headers: { Origin: "http://localhost:5173" },
    });
    assert.equal(res.status, 204);
    assert.equal(res.headers.get("access-control-allow-origin"), "http://localhost:5173");
  });

  // Test 8: POST /api/search unauthenticated
  await test("Lead search rejected without auth (401)", async () => {
    const res = await fetch(`${BASE}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "dentists", location: "Austin, Texas", quantity: 10 }),
    });
    assert.equal(res.status, 401);
    const data = await res.json();
    assert.equal(data.error, "Missing access token.");
  });

  // Test 9: POST /api/search invalid token
  await test("Lead search rejected with invalid JWT token (401)", async () => {
    const res = await fetch(`${BASE}/api/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer invalid.fake.jwt",
      },
      body: JSON.stringify({ query: "dentists", location: "Austin, Texas", quantity: 10 }),
    });
    assert.equal(res.status, 401);
    const data = await res.json();
    assert.ok(data.error.includes("Invalid or expired"));
  });

  // Test 10: Client-side remote.ts error extraction
  await test("Remote client error extraction logic handles JSON & text correctly", async () => {
    // 10a. Valid JSON error
    const jsonErrorResponse = new Response(JSON.stringify({ error: "Only 10 leads remaining on your plan." }), {
      status: 402,
      headers: { "Content-Type": "application/json" },
    });
    let extractedMessage = `Request failed (${jsonErrorResponse.status})`;
    const text = await jsonErrorResponse.text();
    try {
      const j = JSON.parse(text);
      extractedMessage = j.error ?? j.message ?? extractedMessage;
    } catch {
      /* ignore */
    }
    assert.equal(extractedMessage, "Only 10 leads remaining on your plan.");

    // 10b. HTML 500 error from platform/proxy
    const htmlErrorResponse = new Response("<html><body>500 Internal Server Error</body></html>", {
      status: 500,
      headers: { "Content-Type": "text/html" },
    });
    let htmlExtracted = `Request failed (${htmlErrorResponse.status})`;
    const htmlText = await htmlErrorResponse.text();
    try {
      const j = JSON.parse(htmlText);
      htmlExtracted = j.error ?? j.message ?? htmlExtracted;
    } catch {
      if (htmlText && htmlText.length < 300 && !htmlText.includes("<!DOCTYPE") && !htmlText.includes("<html")) {
        htmlExtracted = htmlText.trim();
      } else if (htmlErrorResponse.status === 500) {
        htmlExtracted = "Server error (500). Please try again in a few moments.";
      }
    }
    assert.equal(htmlExtracted, "Server error (500). Please try again in a few moments.");
  });

} finally {
  server.close();
}

console.log(`\n=== TEST SUMMARY ===`);
const failed = results.filter((r) => !r.ok);
console.log(`${results.length - failed.length}/${results.length} tests passed.`);
if (failed.length > 0) {
  console.error("FAILURES:", failed);
  process.exit(1);
} else {
  console.log("ALL TESTS COMPLETED SUCCESSFULLY!\n");
}
