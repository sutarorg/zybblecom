"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PendingButton } from "@/components/system/loading";
import { savePreferences, saveProfile } from "@/services/settings-client";
import { workspaceMessage } from "@/services/workspace";
import type { Preferences, Profile } from "@/services/workspace-contracts";
import {
  aspects,
  selectableCaptions,
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
        const result = await saveProfile(name.trim());
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
  const [prefs, setPrefs] = useState<Preferences>(() =>
    value.defaultCaptions === "clean"
      ? { ...value, defaultCaptions: "bold" }
      : value,
  );
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState({ text: "", error: false });
  return (
    <form
      className="ws-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        const result = await savePreferences(prefs);
        setBusy(false);
        if (result.ok) setPrefs(result.value);
        setStatus(
          result.ok
            ? { text: "Preferences saved.", error: false }
            : { text: workspaceMessage(result.error), error: true },
        );
      }}
    >
      <fieldset className="ws-choice" data-choice="ratio">
        <legend>Default aspect ratio</legend>
        <div>
          {Object.entries(aspects).map(([id, label]) => (
            <label key={id}>
              <input
                type="radio"
                name="default-aspect"
                value={id}
                checked={prefs.defaultAspect === id}
                disabled={busy}
                onChange={() =>
                  setPrefs({
                    ...prefs,
                    defaultAspect: id as Preferences["defaultAspect"],
                  })
                }
              />
              <span>
                <i
                  className="ws-choice-illustration"
                  data-ratio={id}
                  aria-hidden="true"
                />
                {id} · {label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="ws-choice" data-choice="captions">
        <legend>Default captions</legend>
        <div>
          {Object.entries(selectableCaptions).map(([id, label]) => (
            <label key={id}>
              <input
                type="radio"
                name="default-captions"
                value={id}
                checked={prefs.defaultCaptions === id}
                disabled={busy}
                onChange={() =>
                  setPrefs({
                    ...prefs,
                    defaultCaptions: id as Preferences["defaultCaptions"],
                  })
                }
              />
              <span>
                <i
                  className="ws-caption-illustration"
                  data-caption={id}
                  aria-hidden="true"
                >
                  Aa
                </i>
                {label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
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
