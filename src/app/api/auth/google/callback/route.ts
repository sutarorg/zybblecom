import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, homeFor, isAdminEmail } from "@/lib/auth";
import { STATE_COOKIE, appOrigin } from "@/lib/oauth";

export const dynamic = "force-dynamic";

type IdTokenPayload = {
  aud?: string;
  exp?: number;
  email?: string;
  email_verified?: boolean;
  name?: string;
};

function decodeIdToken(idToken: string): IdTokenPayload | null {
  try {
    const [, payload] = idToken.split(".");
    if (!payload) return null;
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as IdTokenPayload;
  } catch {
    return null;
  }
}

function safeNext(next: string | undefined, fallback: string) {
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return fallback;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const fail = (code: string, at: "login" | "signup" = "login") =>
    NextResponse.redirect(new URL(`/${at}?error=${code}`, url.origin));

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return fail("oauth-config");

  // Google returned an error (user cancelled, etc.)
  if (url.searchParams.get("error")) return fail("google");

  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  if (!code || !stateParam) return fail("google");

  // CSRF protection — state must match the cookie we set before redirecting out.
  const store = await cookies();
  const storedState = store.get(STATE_COOKIE)?.value;
  store.delete(STATE_COOKIE);
  if (!storedState || storedState !== stateParam) return fail("state");

  let next = "";
  let role: "creator" | "buyer" = "buyer";
  try {
    const [, meta] = stateParam.split(".");
    if (meta) {
      const parsed = JSON.parse(Buffer.from(meta, "base64url").toString("utf8")) as {
        n?: string;
        r?: string;
      };
      if (parsed.n) next = parsed.n;
      if (parsed.r === "creator" || parsed.r === "buyer") role = parsed.r;
    }
  } catch {
    /* meta is optional — state equality is what matters */
  }

  // Exchange the authorization code for tokens (server-to-server).
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${appOrigin(request)}/api/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) return fail("google");

  const tokenBody = (await tokenRes.json().catch(() => null)) as { id_token?: string } | null;
  if (!tokenBody?.id_token) return fail("google");

  const payload = decodeIdToken(tokenBody.id_token);
  if (!payload || payload.aud !== clientId) return fail("google");
  if (!payload.exp || payload.exp * 1000 < Date.now()) return fail("google");

  const email = payload.email?.toLowerCase().trim();
  if (!email || !payload.email_verified) return fail("email");

  const name =
    payload.name?.trim() ||
    email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  try {
    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    let user = existing;
    if (!user) {
      const finalRole = isAdminEmail(email) ? "admin" : role;
      const [created] = await db
        .insert(users)
        .values({ name, email, passwordHash: "oauth:google", role: finalRole })
        .returning();
      user = created;
    }

    await createSession(user.id);

    const target = safeNext(next, homeFor(user));
    return NextResponse.redirect(new URL(target, url.origin));
  } catch {
    return fail("google");
  }
}
