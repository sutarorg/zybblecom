import "server-only";
import { randomUUID, createHmac } from "node:crypto";
import { authSettings, privilegedDB } from "./supabase";

export class ApiError extends Error {
  constructor(
    public code: string,
    public status: number,
    public retry?: number,
  ) {
    super(code);
  }
}
export const privateHeaders = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};
export async function respond(handler: () => Promise<unknown>) {
  const requestId = randomUUID();
  try {
    return Response.json(
      { success: true, data: await handler(), requestId },
      { headers: privateHeaders },
    );
  } catch (error) {
    const known = error instanceof ApiError;
    if (!known)
      console.error("zybble_api_error", { requestId, code: "unexpected" });
    return Response.json(
      {
        success: false,
        error: { code: known ? error.code : "unexpected" },
        requestId,
      },
      {
        status: known ? error.status : 500,
        headers: {
          ...privateHeaders,
          ...(known && error.retry
            ? { "Retry-After": String(error.retry) }
            : {}),
        },
      },
    );
  }
}
export function sameOrigin(request: Request) {
  const settings = authSettings();
  if (!settings) throw new ApiError("unavailable", 503);
  if (
    request.headers.get("origin") !== settings.origin ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    throw new ApiError("unauthorized", 403);
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json")
    throw new ApiError("validation", 415);
}
export async function readBytes(request: Request, limit: number) {
  if (!request.body) throw new ApiError("validation", 400);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return Buffer.concat(chunks, size);
      size += value.byteLength;
      if (size > limit) {
        void reader.cancel().catch(() => {});
        throw new ApiError("validation", 413);
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError("validation", 400);
  } finally {
    reader.releaseLock();
  }
}
export async function readBody(request: Pick<Request, "body">, limit = 8192) {
  if (!request.body) throw new ApiError("validation", 400);
  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let size = 0,
    body = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return body + decoder.decode();
      size += value.byteLength;
      if (size > limit) {
        void reader.cancel().catch(() => {});
        throw new ApiError("validation", 413);
      }
      body += decoder.decode(value, { stream: true });
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError("validation", 400);
  } finally {
    reader.releaseLock();
  }
}
export async function readJSON(request: Request) {
  const text = await readBody(request);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError("validation", 400);
  }
}
export async function limitActor(
  scope: string,
  actor: string,
  limit: number,
  seconds: number,
) {
  const config = authSettings();
  if (!config) throw new ApiError("unavailable", 503);
  const hash = createHmac("sha256", config.recoveryKey)
    .update(actor)
    .digest("hex");
  const { data, error } = await privilegedDB().rpc("take_request_limit", {
    p_scope: scope,
    p_actor: hash,
    p_limit: limit,
    p_window_seconds: seconds,
  });
  if (error) throw new ApiError("unavailable", 503);
  if (!data) throw new ApiError("rate_limited", 429, seconds);
}
export const ingressActor = (request: Request) =>
  process.env.VERCEL === "1"
    ? request.headers.get("x-vercel-forwarded-for")?.slice(0, 100) || "unknown"
    : "local-or-unknown";
