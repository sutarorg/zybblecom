import { z } from "zod";
import { supportEmail } from "@/config/legal";
const address = z.string().max(254).pipe(z.email());
export const contactFields = z.strictObject({
  name: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .refine((value) =>
      [...value].every(
        (character) =>
          character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127,
      ),
    ),
  email: z.string().trim().pipe(address),
  topic: z.enum(["Product question", "Credits and pricing", "Something else"]),
  message: z.string().trim().min(10).max(2000),
  website: z.literal(""),
});
export function contactSettings(
  env: Readonly<Record<string, string | undefined>>,
) {
  const key = env.RESEND_API_KEY?.trim();
  const from = address.safeParse(env.CONTACT_FROM_EMAIL?.trim());
  const to = address.safeParse(
    env.VERCEL_ENV === "production"
      ? supportEmail
      : env.CONTACT_TO_EMAIL?.trim(),
  );
  if (!key || !from.success || !to.success) return null;
  return { key, from: from.data, to: to.data };
}
