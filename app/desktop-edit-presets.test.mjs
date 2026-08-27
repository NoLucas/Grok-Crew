import assert from "node:assert/strict";
import test from "node:test";
import {
  BUILTIN_EDIT_PRESETS,
  CUSTOM_EDIT_PRESET_ID,
  DEFAULT_EDIT_METHOD,
  MAX_SAVED_EDIT_PRESETS,
  applyEditPreset,
  createSavedEditPreset,
  findEditPreset,
  methodsMatch,
  normalizeEditMethod,
  normalizeEditPresetsStore,
  parseEditPresetsStore,
  removeSavedEditPreset,
  upsertSavedEditPreset,
} from "./desktop-edit-presets.ts";

test("builtin styles cover shorts, reels, tiktok, and extras", () => {
  const ids = BUILTIN_EDIT_PRESETS.map((item) => item.id);
  assert.deepEqual(ids, [
    "youtube_short",
    "instagram_reel",
    "tiktok",
    "youtube_long",
    "instagram_square",
    "landscape_short",
  ]);
  const empty = { saved: [], lastSelectedId: "" };
  assert.equal(findEditPreset(empty, "tiktok")?.method.target_length, 15);
  assert.equal(findEditPreset(empty, "instagram_reel")?.method.look, "punchy");
  assert.equal(findEditPreset(empty, "youtube_long")?.method.aspect_ratio, "16:9");
  assert.equal(findEditPreset(empty, "youtube_long")?.method.quality, "high");
  assert.equal(findEditPreset(empty, "instagram_square")?.method.aspect_ratio, "1:1");
});

test("applying a preset can keep locked quality", () => {
  const current = { ...DEFAULT_EDIT_METHOD, quality: "high" };
  const next = applyEditPreset(current, { ...DEFAULT_EDIT_METHOD, quality: "compact", pacing: "tight" }, { lockQuality: true });
  assert.equal(next.quality, "high");
  assert.equal(next.pacing, "tight");
});

test("normalize coerces stored strings and drops unknown enums", () => {
  const next = normalizeEditMethod({
    content_type: "short",
    target_length: "45",
    look: "cinematic",
    audio_policy: "keep_source",
    quality: "720",
    fps: "30",
    speed: "1.25",
  });
  assert.equal(next.content_type, "talking_head");
  assert.equal(next.target_length, 45);
  assert.equal(next.look, "natural");
  assert.equal(next.audio_policy, "normalize");
  assert.equal(next.quality, "balanced");
  assert.equal(next.fps, 30);
  assert.equal(next.speed, 1.25);
});

test("custom is a first-class style and save does not assign it", () => {
  const empty = { saved: [], lastSelectedId: "youtube_short" };
  assert.equal(findEditPreset(empty, CUSTOM_EDIT_PRESET_ID)?.kind, "custom");
  assert.equal(findEditPreset(empty, "")?.kind, "custom");
  const saved = upsertSavedEditPreset(empty, createSavedEditPreset("밤 컷", DEFAULT_EDIT_METHOD, 3));
  assert.equal(saved.lastSelectedId, "youtube_short");
  assert.equal(saved.saved[0].name, "밤 컷");
  assert.equal(methodsMatch(DEFAULT_EDIT_METHOD, { ...DEFAULT_EDIT_METHOD, quality: "high" }, { lockQuality: true }), true);
  assert.equal(methodsMatch(DEFAULT_EDIT_METHOD, { ...DEFAULT_EDIT_METHOD, pacing: "balanced" }), false);
});

test("saved presets upsert by name and drop the oldest past the cap", () => {
  let store = { saved: [], lastSelectedId: "" };
  const first = createSavedEditPreset("내 컷", DEFAULT_EDIT_METHOD, 1);
  store = upsertSavedEditPreset(store, first);
  store = upsertSavedEditPreset(store, createSavedEditPreset("내 컷", { ...DEFAULT_EDIT_METHOD, pacing: "balanced" }, 2));
  assert.equal(store.saved.length, 1);
  assert.equal(store.saved[0].id, "saved_1");
  assert.equal(store.saved[0].method.pacing, "balanced");

  for (let index = 0; index < MAX_SAVED_EDIT_PRESETS + 1; index += 1) {
    store = upsertSavedEditPreset(store, createSavedEditPreset(`스타일 ${index}`, DEFAULT_EDIT_METHOD, 100 + index));
  }
  assert.equal(store.saved.length, MAX_SAVED_EDIT_PRESETS);
});

test("delete clears the selection and parse ignores junk", () => {
  const store = removeSavedEditPreset(
    {
      saved: [{ id: "saved_9", name: "임시", method: DEFAULT_EDIT_METHOD }],
      lastSelectedId: "saved_9",
    },
    "saved_9",
  );
  assert.equal(store.saved.length, 0);
  assert.equal(store.lastSelectedId, CUSTOM_EDIT_PRESET_ID);
  assert.equal(parseEditPresetsStore("nope").saved.length, 0);
  assert.equal(normalizeEditPresetsStore({ saved: [{ id: "bad", name: "x" }] }).saved.length, 0);
  assert.equal(createSavedEditPreset("   ", DEFAULT_EDIT_METHOD), null);
});
