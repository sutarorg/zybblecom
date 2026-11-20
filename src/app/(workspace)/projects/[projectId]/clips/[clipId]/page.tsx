import { Clapperboard, Download, FileText } from "lucide-react";
import { notFound } from "next/navigation";
import { Action } from "@/components/ui/primitives";
import { ClipPreview } from "@/components/workspace/clip-preview";
import { ClipMetadata } from "@/components/workspace/clip-metadata";
import { WorkspaceMutation } from "@/components/workspace/workspace-mutation";
import {
  MediaImage,
  WorkspaceEmpty,
  WorkspaceHeading,
  WorkspaceIssue,
} from "@/components/workspace/ui";
import { workspace } from "@/services/workspace-server";
import { durationText, projectHref } from "@/services/workspace-format";
import { captionStyles } from "@/services/generation-schema";
export const metadata = { title: "Clip editor" };
export default async function Editor({
  params,
}: {
  params: Promise<{ projectId: string; clipId: string }>;
}) {
  const { projectId, clipId } = await params;
  const result = await workspace.run("getClip", projectId, clipId);
  if (!result.ok) {
    if (result.error === "not_found") notFound();
    return (
      <>
        <WorkspaceHeading
          label="EDITOR"
          title="Clip editor"
          description="Preview a rendered clip, edit its details and export available files."
        />
        <WorkspaceIssue result={result} />
        <WorkspaceEmpty
          icon={Clapperboard}
          title="This clip isn’t available"
          text="An existing generated clip is required to use the editor. Video preview and exports aren’t connected here."
          action={
            <Action href="/clips" variant="secondary">
              Back to My Clips
            </Action>
          }
        />
      </>
    );
  }
  const clip = result.value;
  return (
    <>
      <WorkspaceHeading
        label="CLIP EDITOR"
        title={clip.title}
        description={`${clip.aspect} · ${durationText(clip.durationSeconds)} · Source ${durationText(clip.startSeconds)}–${durationText(clip.endSeconds)}`}
        action={
          <Action href={projectHref(clip.projectId)} variant="secondary">
            Original project
          </Action>
        }
      />
      <div className="ws-editor-grid">
        <section className="ws-panel">
          <div className="ws-section-heading">
            <div>
              <span className="ws-section-tag">PLAYBACK</span>
              <h2>Clip preview</h2>
            </div>
            <Clapperboard size={20} aria-hidden="true" />
          </div>
          {clip.playback ? (
            <ClipPreview
              clip={{
                playback: clip.playback,
                poster: clip.poster,
                aspect: clip.aspect,
                title: clip.title,
                vtt: clip.vtt,
                language: clip.language,
              }}
            />
          ) : clip.poster ? (
            <div className="ws-poster ws-clip-poster" data-aspect={clip.aspect}>
              <MediaImage src={clip.poster} alt="Clip poster" />
            </div>
          ) : (
            <p>Playback isn’t available for this asset.</p>
          )}
          <p className="ws-muted">
            {clip.captions === "clean"
              ? "No captions are burned into this clip."
              : `${captionStyles[clip.captions]} captions are burned into the video and can’t be changed here.`}
            {clip.vtt && " The player’s CC track does not change the MP4."}
          </p>
          {clip.transcript && (
            <details className="ws-transcript">
              <summary>Read transcript</summary>
              <p>{clip.transcript}</p>
            </details>
          )}
        </section>
        <div className="ws-config-body">
          <section className="ws-panel">
            <div className="ws-section-heading">
              <div>
                <span className="ws-section-tag">METADATA</span>
                <h2>Clip details</h2>
              </div>
              <FileText size={20} aria-hidden="true" />
            </div>
            {clip.canEditMetadata ? (
              <ClipMetadata
                key={clip.id}
                projectId={clip.projectId}
                clipId={clip.id}
                initialTitle={clip.title}
                initialDescription={clip.description ?? ""}
              />
            ) : (
              <p>
                {clip.description || "There’s no description for this clip."}
              </p>
            )}
          </section>
          <section className="ws-panel">
            <div className="ws-section-heading">
              <div>
                <span className="ws-section-tag">EXPORT</span>
                <h2>Downloads</h2>
              </div>
              <Download size={20} aria-hidden="true" />
            </div>
            {clip.downloads.length ? (
              <div className="actions">
                {clip.downloads.map((asset) => (
                  <WorkspaceMutation
                    key={asset}
                    kind="download"
                    projectId={clip.projectId}
                    clipId={clip.id}
                    asset={asset}
                  />
                ))}
              </div>
            ) : (
              <p>No files are ready to download yet.</p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
