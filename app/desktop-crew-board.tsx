'use client';

import { useState } from 'react';
import { useLanguage } from './language';
import {
  activityForSpec,
  crewBoardEmptyCopy,
  crewBoardErrorCopy,
  crewPipeline,
  crewTalkLine,
  crewTalkMemo,
  crewTalkThread,
  presenceStaleCopy,
  type CrewLoadState,
} from './desktop-crew-log';
import type { AutoSeatRow, BotActivityItem } from './desktop-auto-state';

function downloadMemo(text: string, title: string) {
  const safe = String(title || 'crew-memo').replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'crew-memo';
  const stamp = new Date().toISOString().slice(0, 10);
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${safe}-${stamp}.txt`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function DesktopCrewBoard({
  rows,
  activity,
  loadState,
  specId,
  jobTitle,
  onRetry,
}: {
  rows: AutoSeatRow[];
  activity: BotActivityItem[];
  loadState: CrewLoadState;
  specId?: string;
  jobTitle?: string;
  onRetry?: () => void;
}) {
  const { t, language } = useLanguage();
  const scoped = activityForSpec(activity, specId);
  const pipeline = crewPipeline(rows, scoped, language);
  const thread = crewTalkThread(scoped, language);
  const workLines = thread.filter((entry) => entry.kind === 'work');
  const empty = crewBoardEmptyCopy(language);
  const failed = crewBoardErrorCopy(language);
  const memo = crewTalkMemo(thread, language, jobTitle);
  const [memoState, setMemoState] = useState<'idle' | 'copied' | 'saved' | 'blocked'>('idle');

  const copyMemo = async () => {
    if (!memo) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(memo);
      setMemoState('copied');
      window.setTimeout(() => setMemoState('idle'), 4000);
    } catch {
      setMemoState('blocked');
    }
  };

  const saveMemo = () => {
    if (!memo) return;
    downloadMemo(memo, jobTitle || t('주고받은 말', 'Lines they left', '他们留下的话', '残し合った言葉'));
    setMemoState('saved');
    window.setTimeout(() => setMemoState('idle'), 4000);
  };

  return (
    <section className="desktop-crew-board" aria-live="polite">
      <header className="desktop-crew-board-lead">
        <div className="desktop-crew-board-title">
          <b>{t('크루 보드', 'Crew board', '组员看板', 'クルーボード')}</b>
          {jobTitle ? <em>{jobTitle}</em> : null}
        </div>
        <p>{t(
          '누가 무엇을 했고, 다음 자리에 남긴 말만 봅니다. 읽었는지는 모릅니다.',
          'Who did what, and the line left for the next seat. This window does not know if it was read.',
          '谁做了什么，以及留给下一位子的话。不知道读没读。',
          '誰が何をして、次の席に残した言葉だけ見ます。読んだかは分かりません。',
        )}</p>
      </header>

      {!rows.length ? (
        <p className="desktop-crew-board-empty">{t(
          '붙인 자리가 아직 없습니다. 연결 글을 복사하면 여기 줄이 생깁니다.',
          'No seat is attached yet. A line appears here after you copy the connect text.',
          '还没有接上的位子。复制连接文字后这里会出现一行。',
          '付けた席はまだありません。接続文をコピーするとここに行が出ます。',
        )}</p>
      ) : pipeline.length ? (
        <ol className="desktop-crew-pipe">
          {pipeline.map((seat, index) => (
            <li key={seat.key} data-mark={seat.mark} data-role={seat.role} data-offline={seat.nextOfflineNote ? 'next' : undefined}>
              {index > 0 ? <span className="desktop-crew-pipe-arrow" aria-hidden="true">→</span> : null}
              <div className="desktop-crew-pipe-card">
                <span className="desktop-crew-pipe-name">{seat.name}</span>
                <span className="desktop-crew-pipe-action">{seat.actionLabel}</span>
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
      )}

      <section className="desktop-crew-talk">
        <div className="desktop-crew-talk-head">
          <b>{t('주고받은 말', 'Lines they left', '他们留下的话', '残し合った言葉')}</b>
          {memo ? (
            <div className="desktop-crew-board-actions">
              <button type="button" className="desktop-secondary" onClick={() => { void copyMemo(); }}>
                {memoState === 'copied'
                  ? t('복사했습니다', 'Copied', '已复制', 'コピーしました')
                  : t('복사', 'Copy', '复制', 'コピー')}
              </button>
              <button type="button" className="desktop-secondary" onClick={saveMemo}>
                {memoState === 'saved'
                  ? t('이 PC에 두었습니다', 'Saved on this PC', '已留在这台电脑', 'この PC に残しました')
                  : t('이 PC에 저장', 'Save on this PC', '保存到这台电脑', 'この PC に保存')}
              </button>
            </div>
          ) : null}
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
        {memoState === 'blocked' && memo ? (
          <textarea className="desktop-bot-paste" value={memo} readOnly rows={8} onFocus={(event) => event.currentTarget.select()} />
        ) : null}
      </section>
    </section>
  );
}
