import type { Currency } from "@/config/credit-packs";
import type { ServiceResult, ServiceError } from "@/lib/services/contracts";
import type { GenerationParams, GenerationOptions } from "./generation-schema";

export type WorkspaceError =
  | ServiceError
  | "not_found"
  | "insufficient_credits"
  | "conflict"
  | "cancelled"
  | "invalid_media";
export type Result<T> =
  | ServiceResult<T>
  | { ok: false; error: Exclude<WorkspaceError, ServiceError> };
export type Page<T> = { items: readonly T[]; nextCursor: string | null };
export type ProjectStatus =
  | "uploading"
  | "uploaded"
  | "processing"
  | "completed"
  | "failed";
export type Project = {
  id: string;
  title: string;
  createdAt: string;
  status: ProjectStatus;
  clipCount: number;
  source?: {
    filename: string;
    durationSeconds: number;
    bytes: number;
    width?: number;
    height?: number;
    thumbnail?: string;
  };
  canDelete: boolean;
};
export type VerifiedUpload = Project & {
  status: "uploaded";
  source: NonNullable<Project["source"]>;
};
export type AssetKind = "mp4" | "srt" | "vtt" | "thumbnail";
export type Clip = {
  id: string;
  projectId: string;
  projectTitle: string;
  title: string;
  description?: string;
  createdAt: string;
  aspect: GenerationOptions["aspect"];
  durationSeconds: number;
  startSeconds: number;
  endSeconds: number;
  rank?: number;
  score?: number;
  poster?: string;
  playback?: string;
  vtt?: string;
  language?: string;
  transcript?: string;
  captions: GenerationOptions["captions"];
  downloads: readonly AssetKind[];
  canEditMetadata: boolean;
};
export type JobPhase =
  | "preparing"
  | "submitted"
  | "processing"
  | "saving"
  | "completed"
  | "failed";
export type Job = {
  id: string;
  phase: JobPhase;
  providerStage?: "fetching" | "transcribing" | "ranking" | "rendering";
  createdAt: string;
  configuration: GenerationParams;
  reservation?: {
    credits: number;
    state: "reserved" | "consumed" | "released";
  };
  failure?: {
    kind: "source" | "speech" | "timeout" | "service";
    canRetry: boolean;
  };
  remainingCredits?: number;
};
export type Balance = { available: number; reserved: number; consumed: number };
export type CreditQuote = {
  id: string;
  required: number;
  available: number;
  expiresAt: string;
};
export type Profile = { name: string; email: string; avatarUrl?: string };
export type Preferences = {
  defaultAspect: GenerationOptions["aspect"];
  defaultCaptions: GenerationOptions["captions"];
  jobEmail?: boolean;
};
export type LedgerEntry = {
  id: string;
  createdAt: string;
  reference?: string;
} & (
  | {
      kind: "purchase";
      packId: string;
      amountMinor: number;
      currency: Currency;
      paymentState:
        | "pending"
        | "confirmed"
        | "cancelled"
        | "failed"
        | "refunded"
        | "review";
      grantedCredits?: number;
    }
  | {
      kind: "reserved" | "consumed" | "released" | "refund" | "adjustment";
      creditDelta: number;
    }
);
export type ProjectQuery = {
  search: string;
  status: ProjectStatus | "all";
  order: "newest" | "oldest";
  cursor?: string;
};
export type ClipQuery = {
  search: string;
  projectId?: string;
  since?: string;
  order: "rank" | "score" | "newest";
  cursor?: string;
};
export type UploadPolicy = { maxBytes: number; mode: "put" | "multipart" };
export type UploadTicket =
  | { uploadId: string; projectId: string; mode: "stored" }
  | {
      uploadId: string;
      projectId: string;
      mode: "put";
      url: string;
      headers: Record<string, string>;
    }
  | {
      uploadId: string;
      projectId: string;
      mode: "multipart";
      partSize: number;
      completedParts: readonly { number: number; etag: string }[];
    };
export type RefreshTopic = "projects" | "generation" | "balance" | "assets";

export interface WorkspaceAdapter {
  getProfile(): Promise<Result<Profile>>;
  saveProfile(input: { name: string; avatar?: File }): Promise<Result<Profile>>;
  getPreferences(): Promise<Result<Preferences>>;
  savePreferences(input: Preferences): Promise<Result<Preferences>>;
  getOverview(): Promise<
    Result<{ videosProcessed: number; clipsGenerated: number }>
  >;
  listProjects(query: ProjectQuery): Promise<Result<Page<Project>>>;
  getProject(id: string): Promise<Result<{ project: Project; job?: Job }>>;
  deleteProject(id: string): Promise<Result<null>>;
  getUploadPolicy(): Promise<Result<UploadPolicy>>;
  beginUpload(input: {
    title: string;
    filename: string;
    bytes: number;
    mime: string;
    resumeId?: string;
  }): Promise<Result<UploadTicket>>;
  signPart(input: {
    uploadId: string;
    number: number;
  }): Promise<Result<{ url: string; headers: Record<string, string> }>>;
  finishUpload(input: {
    uploadId: string;
    parts: readonly { number: number; etag: string }[];
    etag?: string;
  }): Promise<Result<VerifiedUpload>>;
  cancelUpload(uploadId: string): Promise<Result<null>>;
  quoteGeneration(input: {
    projectId: string;
    settings: GenerationParams;
    retryJobId?: string;
  }): Promise<Result<CreditQuote>>;
  startGeneration(input: {
    projectId: string;
    settings: GenerationParams;
    quoteId: string;
    requestKey: string;
    retryJobId?: string;
  }): Promise<Result<Job>>;
  listClips(query: ClipQuery): Promise<Result<Page<Clip>>>;
  getClip(projectId: string, clipId: string): Promise<Result<Clip>>;
  saveClip(input: {
    projectId: string;
    clipId: string;
    title: string;
    description: string;
  }): Promise<Result<Clip>>;
  downloadClip(input: {
    projectId: string;
    clipId: string;
    asset: AssetKind;
  }): Promise<Result<{ url: string }>>;
  getBalance(): Promise<Result<Balance>>;
  listLedger(input: {
    filter: "all" | "purchases" | "usage";
    cursor?: string;
  }): Promise<Result<Page<LedgerEntry>>>;
  getSupportCapabilities(): Promise<Result<{ canSend: boolean }>>;
  sendSupport(input: {
    subject: string;
    message: string;
  }): Promise<Result<null>>;
  subscribe(
    input: { topics: readonly RefreshTopic[]; projectId?: string },
    invalidate: () => void,
  ): () => void;
}
