import Link from "next/link";
import {
  ChevronRight,
  Settings2,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";
import {
  WorkspaceHeading,
  WorkspaceIssue,
  MediaImage,
} from "@/components/workspace/ui";
import { IconTile } from "@/components/ui/primitives";
import { getProfile } from "@/services/workspace-server";
export const metadata = { title: "Settings" };
export default async function Settings() {
  const profile = await getProfile();
  return (
    <div className="ws-studio ws-studio-settings">
      <WorkspaceHeading
        label="ACCOUNT"
        title="Settings"
        description="Manage your account details and creator preferences."
      />
      <WorkspaceIssue result={profile} />
      <div className="ws-detail-grid ws-settings-overview">
        <section className="ws-panel">
          <div className="ws-section-heading">
            <div>
              <span className="ws-section-tag">OVERVIEW</span>
              <h2>Account</h2>
            </div>
            <Settings2 size={21} aria-hidden="true" />
          </div>
          <div className="ws-profile-badge">
            <span className="ws-avatar">
              {profile.ok && profile.value.avatarUrl ? (
                <MediaImage src={profile.value.avatarUrl} />
              ) : (
                <UserRound aria-hidden="true" />
              )}
            </span>
            <div>
              <strong>
                {profile.ok ? profile.value.name : "Workspace preview"}
              </strong>
              <p>
                {profile.ok
                  ? profile.value.email
                  : "No verified account is connected."}
              </p>
            </div>
          </div>
        </section>
        <section className="ws-settings-links" aria-label="Settings pages">
          {[
            {
              title: "Profile",
              text: "Manage your display name and account information.",
              icon: UserRound,
              href: "/settings/profile",
            },
            {
              title: "Preferences",
              text: "Set the defaults for your future video projects.",
              icon: SlidersHorizontal,
              href: "/settings/preferences",
            },
          ].map(({ title, text, icon, href }) => (
            <Link key={href} href={href}>
              <IconTile icon={icon} />
              <div>
                <h2>{title}</h2>
                <p>{text}</p>
              </div>
              <ChevronRight size={18} aria-hidden="true" />
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
}
