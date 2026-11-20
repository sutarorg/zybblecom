"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UserRound } from "lucide-react";
import { PendingButton } from "@/components/system/loading";
import { avatarMaxBytes, avatarTypes } from "@/services/avatar-policy";
import { MediaImage } from "./ui";

export function AvatarUpload({
  name,
  current,
  enabled,
}: {
  name: string;
  current?: string;
  enabled: boolean;
}) {
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState<{ file: File; url: string }>();
  const input = useRef<HTMLInputElement>(null);
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ error: boolean; text: string }>();
  const router = useRouter();
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setPreview({ file, url });
    });
    return () => {
      cancelled = true;
      URL.revokeObjectURL(url);
    };
  }, [file]);
  const selected = preview?.file === file ? preview?.url : undefined;
  return (
    <div className="ws-avatar-settings">
      <div className="ws-profile-badge">
        <span className="ws-avatar">
          {selected || current ? (
            <MediaImage
              src={selected ?? current!}
              alt={selected ? "Selected avatar preview" : ""}
            />
          ) : (
            <UserRound aria-hidden="true" />
          )}
        </span>
        <div>
          <span className="ws-section-tag">Account avatar</span>
          <h2>{name || "Profile"}</h2>
          <p>
            {selected
              ? "Image preview · not saved yet"
              : current
                ? "Current profile image"
                : "No profile image set"}
          </p>
        </div>
      </div>
      {enabled ? (
        <div className="ws-avatar-actions">
          <input
            type="file"
            ref={input}
            accept={avatarTypes.join(",")}
            hidden
            aria-label="Avatar image"
            disabled={busy}
            onChange={(event) => {
              const selection = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (!selection) return;
              if (
                !selection.size ||
                selection.size > avatarMaxBytes ||
                !avatarTypes.some((type) => type === selection.type)
              ) {
                setNotice({
                  error: true,
                  text: "Choose a JPEG, PNG, WebP or AVIF image up to 4 MB.",
                });
                return;
              }
              setFile(selection);
              setNotice(undefined);
            }}
          />
          <button
            className="button button-secondary"
            type="button"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            {current || file ? "Change avatar" : "Choose avatar"}
          </button>
          {file && (
            <>
              <button
                className="button button-secondary"
                type="button"
                disabled={busy}
                onClick={() => {
                  setFile(undefined);
                  setNotice(undefined);
                }}
              >
                Cancel selection
              </button>
              <PendingButton
                type="button"
                pending={busy}
                pendingLabel="Saving avatar…"
                onClick={async () => {
                  if (inFlight.current) return;
                  inFlight.current = true;
                  setBusy(true);
                  setNotice(undefined);
                  try {
                    const response = await fetch("/api/settings/avatar", {
                      method: "POST",
                      headers: { "Content-Type": "application/octet-stream" },
                      body: file,
                      cache: "no-store",
                    });
                    const result = await response.json();
                    if (
                      response.ok &&
                      result.success === true &&
                      result.data?.saved === true
                    ) {
                      setFile(undefined);
                      setNotice({ error: false, text: "Avatar saved." });
                      router.refresh();
                      return;
                    }
                    setNotice({
                      error: true,
                      text:
                        response.status === 400 || response.status === 413
                          ? "This image couldn’t be read or exceeds the upload limit."
                          : response.status === 409
                            ? "Your avatar was changed elsewhere. Refresh and try again."
                            : response.status === 429
                              ? "Wait before trying another upload."
                              : "Avatar could not be saved. Please try again.",
                    });
                  } catch {
                    setNotice({
                      error: true,
                      text: "We couldn’t confirm the upload. Refresh to check your avatar.",
                    });
                  } finally {
                    inFlight.current = false;
                    setBusy(false);
                  }
                }}
              >
                Save avatar
              </PendingButton>
            </>
          )}
        </div>
      ) : (
        <p>Avatar storage isn’t connected.</p>
      )}
      {notice && <p role={notice.error ? "alert" : "status"}>{notice.text}</p>}
    </div>
  );
}
