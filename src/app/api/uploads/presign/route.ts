import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { courses } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import {
  UPLOAD_RULES,
  buildObjectKey,
  createPresignedUpload,
  isR2Configured,
  type UploadKind,
} from "@/lib/r2";

export const dynamic = "force-dynamic";

const schema = z.object({
  courseId: z.string().uuid(),
  kind: z.enum(["video", "pdf", "image", "resource"]),
  filename: z.string().trim().min(1).max(200),
  contentType: z.string().trim().min(3).max(150),
  size: z.number().int().positive(),
});

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return json(401, { error: "Please log in to upload files." });
  if (user.role !== "creator" && user.role !== "admin") {
    return json(403, { error: "Only creators can upload course files." });
  }

  if (!isR2Configured()) {
    return json(503, {
      error:
        "File storage isn't configured on this deployment. Add the R2_* environment variables, or paste a file URL instead.",
    });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json(400, { error: "Invalid request." });
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return json(400, { error: parsed.error.issues[0]?.message ?? "Invalid upload request." });
  }
  const { courseId, kind, filename, contentType, size } = parsed.data;

  // Ownership check — creators may only upload into their own courses.
  const [course] = await db
    .select({ id: courses.id, creatorId: courses.creatorId })
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1);
  if (!course) return json(404, { error: "Course not found." });
  if (course.creatorId !== user.id && user.role !== "admin") {
    return json(403, { error: "You don't have access to this course." });
  }

  const rules = UPLOAD_RULES[kind as UploadKind];
  const normalizedType = contentType.split(";")[0].trim().toLowerCase();
  if (!rules.mime.includes(normalizedType)) {
    return json(400, { error: `Unsupported file type for this slot. Allowed: ${rules.label}.` });
  }
  if (size > rules.maxBytes) {
    const mb = Math.round(rules.maxBytes / (1024 * 1024));
    return json(400, { error: `That file is too large. Maximum is ${mb} MB for this slot.` });
  }

  try {
    const key = buildObjectKey({ courseId, kind, filename });
    const signed = await createPresignedUpload({
      key,
      contentType: normalizedType,
      contentLength: size,
    });
    if (!signed) return json(503, { error: "File storage isn't configured." });

    return json(200, {
      uploadUrl: signed.uploadUrl,
      publicUrl: signed.publicUrl,
      key,
      contentType: normalizedType,
    });
  } catch (error) {
    console.error("[uploads] presign failed:", error);
    return json(500, { error: "Couldn't prepare the upload. Please try again." });
  }
}
