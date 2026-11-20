import test from "node:test";
import assert from "node:assert/strict";
import {
  aspects,
  captionStyles,
  counts,
  defaultOptions,
  durationRanges,
  frames,
  generationParams,
  validTitle,
  validateVideo,
} from "../../src/services/generation-schema";
import {
  createWorkspaceServices,
  quoteState,
} from "../../src/services/workspace";

test("all supported generation choices serialize to the provider contract", () => {
  for (const clips of counts)
    for (const range of [0, 1, 2] as const)
      for (const aspect of Object.keys(aspects) as (keyof typeof aspects)[])
        for (const reframe of Object.keys(frames) as (keyof typeof frames)[])
          for (const captions of Object.keys(
            captionStyles,
          ) as (keyof typeof captionStyles)[]) {
            const [min_seconds, max_seconds] = durationRanges[range];
            assert.deepEqual(
              generationParams({
                clips,
                range,
                aspect,
                reframe,
                captions,
                prompt: "  Look for useful explanations.  ",
              }),
              {
                clips,
                min_seconds,
                max_seconds,
                aspect,
                reframe,
                captions: captions === "clean" ? false : captions,
                prompt: "Look for useful explanations.",
              },
            );
          }
  assert.equal(
    generationParams({ ...defaultOptions, prompt: "x".repeat(501) }),
    null,
  );
  assert.equal(
    generationParams({ ...defaultOptions, aspect: "constructor" as "9:16" }),
    null,
  );
  assert(!Object.hasOwn(generationParams(defaultOptions)!, "prompt"));
  assert.equal(
    generationParams({
      ...defaultOptions,
      range: "constructor" as unknown as 0,
    }),
    null,
  );
});
test("file policy and title validation are local without an invented cap", () => {
  assert.equal(validateVideo({ name: "source.MOV", size: 123 }), null);
  assert(validateVideo({ name: "source.MOV.exe", size: 123 }));
  assert(validateVideo({ name: "source.webm", size: 0 }));
  assert(validateVideo({ name: "source.mp4", size: 123 }, 122));
  assert(validTitle(" My draft "));
  assert(!validTitle(" "));
  assert(!validTitle("x".repeat(101)));
});
test("generation fails closed for insufficient, unavailable or expired quotes", () => {
  const expiration = "2026-11-20T08:00:00Z",
    now = Date.parse(expiration) - 1;
  assert.equal(quoteState(null, now), "unverified");
  assert.equal(
    quoteState(
      { id: "q", required: 2, available: 1, expiresAt: expiration },
      now,
    ),
    "insufficient",
  );
  assert.equal(
    quoteState(
      { id: "q", required: 2, available: 2, expiresAt: expiration },
      now,
    ),
    "ready",
  );
  assert.equal(
    quoteState(
      { id: "q", required: 2, available: 2, expiresAt: expiration },
      now + 1,
    ),
    "unverified",
  );
  assert.equal(
    quoteState(
      { id: "q", required: 2, available: 2, expiresAt: "unknown" },
      now,
    ),
    "unverified",
  );
});
test("disconnected services never succeed and exceptions are sanitized", async () => {
  const services = createWorkspaceServices();
  assert.deepEqual(await services.run("getBalance"), {
    ok: false,
    error: "unavailable",
  });
  assert.deepEqual(
    await services.run("beginUpload", {
      title: "Private",
      filename: "local.mp4",
      bytes: 123,
      mime: "video/mp4",
    }),
    { ok: false, error: "unavailable" },
  );
  assert.deepEqual(
    await services.run("startGeneration", {
      projectId: "id",
      settings: generationParams(defaultOptions)!,
      quoteId: "id",
      requestKey: "id",
    }),
    { ok: false, error: "unavailable" },
  );
  assert.deepEqual(
    await createWorkspaceServices({
      getBalance: async () => {
        throw Error("private error details");
      },
    }).run("getBalance"),
    { ok: false, error: "network" },
  );
});
