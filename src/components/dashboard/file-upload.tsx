"use client";

import { AlertCircle, Check, CloudUpload, Loader2, Paperclip, X } from "lucide-react";
import { useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type UploadKind = "video" | "pdf" | "image" | "resource";

const ACCEPT: Record<UploadKind, string> = {
  video: "video/mp4,video/webm,video/quicktime,video/x-m4v",
  pdf: "application/pdf",
  image: "image/jpeg,image/png,image/webp,image/avif",
  resource:
    "application/pdf,application/zip,image/jpeg,image/png,image/webp,text/plain,text/csv," +
    ".doc,.docx,.xls,.xlsx,.ppt,.pptx",
};

const HINT: Record<UploadKind, string> = {
  video: "MP4, WebM or MOV · up to 2 GB",
  pdf: "PDF · up to 100 MB",
  image: "JPG, PNG, WebP or AVIF · up to 10 MB",
  resource: "PDF, ZIP, DOC, XLS, PPT, CSV or image · up to 200 MB",
};

type UploadState =
  | { phase: "idle" }
  | { phase: "preparing" }
  | { phase: "uploading"; percent: number; name: string }
  | { phase: "done"; name: string };

async function presignAndUpload(
  file: File,
  courseId: string,
  kind: UploadKind,
  onProgress: (percent: number) => void,
): Promise<string> {
  const res = await fetch("/api/uploads/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      courseId,
      kind,
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      size: file.size,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    uploadUrl?: string;
    publicUrl?: string;
    contentType?: string;
    error?: string;
  };
  if (!res.ok || !data.uploadUrl || !data.publicUrl) {
    throw new Error(data.error ?? "Couldn't prepare the upload.");
  }

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", data.uploadUrl!);
    xhr.setRequestHeader("Content-Type", data.contentType ?? file.type);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Storage rejected the upload (HTTP ${xhr.status}).`));
    xhr.onerror = () =>
      reject(
        new Error(
          "Network error during upload. If this persists, check the bucket's CORS policy allows this origin.",
        ),
      );
    xhr.onabort = () => reject(new Error("Upload cancelled."));
    xhr.send(file);
  });

  return data.publicUrl;
}

/* ------------------------- full field (label + input) ------------------------ */

export function UploadField({
  label,
  hint,
  value,
  onChange,
  courseId,
  kind,
  placeholder,
  required,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (url: string) => void;
  courseId: string;
  kind: UploadKind;
  placeholder?: string;
  required?: boolean;
}) {
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadState>({ phase: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const busy = state.phase === "preparing" || state.phase === "uploading";

  const handleFile = async (file: File) => {
    setError(null);
    setState({ phase: "preparing" });
    try {
      const url = await presignAndUpload(file, courseId, kind, (percent) =>
        setState({ phase: "uploading", percent, name: file.name }),
      );
      onChange(url);
      setState({ phase: "done", name: file.name });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
      setState({ phase: "idle" });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div>
      <label htmlFor={inputId} className="label">
        {label}
      </label>

      <div className="flex gap-2">
        <input
          id={inputId}
          className="input flex-1"
          type="url"
          inputMode="url"
          placeholder={placeholder ?? "https://…"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          disabled={busy}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="btn btn-outline btn-sm h-11 shrink-0"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <CloudUpload className="size-3.5" />}
          {busy ? "Uploading" : "Upload"}
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT[kind]}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      {/* Drop zone — only when empty and idle */}
      {!value && !busy && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) void handleFile(file);
          }}
          onClick={() => fileRef.current?.click()}
          className={cn(
            "mt-2 cursor-pointer rounded-xl border border-dashed px-4 py-3 text-center transition-colors",
            dragging ? "border-grape bg-grape-soft" : "border-line bg-paper hover:border-grape/50",
          )}
        >
          <p className="text-[12.5px] font-medium text-ink-soft">
            Drop a file here, or click to browse
          </p>
          <p className="mt-0.5 text-[11.5px] text-mut">{hint ?? HINT[kind]}</p>
        </div>
      )}

      {state.phase === "uploading" && (
        <div className="mt-2" role="status" aria-live="polite">
          <div className="flex items-center justify-between text-[11.5px] font-medium">
            <span className="truncate text-ink-soft">{state.name}</span>
            <span className="tabular-nums text-grape">{state.percent}%</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-cream">
            <div
              className="h-full rounded-full bg-gradient-to-r from-grape to-[#b7a4ff] transition-all duration-200"
              style={{ width: `${state.percent}%` }}
            />
          </div>
        </div>
      )}

      {state.phase === "preparing" && (
        <p className="mt-2 text-[12px] text-mut">Preparing secure upload…</p>
      )}

      {state.phase === "done" && (
        <p className="mt-2 flex items-center gap-1.5 text-[12px] font-medium text-mint">
          <Check className="size-3.5" /> Uploaded {state.name}
        </p>
      )}

      {value && !busy && state.phase !== "done" && (
        <p className="mt-2 flex items-center gap-1.5 text-[12px] text-mut">
          <Paperclip className="size-3" />
          <span className="truncate">File linked</span>
          <button
            type="button"
            onClick={() => onChange("")}
            className="ml-auto inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-mut transition-colors hover:text-rose"
          >
            <X className="size-3" /> Clear
          </button>
        </p>
      )}

      {error && (
        <p role="alert" className="mt-2 flex items-start gap-1.5 text-[12px] font-medium text-rose">
          <AlertCircle className="mt-px size-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

/* --------------------------- compact icon uploader --------------------------- */

export function InlineUploadButton({
  courseId,
  kind,
  onUploaded,
  label = "Upload file",
}: {
  courseId: string;
  kind: UploadKind;
  onUploaded: (url: string, filename: string) => void;
  label?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [percent, setPercent] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setBusy(true);
    setPercent(0);
    try {
      const url = await presignAndUpload(file, courseId, kind, setPercent);
      onUploaded(url, file.name.replace(/\.[^.]+$/, ""));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label={label}
        title={error ?? label}
        disabled={busy}
        onClick={() => fileRef.current?.click()}
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-xl border transition-colors",
          error
            ? "border-rose/40 text-rose"
            : "border-line text-mut hover:border-grape/50 hover:text-grape",
        )}
      >
        {busy ? (
          <span className="text-[10px] font-bold tabular-nums text-grape">{percent}</span>
        ) : (
          <CloudUpload className="size-3.5" />
        )}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT[kind]}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
    </>
  );
}
