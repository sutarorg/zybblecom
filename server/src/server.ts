import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import { env, HttpError, log } from "./core";
import { registerBilling } from "./routes-billing";
import { registerCore } from "./routes-core";
import { registerOutreach } from "./routes-outreach";

// ————————————————————————————————————————————————————————————
// Zybble API — bootstrap.
// Security posture: JWT auth on all /api routes (public ones are
// explicit), zod validation, global + per-route rate limits,
// raw-body webhook verification, no-store responses, size caps.
// ————————————————————————————————————————————————————————————

async function main() {
  const app = Fastify({ logger: false, bodyLimit: 1_048_576, trustProxy: true });

  await app.register(cors, {
    origin: [env.appUrl, "http://localhost:5173", "http://localhost:4173"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });
  await app.register(rateLimit, { max: 300, timeWindow: "1 minute" });

  // Capture the raw body — webhook signatures are computed over it.
  app.addContentTypeParser("application/json", { parseAs: "string" }, (req, body, done) => {
    try {
      const text = typeof body === "string" ? body : body.toString("utf8");
      (req as unknown as { rawBody: string }).rawBody = text;
      done(null, text.length ? JSON.parse(text) : {});
    } catch (err) {
      done(err as Error);
    }
  });

  app.addHook("onSend", async (_req, reply) => {
    reply.headers({
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
      "referrer-policy": "no-referrer",
      "cache-control": "no-store",
    });
  });

  app.setErrorHandler((err, req, reply) => {
    const status =
      err instanceof HttpError ? err.status : (err as { statusCode?: number }).statusCode ?? 500;
    if (status >= 500) log.error("request failed", { path: req.url, err: String(err) });
    else log.warn("request rejected", { path: req.url, status, msg: err.message });
    void reply.status(status >= 400 ? status : 500).send({ error: err.message || "Internal error" });
  });
  app.setNotFoundHandler((_req, reply) => void reply.status(404).send({ error: "Not found" }));

  app.get("/api/health", async () => ({ ok: true, service: "zybble-api", ts: Date.now() }));

  await registerCore(app);
  await registerOutreach(app);
  await registerBilling(app);

  await app.listen({ port: env.port, host: "0.0.0.0" });
  log.info("zybble api listening", { port: env.port });
}

main().catch((err) => {
  log.error("fatal boot error", { err: String(err) });
  process.exit(1);
});
