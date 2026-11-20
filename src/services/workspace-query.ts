export type Query = Record<string, string | string[] | undefined>;
export const one = (query: Query, key: string, size = 100) =>
  typeof query[key] === "string" ? query[key].trim().slice(0, size) : "";
export function listingHref(
  path: string,
  pairs: Record<string, string | undefined>,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(pairs))
    if (value) params.set(key, value);
  const suffix = params.toString();
  return suffix ? `${path}?${suffix}` : path;
}
