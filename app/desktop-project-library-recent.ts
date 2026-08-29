import {
  findRecentFolder,
  recentFolderTitle,
  readRememberedRecentId,
  unfiledProjectIds,
  writeRememberedRecentId,
  type LibraryFolder,
  type LibraryProject,
} from './desktop-project-library-model';

type StudioRequest = (path: string, init?: RequestInit) => Promise<unknown>;

type MemoryStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

export type EnsureRecentResult = {
  folder: LibraryFolder;
  created: boolean;
  migrated: string[];
};

let resolveInflight: Promise<{ folder: LibraryFolder; created: boolean }> | null = null;
let sessionFolder: LibraryFolder | null = null;

export function resetEnsureRecentFolderForTests() {
  resolveInflight = null;
  sessionFolder = null;
}

export async function ensureRecentFolder({
  folders,
  projects = [],
  request,
  language = 'ko',
  storage,
  migrate = false,
}: {
  folders: LibraryFolder[];
  projects?: LibraryProject[];
  request: StudioRequest;
  language?: string;
  storage?: MemoryStorage | null;
  migrate?: boolean;
}): Promise<EnsureRecentResult> {
  const resolved = await resolveRecentFolder({ folders, request, language, storage });
  const migrated: string[] = [];
  if (migrate) {
    const known = resolved.created ? folders.concat(resolved.folder) : folders;
    for (const id of unfiledProjectIds(projects, known)) {
      await request(`/api/v2/projects/${id}/move`, {
        method: 'POST',
        body: JSON.stringify({ folder_id: resolved.folder.id }),
      });
      migrated.push(id);
    }
  }
  return { ...resolved, migrated };
}

function resolveRecentFolder({
  folders,
  request,
  language = 'ko',
  storage,
}: {
  folders: LibraryFolder[];
  request: StudioRequest;
  language?: string;
  storage?: MemoryStorage | null;
}): Promise<{ folder: LibraryFolder; created: boolean }> {
  if (resolveInflight) return resolveInflight;
  resolveInflight = resolveRecentFolderOnce({ folders, request, language, storage }).finally(() => {
    resolveInflight = null;
  });
  return resolveInflight;
}

async function resolveRecentFolderOnce({
  folders,
  request,
  language = 'ko',
  storage,
}: {
  folders: LibraryFolder[];
  request: StudioRequest;
  language?: string;
  storage?: MemoryStorage | null;
}): Promise<{ folder: LibraryFolder; created: boolean }> {
  const remembered = readRememberedRecentId(storage);
  let folder = findRecentFolder(folders, remembered);
  if (!folder && sessionFolder && (!remembered || sessionFolder.id === remembered)) {
    folder = sessionFolder;
  }
  let created = false;
  if (!folder) {
    const result = await request('/api/v2/project-folders', {
      method: 'POST',
      body: JSON.stringify({ title: recentFolderTitle(language) }),
    }) as { folder?: LibraryFolder };
    if (!result?.folder?.id) throw new Error('recent folder missing');
    folder = result.folder;
    created = true;
  }
  sessionFolder = folder;
  writeRememberedRecentId(folder.id, storage);
  return { folder, created };
}
