import type { ServiceError } from "./contracts";
export function serviceMessage(error: ServiceError): string {
  switch (error) {
    case "unavailable":
      return "This service isn’t connected yet. Nothing was sent or changed.";
    case "network":
      return "We couldn’t reach Zybble. Check your connection and try again.";
    case "invalid_credentials":
      return "That email and password didn’t match. Try again or reset your password.";
    case "verification_required":
      return "Verify your email before signing in, then try again.";
    case "invalid_link":
      return "This link couldn’t be verified. Request a new link to continue.";
    case "expired_link":
      return "This link has expired. Request a new one to continue.";
    case "expired_session":
      return "This session has expired. Sign in again to continue.";
    case "rate_limited":
      return "Too many attempts. Wait a moment before trying again.";
    case "unauthorized":
      return "This action isn’t available for your session. Sign in again to continue.";
    case "validation":
      return "Check your details and try again.";
    default:
      return "We couldn’t complete that action. Try again or visit the help centre.";
  }
}
