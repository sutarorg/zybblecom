import type {
  VerifiedUpload,
  Result,
  UploadTicket,
} from "./workspace-contracts";
import { workspace } from "./workspace";
export type UploadProgress = {
  sent: number;
  total: number;
  bytesPerSecond?: number;
  secondsRemaining?: number;
};
function putBlob(
  url: string,
  headers: Record<string, string>,
  data: Blob,
  signal: AbortSignal,
  progress: (sent: number) => void,
): Promise<string | null> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Cancelled", "AbortError"));
      return;
    }
    const target = new URL(url, window.location.origin);
    if (
      (target.origin !== window.location.origin &&
        target.protocol !== "https:") ||
      target.username ||
      target.password
    ) {
      reject(new Error("Invalid upload target"));
      return;
    }
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    signal.addEventListener("abort", abort, { once: true });
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) progress(Math.min(data.size, e.loaded));
    });
    xhr.addEventListener("loadend", () =>
      signal.removeEventListener("abort", abort),
    );
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300)
        resolve(xhr.getResponseHeader("ETag"));
      else reject(Error("Upload rejected"));
    });
    xhr.addEventListener("abort", () =>
      reject(new DOMException("Cancelled", "AbortError")),
    );
    xhr.addEventListener("error", () => reject(Error("Upload interrupted")));
    try {
      xhr.open("PUT", target.href);
      for (const [header, value] of Object.entries(headers))
        xhr.setRequestHeader(header, value);
      xhr.send(data);
    } catch (error) {
      signal.removeEventListener("abort", abort);
      reject(error);
    }
  });
}
/** Called only after a trusted upload policy is available. Ticket creation and completion are separately verified. */
export async function transferVideo(input: {
  file: File;
  title: string;
  signal: AbortSignal;
  resumeId?: string;
  onTicket: (ticket: UploadTicket) => void;
  onProgress: (progress: UploadProgress) => void;
  onVerify: () => void;
}): Promise<Result<VerifiedUpload>> {
  const { file, signal } = input;
  if (signal.aborted) return { ok: false, error: "cancelled" };
  const ticket = await workspace.run("beginUpload", {
    title: input.title,
    filename: file.name,
    bytes: file.size,
    mime: file.type,
    resumeId: input.resumeId,
  });
  if (!ticket.ok) return ticket;
  input.onTicket(ticket.value);
  const started = performance.now();
  let resumedBytes = 0;
  function report(sent: number) {
    const elapsed = (performance.now() - started) / 1000;
    const speed =
      elapsed > 0.75 && sent > resumedBytes
        ? (sent - resumedBytes) / elapsed
        : undefined;
    input.onProgress({
      sent,
      total: file.size,
      bytesPerSecond: speed,
      secondsRemaining: speed
        ? Math.ceil((file.size - sent) / speed)
        : undefined,
    });
  }
  const parts: { number: number; etag: string }[] = [];
  let etag: string | undefined;
  try {
    if (signal.aborted) return { ok: false, error: "cancelled" };
    if (ticket.value.mode === "put") {
      etag =
        (await putBlob(
          ticket.value.url,
          ticket.value.headers,
          file,
          signal,
          report,
        )) ?? undefined;
      if (!etag) return { ok: false, error: "unexpected" };
    } else if (ticket.value.mode === "multipart") {
      const { partSize, completedParts, uploadId } = ticket.value;
      if (
        !Number.isSafeInteger(partSize) ||
        partSize <= 0 ||
        Math.ceil(file.size / partSize) > 10000
      )
        return { ok: false, error: "unexpected" };
      const known = new Map(
        completedParts.map((part) => [part.number, part.etag]),
      );
      for (
        let start = 0, number = 1;
        start < file.size;
        start += partSize, number++
      )
        if (known.has(number))
          resumedBytes += Math.min(partSize, file.size - start);
      let sent = resumedBytes;
      report(sent);
      for (
        let start = 0, number = 1;
        start < file.size;
        start += partSize, number++
      ) {
        if (signal.aborted) return { ok: false, error: "cancelled" };
        let etag = known.get(number);
        if (!etag) {
          const blob = file.slice(start, Math.min(file.size, start + partSize));
          // A retry of the same part number is safe; R2 keeps only the newest part.
          for (let attempt = 0; attempt < 2 && !etag; attempt++) {
            if (signal.aborted) return { ok: false, error: "cancelled" };
            const part = await workspace.run("signPart", { uploadId, number });
            if (!part.ok) return part;
            try {
              etag =
                (await putBlob(
                  part.value.url,
                  part.value.headers,
                  blob,
                  signal,
                  (loaded) => report(sent + loaded),
                )) ?? undefined;
              // Missing CORS-exposed ETag cannot be retried in place; resume using R2 ListParts.
              if (!etag) return { ok: false, error: "unexpected" };
            } catch (error) {
              if (signal.aborted || attempt === 1) throw error;
              report(sent);
            }
          }
          sent += blob.size;
          report(sent);
        }
        if (!etag) return { ok: false, error: "unexpected" };
        parts.push({ number, etag });
      }
    }
    if (signal.aborted) return { ok: false, error: "cancelled" };
    report(file.size);
    input.onVerify();
    const result = await workspace.run("finishUpload", {
      uploadId: ticket.value.uploadId,
      parts,
      etag,
    });
    if (
      result.ok &&
      (result.value.id !== ticket.value.projectId ||
        result.value.status !== "uploaded" ||
        !(result.value.source?.durationSeconds > 0) ||
        result.value.source.bytes !== file.size)
    )
      return { ok: false, error: "unexpected" };
    return result;
  } catch {
    return { ok: false, error: signal.aborted ? "cancelled" : "network" };
  }
}
