"use client";
import { useId, useRef, useState } from "react";
import { CloudUpload, Film, X } from "lucide-react";
import { fileAccept, validateVideo } from "@/services/generation-schema";
import { bytesText } from "@/services/workspace-format";
export function FilePicker({
  file,
  onFile,
  maxBytes,
  dashboard = false,
  disabled = false,
}: {
  file: File | null;
  onFile: (value: File | null) => void;
  maxBytes?: number;
  dashboard?: boolean;
  disabled?: boolean;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const depth = useRef(0);
  const [error, setError] = useState("");
  function select(files: FileList | null) {
    if (disabled || !files?.length) return;
    if (files.length !== 1) {
      setError("Choose one video per project.");
      return;
    }
    const next = files[0];
    const issue = validateVideo(next, maxBytes);
    setError(issue ?? "");
    if (!issue) onFile(next);
  }
  return (
    <div
      className={`ws-picker ${drag ? "ws-dragging" : ""}`}
      onDragEnter={(e) => {
        if (!disabled && e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          depth.current++;
          setDrag(true);
        }
      }}
      onDragOver={(e) => {
        if (!disabled && e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }
      }}
      onDragLeave={() => {
        depth.current = Math.max(0, depth.current - 1);
        if (!depth.current) setDrag(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        depth.current = 0;
        setDrag(false);
        select(e.dataTransfer.files);
      }}
    >
      <span className="ws-picker-icon">
        <CloudUpload size={25} aria-hidden="true" />
      </span>
      <strong>
        {dashboard
          ? "Drop a video here"
          : file
            ? "Video selected locally"
            : "Drop your source video here"}
      </strong>
      <p id={id}>
        MP4, MOV or WebM
        {maxBytes === undefined ? "" : ` · up to ${bytesText(maxBytes)}`}
      </p>
      <input
        ref={input}
        type="file"
        accept={fileAccept}
        disabled={disabled}
        hidden
        aria-label="Source video"
        onChange={(e) => {
          select(e.currentTarget.files);
          e.currentTarget.value = "";
        }}
      />
      <button
        className="button button-secondary"
        type="button"
        disabled={disabled}
        aria-describedby={id}
        onClick={() => input.current?.click()}
      >
        {file ? "Replace video" : "Browse files"}
      </button>
      {file && (
        <div className="ws-file-row">
          <Film size={18} aria-hidden="true" />
          <div>
            <b>{file.name}</b>
            <small>{bytesText(file.size)} · On this device only</small>
          </div>
          <button
            type="button"
            className="ws-icon-button"
            aria-label="Remove video"
            disabled={disabled}
            onClick={() => {
              setError("");
              onFile(null);
            }}
          >
            <X size={17} aria-hidden="true" />
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="ws-field-error">
          {error}
        </p>
      )}
    </div>
  );
}
