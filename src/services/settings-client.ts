import { z } from "zod";
import { preferencesChange, profileResponse } from "./settings-schema";
import type { Result } from "./workspace-contracts";

async function save<T>(
  section: "profile" | "preferences",
  body: unknown,
  schema: z.ZodType<T>,
): Promise<Result<T>> {
  try {
    const response = await fetch(`/api/settings/${section}`, {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = z
      .object({ success: z.literal(true), data: schema })
      .safeParse(await response.json());
    if (response.ok && result.success)
      return { ok: true, value: result.data.data };
    return {
      ok: false,
      error:
        response.status === 400
          ? "validation"
          : response.status === 401 || response.status === 403
            ? "unauthorized"
            : "network",
    };
  } catch {
    return { ok: false, error: "network" };
  }
}
export const saveProfile = (name: string) =>
  save("profile", { name }, profileResponse);
export const savePreferences = (prefs: z.infer<typeof preferencesChange>) =>
  save("preferences", prefs, preferencesChange);
