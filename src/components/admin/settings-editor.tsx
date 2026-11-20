"use client";
import { useState, type FormEvent } from "react";
import type { AdminSettings, SettingsPatch } from "@/services/admin/contracts";
import { ActionDialog } from "./action-dialog";
import { money } from "@/services/admin/format";
export function SettingsEditor({
  current,
  section,
}: {
  current: AdminSettings;
  section: SettingsPatch["section"];
}) {
  const [editing, setEditing] = useState(false);
  const [patch, setPatch] = useState<SettingsPatch>();
  const [error, setError] = useState("");
  function stage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const text = (key: string) => String(form.get(key) ?? "").trim();
    const positive = (key: string) => {
      const v = Number(text(key));
      if (!Number.isSafeInteger(v) || v < 1)
        throw Error("Enter positive whole numbers for limits and amounts.");
      return v;
    };
    try {
      switch (section) {
        case "platform": {
          const displayName = text("displayName");
          if (!displayName) throw Error("Enter a platform name.");
          setPatch({
            section,
            value: {
              displayName,
              registrationEnabled: form.has("registrationEnabled"),
            },
          });
          break;
        }
        case "pricing":
          setPatch({
            section,
            value: current.pricing.map((pack, i) => ({
              packId: pack.packId,
              credits: positive(`credits-${i}`),
              prices: pack.prices.map((value, j) => ({
                ...value,
                amountMinor: positive(`price-${i}-${j}`),
              })),
            })),
          });
          break;
        case "credits":
          setPatch({
            section,
            value: {
              creditsPerMinute: positive("creditsPerMinute"),
              allowNegativeBalance: form.has("allowNegativeBalance"),
            },
          });
          break;
        case "uploads": {
          const formats = (["mp4", "mov", "webm"] as const).filter((f) =>
            form.has(f),
          );
          if (!formats.length) throw Error("Select at least one video format.");
          setPatch({
            section,
            value: { maxBytes: positive("maxBytes"), formats },
          });
          break;
        }
        case "processing": {
          const maxClips = positive("maxClips");
          if (maxClips > 20) throw Error("Choose at most 20 clips.");
          setPatch({
            section,
            value: { maxSourceSeconds: positive("maxSourceSeconds"), maxClips },
          });
          break;
        }
        case "support":
          setPatch({
            section,
            value: {
              contactEmail: text("contactEmail"),
              intakeEnabled: form.has("intakeEnabled"),
            },
          });
          break;
        case "maintenance": {
          const enabled = form.has("enabled"),
            notice = text("notice");
          if (enabled && !notice)
            throw Error("Enter the maintenance notice visitors will see.");
          setPatch({ section, value: { enabled, notice } });
          break;
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check the proposed values.");
    }
  }
  function input(
    name: string,
    title: string,
    value: string | number,
    type = "text",
    max = 160,
  ) {
    return (
      <label key={name}>
        {title}
        <input
          name={name}
          defaultValue={value}
          type={type}
          min={type === "number" ? 1 : undefined}
          step={type === "number" ? 1 : undefined}
          maxLength={type === "number" ? undefined : max}
          required
        />
      </label>
    );
  }
  function check(name: string, title: string, checked: boolean) {
    return (
      <label className="ad-checkbox" key={name}>
        <input type="checkbox" name={name} defaultChecked={checked} />
        {title}
      </label>
    );
  }
  return (
    <div className="ad-settings-editor">
      {!editing ? (
        <button
          type="button"
          className="ad-button"
          onClick={() => setEditing(true)}
        >
          Propose changes
        </button>
      ) : (
        <form
          className="ad-form"
          onSubmit={stage}
          onChange={() => setPatch(undefined)}
        >
          {section === "platform" && (
            <>
              {input(
                "displayName",
                "Display name",
                current.platform.displayName,
              )}
              {check(
                "registrationEnabled",
                "Allow new registrations",
                current.platform.registrationEnabled,
              )}
            </>
          )}
          {section === "pricing" &&
            current.pricing.map((p, i) => (
              <fieldset key={p.packId}>
                <legend>{p.packId}</legend>
                {input(`credits-${i}`, "Credits in pack", p.credits, "number")}
                {p.prices.map((value, j) =>
                  input(
                    `price-${i}-${j}`,
                    `${value.currency} price in minor units (current ${money(value)})`,
                    value.amountMinor,
                    "number",
                  ),
                )}
              </fieldset>
            ))}
          {section === "credits" && (
            <>
              {input(
                "creditsPerMinute",
                "Credits per standard minute",
                current.credits.creditsPerMinute,
                "number",
              )}
              {check(
                "allowNegativeBalance",
                "Allow a negative balance under policy",
                current.credits.allowNegativeBalance,
              )}
            </>
          )}
          {section === "uploads" && (
            <>
              {input(
                "maxBytes",
                "Maximum bytes per upload",
                current.uploads.maxBytes,
                "number",
              )}
              {(["mp4", "mov", "webm"] as const).map((f) =>
                check(f, f.toUpperCase(), current.uploads.formats.includes(f)),
              )}
            </>
          )}
          {section === "processing" && (
            <>
              {input(
                "maxSourceSeconds",
                "Maximum source seconds",
                current.processing.maxSourceSeconds,
                "number",
              )}
              {input(
                "maxClips",
                "Maximum clips per job",
                current.processing.maxClips,
                "number",
              )}
            </>
          )}
          {section === "support" && (
            <>
              {input(
                "contactEmail",
                "Support email address",
                current.support.contactEmail,
                "email",
              )}
              {check(
                "intakeEnabled",
                "Accept support requests",
                current.support.intakeEnabled,
              )}
            </>
          )}
          {section === "maintenance" && (
            <>
              {check(
                "enabled",
                "Show maintenance notice",
                current.maintenance.enabled,
              )}
              <label>
                Maintenance notice
                <textarea
                  rows={3}
                  maxLength={500}
                  name="notice"
                  defaultValue={current.maintenance.notice}
                />
              </label>
            </>
          )}
          <div className="ad-inline">
            <button className="ad-button ad-primary" type="submit">
              Review proposed values
            </button>
            <button
              className="ad-button"
              type="button"
              onClick={() => {
                setEditing(false);
                setPatch(undefined);
                setError("");
              }}
            >
              Discard
            </button>
          </div>
          {error && (
            <p role="alert" className="ad-command-error">
              {error}
            </p>
          )}
        </form>
      )}
      {editing && patch && (
        <ActionDialog
          key={JSON.stringify(patch)}
          title="Confirm settings change"
          trigger="Continue to confirmation"
          description="State why this configuration should change. The server will review the proposed values and current revision before allowing confirmation."
          target={{ kind: "update_settings", id: current.revision, patch }}
        />
      )}
    </div>
  );
}
