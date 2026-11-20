import type { Currency } from "@/config/credit-packs";
import type { contentOptions, goalOptions } from "@/config/account";

export type ServiceError =
  | "unavailable"
  | "network"
  | "validation"
  | "invalid_credentials"
  | "verification_required"
  | "invalid_link"
  | "expired_link"
  | "expired_session"
  | "unauthorized"
  | "rate_limited"
  | "unexpected";
export type ServiceResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: ServiceError; retryAfterSeconds?: number };
export type Credentials = { email: string; password: string };
export type SignupRequest = Credentials & {
  fullName: string;
  termsAccepted: true;
};
/** Session summary only; never return provider tokens to a component. */
export type SessionSummary = { onboardingComplete: boolean };
export type OnboardingPreferences = {
  contentType?: (typeof contentOptions)[number];
  goal?: (typeof goalOptions)[number];
};
export type CallbackProof = {
  kind: "code" | "email" | "recovery";
  value: string;
};
export type CallbackOutcome =
  | { kind: "login"; session: SessionSummary }
  | { kind: "verified" }
  | { kind: "recovery" };
export type PaymentStatus =
  | { kind: "pending" }
  | { kind: "not_completed" }
  | {
      kind: "confirmed";
      packId: string;
      creditsGranted: number;
      amountMinor: number;
      currency: Currency;
    };

export interface FrontendServices {
  signup(
    request: SignupRequest,
  ): Promise<ServiceResult<{ verificationRequired: true }>>;
  login(request: Credentials): Promise<ServiceResult<SessionSummary>>;
  logout(): Promise<ServiceResult<null>>;
  getSession(): Promise<ServiceResult<SessionSummary | null>>;
  requestPasswordRecovery(request: {
    email: string;
  }): Promise<ServiceResult<null>>;
  getRecoveryState(): Promise<ServiceResult<{ active: true }>>;
  resetPassword(request: { password: string }): Promise<ServiceResult<null>>;
  resendVerification(request: {
    email: string;
  }): Promise<ServiceResult<{ retryAfterSeconds: number }>>;
  getEmailVerification(): Promise<ServiceResult<{ verified: boolean }>>;
  completeCallback(
    proof: CallbackProof,
  ): Promise<ServiceResult<CallbackOutcome>>;
  completeOnboarding(
    request: OnboardingPreferences,
  ): Promise<ServiceResult<null>>;
  createCheckout(request: {
    packId: string;
  }): Promise<ServiceResult<{ checkoutUrl: string }>>;
  getPaymentStatus(request: {
    reference?: string;
  }): Promise<ServiceResult<PaymentStatus>>;
}
