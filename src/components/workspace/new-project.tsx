"use client";
import { useId, useRef, useState } from "react";
import {
  Ratio,
  Captions,
  Check,
  Clapperboard,
  Coins,
  FileVideo,
  Film,
  Focus,
  Info,
  Sparkles,
  Timer,
  Upload,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { PendingButton } from "@/components/system/loading";
import { useProjectUpload } from "@/hooks/use-project-upload";
import { useCreditQuote } from "@/hooks/use-credit-quote";
import { quoteState, workspace, workspaceMessage } from "@/services/workspace";
import { Action } from "@/components/ui/primitives";
import { FilePicker } from "./file-picker";
import { useLocalDraft } from "./shell";
import { useLocalVideo } from "@/hooks/use-local-video";
import {
  aspects,
  captionStyles,
  counts,
  defaultOptions,
  durationRanges,
  frames,
  generationParams,
  PROMPT_LIMIT,
  validateVideo,
  validTitle,
  type GenerationOptions,
} from "@/services/generation-schema";
import {
  creditsText,
  durationText,
  bytesText,
  projectHref,
} from "@/services/workspace-format";
import type {
  Balance,
  CreditQuote,
  Preferences,
  Project,
  UploadPolicy,
} from "@/services/workspace-contracts";

function Choices<T extends string | number>({
  label,
  name,
  options,
  value,
  change,
}: {
  label: string;
  name: string;
  options: ReadonlyArray<readonly [T, string]>;
  value: T;
  change: (v: T) => void;
}) {
  const id = useId();
  return (
    <fieldset className="ws-choice">
      <legend>{label}</legend>
      <div>
        {options.map(([key, text]) => (
          <label key={key} htmlFor={`${id}-${key}`}>
            <input
              id={`${id}-${key}`}
              name={name}
              type="radio"
              checked={value === key}
              onChange={() => change(key)}
            />
            <span>{text}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
const entries = <T extends Record<string, string>>(value: T) =>
  Object.entries(value) as [keyof T & string, string][];
export function NewProject({
  policy,
  balance,
  preferences,
  existingProject,
}: {
  policy: UploadPolicy | null;
  balance: Balance | null;
  preferences: Preferences | null;
  existingProject?: Project;
}) {
  const {
    file,
    setFile,
    titleEdit,
    setTitle,
    options: draftOptions,
    setOptions,
  } = useLocalDraft();
  const reading = useLocalVideo(existingProject ? null : file);
  const initial = preferences
    ? {
        ...defaultOptions,
        aspect: preferences.defaultAspect,
        captions: preferences.defaultCaptions,
      }
    : defaultOptions;
  const options = draftOptions ?? initial;
  const [touched, setTouched] = useState(false);
  const [quote, setQuote] = useState<{
    value: CreditQuote;
    fingerprint: string;
  } | null>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const request = useRef<{ id: string; key: string }>(null);
  const router = useRouter();
  const upload = useProjectUpload();
  const verifiedProject = existingProject ?? upload.project;
  const maxBytes = policy?.maxBytes;
  const locked =
    upload.phase === "complete" ||
    upload.phase === "verifying" ||
    upload.canCancel;
  const title =
    titleEdit ?? file?.name.replace(/\.[^.]+$/, "").slice(0, 100) ?? "";
  const update = <K extends keyof GenerationOptions>(
    key: K,
    value: GenerationOptions[K],
  ) => setOptions((previous) => ({ ...(previous ?? initial), [key]: value }));
  const error = touched && !validTitle(title);
  const params = generationParams(options);
  const fingerprint = JSON.stringify(params);
  const currentQuote = quote?.fingerprint === fingerprint ? quote.value : null;
  const quoteStatus = useCreditQuote(currentQuote);
  async function requestQuote() {
    if (pending || !params || !verifiedProject) return;
    setPending(true);
    setMessage("");
    const result = await workspace.run("quoteGeneration", {
      projectId: verifiedProject.id,
      settings: params,
    });
    setPending(false);
    if (result.ok) setQuote({ value: result.value, fingerprint });
    else {
      setQuote(null);
      setMessage(workspaceMessage(result.error));
    }
  }
  async function generate() {
    if (
      pending ||
      !params ||
      !verifiedProject ||
      !currentQuote ||
      quoteState(currentQuote) !== "ready"
    ) {
      setMessage("Check for a current quote before generating.");
      return;
    }
    setPending(true);
    setMessage("");
    if (request.current?.id !== currentQuote.id)
      request.current = { id: currentQuote.id, key: crypto.randomUUID() };
    const result = await workspace.run("startGeneration", {
      projectId: verifiedProject.id,
      settings: params,
      quoteId: currentQuote.id,
      requestKey: request.current.key,
    });
    if (result.ok) {
      setFile(null);
      setTitle(null);
      setOptions(null);
      router.replace(projectHref(verifiedProject.id));
      router.refresh();
    } else {
      setPending(false);
      if (result.error !== "network") setQuote(null);
      setMessage(workspaceMessage(result.error));
    }
  }
  return (
    <div className="ws-config-grid">
      <div className="ws-config-body">
        <section className="ws-panel">
          <div className="ws-section-heading">
            <div>
              <span className="ws-section-tag">STEP 01</span>
              <h2>Source video</h2>
            </div>
            <Film size={21} aria-hidden="true" />
          </div>
          {existingProject ? (
            <div className="ws-note">
              <FileVideo size={18} aria-hidden="true" />
              <p>
                Using the verified source from{" "}
                <strong>{existingProject.title}</strong>
                {existingProject.source
                  ? ` · ${durationText(existingProject.source.durationSeconds)} · ${bytesText(existingProject.source.bytes)}`
                  : ""}
                .
              </p>
            </div>
          ) : (
            <>
              <FilePicker
                file={file}
                onFile={setFile}
                maxBytes={maxBytes}
                disabled={locked}
              />
              <div className="ws-field">
                <label htmlFor="project-title">Project title</label>
                <input
                  id="project-title"
                  placeholder="Give your project a name"
                  maxLength={100}
                  disabled={locked}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => setTouched(true)}
                  aria-invalid={error || undefined}
                  aria-describedby="title-hint"
                />
                <p id="title-hint" className={error ? "ws-field-error" : ""}>
                  {error
                    ? "Enter a title from 1 to 100 characters."
                    : "Up to 100 characters."}
                </p>
              </div>
              {file && !verifiedProject && (
                <div className="ws-note">
                  <FileVideo size={18} aria-hidden="true" />
                  <p>
                    {reading?.duration
                      ? `Local video: ${durationText(reading.duration)}${reading.width && reading.height ? ` · ${reading.width} × ${reading.height}` : ""}. Not verified by Zybble.`
                      : reading
                        ? "This browser couldn’t read the video duration. The file is still only on your device."
                        : "Reading video metadata on this device…"}
                  </p>
                </div>
              )}
              {!policy ? (
                <p className="ws-muted">
                  Uploads aren’t connected. No file leaves your device.
                </p>
              ) : (
                <div className="ws-upload-actions">
                  {verifiedProject?.source && (
                    <p role="status">
                      Upload verified ·{" "}
                      {durationText(verifiedProject.source.durationSeconds)} ·{" "}
                      {bytesText(verifiedProject.source.bytes)}
                    </p>
                  )}
                  {(upload.phase === "sending" ||
                    upload.phase === "verifying") && (
                    <div role="status">
                      <p>
                        {upload.phase === "verifying"
                          ? "Verifying the uploaded video…"
                          : upload.progress
                            ? `${bytesText(upload.progress.sent)} of ${bytesText(upload.progress.total)}${upload.progress.bytesPerSecond && upload.progress.secondsRemaining !== undefined ? ` · ${bytesText(Math.round(upload.progress.bytesPerSecond))}/s · about ${upload.progress.secondsRemaining}s left` : ""}`
                            : "Preparing upload…"}
                      </p>
                      <progress
                        max={upload.progress?.total ?? 1}
                        value={upload.progress?.sent}
                        aria-label="Uploaded bytes"
                      />
                    </div>
                  )}
                  {(upload.phase === "idle" || upload.phase === "failed") && (
                    <button
                      className="button button-primary"
                      type="button"
                      disabled={
                        !file ||
                        Boolean(file && validateVideo(file, maxBytes)) ||
                        !validTitle(title)
                      }
                      onClick={() => {
                        if (
                          file &&
                          !validateVideo(file, maxBytes) &&
                          validTitle(title)
                        )
                          void upload.start(file, title.trim());
                      }}
                    >
                      {upload.phase === "failed"
                        ? upload.canResume
                          ? "Resume upload"
                          : "Retry upload"
                        : "Upload video"}
                    </button>
                  )}
                  {upload.canCancel && (
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={upload.cancel}
                    >
                      Cancel upload
                    </button>
                  )}
                  {upload.message && <p role="status">{upload.message}</p>}
                </div>
              )}
            </>
          )}
        </section>
        <section className="ws-panel ws-config-settings">
          <div className="ws-section-heading">
            <div>
              <span className="ws-section-tag">STEP 02</span>
              <h2>Clip settings</h2>
            </div>
            <Sparkles size={20} aria-hidden="true" />
          </div>
          <Choices
            label="Number of clips"
            name="count"
            options={counts.map((v) => [v, String(v)] as const)}
            value={options.clips}
            change={(v) => update("clips", v)}
          />
          <p className="ws-muted">
            The final number can be lower if fewer moments fit your settings.
          </p>
          <Choices
            label="Clip duration"
            name="duration"
            options={
              [
                [0, "15–30 sec"],
                [1, "20–60 sec"],
                [2, "30–90 sec"],
              ] as const
            }
            value={options.range}
            change={(v) => update("range", v)}
          />
          <Choices
            label="Aspect ratio"
            name="ratio"
            options={entries(aspects).map(
              ([key, label]) => [key, `${key} · ${label}`] as const,
            )}
            value={options.aspect}
            change={(v) => update("aspect", v)}
          />
          <Choices
            label="Reframing"
            name="reframe"
            options={
              [
                ["auto", "Follow speaker"],
                ["center", "Center crop"],
                ["none", "Full frame"],
              ] as const
            }
            value={options.reframe}
            change={(v) => update("reframe", v)}
          />
          <p className="ws-muted">
            Full frame preserves the source framing and may add blurred fill.
          </p>
          <Choices
            label="Captions"
            name="captions"
            options={entries(captionStyles)}
            value={options.captions}
            change={(v) => update("captions", v)}
          />
          <div className="ws-field">
            <label htmlFor="clip-prompt">
              AI guidance <small>Optional</small>
            </label>
            <textarea
              id="clip-prompt"
              rows={3}
              maxLength={PROMPT_LIMIT}
              placeholder="Find standalone explanations or moments with practical tips."
              value={options.prompt}
              onChange={(e) => update("prompt", e.target.value)}
              aria-describedby="prompt-hint"
            />
            <div className="ws-prompt-hint" id="prompt-hint">
              <p>
                Describe what to look for. Guidance doesn’t guarantee reach or a
                particular result.
              </p>
              <span>
                {options.prompt.length}/{PROMPT_LIMIT}
              </span>
            </div>
          </div>
        </section>
      </div>
      <aside className="ws-panel ws-summary">
        <div className="ws-section-heading">
          <div>
            <span className="ws-section-tag">STEP 03</span>
            <h2>Generation summary</h2>
          </div>
          <Check size={20} aria-hidden="true" />
        </div>
        <dl className="ws-summary-list">
          {[
            [
              Upload,
              "Original duration",
              verifiedProject?.source
                ? durationText(verifiedProject.source.durationSeconds)
                : reading?.duration
                  ? `${durationText(reading.duration)} (local)`
                  : "Not available",
            ],
            [Clapperboard, "Clip count", String(options.clips)],
            [
              Timer,
              "Clip length",
              `${durationRanges[options.range].join("–")} sec`,
            ],
            [Ratio, "Format", `${options.aspect} ${aspects[options.aspect]}`],
            [Focus, "Reframe", frames[options.reframe]],
            [Captions, "Captions", captionStyles[options.captions]],
            [Sparkles, "AI guidance", params?.prompt ?? "None"],
          ].map(([Icon, label, text]) => {
            const Symbol = Icon as typeof Upload;
            return (
              <div key={String(label)}>
                <dt>
                  <Symbol size={16} aria-hidden="true" />
                  {String(label)}
                </dt>
                <dd>{String(text)}</dd>
              </div>
            );
          })}
        </dl>
        <div className="ws-summary-balance">
          <Coins size={20} aria-hidden="true" />
          <dl>
            <div>
              <dt>Estimated cost</dt>
              <dd>
                {currentQuote
                  ? creditsText(currentQuote.required)
                  : "Quote unavailable"}
              </dd>
            </div>
            <div>
              <dt>Available credits</dt>
              <dd>
                {currentQuote
                  ? creditsText(currentQuote.available)
                  : balance
                    ? creditsText(balance.available)
                    : "Not connected"}
              </dd>
            </div>
          </dl>
        </div>
        {verifiedProject && (
          <PendingButton
            className="button-secondary"
            type="button"
            pending={pending}
            onClick={requestQuote}
          >
            {currentQuote ? "Refresh credit quote" : "Get credit quote"}
          </PendingButton>
        )}
        <PendingButton
          pending={pending}
          disabled={!verifiedProject || quoteStatus !== "ready"}
          type="button"
          aria-describedby="generate-reason"
          onClick={generate}
        >
          <Sparkles size={18} aria-hidden="true" />
          Generate My Shorts
        </PendingButton>
        <p id="generate-reason" className="ws-muted">
          <Info size={14} aria-hidden="true" />
          {quoteStatus === "insufficient"
            ? "You don’t have enough available credits for this request."
            : quoteStatus === "ready"
              ? "Starting generation reserves the quoted credits."
              : policy
                ? "Generation needs a verified upload, a current quote and enough credits."
                : "Generation needs a verified upload, an active quote and enough credits. Nothing will be charged here."}
        </p>
        {message && (
          <p role="alert" className="ws-field-error">
            {message}
          </p>
        )}
        <Action href="/credits#credit-packs" variant="secondary" arrow={false}>
          Buy Credits
        </Action>
      </aside>
    </div>
  );
}
