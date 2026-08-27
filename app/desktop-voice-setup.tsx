'use client';

import { downloadPercent, type VoiceDownloadStatus, type VoiceModelId, VOICE_MODELS } from './desktop-voice-models';
import { useLanguage } from './language';

type VoiceSetupProps = {
  variant: 'wizard' | 'panel';
  selected: VoiceModelId;
  studioReady?: boolean;
  busy?: boolean;
  download?: VoiceDownloadStatus | null;
  onSelect: (id: VoiceModelId) => void;
  onConfirm: () => void;
};

function copyOf(map: { ko: string; en: string; zh: string; ja: string }, language: string) {
  const key = language.slice(0, 2) as 'ko' | 'en' | 'zh' | 'ja';
  return map[key] || map.en;
}

export function DesktopVoiceSetup({
  variant,
  selected,
  studioReady = true,
  busy = false,
  download = null,
  onSelect,
  onConfirm,
}: VoiceSetupProps) {
  const { language, t } = useLanguage();
  const percent = downloadPercent(download);
  const downloading = download?.status === 'queued' || download?.status === 'running';
  const failed = download?.status === 'failed' || Boolean(download?.error);
  const ready = download?.status === 'ready';

  return (
    <section className={`desktop-voice-setup is-${variant}`} aria-labelledby="desktop-voice-title">
      <div className="desktop-voice-intro">
        <small>{t('이 PC · 음성 모델 하나', 'This PC · one voice model', '这台电脑 · 一个语音模型', 'この PC · 音声モデルは一つ')}</small>
        <h1 id="desktop-voice-title">{t('어떤 목소리를 받을까요', 'Which voice should this PC keep?', '要收下哪一个声音？', 'どの声を受け取りますか')}</h1>
        <p>
          {t(
            '더빙에 쓸 목소리입니다. 한 번에 하나만 받습니다. 다른 모델은 꺼 둡니다. 다음만 누르면 Kokoro-82M입니다.',
            'This is the dubbing voice. Only one model is kept. Next downloads Kokoro-82M.',
            '这是配音用的声音。一次只收一个。只按下一步就是 Kokoro-82M。',
            '吹き替え用の声です。一度に一つだけ受け取ります。次へだけ押せば Kokoro-82M です。',
          )}
        </p>
        <p className="desktop-voice-note">
          {t(
            '자막용 말 인식은 여기가 아닙니다. 자동에서 자막을 켠 뒤 whisper.cpp가 합니다.',
            'This is not caption speech recognition. Turn captions on in Auto; that uses whisper.cpp.',
            '这里不是字幕识别。自动里打开字幕后，由 whisper.cpp 做。',
            '字幕の音声認識はここではありません。自動で字幕をオンにすると whisper.cpp がします。',
          )}
        </p>
      </div>
      <div className="desktop-voice-grid" role="radiogroup" aria-label={t('음성 모델', 'Voice model', '语音模型', '音声モデル')}>
        {VOICE_MODELS.map((model) => {
          const active = model.id === selected;
          return (
            <button
              key={model.id}
              type="button"
              role="radio"
              aria-checked={active}
              className={active ? 'desktop-voice-card is-selected' : 'desktop-voice-card'}
              onClick={() => onSelect(model.id)}
              disabled={busy || downloading}
            >
              <div className="desktop-voice-card-head">
                <b>{model.label}</b>
                {model.recommended ? <em>{t('기본', 'Default', '默认', '初期値')}</em> : null}
              </div>
              <span>{copyOf(model.summary, language)}</span>
              <small>{copyOf(model.languages, language)} · {model.license}</small>
              <p className="desktop-voice-warn" role="note">
                {t('사양 주의', 'Hardware warning', '配置提醒', '仕様の注意')}
                {': '}
                {copyOf(model.warning, language)}
              </p>
            </button>
          );
        })}
      </div>
      {downloading ? (
        <div className="desktop-voice-progress" aria-live="polite">
          <b>{t('고른 모델만 받는 중', 'Downloading only the chosen model', '只在下载选中的模型', '選んだモデルだけ受け取り中')}</b>
          <p>{download?.file || selected}{percent ? ` · ${percent}%` : ''}</p>
          <i style={{ width: `${percent}%` }} />
        </div>
      ) : null}
      {ready ? (
        <p className="desktop-voice-ok" aria-live="polite">
          {t('이 PC에 이 모델만 두었습니다.', 'This PC now has only this model.', '这台电脑只留下这个模型。', 'この PC にはこのモデルだけ置いてあります。')}
        </p>
      ) : null}
      {failed ? (
        <p className="desktop-voice-error" role="alert">
          {download?.error
            || t('받지 못했습니다. 네트워크를 확인한 뒤 다시 누르세요.', 'Download failed. Check the network and try again.', '没能下载。请检查网络后再按。', '受け取れませんでした。回線を確認してもう一度。')}
        </p>
      ) : null}
      {!studioReady ? (
        <p className="desktop-voice-note">
          {t('Local Studio가 켜지면 받기를 시작합니다. 고른 값은 이미 이 창에 남습니다.', 'Download starts when Local Studio is up. The choice is already saved in this window.', 'Local Studio 起来后开始下载。选择已留在这个窗口。', 'Local Studio が付けば受け取りを始めます。選んだ値はこの窓に残っています。')}
        </p>
      ) : null}
      <div className="desktop-voice-actions">
        <button type="button" className="desktop-primary" disabled={busy || downloading} onClick={onConfirm}>
          {variant === 'wizard'
            ? t('다음 · Kokoro-82M이 기본', 'Next · Kokoro-82M is the default', '下一步 · 默认 Kokoro-82M', '次へ · 初期値は Kokoro-82M')
            : t('이 모델만 받기', 'Keep only this model', '只收下这个模型', 'このモデルだけ受け取る')}
        </button>
        <p>
          {t(
            `${VOICE_MODELS.find((item) => item.id === selected)?.label || 'Kokoro-82M'}만 받습니다.`,
            `Only ${VOICE_MODELS.find((item) => item.id === selected)?.label || 'Kokoro-82M'} will be downloaded.`,
            `只下载 ${VOICE_MODELS.find((item) => item.id === selected)?.label || 'Kokoro-82M'}。`,
            `${VOICE_MODELS.find((item) => item.id === selected)?.label || 'Kokoro-82M'} だけ受け取ります。`,
          )}
        </p>
      </div>
    </section>
  );
}
