"use client";
import { useEffect, useRef, useState } from "react";
import { transferVideo, type UploadProgress } from "@/services/upload-transfer";
import type { Project, UploadTicket } from "@/services/workspace-contracts";
import { workspace, workspaceMessage } from "@/services/workspace";
export function useProjectUpload() {
  const controller = useRef<AbortController>(null);
  const ticket = useRef<{ value: UploadTicket; file: File; title: string }>(
    null,
  );
  const verifying = useRef(false);
  const cancelling = useRef(false);
  const abortOnUnmount = useRef(false);
  const [phase, setPhase] = useState<
    "idle" | "sending" | "verifying" | "complete" | "failed"
  >("idle");
  const [progress, setProgress] = useState<UploadProgress>();
  const [project, setProject] = useState<Project>();
  const [message, setMessage] = useState("");
  const [hasTicket, setHasTicket] = useState(false);
  const [canResume, setCanResume] = useState(false);
  useEffect(() => {
    abortOnUnmount.current = false;
    return () => {
      abortOnUnmount.current = true;
      if (!verifying.current) controller.current?.abort();
    };
  }, []);
  async function start(file: File, title: string) {
    if (controller.current || cancelling.current) return;
    if (
      ticket.current &&
      (ticket.current.file !== file || ticket.current.title !== title)
    ) {
      setMessage("Cancel the previous upload before starting a different one.");
      return;
    }
    const abort = new AbortController();
    controller.current = abort;
    setMessage("");
    setProgress(undefined);
    setPhase("sending");
    const result = await transferVideo({
      file,
      title,
      signal: abort.signal,
      resumeId: ticket.current?.value.uploadId,
      onTicket(value) {
        ticket.current = { file, title, value };
        if (!abortOnUnmount.current) {
          setCanResume(value.mode === "multipart");
          setHasTicket(true);
        }
      },
      onProgress: (value) => {
        if (!abortOnUnmount.current) setProgress(value);
      },
      onVerify: () => {
        verifying.current = true;
        if (!abortOnUnmount.current) setPhase("verifying");
      },
    });
    if (abort.signal.aborted && ticket.current) {
      const cancelled = await workspace.run(
        "cancelUpload",
        ticket.current.value.uploadId,
      );
      if (cancelled.ok) ticket.current = null;
      else if (!abortOnUnmount.current)
        setMessage(workspaceMessage(cancelled.error));
    }
    controller.current = null;
    verifying.current = false;
    if (abortOnUnmount.current) return;
    if (result.ok) {
      ticket.current = null;
      setProject(result.value);
      setHasTicket(false);
      setPhase("complete");
      setCanResume(false);
    } else {
      setPhase(
        result.error === "cancelled" && !ticket.current ? "idle" : "failed",
      );
      if (result.error !== "cancelled" || !ticket.current)
        setMessage(workspaceMessage(result.error));
      if (!ticket.current) {
        setCanResume(false);
        setHasTicket(false);
      }
    }
  }
  async function cancel() {
    if (verifying.current || cancelling.current) return;
    if (controller.current) {
      controller.current.abort();
      return;
    }
    if (!ticket.current) return;
    cancelling.current = true;
    const result = await workspace.run(
      "cancelUpload",
      ticket.current.value.uploadId,
    );
    cancelling.current = false;
    if (result.ok) {
      ticket.current = null;
      setHasTicket(false);
      setCanResume(false);
      setPhase("idle");
      setMessage("Upload cancelled.");
    } else setMessage(workspaceMessage(result.error));
  }
  return {
    phase,
    progress,
    project,
    message,
    canResume,
    canCancel: phase === "sending" || (phase === "failed" && hasTicket),
    start,
    cancel,
  };
}
