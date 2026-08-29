import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import test from "node:test";

register("./timeline/ts-resolver.helper.mjs", import.meta.url);

const {
  findRecentFolder,
  groupLibraryProjects,
  isRecentFolderTitle,
  recentFolderTitle,
  summarizeTrash,
  trashDaysLeft,
  trashExpiryState,
  unfiledProjectIds,
  writeRememberedRecentId,
  readRememberedRecentId,
} = await import("./desktop-project-library-model.ts");
const { ensureRecentFolder, resetEnsureRecentFolderForTests } = await import("./desktop-project-library-recent.ts");

function memoryStorage(seed = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem(key) { return map.has(key) ? map.get(key) : null; },
    setItem(key, value) { map.set(key, value); },
  };
}

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

test("library chrome drops the unfiled bucket and the add-folder toolbar", () => {
  const text = readFileSync(new URL("./desktop-project-library.tsx", import.meta.url), "utf8");
  assert.equal(text.includes("폴더 없음"), false);
  assert.equal(text.includes("폴더 추가"), false);
  assert.match(text, /최근기록으로/);
  assert.match(text, /FolderGlyph/);
});

test("pins recent and parks unfiled projects inside it", () => {
  const grouped = groupLibraryProjects(
    [
      { id: "a", title: "In folder", folder_id: "fld_1", updated_at: "2026-08-01" },
      { id: "b", title: "Loose", folder_id: null, updated_at: "2026-08-02" },
    ],
    [
      { id: "fld_1", title: "릴스" },
      { id: "fld_recent", title: "최근기록" },
    ],
    "fld_recent",
  );
  assert.equal(grouped.folders[0].folder.id, "fld_recent");
  assert.deepEqual(grouped.folders[0].projects.map((item) => item.id), ["b"]);
  assert.deepEqual(grouped.unfiled, []);
  assert.equal(grouped.folders[1].projects[0].id, "a");
});

test("hides extra recent-titled folders and pours their projects into the remembered one", () => {
  const grouped = groupLibraryProjects(
    [
      { id: "a", title: "In remembered", folder_id: "fld_recent", updated_at: "2026-08-01" },
      { id: "b", title: "In extra", folder_id: "fld_extra", updated_at: "2026-08-02" },
      { id: "c", title: "In reels", folder_id: "fld_1", updated_at: "2026-08-03" },
    ],
    [
      { id: "fld_1", title: "릴스" },
      { id: "fld_extra", title: "Recent" },
      { id: "fld_recent", title: "최근기록" },
    ],
    "fld_recent",
  );
  assert.deepEqual(grouped.folders.map((item) => item.folder.id), ["fld_recent", "fld_1"]);
  assert.deepEqual(grouped.folders[0].projects.map((item) => item.id), ["a", "b"]);
});

test("keeps recent-owned projects when parking unfiled ones", () => {
  const grouped = groupLibraryProjects(
    [
      { id: "r", title: "Already recent", folder_id: "fld_recent", updated_at: "2026-08-01" },
      { id: "b", title: "Loose", folder_id: null, updated_at: "2026-08-02" },
    ],
    [{ id: "fld_recent", title: "최근기록" }],
    "fld_recent",
  );
  assert.deepEqual(grouped.folders[0].projects.map((item) => item.id), ["r", "b"]);
  assert.deepEqual(grouped.unfiled, []);
});

test("recognizes the recent folder by remembered id or title", () => {
  assert.equal(recentFolderTitle("ko"), "최근기록");
  assert.equal(isRecentFolderTitle("Recent"), true);
  assert.equal(isRecentFolderTitle("릴스"), false);
  const folders = [
    { id: "fld_1", title: "릴스" },
    { id: "fld_r", title: "최근기록" },
  ];
  assert.equal(findRecentFolder(folders, "fld_r")?.id, "fld_r");
  assert.equal(findRecentFolder(folders)?.id, "fld_r");
  const store = new Map();
  const storage = { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) };
  writeRememberedRecentId("fld_r", storage);
  assert.equal(readRememberedRecentId(storage), "fld_r");
});

test("lists only projects that are not in a live folder", () => {
  assert.deepEqual(
    unfiledProjectIds(
      [
        { id: "a", title: "In", folder_id: "fld_1", updated_at: "2026-08-01" },
        { id: "b", title: "Loose", folder_id: null, updated_at: "2026-08-02" },
        { id: "c", title: "Gone", folder_id: "missing", updated_at: "2026-08-03" },
      ],
      [{ id: "fld_1", title: "릴스" }],
    ),
    ["b", "c"],
  );
});

test("creates the recent folder once and can migrate loose projects", async () => {
  resetEnsureRecentFolderForTests();
  const calls = [];
  const storage = memoryStorage();
  const created = await ensureRecentFolder({
    folders: [],
    projects: [{ id: "p1", title: "Loose", folder_id: null, updated_at: "2026-08-02" }],
    language: "ko",
    storage,
    migrate: true,
    request: async (path, init) => {
      calls.push({ path, body: init?.body });
      if (path === "/api/v2/project-folders") return { folder: { id: "fld_new", title: "최근기록" } };
      return { project: { id: "p1", folder_id: "fld_new" } };
    },
  });
  assert.equal(created.folder.id, "fld_new");
  assert.equal(created.created, true);
  assert.deepEqual(created.migrated, ["p1"]);
  assert.equal(calls[0].path, "/api/v2/project-folders");
  assert.match(String(calls[0].body), /최근기록/);
  assert.equal(calls[1].path, "/api/v2/projects/p1/move");

  const again = await ensureRecentFolder({
    folders: [{ id: "fld_new", title: "최근기록" }],
    projects: [{ id: "p1", title: "Loose", folder_id: "fld_new", updated_at: "2026-08-02" }],
    storage,
    migrate: true,
    request: async () => {
      throw new Error("should not create again");
    },
  });
  assert.equal(again.created, false);
  assert.deepEqual(again.migrated, []);
});

test("reuses the session folder when the workspace snapshot is still empty", async () => {
  resetEnsureRecentFolderForTests();
  const storage = memoryStorage();
  const created = await ensureRecentFolder({
    folders: [],
    storage,
    request: async (path) => {
      if (path === "/api/v2/project-folders") return { folder: { id: "fld_remembered", title: "최근기록" } };
      throw new Error(`unexpected ${path}`);
    },
  });
  const calls = [];
  const result = await ensureRecentFolder({
    folders: [],
    storage,
    request: async (path) => {
      calls.push(path);
      throw new Error(`unexpected ${path}`);
    },
  });
  assert.equal(created.folder.id, "fld_remembered");
  assert.equal(result.folder.id, "fld_remembered");
  assert.equal(result.created, false);
  assert.deepEqual(calls, []);
});

test("moves projects out of extra recent folders and deletes those extras", async () => {
  resetEnsureRecentFolderForTests();
  const calls = [];
  const result = await ensureRecentFolder({
    folders: [
      { id: "fld_keep", title: "최근기록" },
      { id: "fld_extra", title: "Recent" },
    ],
    projects: [
      { id: "p1", title: "Keep", folder_id: "fld_keep", updated_at: "2026-08-01" },
      { id: "p2", title: "Extra", folder_id: "fld_extra", updated_at: "2026-08-02" },
    ],
    storage: memoryStorage({ "grok-crew-recent-folder-id": "fld_keep" }),
    migrate: true,
    request: async (path) => {
      calls.push(path);
      return {};
    },
  });
  assert.equal(result.folder.id, "fld_keep");
  assert.deepEqual(result.migrated, ["p2"]);
  assert.equal(calls.includes("/api/v2/projects/p2/move"), true);
  assert.equal(calls.includes("/api/v2/project-folders/fld_extra/delete"), true);
  assert.equal(calls.includes("/api/v2/projects/p1/move"), false);
});

test("creates the recent folder only once when two callers race", async () => {
  resetEnsureRecentFolderForTests();
  let creates = 0;
  const storage = memoryStorage();
  const request = async (path) => {
    if (path === "/api/v2/project-folders") {
      creates += 1;
      await new Promise((resolve) => setTimeout(resolve, 20));
      return { folder: { id: "fld_once", title: "최근기록" } };
    }
    throw new Error(`unexpected ${path}`);
  };
  const [first, second] = await Promise.all([
    ensureRecentFolder({ folders: [], request, storage }),
    ensureRecentFolder({ folders: [], request, storage }),
  ]);
  assert.equal(creates, 1);
  assert.equal(first.folder.id, "fld_once");
  assert.equal(second.folder.id, "fld_once");
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
