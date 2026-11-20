import { z } from "zod";
import { aspects, captionStyles, defaultOptions } from "./generation-schema";

export const profileChange = z.strictObject({
  name: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[^\u0000]+$/),
});
const aspect = z.enum(Object.keys(aspects) as (keyof typeof aspects)[]);
const captions = z.enum(
  Object.keys(captionStyles) as (keyof typeof captionStyles)[],
);
export const preferencesChange = z.strictObject({
  defaultAspect: aspect,
  defaultCaptions: captions,
});
export const storedPreferences = z.object({
  defaultAspect: aspect.default(defaultOptions.aspect),
  defaultCaptions: captions.default(defaultOptions.captions),
});
export const profileResponse = z.object({
  name: z.string(),
  email: z.string(),
});
