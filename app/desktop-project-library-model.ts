export type LibraryProject = {
  id: string;
  title: string;
  folder_id?: string | null;
  updated_at: string;
  current_revision?: number;
  handoff_door?: string | null;
  handoff_agent?: string | null;
};

export type LibraryFolder = {
  id: string;
  title: string;
};

export type TrashItem = {
  id: string;
  kind: 'project' | 'file' | string;
  title: string;
  original_path?: string | null;
  trashed_at: string;
  purge_after: string;
};

export function groupLibraryProjects(projects: LibraryProject[], folders: LibraryFolder[]) {
  const buckets = new Map<string, LibraryProject[]>();
  for (const folder of folders) buckets.set(folder.id, []);
  const unfiled: LibraryProject[] = [];
  for (const project of projects) {
    const folderId = typeof project.folder_id === 'string' ? project.folder_id : '';
    const bucket = folderId ? buckets.get(folderId) : undefined;
    if (bucket) bucket.push(project);
    else unfiled.push(project);
  }
  return {
    folders: folders.map((folder) => ({ folder, projects: buckets.get(folder.id) ?? [] })),
    unfiled,
  };
}

export function trashDaysLeft(purgeAfter: string, now = Date.now()) {
  const stamp = Date.parse(purgeAfter);
  if (!Number.isFinite(stamp)) return 30;
  return Math.max(0, Math.ceil((stamp - now) / 86_400_000));
}
