import { isBotRole, roleLabel, seatName, skillText, type BotRole } from './bot-skills';
import { connectedBot, type CrewRoster } from './desktop-bot-connect';

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

export function makePairCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let index = 0; index < 6; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
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
    if (bot.role && !isBotRole(bot.role)) return false;
    return true;
  });
}

export function readBotLinks(): BotLinkState {
  const raw = storage()?.getItem(BOT_LINKS_KEY);
  if (!raw) return emptyBotLinks();
  try {
    const parsed = JSON.parse(raw) as Partial<BotLinkState>;
    const pairCode = String(parsed.pairCode || '').trim().toUpperCase();
    return { pairCode, bots: normalizeBots(parsed.bots) };
  } catch {
    return emptyBotLinks();
  }
}

export function writeBotLinks(state: BotLinkState): void {
  storage()?.setItem(BOT_LINKS_KEY, JSON.stringify(state));
}

export function ensureBotLinks(state?: BotLinkState | null): BotLinkState {
  const current = state ?? readBotLinks();
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

export function removeLinkedBot(state: BotLinkState, id: string): BotLinkState {
  return { ...state, bots: state.bots.filter((item) => item.id !== id) };
}

export function suggestedConnectReply(kind: BotKind, pairCode: string, role: BotRole = 'editor'): string {
  return `GROK_CREW_OK ${pairCode} ${seatName(kind === 'grok' ? 'grok' : 'custom', role, 'ko')}`;
}

export function parseConnectReply(text: string, pairCode: string): { name: string } | null {
  const expected = String(pairCode || '').trim();
  if (!expected) return null;
  const raw = String(text || '').replace(/[“”"'`]/g, ' ').trim();
  if (!raw) return null;
  const line = raw.split(/\r?\n/).map((item) => item.trim()).find((item) => /GROK_CREW_OK/i.test(item)) || raw;
  const match = line.match(/GROK_CREW_OK\s+(\S+)\s+(.+)$/i);
  if (!match) return null;
  if (match[1].toUpperCase() !== expected.toUpperCase()) return null;
  const name = match[2].trim().slice(0, 80);
  return name ? { name } : null;
}

export function hasConnectedBot(roster?: CrewRoster | null, links?: BotLinkState | null): boolean {
  if (connectedBot(roster)) return true;
  return Boolean(links?.bots.some((item) => item.status === 'connected'));
}

export function connectedRemoteNames(links?: BotLinkState | null): string[] {
  return links?.bots.filter((item) => item.status === 'connected').map((item) => item.name) ?? [];
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

export function remoteConnectPaste(kind: BotKind, pairCode: string, language: string, role: BotRole = 'editor'): string {
  const lang = language.slice(0, 2);
  const family = kind === 'grok' ? 'grok' : 'custom';
  const who = seatName(family, role, lang === 'zh' || lang === 'ja' || lang === 'en' ? lang : 'ko');
  const line = `GROK_CREW_OK ${pairCode} ${who}`;
  const job = roleLabel(role, lang === 'zh' || lang === 'ja' || lang === 'en' ? lang : 'ko');
  if (lang === 'ko') {
    return [
      `당신은 Grok Crew와 연결합니다. 이름은 ${who}입니다.`,
      `역할은 ${job}입니다. 연결할 때 아래 스킬을 읽고 그 일만 합니다.`,
      '다른 컴퓨터에서는 127.0.0.1에 붙지 마세요. 이 창을 열 수 없습니다.',
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
      `角色是 ${job}。连接后阅读下面的技能，只做那件事。`,
      '另一台电脑不要连接 127.0.0.1。打不开这个窗口。',
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
      `役割は ${job} です。下のスキルを読んで、その仕事だけします。`,
      '別のコンピュータから 127.0.0.1 に接続しないでください。この窓は開けません。',
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
    `Your role is ${job}. Read the skill below and only do that job.`,
    'Do not connect to 127.0.0.1 from another computer.',
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
