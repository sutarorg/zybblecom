import { NextResponse } from "next/server";
import crypto from "crypto";

export const GOOGLE_STATE_COOKIE = "zybble_google_state";
export const GOOGLE_NEXT_COOKIE = "zybble_google_next";

export function appOrigin(req: Request) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured) return configured;
  // Behind a proxy (Vercel, nginx, sandboxes) the request URL host is
  // internal — reconstruct the public origin from forwarded headers.
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host) {
    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    return `${proto}://${host}`;
  }
  return new URL(req.url).origin;
}

/** Step 1 — redirect the user to Google's consent screen. */
export async function GET(req: Request) {
  const origin = appOrigin(req);
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/auth?error=google_not_configured", origin),
    );
  }

  const { searchParams } = new URL(req.url);
  const next = searchParams.get("next");
  const state = crypto.randomBytes(16).toString("hex");

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", `${origin}/api/auth/google/callback`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");

  const res = NextResponse.redirect(url);
  const cookieOpts = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  };
  res.cookies.set(GOOGLE_STATE_COOKIE, state, cookieOpts);
  if (next && next.startsWith("/")) {
    res.cookies.set(GOOGLE_NEXT_COOKIE, next, cookieOpts);
  }
  return res;
}
