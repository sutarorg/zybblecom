"use client";
import {
  ArrowLeft,
  ArrowRight,
  AudioLines,
  BookOpen,
  Building2,
  Captions,
  Check,
  Clapperboard,
  Camera,
  Layers,
  Mic2,
  MonitorPlay,
  Play,
  Sparkles,
  Video,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { contentOptions, goalOptions } from "@/config/account";
import { frontendServices } from "@/lib/services";
import type { OnboardingPreferences } from "@/lib/services/contracts";
import { serviceMessage } from "@/lib/services/messages";
import { AccountHeading } from "./account-shell";
import { PendingButton } from "@/components/system/loading";
import { Action } from "@/components/ui/primitives";

const track = ["Welcome", "Your content", "Your goal", "Finish"];
const contentIcons = [
  Mic2,
  Play,
  AudioLines,
  BookOpen,
  MonitorPlay,
  Building2,
  Layers,
];
const goalIcons = [Camera, Play, Captions, Video, Layers];
type Step = 0 | 1 | 2 | 3;
export function Onboarding({ connected }: { connected: boolean }) {
  const [step, setStep] = useState<Step>(0);
  const [preferences, setPreferences] = useState<OnboardingPreferences>({});
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const locked = useRef(false);
  const focus = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const go = (next: Step) => {
    setStep(next);
    requestAnimationFrame(() => focus.current?.focus());
  };
  const selectStep = (skip = false) => {
    if (skip && step === 1)
      setPreferences((prev) => ({ ...prev, contentType: undefined }));
    if (skip && step === 2)
      setPreferences((prev) => ({ ...prev, goal: undefined }));
    go((step + 1) as Step);
  };
  const finish = () => {
    if (locked.current) return;
    locked.current = true;
    setError(undefined);
    startTransition(async () => {
      try {
        const result = await frontendServices.completeOnboarding(preferences);
        if (result.ok) startTransition(() => router.replace("/dashboard"));
        else setError(serviceMessage(result.error));
      } finally {
        locked.current = false;
      }
    });
  };
  return (
    <div className="onboarding-flow">
      <ol
        className="onboard-progress"
        aria-label="Onboarding progress"
        role="list"
      >
        {track.map((label, index) => (
          <li
            key={label}
            aria-current={step === index ? "step" : undefined}
            className={step > index ? "is-past" : ""}
          >
            <span>
              {step > index ? (
                <Check size={14} aria-hidden="true" />
              ) : (
                index + 1
              )}
            </span>
            <b>{label}</b>
          </li>
        ))}
      </ol>
      <div
        ref={focus}
        className="onboard-heading"
        tabIndex={-1}
        aria-label={`Step ${step + 1} of 4: ${track[step]}`}
      >
        {step === 0 && (
          <AccountHeading
            label="STEP 1 OF 4"
            icon={Sparkles}
            title="Welcome to Zybble."
            description="Find standout moments in a long recording, then turn them into vertical clips with speaker-focused framing and bold captions."
          />
        )}
        {step === 1 && (
          <AccountHeading
            label="STEP 2 OF 4 · OPTIONAL"
            icon={Clapperboard}
            title="What type of content do you create?"
            description="Choose the format you work with most, or skip this step."
          />
        )}
        {step === 2 && (
          <AccountHeading
            label="STEP 3 OF 4 · OPTIONAL"
            icon={Video}
            title="What would you like to create more of?"
            description="Pick a short-form format you want to focus on, or skip this step."
          />
        )}
        {step === 3 && (
          <AccountHeading
            label="STEP 4 OF 4"
            icon={Check}
            title="You're ready to create with Zybble."
            description="When you open your workspace, start with a recording you have permission to repurpose."
          />
        )}
      </div>
      {step === 0 && (
        <div className="onboard-tip">
          <Sparkles size={19} aria-hidden="true" />
          <p>
            <strong>Make it yours.</strong> Two optional questions help tailor
            the way you get started.
            {!connected && " Your choices aren’t saved in this preview."}
          </p>
        </div>
      )}
      {step === 1 && (
        <Choices
          name="content"
          legend="Content type"
          items={contentOptions}
          icons={contentIcons}
          selected={preferences.contentType}
          choose={(value) =>
            setPreferences((prev) => ({ ...prev, contentType: value }))
          }
        />
      )}
      {step === 2 && (
        <Choices
          name="goal"
          legend="Main goal"
          items={goalOptions}
          icons={goalIcons}
          selected={preferences.goal}
          choose={(value) =>
            setPreferences((prev) => ({ ...prev, goal: value }))
          }
        />
      )}
      {step === 3 && (preferences.contentType || preferences.goal) && (
        <dl className="onboard-summary">
          {preferences.contentType && (
            <div>
              <dt>Content</dt>
              <dd>{preferences.contentType}</dd>
            </div>
          )}
          {preferences.goal && (
            <div>
              <dt>Goal</dt>
              <dd>{preferences.goal}</dd>
            </div>
          )}
        </dl>
      )}
      {error && (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      )}
      <div className="actions onboard-actions">
        {step > 0 && (
          <button
            type="button"
            className="button button-text"
            disabled={pending}
            onClick={() => go((step - 1) as Step)}
          >
            <ArrowLeft size={17} aria-hidden="true" /> Back
          </button>
        )}
        {(step === 1 || step === 2) && (
          <button
            type="button"
            className="button button-secondary"
            onClick={() => selectStep(true)}
          >
            Skip for now
          </button>
        )}
        {step !== 3 ? (
          <button
            type="button"
            className="button button-primary"
            onClick={() => selectStep()}
          >
            {step === 0 ? "Get started" : "Continue"}
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        ) : connected ? (
          <PendingButton
            type="button"
            pending={pending}
            pendingLabel="Saving preferences…"
            onClick={finish}
          >
            Go to Dashboard
            <ArrowRight size={17} aria-hidden="true" />
          </PendingButton>
        ) : (
          <Action href="/dashboard">Go to Dashboard</Action>
        )}
      </div>
    </div>
  );
}
function Choices<T extends string>({
  name,
  legend,
  items,
  selected,
  choose,
  icons,
}: {
  name: string;
  legend: string;
  items: readonly T[];
  selected?: T;
  choose: (value: T) => void;
  icons: LucideIcon[];
}) {
  return (
    <fieldset className="onboard-choices">
      <legend className="sr-only">{legend}</legend>
      {items.map((item, index) => {
        const Icon = icons[index];
        return (
          <label className="onboard-choice" key={item}>
            <input
              type="radio"
              name={name}
              value={item}
              checked={selected === item}
              onChange={() => choose(item)}
            />
            <Icon size={18} aria-hidden="true" />
            <span>{item}</span>
          </label>
        );
      })}
    </fieldset>
  );
}
