import { connectedBot, type CrewRoster } from './desktop-bot-connect';
import type { DeskPullStatus, DeskWaitState } from './desktop-wait-state';

export const AUTO_PREFS_KEY = 'grok-crew-auto-prefs';
export const RECIPE_ORDER = ['instagram_reel', 'tiktok_tight', 'youtube_short', 'youtube_long'] as const;
export const PASTE_TARGET = 'Cursor';
export const DEFAULT_RECIPE_ID = 'instagram_reel';

export type AutoMode = 'hand_off' | 'own_file';
export type AutoSourceMode = 'own' | 'collect' | 'own_and_collect';
export type AutoPhaseId = 'connect' | 'sent' | 'working' | 'cut' | 'save';
export type AutoLamp = 'off' | 'yellow' | 'green' | 'red';
export type AutoMachine =
  | 'idle'
  | 'sending'
  | 'waiting'
  | 'arrived'
  | 'saving'
  | 'done';

export type AutoPrefs = {
  recipeId: string;
  recentTitles: string[];
  lastTitle?: string;
  lastSavePath?: string;
  lastSaveAt?: string;
};

export type AutoStartCheck =
  | { ok: true }
  | { ok: false; reason: 'title' | 'connect' | 'materials' };

export type AutoJobInput = {
  title: string;
  goal?: string;
  recipeId: string;
  language: string;
  useOwn?: boolean;
  useScrape?: boolean;
  ownedPaths?: string[];
  collectQuery?: string;
};

export function cleanOwnedPaths(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const paths: string[] = [];
  for (const item of value) {
    const path = String(item || '').trim();
    if (!path || seen.has(path)) continue;
    seen.add(path);
    paths.push(path);
    if (paths.length >= 40) break;
  }
  return paths;
}

export function ownedFileName(path: string): string {
  const parts = String(path || '').replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || path;
}

export function autoSourceMode(input: { useOwn?: boolean; useScrape?: boolean }): AutoSourceMode | '' {
  if (input.useOwn && input.useScrape) return 'own_and_collect';
  if (input.useOwn) return 'own';
  if (input.useScrape) return 'collect';
  return '';
}

export function autoJobPayload(input: AutoJobInput): Record<string, unknown> {
  const heading = String(input.title || '').trim();
  const ownedPaths = cleanOwnedPaths(input.ownedPaths);
  const useOwn = Boolean(input.useOwn && ownedPaths.length);
  const useScrape = Boolean(input.useScrape);
  const sourceMode = autoSourceMode({ useOwn, useScrape }) || 'own';
  const body: Record<string, unknown> = {
    title: heading,
    goal: String(input.goal || '').trim() || heading,
    recipe_id: input.recipeId,
    source_mode: sourceMode,
    language: input.language,
    upload: false,
  };
  if (useScrape) body.collect_query = String(input.collectQuery || '').trim();
  if (useOwn) body.owned_paths = ownedPaths;
  return body;
}

export type AutoLampInput = {
  attached: boolean;
  studioReady: boolean;
  connectWaiting?: boolean;
  wait: DeskWaitState | null;
  pull: DeskPullStatus;
  hasProject: boolean;
  outputReady: boolean;
  sending?: boolean;
  sendFailed?: boolean;
  clipboardBlocked?: boolean;
  saving?: boolean;
  saveFailed?: boolean;
  cutFailed?: boolean;
};

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function emptyAutoPrefs(): AutoPrefs {
  return { recipeId: DEFAULT_RECIPE_ID, recentTitles: [] };
}

function cleanTitles(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const titles: string[] = [];
  for (const item of value) {
    const title = String(item || '').trim();
    if (!title || seen.has(title)) continue;
    seen.add(title);
    titles.push(title);
    if (titles.length >= 3) break;
  }
  return titles;
}

export function readAutoPrefs(): AutoPrefs {
  const raw = storage()?.getItem(AUTO_PREFS_KEY);
  if (!raw) return emptyAutoPrefs();
  try {
    const parsed = JSON.parse(raw) as Partial<AutoPrefs>;
    const recipeId = String(parsed.recipeId || '').trim();
    return {
      recipeId: recipeId || DEFAULT_RECIPE_ID,
      recentTitles: cleanTitles(parsed.recentTitles),
      lastTitle: String(parsed.lastTitle || '').trim() || undefined,
      lastSavePath: String(parsed.lastSavePath || '').trim() || undefined,
      lastSaveAt: String(parsed.lastSaveAt || '').trim() || undefined,
    };
  } catch {
    return emptyAutoPrefs();
  }
}

export function writeAutoPrefs(prefs: Partial<AutoPrefs>): AutoPrefs {
  const current = readAutoPrefs();
  const next: AutoPrefs = {
    recipeId: String(prefs.recipeId ?? current.recipeId ?? '').trim() || DEFAULT_RECIPE_ID,
    recentTitles: prefs.recentTitles ? cleanTitles(prefs.recentTitles) : current.recentTitles,
    lastTitle: prefs.lastTitle !== undefined ? String(prefs.lastTitle || '').trim() || undefined : current.lastTitle,
    lastSavePath: prefs.lastSavePath !== undefined ? String(prefs.lastSavePath || '').trim() || undefined : current.lastSavePath,
    lastSaveAt: prefs.lastSaveAt !== undefined ? String(prefs.lastSaveAt || '').trim() || undefined : current.lastSaveAt,
  };
  storage()?.setItem(AUTO_PREFS_KEY, JSON.stringify(next));
  return next;
}

export function rememberRecentTitle(title: string): AutoPrefs {
  const heading = String(title || '').trim();
  const current = readAutoPrefs();
  if (!heading) return current;
  return writeAutoPrefs({
    ...current,
    lastTitle: heading,
    recentTitles: [heading, ...current.recentTitles.filter((item) => item !== heading)],
  });
}

export function rememberSave(path: string): AutoPrefs {
  return writeAutoPrefs({
    lastSavePath: String(path || '').trim() || undefined,
    lastSaveAt: new Date().toISOString(),
  });
}

export function attachedBotName(roster?: CrewRoster | null, remoteNames: string[] = []): string {
  const bot = connectedBot(roster);
  return String(bot?.display_name || bot?.bot_id || remoteNames[0] || '').trim();
}

export function suggestRecipeId(text: string, lastRecipeId?: string): string {
  const raw = String(text || '').toLowerCase();
  if (/틱톡|tiktok/.test(raw)) return 'tiktok_tight';
  if (/쇼츠|shorts|유튜브|youtube/.test(raw)) return 'youtube_short';
  if (/릴|reel|인스타|instagram/.test(raw)) return 'instagram_reel';
  const last = String(lastRecipeId || '').trim();
  return last || DEFAULT_RECIPE_ID;
}

export function canStartAuto(input: {
  title: string;
  attached: boolean;
  useOwn?: boolean;
  useScrape?: boolean;
  ownedPaths?: string[];
  collectQuery?: string;
}): AutoStartCheck {
  if (!String(input.title || '').trim()) return { ok: false, reason: 'title' };
  if (!input.attached) return { ok: false, reason: 'connect' };
  const ownedPaths = cleanOwnedPaths(input.ownedPaths);
  const useOwn = Boolean(input.useOwn);
  const useScrape = Boolean(input.useScrape);
  if (!useOwn && !useScrape) return { ok: false, reason: 'materials' };
  if (useOwn && !ownedPaths.length) return { ok: false, reason: 'materials' };
  if (useScrape && !String(input.collectQuery || '').trim()) return { ok: false, reason: 'materials' };
  return { ok: true };
}

export function autoMachineState(input: AutoLampInput): AutoMachine {
  if (input.saving) return 'saving';
  if (input.outputReady && input.hasProject) return 'done';
  if (input.hasProject || input.pull === 'arrived') return 'arrived';
  if (input.sending) return 'sending';
  if (input.wait) return 'waiting';
  return 'idle';
}

export function autoPhaseLamps(input: AutoLampInput): Record<AutoPhaseId, AutoLamp> {
  const connect: AutoLamp = !input.studioReady
    ? 'red'
    : input.attached
      ? 'green'
      : input.connectWaiting
        ? 'yellow'
        : 'off';

  let sent: AutoLamp = 'off';
  if (input.sendFailed) sent = 'red';
  else if (input.wait) sent = 'green';
  else if (input.clipboardBlocked) sent = 'yellow';
  else if (input.sending) sent = 'yellow';

  let working: AutoLamp = 'off';
  if (input.wait || input.pull === 'failed' || input.pull === 'none') {
    if (input.pull === 'failed') working = 'red';
    else if (input.pull === 'arrived') working = 'off';
    else if (input.wait) working = 'yellow';
  }

  let cut: AutoLamp = 'off';
  if (input.cutFailed) cut = 'red';
  else if (input.hasProject || input.pull === 'arrived') cut = 'green';

  let save: AutoLamp = 'off';
  if (input.saveFailed) save = 'red';
  else if (input.saving) save = 'yellow';
  else if (input.outputReady) save = 'green';

  return { connect, sent, working, cut, save };
}

export function autoHeaderDot(input: AutoLampInput): AutoLamp {
  const lamps = autoPhaseLamps(input);
  if (lamps.connect === 'red' || lamps.sent === 'red' || lamps.working === 'red' || lamps.save === 'red') return 'red';
  if (lamps.cut === 'green' && lamps.save !== 'green') return 'green';
  if (lamps.working === 'yellow' || lamps.sent === 'yellow' || lamps.connect === 'yellow') return 'yellow';
  return 'off';
}

export function waitElapsedSeconds(copiedAt: string, now = Date.now()): number {
  const start = new Date(copiedAt).getTime();
  if (Number.isNaN(start)) return 0;
  return Math.max(0, Math.floor((now - start) / 1000));
}

export function formatElapsed(seconds: number, language: string): string {
  const lang = language.slice(0, 2);
  const safe = Math.max(0, Math.floor(seconds));
  if (safe < 60) {
    if (lang === 'en') return `${safe}s`;
    if (lang === 'zh') return `${safe}秒`;
    if (lang === 'ja') return `${safe}秒`;
    return `${safe}초`;
  }
  const minutes = Math.floor(safe / 60);
  if (minutes < 60) {
    if (lang === 'en') return `${minutes} min`;
    if (lang === 'zh') return `${minutes}分钟`;
    if (lang === 'ja') return `${minutes}分`;
    return `${minutes}분`;
  }
  const hours = Math.floor(minutes / 60);
  if (lang === 'en') return `${hours} h`;
  if (lang === 'zh') return `${hours}小时`;
  if (lang === 'ja') return `${hours}時間`;
  return `${hours}시간`;
}

export function formatSince(seconds: number, language: string): string {
  const lang = language.slice(0, 2);
  const safe = Math.max(0, Math.floor(seconds));
  if (lang === 'en') {
    if (safe < 60) return `${safe}s ago`;
    if (safe < 3600) return `${Math.floor(safe / 60)}m ago`;
    return `${Math.floor(safe / 3600)}h ago`;
  }
  if (lang === 'zh') {
    if (safe < 60) return `${safe}秒前`;
    if (safe < 3600) return `${Math.floor(safe / 60)}分钟前`;
    return `${Math.floor(safe / 3600)}小时前`;
  }
  if (lang === 'ja') {
    if (safe < 60) return `${safe}秒前`;
    if (safe < 3600) return `${Math.floor(safe / 60)}分前`;
    return `${Math.floor(safe / 3600)}時間前`;
  }
  if (safe < 60) return `${safe}초 전`;
  if (safe < 3600) return `${Math.floor(safe / 60)}분 전`;
  return `${Math.floor(safe / 3600)}시간 전`;
}

export function botSeenSeconds(
  roster?: CrewRoster | null,
  connectedAt?: string,
  now = Date.now(),
): number | null {
  const bot = connectedBot(roster);
  if (typeof bot?.seconds_since_checkin === 'number' && Number.isFinite(bot.seconds_since_checkin)) {
    return Math.max(0, Math.floor(bot.seconds_since_checkin));
  }
  const stamp = String(connectedAt || '').trim();
  if (!stamp) return null;
  const at = new Date(stamp).getTime();
  if (Number.isNaN(at)) return null;
  return Math.max(0, Math.floor((now - at) / 1000));
}

export function shouldAskReplaceCut(hasProject: boolean): boolean {
  return Boolean(hasProject);
}

export function shouldPingCut(input: {
  pull: DeskPullStatus;
  hidden: boolean;
  specId?: string;
  lastPingedSpecId?: string;
}): boolean {
  if (input.pull !== 'arrived' || !input.hidden) return false;
  const specId = String(input.specId || '').trim();
  if (!specId) return false;
  return specId !== String(input.lastPingedSpecId || '').trim();
}

export function studioDownloadBase(): string {
  return typeof window !== 'undefined' && window.grokCrew?.apiBase ? window.grokCrew.apiBase : 'http://127.0.0.1:7214';
}

export function droppedFilePath(file: File): string {
  const grok = typeof window !== 'undefined' ? window.grokCrew : undefined;
  if (grok?.getPathForFile) {
    try {
      const value = grok.getPathForFile(file);
      if (value) return value;
    } catch {
      /* fall through to File.path */
    }
  }
  return (file as File & { path?: string }).path || '';
}

/*
Contract request
- consumer: app/desktop-auto-desk
- missing operation: a checked-in auto_local editor bot reads the waiting invite itself
- input validation: same PC, token, door=editor, waiting_for_bot only
- expected success: invite text or an already-read mark
- stale/locked: a spec another bot already took must not be reused
Do not draw “the bot is reading it” until this contract exists.
*/
