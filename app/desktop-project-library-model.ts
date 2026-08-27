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
  has_source?: boolean;
  trashed_at: string;
  purge_after: string;
};

export type TrashSummary = {
  items: TrashItem[];
  expired?: number;
  due_soon?: number;
  due_soon_days?: number;
  purge_days?: number;
};

export const TRASH_DUE_SOON_DAYS = 3;

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

export function trashExpiryState(purgeAfter: string, now = Date.now()) {
  const stamp = Date.parse(purgeAfter);
  if (!Number.isFinite(stamp)) {
    return { days: 30, expired: false, dueSoon: false };
  }
  const days = Math.max(0, Math.ceil((stamp - now) / 86_400_000));
  const expired = stamp <= now;
  return { days, expired, dueSoon: !expired && days <= TRASH_DUE_SOON_DAYS };
}

export function summarizeTrash(items: TrashItem[], now = Date.now()) {
  let expired = 0;
  let dueSoon = 0;
  for (const item of items) {
    const state = trashExpiryState(item.purge_after, now);
    if (state.expired) expired += 1;
    else if (state.dueSoon) dueSoon += 1;
  }
  return { expired, dueSoon };
}
