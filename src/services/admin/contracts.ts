import type { GenerationParams } from "@/services/generation-schema";
import type { ProjectStatus } from "@/services/workspace-contracts";

export type AdminError =
  | "unavailable"
  | "unauthenticated"
  | "expired"
  | "forbidden"
  | "not_found"
  | "network"
  | "invalid"
  | "conflict"
  | "rate_limited"
  | "unexpected";
export type Result<T> =
  { ok: true; value: T } | { ok: false; error: AdminError };
export type Page<T> = {
  items: readonly T[];
  nextCursor: string | null;
  previousCursor?: string | null;
};
export type Permission =
  | "overview"
  | "users"
  | "projects"
  | "jobs"
  | "payments"
  | "credits"
  | "webhooks"
  | "audit"
  | "settings";
export type AdminSession = {
  id: string;
  name: string;
  roleLabel: string;
  permissions: readonly Permission[];
  build?: string;
};
export type Money = {
  amountMinor: number;
  currency: string;
  minorUnit: number;
};
export type AccountStatus = "active" | "suspended";
export type UserRecord = {
  id: string;
  name?: string;
  email: string;
  createdAt: string;
  country?: string;
  available?: number;
  purchases?: number;
  projectsProcessed?: number;
  status: AccountStatus;
};
export type CreditTotals = {
  purchased: number;
  consumed: number;
  outstandingPurchased: number;
  reserved: number;
  adjusted: number;
  refunded: number;
};
export type UserDetails = UserRecord & {
  credits?: { purchased: number; consumed: number; reserved: number };
  notes?: readonly { id: string; author: string; text: string; time: string }[];
  actions: readonly UserOperation[];
};
export type Owner = { id: string; label: string };
export type ProjectRecord = {
  id: string;
  owner: Owner;
  title: string;
  sourceSeconds?: number;
  uploadedAt?: string;
  status: ProjectStatus;
  clipCount: number;
};
export type ProjectDetail = ProjectRecord & {
  source?: { filename: string; bytes: number; width?: number; height?: number };
  jobId?: string;
};
export type JobStatus =
  "queued" | "processing" | "saving" | "completed" | "failed";
export type AssetState = "pending" | "copying" | "copied" | "failed";
export type JobRecord = {
  id: string;
  providerId?: string;
  owner: Owner;
  project: { id: string; title: string };
  sourceSeconds?: number;
  requestedClips: number;
  status: JobStatus;
  providerStage?: "fetching" | "transcribing" | "ranking" | "rendering";
  reserved?: number;
  consumed?: number;
  createdAt: string;
  completedAt?: string;
  stuck?: true;
  assetState?: AssetState;
};
export type JobDetail = JobRecord & {
  settings?: Omit<GenerationParams, "prompt">;
  provider?: {
    status: "queued" | "running" | "succeeded" | "failed";
    errorCode?: string;
    outputCount?: number;
    billingBasis?: "source_minutes" | "clip_minutes";
    usageSourceMinutes?: number;
    outputSeconds?: number;
    verifiedAt: string;
  };
  elapsedSeconds?: number;
  reservation?: {
    id: string;
    status: "reserved" | "released" | "consumed";
    credits: number;
    settledAt?: string;
  };
  retries?: readonly {
    id: string;
    at: string;
    kind: "reconcile" | "retry_assets" | "reprocess";
    status: "queued" | "succeeded" | "failed";
  }[];
  actions: readonly JobOperation[];
};
export type PaymentStatus =
  "pending" | "succeeded" | "failed" | "refunded" | "disputed";
export type Payment = {
  id: string;
  dodoId: string;
  customer: Owner;
  pack: string;
  money: Money;
  status: PaymentStatus;
  purchasedAt: string;
  fulfillment: "pending" | "fulfilled" | "reversed" | "failed";
};
export type PaymentDetail = Payment & {
  creditsGranted?: number;
  refundedAmount?: Money;
  refundStatus?: "partial" | "full";
  disputeStatus?: string;
  updatedAt?: string;
};
export type LedgerKind =
  "purchase" | "reserve" | "consume" | "release" | "refund" | "adjustment";
export type LedgerRecord = {
  id: string;
  customer: Owner;
  kind: LedgerKind;
  delta: number;
  before?: number;
  after?: number;
  adminId?: string;
  reason?: string;
  at: string;
  reference?: string;
};
export type HookSource = "clipsdk" | "dodo";
export type HookSignature = "verified" | "invalid" | "not_checked";
export type HookStatus =
  "processed" | "duplicate" | "failed" | "pending_reconciliation";
export type HookRecord = {
  id: string;
  source: HookSource;
  type?: string;
  receivedAt: string;
  signature: HookSignature;
  status: HookStatus;
  related?: { kind: "job" | "payment"; id: string };
  errorSummary?: string;
};
/** Explicit safe projection, never a raw payload, header dump, signed URL, or arbitrary provider metadata. */
export type HookDetail = HookRecord & {
  delivery?: {
    attempt?: number;
    providerStatus?: string;
    code?: string;
    outputCount?: number;
  };
  canRetry: boolean;
};
export type AuditCategory =
  "users" | "jobs" | "credits" | "webhooks" | "settings" | "access";
export type AuditRecord = {
  id: string;
  actor: Owner;
  category: AuditCategory;
  action: string;
  recordId: string;
  at: string;
  reason?: string;
  status: "succeeded" | "rejected" | "failed" | "queued";
};
export type TrendMetric =
  "registrations" | "completed_videos" | "clips" | "consumed_credits";
export type Trend = {
  metric: TrendMetric;
  points: readonly { date: string; value: number }[];
};
export type Activity = {
  id: string;
  kind:
    | "registration"
    | "purchase"
    | "job_completed"
    | "job_failed"
    | "credit_adjustment"
    | "webhook_failed";
  at: string;
  summary: string;
  target?: {
    kind: "users" | "jobs" | "payments" | "credits" | "webhooks";
    id: string;
  };
};
export type Overview = {
  asOf: string;
  users?: number;
  projects?: number;
  processed?: number;
  clips?: number;
  grossByCurrency?: readonly Money[];
  credits?: { available: number; consumed: number };
  activeJobs?: number;
  failedJobs?: number;
  trends?: readonly Trend[];
};
export type AdminSettings = {
  revision: string;
  editable: readonly SettingSection[];
  platform: { displayName: string; registrationEnabled: boolean };
  pricing: { packId: string; credits: number; prices: readonly Money[] }[];
  credits: { creditsPerMinute: number; allowNegativeBalance: boolean };
  uploads: { maxBytes: number; formats: readonly ("mp4" | "mov" | "webm")[] };
  processing: { maxSourceSeconds: number; maxClips: number };
  support: { contactEmail: string; intakeEnabled: boolean };
  maintenance: { enabled: boolean; notice: string };
};
export type SettingSection = Exclude<
  keyof AdminSettings,
  "revision" | "editable"
>;
export type SettingsPatch = {
  [K in SettingSection]: { section: K; value: AdminSettings[K] };
}[SettingSection];
export type UserOperation =
  "add_credits" | "deduct_credits" | "suspend" | "reactivate" | "internal_note";
export type JobOperation =
  | "reconcile"
  | "retry_assets"
  | "investigate"
  | "release_reservation"
  | "reprocess";
export type AdminIntent =
  | { kind: "add_credits" | "deduct_credits"; id: string; amount: number }
  | { kind: "suspend" | "reactivate"; id: string }
  | { kind: "internal_note"; id: string; note: string }
  | { kind: JobOperation | "retry_webhook"; id: string }
  | { kind: "update_settings"; id: string; patch: SettingsPatch };
export type PreparedAction = {
  id: string;
  expiresAt: string;
  targetLabel: string;
  summary: string;
  balance?: { previous: number; delta: number; next: number };
  reprocessing?: { creditImpact: string; providerCost: Money };
};
export type CommandReceipt = { auditId: string; status: "queued" | "applied" };
export type QueryPage = { cursor?: string };
export type Dated = { from?: string; to?: string };
export type UserQuery = QueryPage & {
  search?: string;
  country?: string;
  status?: AccountStatus;
  order: "newest" | "oldest";
};
export type ProjectQuery = QueryPage & {
  search?: string;
  status?: ProjectStatus;
  userId?: string;
};
export type JobQuery = QueryPage & {
  search?: string;
  filter?:
    "processing" | "completed" | "failed" | "stuck" | "asset_copy_failed";
};
export type PaymentQuery = QueryPage &
  Dated & { search?: string; status?: PaymentStatus; userId?: string };
export type LedgerQuery = QueryPage &
  Dated & { userId?: string; kind?: LedgerKind };
export type HookQuery = QueryPage & {
  source?: HookSource;
  signature?: HookSignature;
  status?: HookStatus;
  jobId?: string;
};
export type AuditQuery = QueryPage &
  Dated & { admin?: string; category?: AuditCategory; record?: string };
export interface AdminReads {
  getSession(): Promise<Result<AdminSession>>;
  overview(): Promise<Result<Overview>>;
  activity(q: QueryPage): Promise<Result<Page<Activity>>>;
  users(q: UserQuery): Promise<Result<Page<UserRecord>>>;
  user(id: string): Promise<Result<UserDetails>>;
  projects(q: ProjectQuery): Promise<Result<Page<ProjectRecord>>>;
  project(id: string): Promise<Result<ProjectDetail>>;
  jobs(q: JobQuery): Promise<Result<Page<JobRecord>>>;
  job(id: string): Promise<Result<JobDetail>>;
  payments(q: PaymentQuery): Promise<Result<Page<Payment>>>;
  payment(id: string): Promise<Result<PaymentDetail>>;
  creditTotals(): Promise<Result<CreditTotals>>;
  ledger(q: LedgerQuery): Promise<Result<Page<LedgerRecord>>>;
  webhooks(q: HookQuery): Promise<Result<Page<HookRecord>>>;
  webhook(id: string): Promise<Result<HookDetail>>;
  audit(q: AuditQuery): Promise<Result<Page<AuditRecord>>>;
  settings(): Promise<Result<AdminSettings>>;
}
export interface AdminCommands {
  prepare(input: {
    intent: AdminIntent;
    reason: string;
  }): Promise<Result<PreparedAction>>;
  execute(input: {
    preparedId: string;
    requestKey: string;
  }): Promise<Result<CommandReceipt>>;
  logout(): Promise<Result<null>>;
}
