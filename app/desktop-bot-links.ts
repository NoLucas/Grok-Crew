import { isBotRole, roleLabel, seatName, skillText, type BotRole } from './bot-skills';
import { connectedBot, type CrewBot, type CrewRoster } from './desktop-bot-connect';

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

export type BotLinkState = {
  pairCode: string;
  bots: LinkedBot[];
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
  return { pairCode: '', bots: [] };
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
    const next = honestRemoteLinks({ pairCode, bots });
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
  const next = { pairCode: current.pairCode, bots: [] };
  try {
    storage()?.removeItem(BOT_LINKS_KEY);
  } catch {
    writeBotLinks(next);
    return next;
  }
  return { pairCode: '', bots: [] };
}

export function ensureBotLinks(state?: BotLinkState | null): BotLinkState {
  const current = honestRemoteLinks(state ?? readBotLinks());
  if (current.pairCode) return current;
  const stored = readBotLinks();
  if (stored.pairCode) return stored;
  const next = { pairCode: makePairCode(), bots: stored.bots.length ? stored.bots : current.bots };
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
        next = upsertLinkedBot(next, {
          id: seatId(kind, role, state.pairCode),
          name: seatName(kind, role, lang === 'zh' || lang === 'ja' || lang === 'en' ? lang : 'ko'),
          kind,
          role,
          place: 'other_pc',
          status: 'connected',
          pairCode: state.pairCode,
          connectedAt: now,
          confirmedAt: now,
        });
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

export function activeRosterSeat(roster?: CrewRoster | null, role?: BotRole): CrewBot | null {
  if (!role) return null;
  return (roster?.bots ?? []).find((bot) => bot.presence === 'active' && rosterMatchesSeat(bot, role)) ?? null;
}

export function seatIsConnected(
  kind: 'grok' | 'custom',
  role: BotRole,
  links?: BotLinkState | null,
  roster?: CrewRoster | null,
): boolean {
  if (linkedBySeat(links?.bots, kind, role)?.status === 'connected') return true;
  return kind === 'grok' && Boolean(activeRosterSeat(roster, role));
}

export function familyIsConnected(
  kind: 'grok' | 'custom',
  links?: BotLinkState | null,
  roster?: CrewRoster | null,
): boolean {
  if (links?.bots.some((item) => item.kind === kind && item.status === 'connected')) return true;
  if (kind !== 'grok') return false;
  return (['planner', 'scraper', 'editor'] as const).some((role) => Boolean(activeRosterSeat(roster, role)));
}

export function hasConnectedBot(roster?: CrewRoster | null, links?: BotLinkState | null): boolean {
  if (connectedBot(roster)) return true;
  return Boolean(links?.bots.some((item) => item.status === 'connected'));
}

export function connectedRemoteNames(links?: BotLinkState | null, roster?: CrewRoster | null): string[] {
  const names = links?.bots.filter((item) => item.status === 'connected').map((item) => item.name) ?? [];
  for (const role of ['planner', 'scraper', 'editor'] as const) {
    const name = String(activeRosterSeat(roster, role)?.display_name || '').trim();
    if (name && !names.includes(name)) names.push(name);
  }
  return names;
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

function grokWindowsCheckIn(who: string, role: BotRole, language: string, studioPort = DEFAULT_STUDIO_PORT): string[] {
  const lang = language.slice(0, 2);
  const port = studioCheckInPort(studioPort);
  const origin = studioCheckInOrigin(port);
  const id = grokSeatBotId(role);
  const purpose = seatPurpose(role);
  const ps = `Invoke-RestMethod -Uri ${origin}/api/bot-entry -Method POST -ContentType 'application/json' -Body '{"bot_id":"${id}","display_name":"${who}","purpose":"${purpose}"}'`;
  const py = `python grok-crew.py entry --server ${origin} --bot-id ${id} --display-name "${who}" --purpose ${purpose}`;
  const beat = `Invoke-RestMethod -Uri ${origin}/api/bots/heartbeat -Method POST -ContentType 'application/json' -Body '{"bot_id":"${id}","display_name":"${who}","action":"still_here"}'`;
  const work = heartbeatWorkPair(role);
  if (lang === 'ko') {
    return [
      '명령을 실행할 컴퓨터는 운영자가 등록한 Windows Computer만입니다. 이름을 지어내지 마세요.',
      '봇 쪽 Linux·공유 컴퓨터에서 127.0.0.1을 열지 마세요. 그 주소는 이 책상이 아닙니다.',
      '승인이 뜨면 받으세요. 거부되면 멈추고 한 줄로만 알리세요.',
      '그 Windows에서 Grok Crew 창이 꺼져 있으면 멈추고 "창이 없다"고 하세요.',
      '그 Windows에서만 아래를 실행하세요. Python이 있으면 둘 중 하나면 됩니다.',
      ps,
      py,
      `(스크립트는 그 Windows에서 ${origin}/downloads/grok-crew.py)`,
      '1분마다 같은 Windows에서 still_here heartbeat를 남기세요. 창이 켜져 있는지 이 책상이 알게 합니다.',
      beat,
      `할 일이 바뀌면 같은 주소에 heartbeat를 바로 보냅니다. action은 ${work.start}로 시작했다가 끝나면 ${work.ready}입니다. 채팅에는 토큰을 넣지 마세요.`,
      `${port}가 안 열리면 멈추고 "${port}가 없다"고 하세요. 디스크에서 스크립트를 찾지 마세요.`,
      '그래도 안 되면 GROK_CREW_OK 한 줄만 보내고 멈추세요.',
    ];
  }
  if (lang === 'zh') {
    return [
      '只在操作员已登记的 Windows Computer 上执行命令。不要编造主机名。',
      '不要在机器人那边的 Linux 或共享电脑上打开 127.0.0.1。那个地址不是这张书桌。',
      '若弹出批准，请接受。若拒绝，停下来只回一行。',
      '若那台 Windows 上 Grok Crew 窗口是关的，停下来并写“没有窗口”。',
      '只在那台 Windows 上执行下面的命令。有 Python 时两选一即可。',
      ps,
      py,
      `(脚本在那台 Windows 上：${origin}/downloads/grok-crew.py)`,
      '每 1 分钟在同一台 Windows 上留下 still_here heartbeat，好让这张书桌知道窗口还开着。',
      beat,
      `事情一变就立刻往同一地址发 heartbeat。action 先用 ${work.start}，做完改成 ${work.ready}。不要把令牌写进聊天。`,
      `若 ${port} 没开，停下来只写“没有 ${port}”。不要在磁盘上找脚本。`,
      '还不行就只发 GROK_CREW_OK 那一行然后停下。',
    ];
  }
  if (lang === 'ja') {
    return [
      'コマンドを実行するコンピュータは、運営者が登録した Windows Computer だけです。名前を作らないでください。',
      'ボット側の Linux や共有コンピュータで 127.0.0.1 を開かないでください。その住所はこのデスクではありません。',
      '承認が出たら受けてください。拒まれたら止まって一行だけ知らせてください。',
      'その Windows で Grok Crew の窓が消えていたら止まって「窓がない」と書いてください。',
      'その Windows だけで下を実行してください。Python があればどちらかでよいです。',
      ps,
      py,
      `(スクリプトはその Windows で ${origin}/downloads/grok-crew.py)`,
      '1 分ごとに同じ Windows で still_here heartbeat を残してください。窓が開いていることをこのデスクが分かります。',
      beat,
      `仕事が変わったら同じ住所にすぐ heartbeat を送ります。action は ${work.start} で始め、終わったら ${work.ready} です。トークンをチャットに書かないでください。`,
      `${port} が開いていなければ止まって「${port} がない」と書いてください。ディスクでスクリプトを探さないでください。`,
      'それでもだめなら GROK_CREW_OK の一行だけ送って止まってください。',
    ];
  }
  return [
    'Run commands only on the operator registered Windows Computer. Do not invent a host name.',
    'Do not open 127.0.0.1 from the bot Linux or shared computer. That address is not this desk.',
    'If approval appears, accept it. If it is denied, stop and say so in one line.',
    'If Grok Crew is not open on that Windows, stop and say the window is missing.',
    'Run the next command on that Windows only. If Python is there, either line is enough.',
    ps,
    py,
    `(script on that Windows: ${origin}/downloads/grok-crew.py)`,
    'Leave a still_here heartbeat on the same Windows every minute so this desk knows the window is open.',
    beat,
    `When the job changes, send a heartbeat to the same address at once. Start with action ${work.start}, then ${work.ready} when done. Do not put the token in chat.`,
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
): string {
  const lang = language.slice(0, 2);
  const family = kind === 'grok' ? 'grok' : 'custom';
  const who = seatName(family, role, lang === 'zh' || lang === 'ja' || lang === 'en' ? lang : 'ko');
  const line = `GROK_CREW_OK ${pairCode} ${who}`;
  const job = roleLabel(role, lang === 'zh' || lang === 'ja' || lang === 'en' ? lang : 'ko');
  const windows = family === 'grok' ? grokWindowsCheckIn(who, role, lang, studioPort) : [];
  if (lang === 'ko') {
    return [
      `당신은 Grok Crew와 연결합니다. 이름은 ${who}입니다.`,
      `역할은 ${job}입니다. 연결할 때 아래 역할 스킬과 보조 스킬을 읽고 그 일만 합니다.`,
      ...(windows.length ? windows : ['다른 컴퓨터에서는 127.0.0.1에 붙지 마세요. 이 창을 열 수 없습니다.']),
      `연결 코드: ${pairCode}`,
      '',
      '첫 답은 아래 한 줄만 보내세요.',
      line,
      '',
      '그다음부터 운영자가 주는 일만 합니다. 끝난 컷은 운영자가 이 Windows 창에 놓습니다.',
      '',
      skillText(role),
    ].join('\n');
  }
  if (lang === 'zh') {
    return [
      `你正在连接 Grok Crew。名字是 ${who}。`,
      `角色是 ${job}。连接后阅读下面的角色技能和一项辅助技能，只做那件事。`,
      ...(windows.length ? windows : ['另一台电脑不要连接 127.0.0.1。打不开这个窗口。']),
      `连接代码：${pairCode}`,
      '',
      '第一句回复只发下面这一行。',
      line,
      '',
      '之后只做操作员给的工作。完成的成片由操作员放到这个 Windows 窗口。',
      '',
      skillText(role),
    ].join('\n');
  }
  if (lang === 'ja') {
    return [
      `あなたは Grok Crew と接続します。名前は ${who} です。`,
      `役割は ${job} です。下の役割スキルと補助スキルを読んで、その仕事だけします。`,
      ...(windows.length ? windows : ['別のコンピュータから 127.0.0.1 に接続しないでください。この窓は開けません。']),
      `接続コード: ${pairCode}`,
      '',
      '最初の返事はこの一行だけです。',
      line,
      '',
      'そのあとは運営者が渡す仕事だけします。終わったカットは運営者がこの Windows の窓に置きます。',
      '',
      skillText(role),
    ].join('\n');
  }
  return [
    `You are connecting to Grok Crew as ${who}.`,
    `Your role is ${job}. Read the role skill and one extra below and only do that job.`,
    ...(windows.length ? windows : ['Do not connect to 127.0.0.1 from another computer.']),
    `Connection code: ${pairCode}`,
    '',
    'Reply with this one line only:',
    line,
    '',
    'After that, only do the work the operator gives. The operator drops the finished cut on this Windows window.',
    '',
    skillText(role),
  ].join('\n');
}
