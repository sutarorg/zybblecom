import { env, HttpError, log, MissingEnvError } from "./core.ts";

// ————————————————————————————————————————————————————————————
// Google Maps business discovery.
//
// The previous implementation drove headless Chromium through
// Selenium, which cannot run in a serverless function. This uses
// the official Google Places API (New) instead: the same Google
// Maps business records (name, address, phone, website, hours,
// rating, review count, Maps URL, category), fetched over HTTPS,
// with no browser and no separate deployment.
//
// Nothing here is invented — every field comes from Google.
// ————————————————————————————————————————————————————————————

const PLACES_ENDPOINT = "https://places.googleapis.com/v1/places:searchText";
const GEOCODE_ENDPOINT = "https://maps.googleapis.com/maps/api/geocode/json";

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.addressComponents",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.rating",
  "places.userRatingCount",
  "places.regularOpeningHours.weekdayDescriptions",
  "places.primaryTypeDisplayName",
  "places.googleMapsUri",
  "places.businessStatus",
  "nextPageToken",
].join(",");

export interface PlaceRecord {
  placeId: string;
  company: string;
  category: string;
  address: string;
  city: string;
  state: string;
  country: string;
  phone: string | null;
  website: string | null;
  mapsUrl: string;
  rating: number | null;
  reviews: number | null;
  hours: string | null;
}

interface RawPlace {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  addressComponents?: {
    longText?: string;
    shortText?: string;
    types?: string[];
  }[];
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  primaryTypeDisplayName?: { text?: string };
  googleMapsUri?: string;
  businessStatus?: string;
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

/** Resolve a free-text location ("Dallas, Texas") to coordinates. */
export async function geocodeLocation(location: string): Promise<GeoPoint | null> {
  const url = `${GEOCODE_ENDPOINT}?address=${encodeURIComponent(location)}&key=${env.googleMapsKey}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
  if (!res.ok) {
    log.warn("geocode request failed", { status: res.status });
    return null;
  }
  const data = (await res.json()) as {
    status?: string;
    error_message?: string;
    results?: { geometry?: { location?: { lat: number; lng: number } } }[];
  };
  if (data.status === "REQUEST_DENIED") {
    throw new HttpError(
      502,
      "Google Maps rejected the request. Verify GOOGLE_MAPS_API_KEY has the Geocoding API enabled."
    );
  }
  const point = data.results?.[0]?.geometry?.location;
  if (!point) return null;
  return { latitude: point.lat, longitude: point.lng };
}

function component(
  components: RawPlace["addressComponents"],
  type: string,
  short = false
): string {
  const hit = components?.find((c) => c.types?.includes(type));
  return (short ? hit?.shortText : hit?.longText) ?? "";
}

function normalize(raw: RawPlace): PlaceRecord | null {
  const company = raw.displayName?.text?.trim();
  const placeId = raw.id;
  if (!company || !placeId) return null;
  if (raw.businessStatus && raw.businessStatus !== "OPERATIONAL") return null;

  const comps = raw.addressComponents;
  const streetNumber = component(comps, "street_number");
  const route = component(comps, "route");
  const street = [streetNumber, route].filter(Boolean).join(" ").trim();
  const city =
    component(comps, "locality") ||
    component(comps, "postal_town") ||
    component(comps, "administrative_area_level_2");
  const state = component(comps, "administrative_area_level_1", true);
  const country = component(comps, "country");

  const hours = raw.regularOpeningHours?.weekdayDescriptions?.length
    ? raw.regularOpeningHours.weekdayDescriptions.join("; ").slice(0, 220)
    : null;

  return {
    placeId,
    company,
    category: raw.primaryTypeDisplayName?.text ?? "",
    address: street || raw.formattedAddress?.split(",")[0]?.trim() || "",
    city,
    state,
    country,
    phone: raw.nationalPhoneNumber ?? raw.internationalPhoneNumber ?? null,
    website: raw.websiteUri ?? null,
    mapsUrl:
      raw.googleMapsUri ??
      `https://www.google.com/maps/place/?q=place_id:${placeId}`,
    rating: typeof raw.rating === "number" ? Math.round(raw.rating * 10) / 10 : null,
    reviews: typeof raw.userRatingCount === "number" ? raw.userRatingCount : null,
    hours,
  };
}

/**
 * Text search with location bias + radius. Google returns up to 20 results
 * per page and allows paging; we stop at `limit` or when Google runs out.
 */
export async function searchPlaces(params: {
  query: string;
  location: string;
  radiusMeters: number;
  limit: number;
}): Promise<{ places: PlaceRecord[]; exhausted: boolean }> {
  if (!env.googleMapsKey) throw new MissingEnvError("GOOGLE_MAPS_API_KEY");
  const center = await geocodeLocation(params.location);
  const collected: PlaceRecord[] = [];
  const seen = new Set<string>();
  let pageToken: string | undefined;
  let exhausted = false;

  // Google caps text search at ~60 results (3 pages of 20).
  for (let page = 0; page < 3 && collected.length < params.limit; page++) {
    const body: Record<string, unknown> = {
      textQuery: `${params.query} in ${params.location}`,
      maxResultCount: Math.min(20, params.limit - collected.length),
    };
    if (center) {
      body.locationBias = {
        circle: {
          center,
          radius: Math.min(50_000, Math.max(1_000, params.radiusMeters)),
        },
      };
    }
    if (pageToken) body.pageToken = pageToken;

    const res = await fetch(PLACES_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": env.googleMapsKey,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });

    const text = await res.text();
    if (!res.ok) {
      log.error("places search failed", { status: res.status, body: text.slice(0, 300) });
      if (res.status === 403 || res.status === 401) {
        throw new HttpError(
          502,
          "Google Maps rejected the request. Verify GOOGLE_MAPS_API_KEY has the Places API (New) enabled and billing active."
        );
      }
      if (res.status === 429) {
        throw new HttpError(429, "Google Maps rate limit reached. Try again shortly.");
      }
      throw new HttpError(502, "Google Maps search is temporarily unavailable.");
    }

    const data = JSON.parse(text) as { places?: RawPlace[]; nextPageToken?: string };
    for (const rawPlace of data.places ?? []) {
      const place = normalize(rawPlace);
      if (!place || seen.has(place.placeId)) continue;
      seen.add(place.placeId);
      collected.push(place);
      if (collected.length >= params.limit) break;
    }

    pageToken = data.nextPageToken;
    if (!pageToken) {
      exhausted = true;
      break;
    }
    // Google requires a short delay before a page token becomes valid.
    if (collected.length < params.limit) await new Promise((r) => setTimeout(r, 1200));
  }

  return { places: collected, exhausted };
}
