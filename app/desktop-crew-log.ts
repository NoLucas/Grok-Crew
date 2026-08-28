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
  nextOfflineNote: string;
  staleMinutes: number | null;
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

/** Prefer the field the desk already uses. Do not invent a second id name. */
export function activitySpecId(detail: unknown): string {
  const obj = parseActivityDetail(detail);
  return String(obj.edit_spec_id ?? '').trim();
}

export function latestActivitySpecId(activity: BotActivityItem[] | undefined): string {
  for (const item of activity ?? []) {
    const id = activitySpecId(item.detail_json);
    if (id) return id;
  }
  return '';
}

/** One job only. Presence ticks stay. Work lines without this id do not mix in. */
export function activityForSpec(
  activity: BotActivityItem[] | undefined,
  specId?: string,
): BotActivityItem[] {
  const items = activity ?? [];
  const want = String(specId || '').trim() || latestActivitySpecId(items);
  if (!want) {
    return items.filter((item) => {
      const kind = heartbeatActionKind(item.action);
      return kind === 'idle' || !activitySpecId(item.detail_json);
    });
  }
  return items.filter((item) => {
    const kind = heartbeatActionKind(item.action);
    if (kind === 'idle') return true;
    return activitySpecId(item.detail_json) === want;
  });
}

export function presenceStaleMinutes(seconds: number | null | undefined): number | null {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 60) return null;
  return Math.max(1, Math.floor(seconds / 60));
}

export function presenceStaleCopy(minutes: number, language = 'ko'): string {
  const n = Math.max(1, Math.floor(minutes));
  return boardCopy(
    language,
    `마지막 확인 ${n}분 전`,
    `Last check ${n} min ago`,
    `上次确认 ${n} 分钟前`,
    `最後の確認は ${n} 分前`,
  );
}

export function nextSeatOfflineNote(
  rows: AutoSeatRow[],
  role: BotRole | '',
  language = 'ko',
  kind?: AutoSeatRow['kind'],
): string {
  const next = nextHandoffRole(role);
  if (next !== 'planner' && next !== 'scraper' && next !== 'editor') return '';
  const seat = rows.find((row) => row.role === next && (!kind || row.kind === kind));
  if (seat?.connected) return '';
  return boardCopy(
    language,
    '다음 자리 · 연결되지않음',
    'Next seat · not connected',
    '下一位子 · 未连接',
    '次の席 · 接続されていない',
  );
}

/** Prefer the open wait only while that job is still on the board. Yesterday leftover yields to the latest spec. */
export function crewBoardScope(
  wait: { specId?: string; title?: string } | null | undefined,
  activity: BotActivityItem[] | undefined,
): { specId?: string; jobTitle?: string } {
  const waitId = String(wait?.specId || '').trim();
  const jobTitle = String(wait?.title || '').trim() || undefined;
  const items = activity ?? [];
  const latest = latestActivitySpecId(items);
  const waitInActivity = Boolean(waitId) && items.some((item) => activitySpecId(item.detail_json) === waitId);
  if (!waitId) return { specId: latest || undefined };
  // A brand-new wait has no heartbeat yet. A leftover wait yields to a newer spec.
  if (!latest || latest === waitId || !waitInActivity) {
    return { specId: waitId, jobTitle };
  }
  return { specId: latest };
}

export function crewTalkMemo(
  thread: CrewTalkEntry[],
  language = 'ko',
  jobTitle = '',
): string {
  const lines: string[] = [];
  const heading = String(jobTitle || '').trim();
  if (heading) lines.push(heading, '');
  for (const entry of thread) {
    const when = entry.when ? ` · ${entry.when}` : '';
    if (entry.kind === 'presence') {
      lines.push(`${crewTalkLine(entry, language)}${when}`);
      continue;
    }
    lines.push(`${crewTalkLine(entry, language)}${when}`);
    if (entry.actionLabel) lines.push(entry.actionLabel);
    if (entry.note) lines.push(entry.note);
    lines.push('');
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function roleFromBotId(botId: string): BotRole | '' {
  const id = String(botId || '').trim().toLowerCase();
  for (const role of BOT_ROLES) {
    if (id === `grok-${role}` || id.endsWith(`-${role}`)) return role;
  }
  return '';
}

export function familyFromBotId(botId: string): AutoSeatRow['kind'] | '' {
  const id = String(botId || '').trim().toLowerCase();
  if (!id) return '';
  if (id === 'grok' || id.startsWith('grok-')) return 'grok';
  return roleFromBotId(id) ? 'custom' : '';
}

export function nextHandoffRole(role: BotRole | ''): BotRole | 'desk' | '' {
  if (role === 'planner') return 'scraper';
  if (role === 'scraper') return 'editor';
  if (role === 'editor') return 'desk';
  return '';
}

export function handoffTargetName(
  role: BotRole | '',
  language = 'ko',
  family: AutoSeatRow['kind'] = 'grok',
): string {
  const next = nextHandoffRole(role);
  const kind = family === 'custom' ? 'custom' : 'grok';
  if (next === 'scraper') return seatName(kind, 'scraper', language);
  if (next === 'editor') return seatName(kind, 'editor', language);
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

function seatWorkKey(kind: AutoSeatRow['kind'] | '', role: BotRole | ''): string {
  if (!kind || !role) return '';
  return `${kind}:${role}`;
}

function latestWorkBySeat(activity: BotActivityItem[]): Map<string, BotActivityItem> {
  const latest = new Map<string, BotActivityItem>();
  for (const item of activity) {
    const botId = String(item.bot_id || '');
    const key = seatWorkKey(familyFromBotId(botId), roleFromBotId(botId));
    if (!key) continue;
    const kind = heartbeatActionKind(item.action);
    if (kind !== 'started' && kind !== 'ready') continue;
    if (!latest.has(key)) latest.set(key, item);
  }
  return latest;
}

function seatHasReadyHandoff(row: AutoSeatRow, item?: BotActivityItem): boolean {
  if (heartbeatActionKind(row.lastAction) === 'ready') return true;
  return item ? heartbeatActionKind(item.action) === 'ready' : false;
}

export function crewPipeline(
  rows: AutoSeatRow[],
  activity: BotActivityItem[],
  language = 'ko',
): CrewPipelineSeat[] {
  const latest = latestWorkBySeat(activity);
  return rows.map((row) => {
    const item = latest.get(seatWorkKey(row.kind, row.role));
    const nextOfflineNote = seatHasReadyHandoff(row, item)
      ? nextSeatOfflineNote(rows, row.role, language, row.kind)
      : '';
    const note = item ? activityHandoffNote(item.detail_json) : '';
    const when = item ? activityWhen(item, language) : '';
    const workKind = item ? heartbeatActionKind(item.action) : 'unknown';
    const lastKind = heartbeatActionKind(row.lastAction);
    let actionLabel = '';
    if (!row.connected) {
      actionLabel = row.detail;
    } else if (item && (workKind === 'started' || workKind === 'ready')) {
      actionLabel = heartbeatActionLabel(item.action, language);
    } else if (lastKind === 'started' || lastKind === 'ready') {
      actionLabel = heartbeatActionLabel(row.lastAction, language);
    }
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
      nextOfflineNote,
      staleMinutes: row.connected ? presenceStaleMinutes(row.secondsSinceCheckin) : null,
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

  for (const row of chronological) {
    const kind = heartbeatActionKind(row.item.action);
    if (kind !== 'started' && kind !== 'ready') continue;
    const note = activityHandoffNote(row.item.detail_json);
    // Started ticks without a handoff note are status, not talk.
    if (kind === 'started' && !note) continue;
    const ready = kind === 'ready';
    thread.push({
      id: String(row.item.id || `${row.item.bot_id}-${row.item.action}-${row.item.created_at}`),
      kind: 'work',
      role: row.role,
      name: row.name,
      actionLabel: heartbeatActionLabel(row.item.action, language),
      note,
      toName: ready ? handoffTargetName(row.role, language, familyFromBotId(String(row.item.bot_id || '')) || 'grok') : '',
      when: activityWhen(row.item, language),
    });
  }
  return thread;
}

export function crewNowLine(seats: CrewPipelineSeat[], language = 'ko'): string {
  const current = seats.find((seat) => seat.current && seat.connected && seat.actionLabel)
    || seats.find((seat) => seat.connected && seat.actionLabel);
  if (!current?.actionLabel) {
    return boardCopy(
      language,
      '할 일을 남긴 자리가 아직 없습니다',
      'No seat has left a job yet',
      '还没有位子留下要做的事',
      '仕事を残した席はまだありません',
    );
  }
  return `${current.name} · ${current.actionLabel}`;
}

export function crewBoardEmptyCopy(language = 'ko'): { title: string; body: string } {
  return {
    title: boardCopy(language, '넘긴 말이 아직 없습니다', 'No handoff line yet', '还没有转交的话', '渡した言葉はまだありません'),
    body: boardCopy(
      language,
      '자리가 다음 자리로 넘긴 한 줄만 여깁니다. 자리 확인과 없는 말은 적지 않습니다.',
      'Only the one line a seat left for the next seat. Seat checks and invented talk stay out.',
      '只留下位子交给下一位子的那一行。位子确认和编造的话不写。',
      '席が次の席へ渡した一行だけ残します。席の確認と作った話は書きません。',
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
