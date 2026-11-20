import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import {
  downloadLocator,
  providerJob,
  r2Config,
  signArchiveGet,
  terminalEvent,
  verifyClipSignature,
} from "../../src/lib/media/providers";

const env = {
  R2_ACCOUNT_ID: "a".repeat(32),
  R2_BUCKET_NAME: "private-test",
  R2_ACCESS_KEY_ID: "syntheticAccess",
  R2_SECRET_ACCESS_KEY: "syntheticSecret",
};
const job = {
  id: "job_q8w2e4r6t1y3u5i7o9p0",
  op: "clips",
  status: "succeeded",
  stage: null,
};

test("R2 requires all four variables and signs only a pinned private GET", async () => {
  for (const name of Object.keys(env))
    assert.equal(r2Config({ ...env, [name]: undefined }), null);
  assert.equal(r2Config({ ...env, R2_ACCOUNT_ID: "other.example" }), null);
  assert.equal(r2Config({ ...env, R2_BUCKET_NAME: "bucket/elsewhere" }), null);
  const config = r2Config(env)!;
  for (const bad of [
    "",
    "../foreign.mp4",
    "/another",
    "a/%2e%2e/file",
    "a?b",
    "a//b",
    "a\\b",
  ])
    await assert.rejects(signArchiveGet(config, bad, "mp4"));
  const file = "clips/opaque-id/clip-01.mp4";
  const preview = new URL(await signArchiveGet(config, file, "mp4"));
  const download = new URL(await signArchiveGet(config, file, "mp4", true));
  assert.equal(
    preview.origin,
    `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  );
  assert.equal(preview.pathname, `/${env.R2_BUCKET_NAME}/${file}`);
  assert.equal(preview.searchParams.get("X-Amz-Expires"), "300");
  assert.equal(preview.searchParams.get("X-Amz-SignedHeaders"), "host");
  assert.equal(
    preview.searchParams.get("response-cache-control"),
    "private, no-store",
  );
  assert.equal(preview.searchParams.get("response-content-type"), "video/mp4");
  assert.match(preview.searchParams.get("X-Amz-Signature")!, /^[a-f0-9]{64}$/);
  assert(!download.href.includes(env.R2_SECRET_ACCESS_KEY));
  assert.equal(download.searchParams.get("X-Amz-Expires"), "60");
  assert.equal(
    download.searchParams.get("response-content-disposition"),
    'attachment; filename="zybble-clip.mp4"',
  );
  assert.notEqual(
    download.searchParams.get("X-Amz-Signature"),
    preview.searchParams.get("X-Amz-Signature"),
  );
});

test("clip download accepts typed locators, not a caller-supplied key or origin", () => {
  const id = "6c3b041b-0d89-4bf6-b5dd-524d00372897";
  const valid = { projectId: id, clipId: id, asset: "vtt" };
  assert(downloadLocator.safeParse(valid).success);
  assert(!downloadLocator.safeParse({ ...valid, asset: "raw" }).success);
  assert(!downloadLocator.safeParse({ ...valid, key: "other/clip" }).success);
  assert(!downloadLocator.safeParse({ ...valid, clipId: "../other" }).success);
});

test("ClipSDK authenticates raw bytes and rejects drift, stale delivery, and malformed signature", () => {
  const ts = 1793006268;
  const secret = `whsec_${"s".repeat(32)}`;
  const raw = Buffer.from(
    `\ufeff {"event":"job.succeeded","job":${JSON.stringify(job)},"text":"नमस्ते"}`,
  );
  const signature = createHmac("sha256", secret)
    .update(`${ts}.`)
    .update(raw)
    .digest("hex");
  const header = `t=${ts},v1=${signature}`;
  assert(verifyClipSignature(raw, header, secret, ts + 300));
  assert(!verifyClipSignature(raw, header, secret, ts + 301));
  assert(!verifyClipSignature(raw, header, secret, ts - 301));
  assert(!verifyClipSignature(raw.subarray(3), header, secret, ts));
  assert(!verifyClipSignature(raw, header, `whsec_${"x".repeat(32)}`, ts));
  assert(!verifyClipSignature(raw, `${header},t=${ts}`, secret, ts));
  assert(!verifyClipSignature(raw, `${header}00`, secret, ts));
});

test("ClipSDK payloads must match a known operation, lifecycle state and terminal outcome", () => {
  assert(
    providerJob.safeParse({ ...job, status: "running", stage: "transcribing" })
      .success,
  );
  assert(!providerJob.safeParse({ ...job, id: "../../external" }).success);
  assert(!providerJob.safeParse({ ...job, status: "unknown" }).success);
  assert(terminalEvent.safeParse({ event: "job.succeeded", job }).success);
  assert(!terminalEvent.safeParse({ event: "job.failed", job }).success);
  assert(
    !terminalEvent.safeParse({
      event: "job.succeeded",
      job: { ...job, status: "queued" },
    }).success,
  );
});
