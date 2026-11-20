import { z } from "zod";
import { createClient, type AuthError } from "@supabase/supabase-js";
import { contentOptions, goalOptions } from "@/config/account";
import { validNewPassword } from "@/lib/services/validation";
import { authClient, authSettings, privilegedDB } from "@/lib/backend/supabase";
import {
  clearRecovery,
  hasRecovery,
  verifySession,
} from "@/lib/backend/session";
import {
  ApiError,
  ingressActor,
  limitActor,
  readJSON,
  respond,
  sameOrigin,
} from "@/lib/backend/http";

const email = z
  .string()
  .trim()
  .max(254)
  .email()
  .transform((s) => s.toLowerCase());
const newPassword = z.string().max(256).refine(validNewPassword);
const credentials = z.strictObject({
  email,
  password: z.string().min(1).max(1024),
});
const signup = credentials.extend({
  password: newPassword,
  fullName: z.string().trim().min(1).max(100),
  termsAccepted: z.literal(true),
});
const preferences = z.strictObject({
  contentType: z.enum(contentOptions).optional(),
  goal: z.enum(goalOptions).optional(),
});
const schemas = {
  signup,
  login: credentials,
  forgot: z.strictObject({ email }),
  resend: z.strictObject({ email }),
  reset: z.strictObject({ password: newPassword }),
  "change-password": z
    .strictObject({
      currentPassword: z.string().min(1).max(1024),
      password: newPassword,
      confirmPassword: newPassword,
    })
    .refine(({ password, confirmPassword }) => password === confirmPassword),
  onboarding: preferences,
  logout: z.strictObject({}),
};
function parse<T>(schema: z.ZodType<T>, value: unknown) {
  const r = schema.safeParse(value);
  if (!r.success) throw new ApiError("validation", 400);
  return r.data;
}
function handle(error: AuthError | null) {
  if (!error) return;
  if (error.status === 429) throw new ApiError("rate_limited", 429, 60);
  if (error.code === "email_not_confirmed")
    throw new ApiError("verification_required", 403);
  if (error.code === "invalid_credentials")
    throw new ApiError("invalid_credentials", 401);
  if (error.code === "weak_password" || error.code === "same_password")
    throw new ApiError("validation", 400);
  if (error.code === "otp_expired") throw new ApiError("expired_link", 400);
  throw new ApiError("unavailable", 503);
}
const enumerationCodes = new Set([
  "user_already_exists",
  "email_exists",
  "user_not_found",
]);
type Context = { params: Promise<{ operation: string }> };
export async function POST(request: Request, context: Context) {
  return respond(async () => {
    sameOrigin(request);
    const { operation } = await context.params;
    if (!Object.hasOwn(schemas, operation))
      throw new ApiError("validation", 404);
    const body = await readJSON(request);
    const settings = authSettings()!;
    const auth = (await authClient(true))!;
    const callback = `${settings.origin}/auth/callback`;
    if (
      operation === "signup" ||
      operation === "login" ||
      operation === "forgot" ||
      operation === "resend"
    ) {
      const { email: target } = parse(z.object({ email }), body);
      await limitActor(
        `auth_${operation}_ip`,
        ingressActor(request),
        operation === "login" ? 60 : 20,
        600,
      );
      await limitActor(
        `auth_${operation}_email`,
        target,
        operation === "login" ? 10 : 4,
        600,
      );
    }
    switch (operation) {
      case "signup": {
        const input = parse(signup, body);
        const { data, error } = await auth.auth.signUp({
          email: input.email,
          password: input.password,
          options: {
            emailRedirectTo: callback,
            data: { full_name: input.fullName },
          },
        });
        if (data.session) {
          await auth.auth.signOut({ scope: "local" });
          throw new ApiError("unavailable", 503);
        }
        if (!error?.code || !enumerationCodes.has(error.code)) handle(error);
        return { verificationRequired: true };
      }
      case "login": {
        const { error } = await auth.auth.signInWithPassword(
          parse(credentials, body),
        );
        handle(error);
        try {
          const { profile } = await verifySession(true);
          await clearRecovery();
          return { onboardingComplete: profile.onboarding_completed };
        } catch (e) {
          await auth.auth.signOut({ scope: "local" });
          throw e;
        }
      }
      case "forgot": {
        const { email } = parse(schemas.forgot, body);
        const { error } = await auth.auth.resetPasswordForEmail(email, {
          redirectTo: callback,
        });
        if (!error?.code || !enumerationCodes.has(error.code)) handle(error);
        return null;
      }
      case "resend": {
        const { email } = parse(schemas.resend, body);
        const { error } = await auth.auth.resend({
          type: "signup",
          email,
          options: { emailRedirectTo: callback },
        });
        if (!error?.code || !enumerationCodes.has(error.code)) handle(error);
        return { retryAfterSeconds: 60 };
      }
      case "reset": {
        const { password } = parse(schemas.reset, body);
        const { client, user } = await verifySession(true);
        if (!(await hasRecovery(client)))
          throw new ApiError("invalid_link", 403);
        await limitActor("auth_reset_user", user.id, 5, 600);
        handle((await client.auth.updateUser({ password })).error);
        await clearRecovery();
        handle((await client.auth.signOut({ scope: "global" })).error);
        return null;
      }
      case "change-password": {
        const { currentPassword, password } = parse(schemas[operation], body);
        const { client, user, profile } = await verifySession(true);
        if (
          !user.email ||
          user.email.toLowerCase() !== profile.email.toLowerCase()
        )
          throw new ApiError("verification_required", 403);
        if (await hasRecovery(client))
          throw new ApiError("reauthentication_required", 403);
        await limitActor("auth_change_user", user.id, 5, 600);
        // Some Auth projects ignore current_password unless their optional setting
        // is enabled. Require proof independently without modifying browser cookies.
        const proof = createClient(settings.url, settings.key, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        });
        const signedIn = await proof.auth.signInWithPassword({
          email: user.email,
          password: currentPassword,
        });
        handle(signedIn.error);
        const sameUser =
          signedIn.data.user?.id === user.id &&
          Boolean(signedIn.data.user?.email_confirmed_at);
        if (!signedIn.data.session)
          throw new ApiError("reauthentication_required", 403);
        handle((await proof.auth.signOut({ scope: "local" })).error);
        if (!sameUser) throw new ApiError("reauthentication_required", 403);
        // Use the original verified browser session for the update (never the proof session).
        const { error } = await client.auth.updateUser({
          password,
          current_password: currentPassword,
        });
        if (error?.code === "current_password_mismatch")
          throw new ApiError("invalid_credentials", 401);
        if (
          error?.code === "reauthentication_needed" ||
          error?.code === "reauthentication_not_valid" ||
          error?.code === "insufficient_aal"
        )
          throw new ApiError("reauthentication_required", 403);
        handle(error);
        await clearRecovery();
        // Supabase's update retains the current session; revoke other refresh sessions.
        const { error: sessionError } = await client.auth.signOut({
          scope: "others",
        });
        return { otherSessionsRevoked: !sessionError };
      }
      case "onboarding": {
        const input = parse(preferences, body);
        const { user } = await verifySession(true);
        await limitActor("auth_onboard_user", user.id, 10, 600);
        const { data, error } = await privilegedDB()
          .from("profiles")
          .update({
            onboarding_completed: true,
            onboarding_preferences: input,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id)
          .is("suspended_at", null)
          .select("id")
          .maybeSingle();
        if (error || !data) throw new ApiError("unavailable", 503);
        return null;
      }
      case "logout": {
        parse(schemas.logout, body);
        const { error } = await auth.auth.signOut({ scope: "local" });
        if (error?.name !== "AuthSessionMissingError") handle(error);
        await clearRecovery();
        return null;
      }
    }
  });
}
