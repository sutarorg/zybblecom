export function durationText(seconds?: number) {
  if (seconds === undefined || !Number.isFinite(seconds) || seconds < 0)
    return "Not available";
  const whole = Math.round(seconds);
  const parts = [Math.floor(whole / 60), whole % 60];
  return `${parts[0]}:${String(parts[1]).padStart(2, "0")}`;
}
export function bytesText(bytes: number) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GiB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MiB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${bytes} B`;
}
export const dateText = (date: string) =>
  Number.isNaN(Date.parse(date))
    ? "Not available"
    : new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeZone: "UTC",
      }).format(new Date(date));
export const creditsText = (num?: number) =>
  num === undefined ? "—" : new Intl.NumberFormat("en").format(num);
export const statusText = {
  uploading: "Uploading",
  uploaded: "Uploaded",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
} as const;
export const projectHref = (id: string) =>
  `/projects/${encodeURIComponent(id)}`;
export const clipHref = (projectId: string, clipId: string) =>
  `${projectHref(projectId)}/clips/${encodeURIComponent(clipId)}`;
