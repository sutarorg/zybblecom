export type DodoMode = "test_mode" | "live_mode";

export function hostedCheckoutURL(value: string, mode: DodoMode) {
  try {
    const url = new URL(value);
    const host =
      mode === "live_mode"
        ? "checkout.dodopayments.com"
        : "test.checkout.dodopayments.com";
    return url.origin === `https://${host}` &&
      !url.username &&
      !url.password &&
      !url.hash &&
      /^\/session\/[A-Za-z0-9_-]{1,200}\/?$/.test(url.pathname)
      ? url
      : null;
  } catch {
    return null;
  }
}
