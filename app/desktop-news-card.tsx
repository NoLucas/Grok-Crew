'use client';

import { useState } from 'react';
import { useLanguage } from './language';
import {
  isNewsEmail,
  newsFormUrl,
  newsPayload,
  rememberNewsDismissed,
  rememberNewsSent,
  shouldShowNewsCard,
} from './desktop-news';

export function DesktopNewsCard() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [visible, setVisible] = useState(() => shouldShowNewsCard());
  const formUrl = newsFormUrl();

  if (!visible) return null;

  async function send() {
    const value = email.trim();
    if (!isNewsEmail(value)) {
      setError(t('이메일 한 줄이 필요합니다.', 'One email line is needed.', '需要一行邮箱。', 'メールが一行必要です。'));
      return;
    }
    if (!formUrl) {
      setError(t(
        '이 버전은 아직 소식을 받을 곳이 없습니다. 건너뛰면 오늘 일은 그대로입니다.',
        'This build has nowhere to keep news yet. Skip and today’s job still works.',
        '这个版本还没有收消息的地方。跳过即可，今天的事照做。',
        'この版はまだ知らせの送り先がありません。飛ばしても今日の仕事はそのままです。',
      ));
      return;
    }
    setBusy(true);
    setError('');
    try {
      const response = await fetch(formUrl, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(newsPayload(value)),
      });
      if (!response.ok) throw new Error('send');
      rememberNewsSent();
      setVisible(false);
    } catch {
      setError(t('보내지 못했습니다. 건너뛰고 오늘 일을 해도 됩니다.', 'Could not send. You can skip and do today’s job.', '没发出去。可以跳过，继续今天的事。', '送れませんでした。飛ばして今日の仕事をしてください。'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="desktop-auto-card desktop-news-card">
      <b>{t('나중에 소식', 'News later', '以后通知', 'あとで知らせ')}</b>
      <p>
        {t(
          '오늘 일은 이메일 없이 됩니다. 유료가 열리거나 새 파일이 나오면 받을 곳만 남길 수 있습니다. 영상은 안 받습니다.',
          'Today’s job works with no email. Leave a place only if you want word when paid or a new file lands. No video.',
          '今天的事不用邮箱。只在以后收费或有新文件时，可留下收信处。不收视频。',
          '今日の仕事にメールは不要です。有料や新しいファイルの知らせだけ残せます。映像は受け取りません。',
        )}
      </p>
      <label className="desktop-spec-field">
        <span>{t('이메일', 'Email', '邮箱', 'メール')}</span>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.currentTarget.value)}
          placeholder="you@example.com"
        />
      </label>
      <div className="desktop-auto-actions">
        <button type="button" disabled={busy} onClick={() => void send()}>
          {t('남기기', 'Leave it', '留下', '残す')}
        </button>
        <button
          type="button"
          className="desktop-secondary"
          disabled={busy}
          onClick={() => {
            rememberNewsDismissed();
            setVisible(false);
          }}
        >
          {t('건너뛰기', 'Skip', '跳过', 'スキップ')}
        </button>
      </div>
      {error ? <p className="desktop-spec-error" role="alert">{error}</p> : null}
    </section>
  );
}
