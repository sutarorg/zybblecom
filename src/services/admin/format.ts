import type { Money } from "./contracts";
export const num = (value?: number) =>
  value === undefined || !Number.isFinite(value)
    ? "—"
    : new Intl.NumberFormat("en").format(value);
export const time = (value?: string) =>
  !value || !Number.isFinite(Date.parse(value))
    ? "—"
    : new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
      }).format(new Date(value));
export const duration = (s?: number) =>
  s === undefined || !Number.isFinite(s) || s < 0
    ? "—"
    : `${Math.floor(s / 60)}m ${Math.floor(s % 60)}s`;
export function money(value?: Money) {
  if (
    !value ||
    !/^[A-Z]{3}$/.test(value.currency) ||
    !Number.isInteger(value.minorUnit) ||
    value.minorUnit < 0 ||
    value.minorUnit > 4 ||
    !Number.isSafeInteger(value.amountMinor)
  )
    return "—";
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: value.currency,
    currencyDisplay: "code",
    minimumFractionDigits: value.minorUnit,
    maximumFractionDigits: value.minorUnit,
  }).format(value.amountMinor / 10 ** value.minorUnit);
}
const labels: Record<string, string> = {
  clipsdk: "ClipSDK",
  dodo: "Dodo Payments",
  invalid: "Invalid signature",
  not_checked: "Not checked",
  asset_copy_failed: "Asset-copy failure",
  internal_note: "Internal note",
  completed_videos: "Completed videos",
  consumed_credits: "Credit consumption",
  clips: "Generated clips",
  registrations: "Registrations",
};
export const label = (value: string) =>
  Object.hasOwn(labels, value)
    ? labels[value]
    : value.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());
