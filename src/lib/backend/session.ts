import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { authClient, authSettings } from "./supabase";
import { ApiError } from "./http";

export const verifySession = cache(async (write = false) => {
  const client = await authClient(write);
  if (!client) throw new ApiError("unavailable", 503);
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error?.name === "AuthSessionMissingError")
    throw new ApiError("unauthorized", 401);
  if (error && (error.status === 401 || error.status === 403))
    throw new ApiError("expired_session", 401);
  if (error) throw new ApiError("unavailable", 503);
  if (!user) throw new ApiError("unauthorized", 401);
  if (!user.email_confirmed_at)
    throw new ApiError("verification_required", 403);
  const { data: profile, error: readError } = await client
    .from("profiles")
    .select("id,full_name,email,onboarding_completed,suspended_at")
    .eq("id", user.id)
    .single();
  if (readError || !profile) throw new ApiError("unavailable", 503);
  if (profile.suspended_at) throw new ApiError("unauthorized", 403);
  return { client, user, profile };
});

function recoveryCookie(secure: boolean) {
  return secure ? "__Host-zybble-recovery" : "zybble-recovery";
}
function proof(secret: string, session: string, user: string, expiry: string) {
  return createHmac("sha256", secret)
    .update(`${session}:${user}:${expiry}`)
    .digest("hex");
}
export async function setRecovery(
  client: NonNullable<Awaited<ReturnType<typeof authClient>>>,
) {
  const config = authSettings()!;
  const claims = (await client.auth.getClaims()).data?.claims;
  if (!claims?.session_id || !claims.sub)
    throw new ApiError("invalid_link", 400);
  const expires = String(Date.now() + 600_000);
  (await cookies()).set(
    recoveryCookie(config.secure),
    `${expires}.${proof(config.recoveryKey, claims.session_id, claims.sub, expires)}`,
    {
      maxAge: 600,
      httpOnly: true,
      secure: config.secure,
      path: "/",
      sameSite: "lax",
    },
  );
}
export async function hasRecovery(
  client: NonNullable<Awaited<ReturnType<typeof authClient>>>,
) {
  const config = authSettings()!;
  const value = (await cookies()).get(recoveryCookie(config.secure))?.value;
  if (!value || !/^\d{13}\.[a-f0-9]{64}$/.test(value)) return false;
  const [expires, signature] = value.split(".");
  if (Number(expires) <= Date.now()) return false;
  const claims = (await client.auth.getClaims()).data?.claims;
  return Boolean(
    claims?.session_id &&
    claims.sub &&
    timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(
        proof(config.recoveryKey, claims.session_id, claims.sub, expires),
      ),
    ),
  );
}
export async function clearRecovery() {
  const config = authSettings()!;
  (await cookies()).delete(recoveryCookie(config.secure));
}
