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
export const RECENT_FOLDER_STORAGE_KEY = 'grok-crew-recent-folder-id';
export const RECENT_FOLDER_TITLES = {
  ko: '최근기록',
  en: 'Recent',
  zh: '最近记录',
  ja: '最近',
} as const;

type MemoryStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

export function recentFolderTitle(language = 'ko'): string {
  const key = language.slice(0, 2) as keyof typeof RECENT_FOLDER_TITLES;
  return RECENT_FOLDER_TITLES[key] || RECENT_FOLDER_TITLES.ko;
}

export function isRecentFolderTitle(title: string): boolean {
  const name = String(title || '').trim();
  return Object.values(RECENT_FOLDER_TITLES).includes(name as typeof RECENT_FOLDER_TITLES.ko);
}

export function readRememberedRecentId(storage?: MemoryStorage | null): string {
  try {
    return String(storage?.getItem(RECENT_FOLDER_STORAGE_KEY) || '').trim();
  } catch {
    return '';
  }
}

export function writeRememberedRecentId(id: string, storage?: MemoryStorage | null) {
  const next = String(id || '').trim();
  if (!next || !storage) return;
  try {
    storage.setItem(RECENT_FOLDER_STORAGE_KEY, next);
  } catch {
    /* ignore quota / private mode */
  }
}

export function findRecentFolder(folders: LibraryFolder[], rememberedId = ''): LibraryFolder | null {
  if (rememberedId) {
    const remembered = folders.find((folder) => folder.id === rememberedId);
    if (remembered) return remembered;
  }
  return folders.find((folder) => isRecentFolderTitle(folder.title)) || null;
}

export function unfiledProjectIds(projects: LibraryProject[], folders: LibraryFolder[]): string[] {
  const known = new Set(folders.map((folder) => folder.id));
  return projects
    .filter((project) => {
      const folderId = typeof project.folder_id === 'string' ? project.folder_id : '';
      return !folderId || !known.has(folderId);
    })
    .map((project) => project.id);
}

export function groupLibraryProjects(
  projects: LibraryProject[],
  folders: LibraryFolder[],
  recentId?: string | null,
) {
  const buckets = new Map<string, LibraryProject[]>();
  for (const folder of folders) buckets.set(folder.id, []);
  const unfiled: LibraryProject[] = [];
  for (const project of projects) {
    const folderId = typeof project.folder_id === 'string' ? project.folder_id : '';
    const bucket = folderId ? buckets.get(folderId) : undefined;
    if (bucket) bucket.push(project);
    else unfiled.push(project);
  }
  const recent = recentId ? folders.find((folder) => folder.id === recentId) : undefined;
  if (recent) {
    const bucket = buckets.get(recent.id);
    if (bucket) bucket.push(...unfiled);
  }
  const ordered = recent
    ? [recent, ...folders.filter((folder) => folder.id !== recent.id)]
    : folders;
  return {
    folders: ordered.map((folder) => ({ folder, projects: buckets.get(folder.id) ?? [] })),
    unfiled: recent ? [] : unfiled,
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
