import assert from "node:assert/strict";
import { test } from "node:test";
import { quoteContext } from "../../src/services/workspace";
import {
  aspects,
  captionStyles,
  defaultOptions,
  generationParams,
} from "../../src/services/generation-schema";
import {
  preferencesChange,
  profileChange,
  storedPreferences,
} from "../../src/services/settings-schema";

test("profile setting normalizes a name and accepts only the permitted field", () => {
  assert.deepEqual(profileChange.parse({ name: "  Test Creator  " }), {
    name: "Test Creator",
  });
  for (const body of [
    { name: " " },
    { name: "x".repeat(101) },
    { name: "\u0000" },
    { name: "Test", email: "other@example.invalid" },
  ]) {
    assert.equal(profileChange.safeParse(body).success, false);
  }
});

test("creator defaults allow every supported format and do not enable job email", () => {
  for (const defaultAspect of Object.keys(aspects)) {
    for (const defaultCaptions of Object.keys(captionStyles)) {
      assert.deepEqual(
        preferencesChange.parse({ defaultAspect, defaultCaptions }),
        { defaultAspect, defaultCaptions },
      );
    }
  }
  const defaults = {
    defaultAspect: defaultOptions.aspect,
    defaultCaptions: defaultOptions.captions,
  };
  assert.deepEqual(storedPreferences.parse({ jobEmail: true }), defaults);
  assert.equal(
    preferencesChange.safeParse({ ...defaults, jobEmail: true }).success,
    false,
  );
  assert.equal(
    preferencesChange.safeParse({ ...defaults, defaultCaptions: false })
      .success,
    false,
  );
});

test("quote context changes with the project or generation settings", () => {
  const first = generationParams(defaultOptions)!;
  const second = generationParams({ ...defaultOptions, aspect: "16:9" })!;
  assert.notEqual(quoteContext("one", first), quoteContext("two", first));
  assert.notEqual(quoteContext("one", first), quoteContext("one", second));
  assert.equal(quoteContext(undefined, first), null);
  assert.equal(quoteContext("one", null), null);
});
