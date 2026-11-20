import { CircleCheck, Clock4, TriangleAlert } from "lucide-react";
import { Action } from "@/components/ui/primitives";
import type { Job } from "@/services/workspace-contracts";
import { captionStyles, frames } from "@/services/generation-schema";
import { creditsText } from "@/services/workspace-format";
const phases = [
  ["preparing", "Preparing"],
  ["submitted", "Submitted"],
  ["processing", "Processing"],
  ["saving", "Saving"],
  ["completed", "Completed"],
] as const;
const provider = {
  fetching: "Retrieving the source video",
  transcribing: "Transcribing speech",
  ranking: "Finding highlights",
  rendering: "Rendering clips",
};
const failures = {
  source: "The source video couldn’t be processed.",
  speech: "There wasn’t enough detectable speech to finish generation.",
  timeout: "Processing took too long and stopped.",
  service: "Generation couldn’t finish.",
};
export function JobStatus({
  job,
  retry,
}: {
  job: Job;
  retry?: React.ReactNode;
}) {
  const failed = job.phase === "failed";
  const current = phases.findIndex(([phase]) => phase === job.phase);
  const settings = job.configuration;
  return (
    <section className="ws-panel">
      <div className="ws-section-heading">
        <div>
          <span className="ws-section-tag">GENERATION</span>
          <h2>
            {failed
              ? "Generation stopped"
              : job.phase === "completed"
                ? "Generation complete"
                : "Generation status"}
          </h2>
        </div>
        {failed ? (
          <TriangleAlert aria-hidden="true" />
        ) : job.phase === "completed" ? (
          <CircleCheck aria-hidden="true" />
        ) : (
          <Clock4 aria-hidden="true" />
        )}
      </div>
      {failed ? (
        <div className="ws-note" role="status">
          <p>
            {job.failure
              ? failures[job.failure.kind]
              : "Generation couldn’t finish."}
          </p>
        </div>
      ) : (
        <ol className="ws-stages">
          {phases.map(([phase, label], index) => (
            <li
              key={phase}
              data-reached={index <= current}
              aria-current={index === current ? "step" : undefined}
            >
              <span aria-hidden="true">
                {index < current ? "✓" : index + 1}
              </span>
              {label}
            </li>
          ))}
        </ol>
      )}
      {!failed && job.providerStage && job.phase === "processing" && (
        <p role="status">{provider[job.providerStage]}</p>
      )}
      <dl className="ws-detail-list">
        <div>
          <dt>Requested output</dt>
          <dd>
            {settings.clips} clips · {settings.min_seconds}–
            {settings.max_seconds} sec · {settings.aspect}
          </dd>
        </div>
        <div>
          <dt>Style</dt>
          <dd>
            {frames[settings.reframe]} ·{" "}
            {settings.captions === false
              ? captionStyles.clean
              : captionStyles[settings.captions]}
          </dd>
        </div>
        {settings.prompt && (
          <div>
            <dt>AI guidance</dt>
            <dd>{settings.prompt}</dd>
          </div>
        )}
        <div>
          <dt>Credit reservation</dt>
          <dd>
            {job.reservation
              ? `${creditsText(job.reservation.credits)} credits · ${job.reservation.state}`
              : "Reservation status not available"}
          </dd>
        </div>
        {job.remainingCredits !== undefined && (
          <div>
            <dt>Available after this job</dt>
            <dd>{creditsText(job.remainingCredits)}</dd>
          </div>
        )}
      </dl>
      {failed && (
        <div className="actions">
          {retry}
          <Action href="/support" variant="secondary">
            Get help
          </Action>
        </div>
      )}
    </section>
  );
}
