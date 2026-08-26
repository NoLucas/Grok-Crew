'use client';

import { useLanguage } from './language';
import {
  THEME_OPTIONS,
  TYPE_SIZE_OPTIONS,
  type DesktopAppearance,
  type DesktopTheme,
  type DesktopTypeSize,
} from './desktop-appearance';

type Variant = 'card' | 'compact' | 'menu';

type Props = {
  appearance: DesktopAppearance;
  onChange: (patch: Partial<DesktopAppearance>) => void;
  variant?: Variant;
};

export function DesktopAppearanceControls({ appearance, onChange, variant = 'card' }: Props) {
  const { t } = useLanguage();
  const selectedTheme = THEME_OPTIONS.find((option) => option.id === appearance.theme) ?? THEME_OPTIONS[0];

  const themeHint = {
    light: t('지금 기본. 흰 바탕, 진한 글자.', 'Current default. White desk, dark type.', '当前默认。白底深字。', 'いまの初期値。白い机、濃い文字。'),
    dark: t('어두운 바탕, 밝은 글자.', 'Dark desk, light type.', '深色桌面，浅色文字。', '暗い机、明るい文字。'),
    'low-light': t('덜 눈부신 베이지 라이트.', 'Softer beige light, less glare.', '低眩光米色浅色。', 'まぶしさを抑えたベージュのライト。'),
    'low-dark': t('대비를 낮춘 밤 화면.', 'Dim night desk, lower contrast.', '低对比夜间深色。', 'コントラストを抑えた夜の画面。'),
  }[appearance.theme];

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
              {t(
                option.label,
                option.id === 'light' ? 'Light' : option.id === 'dark' ? 'Dark' : option.id === 'low-light' ? 'LOW light' : 'LOW dark',
                option.id === 'light' ? '浅色' : option.id === 'dark' ? '深色' : option.id === 'low-light' ? 'LOW 浅色' : 'LOW 深色',
                option.id === 'light' ? 'ライト' : option.id === 'dark' ? 'ダーク' : option.id === 'low-light' ? 'LOW ライト' : 'LOW ダーク',
              )}
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
              : t('글자를 가늘게 해서 덜 답답하게 합니다.', 'Type sits lighter on the desk.', '文字变细，画面更松。', '文字を細くして余白を出します。')}
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

  if (variant === 'menu') {
    return (
      <div className="desktop-appearance-pop">
        <p className="desktop-appearance-pop-kicker">{selectedTheme.label}</p>
        {body}
      </div>
    );
  }

  return (
    <section className={variant === 'compact' ? 'desktop-card desktop-appearance-card is-compact' : 'desktop-card desktop-appearance-card'}>
      <div className="desktop-card-title">
        <span>Aa</span>
        <div>
          <b>{t('화면', 'Display', '画面', '画面')}</b>
          <small>{t('라이트·다크·글자. 이 컴퓨터에만 기억합니다.', 'Light, dark, and type. Remembered on this computer.', '浅色、深色和文字。只记在这台电脑。', 'ライト・ダーク・文字。このPCだけに覚えます。')}</small>
        </div>
      </div>
      {body}
    </section>
  );
}
