import { z } from "zod";
import { creditActivity } from "@/lib/backend/credit-reads";
import { ApiError, respond } from "@/lib/backend/http";
const schema = z.strictObject({
  filter: z.enum(["all", "usage", "purchases"]).default("all"),
  cursor: z
    .string()
    .regex(/^[A-Za-z0-9_-]{1,256}$/)
    .optional(),
});
export const GET = (request: Request) =>
  respond(async () => {
    const input = schema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!input.success) throw new ApiError("validation", 400);
    return creditActivity(input.data.filter, input.data.cursor);
  });
