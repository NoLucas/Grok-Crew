'use client';

import { useLanguage } from './language';
import {
  activityForSpec,
  crewBoardEmptyCopy,
  crewBoardErrorCopy,
  crewNowLine,
  crewStagePipeline,
  crewStageShortLabel,
  crewTalkLine,
  crewTalkThread,
  presenceStaleCopy,
  type CrewLoadState,
} from './desktop-crew-log';
import type { AutoSeatRow, BotActivityItem } from './desktop-auto-state';

export function DesktopCrewBoard({
  rows,
  activity,
  loadState,
  specId,
  jobTitle,
  layout = 'full',
  onRetry,
}: {
  rows: AutoSeatRow[];
  activity: BotActivityItem[];
  loadState: CrewLoadState;
  specId?: string;
  jobTitle?: string;
  layout?: 'full' | 'job';
  onRetry?: () => void;
}) {
  const { t, language } = useLanguage();
  const scoped = activityForSpec(activity, specId);
  const pipeline = crewStagePipeline(rows, scoped, language);
  const thread = crewTalkThread(scoped, language);
  const nowLine = crewNowLine(pipeline, language);
  const workLines = thread.filter((entry) => entry.kind === 'work' && entry.note);
  const seatNotes = pipeline
    .filter((seat) => seat.note)
    .map((seat) => ({
      id: `seat-${seat.key}`,
      kind: 'work' as const,
      role: seat.role,
      name: seat.name,
      actionLabel: seat.actionLabel,
      note: seat.note,
      toName: '',
      when: seat.when,
    }));
  const shownTalk = workLines.length ? workLines : seatNotes;
  const empty = crewBoardEmptyCopy(language);
  const failed = crewBoardErrorCopy(language);

  const pipe = !rows.length ? (
        <p className="desktop-crew-board-empty">{t(
          '붙인 자리가 아직 없습니다.',
          'No seat is attached yet.',
          '还没有接上的位子。',
          '付けた席はまだありません。',
        )}</p>
      ) : pipeline.length ? (
        <ol className="desktop-crew-pipe">
          {pipeline.map((seat, index) => (
            <li key={seat.key} data-mark={seat.mark} data-role={seat.role} data-stage={seat.stage} data-offline={seat.nextOfflineNote ? 'next' : undefined}>
              <span className="desktop-crew-pipe-arrow" aria-hidden="true">{index > 0 ? '→' : ''}</span>
              <div className="desktop-crew-pipe-card">
                <div className="desktop-crew-pipe-head">
                  <span className={`desktop-connect-lamp${seat.connected ? ' is-on' : ''}`}>
                    <i aria-hidden="true" />
                    {seat.connected
                      ? t('연결됨', 'Connected', '已连接', '接続済み')
                      : t('연결되지않음', 'Not connected', '未连接', '未接続')}
                  </span>
                  <b className="desktop-crew-pipe-short">{crewStageShortLabel(seat.stage || (seat.role === 'planner' ? 'plan' : seat.role === 'scraper' ? 'collect' : 'cut'), language)}</b>
                </div>
                <span className="desktop-crew-pipe-name">{seat.name}</span>
                {seat.actionLabel ? <span className="desktop-crew-pipe-action">{seat.actionLabel}</span> : null}
                {seat.nextOfflineNote ? <p className="desktop-crew-pipe-offline">{seat.nextOfflineNote}</p> : null}
                {seat.note ? <q className="desktop-crew-pipe-note">{seat.note}</q> : null}
                {seat.staleMinutes ? <small className="desktop-crew-pipe-stale">{presenceStaleCopy(seat.staleMinutes, language)}</small> : null}
                {seat.when ? <small>{seat.when}</small> : null}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="desktop-crew-board-empty">{t(
          '자리를 아직 읽지 못했습니다.',
          'The seats have not loaded yet.',
          '还没读到位子。',
          '席をまだ読めません。',
        )}</p>
      );

  const talk = (
      <section className="desktop-crew-talk">
        <div className="desktop-crew-talk-head">
          <b>{t('대화', 'Talk', '对话', '会話')}</b>
        </div>
        {loadState === 'loading' && !thread.length ? (
          <p className="desktop-crew-board-empty">{t('확인하는 중…', 'Reading check-ins…', '正在读取确认…', '確認を読んでいます…')}</p>
        ) : null}
        {loadState === 'error' ? (
          <div className="desktop-crew-board-error" role="alert">
            <b>{failed.title}</b>
            <p>{failed.body}</p>
            {onRetry ? (
              <button type="button" className="desktop-auto-text" onClick={onRetry}>
                {t('다시 읽기', 'Read again', '再读一次', 'もう一度読む')}
              </button>
            ) : null}
          </div>
        ) : null}
        {loadState !== 'error' && !shownTalk.length && loadState === 'ready' ? (
          <div className="desktop-crew-board-empty-card">
            <b>{empty.title}</b>
            <p>{empty.body}</p>
          </div>
        ) : null}
        {shownTalk.length ? (
          <ol className="desktop-crew-talk-list">
            {shownTalk.map((entry) => (
              <li key={entry.id} data-kind="work" data-role={entry.role || 'unknown'}>
                <div className="desktop-crew-talk-meta">
                  <span className="desktop-crew-talk-who">{crewTalkLine(entry, language)}</span>
                  {entry.when ? <time>{entry.when}</time> : null}
                </div>
                {entry.note ? <q>{entry.note}</q> : null}
              </li>
            ))}
          </ol>
        ) : null}
      </section>
  );

  return (
    <section className={`desktop-crew-board${layout === 'job' ? ' is-job' : ''}`} aria-live="polite">
      <header className="desktop-crew-board-lead">
        <div className="desktop-crew-board-title">
          <b>{layout === 'job'
            ? t('자리 넘김', 'Seat handoff', '位子转交', '席の受け渡し')
            : t('크루 보드', 'Crew board', '组员看板', 'クルーボード')}</b>
          {jobTitle ? <em>{jobTitle}</em> : null}
        </div>
        <p>{nowLine}</p>
      </header>
      {layout === 'job' ? (
        <>
          <div className="desktop-crew-handoff">
            {pipe}
          </div>
          {talk}
        </>
      ) : (
        <>
          {pipe}
          {talk}
        </>
      )}
    </section>
  );
}
