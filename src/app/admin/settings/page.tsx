import {
  Coins,
  FileVideo,
  Gauge,
  LifeBuoy,
  LockKeyhole,
  ReceiptText,
  Settings2,
  Wrench,
} from "lucide-react";
import { Heading, Notice, Panel, DataList } from "@/components/admin/ui";
import { SettingsEditor } from "@/components/admin/settings-editor";
import { adminRead } from "@/services/admin/server";
import { money, num, duration } from "@/services/admin/format";
import { bytesText } from "@/services/workspace-format";
import { creditPacks } from "@/config/credit-packs";
import type { SettingSection } from "@/services/admin/contracts";
import type { ReactNode } from "react";
export const metadata = { title: "Settings · Admin" };
const sections = [
  {
    key: "platform",
    title: "Platform",
    desc: "Name and registration policy.",
    icon: Settings2,
  },
  {
    key: "pricing",
    title: "Pricing",
    desc: "One-time packs and currency-specific prices.",
    icon: ReceiptText,
  },
  {
    key: "credits",
    title: "Credit configuration",
    desc: "Standard processing cost and balance policy.",
    icon: Coins,
  },
  {
    key: "uploads",
    title: "Video uploads",
    desc: "Accepted file formats and actual maximum size.",
    icon: FileVideo,
  },
  {
    key: "processing",
    title: "Processing limits",
    desc: "Source duration and maximum outputs per job.",
    icon: Gauge,
  },
  {
    key: "support",
    title: "Support",
    desc: "Contact address and request intake.",
    icon: LifeBuoy,
  },
  {
    key: "maintenance",
    title: "Maintenance",
    desc: "Notice state and customer-facing message.",
    icon: Wrench,
  },
] as const;
const on = (value: boolean) => (value ? "Enabled" : "Disabled");
export default async function Settings() {
  const r = await adminRead("settings");
  const s = r.ok ? r.value : null;
  const records: Record<
    SettingSection,
    readonly (readonly [string, ReactNode])[]
  > | null = s
    ? {
        platform: [
          ["Display name", s.platform.displayName],
          ["New registrations", on(s.platform.registrationEnabled)],
        ],
        pricing: s.pricing.map((p) => [
          creditPacks.find((x) => x.id === p.packId)?.name ?? p.packId,
          `${num(p.credits)} credits · ${p.prices.map(money).join(" · ")}`,
        ]),
        credits: [
          ["Credits per standard minute", num(s.credits.creditsPerMinute)],
          ["Negative balances", on(s.credits.allowNegativeBalance)],
        ],
        uploads: [
          ["Maximum size", bytesText(s.uploads.maxBytes)],
          [
            "Supported formats",
            s.uploads.formats.map((f) => f.toUpperCase()).join(", "),
          ],
        ],
        processing: [
          ["Maximum source duration", duration(s.processing.maxSourceSeconds)],
          ["Maximum clips", num(s.processing.maxClips)],
        ],
        support: [
          ["Contact email", s.support.contactEmail],
          ["Request intake", on(s.support.intakeEnabled)],
        ],
        maintenance: [
          ["Maintenance notice", on(s.maintenance.enabled)],
          ["Message", s.maintenance.notice || "No notice configured"],
        ],
      }
    : null;
  return (
    <>
      <Heading
        eyebrow="SYSTEM"
        title="Settings"
        description="Review platform configuration. Changes require verified permissions and an audited confirmation."
        action={
          !s && (
            <span className="ad-environment">
              <LockKeyhole size={15} aria-hidden="true" />
              Read-only preview
            </span>
          )
        }
      />
      {!r.ok && r.error !== "unavailable" && <Notice error={r.error} />}
      <div className="ad-settings-grid">
        {sections.map(({ key, title, desc, icon: Icon }) => (
          <Panel
            key={key}
            title={title}
            description={desc}
            extra={
              <span className="ad-state-icon">
                <Icon size={18} aria-hidden="true" />
              </span>
            }
          >
            {records ? (
              <DataList items={records[key]} />
            ) : key === "pricing" ? (
              <>
                <p className="ad-setting-caption">
                  Public pack configuration in this build · not a live billing
                  lookup
                </p>
                <DataList
                  items={creditPacks.map((p) => [
                    p.name,
                    `${p.credits} credits · ${money({ amountMinor: p.pricesMinor.USD, currency: "USD", minorUnit: 2 })} · ${money({ amountMinor: p.pricesMinor.INR, currency: "INR", minorUnit: 2 })}`,
                  ])}
                />
              </>
            ) : (
              <div className="ad-detail-note">
                <LockKeyhole size={16} aria-hidden="true" />
                <p>Live settings unavailable</p>
              </div>
            )}
            {s?.editable.includes(key) && (
              <SettingsEditor current={s} section={key} />
            )}
          </Panel>
        ))}
      </div>
    </>
  );
}
