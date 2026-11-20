import { BookOpen, ChevronDown, LifeBuoy } from "lucide-react";
import { Action } from "@/components/ui/primitives";
import { WorkspaceHeading } from "@/components/workspace/ui";
import { workspace } from "@/services/workspace-server";
import { SupportForm } from "@/components/workspace/support-form";
export const metadata = { title: "Help & support" };
const questions = [
  [
    "What kind of video can I select?",
    "Choose one MP4, MOV or WebM video. File selection is local while uploads are disconnected. Your workspace’s upload limit will be shown when an upload policy is available.",
  ],
  [
    "Why can’t I start generation?",
    "Generation requires a verified uploaded video, a current cost quote and enough available credits. Picking a file or exploring settings does not use credits.",
  ],
  [
    "Where do completed clips appear?",
    "Open the original project or look in My Clips. Export options are only shown for files that are ready.",
  ],
  [
    "What are reserved credits?",
    "Reserved credits are held for a generation request. Credit history shows whether they were used or released once the billing service confirms it.",
  ],
] as const;
export default async function Support() {
  const capability = await workspace.run("getSupportCapabilities");
  return (
    <div className="ws-studio ws-studio-support">
      <WorkspaceHeading
        label="HELP CENTRE"
        title="How can we help?"
        description="Find answers about your videos, generations and credits."
      />
      <div className="ws-detail-grid ws-support-grid">
        <section className="ws-panel">
          <div className="ws-section-heading">
            <div>
              <span className="ws-section-tag">QUICK ANSWERS</span>
              <h2>Workspace questions</h2>
            </div>
            <BookOpen size={21} aria-hidden="true" />
          </div>
          <div className="ws-faq">
            {questions.map(([q, a]) => (
              <details key={q}>
                <summary>
                  {q}
                  <ChevronDown size={17} aria-hidden="true" />
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
          <Action href="/help" variant="text">
            Browse the help centre
          </Action>
        </section>
        <section className="ws-panel">
          <div className="ws-section-heading">
            <div>
              <span className="ws-section-tag">GET IN TOUCH</span>
              <h2>Still need a hand?</h2>
            </div>
            <LifeBuoy size={21} aria-hidden="true" />
          </div>
          <p className="ws-support-intro">
            Send our team a message and describe what you need help with.
          </p>
          <SupportForm connected={capability.ok && capability.value.canSend} />
        </section>
      </div>
    </div>
  );
}
