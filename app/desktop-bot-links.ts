import { BOT_ROLES, isBotRole, roleLabel, seatName, skillText, type BotRole } from './bot-skills';
import { marketLabel, resolveCrewMarket } from './crew-market';
import { type CrewBot, type CrewRoster } from './desktop-bot-connect';

export const GROK_SEAT_BOT_IDS = {
  planner: 'grok-planner',
  scraper: 'grok-scraper',
  editor: 'grok-editor',
} as const;

export function seatPurpose(role: BotRole): string {
  if (role === 'planner') return 'plan_edit';
  if (role === 'scraper') return 'collect';
  return 'edit_video';
}

export function grokSeatBotId(role: BotRole): string {
  return GROK_SEAT_BOT_IDS[role];
}

export const DEFAULT_STUDIO_PORT = 7214;

/** Windows `keep` leaves still_here and reads the invite on this interval. Chat must not schedule it. */
export const SEAT_KEEP_SECONDS = 60;
/** Sidecar marks a seat idle after this many seconds without a check-in. Lamps stay connected/not-connected. */
export const SEAT_ACTIVE_SECONDS = 300;

export function studioCheckInPort(port?: number): number {
  const n = Number(port);
  if (!Number.isInteger(n) || n < 1 || n > 65535) return DEFAULT_STUDIO_PORT;
  return n;
}

export function studioPortFromApiBase(apiBase?: string): number {
  try {
    const url = new URL(String(apiBase || `http://127.0.0.1:${DEFAULT_STUDIO_PORT}`));
    if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost' && url.hostname !== '[::1]') {
      return DEFAULT_STUDIO_PORT;
    }
    if (!url.port) {
      if (url.protocol === 'https:') return 443;
      if (url.protocol === 'http:') return 80;
      return DEFAULT_STUDIO_PORT;
    }
    return studioCheckInPort(Number(url.port));
  } catch {
    return DEFAULT_STUDIO_PORT;
  }
}

export function studioCheckInOrigin(port?: number): string {
  return `http://127.0.0.1:${studioCheckInPort(port)}`;
}

export const BOT_LINKS_KEY = 'grok-crew-bot-links';

export type BotKind = 'grok' | 'cursor' | 'claude' | 'custom' | 'same_pc';
export type BotPlace = 'this_pc' | 'other_pc';
export type { BotRole };

export type LinkedBot = {
  id: string;
  name: string;
  kind: BotKind;
  role?: BotRole;
  place: BotPlace;
  status: 'waiting' | 'connected';
  pairCode: string;
  connectedAt?: string;
  confirmedAt?: string;
};

export type ReleasedSeat = {
  kind: 'grok' | 'custom';
  role: BotRole;
};

export type BotLinkState = {
  pairCode: string;
  bots: LinkedBot[];
  released?: ReleasedSeat[];
};

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const PAIR_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const BOT_KINDS = new Set<BotKind>(['grok', 'cursor', 'claude', 'custom', 'same_pc']);
const BOT_PLACES = new Set<BotPlace>(['this_pc', 'other_pc']);
const BOT_STATUSES = new Set<LinkedBot['status']>(['waiting', 'connected']);

export function makePairCode(): string {
  const bytes = new Uint8Array(6);
  const cryptoObj = globalThis.crypto;
  if (!cryptoObj?.getRandomValues) {
    throw new Error('secure random unavailable');
  }
  cryptoObj.getRandomValues(bytes);
  let code = '';
  for (const byte of bytes) {
    code += PAIR_ALPHABET[byte % PAIR_ALPHABET.length];
  }
  return code;
}

export function emptyBotLinks(): BotLinkState {
  return { pairCode: '', bots: [], released: [] };
}

function normalizeReleased(value: unknown): ReleasedSeat[] {
  if (!Array.isArray(value)) return [];
  const out: ReleasedSeat[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const row = item as ReleasedSeat;
    const kind = row.kind === 'custom' ? 'custom' : row.kind === 'grok' ? 'grok' : '';
    if (!kind || !isBotRole(row.role)) continue;
    const key = `${kind}:${row.role}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ kind, role: row.role });
  }
  return out;
}

export function seatIsReleased(
  links: BotLinkState | null | undefined,
  kind: 'grok' | 'custom',
  role: BotRole,
): boolean {
  return Boolean((links?.released ?? []).some((item) => item.kind === kind && item.role === role));
}

export function clearReleasedSeat(
  state: BotLinkState,
  kind: 'grok' | 'custom',
  role: BotRole,
): BotLinkState {
  return {
    ...state,
    released: (state.released ?? []).filter((item) => !(item.kind === kind && item.role === role)),
  };
}

export function clearAllReleased(state: BotLinkState): BotLinkState {
  return { ...state, released: [] };
}

export function releaseLinkedSeat(
  state: BotLinkState,
  kind: 'grok' | 'custom',
  role: BotRole,
): BotLinkState {
  const released = normalizeReleased([...(state.released ?? []), { kind, role }]);
  return {
    ...state,
    bots: state.bots.filter((item) => !(item.kind === kind && item.role === role)),
    released,
  };
}

export function releaseHeldSeats(
  state: BotLinkState,
  roster?: CrewRoster | null,
): BotLinkState {
  let next = state;
  for (const kind of ['grok', 'custom'] as const) {
    for (const role of BOT_ROLES) {
      if (!seatIsConnected(kind, role, state, roster)) continue;
      next = releaseLinkedSeat(next, kind, role);
    }
  }
  return next;
}

export const DISCONNECT_ACTION = 'disconnected';

export function disconnectHeartbeatBody(
  role: BotRole,
  roster?: CrewRoster | null,
  language = 'ko',
): { bot_id: string; display_name: string; action: typeof DISCONNECT_ACTION } {
  const bot = knownRosterSeat(roster, role);
  return {
    bot_id: grokSeatBotId(role),
    display_name: String(bot?.display_name || seatName('grok', role, language)),
    action: DISCONNECT_ACTION,
  };
}

export function grokSeatsToDisconnect(
  links?: BotLinkState | null,
  roster?: CrewRoster | null,
): BotRole[] {
  return BOT_ROLES.filter((role) => seatIsConnected('grok', role, links, roster));
}

function normalizeBots(value: unknown): LinkedBot[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is LinkedBot => {
    if (!item || typeof item !== 'object') return false;
    const bot = item as LinkedBot;
    if (!bot.id || !bot.pairCode || !bot.name) return false;
    if (!BOT_KINDS.has(bot.kind) || !BOT_PLACES.has(bot.place) || !BOT_STATUSES.has(bot.status)) return false;
    if (bot.role && !isBotRole(bot.role)) return false;
    if (bot.confirmedAt && typeof bot.confirmedAt !== 'string') return false;
    return true;
  });
}

export function readBotLinks(): BotLinkState {
  const raw = storage()?.getItem(BOT_LINKS_KEY);
  if (!raw) return emptyBotLinks();
  try {
    const parsed = JSON.parse(raw) as Partial<BotLinkState>;
    const pairCode = String(parsed.pairCode || '').trim().toUpperCase();
    const bots = normalizeBots(parsed.bots);
    const released = normalizeReleased(parsed.released);
    const next = honestRemoteLinks({ pairCode, bots, released });
    if (bots.some((bot) => bot.place === 'other_pc' && bot.status === 'connected')) {
      writeBotLinks(next);
    }
    return next;
  } catch {
    return emptyBotLinks();
  }
}

export function writeBotLinks(state: BotLinkState): void {
  storage()?.setItem(BOT_LINKS_KEY, JSON.stringify(state));
}

export function forgetBotLinksOnQuit(state?: BotLinkState | null): BotLinkState {
  const current = state ?? readBotLinks();
  const next = { pairCode: current.pairCode, bots: [], released: [] as ReleasedSeat[] };
  try {
    storage()?.removeItem(BOT_LINKS_KEY);
  } catch {
    writeBotLinks(next);
    return next;
  }
  return emptyBotLinks();
}

export function ensureBotLinks(state?: BotLinkState | null): BotLinkState {
  const current = honestRemoteLinks(state ?? readBotLinks());
  if (current.pairCode) return current;
  const stored = readBotLinks();
  if (stored.pairCode) return stored;
  const next = {
    pairCode: makePairCode(),
    bots: stored.bots.length ? stored.bots : current.bots,
    released: stored.released ?? current.released ?? [],
  };
  writeBotLinks(next);
  return next;
}

export function upsertLinkedBot(state: BotLinkState, bot: LinkedBot): BotLinkState {
  const rest = state.bots.filter((item) => item.id !== bot.id);
  return { ...state, bots: [bot, ...rest] };
}

export function honestRemoteLinks(state: BotLinkState): BotLinkState {
  return {
    ...state,
    released: normalizeReleased(state.released),
    bots: state.bots.map((bot) => (
      bot.place === 'other_pc' && bot.status === 'connected' && !bot.confirmedAt
        ? { ...bot, status: 'waiting', connectedAt: undefined }
        : bot
    )),
  };
}

export function markRemoteCopied(
  state: BotLinkState,
  seat: { kind: BotKind; role: BotRole; language: string },
): BotLinkState {
  if (!state.pairCode) return state;
  const family = seat.kind === 'grok' ? 'grok' : 'custom';
  const id = seatId(family, seat.role, state.pairCode);
  const existing = state.bots.find((item) => item.id === id);
  if (existing?.status === 'connected' && existing.confirmedAt) return state;
  // Copying is not a connection. Do not un-release a seat; leftover idle check-ins must stay dark.
  return upsertLinkedBot(state, {
    id,
    name: seatName(family, seat.role, seat.language),
    kind: family,
    role: seat.role,
    place: 'other_pc',
    status: 'waiting',
    pairCode: state.pairCode,
  });
}

export function removeLinkedBot(state: BotLinkState, id: string): BotLinkState {
  return { ...state, bots: state.bots.filter((item) => item.id !== id) };
}

export function suggestedConnectReply(kind: BotKind, pairCode: string, role: BotRole = 'editor'): string {
  return `GROK_CREW_OK ${pairCode} ${seatName(kind === 'grok' ? 'grok' : 'custom', role, 'ko')}`;
}

export function parseConnectReply(text: string, pairCode: string): { name: string } | null {
  return extractConnectReplies(text, pairCode)[0] ?? null;
}

export function extractConnectReplies(text: string, pairCode: string): { name: string }[] {
  const expected = String(pairCode || '').trim();
  if (!expected) return [];
  const raw = String(text || '').replace(/[“”"'`]/g, ' ');
  if (!raw.trim()) return [];
  const lines = raw.match(/GROK_CREW_OK\s+\S+\s+.+/gi) ?? [];
  const found: { name: string }[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const match = line.trim().match(/GROK_CREW_OK\s+(\S+)\s+(.+)$/i);
    if (!match) continue;
    if (match[1].toUpperCase() !== expected.toUpperCase()) continue;
    const name = match[2].trim().slice(0, 80);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    found.push({ name });
  }
  return found;
}

export function replyMatchesSeat(name: string, kind: BotKind, role: BotRole): boolean {
  const family = kind === 'grok' ? 'grok' : 'custom';
  const needle = String(name || '').trim().toLowerCase();
  if (!needle) return false;
  if (family === 'grok' && !needle.includes('grok')) return false;
  if (family === 'custom' && !needle.includes('agent')) return false;
  return (['ko', 'en', 'zh', 'ja'] as const).some((lang) => (
    needle.includes(roleLabel(role, lang).toLowerCase())
  ));
}

export function confirmRemoteReplies(
  state: BotLinkState,
  reply: string,
  language = 'ko',
): { next: BotLinkState; confirmed: Array<{ kind: 'grok' | 'custom'; role: BotRole }> } {
  if (!state.pairCode) return { next: state, confirmed: [] };
  const lang = language.slice(0, 2);
  const now = new Date().toISOString();
  let next = state;
  const confirmed: Array<{ kind: 'grok' | 'custom'; role: BotRole }> = [];
  for (const parsed of extractConnectReplies(reply, state.pairCode)) {
    for (const kind of ['grok', 'custom'] as const) {
      for (const role of ['planner', 'scraper', 'editor'] as const) {
        if (!replyMatchesSeat(parsed.name, kind, role)) continue;
        if (confirmed.some((item) => item.kind === kind && item.role === role)) continue;
        next = clearReleasedSeat(upsertLinkedBot(next, {
          id: seatId(kind, role, state.pairCode),
          name: seatName(kind, role, lang === 'zh' || lang === 'ja' || lang === 'en' ? lang : 'ko'),
          kind,
          role,
          place: 'other_pc',
          status: 'connected',
          pairCode: state.pairCode,
          connectedAt: now,
          confirmedAt: now,
        }), kind, role);
        confirmed.push({ kind, role });
      }
    }
  }
  return { next, confirmed };
}

export function rosterMatchesSeat(bot: Pick<CrewBot, 'bot_id' | 'display_name'>, role: BotRole): boolean {
  const id = String(bot.bot_id || '').trim().toLowerCase();
  if (id === GROK_SEAT_BOT_IDS[role]) return true;
  return replyMatchesSeat(String(bot.display_name || ''), 'grok', role);
}

export function knownRosterSeat(roster?: CrewRoster | null, role?: BotRole): CrewBot | null {
  if (!role) return null;
  return (roster?.bots ?? []).find((bot) => rosterMatchesSeat(bot, role)) ?? null;
}

export function activeRosterSeat(roster?: CrewRoster | null, role?: BotRole): CrewBot | null {
  const bot = knownRosterSeat(roster, role);
  if (!bot || bot.presence !== 'active') return null;
  if (String(bot.last_action || '').trim() === 'disconnected') return null;
  return bot;
}

/** Held until the operator releases it, or the seat writes disconnected. Idle ticks do not drop the lamp. */
export function heldRosterSeat(roster?: CrewRoster | null, role?: BotRole): CrewBot | null {
  const bot = knownRosterSeat(roster, role);
  if (!bot) return null;
  if (String(bot.last_action || '').trim() === 'disconnected') return null;
  return bot;
}

export function seatIsConnected(
  kind: 'grok' | 'custom',
  role: BotRole,
  links?: BotLinkState | null,
  roster?: CrewRoster | null,
): boolean {
  if (seatIsReleased(links, kind, role)) {
    return kind === 'grok' && Boolean(activeRosterSeat(roster, role));
  }
  if (kind === 'grok') {
    const rosterBot = knownRosterSeat(roster, role);
    if (rosterBot) return Boolean(heldRosterSeat(roster, role));
  }
  return linkedBySeat(links?.bots, kind, role)?.status === 'connected';
}

export function familyIsConnected(
  kind: 'grok' | 'custom',
  links?: BotLinkState | null,
  roster?: CrewRoster | null,
): boolean {
  return BOT_ROLES.some((role) => seatIsConnected(kind, role, links, roster));
}

export function hasConnectedBot(roster?: CrewRoster | null, links?: BotLinkState | null): boolean {
  return BOT_ROLES.some((role) => (
    seatIsConnected('grok', role, links, roster) || seatIsConnected('custom', role, links, roster)
  ));
}

/** One follow bar for Grok or Agent. A leftover mystery roster bot does not light a lamp. */
export function seatLampRows(
  roster?: CrewRoster | null,
  links?: BotLinkState | null,
): Array<{ role: BotRole; connected: boolean; family: 'grok' | 'custom' | 'none' }> {
  return BOT_ROLES.map((role) => {
    const grok = seatIsConnected('grok', role, links, roster);
    const custom = seatIsConnected('custom', role, links, roster);
    return {
      role,
      connected: grok || custom,
      family: grok ? 'grok' : custom ? 'custom' : 'none',
    };
  });
}

export function grokSeatLampRows(
  roster?: CrewRoster | null,
  links?: BotLinkState | null,
): Array<{ role: BotRole; connected: boolean }> {
  return seatLampRows(roster, links).map(({ role, connected }) => ({ role, connected }));
}

export type LinkChangeCause = 'copy' | 'release' | 'attach' | 'other';

/** Copying connect text is not a connection. Stay on Connect while that tab is open. */
export function shouldLandAutoAfterLinkChange(input: {
  previousConnected: boolean;
  nextConnected: boolean;
  cause: LinkChangeCause;
  connectOpen: boolean;
}): boolean {
  if (input.connectOpen) return false;
  if (input.cause === 'copy' || input.cause === 'release') return false;
  return !input.previousConnected && input.nextConnected;
}

/** First seat check-in must not kick the operator off Connect before the other seats are copied. */
export function shouldKeepConnectOpenAfterReady(input: {
  wasForcedConnect: boolean;
  nextForcedConnect: boolean;
  peekAuto: boolean;
}): boolean {
  return input.wasForcedConnect && !input.nextForcedConnect && !input.peekAuto;
}

const SEAT_ARRIVAL_RANK: Record<BotRole, number> = {
  planner: 0,
  scraper: 1,
  editor: 2,
};

export type NumberedSeat = {
  kind: 'grok' | 'custom';
  role: BotRole;
  connectedAt: number;
};

function seatArrivalTime(
  kind: 'grok' | 'custom',
  role: BotRole,
  links?: BotLinkState | null,
  roster?: CrewRoster | null,
): number {
  const linked = linkedBySeat(links?.bots, kind, role);
  const linkedAt = Date.parse(String(linked?.connectedAt || linked?.confirmedAt || ''));
  if (Number.isFinite(linkedAt) && linkedAt > 0) return linkedAt;
  if (kind !== 'grok') return 0;
  const bot = heldRosterSeat(roster, role);
  const age = bot && typeof bot.seconds_since_checkin === 'number' && Number.isFinite(bot.seconds_since_checkin)
    ? Date.now() - Math.max(0, bot.seconds_since_checkin) * 1000
    : NaN;
  return Number.isFinite(age) ? age : 0;
}

/** Connected seats in arrival order. Mystery display names are ignored. */
export function connectedNumberedSeats(
  links?: BotLinkState | null,
  roster?: CrewRoster | null,
): NumberedSeat[] {
  const seats: NumberedSeat[] = [];
  for (const kind of ['grok', 'custom'] as const) {
    for (const role of BOT_ROLES) {
      if (!seatIsConnected(kind, role, links, roster)) continue;
      seats.push({
        kind,
        role,
        connectedAt: seatArrivalTime(kind, role, links, roster),
      });
    }
  }
  seats.sort((left, right) => {
    if (left.connectedAt !== right.connectedAt) {
      if (!left.connectedAt) return 1;
      if (!right.connectedAt) return -1;
      return left.connectedAt - right.connectedAt;
    }
    if (left.kind !== right.kind) return left.kind === 'grok' ? -1 : 1;
    return SEAT_ARRIVAL_RANK[left.role] - SEAT_ARRIVAL_RANK[right.role];
  });
  return seats;
}

export function numberedSeatLabel(
  kind: 'grok' | 'custom',
  role: BotRole,
  index: number,
  language = 'ko',
): string {
  const family = kind === 'grok' ? 'Grok Bot' : 'Agent';
  return `${family} ${index + 1} -${roleLabel(role, language)}`;
}

export function connectedRemoteNames(
  links?: BotLinkState | null,
  roster?: CrewRoster | null,
  language = 'ko',
): string[] {
  return connectedNumberedSeats(links, roster).map((seat, index) => (
    numberedSeatLabel(seat.kind, seat.role, index, language)
  ));
}

export type SeatKey = `${'grok' | 'custom'}:${BotRole}`;
export type SeatConnectSnapshot = Record<SeatKey, boolean>;

export function seatKey(kind: 'grok' | 'custom', role: BotRole): SeatKey {
  return `${kind}:${role}`;
}

export function seatConnectSnapshot(
  links?: BotLinkState | null,
  roster?: CrewRoster | null,
): SeatConnectSnapshot {
  const next = {} as SeatConnectSnapshot;
  for (const kind of ['grok', 'custom'] as const) {
    for (const role of ['planner', 'scraper', 'editor'] as const) {
      next[seatKey(kind, role)] = seatIsConnected(kind, role, links, roster);
    }
  }
  return next;
}

export function lostConnectedSeats(
  previous: SeatConnectSnapshot | null | undefined,
  next: SeatConnectSnapshot,
): Array<{ key: SeatKey; kind: 'grok' | 'custom'; role: BotRole }> {
  if (!previous) return [];
  const lost: Array<{ key: SeatKey; kind: 'grok' | 'custom'; role: BotRole }> = [];
  for (const kind of ['grok', 'custom'] as const) {
    for (const role of ['planner', 'scraper', 'editor'] as const) {
      const key = seatKey(kind, role);
      if (previous[key] && !next[key]) lost.push({ key, kind, role });
    }
  }
  return lost;
}

export function shouldPingLostSeat(input: {
  hidden: boolean;
  key: string;
  pinged?: boolean;
}): boolean {
  if (!input.hidden || input.pinged) return false;
  return Boolean(String(input.key || '').trim());
}

export function heartbeatWorkPair(role: BotRole): { start: string; ready: string } {
  if (role === 'planner') return { start: 'plan_started', ready: 'plan_ready' };
  if (role === 'scraper') return { start: 'collect_started', ready: 'collect_ready' };
  return { start: 'cut_started', ready: 'cut_ready' };
}

export function linkedByKind(bots: LinkedBot[] | undefined, kind: BotKind): LinkedBot | undefined {
  const list = bots ?? [];
  return list.find((item) => item.kind === kind && item.status === 'connected')
    ?? list.find((item) => item.kind === kind);
}

export function linkedBySeat(bots: LinkedBot[] | undefined, kind: BotKind, role: BotRole): LinkedBot | undefined {
  const list = bots ?? [];
  const exact = list.find((item) => item.kind === kind && item.role === role && item.status === 'connected')
    ?? list.find((item) => item.kind === kind && item.role === role);
  if (exact) return exact;
  if (role !== 'editor') return undefined;
  return list.find((item) => item.kind === kind && !item.role && item.status === 'connected')
    ?? list.find((item) => item.kind === kind && !item.role);
}

export function seatId(kind: BotKind, role: BotRole, pairCode: string): string {
  return `${kind}-${role}-${pairCode}`;
}

function grokKeepLines(who: string, role: BotRole, origin: string): { py: string; ps: string; entry: string; beat: string; pull: string } {
  const id = grokSeatBotId(role);
  const purpose = seatPurpose(role);
  const entry = `Invoke-RestMethod -Uri ${origin}/api/bot-entry -Method POST -ContentType 'application/json' -Body '{"bot_id":"${id}","display_name":"${who}","purpose":"${purpose}"}'`;
  const beat = `Invoke-RestMethod -Uri ${origin}/api/bots/heartbeat -Method POST -ContentType 'application/json' -Body '{"bot_id":"${id}","display_name":"${who}","action":"still_here"}'`;
  const pull = `Invoke-RestMethod -Uri ${origin}/api/bots/next-invite -Method POST -ContentType 'application/json' -Body '{"bot_id":"${id}"}'`;
  return {
    py: `python grok-crew.py keep --server ${origin} --bot-id ${id} --display-name "${who}" --purpose ${purpose}`,
    ps: `${entry}; while ($true) { $beat = ${beat}; if ($beat.bot.last_action -eq 'disconnected') { break }; try { ${pull} } catch {}; Start-Sleep -Seconds ${SEAT_KEEP_SECONDS} }`,
    entry,
    beat,
    pull,
  };
}

function grokWindowsCheckIn(who: string, role: BotRole, language: string, studioPort = DEFAULT_STUDIO_PORT): string[] {
  const lang = language.slice(0, 2);
  const port = studioCheckInPort(studioPort);
  const origin = studioCheckInOrigin(port);
  const keep = grokKeepLines(who, role, origin);
  const work = heartbeatWorkPair(role);
  const noteHint = lang === 'zh'
    ? '留给下一位子的一行'
    : lang === 'ja'
      ? '次の席に残した一行'
      : lang === 'en'
        ? 'one line left for the next seat'
        : '다음 자리에 남긴 한 줄';
  const readyBeat = `Invoke-RestMethod -Uri ${origin}/api/bots/heartbeat -Method POST -ContentType 'application/json' -Body '{"bot_id":"${grokSeatBotId(role)}","display_name":"${who}","action":"${work.ready}","detail":{"note":"${noteHint}"}}'`;
  if (lang === 'ko') {
    return [
      '명령을 실행할 컴퓨터는 운영자가 등록한 Windows Computer만입니다. 이름을 지어내지 마세요.',
      '봇 쪽 Linux·공유 컴퓨터에서 127.0.0.1을 열지 마세요. 그 주소는 이 책상이 아닙니다.',
      'Grok exe를 찾지 마세요. 채팅 쪽에 still_here·매 분·1분마다 예약 작업을 만들지 마세요. 승인 창이 다시 뜹니다.',
      '승인 글에 그 Windows가 아니라고 하거나 실행 면이 Linux·공유면 허용하지 마세요. GROK_CREW_OK 한 줄만 보내고 멈추세요.',
      '그 Windows가 맞고 승인이 한 번 뜨면 한 번만 받으세요. 거부되면 멈추고 한 줄로만 알리세요.',
      '그 Windows에서 Grok Crew 창이 꺼져 있으면 멈추고 "창이 없다"고 하세요.',
      '그 Windows에서만 아래 keep을 한 번 실행하세요. 이 한 줄이 입장하고, 그 자리에서 still_here와 초대문 읽기를 1분마다 합니다. 채팅에서 다시 보내지 마세요. Python이 있으면 그쪽만 써도 됩니다.',
      keep.py,
      `(스크립트는 그 Windows에서 ${origin}/downloads/grok-crew.py)`,
      'PowerShell이면 아래를 한 번만 돌리세요.',
      keep.ps,
      'keep가 돌아가면 7214·still_here·exe 확인을 다시 요청하지 마세요.',
      '연결에서 연결 해제를 누르면 책상이 disconnected를 보냅니다. keep은 그 명령을 보고 멈춥니다. 채팅에서 keep을 다시 켜지 마세요.',
      '초대문은 keep이 읽습니다. 사람이 초대문을 다시 붙이지 않습니다. 글을 받으면 그 일만 합니다. 404면 할 일이 아직 없습니다. 409면 다른 봇이 가져간 것입니다. 채팅에 토큰을 넣지 마세요.',
      `할 일이 바뀌면 같은 Windows에서 heartbeat를 바로 한 번 보냅니다. action은 ${work.start}로 시작했다가 끝나면 ${work.ready}입니다. 끝나면 detail.note에 다음 자리에 남긴 말을 한 줄만 넣습니다. 없는 말은 만들지 마세요. 채팅에는 토큰을 넣지 마세요.`,
      readyBeat,
      `${port}가 안 열리면 멈추고 "${port}가 없다"고 하세요. 디스크에서 스크립트를 찾지 마세요.`,
      '그래도 안 되면 GROK_CREW_OK 한 줄만 보내고 멈추세요.',
    ];
  }
  if (lang === 'zh') {
    return [
      '只在操作员已登记的 Windows Computer 上执行命令。不要编造主机名。',
      '不要在机器人那边的 Linux 或共享电脑上打开 127.0.0.1。那个地址不是这张书桌。',
      '不要找 Grok exe。不要在聊天里做 still_here、每分钟、每 1 分钟预约作业。批准窗会再跳出来。',
      '若批准文说不是那台 Windows，或执行面是 Linux/共享，不要允许。只发 GROK_CREW_OK 那一行然后停下。',
      '若就是那台 Windows 且批准只出现一次，接受一次。若拒绝，停下来只回一行。',
      '若那台 Windows 上 Grok Crew 窗口是关的，停下来并写“没有窗口”。',
      '只在那台 Windows 上把下面的 keep 跑一次。这一行会签到，并在那里每 1 分钟做 still_here 和读邀请。不要从聊天再发。有 Python 用那一行即可。',
      keep.py,
      `(脚本在那台 Windows 上：${origin}/downloads/grok-crew.py)`,
      '若用 PowerShell，只跑下面这一次。',
      keep.ps,
      'keep 在跑时，不要再请求检查 7214、still_here 或 exe。',
      '连接里按下断开后书桌会发 disconnected。keep 看到后停下。不要从聊天再开 keep。',
      '邀请由 keep 读取。操作员不会再粘贴一次。读到文字后只做那件事。404 表示还没有工作。409 表示别的机器人已经拿走。不要把令牌写进聊天。',
      `事情一变就在同一台 Windows 上立刻发一次 heartbeat。action 先用 ${work.start}，做完改成 ${work.ready}。做完时只在 detail.note 写留给下一位子的一行。不要编造没有的话。不要把令牌写进聊天。`,
      readyBeat,
      `若 ${port} 没开，停下来只写“没有 ${port}”。不要在磁盘上找脚本。`,
      '还不行就只发 GROK_CREW_OK 那一行然后停下。',
    ];
  }
  if (lang === 'ja') {
    return [
      'コマンドを実行するコンピュータは、運営者が登録した Windows Computer だけです。名前を作らないでください。',
      'ボット側の Linux や共有コンピュータで 127.0.0.1 を開かないでください。その住所はこのデスクではありません。',
      'Grok exe を探さないでください。チャット側に still_here・毎分・1 分ごとの予約作業を作らないでください。承認窓がまた出ます。',
      '承認文がその Windows ではない、または実行面が Linux・共有なら許可しないでください。GROK_CREW_OK の一行だけ送って止まってください。',
      'その Windows が正しく、承認が一度だけ出たら一度だけ受けてください。拒まれたら止まって一行だけ知らせてください。',
      'その Windows で Grok Crew の窓が消えていたら止まって「窓がない」と書いてください。',
      'その Windows だけで下の keep を一度だけ実行してください。この一行で入場し、そこで still_here と招待文読みを 1 分ごとにします。チャットから再送しないでください。Python があればそちらだけでよいです。',
      keep.py,
      `(スクリプトはその Windows で ${origin}/downloads/grok-crew.py)`,
      'PowerShell なら下を一度だけ回してください。',
      keep.ps,
      'keep が動いているなら、7214・still_here・exe 確認を再リクエストしないでください。',
      '接続で接続を外すと机が disconnected を送ります。keep はその命令を見て止まります。チャットから keep を再起動しないでください。',
      '招待文は keep が読みます。人が招待文をもう一度貼ることはありません。文を受け取ったらその仕事だけします。404 なら仕事はまだありません。409 なら他のボットが取りました。トークンをチャットに書かないでください。',
      `仕事が変わったら同じ Windows ですぐ heartbeat を一度送ります。action は ${work.start} で始め、終わったら ${work.ready} です。終わったら detail.note に次の席へ残した一行だけ。ない言葉は作らないでください。トークンをチャットに書かないでください。`,
      readyBeat,
      `${port} が開いていなければ止まって「${port} がない」と書いてください。ディスクでスクリプトを探さないでください。`,
      'それでもだめなら GROK_CREW_OK の一行だけ送って止まってください。',
    ];
  }
  return [
    'Run commands only on the operator registered Windows Computer. Do not invent a host name.',
    'Do not open 127.0.0.1 from the bot Linux or shared computer. That address is not this desk.',
    'Do not search for a Grok exe. Do not create a chat scheduled job named still_here, every minute, or 매 분. That approval window will return.',
    'If the approval text says the surface cannot be verified as that Windows machine, or it is Linux or shared, do not allow. Send only the GROK_CREW_OK line and stop.',
    'If it is that Windows and approval appears once, accept it once. If it is denied, stop and say so in one line.',
    'If Grok Crew is not open on that Windows, stop and say the window is missing.',
    'On that Windows only, run keep once. That one command checks in, then leaves still_here and reads the invite every minute there. Do not send it again from chat. If Python is there, that line is enough.',
    keep.py,
    `(script on that Windows: ${origin}/downloads/grok-crew.py)`,
    'If you use PowerShell, run the next line once.',
    keep.ps,
    'While keep is running, do not ask again to check 7214, still_here, or the exe.',
    'If Connect sends disconnected, keep stops. Do not start keep again from chat.',
    'keep reads the invite. The operator will not paste the invite again. When you get the text, do only that job. 404 means no job yet. 409 means another bot already took it. Do not put the token in chat.',
    `When the job changes, send one heartbeat on that same Windows at once. Start with action ${work.start}, then ${work.ready} when done. On ${work.ready}, put only one line in detail.note for the next seat. Do not invent a line. Do not put the token in chat.`,
    readyBeat,
    `If ${port} is not open, stop and say ${port} is missing. Do not search the disk for the script.`,
    'If that still fails, send only the GROK_CREW_OK line and stop.',
  ];
}

export function remoteConnectPaste(
  kind: BotKind,
  pairCode: string,
  language: string,
  role: BotRole = 'editor',
  studioPort = DEFAULT_STUDIO_PORT,
  market?: string,
): string {
  const lang = language.slice(0, 2);
  const dest = resolveCrewMarket(market, language);
  const skills = skillText(role, language, dest);
  const family = kind === 'grok' ? 'grok' : 'custom';
  const who = seatName(family, role, lang === 'zh' || lang === 'ja' || lang === 'en' ? lang : 'ko');
  const line = `GROK_CREW_OK ${pairCode} ${who}`;
  const job = roleLabel(role, lang === 'zh' || lang === 'ja' || lang === 'en' ? lang : 'ko');
  const windows = family === 'grok' ? grokWindowsCheckIn(who, role, lang, studioPort) : [];
  if (lang === 'ko') {
    return [
      `당신은 Grok Crew와 연결합니다. 이름은 ${who}입니다.`,
      `역할은 ${job}입니다. 연결할 때 아래 역할 스킬과 보조 스킬을 읽고 그 일만 합니다.`,
      `보낼 나라는 ${marketLabel(dest, 'ko')}입니다. 나라를 바꿨으면 이 글을 다시 복사하세요.`,
      ...(windows.length ? windows : ['다른 컴퓨터에서는 127.0.0.1에 붙지 마세요. 이 창을 열 수 없습니다.']),
      `연결 코드: ${pairCode}`,
      '',
      '첫 답은 아래 한 줄만 보내세요.',
      line,
      '',
      '그다음부터 운영자가 주는 일만 합니다. 끝난 컷은 운영자가 이 Windows 창에 놓습니다.',
      '',
      skills,
    ].join('\n');
  }
  if (lang === 'zh') {
    return [
      `你正在连接 Grok Crew。名字是 ${who}。`,
      `角色是 ${job}。连接后阅读下面的角色技能和一项辅助技能，只做那件事。`,
      `要发往的国家是 ${marketLabel(dest, 'zh')}。改了国家请重新复制这段文字。`,
      ...(windows.length ? windows : ['另一台电脑不要连接 127.0.0.1。打不开这个窗口。']),
      `连接代码：${pairCode}`,
      '',
      '第一句回复只发下面这一行。',
      line,
      '',
      '之后只做操作员给的工作。完成的成片由操作员放到这个 Windows 窗口。',
      '',
      skills,
    ].join('\n');
  }
  if (lang === 'ja') {
    return [
      `あなたは Grok Crew と接続します。名前は ${who} です。`,
      `役割は ${job} です。下の役割スキルと補助スキルを読んで、その仕事だけします。`,
      `送る国は ${marketLabel(dest, 'ja')} です。国を変えたらこの文をコピーし直してください。`,
      ...(windows.length ? windows : ['別のコンピュータから 127.0.0.1 に接続しないでください。この窓は開けません。']),
      `接続コード: ${pairCode}`,
      '',
      '最初の返事はこの一行だけです。',
      line,
      '',
      'そのあとは運営者が渡す仕事だけします。終わったカットは運営者がこの Windows の窓に置きます。',
      '',
      skills,
    ].join('\n');
  }
  return [
    `You are connecting to Grok Crew as ${who}.`,
    `Your role is ${job}. Read the role skill and one extra below and only do that job.`,
    `Destination country: ${marketLabel(dest, 'en')}. If you change it, copy this text again.`,
    ...(windows.length ? windows : ['Do not connect to 127.0.0.1 from another computer.']),
    `Connection code: ${pairCode}`,
    '',
    'Reply with this one line only:',
    line,
    '',
    'After that, only do the work the operator gives. The operator drops the finished cut on this Windows window.',
    '',
    skills,
  ].join('\n');
}

export const LAST_CONNECT_BUNDLE_KEY = 'grok-crew-last-connect-bundle';

export type LastConnectBundle = {
  market: string;
  recipeId: string;
  language: string;
  copiedAt: string;
};

function asLastConnectBundle(value: unknown): LastConnectBundle | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const market = String(record.market || '').trim();
  const recipeId = String(record.recipeId || '').trim();
  const language = String(record.language || '').trim() || 'ko';
  const copiedAt = String(record.copiedAt || '').trim();
  if (!market || !recipeId) return null;
  return { market, recipeId, language, copiedAt };
}

export function readLastConnectBundle(): LastConnectBundle | null {
  const raw = storage()?.getItem(LAST_CONNECT_BUNDLE_KEY);
  if (!raw) return null;
  try {
    return asLastConnectBundle(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeLastConnectBundle(next: {
  market?: string;
  recipeId?: string;
  language?: string;
}): LastConnectBundle | null {
  const current = readLastConnectBundle();
  const saved = asLastConnectBundle({
    market: next.market || current?.market,
    recipeId: next.recipeId || current?.recipeId,
    language: next.language || current?.language || 'ko',
    copiedAt: new Date().toISOString(),
  });
  if (!saved) return null;
  storage()?.setItem(LAST_CONNECT_BUNDLE_KEY, JSON.stringify(saved));
  return saved;
}

export function seatConnectDivider(role: BotRole, language = 'ko'): string {
  const who = seatName('grok', role, language);
  return `===== ${who} =====`;
}

export function threeSeatConnectPaste(
  pairCode: string,
  language: string,
  studioPort = DEFAULT_STUDIO_PORT,
  market?: string,
): string {
  const code = String(pairCode || '').trim();
  if (!code) return '';
  const lang = language.slice(0, 2);
  const footer = lang === 'en'
    ? 'Paste only that seat’s block into that bot window. There is no token in this text.'
    : lang === 'zh'
      ? '每个位子只把那一块贴到那个机器人窗口。这段文字里没有令牌。'
      : lang === 'ja'
        ? '席ごとにその塊だけをそのボットの窓に貼ってください。この文にトークンはありません。'
        : '자리마다 해당 덩어리만 그 창에 붙이세요. 이 글에 토큰은 없습니다.';
  const blocks = BOT_ROLES.map((role) => [
    seatConnectDivider(role, language),
    remoteConnectPaste('grok', code, language, role, studioPort, market),
  ].join('\n'));
  return [...blocks, footer].join('\n\n');
}
