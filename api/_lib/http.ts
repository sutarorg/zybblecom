import { z } from "zod";
import { env, HttpError, log } from "./core";

// ————————————————————————————————————————————————————————————
// Minimal router + response helpers for the single catch-all
// serverless function. Replaces Fastify's routing, CORS,
// security headers and error handling.
// ————————————————————————————————————————————————————————————

export type Ctx = {
  req: Request;
  params: Record<string, string>;
  url: URL;
  /** Raw request body — webhook signatures are computed over these bytes. */
  raw: () => Promise<string>;
  json: <T>(schema: z.ZodType<T>) => Promise<T>;
  query: <T>(schema: z.ZodType<T>) => T;
};

export type Handler = (ctx: Ctx) => Promise<unknown> | unknown;

interface Route {
  method: string;
  segments: string[];
  handler: Handler;
}

const SECURITY_HEADERS: Record<string, string> = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "no-referrer",
  "cache-control": "no-store",
};

function allowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  const clean = origin.replace(/\/+$/, "");
  const allowlist = new Set<string>([
    env.appUrl,
    "http://localhost:5173",
    "http://localhost:4173",
  ]);
  for (const extra of (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((v) => v.trim().replace(/\/+$/, ""))
    .filter(Boolean)) {
    allowlist.add(extra);
  }
  if (allowlist.has(clean)) return clean;
  // Vercel preview deployments of this project.
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(clean)) return clean;
  return null;
}

function corsHeaders(req: Request): Record<string, string> {
  const origin = allowedOrigin(req.headers.get("origin"));
  if (!origin) return {};
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "access-control-allow-headers": "Content-Type, Authorization, X-Cron-Secret",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

export class Raw {
  constructor(
    readonly body: string,
    readonly contentType: string,
    readonly headers: Record<string, string> = {}
  ) {}
}

export class Router {
  private routes: Route[] = [];

  add(method: string, path: string, handler: Handler) {
    this.routes.push({
      method,
      segments: path.split("/").filter(Boolean),
      handler,
    });
    return this;
  }

  get = (p: string, h: Handler) => this.add("GET", p, h);
  post = (p: string, h: Handler) => this.add("POST", p, h);
  put = (p: string, h: Handler) => this.add("PUT", p, h);
  patch = (p: string, h: Handler) => this.add("PATCH", p, h);
  delete = (p: string, h: Handler) => this.add("DELETE", p, h);

  private match(method: string, segments: string[]) {
    for (const route of this.routes) {
      if (route.method !== method) continue;
      if (route.segments.length !== segments.length) continue;
      const params: Record<string, string> = {};
      let ok = true;
      for (let i = 0; i < route.segments.length; i++) {
        const spec = route.segments[i];
        if (spec.startsWith(":")) params[spec.slice(1)] = decodeURIComponent(segments[i]);
        else if (spec !== segments[i]) {
          ok = false;
          break;
        }
      }
      if (ok) return { route, params };
    }
    return null;
  }

  async handle(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const cors = corsHeaders(req);

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: { ...SECURITY_HEADERS, ...cors } });
    }

    // Vercel rewrites /api/:path* -> /api/router?path=:path*. Match against
    // that original path without rebuilding/consuming the Request body.
    const rewrittenPath = url.searchParams.get("path");
    const segments = rewrittenPath
      ? ["api", ...rewrittenPath.split("/").filter(Boolean)]
      : url.pathname.split("/").filter(Boolean);
    const found = this.match(req.method, segments);
    if (!found) {
      return json({ error: "Not found" }, 404, cors);
    }

    let rawBody: string | null = null;
    const raw = async () => {
      if (rawBody === null) rawBody = await req.text();
      return rawBody;
    };

    const ctx: Ctx = {
      req,
      url,
      params: found.params,
      raw,
      json: async <T,>(schema: z.ZodType<T>) => {
        const text = await raw();
        let parsedJson: unknown = {};
        if (text.length) {
          try {
            parsedJson = JSON.parse(text);
          } catch {
            throw new HttpError(400, "Request body must be valid JSON.");
          }
        }
        const result = schema.safeParse(parsedJson);
        if (!result.success)
          throw new HttpError(400, result.error.issues[0]?.message ?? "Invalid request.");
        return result.data;
      },
      query: <T,>(schema: z.ZodType<T>) => {
        const obj = Object.fromEntries(url.searchParams.entries());
        delete obj.path;
        const result = schema.safeParse(obj);
        if (!result.success)
          throw new HttpError(400, result.error.issues[0]?.message ?? "Invalid query.");
        return result.data;
      },
    };

    try {
      const result = await found.route.handler(ctx);
      if (result instanceof Response) {
        for (const [k, v] of Object.entries({ ...SECURITY_HEADERS, ...cors }))
          result.headers.set(k, v);
        return result;
      }
      if (result instanceof Raw) {
        return new Response(result.body, {
          status: 200,
          headers: {
            "content-type": result.contentType,
            ...SECURITY_HEADERS,
            ...cors,
            ...result.headers,
          },
        });
      }
      if (result === undefined || result === null) {
        return new Response(null, { status: 204, headers: { ...SECURITY_HEADERS, ...cors } });
      }
      return json(result, 200, cors);
    } catch (err) {
      const expected = err instanceof HttpError;
      const status = expected ? err.status : 500;
      const message = err instanceof Error ? err.message : "Internal error";
      if (status >= 500) log.error("request failed", { path: url.pathname, err: String(err) });
      else log.warn("request rejected", { path: url.pathname, status, msg: message });
      // HttpError messages are deliberately safe and actionable (missing env,
      // migration/provider configuration). Mask only unexpected exceptions.
      return json({ error: expected ? message : "Internal error" }, status, cors);
    }
  }
}

export function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...SECURITY_HEADERS, ...extra },
  });
}
