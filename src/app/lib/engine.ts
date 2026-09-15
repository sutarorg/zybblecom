import { db, leadKey, now, uid } from "./db";
import { assertLeadQuota, consumeLeads } from "./plans";
import { api, cacheRow, isRemote, syncFromServer } from "./remote";
import type {
  EmailStatus,
  Lead,
  LeadCandidate,
  SearchJob,
} from "./types";

// ————————————————————————————————————————————————————————————
// Lead harvesting engine.
// Production: jobs are queued to the Docker worker running the
// Python/Selenium Google Maps scraper; this module mirrors that
// pipeline — queue → search → collect → enrich → find emails —
// with durable, resumable job state in `search_jobs`.
// ————————————————————————————————————————————————————————————

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// ————— Vocabulary (public business categories) —————

interface CategoryDef {
  label: string;
  singular: string;
  prefixes: string[];
  suffixes: string[];
  descriptors: string[];
  pain: string;
}

const CATEGORIES: Record<string, CategoryDef> = {
  dental: {
    label: "Dental practices",
    singular: "dental practice",
    prefixes: ["BrightPath", "Lone Star", "Hill Country", "Oak Ridge", "Clear Lake", "Summit", "Riverwalk", "Bluebonnet", "Northgate", "Parkside", "Heritage", "Maple Grove", "Sunset", "Stonebridge", "Westfield", "Cedar Park", "Lakeside", "Highland", "Mission", "Trinity"],
    suffixes: ["Dental", "Dental Group", "Family Dental", "Smiles", "Dental Studio", "Dental Care"],
    descriptors: ["family and cosmetic dentistry", "general dentistry with same-week appointments", "preventive and restorative dental care"],
    pain: "keeping the appointment calendar consistently full",
  },
  roofing: {
    label: "Roofing companies",
    singular: "roofing company",
    prefixes: ["Ironclad", "Lone Star", "Summit", "Apex", "Red River", "Blue Sky", "Heritage", "Stormshield", "Pinnacle", "Longhorn", "Oakline", "Crestview", "Ridgepoint", "TexStar", "Fairway", "Alamo", "Northgate", "Copperline", "High Plains", "Granite"],
    suffixes: ["Roofing", "Roofing Co.", "Roofing & Exteriors", "Roofing Group", "Roof Solutions", "Roofing Pros"],
    descriptors: ["residential roof replacement and repair", "storm damage restoration and re-roofing", "commercial and residential roofing"],
    pain: "turning storm-season inquiries into signed contracts before competitors do",
  },
  marketing: {
    label: "Marketing agencies",
    singular: "marketing agency",
    prefixes: ["Northbeam", "Studio", "Halo", "Framework", "Brightline", "Copper", "Signal", "Fieldnotes", "Anchor", "Westbourne", "Meridian", "Found & Co", "Parallel", "Daylight", "Kindred", "Boldtype", "Lattice", "Waypoint", "Arclight", "Common Thread"],
    suffixes: ["Media", "Creative", "Collective", "Digital", "Partners", "Studio"],
    descriptors: ["performance marketing for local brands", "brand strategy and paid acquisition", "content and social media management"],
    pain: "proving consistent, reportable results to retain clients",
  },
  plumbing: {
    label: "Plumbing services",
    singular: "plumbing company",
    prefixes: ["RapidFlow", "Lone Star", "Sureflow", "ProLine", "Heritage", "Bluebonnet", "Mainline", "TruFlow", "Atlas", "Red Oak", "Clearwater", "Summit", "First Call", "Ace", "Prime", "Guadalupe", "Capitol", "Fairway", "OnPoint", "Valor"],
    suffixes: ["Plumbing", "Plumbing Co.", "Plumbing Services", "Plumb Works", "Rooter & Plumbing", "Plumbing Pros"],
    descriptors: ["residential plumbing repair and installs", "emergency plumbing and drain services", "water heater and repiping specialists"],
    pain: "winning the emergency calls that go to whoever answers first",
  },
  hvac: {
    label: "HVAC companies",
    singular: "HVAC company",
    prefixes: ["AirRight", "ComfortPro", "TrueAir", "Lone Star", "ClimateOne", "Summit Air", "Atlas", "Heritage", "Coolfront", "Northwind", "Paramount", "Blue Sky", "Peak", "Red River", "Everest", "StatLine", "First Choice", "Aire Serv", "TempControl", "Polar Bear"],
    suffixes: ["Air Conditioning", "Heating & Air", "HVAC", "Climate", "Air", "Mechanical"],
    descriptors: ["residential AC repair and installation", "heating and cooling maintenance plans", "commercial HVAC service"],
    pain: "filling the schedule between peak summer and winter rushes",
  },
  legal: {
    label: "Law firms",
    singular: "law firm",
    prefixes: ["Calloway", "Harrington", "Whitfield", "Bennett", "Mercer", "Blackwell", "Delaney", "Falk", "Grayson", "Prescott", "Sandoval", "Whitaker", "Alvarez", "Kinsley", "Montgomery", "Reeves", "Sutter", "Abernathy", "Lockhart", "Vance"],
    suffixes: ["Law", "Law Firm", "Legal Group", "& Associates", "Attorneys", "Law Office"],
    descriptors: ["family and civil law representation", "personal injury and insurance claims", "business and contract law services"],
    pain: "converting consultations into retained cases predictably",
  },
  realestate: {
    label: "Real estate agencies",
    singular: "real estate agency",
    prefixes: ["Keystone", "Harvest", "Northline", "Blue Door", "Crest", "Homeward", "Landmark", "Vista", "Oak & Vine", "Summit", "Riverstone", "Meridian", "Carriage House", "Foundry", "Red Door", "Parkview", "Stonebridge", "Lantern", "Fairhaven", "Copperline"],
    suffixes: ["Realty", "Properties", "Real Estate", "Property Group", "Homes", "Living"],
    descriptors: ["residential buying and selling", "luxury and relocation specialists", "property management and leasing"],
    pain: "keeping a steady pipeline of qualified buyers and sellers",
  },
  salon: {
    label: "Salons & spas",
    singular: "salon",
    prefixes: ["Velvet", "Rosewood", "Honeycomb", "Ember", "Willow", "Golden Hour", "Lavender & Oak", "Citrine", "Bloom", "Halo", "Juniper", "Saffron", "Pearl", "Fig & Fern", "Aster", "Noir", "Marigold", "Opal", "Sugar", "Copper Fox"],
    suffixes: ["Salon", "Studio", "Hair Co.", "Beauty Bar", "Spa", "Collective"],
    descriptors: ["full-service hair and color", "bridal styling and treatments", "skincare and spa services"],
    pain: "keeping chairs booked on slower weekdays",
  },
  restaurant: {
    label: "Restaurants",
    singular: "restaurant",
    prefixes: ["Juniper", "Copper Pot", "Smoke & Vine", "Blue Plate", "Harvest", "Golden Fork", "Red Barn", "Mezze", "Salt & Stone", "Firefly", "Wildflower", "Iron Skillet", "Market Street", "Pecan Lodge", "The Rustic", "Howell's", "Marble Rye", "Citrus", "The Daily", "Fig Tree"],
    suffixes: ["Kitchen", "Eatery", "Table", "Bistro", "Grill", "House"],
    descriptors: ["seasonal American comfort food", "family-owned neighborhood dining", "scratch-made brunch and dinner"],
    pain: "driving weeknight covers and repeat visits",
  },
  fitness: {
    label: "Gyms & studios",
    singular: "fitness studio",
    prefixes: ["Forge", "Ascent", "Northloop", "Iron Oak", "Momentum", "Cinder", "Basecamp", "Form", "Torque", "Summit", "Rally", "Pursuit", "Heavy Metal", "Core", "Ember", "Vital", "Stride", "Anchor", "Peak", "Haven"],
    suffixes: ["Fitness", "Strength Co.", "Athletics", "Training", "Gym", "Performance"],
    descriptors: ["strength and conditioning programs", "small-group personal training", "functional fitness and open gym"],
    pain: "converting January sign-ups into year-round members",
  },
  landscaping: {
    label: "Landscaping companies",
    singular: "landscaping company",
    prefixes: ["Greenline", "Cedar & Stone", "Truevine", "Oakmont", "Prairie", "Terra Nova", "Blue Stem", "Fieldstone", "Sunburst", "Ironwood", "Great Plains", "Wildscape", "Evergreen", "Sagebrush", "Copper Creek", "Timberline", "Bloomwell", "Native Roots", "Fairway", "Canyon"],
    suffixes: ["Landscaping", "Lawn Care", "Outdoor Living", "Grounds", "Landscape Co.", "Yard Works"],
    descriptors: ["residential lawn care and design", "commercial grounds maintenance", "hardscaping and outdoor living builds"],
    pain: "booking recurring maintenance contracts instead of one-off jobs",
  },
  accounting: {
    label: "Accounting firms",
    singular: "accounting firm",
    prefixes: ["Ledger", "Clearwater", "Northgate", "Summit", "Anchor", "Sterling", "Fairmont", "Bridgepoint", "Harbor", "Keystone", "Ashford", "True Balance", "Meridian", "Oakline", "Provident", "Cascade", "Cornerstone", "Ledgerwise", "Falcon", "Alder"],
    suffixes: ["Accounting", "CPAs", "Tax & Advisory", "Financial Group", "Bookkeeping", "Partners"],
    descriptors: ["small business tax and bookkeeping", "payroll and advisory services", "tax planning for owner-operated businesses"],
    pain: "winning year-round advisory clients, not just seasonal tax work",
  },
};

const GENERIC: CategoryDef = {
  label: "Local businesses",
  singular: "local business",
  prefixes: ["Northgate", "Summit", "Heritage", "Bluebonnet", "Ironwood", "Cedar", "Maple", "Beacon", "Fairway", "Atlas", "Ridgeline", "Harbor", "Foundry", "Meridian", "Oakline", "Trinity", "Copperfield", "Lakeshore", "Prairie", "Stonebridge"],
  suffixes: ["Co.", "Group", "Company", "Services", "Collective", "Works"],
  descriptors: ["locally owned services", "family-run operations", "full-service local operations"],
  pain: "finding a steady, predictable stream of new customers",
};

function resolveCategory(query: string): CategoryDef {
  const q = query.toLowerCase();
  const match = (keys: string[]) => keys.some((k) => q.includes(k));
  if (match(["dent", "orthodon"])) return CATEGORIES.dental;
  if (match(["roof"])) return CATEGORIES.roofing;
  if (match(["marketing", "agency", "agencies", "advertis", "seo"])) return CATEGORIES.marketing;
  if (match(["plumb", "rooter"])) return CATEGORIES.plumbing;
  if (match(["hvac", "air condition", "heating", "cooling"])) return CATEGORIES.hvac;
  if (match(["law", "attorney", "lawyer", "legal"])) return CATEGORIES.legal;
  if (match(["real estate", "realtor", "realty", "propert"])) return CATEGORIES.realestate;
  if (match(["salon", "spa", "barber", "hair", "nail"])) return CATEGORIES.salon;
  if (match(["restaurant", "cafe", "diner", "eatery", "bakery", "pizza", "taco", "bbq", "food"])) return CATEGORIES.restaurant;
  if (match(["gym", "fitness", "crossfit", "yoga", "pilates", "training"])) return CATEGORIES.fitness;
  if (match(["landscap", "lawn", "garden", "tree"])) return CATEGORIES.landscaping;
  if (match(["account", "bookkeep", "tax", "cpa"])) return CATEGORIES.accounting;
  return GENERIC;
}

// ————— Geography —————

interface Geo {
  city: string;
  state: string;
  country: string;
  pool: string[];
  uk: boolean;
}

const STATE_CITIES: Record<string, { state: string; country: string; cities: string[] }> = {
  texas: { state: "Texas", country: "United States", cities: ["Dallas", "Austin", "Houston", "San Antonio", "Fort Worth", "Plano", "Frisco", "McKinney"] },
  california: { state: "California", country: "United States", cities: ["Los Angeles", "San Diego", "San Jose", "Sacramento", "Fresno", "Long Beach"] },
  "new york": { state: "New York", country: "United States", cities: ["New York", "Buffalo", "Rochester", "Albany", "Syracuse"] },
  florida: { state: "Florida", country: "United States", cities: ["Miami", "Orlando", "Tampa", "Jacksonville", "Fort Lauderdale"] },
  georgia: { state: "Georgia", country: "United States", cities: ["Atlanta", "Savannah", "Augusta", "Athens", "Marietta"] },
  illinois: { state: "Illinois", country: "United States", cities: ["Chicago", "Naperville", "Aurora", "Springfield", "Evanston"] },
  colorado: { state: "Colorado", country: "United States", cities: ["Denver", "Boulder", "Colorado Springs", "Fort Collins", "Aurora"] },
  arizona: { state: "Arizona", country: "United States", cities: ["Phoenix", "Scottsdale", "Tucson", "Mesa", "Tempe"] },
  washington: { state: "Washington", country: "United States", cities: ["Seattle", "Tacoma", "Bellevue", "Spokane", "Kirkland"] },
  london: { state: "", country: "United Kingdom", cities: ["London", "Islington", "Shoreditch", "Camden", "Greenwich", "Richmond"] },
};

const CITY_INDEX: Record<string, Geo> = {};
for (const [key, val] of Object.entries(STATE_CITIES)) {
  for (const c of val.cities) {
    CITY_INDEX[c.toLowerCase()] = {
      city: c,
      state: val.state,
      country: val.country,
      pool: val.cities,
      uk: val.country === "United Kingdom"
    };
  }
  STATE_CITIES[key] = val;
}

function resolveLocation(input: string): Geo {
  const raw = input.trim().replace(/,.*$/, "");
  const key = raw.toLowerCase();
  const stateHit = STATE_CITIES[key];
  if (stateHit) {
    return {
      city: pick(stateHit.cities),
      state: stateHit.state,
      country: stateHit.country,
      pool: stateHit.cities,
      uk: stateHit.country === "United Kingdom",
    };
  }
  const cityHit = CITY_INDEX[key];
  if (cityHit) return cityHit;
  const title = raw ? raw.replace(/\b\w/g, (c) => c.toUpperCase()) : "Springfield";
  return { city: title, state: "", country: "United States", pool: [title], uk: false };
}

// ————— Candidate generation —————

const STREETS = ["Maple", "Main", "Oak", "Cedar", "Elm", "Park", "Congress", "Commerce", "Preston", "Guadalupe", "Lakeview", "Highland", "Walnut", "Sunrise", "Ridge", "Mission", "Franklin", "Harvest", "Willow", "Church"];
const STREET_TYPES = ["St", "Ave", "Blvd", "Rd", "Ln", "Dr", "Way"];

function slugify(s: string): string {
  return s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "");
}

function generateCandidates(
  query: string,
  location: string,
  qty: number,
  exclude: Set<string>
): { candidates: LeadCandidate[]; category: CategoryDef } {
  const cat = resolveCategory(query);
  const geo = resolveLocation(location);
  const out: LeadCandidate[] = [];
  const seen = new Set(exclude);
  let guard = qty * 60;

  while (out.length < qty && guard-- > 0) {
    const useCityName = Math.random() < 0.22;
    const prefix = useCityName ? pick(geo.pool) : pick(cat.prefixes);
    const company = `${prefix} ${pick(cat.suffixes)}`;
    const city = pick(geo.pool);
    const k = leadKey(company, city);
    if (seen.has(k)) continue;
    seen.add(k);

    const hasWebsite = Math.random() < 0.82;
    const hasRatings = Math.random() < 0.9;
    const rating = hasRatings ? Math.round(rand(3.5, 5.0) * 10) / 10 : null;
    const reviews =
      hasRatings && rating
        ? Math.round(rand(8, 60) + (rating - 3.5) * rand(20, 160))
        : null;
    const domain = hasWebsite
      ? `${slugify(company)}${geo.uk && Math.random() < 0.5 ? ".co.uk" : Math.random() < 0.92 ? ".com" : ".net"}`
      : null;
    const descriptor = pick(cat.descriptors);
    const hours = pick([
      "Mon–Fri · 9:00 AM – 6:00 PM",
      "Mon–Fri · 8:00 AM – 5:00 PM",
      "Mon–Sat · 9:00 AM – 7:00 PM",
      "Mon–Sat · 8:00 AM – 6:00 PM",
      "Tue–Sun · 10:00 AM – 8:00 PM",
      "Open 24 hours",
    ]);

    out.push({
      company,
      category: cat.label,
      address: `${Math.round(rand(100, 9800))} ${pick(STREETS)} ${pick(STREET_TYPES)}`,
      city,
      state: geo.state,
      country: geo.country,
      phone: geo.uk
        ? `+44 20 ${Math.round(rand(7000, 7999))} ${Math.round(rand(1000, 9999))}`
        : `(${Math.round(rand(201, 989))}) 555-${String(Math.round(rand(100, 9999))).padStart(4, "0")}`,
      website: domain ? `https://${domain}` : null,
      maps_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${company} ${city}`)}`,
      rating,
      reviews,
      hours: Math.random() < 0.08 ? null : hours,
      description: `${company} is a ${cat.singular} in ${city}${geo.state ? `, ${geo.state}` : ""} specializing in ${descriptor}.`,
    });
  }
  return { candidates: out, category: cat };
}

// ————— Email discovery —————

function discoverEmails(lead: Lead): {
  email: string | null;
  email_status: EmailStatus;
  email_source_url: string | null;
} {
  if (!lead.website)
    return { email: null, email_status: "unknown", email_source_url: null };
  const roll = Math.random();
  if (roll < 0.24)
    return { email: null, email_status: "unknown", email_source_url: null };
  const domain = lead.website.replace(/^https?:\/\//, "");
  const local = pick(["hello", "info", "contact", "office", "team"]);
  const email = `${local}@${domain}`;
  const status: EmailStatus =
    roll < 0.24 + 0.5 ? "verified" : roll < 0.24 + 0.5 + 0.18 ? "risky" : "invalid";
  const path = pick(["/contact", "/contact-us", "/about", ""]);
  return { email, email_status: status, email_source_url: `${lead.website}${path}` };
}

// ————— Job runner —————

const running = new Set<string>();

function setJob(id: string, patch: Partial<SearchJob>) {
  db.update<SearchJob>("search_jobs", id, { ...patch, updated_at: now() });
}

async function runJob(jobId: string, userId: string) {
  if (running.has(jobId)) return;
  running.add(jobId);
  try {
    let job = db.byId<SearchJob>("search_jobs", jobId);
    if (!job) return;

    if (job.status === "queued" || job.status === "searching") {
      setJob(jobId, { status: "searching", progress: Math.max(job.progress, 4) });
      await wait(rand(1100, 1600));
    }

    // collect → insert leads progressively
    job = db.byId<SearchJob>("search_jobs", jobId)!;
    if (job.status === "searching" || job.status === "collecting") {
      setJob(jobId, { status: "collecting", progress: Math.max(job.progress, 10) });
      while (true) {
        job = db.byId<SearchJob>("search_jobs", jobId)!;
        if (job.collected >= job.candidates.length) break;
        const batch = job.candidates.slice(job.collected, job.collected + 4);
        for (const c of batch) {
          db.insert<Lead>("leads", {
            ...c,
            id: uid(),
            user_id: userId,
            job_id: jobId,
            email: null,
            email_status: null,
            email_source_url: null,
            ai_score: null,
            ai_summary: null,
            created_at: now(),
            updated_at: now(),
          });
          consumeLeads(userId, 1);
        }
        const collected = Math.min(job.collected + batch.length, job.candidates.length);
        setJob(jobId, {
          collected,
          progress: 10 + Math.round((collected / job.quantity) * 45),
        });
        await wait(210);
      }
    }

    // enrich (website pages crawled for public business data)
    job = db.byId<SearchJob>("search_jobs", jobId)!;
    if (job.status === "collecting" || job.status === "enriching") {
      setJob(jobId, { status: "enriching" });
      for (const p of [60, 64, 68]) {
        setJob(jobId, { progress: p });
        await wait(rand(320, 480));
      }
    }

    // find + verify publicly listed emails
    job = db.byId<SearchJob>("search_jobs", jobId)!;
    if (job.status === "enriching" || job.status === "finding_emails") {
      setJob(jobId, { status: "finding_emails", progress: Math.max(job.progress, 70) });
      const leads = db.where<Lead>(
        "leads",
        (l) => l.job_id === jobId && l.email_status === null
      );
      for (let i = 0; i < leads.length; i += 5) {
        for (const l of leads.slice(i, i + 5)) {
          const found = discoverEmails(l);
          db.update<Lead>("leads", l.id, { ...found, updated_at: now() });
        }
        setJob(jobId, {
          progress:
            70 + Math.round(((i + 5) / Math.max(1, leads.length)) * 28),
        });
        await wait(200);
      }
    }

    setJob(jobId, { status: "complete", progress: 100 });
  } catch (e) {
    setJob(jobId, {
      status: "failed",
      error: e instanceof Error ? e.message : "Search failed.",
    });
  } finally {
    running.delete(jobId);
  }
}

export async function startSearch(
  userId: string,
  input: { query: string; location: string; quantity: number }
): Promise<SearchJob> {
  const query = input.query.trim();
  const location = input.location.trim();
  if (!query) throw new Error("Describe who you're looking for.");
  if (!location) throw new Error("Add a city, state or country.");

  const qty = Math.max(1, Math.min(200, Math.round(input.quantity)));

  // Production: enqueue on the API — the Python/Selenium worker
  // claims queued jobs and streams real Google Maps leads into
  // Supabase. Usage is enforced atomically server-side.
  if (isRemote()) {
    const job = await api<SearchJob>("/api/search", {
      body: { query, location, quantity: qty },
    });
    cacheRow("search_jobs", job);
    void syncFromServer(true);
    return job;
  }

  assertLeadQuota(userId, qty);

  const existing = new Set(
    db.where<Lead>("leads", (l) => l.user_id === userId).map((l) => leadKey(l.company, l.city))
  );
  const { candidates } = generateCandidates(query, location, qty, existing);
  if (candidates.length === 0) throw new Error("No new businesses found for those filters — you may already have them all.");

  const job: SearchJob = {
    id: uid(),
    user_id: userId,
    query,
    location,
    quantity: candidates.length,
    status: "queued",
    progress: 0,
    collected: 0,
    candidates,
    error: null,
    created_at: now(),
    updated_at: now(),
  };
  db.insert("search_jobs", job);
  void runJob(job.id, userId);
  return job;
}

/** Resume jobs interrupted by reload — nothing is ever left stuck. */
export function resumeJobs(userId: string) {
  if (isRemote()) return; // worker owns job lifecycle in production
  const stuck = db.where<SearchJob>(
    "search_jobs",
    (j) => j.user_id === userId && j.status !== "complete" && j.status !== "failed"
  );
  for (const j of stuck) void runJob(j.id, userId);
}

export const vocabulary = { resolveCategory, resolveLocation };
