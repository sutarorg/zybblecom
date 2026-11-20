import { contentOptions, goalOptions } from "@/config/account";
import { creditPacks } from "@/config/credit-packs";
import type {
  FrontendServices,
  ServiceError,
  ServiceResult,
} from "./contracts";
import { validEmail, validNewPassword } from "./validation";

/** Connect a same-origin or server-only adapter in Session 5. No endpoint or provider calls today. */
export function createFrontendServices(
  adapter: Partial<FrontendServices> = {},
): FrontendServices {
  async function call<T>(
    operation?: () => Promise<ServiceResult<T>>,
    valid = true,
  ): Promise<ServiceResult<T>> {
    if (!valid) return { ok: false, error: "validation" };
    if (!operation) return { ok: false, error: "unavailable" };
    try {
      return await operation();
    } catch {
      return { ok: false, error: "network" };
    }
  }
  const validReference = (reference?: string) =>
    reference === undefined || /^[a-zA-Z0-9_-]{1,200}$/.test(reference);
  return {
    signup: (request) =>
      call(
        adapter.signup &&
          (() =>
            adapter.signup!({
              ...request,
              email: request.email.trim(),
              fullName: request.fullName.trim(),
            })),
        validEmail(request.email) &&
          validNewPassword(request.password) &&
          request.fullName.trim().length > 0 &&
          request.fullName.trim().length <= 100 &&
          request.termsAccepted === true,
      ),
    login: (request) =>
      call(
        adapter.login &&
          (() => adapter.login!({ ...request, email: request.email.trim() })),
        validEmail(request.email) &&
          request.password.length > 0 &&
          request.password.length <= 1024,
      ),
    logout: () => call(adapter.logout && (() => adapter.logout!())),
    getSession: () => call(adapter.getSession && (() => adapter.getSession!())),
    requestPasswordRecovery: ({ email }) =>
      call(
        adapter.requestPasswordRecovery &&
          (() => adapter.requestPasswordRecovery!({ email: email.trim() })),
        validEmail(email),
      ),
    getRecoveryState: () =>
      call(adapter.getRecoveryState && (() => adapter.getRecoveryState!())),
    resetPassword: (request) =>
      call(
        adapter.resetPassword && (() => adapter.resetPassword!(request)),
        validNewPassword(request.password),
      ),
    resendVerification: ({ email }) =>
      call(
        adapter.resendVerification &&
          (() => adapter.resendVerification!({ email: email.trim() })),
        validEmail(email),
      ),
    getEmailVerification: () =>
      call(
        adapter.getEmailVerification && (() => adapter.getEmailVerification!()),
      ),
    completeCallback: (proof) =>
      call(
        adapter.completeCallback && (() => adapter.completeCallback!(proof)),
        ["code", "email", "recovery"].includes(proof.kind) &&
          proof.value.length > 0 &&
          proof.value.length <= 2048,
      ),
    completeOnboarding: (request) =>
      call(
        adapter.completeOnboarding &&
          (() => adapter.completeOnboarding!(request)),
        (request.contentType === undefined ||
          contentOptions.includes(request.contentType)) &&
          (request.goal === undefined || goalOptions.includes(request.goal)),
      ),
    createCheckout: (request) =>
      call(
        adapter.createCheckout && (() => adapter.createCheckout!(request)),
        creditPacks.some((pack) => pack.id === request.packId),
      ),
    getPaymentStatus: (request) =>
      call(
        adapter.getPaymentStatus && (() => adapter.getPaymentStatus!(request)),
        validReference(request.reference),
      ),
  };
}

const errorCodes = new Set<string>([
  "unavailable",
  "validation",
  "invalid_credentials",
  "verification_required",
  "invalid_link",
  "expired_link",
  "expired_session",
  "unauthorized",
  "rate_limited",
  "unexpected",
]);
async function authPost<T>(
  operation: string,
  body: unknown = {},
): Promise<ServiceResult<T>> {
  if (typeof window === "undefined") return { ok: false, error: "unavailable" };
  const response = await fetch(`/api/auth/${operation}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    credentials: "same-origin",
  });
  const payload = await response.json();
  if (response.ok && payload.success === true)
    return { ok: true, value: payload.data as T };
  // A configured operation can fail ambiguously after reaching a provider.
  const code =
    payload.error?.code === "unavailable" ? "unexpected" : payload.error?.code;
  const retry = Number(response.headers.get("Retry-After"));
  return {
    ok: false,
    error: errorCodes.has(code) ? (code as ServiceError) : "unexpected",
    ...(retry > 0 ? { retryAfterSeconds: retry } : {}),
  };
}
export const frontendServices = createFrontendServices({
  login: (x) => authPost("login", x),
  signup: (x) => authPost("signup", x),
  logout: () => authPost("logout"),
  requestPasswordRecovery: (x) => authPost("forgot", x),
  resendVerification: (x) => authPost("resend", x),
  resetPassword: (x) => authPost("reset", x),
  completeOnboarding: (x) => authPost("onboarding", x),
});
export const accountDestination = (completed: boolean) =>
  completed ? "/dashboard" : "/onboarding";
