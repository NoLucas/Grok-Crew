'use client';

import { useLanguage } from './language';
import {
  crewBoardEmptyCopy,
  crewBoardErrorCopy,
  crewPipeline,
  crewTalkLine,
  crewTalkThread,
  type CrewLoadState,
} from './desktop-crew-log';
import type { AutoSeatRow, BotActivityItem } from './desktop-auto-state';

export function DesktopCrewBoard({
  rows,
  activity,
  loadState,
  onRetry,
}: {
  rows: AutoSeatRow[];
  activity: BotActivityItem[];
  loadState: CrewLoadState;
  onRetry?: () => void;
}) {
  const { t, language } = useLanguage();
  const pipeline = crewPipeline(rows, activity, language);
  const thread = crewTalkThread(activity, language);
  const workLines = thread.filter((entry) => entry.kind === 'work');
  const empty = crewBoardEmptyCopy(language);
  const failed = crewBoardErrorCopy(language);

  return (
    <section className="desktop-crew-board" aria-live="polite">
      <header className="desktop-crew-board-lead">
        <b>{t('크루 보드', 'Crew board', '组员板', 'クルーボード')}</b>
        <p>{t(
          '누가 무엇을 했고, 다음 자리에 남긴 말만 봅니다. 읽었는지는 모릅니다.',
          'Who did what, and the line left for the next seat. This window does not know if it was read.',
          '谁做了什么，以及留给下一位子的话。不知道读没读。',
          '誰が何をして、次の席に残した言葉だけ見ます。読んだかは分かりません。',
        )}</p>
      </header>

      {pipeline.length ? (
        <ol className="desktop-crew-pipe">
          {pipeline.map((seat, index) => (
            <li key={seat.key} data-mark={seat.mark} data-role={seat.role}>
              {index > 0 ? <span className="desktop-crew-pipe-arrow" aria-hidden="true">→</span> : null}
              <div className="desktop-crew-pipe-card">
                <span className="desktop-crew-pipe-name">{seat.name}</span>
                <span className="desktop-crew-pipe-action">{seat.actionLabel}</span>
                {seat.note ? <q className="desktop-crew-pipe-note">{seat.note}</q> : null}
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
      )}

      <section className="desktop-crew-talk">
        <b>{t('주고받은 말', 'What they left each other', '他们留下的话', '残し合った言葉')}</b>
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
        {loadState !== 'error' && !workLines.length && loadState === 'ready' ? (
          <div className="desktop-crew-board-empty-card">
            <b>{empty.title}</b>
            <p>{empty.body}</p>
          </div>
        ) : null}
        {thread.length ? (
          <ol className="desktop-crew-talk-list">
            {thread.map((entry) => (
              <li key={entry.id} data-kind={entry.kind} data-role={entry.role || 'unknown'}>
                <div className="desktop-crew-talk-meta">
                  <span className="desktop-crew-talk-who">{crewTalkLine(entry, language)}</span>
                  {entry.when ? <time>{entry.when}</time> : null}
                </div>
                {entry.kind === 'work' ? (
                  <>
                    <p className="desktop-crew-talk-action">{entry.actionLabel}</p>
                    {entry.note ? <q>{entry.note}</q> : null}
                  </>
                ) : null}
              </li>
            ))}
          </ol>
        ) : null}
      </section>
    </section>
  );
}
