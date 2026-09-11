import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { STATE_COOKIE, appOrigin } from "@/lib/oauth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const from = url.searchParams.get("from") === "signup" ? "signup" : "login";
  const loginFail = (code: string) =>
    NextResponse.redirect(new URL(`/${from}?error=${code}`, url.origin));

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return loginFail("oauth-config");

  const next = url.searchParams.get("next") ?? "";
  const roleParam = url.searchParams.get("role");
  const role = roleParam === "creator" || roleParam === "buyer" ? roleParam : "";

  const rand = crypto.randomBytes(24).toString("base64url");
  const meta = Buffer.from(JSON.stringify({ n: next, r: role }), "utf8").toString("base64url");
  const state = `${rand}.${meta}`;

  const store = await cookies();
  store.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.APP_SECURE_COOKIES === "true",
    path: "/",
    maxAge: 600,
  });

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", `${appOrigin(request)}/api/auth/google/callback`);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("prompt", "select_account");

  return NextResponse.redirect(authUrl);
}
