import assert from "node:assert/strict";
import test from "node:test";
import { groupLibraryProjects, summarizeTrash, trashDaysLeft, trashExpiryState } from "./desktop-project-library-model.ts";

test("groups projects into folders and leaves the rest unfiled", () => {
  const grouped = groupLibraryProjects(
    [
      { id: "a", title: "In folder", folder_id: "fld_1", updated_at: "2026-08-01" },
      { id: "b", title: "Loose", folder_id: null, updated_at: "2026-08-02" },
      { id: "c", title: "Missing folder", folder_id: "gone", updated_at: "2026-08-03" },
    ],
    [{ id: "fld_1", title: "릴스" }],
  );
  assert.equal(grouped.folders[0].projects[0].id, "a");
  assert.deepEqual(grouped.unfiled.map((item) => item.id), ["b", "c"]);
});

test("trash days left never go below zero", () => {
  assert.equal(trashDaysLeft("2020-01-01T00:00:00+00:00", Date.parse("2026-08-26")), 0);
  assert.ok(trashDaysLeft("2099-01-01T00:00:00+00:00", Date.parse("2026-08-26")) > 30);
  assert.equal(trashDaysLeft("not-a-date", Date.parse("2026-08-26")), 30);
});

test("marks trash items as expired or due soon without treating junk dates as expired", () => {
  const now = Date.parse("2026-08-26T00:00:00+00:00");
  assert.equal(trashExpiryState("2026-08-20T00:00:00+00:00", now).expired, true);
  assert.equal(trashExpiryState("2026-08-28T00:00:00+00:00", now).dueSoon, true);
  assert.equal(trashExpiryState("2026-10-01T00:00:00+00:00", now).dueSoon, false);
  assert.equal(trashExpiryState("not-a-date", now).expired, false);
  const summary = summarizeTrash([
    { id: "a", kind: "file", title: "old", trashed_at: "2026-07-01", purge_after: "2026-08-20T00:00:00+00:00" },
    { id: "b", kind: "file", title: "soon", trashed_at: "2026-08-24", purge_after: "2026-08-28T00:00:00+00:00" },
    { id: "c", kind: "file", title: "later", trashed_at: "2026-08-25", purge_after: "2026-10-01T00:00:00+00:00" },
  ], now);
  assert.deepEqual(summary, { expired: 1, dueSoon: 1 });
});
