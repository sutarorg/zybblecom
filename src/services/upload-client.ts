import type { WorkspaceAdapter, Result } from "./workspace-contracts";
import type { UploadAction } from "@/lib/media/source-policy";

async function upload<T>(body: UploadAction): Promise<Result<T>> {
  try {
    const response = await fetch("/api/uploads", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (response.ok && payload?.success === true)
      return { ok: true, value: payload.data as T };
    switch (response.status) {
      case 401:
      case 403:
        return { ok: false, error: "unauthorized" };
      case 404:
        return { ok: false, error: "not_found" };
      case 409:
        return { ok: false, error: "conflict" };
      case 410:
        return { ok: false, error: "cancelled" };
      case 422:
        return { ok: false, error: "invalid_media" };
      case 400:
      case 413:
        return { ok: false, error: "validation" };
      case 429:
        return { ok: false, error: "rate_limited" };
      case 503:
        return { ok: false, error: "unavailable" };
      default:
        return { ok: false, error: "unexpected" };
    }
  } catch {
    return { ok: false, error: "network" };
  }
}

export const uploadAdapter: Pick<
  WorkspaceAdapter,
  | "getUploadPolicy"
  | "beginUpload"
  | "signPart"
  | "finishUpload"
  | "cancelUpload"
> = {
  getUploadPolicy: () => upload({ action: "policy" }),
  beginUpload: (input) => upload({ ...input, action: "begin" }),
  signPart: (input) => upload({ ...input, action: "part" }),
  finishUpload: (input) =>
    upload({ ...input, parts: [...input.parts], action: "finish" }),
  cancelUpload: (uploadId) => upload({ action: "cancel", uploadId }),
};
