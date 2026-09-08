import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq, or } from "drizzle-orm";
import crypto from "crypto";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import {
  appOrigin,
  GOOGLE_NEXT_COOKIE,
  GOOGLE_STATE_COOKIE,
} from "@/app/api/auth/google/route";

type GoogleTokenInfo = {
  aud: string;
  sub: string;
  email: string;
  email_verified: string;
  name?: string;
};

/** Step 2 — exchange the code, verify the ID token, sign the user in. */
export async function GET(req: Request) {
  const origin = appOrigin(req);
  const { searchParams } = new URL(req.url);

  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`/auth?error=${reason}`, origin));

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return fail("google_not_configured");

  if (searchParams.get("error")) return fail("google_denied");

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const store = await cookies();
  const expectedState = store.get(GOOGLE_STATE_COOKIE)?.value;
  const next = store.get(GOOGLE_NEXT_COOKIE)?.value;

  if (!code || !state || !expectedState || state !== expectedState) {
    return fail("google_state");
  }

  // Exchange the authorization code for tokens.
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: `${origin}/api/auth/google/callback`,
    }),
    cache: "no-store",
  });
  if (!tokenRes.ok) return fail("google_token");

  const tokens = (await tokenRes.json()) as { id_token?: string };
  if (!tokens.id_token) return fail("google_token");

  // Verify the ID token with Google and check the audience matches our app.
  const infoRes = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokens.id_token)}`,
    { cache: "no-store" },
  );
  if (!infoRes.ok) return fail("google_verify");
  const info = (await infoRes.json()) as GoogleTokenInfo;

  if (info.aud !== clientId || !info.email || info.email_verified !== "true") {
    return fail("google_verify");
  }

  const email = info.email.toLowerCase();
  const name = info.name?.trim() || email.split("@")[0];

  // Find by Google subject, then by email (account linking), else create.
  let [user] = await db
    .select()
    .from(users)
    .where(or(eq(users.googleSub, info.sub), eq(users.email, email)))
    .limit(1);

  if (user) {
    if (!user.googleSub) {
      await db.update(users).set({ googleSub: info.sub }).where(eq(users.id, user.id));
    }
  } else {
    [user] = await db
      .insert(users)
      .values({
        name,
        email,
        googleSub: info.sub,
        // Random placeholder hash — the account is Google-authenticated.
        passwordHash: await hashPassword(crypto.randomBytes(24).toString("hex")),
      })
      .returning();
  }

  await setSessionCookie(user.id);

  const res = NextResponse.redirect(
    new URL(next && next.startsWith("/") ? next : "/", origin),
  );
  res.cookies.delete(GOOGLE_STATE_COOKIE);
  res.cookies.delete(GOOGLE_NEXT_COOKIE);
  return res;
}
