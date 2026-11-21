export type HomepageSample = {
  src: string;
  poster?: string;
  captions?: { src: string; language: string; label: string };
};

// Keep the original sample order; public URLs use neutral file names.
export const homepageSamples: readonly HomepageSample[] = [
  "01",
  "02",
  "03",
  "04",
  "05",
].map((number) => ({
  src: `/media/samples/sample-${number}.mp4`,
  poster: `/media/samples/sample-${number}.webp`,
}));
