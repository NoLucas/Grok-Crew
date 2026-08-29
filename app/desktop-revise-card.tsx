'use client';

import { useState } from 'react';
import { useLanguage } from './language';

type DesktopReviseCardProps = {
  attached: boolean;
  disabled?: boolean;
  saving?: boolean;
  onSubmit: (note: string) => void;
};

export function DesktopReviseCard({
  attached,
  disabled = false,
  saving = false,
  onSubmit,
}: DesktopReviseCardProps) {
  const { t } = useLanguage();
  const [note, setNote] = useState('');
  return (
    <section className="desktop-auto-card desktop-revise-card">
      <b>{t('마음에 안 들면 다시 말하기', 'If you do not like it, say it again', '不满意就再说一遍', '気に入らなければもう一度言う')}</b>
      <p>{t('고칠 점만 적으면 새 초대문을 복사합니다. 붙인 봇 창에 그 글을 다시 넣으세요. 이 창이 봇 채팅을 대신 쓰지는 않습니다.', 'Write only what to fix. This copies a new invite. Paste that text in the attached bot window again. This window does not type in the bot chat.', '只写下要改的。会复制新的邀请。请再贴到已接上的机器人窗口。这个窗口不会替你打机器人聊天。', '直したい点だけ書くと、新しい招待文をコピーします。付けたボット窓にその文を再貼りしてください。この窓がボットのチャットを代わりに打ちません。')}</p>
      <label className="desktop-spec-field desktop-spec-wide">
        <span>{t('고칠 점', 'What to change', '要改的', '直したい点')}</span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={t('예: 간판 클로즈업을 두 번, 손 장면은 빼 주세요.', 'Example: two sign close-ups, drop the hands.', '例如：招牌特写两次，不要手的镜头。', '例: 看板クローズアップを二回、手の場面は外す。')}
          rows={3}
          disabled={saving || disabled}
        />
      </label>
      <button
        type="button"
        className="desktop-primary"
        disabled={disabled || saving || !note.trim() || !attached}
        onClick={() => {
          const next = note.trim();
          if (!next) return;
          onSubmit(next);
          setNote('');
        }}
      >
        {saving
          ? t('보내는 중…', 'Sending…', '发送中…', '送信中…')
          : t('이 말로 다시 만들기', 'Make it again with this', '用这句话再做', 'この言葉でもう一度作る')}
      </button>
    </section>
  );
}
