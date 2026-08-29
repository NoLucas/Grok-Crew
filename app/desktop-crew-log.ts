import { BOT_ROLES, seatName, seatShortLabel, type BotRole } from './bot-skills';
import { SEAT_KEEP_SECONDS } from './desktop-bot-links';
import {
  activitySeatName,
  formatSince,
  heartbeatActionKind,
  heartbeatActionLabel,
  type AutoSeatRow,
  type BotActivityItem,
} from './desktop-auto-state';

export type CrewTalkKind = 'work';
export type CrewLoadState = 'loading' | 'ready' | 'error';

export type CrewStageId = 'plan' | 'collect' | 'review' | 'cut';

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
  stage?: CrewStageId;
};

export function crewStageShortLabel(stage: CrewStageId, language = 'ko'): string {
  if (stage === 'review') {
    return boardCopy(language, '다시 기획', 'Review', '再策划', '再企画');
  }
  if (stage === 'plan') return seatShortLabel('planner', language);
  if (stage === 'collect') return seatShortLabel('scraper', language);
  return seatShortLabel('editor', language);
}

export type CrewTalkEntry = {
  id: string;
  kind: CrewTalkKind;
  role: BotRole | '';
  name: string;
  actionLabel: string;
  note: string;
  toName: string;
  when: string;
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

/** One job only. Presence ticks stay. Work without a spec id stays on the live wait. */
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
    const id = activitySpecId(item.detail_json);
    if (!id) return true;
    return id === want;
  });
}

export function presenceStaleMinutes(seconds: number | null | undefined): number | null {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < SEAT_KEEP_SECONDS) return null;
  return Math.max(1, Math.floor(seconds / SEAT_KEEP_SECONDS));
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
  if (role === 'scraper') return 'planner';
  if (role === 'editor') return 'desk';
  return '';
}

export function handoffTargetName(
  role: BotRole | '',
  language = 'ko',
  family: AutoSeatRow['kind'] = 'grok',
  afterCollect = false,
): string {
  const kind = family === 'custom' ? 'custom' : 'grok';
  if (role === 'planner') {
    return afterCollect
      ? seatName(kind, 'editor', language)
      : seatName(kind, 'scraper', language);
  }
  if (role === 'scraper') return seatName(kind, 'planner', language);
  if (role === 'editor') {
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
  let collectSeen = false;

  for (const row of chronological) {
    const kind = heartbeatActionKind(row.item.action);
    if (kind !== 'started' && kind !== 'ready') continue;
    const note = activityHandoffNote(row.item.detail_json);
    if (!note) continue;
    const ready = kind === 'ready';
    const afterCollect = row.role === 'planner' && collectSeen;
    thread.push({
      id: String(row.item.id || `${row.item.bot_id}-${row.item.action}-${row.item.created_at}`),
      kind: 'work',
      role: row.role,
      name: row.name,
      actionLabel: heartbeatActionLabel(row.item.action, language),
      note,
      toName: handoffTargetName(row.role, language, familyFromBotId(String(row.item.bot_id || '')) || 'grok', afterCollect),
      when: activityWhen(row.item, language),
    });
    if (row.role === 'scraper' && ready) collectSeen = true;
  }
  return thread;
}

export function crewStagePipeline(
  rows: AutoSeatRow[],
  activity: BotActivityItem[],
  language = 'ko',
): CrewPipelineSeat[] {
  const pipe = crewPipeline(rows, activity, language);
  const planner = pipe.find((seat) => seat.role === 'planner');
  const scraper = pipe.find((seat) => seat.role === 'scraper');
  const editor = pipe.find((seat) => seat.role === 'editor');
  const planRow = rows.find((row) => row.role === 'planner');
  const scrapRow = rows.find((row) => row.role === 'scraper');
  const cutRow = rows.find((row) => row.role === 'editor');
  const planKind = heartbeatActionKind(planRow?.lastAction);
  const scrapKind = heartbeatActionKind(scrapRow?.lastAction);
  const cutKind = heartbeatActionKind(cutRow?.lastAction);
  let currentStage: CrewStageId = 'plan';
  if (cutKind === 'started' || cutKind === 'ready') currentStage = 'cut';
  else if (scrapKind === 'ready') currentStage = 'review';
  else if (planKind === 'ready' || scrapKind === 'started') currentStage = 'collect';

  const missing = (stage: CrewStageId, role: BotRole): CrewPipelineSeat => ({
    key: `missing:${stage}`,
    role,
    name: seatName('grok', role, language),
    connected: false,
    current: false,
    mark: 'off',
    actionLabel: '',
    note: '',
    when: '',
    nextOfflineNote: '',
    staleMinutes: null,
    stage,
  });

  const stageOf = (stage: CrewStageId, seat: CrewPipelineSeat | undefined, role: BotRole): CrewPipelineSeat => {
    const base = seat || missing(stage, role);
    return {
      ...base,
      key: `${base.key}:${stage}`,
      current: currentStage === stage,
      mark: currentStage === stage ? 'current' : (base.connected ? 'idle' : 'off'),
      stage,
    };
  };

  return [
    stageOf('plan', planner, 'planner'),
    stageOf('collect', scraper, 'scraper'),
    stageOf('review', planner, 'planner'),
    stageOf('cut', editor, 'editor'),
  ];
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

export function crewTalkSide(role: BotRole | ''): 'in' | 'out' {
  return role === 'scraper' ? 'out' : 'in';
}

export function crewBoardEmptyCopy(language = 'ko'): { title: string; body: string } {
  return {
    title: boardCopy(language, '대기중', 'Waiting', '等待中', '待機中'),
    body: boardCopy(
      language,
      '자리마다 시작·넘김 한 줄을 남기면 여기에 대화가 쌓입니다.',
      'When each seat leaves a start or handoff line, the chat fills here.',
      '每个位子留下开工或转交的一行，对话就会堆在这里。',
      '席ごとに開始・受け渡しの一行を残すと、ここに会話が溜まります。',
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
  if (entry.note && entry.toName) return `${entry.name} → ${entry.toName}`;
  if (entry.toName) return `${entry.name} → ${entry.toName}`;
  return entry.name;
}
