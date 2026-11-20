export const counts = [3, 5, 10, 20] as const;
export const durationRanges = [
  [15, 30],
  [20, 60],
  [30, 90],
] as const;
export const aspects = {
  "9:16": "Vertical",
  "1:1": "Square",
  "4:5": "Portrait",
  "16:9": "Landscape",
} as const;
export const frames = {
  auto: "Follow speaker",
  center: "Center crop",
  none: "Full frame",
} as const;
export const captionStyles = {
  bold: "Bold",
  karaoke: "Karaoke",
  minimal: "Minimal",
  clean: "Clean",
} as const;
export const PROMPT_LIMIT = 500;
export type GenerationOptions = {
  clips: (typeof counts)[number];
  range: 0 | 1 | 2;
  aspect: keyof typeof aspects;
  reframe: keyof typeof frames;
  captions: keyof typeof captionStyles;
  prompt: string;
};
export const defaultOptions: GenerationOptions = {
  clips: 5,
  range: 1,
  aspect: "9:16",
  reframe: "auto",
  captions: "bold",
  prompt: "",
};
export function generationParams(options: GenerationOptions) {
  const range = Number.isInteger(options.range)
    ? durationRanges[options.range]
    : undefined;
  if (
    !counts.includes(options.clips) ||
    !range ||
    range[0] < 10 ||
    range[1] > 90 ||
    range[1] - range[0] < 5 ||
    !Object.hasOwn(aspects, options.aspect) ||
    !Object.hasOwn(frames, options.reframe) ||
    !Object.hasOwn(captionStyles, options.captions) ||
    typeof options.prompt !== "string" ||
    options.prompt.length > PROMPT_LIMIT
  )
    return null;
  return {
    clips: options.clips,
    min_seconds: range[0],
    max_seconds: range[1],
    aspect: options.aspect,
    reframe: options.reframe,
    captions:
      options.captions === "clean" ? (false as const) : options.captions,
    ...(options.prompt.trim() ? { prompt: options.prompt.trim() } : {}),
  };
}
export type GenerationParams = NonNullable<ReturnType<typeof generationParams>>;
export const videoFormats = ["mp4", "mov", "webm"] as const;
export const fileAccept =
  ".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm";
export function validateVideo(
  file: Pick<File, "name" | "size">,
  maxBytes?: number,
) {
  if (!videoFormats.some((ext) => file.name.toLowerCase().endsWith(`.${ext}`)))
    return "Choose an MP4, MOV, or WebM video.";
  if (file.size <= 0)
    return "This file is empty. Choose a video that contains data.";
  if (maxBytes !== undefined && file.size > maxBytes)
    return "This file exceeds your workspace’s upload limit.";
  return null;
}
export const validTitle = (title: string) =>
  title.trim().length >= 1 && title.trim().length <= 100;

export const standardSourceSeconds = 180 * 60;
export function estimateSourceCredits(seconds: number | undefined) {
  return seconds !== undefined &&
    Number.isFinite(seconds) &&
    seconds > 0 &&
    seconds <= standardSourceSeconds
    ? Math.ceil(seconds / 60)
    : null;
}
