import assert from "node:assert/strict";
import test from "node:test";
import { groupLibraryProjects, trashDaysLeft } from "./desktop-project-library-model.ts";

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
