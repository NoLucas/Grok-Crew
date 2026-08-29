'use client';

import { downloadPercent, type VoiceDownloadStatus, type VoiceModelId, VOICE_MODELS, voiceModelLanguageLine } from './desktop-voice-models';
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

  const chosen = VOICE_MODELS.find((item) => item.id === selected) ?? VOICE_MODELS[0];

  return (
    <section className={`desktop-voice-setup is-${variant}`} aria-labelledby="desktop-voice-title">
      <div className="desktop-voice-intro">
        {variant === 'wizard' ? (
          <p className="desktop-voice-step">
            <span>{t('첫 설치', 'First install', '首次安装', '初回インストール')}</span>
            <span>{t('1 / 1 · TTS 고르기', '1 / 1 · Pick TTS', '1 / 1 · 选择 TTS', '1 / 1 · TTS を選ぶ')}</span>
          </p>
        ) : (
          <small>{t('이 PC · 음성 모델 하나', 'This PC · one voice model', '这台电脑 · 一个语音模型', 'この PC · 音声モデルは一つ')}</small>
        )}
        <h1 id="desktop-voice-title">
          {variant === 'wizard'
            ? t('어떤 TTS를 이 PC에 받을까요', 'Which TTS should this PC download?', '这台电脑要下载哪个 TTS？', 'この PC にはどの TTS を入れますか')
            : t('이 PC의 TTS', 'TTS on this PC', '这台电脑的 TTS', 'この PC の TTS')}
        </h1>
        <p>
          {variant === 'wizard'
            ? t(
              '설치가 끝난 뒤 책상을 열기 전에 하나만 고릅니다. 고른 모델만 받습니다. 자동에서 TTS를 켠 뒤에만 씁니다. 고르지 않고 다음을 누르면 Kokoro-82M입니다.',
              'After install, pick one model before the desk opens. Only that model is downloaded. It stays unused until you turn TTS on in Auto. If you tap Next without picking, you get Kokoro-82M.',
              '安装结束后，打开工作台之前只选一个。只下载选中的模型。在自动里打开 TTS 之后才用。不选就按下一步，会下载 Kokoro-82M。',
              'インストールのあと、机を開く前に一つだけ選びます。選んだモデルだけダウンロードします。自動で TTS をオンにしたあとだけ使います。選ばずに次へを押すと Kokoro-82M です。',
            )
            : t(
              '한 번에 하나만 받습니다. 자동에서 TTS가 꺼져 있으면 쓰지 않습니다.',
              'Only one model is downloaded. If TTS is off in Auto, it stays unused.',
              '一次只下载一个。自动里如果关着 TTS 就不用。',
              '一度に一つだけです。自動で TTS がオフなら使いません。',
            )}
        </p>
        {variant === 'wizard' ? (
          <p className="desktop-voice-note">
            {t(
              '자막용 말 인식은 여기가 아닙니다. 자동에서 자막을 켠 뒤 whisper.cpp가 합니다.',
              'This screen isn’t for captions. Turn captions on in Auto — that uses whisper.cpp.',
              '这里不是字幕识别。请在自动里打开字幕，之后由 whisper.cpp 处理。',
              '字幕の音声認識はここではありません。自動で字幕をオンにすると whisper.cpp がします。',
            )}
          </p>
        ) : null}
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
                {model.recommended ? <em>{t('기본', 'Default', '默认', 'おすすめ')}</em> : null}
              </div>
              <span>{copyOf(model.summary, language)}</span>
              <small>{voiceModelLanguageLine(model.id, language)} · {model.license}</small>
              <p className="desktop-voice-warn" role="note">
                {t('사양 주의', 'Requirements', '配置要求', '動作の目安')}
                {': '}
                {copyOf(model.warning, language)}
              </p>
            </button>
          );
        })}
      </div>
      {downloading ? (
        <div className="desktop-voice-progress" aria-live="polite">
          <b>{t('고른 모델만 받는 중', 'Downloading only the chosen model', '只在下载选中的模型', '選んだモデルだけダウンロード中')}</b>
          <p>{download?.file || selected}{percent ? ` · ${percent}%` : ''}</p>
          <i style={{ width: `${percent}%` }} />
        </div>
      ) : null}
      {ready ? (
        <p className="desktop-voice-ok" aria-live="polite">
          {t('이 PC에 이 모델만 두었습니다.', 'This PC now has only this model.', '这台电脑现在只有这个模型。', 'この PC にはこのモデルだけ置いてあります。')}
        </p>
      ) : null}
      {failed ? (
        <p className="desktop-voice-error" role="alert">
          {download?.error
            || t('받지 못했습니다. 네트워크를 확인한 뒤 다시 누르세요.', 'Download failed. Check the network and try again.', '没能下载。请检查网络后再按。', 'ダウンロードできませんでした。回線を確認してもう一度。')}
        </p>
      ) : null}
      {!studioReady ? (
        <p className="desktop-voice-note">
          {t('Local Studio가 켜지면 받기를 시작합니다. 고른 값은 이미 이 창에 남습니다.', 'Download starts when Local Studio is up. Your choice is already saved in this window.', 'Local Studio 启动后开始下载。选择已留在这个窗口。', 'Local Studio が起動すればダウンロードを始めます。選んだ値はこの窓に残っています。')}
        </p>
      ) : null}
      <div className="desktop-voice-actions">
        <button type="button" className="desktop-primary" disabled={busy || downloading} onClick={onConfirm}>
          {variant === 'wizard'
            ? t(`${chosen.label} 받고 책상 열기`, `Download ${chosen.label} and open the desk`, `下载 ${chosen.label} 并打开工作台`, `${chosen.label} をダウンロードして机を開く`)
            : t('이 모델만 받기', 'Download only this model', '只下载这个模型', 'このモデルだけダウンロード')}
        </button>
        <p>
          {t(
            `${chosen.label}만 받습니다.`,
            `Only ${chosen.label} will be downloaded.`,
            `只下载 ${chosen.label}。`,
            `${chosen.label} だけダウンロードします。`,
          )}
        </p>
      </div>
    </section>
  );
}
