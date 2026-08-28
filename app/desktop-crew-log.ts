import { BOT_ROLES, seatName, type BotRole } from './bot-skills';
import {
  activitySeatName,
  formatSince,
  heartbeatActionKind,
  heartbeatActionLabel,
  type AutoSeatRow,
  type BotActivityItem,
} from './desktop-auto-state';

export type CrewTalkKind = 'work' | 'presence';
export type CrewLoadState = 'loading' | 'ready' | 'error';

export type CrewPipelineSeat = {
  key: string;
  role: BotRole;
  name: string;
  connected: boolean;
  current: boolean;
  mark: AutoSeatRow['mark'];
  actionLabel: string;
  note: string;
  when: string;
};

export type CrewTalkEntry = {
  id: string;
  kind: CrewTalkKind;
  role: BotRole | '';
  name: string;
  actionLabel: string;
  note: string;
  toName: string;
  when: string;
  count?: number;
};

function boardCopy(language: string, ko: string, en: string, zh: string, ja: string): string {
  const lang = language.slice(0, 2);
  if (lang === 'en') return en;
  if (lang === 'zh') return zh;
  if (lang === 'ja') return ja;
  return ko;
}

export function parseActivityDetail(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : {};
    } catch {
      return {};
    }
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

/** Only `detail.note`. Do not treat message dumps as speech. Do not invent a line. */
export function activityHandoffNote(detail: unknown): string {
  const obj = parseActivityDetail(detail);
  if (obj.truncated) return '';
  const note = String(obj.note ?? '').replace(/\s+/g, ' ').trim();
  return note.slice(0, 400);
}

export function roleFromBotId(botId: string): BotRole | '' {
  const id = String(botId || '').trim().toLowerCase();
  for (const role of BOT_ROLES) {
    if (id === `grok-${role}` || id.endsWith(`-${role}`)) return role;
  }
  return '';
}

export function nextHandoffRole(role: BotRole | ''): BotRole | 'desk' | '' {
  if (role === 'planner') return 'scraper';
  if (role === 'scraper') return 'editor';
  if (role === 'editor') return 'desk';
  return '';
}

export function handoffTargetName(role: BotRole | '', language = 'ko'): string {
  const next = nextHandoffRole(role);
  if (next === 'scraper') return seatName('grok', 'scraper', language);
  if (next === 'editor') return seatName('grok', 'editor', language);
  if (next === 'desk') {
    return boardCopy(language, '이 창', 'this window', '这个窗口', 'この窓');
  }
  return '';
}

function activityWhen(item: BotActivityItem, language: string): string {
  const created = String(item.created_at || '').trim();
  const at = created ? new Date(created).getTime() : Number.NaN;
  if (Number.isNaN(at)) return '';
  return formatSince(Math.max(0, Math.floor((Date.now() - at) / 1000)), language);
}

function namedSeat(item: BotActivityItem, language: string): { name: string; role: BotRole | '' } {
  const botId = String(item.bot_id || '');
  const name = activitySeatName(botId, language);
  return { name, role: roleFromBotId(botId) };
}

function latestWorkByRole(activity: BotActivityItem[]): Partial<Record<BotRole, BotActivityItem>> {
  const latest: Partial<Record<BotRole, BotActivityItem>> = {};
  for (const item of activity) {
    const role = roleFromBotId(String(item.bot_id || ''));
    if (!role) continue;
    const kind = heartbeatActionKind(item.action);
    if (kind !== 'started' && kind !== 'ready') continue;
    if (!latest[role]) latest[role] = item;
  }
  return latest;
}

export function crewPipeline(
  rows: AutoSeatRow[],
  activity: BotActivityItem[],
  language = 'ko',
): CrewPipelineSeat[] {
  const latest = latestWorkByRole(activity);
  return rows.map((row) => {
    const item = latest[row.role];
    const note = item ? activityHandoffNote(item.detail_json) : '';
    const when = item ? activityWhen(item, language) : '';
    const kind = heartbeatActionKind(row.lastAction);
    const actionLabel = kind === 'unknown'
      ? row.detail
      : heartbeatActionLabel(row.lastAction, language);
    return {
      key: row.key,
      role: row.role,
      name: row.name,
      connected: row.connected,
      current: row.current,
      mark: row.mark,
      actionLabel,
      note,
      when,
    };
  });
}

export function crewTalkThread(
  activity: BotActivityItem[] | undefined,
  language = 'ko',
): CrewTalkEntry[] {
  const named = (activity ?? [])
    .map((item) => {
      const seat = namedSeat(item, language);
      return { item, ...seat };
    })
    .filter((row) => row.name);
  const chronological = [...named].reverse();
  const thread: CrewTalkEntry[] = [];

  const flushPresence = (pending: {
    item: BotActivityItem;
    name: string;
    role: BotRole | '';
    count: number;
  } | null) => {
    if (!pending) return;
    thread.push({
      id: String(pending.item.id || `${pending.item.bot_id}-${pending.item.created_at}`),
      kind: 'presence',
      role: pending.role,
      name: pending.name,
      actionLabel: heartbeatActionLabel(pending.item.action, language),
      note: '',
      toName: '',
      when: activityWhen(pending.item, language),
      count: pending.count,
    });
  };

  let pending: { item: BotActivityItem; name: string; role: BotRole | ''; count: number } | null = null;
  for (const row of chronological) {
    const kind = heartbeatActionKind(row.item.action);
    if (kind === 'idle') {
      if (pending && pending.name === row.name) {
        pending = { ...pending, item: row.item, count: pending.count + 1 };
      } else {
        flushPresence(pending);
        pending = { item: row.item, name: row.name, role: row.role, count: 1 };
      }
      continue;
    }
    flushPresence(pending);
    pending = null;
    if (kind !== 'started' && kind !== 'ready') continue;
    const ready = kind === 'ready';
    thread.push({
      id: String(row.item.id || `${row.item.bot_id}-${row.item.action}-${row.item.created_at}`),
      kind: 'work',
      role: row.role,
      name: row.name,
      actionLabel: heartbeatActionLabel(row.item.action, language),
      note: activityHandoffNote(row.item.detail_json),
      toName: ready ? handoffTargetName(row.role, language) : '',
      when: activityWhen(row.item, language),
    });
  }
  flushPresence(pending);
  return thread;
}

export function crewBoardEmptyCopy(language = 'ko'): { title: string; body: string } {
  return {
    title: boardCopy(language, '아직 남긴 말이 없습니다', 'No line has been left yet', '还没有留下话', 'まだ残した言葉はありません'),
    body: boardCopy(
      language,
      '할 일이 바뀌면 그 자리가 heartbeat와 한 줄(note)을 남깁니다. 없는 말은 이 창이 만들지 않습니다.',
      'When the job changes, that seat leaves a heartbeat and one note. This window does not invent a line.',
      '事情一变，那个位子会留下 heartbeat 和一行 note。这个窗口不编造话。',
      '仕事が変わると、その席が heartbeat と一行の note を残します。この窓は言葉を作りません。',
    ),
  };
}

export function crewBoardErrorCopy(language = 'ko'): { title: string; body: string } {
  return {
    title: boardCopy(language, '확인을 읽지 못했습니다', 'Could not read the check-ins', '没读到确认', '確認を読めませんでした'),
    body: boardCopy(
      language,
      '같은 창에서 다시 읽습니다. 자리 램프는 연결됨 / 연결되지않음만 씁니다.',
      'This window will read again. Lamps still only say connected / not connected.',
      '这个窗口会再读。灯还是只写已连接 / 未连接。',
      'この窓がもう一度読みます。ランプは接続済み / 接続されていないだけです。',
    ),
  };
}

export function crewTalkLine(entry: CrewTalkEntry, language = 'ko'): string {
  if (entry.kind === 'presence') {
    const times = entry.count && entry.count > 1
      ? boardCopy(language, `${entry.count}번 자리 확인`, `${entry.count} seat checks`, `确认位子 ${entry.count} 次`, `席の確認 ${entry.count} 回`)
      : entry.actionLabel;
    return `${entry.name} · ${times}`;
  }
  if (entry.note && entry.toName) return `${entry.name} → ${entry.toName}`;
  if (entry.toName) return `${entry.name} → ${entry.toName}`;
  return entry.name;
}
