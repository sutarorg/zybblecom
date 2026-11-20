"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PendingButton } from "@/components/system/loading";
import { workspace, workspaceMessage } from "@/services/workspace";
import type { Preferences, Profile } from "@/services/workspace-contracts";
import {
  aspects,
  captionStyles,
  validTitle,
} from "@/services/generation-schema";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [name, setName] = useState(profile.name);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState({ text: "", error: false });
  const router = useRouter();
  return (
    <form
      className="ws-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy || !validTitle(name)) return;
        setBusy(true);
        const result = await workspace.run("saveProfile", {
          name: name.trim(),
        });
        setBusy(false);
        setStatus(
          result.ok
            ? { text: "Profile saved.", error: false }
            : { text: workspaceMessage(result.error), error: true },
        );
        if (result.ok) router.refresh();
      }}
    >
      <div className="ws-field">
        <label htmlFor="profile-name">Display name</label>
        <input
          id="profile-name"
          autoComplete="name"
          required
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={busy}
        />
      </div>
      <div className="ws-field">
        <label htmlFor="profile-email">Email address</label>
        <input id="profile-email" type="email" value={profile.email} readOnly />
        <p>
          This is your verified sign-in address. Email changes require
          verification.
        </p>
      </div>
      <PendingButton type="submit" disabled={!validTitle(name)} pending={busy}>
        Save profile
      </PendingButton>
      {status.text && (
        <p role={status.error ? "alert" : "status"}>{status.text}</p>
      )}
    </form>
  );
}
export function PreferencesForm({ value }: { value: Preferences }) {
  const [prefs, setPrefs] = useState(value);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState({ text: "", error: false });
  return (
    <form
      className="ws-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        const result = await workspace.run("savePreferences", prefs);
        setBusy(false);
        if (result.ok) setPrefs(result.value);
        setStatus(
          result.ok
            ? { text: "Preferences saved.", error: false }
            : { text: workspaceMessage(result.error), error: true },
        );
      }}
    >
      <div className="ws-field">
        <label htmlFor="default-aspect">Default aspect ratio</label>
        <select
          id="default-aspect"
          value={prefs.defaultAspect}
          disabled={busy}
          onChange={(e) =>
            setPrefs({
              ...prefs,
              defaultAspect: e.target.value as Preferences["defaultAspect"],
            })
          }
        >
          {Object.entries(aspects).map(([id, label]) => (
            <option value={id} key={id}>
              {id} · {label}
            </option>
          ))}
        </select>
      </div>
      <div className="ws-field">
        <label htmlFor="default-captions">Default captions</label>
        <select
          id="default-captions"
          value={prefs.defaultCaptions}
          disabled={busy}
          onChange={(e) =>
            setPrefs({
              ...prefs,
              defaultCaptions: e.target.value as Preferences["defaultCaptions"],
            })
          }
        >
          {Object.entries(captionStyles).map(([id, label]) => (
            <option value={id} key={id}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {prefs.jobEmail !== undefined && (
        <label className="ws-check">
          <input
            type="checkbox"
            checked={prefs.jobEmail}
            disabled={busy}
            onChange={(e) => setPrefs({ ...prefs, jobEmail: e.target.checked })}
          />
          Email me when generation finishes
        </label>
      )}
      <PendingButton type="submit" pending={busy}>
        Save preferences
      </PendingButton>
      {status.text && (
        <p role={status.error ? "alert" : "status"}>{status.text}</p>
      )}
    </form>
  );
}
