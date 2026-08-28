import { connectedBot, type CrewRoster } from './desktop-bot-connect';
import {
  GROK_SEAT_BOT_IDS,
  rosterMatchesSeat,
  seatIsConnected,
  type BotLinkState,
} from './desktop-bot-links';
import { BOT_ROLES, seatName, type BotRole } from './bot-skills';
import { resolveCrewMarket, type CrewMarket } from './crew-market';
import { DEFAULT_VOICE_MODEL_ID, resolveVoiceModelId, voiceMustKeep, type VoiceModelId } from './desktop-voice-models';
import {
  DEFAULT_VOICE_ACCENT,
  DEFAULT_VOICE_FEEL,
  DEFAULT_VOICE_GENDER,
  resolveVoiceAccent,
  resolveVoiceFeel,
  resolveVoiceGender,
  resolveVoicePersona,
  voicePersonaKeep,
  type VoiceAccent,
  type VoiceFeel,
  type VoiceGender,
} from './desktop-voice-personas';
import type { DeskPullStatus, DeskWaitState } from './desktop-wait-state';

export const AUTO_PREFS_KEY = 'grok-crew-auto-prefs';
export const RECIPE_ORDER = ['instagram_reel', 'tiktok_tight', 'youtube_short', 'youtube_long'] as const;
export const PASTE_TARGET = 'Grok Bot 기획자';
export const DEFAULT_RECIPE_ID = 'instagram_reel';

export type AutoMode = 'hand_off' | 'own_file';
export type AutoSourceMode = 'own' | 'collect' | 'own_and_collect';
export type AutoPhaseId = 'connect' | 'sent' | 'working' | 'cut' | 'save';
export type AutoLamp = 'off' | 'yellow' | 'green' | 'red';
export type AutoDeskStage = 'compose' | 'waiting' | 'arrived';
export type AutoOptionPane = '' | 'pictures' | 'where' | 'sound';
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
  wantCaptions?: boolean;
  wantDubbing?: boolean;
  wantTts?: boolean;
  voiceModelId?: VoiceModelId;
  voiceGender?: VoiceGender;
  voiceFeel?: VoiceFeel;
  voiceAccent?: VoiceAccent;
  voiceSaved?: boolean;
  market?: CrewMarket;
  marketTouched?: boolean;
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
  wantCaptions?: boolean;
  wantDubbing?: boolean;
  wantTts?: boolean;
  voiceModelId?: VoiceModelId;
  voiceGender?: VoiceGender;
  voiceFeel?: VoiceFeel;
  voiceAccent?: VoiceAccent;
};

export function titleFromPrompt(title: string, goal = ''): string {
  const heading = String(title || '').trim();
  if (heading) return heading;
  const first = String(goal || '').trim().split(/\r?\n/).find((line) => line.trim());
  return first ? first.trim().slice(0, 80) : '';
}

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
  const prompt = String(input.goal || '').trim();
  const heading = titleFromPrompt(input.title, prompt);
  const ownedPaths = cleanOwnedPaths(input.ownedPaths);
  const useOwn = Boolean(input.useOwn && ownedPaths.length);
  const useScrape = Boolean(input.useScrape);
  const sourceMode = autoSourceMode({ useOwn, useScrape }) || 'own';
  const body: Record<string, unknown> = {
    title: heading,
    goal: prompt || heading,
    recipe_id: input.recipeId,
    source_mode: sourceMode,
    language: input.language,
    upload: false,
    captions: Boolean(input.wantCaptions),
  };
  if (useScrape) body.collect_query = String(input.collectQuery || '').trim() || prompt;
  if (useOwn) body.owned_paths = ownedPaths;
  const persona = input.wantTts
    ? resolveVoicePersona({
      gender: input.voiceGender,
      feel: input.voiceFeel,
      accent: input.voiceAccent,
    })
    : undefined;
  const keep = voiceMustKeep({
    wantDubbing: input.wantDubbing,
    wantTts: input.wantTts,
    voiceModelId: input.voiceModelId,
    personaKeep: persona ? voicePersonaKeep(persona) : undefined,
  });
  if (keep) body.must_keep = keep;
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
  return {
    recipeId: DEFAULT_RECIPE_ID,
    recentTitles: [],
    wantCaptions: false,
    wantDubbing: false,
    wantTts: false,
    voiceModelId: DEFAULT_VOICE_MODEL_ID,
    voiceGender: DEFAULT_VOICE_GENDER,
    voiceFeel: DEFAULT_VOICE_FEEL,
    voiceAccent: DEFAULT_VOICE_ACCENT,
    voiceSaved: false,
    marketTouched: false,
  };
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
      wantCaptions: Boolean(parsed.wantCaptions),
      wantDubbing: Boolean(parsed.wantDubbing),
      wantTts: Boolean(parsed.wantTts),
      voiceModelId: resolveVoiceModelId(parsed.voiceModelId),
      voiceGender: resolveVoiceGender(parsed.voiceGender),
      voiceFeel: resolveVoiceFeel(parsed.voiceFeel),
      voiceAccent: resolveVoiceAccent(parsed.voiceAccent),
      voiceSaved: Boolean(parsed.voiceSaved),
      market: parsed.market ? resolveCrewMarket(parsed.market) : undefined,
      marketTouched: Boolean(parsed.marketTouched),
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
    wantCaptions: prefs.wantCaptions !== undefined ? Boolean(prefs.wantCaptions) : Boolean(current.wantCaptions),
    wantDubbing: prefs.wantDubbing !== undefined ? Boolean(prefs.wantDubbing) : Boolean(current.wantDubbing),
    wantTts: prefs.wantTts !== undefined ? Boolean(prefs.wantTts) : Boolean(current.wantTts),
    voiceModelId: resolveVoiceModelId(prefs.voiceModelId ?? current.voiceModelId),
    voiceGender: resolveVoiceGender(prefs.voiceGender ?? current.voiceGender),
    voiceFeel: resolveVoiceFeel(prefs.voiceFeel ?? current.voiceFeel),
    voiceAccent: resolveVoiceAccent(prefs.voiceAccent ?? current.voiceAccent),
    voiceSaved: prefs.voiceSaved !== undefined ? Boolean(prefs.voiceSaved) : Boolean(current.voiceSaved),
    market: prefs.market !== undefined
      ? resolveCrewMarket(prefs.market)
      : current.market,
    marketTouched: prefs.marketTouched !== undefined ? Boolean(prefs.marketTouched) : Boolean(current.marketTouched),
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

export type AutoSeatMark = 'current' | 'idle' | 'off';

export type AutoSeatRow = {
  key: string;
  kind: 'grok' | 'custom';
  role: BotRole;
  name: string;
  connected: boolean;
  current: boolean;
  lastAction: string;
  secondsSinceCheckin: number | null;
  mark: AutoSeatMark;
  detail: string;
};

export type BotActivityItem = {
  id?: string;
  bot_id?: string;
  action?: string;
  created_at?: string;
};

export type AutoActivityLine = {
  id: string;
  name: string;
  text: string;
  when: string;
};

const IDLE_ACTIONS = new Set(['still_here', 'entered_local_studio']);
const WORK_STARTED = new Set(['plan_started', 'collect_started', 'cut_started']);
const WORK_READY = new Set(['plan_ready', 'collect_ready', 'cut_ready']);

function autoCopy(language: string, ko: string, en: string, zh: string, ja: string): string {
  const lang = language.slice(0, 2);
  if (lang === 'en') return en;
  if (lang === 'zh') return zh;
  if (lang === 'ja') return ja;
  return ko;
}

function looksLikeSeatName(value: string): boolean {
  const raw = String(value || '').trim();
  if (!raw || raw.includes('???')) return false;
  return /기획자|스크래핑|편집자|planner|scraper|editor|策划|抓取|剪辑|企画|収集|編集/i.test(raw);
}

function rosterSeat(roster: CrewRoster | null | undefined, role: BotRole) {
  return (roster?.bots ?? []).find((bot) => rosterMatchesSeat(bot, role));
}

function shouldShowSeat(
  kind: 'grok' | 'custom',
  role: BotRole,
  roster?: CrewRoster | null,
  links?: BotLinkState | null,
): boolean {
  if (seatIsConnected(kind, role, links, roster)) return true;
  return Boolean(links?.bots.some((item) => item.kind === kind && item.role === role && (item.status === 'connected' || item.status === 'waiting')));
}

export function connectedSeatNames(
  roster?: CrewRoster | null,
  links?: BotLinkState | null,
  language = 'ko',
): string[] {
  const names: string[] = [];
  for (const role of BOT_ROLES) {
    const grok = seatIsConnected('grok', role, links, roster);
    const custom = seatIsConnected('custom', role, links, roster);
    if (!grok && !custom) continue;
    const name = seatName(grok ? 'grok' : 'custom', role, language);
    if (!names.includes(name)) names.push(name);
  }
  return names;
}

export function attachedBotName(
  roster?: CrewRoster | null,
  remoteNames: string[] = [],
  links?: BotLinkState | null,
  language = 'ko',
): string {
  const seats = connectedSeatNames(roster, links, language);
  if (seats.length) return seats.join(' · ');
  const cleaned = remoteNames
    .map((item) => String(item || '').trim())
    .filter((item) => item && !item.includes('???') && looksLikeSeatName(item));
  return cleaned.join(' · ');
}

export function heartbeatActionKind(action?: string | null): 'idle' | 'started' | 'ready' | 'unknown' {
  const raw = String(action || '').trim();
  if (!raw) return 'unknown';
  if (IDLE_ACTIONS.has(raw)) return 'idle';
  if (WORK_STARTED.has(raw)) return 'started';
  if (WORK_READY.has(raw)) return 'ready';
  return 'unknown';
}

export function heartbeatActionLabel(action: string | undefined | null, language = 'ko'): string {
  const raw = String(action || '').trim();
  if (raw === 'still_here' || raw === 'entered_local_studio') {
    return autoCopy(language, '이 자리에 있음 · 할 일은 아직 안 적음', 'here · no job written yet', '在这个位子 · 还没写下要做的事', 'この席にいる · 仕事はまだ書いていない');
  }
  if (raw === 'plan_started') return autoCopy(language, '컷 계획 쓰는 중', 'writing the cut plan', '正在写分镜计划', 'カット計画を書いている');
  if (raw === 'plan_ready') return autoCopy(language, '컷 계획 남김', 'left a cut plan', '已留下分镜计划', 'カット計画を残した');
  if (raw === 'collect_started') return autoCopy(language, '공개 자료 고르는 중', 'picking public sources', '正在选公开资料', '公開資料を選んでいる');
  if (raw === 'collect_ready') return autoCopy(language, '가져올 것 남김', 'left what to fetch', '已留下要取的', '取るものを残した');
  if (raw === 'cut_started') return autoCopy(language, '계획대로 자르는 중', 'cutting to the plan', '正在按计划剪', '計画どおり切っている');
  if (raw === 'cut_ready') return autoCopy(language, '컷을 이 창에 두는 중', 'putting the cut in this window', '正在把成片放到这个窗口', 'カットをこの窓に置いている');
  return autoCopy(language, '모름', 'unknown', '不知道', '不明');
}

export function heartbeatTitlePhrase(action: string | undefined | null, language = 'ko'): string {
  const raw = String(action || '').trim();
  if (raw === 'plan_started') return autoCopy(language, '컷 계획을 쓰는 중', 'writing the cut plan', '正在写分镜计划', 'カット計画を書いている');
  if (raw === 'plan_ready') return autoCopy(language, '컷 계획을 남김', 'left a cut plan', '已留下分镜计划', 'カット計画を残した');
  if (raw === 'collect_started') return autoCopy(language, '공개 자료를 고르는 중', 'picking public sources', '正在选公开资料', '公開資料を選んでいる');
  if (raw === 'collect_ready') return autoCopy(language, '가져올 것을 남김', 'left what to fetch', '已留下要取的', '取るものを残した');
  if (raw === 'cut_started') return autoCopy(language, '계획대로 자르는 중', 'cutting to the plan', '正在按计划剪', '計画どおり切っている');
  if (raw === 'cut_ready') return autoCopy(language, '컷을 이 창에 두는 중', 'putting the cut in this window', '正在把成片放到这个窗口', 'カットをこの窓に置いている');
  if (raw === 'still_here' || raw === 'entered_local_studio') {
    return autoCopy(language, '이 자리에 있음', 'is here', '在这个位子', 'この席にいる');
  }
  return '';
}

function pickCurrentSeat(rows: Array<Omit<AutoSeatRow, 'current' | 'mark' | 'detail'>>): string {
  const started = rows.find((row) => row.connected && heartbeatActionKind(row.lastAction) === 'started');
  if (started) return started.key;
  const ready = rows.find((row) => row.connected && heartbeatActionKind(row.lastAction) === 'ready');
  if (ready) return ready.key;
  const known = rows.find((row) => row.connected && row.lastAction);
  if (known) return known.key;
  return rows.find((row) => row.connected)?.key || '';
}

export function autoSeatRows(input: {
  roster?: CrewRoster | null;
  links?: BotLinkState | null;
  language?: string;
  lastCheckedLabel?: string;
}): AutoSeatRow[] {
  const language = input.language || 'ko';
  const lastChecked = String(input.lastCheckedLabel || '').trim();
  const unknownDetail = lastChecked
    ? autoCopy(language, `모름 · 마지막 확인 ${lastChecked}`, `unknown · last check ${lastChecked}`, `不知道 · 上次检查 ${lastChecked}`, `不明 · 最後の確認 ${lastChecked}`)
    : autoCopy(language, '모름', 'unknown', '不知道', '不明');
  const waiting = autoCopy(language, '대기 · 연결됨', 'waiting · connected', '等待 · 已连接', '待機 · 接続済み');
  const offline = autoCopy(language, '아직 연결되지않음', 'not connected yet', '还没连接', 'まだ接続されていない');
  const draft: Array<Omit<AutoSeatRow, 'current' | 'mark' | 'detail'>> = [];
  for (const kind of ['grok', 'custom'] as const) {
    for (const role of BOT_ROLES) {
      if (!shouldShowSeat(kind, role, input.roster, input.links)) continue;
      const connected = seatIsConnected(kind, role, input.links, input.roster);
      const rosterBot = kind === 'grok' ? rosterSeat(input.roster, role) : undefined;
      const lastAction = String(rosterBot?.last_action || '').trim();
      const seconds = typeof rosterBot?.seconds_since_checkin === 'number' && Number.isFinite(rosterBot.seconds_since_checkin)
        ? Math.max(0, Math.floor(rosterBot.seconds_since_checkin))
        : null;
      draft.push({
        key: `${kind}:${role}`,
        kind,
        role,
        name: seatName(kind === 'grok' ? 'grok' : 'custom', role, language),
        connected,
        lastAction,
        secondsSinceCheckin: seconds,
      });
    }
  }
  const currentKey = pickCurrentSeat(draft);
  return draft.map((row) => {
    const current = row.key === currentKey;
    if (!row.connected) {
      return { ...row, current: false, mark: 'off', detail: offline };
    }
    if (current) {
      const kind = heartbeatActionKind(row.lastAction);
      const since = row.secondsSinceCheckin === null ? '' : formatSince(row.secondsSinceCheckin, language);
      if (kind === 'unknown') {
        return { ...row, current, mark: 'current', detail: since ? `${unknownDetail}` : unknownDetail };
      }
      const label = heartbeatActionLabel(row.lastAction, language);
      return { ...row, current, mark: 'current', detail: since ? `${label} · ${since}` : label };
    }
    if (currentKey) {
      return { ...row, current: false, mark: 'idle', detail: waiting };
    }
    const kind = heartbeatActionKind(row.lastAction);
    if (kind === 'unknown') return { ...row, current: false, mark: 'idle', detail: unknownDetail };
    return { ...row, current: false, mark: 'idle', detail: heartbeatActionLabel(row.lastAction, language) };
  });
}

export function autoWaitHeadline(rows: AutoSeatRow[], language = 'ko'): {
  title: string;
  showUnknownRead: boolean;
  current?: AutoSeatRow;
} {
  const current = rows.find((row) => row.current && row.connected);
  if (!current) {
    return {
      title: autoCopy(language, '봇이 작업 중 · 창을 끄지 마세요', 'The bot is working · do not close this window', '机器人正在工作 · 不要关掉这个窗口', 'ボットが作業中 · この窓を閉じないでください'),
      showUnknownRead: true,
    };
  }
  const phrase = heartbeatTitlePhrase(current.lastAction, language);
  if (!phrase) {
    return {
      title: autoCopy(language, `${current.name} · 창을 끄지 마세요`, `${current.name} · do not close this window`, `${current.name} · 不要关掉这个窗口`, `${current.name} · この窓を閉じないでください`),
      showUnknownRead: true,
      current,
    };
  }
  const subject = /스크래핑$/.test(current.name) ? `${current.name}이` : `${current.name}가`;
  const title = autoCopy(
    language,
    `${subject} ${phrase} · 창을 끄지 마세요`,
    `${current.name} is ${phrase} · do not close this window`,
    `${current.name}在${phrase} · 不要关掉这个窗口`,
    `${current.name}が${phrase} · この窓を閉じないでください`,
  );
  return { title, showUnknownRead: false, current };
}

export function autoWorkingNote(input: {
  elapsedLabel?: string;
  lastCheckedLabel?: string;
  rows: AutoSeatRow[];
  language?: string;
  pullFailed?: boolean;
  cutHere?: boolean;
}): string {
  const language = input.language || 'ko';
  if (input.pullFailed) {
    return autoCopy(language, '실패 · 같은 말로 다시', 'Failed · send the same line again', '失败 · 再用同一句话', '失敗 · 同じ言葉でもう一度');
  }
  if (input.cutHere) {
    return autoCopy(language, '컷이 이 탭에 있음', 'The cut is in this tab', '成片在这个标签', 'カットはこのタブにあります');
  }
  const headline = autoWaitHeadline(input.rows, language);
  const elapsed = String(input.elapsedLabel || '').trim();
  const elapsedBit = elapsed
    ? autoCopy(language, `${elapsed}째`, `${elapsed}`, `${elapsed}`, `${elapsed}`)
    : autoCopy(language, '방금', 'just now', '刚刚', 'たった今');
  if (!headline.current) {
    const checked = String(input.lastCheckedLabel || '').trim() || autoCopy(language, '아직', 'soon', '稍后', 'まもなく');
    return autoCopy(
      language,
      `${elapsedBit} · 이 창은 봇이 읽었는지 모름 · 마지막 확인 ${checked}`,
      `${elapsedBit} · this window does not know if the bot read it · last check ${checked}`,
      `${elapsedBit} · 这个窗口不知道机器人读没读 · 上次检查 ${checked}`,
      `${elapsedBit} · この窓はボットが読んだか知らない · 最後の確認 ${checked}`,
    );
  }
  if (headline.showUnknownRead) {
    const checked = String(input.lastCheckedLabel || '').trim() || autoCopy(language, '아직', 'soon', '稍后', 'まもなく');
    return autoCopy(
      language,
      `${elapsedBit} · ${headline.current.name} · 이 창은 봇이 읽었는지 모름 · 마지막 확인 ${checked}`,
      `${elapsedBit} · ${headline.current.name} · this window does not know if the bot read it · last check ${checked}`,
      `${elapsedBit} · ${headline.current.name} · 这个窗口不知道机器人读没读 · 上次检查 ${checked}`,
      `${elapsedBit} · ${headline.current.name} · この窓はボットが読んだか知らない · 最後の確認 ${checked}`,
    );
  }
  return `${elapsedBit} · ${headline.current.name} · ${heartbeatActionLabel(headline.current.lastAction, language)}`;
}

export function activitySeatName(botId: string, language = 'ko'): string {
  const id = String(botId || '').trim().toLowerCase();
  for (const role of BOT_ROLES) {
    if (GROK_SEAT_BOT_IDS[role] === id) return seatName('grok', role, language);
  }
  return '';
}

export function recentActivityLines(
  activity: BotActivityItem[] | undefined,
  language = 'ko',
  limit = 3,
): AutoActivityLine[] {
  const lines: AutoActivityLine[] = [];
  for (const item of activity ?? []) {
    const name = activitySeatName(String(item.bot_id || ''), language);
    if (!name) continue;
    const created = String(item.created_at || '').trim();
    const at = created ? new Date(created).getTime() : Number.NaN;
    const when = Number.isNaN(at) ? '' : formatSince(Math.max(0, Math.floor((Date.now() - at) / 1000)), language);
    lines.push({
      id: String(item.id || `${item.bot_id}-${item.action}-${item.created_at}`),
      name,
      text: heartbeatActionLabel(item.action, language),
      when,
    });
    if (lines.length >= limit) break;
  }
  return lines;
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
  goal?: string;
  useOwn?: boolean;
  useScrape?: boolean;
  ownedPaths?: string[];
  collectQuery?: string;
}): AutoStartCheck {
  if (!titleFromPrompt(input.title, input.goal)) return { ok: false, reason: 'title' };
  if (!input.attached) return { ok: false, reason: 'connect' };
  const ownedPaths = cleanOwnedPaths(input.ownedPaths);
  const useOwn = Boolean(input.useOwn);
  const useScrape = Boolean(input.useScrape);
  const prompt = String(input.goal || '').trim();
  const scrapeList = String(input.collectQuery || '').trim() || prompt;
  if (!useOwn && !useScrape) return { ok: false, reason: 'materials' };
  if (useOwn && !ownedPaths.length) return { ok: false, reason: 'materials' };
  if (useScrape && !scrapeList) return { ok: false, reason: 'materials' };
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

export function autoDeskStage(input: {
  wait?: DeskWaitState | null;
  pull?: DeskPullStatus;
  hasProject?: boolean;
  stayOnCompose?: boolean;
}): AutoDeskStage {
  if (input.stayOnCompose) return 'compose';
  if (input.hasProject || input.pull === 'arrived') return 'arrived';
  if (input.wait) return 'waiting';
  return 'compose';
}

export function autoPhaseLamps(input: AutoLampInput): Record<AutoPhaseId, AutoLamp> {
  const connect: AutoLamp = !input.studioReady
    ? 'red'
    : input.attached
      ? 'green'
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
  const current = autoSeatRows({ roster }).find((row) => row.current && row.secondsSinceCheckin !== null);
  if (typeof current?.secondsSinceCheckin === 'number') {
    return current.secondsSinceCheckin;
  }
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
