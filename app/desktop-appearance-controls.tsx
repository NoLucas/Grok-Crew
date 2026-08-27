'use client';

import { useLanguage } from './language';
import {
  THEME_COPY,
  THEME_OPTIONS,
  TYPE_SIZE_OPTIONS,
  type DesktopAppearance,
  type DesktopTheme,
  type DesktopTypeSize,
} from './desktop-appearance';

type Variant = 'card' | 'compact' | 'menu' | 'gear';

type Props = {
  appearance: DesktopAppearance;
  onChange: (patch: Partial<DesktopAppearance>) => void;
  variant?: Variant;
};

export function DesktopAppearanceControls({ appearance, onChange, variant = 'card' }: Props) {
  const { t } = useLanguage();
  const selectedTheme = THEME_OPTIONS.find((option) => option.id === appearance.theme) ?? THEME_OPTIONS[0];
  const themeName = (id: DesktopTheme) => t(...THEME_COPY[id].label);
  const themeHint = t(...THEME_COPY[appearance.theme].hint);

  const body = (
    <div className="desktop-appearance-body">
      <div className="desktop-appearance-row">
        <span className="desktop-appearance-label">{t('화면', 'Display', '画面', '画面')}</span>
        <div className="desktop-seg" role="radiogroup" aria-label={t('화면 모드', 'Display mode', '显示模式', '画面モード')}>
          {THEME_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={appearance.theme === option.id}
              className={appearance.theme === option.id ? 'is-on' : undefined}
              onClick={() => onChange({ theme: option.id as DesktopTheme })}
            >
              {themeName(option.id)}
            </button>
          ))}
        </div>
        {variant === 'card' ? <p className="desktop-appearance-hint">{themeHint}</p> : null}
      </div>

      <div className="desktop-appearance-row">
        <span className="desktop-appearance-label">{t('글자 강조', 'Type emphasis', '文字加粗', '文字の強調')}</span>
        <button
          type="button"
          className={appearance.emphasize ? 'desktop-appearance-toggle is-on' : 'desktop-appearance-toggle'}
          aria-pressed={appearance.emphasize}
          onClick={() => onChange({ emphasize: !appearance.emphasize })}
        >
          {appearance.emphasize
            ? t('켜짐 · 굵게', 'On · bold', '开 · 加粗', 'オン · 太字')
            : t('꺼짐 · 보통', 'Off · regular', '关 · 常规', 'オフ · 普通')}
        </button>
        {variant === 'card' ? (
          <p className="desktop-appearance-hint">
            {appearance.emphasize
              ? t('제목과 단추를 더 굵게 그립니다.', 'Titles and buttons stay heavier.', '标题和按钮更粗。', '見出しとボタンを太くします。')
              : t('글자를 가늘게 해서 덜 답답하게 합니다.', 'Type sits lighter on the screen.', '文字变细，画面更松。', '文字を細くして余白を出します。')}
          </p>
        ) : null}
      </div>

      <div className="desktop-appearance-row">
        <span className="desktop-appearance-label">{t('글자 크기', 'Type size', '文字大小', '文字サイズ')}</span>
        <div className="desktop-seg" role="radiogroup" aria-label={t('글자 크기', 'Type size', '文字大小', '文字サイズ')}>
          {TYPE_SIZE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={appearance.typeSize === option.id}
              className={appearance.typeSize === option.id ? 'is-on' : undefined}
              onClick={() => onChange({ typeSize: option.id as DesktopTypeSize })}
            >
              {t(
                option.label,
                option.id === 's' ? 'Small' : option.id === 'm' ? 'Default' : 'Large',
                option.id === 's' ? '小' : option.id === 'm' ? '默认' : '大',
                option.id === 's' ? '小さく' : option.id === 'm' ? 'ふつう' : '大きく',
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const pop = (
    <div className="desktop-appearance-pop">
      <p className="desktop-appearance-pop-kicker">{t('화면', 'Display', '画面', '画面')} · {themeName(selectedTheme.id)}</p>
      {body}
    </div>
  );

  if (variant === 'gear') {
    return (
      <details className="desktop-appearance-menu">
        <summary aria-label={t('화면 설정', 'Display settings', '显示设置', '画面設定')} title={t('화면 설정', 'Display settings', '显示设置', '画面設定')}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.03 7.03 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.59.24-1.13.56-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94L2.83 13.94a.5.5 0 0 0-.12.64l1.92 3.32c.13.23.4.32.64.22l2.39-.96c.5.38 1.04.7 1.63.94l.36 2.54c.05.24.26.42.5.42h3.84c.24 0 .45-.18.5-.42l.36-2.54c.59-.24 1.13-.56 1.63-.94l2.39.96c.24.1.51.01.64-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z" />
          </svg>
        </summary>
        {pop}
      </details>
    );
  }

  if (variant === 'menu') {
    return pop;
  }

  return (
    <section className={variant === 'compact' ? 'desktop-card desktop-appearance-card is-compact' : 'desktop-card desktop-appearance-card'}>
      <div className="desktop-card-title">
        <span>Aa</span>
        <div>
          <b>{t('화면', 'Display', '画面', '画面')}</b>
          <small>{t('낮·밤과 글자. 이 컴퓨터에만 기억합니다.', 'Day, night, and type. Remembered on this computer.', '昼夜和文字。只记在这台电脑。', '昼・夜と文字。このPCだけに覚えます。')}</small>
        </div>
      </div>
      {body}
    </section>
  );
}
