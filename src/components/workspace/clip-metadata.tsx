"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PendingButton } from "@/components/system/loading";
import { validTitle } from "@/services/generation-schema";
import { workspace, workspaceMessage } from "@/services/workspace";
export function ClipMetadata({
  projectId,
  clipId,
  initialTitle,
  initialDescription,
}: {
  projectId: string;
  clipId: string;
  initialTitle: string;
  initialDescription: string;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [original, setOriginal] = useState({
    title: initialTitle,
    description: initialDescription,
  });
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const router = useRouter();
  const dirty =
    title !== original.title || description !== original.description;
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    const click = (event: MouseEvent) => {
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        event.button !== 0
      )
        return;
      const anchor =
        event.target instanceof Element
          ? (event.target.closest("a[href]") as HTMLAnchorElement | null)
          : null;
      if (
        anchor &&
        (!anchor.target || anchor.target === "_self") &&
        anchor.href !== window.location.href &&
        !window.confirm("Leave without saving your clip details?")
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", click, true);
    };
  }, [dirty]);
  return (
    <form
      className="ws-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (pending || !dirty || !validTitle(title)) return;
        setPending(true);
        setMessage("");
        const result = await workspace.run("saveClip", {
          projectId,
          clipId,
          title: title.trim(),
          description: description.trim(),
        });
        setPending(false);
        setFailed(!result.ok);
        if (result.ok) {
          const next = {
            title: result.value.title,
            description: result.value.description ?? "",
          };
          setOriginal(next);
          setTitle(next.title);
          setDescription(next.description);
          setMessage("Clip details saved.");
          router.refresh();
        } else setMessage(workspaceMessage(result.error));
      }}
    >
      <div className="ws-field">
        <label htmlFor="clip-title">Clip title</label>
        <input
          id="clip-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          required
          disabled={pending}
        />
      </div>
      <div className="ws-field">
        <label htmlFor="clip-description">Description</label>
        <textarea
          id="clip-description"
          maxLength={2000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          disabled={pending}
        />
      </div>
      <p>Changing these details doesn’t change the rendered video.</p>
      <PendingButton
        type="submit"
        pending={pending}
        disabled={!dirty || !validTitle(title)}
      >
        Save details
      </PendingButton>
      {message && <p role={failed ? "alert" : "status"}>{message}</p>}
    </form>
  );
}
