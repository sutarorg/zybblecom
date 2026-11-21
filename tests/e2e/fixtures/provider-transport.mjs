// This preload is used only by the connected, loopback smoke test. The real
// provider integrations build their requests normally; no provider is called.
const backend = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
if (backend.protocol !== "http:" || backend.hostname !== "127.0.0.1") {
  throw new Error("Provider transport fixture requires a loopback backend");
}
const realFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = new URL(input instanceof Request ? input.url : input);
  if (url.origin === backend.origin) return realFetch(input, init);
  if (url.origin === "https://test.dodopayments.com") {
    return realFetch(new URL(`/__dodo${url.pathname}`, backend), init);
  }
  if (url.href === "https://api.resend.com/emails") {
    return realFetch(new URL("/__resend/emails", backend), init);
  }
  throw new Error(`Unexpected external origin in connected QA: ${url.origin}`);
};
