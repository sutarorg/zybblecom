import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq, or } from "drizzle-orm";
import crypto from "crypto";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  createSessionToken,
  hashPassword,
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
} from "@/lib/auth";
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

  const fail = (reason: string, detail?: unknown) => {
    // The browser gets a friendly redirect; the real cause goes to the
    // deployment's runtime logs (Vercel → Deployments → Runtime Logs).
    console.error(`[zybble] google oauth failed: ${reason}`, detail ?? "");
    return NextResponse.redirect(new URL(`/auth?error=${reason}`, origin));
  };

  try {
    const { searchParams } = new URL(req.url);

    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
    if (!clientId || !clientSecret) return fail("google_not_configured");

    const oauthError = searchParams.get("error");
    if (oauthError) return fail("google_denied", oauthError);

    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const store = await cookies();
    const expectedState = store.get(GOOGLE_STATE_COOKIE)?.value;
    const next = store.get(GOOGLE_NEXT_COOKIE)?.value;

    if (!code || !state || !expectedState || state !== expectedState) {
      return fail("google_state", {
        hasCode: Boolean(code),
        stateMatches: state === expectedState,
      });
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
    if (!tokenRes.ok) {
      return fail("google_token", await tokenRes.text().catch(() => tokenRes.status));
    }

    const tokens = (await tokenRes.json()) as { id_token?: string };
    if (!tokens.id_token) return fail("google_token", "no id_token in response");

    // Verify the ID token with Google and check the audience matches our app.
    const infoRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokens.id_token)}`,
      { cache: "no-store" },
    );
    if (!infoRes.ok) return fail("google_verify", infoRes.status);
    const info = (await infoRes.json()) as GoogleTokenInfo;

    if (info.aud !== clientId || !info.email || info.email_verified !== "true") {
      return fail("google_verify", { audMatches: info.aud === clientId });
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

    // Set the session cookie directly on the redirect response — the most
    // portable approach across Node/serverless runtimes.
    const token = await createSessionToken(user.id);
    const res = NextResponse.redirect(
      new URL(next && next.startsWith("/") ? next : "/", origin),
    );
    res.cookies.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
    res.cookies.delete(GOOGLE_STATE_COOKIE);
    res.cookies.delete(GOOGLE_NEXT_COOKIE);
    return res;
  } catch (err) {
    return fail("google_verify", err);
  }
}
