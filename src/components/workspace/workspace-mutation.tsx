"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Trash2 } from "lucide-react";
import { PendingButton } from "@/components/system/loading";
import { workspace, workspaceMessage } from "@/services/workspace";
import type { AssetKind } from "@/services/workspace-contracts";
const labels = {
  mp4: "MP4",
  srt: "SRT subtitles",
  vtt: "VTT subtitles",
  thumbnail: "Poster",
};
export function WorkspaceMutation(
  props:
    | { kind: "delete"; projectId: string; returnToProjects?: boolean }
    | { kind: "download"; projectId: string; clipId: string; asset: AssetKind },
) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  async function run() {
    if (pending) return;
    setMessage("");
    setPending(true);
    const result =
      props.kind === "delete"
        ? await workspace.run("deleteProject", props.projectId)
        : await workspace.run("downloadClip", props);
    setPending(false);
    if (!result.ok) {
      setMessage(workspaceMessage(result.error));
      return;
    }
    if (result.value) {
      try {
        const url = new URL(result.value.url, window.location.origin);
        if (
          url.username ||
          url.password ||
          (url.origin !== window.location.origin && url.protocol !== "https:")
        )
          throw new Error("Invalid download target");
        window.location.assign(url.href);
      } catch {
        setMessage("Couldn’t open this download.");
      }
    } else {
      dialog.current?.close();
      if (props.kind === "delete" && props.returnToProjects)
        router.replace("/projects");
      router.refresh();
    }
  }
  if (props.kind === "download")
    return (
      <div>
        <PendingButton
          type="button"
          pending={pending}
          className="button-secondary"
          onClick={run}
        >
          <Download size={16} aria-hidden="true" />
          {labels[props.asset]}
        </PendingButton>
        {message && (
          <p role="alert" className="ws-field-error">
            {message}
          </p>
        )}
      </div>
    );
  return (
    <>
      <button
        className="button button-secondary ws-delete"
        type="button"
        onClick={() => {
          setMessage("");
          dialog.current?.showModal();
        }}
      >
        <Trash2 size={15} aria-hidden="true" />
        Delete
      </button>
      <dialog
        ref={dialog}
        className="ws-confirm"
        aria-label="Delete project"
        onCancel={(e) => {
          if (pending) e.preventDefault();
        }}
      >
        <h2>Delete this project?</h2>
        <p>
          This removes the project and its clips from your workspace. This
          action can’t be undone.
        </p>
        {message && (
          <p role="alert" className="ws-field-error">
            {message}
          </p>
        )}
        <div className="actions">
          <button
            type="button"
            autoFocus
            className="button button-secondary"
            disabled={pending}
            onClick={() => dialog.current?.close()}
          >
            Keep project
          </button>
          <PendingButton type="button" pending={pending} onClick={run}>
            Delete project
          </PendingButton>
        </div>
      </dialog>
    </>
  );
}
