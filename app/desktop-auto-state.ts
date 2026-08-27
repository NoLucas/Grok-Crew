import { connectedBot, type CrewRoster } from './desktop-bot-connect';
import type { DeskPullStatus, DeskWaitState } from './desktop-wait-state';

export const AUTO_PREFS_KEY = 'grok-crew-auto-prefs';
export const RECIPE_ORDER = ['instagram_reel', 'tiktok_tight', 'youtube_short', 'youtube_long'] as const;
export const PASTE_TARGET = 'Cursor';
export const DEFAULT_RECIPE_ID = 'instagram_reel';

export type AutoMode = 'hand_off' | 'own_file';
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
};

export type AutoStartCheck =
  | { ok: true }
  | { ok: false; reason: 'title' | 'connect' };

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
  return { recipeId: DEFAULT_RECIPE_ID };
}

export function readAutoPrefs(): AutoPrefs {
  const raw = storage()?.getItem(AUTO_PREFS_KEY);
  if (!raw) return emptyAutoPrefs();
  try {
    const parsed = JSON.parse(raw) as Partial<AutoPrefs>;
    const recipeId = String(parsed.recipeId || '').trim();
    return { recipeId: recipeId || DEFAULT_RECIPE_ID };
  } catch {
    return emptyAutoPrefs();
  }
}

export function writeAutoPrefs(prefs: AutoPrefs): AutoPrefs {
  const next = { recipeId: String(prefs.recipeId || '').trim() || DEFAULT_RECIPE_ID };
  storage()?.setItem(AUTO_PREFS_KEY, JSON.stringify(next));
  return next;
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

export function canStartAuto(input: { title: string; attached: boolean }): AutoStartCheck {
  if (!String(input.title || '').trim()) return { ok: false, reason: 'title' };
  if (!input.attached) return { ok: false, reason: 'connect' };
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
