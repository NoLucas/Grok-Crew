import {
  isVoiceAccent,
  resolveVoiceAccent,
  voiceAccentLabel,
  type VoiceAccent,
} from './desktop-voice-personas';

export const VOICE_SETUP_KEY = 'grok-crew-voice-setup';
export const DEFAULT_VOICE_MODEL_ID = 'kokoro-82m';
export const VOICE_MODEL_IDS = ['kokoro-82m', 'step-audio-editx', 'zonos-v0.1'] as const;
/** First-open TTS picker. Must stay off the desk 3-column grid (`local-first`). */
export const VOICE_WIZARD_BODY_CLASS = 'desktop-body desktop-voice-first';

export type VoiceModelId = (typeof VOICE_MODEL_IDS)[number];

export type VoiceCopy = { ko: string; en: string; zh: string; ja: string };

export type VoiceModelInfo = {
  id: VoiceModelId;
  label: string;
  repo: string;
  license: string;
  recommended?: boolean;
  summary: VoiceCopy;
  accents: VoiceAccent[];
  warning: VoiceCopy;
};

export type VoiceSetup = {
  done: boolean;
  modelId: VoiceModelId;
};

export type VoiceDownloadStatus = {
  model_id?: string | null;
  status?: string;
  received_bytes?: number;
  total_bytes?: number;
  file?: string;
  error?: string;
};

export const VOICE_MODELS: VoiceModelInfo[] = [
  {
    id: 'kokoro-82m',
    label: 'Kokoro-82M',
    repo: 'hexgrad/Kokoro-82M',
    license: 'Apache-2.0',
    recommended: true,
    summary: {
      ko: '기본. 가벼운 더빙 목소리. 다음만 누르면 이 모델을 받습니다.',
      en: 'Default. A light dubbing voice. Tap Next to download this one.',
      zh: '默认。轻量配音。只按下一步就下载这个。',
      ja: 'おすすめ。軽い吹き替えです。次へを押すだけでダウンロードします。',
    },
    accents: ['en-us', 'en-gb', 'zh', 'ja'],
    warning: {
      ko: '메모리 4GB면 됩니다. CPU만으로도 됩니다. 외장 그래픽이 없어도 됩니다. 목소리는 복제하지 않습니다. 한국어 언어팩은 없습니다.',
      en: 'Needs about 4GB of RAM. CPU is enough. A dedicated GPU is not required. It does not clone voices. There is no Korean language pack.',
      zh: '大约需要 4GB 内存。只用 CPU 即可。不需要独立显卡。不会克隆声音。没有韩语语言包。',
      ja: 'メモリは 4GB あれば足ります。CPU だけで動きます。外付け GPU は不要です。声の複製はしません。韓国語の言語パックはありません。',
    },
  },
  {
    id: 'step-audio-editx',
    label: 'Step Audio EditX',
    repo: 'stepfun-ai/Step-Audio-EditX',
    license: 'Apache-2.0',
    summary: {
      ko: '더 무거운 더빙. 짧은 클립용. NVIDIA 그래픽이 필요합니다.',
      en: 'Heavier dubbing for short clips. Needs an NVIDIA GPU.',
      zh: '更重的配音，适合短片段。需要 NVIDIA 显卡。',
      ja: '重い吹き替えです。短いクリップ向けで、NVIDIA GPU が必要です。',
    },
    accents: ['en-us', 'en-gb', 'zh', 'ja'],
    warning: {
      ko: '그래픽 메모리 12GB가 바닥입니다. 16GB가 더 안전합니다. NVIDIA + CUDA가 필요합니다. 내장 그래픽·일반 노트북에서는 받지 마세요. 한 번에 대략 30초 클립입니다. 받기도 큽니다. 한국어 언어팩은 없습니다.',
      en: '12GB VRAM is the minimum; 16GB is safer. Needs NVIDIA + CUDA. Don’t use this on integrated graphics or a typical laptop. Clips are about 30 seconds. The download is large. There is no Korean language pack.',
      zh: '显存至少 12GB，16GB 更稳妥。需要 NVIDIA + CUDA。核显或普通笔记本请不要下载。片段大约 30 秒。下载文件也很大。没有韩语语言包。',
      ja: 'VRAM は 12GB が下限で、16GB の方が安全です。NVIDIA + CUDA が必要です。内蔵 GPU や普通のノートではダウンロードしないでください。クリップはおよそ 30 秒です。ダウンロードも大きいです。韓国語の言語パックはありません。',
    },
  },
  {
    id: 'zonos-v0.1',
    label: 'Zonos-v0.1',
    repo: 'Zyphra/Zonos-v0.1-transformer',
    license: 'Apache-2.0',
    summary: {
      ko: '44kHz 더빙. 영어·일본어·중국어는 됩니다. 한국어 언어팩은 없습니다.',
      en: '44kHz dubbing. English, Japanese, and Chinese work. There is no Korean language pack.',
      zh: '44kHz 配音。英语、日语、中文可用。没有韩语语言包。',
      ja: '44kHz の吹き替えです。英・日・中は使えます。韓国語の言語パックはありません。',
    },
    accents: ['en-us', 'en-gb', 'zh', 'ja'],
    warning: {
      ko: '그래픽 메모리 약 6GB가 필요합니다. 한국어 언어팩은 없습니다.',
      en: 'Needs about 6GB VRAM. There is no Korean language pack.',
      zh: '大约需要 6GB 显存。没有韩语语言包。',
      ja: 'VRAM およそ 6GB が必要。韓国語の言語パックはありません。',
    },
  },
];

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function isVoiceModelId(value: unknown): value is VoiceModelId {
  return VOICE_MODEL_IDS.includes(String(value || '') as VoiceModelId);
}

export function resolveVoiceModelId(value?: unknown): VoiceModelId {
  const raw = String(value || '').trim().toLowerCase();
  return isVoiceModelId(raw) ? raw : DEFAULT_VOICE_MODEL_ID;
}

export function voiceModelInfo(value?: unknown): VoiceModelInfo {
  const id = resolveVoiceModelId(value);
  return VOICE_MODELS.find((item) => item.id === id) ?? VOICE_MODELS[0];
}

export function voiceAccentsForModel(value?: unknown): VoiceAccent[] {
  return [...voiceModelInfo(value).accents];
}

export function preferredVoiceAccent(language?: string): VoiceAccent {
  const lang = String(language || '').slice(0, 2);
  if (lang === 'zh') return 'zh';
  if (lang === 'ja') return 'ja';
  if (lang === 'en') return 'en-us';
  return 'ko';
}

export function resolveVoiceAccentForModel(
  value?: unknown,
  modelId?: unknown,
  language?: string,
): VoiceAccent {
  const allowed = voiceAccentsForModel(modelId);
  const picked = isVoiceAccent(value) ? value : preferredVoiceAccent(language);
  return resolveVoiceAccent(picked, allowed);
}

export function voiceModelLanguageLine(value?: unknown, language = 'ko'): string {
  return voiceAccentsForModel(value).map((accent) => voiceAccentLabel(accent, language)).join(' · ');
}

export function emptyVoiceSetup(): VoiceSetup {
  return { done: false, modelId: DEFAULT_VOICE_MODEL_ID };
}

export type VoiceInstallHint = {
  active?: string | null;
  chosen?: boolean;
};

export function installedVoiceModelId(installed?: VoiceInstallHint | null): VoiceModelId | '' {
  const active = String(installed?.active || '').trim();
  return isVoiceModelId(active) ? active : '';
}

/** EXE already ships Kokoro-82M. Never block the desk on a download page. */
export function needsFirstVoiceSetup(
  _setup?: VoiceSetup | null,
  _installed?: VoiceInstallHint | null,
): boolean {
  return false;
}

export function readVoiceSetup(): VoiceSetup {
  const raw = storage()?.getItem(VOICE_SETUP_KEY);
  if (!raw) return emptyVoiceSetup();
  try {
    const parsed = JSON.parse(raw) as Partial<VoiceSetup>;
    return {
      done: Boolean(parsed.done),
      modelId: resolveVoiceModelId(parsed.modelId),
    };
  } catch {
    return emptyVoiceSetup();
  }
}

export function writeVoiceSetup(prefs: Partial<VoiceSetup>): VoiceSetup {
  const current = readVoiceSetup();
  const next: VoiceSetup = {
    done: prefs.done !== undefined ? Boolean(prefs.done) : current.done,
    modelId: resolveVoiceModelId(prefs.modelId ?? current.modelId),
  };
  storage()?.setItem(VOICE_SETUP_KEY, JSON.stringify(next));
  return next;
}

/** Next with no pick, or junk, becomes Kokoro-82M. Only one id is returned. */
export function confirmVoiceChoice(selected?: unknown): VoiceModelId {
  return resolveVoiceModelId(selected);
}

export function voiceModelLabel(value?: unknown): string {
  return voiceModelInfo(value).label;
}

function voiceLang(language?: string): 'ko' | 'en' | 'zh' | 'ja' {
  const lang = String(language || 'ko').slice(0, 2);
  return lang === 'en' || lang === 'zh' || lang === 'ja' ? lang : 'ko';
}

export function dubbingMustKeep(value?: unknown, language = 'ko'): string {
  const label = voiceModelLabel(value);
  const lang = voiceLang(language);
  if (lang === 'zh') return `配音：有操作员语音文件就只用那个。没有就只用这台电脑的语音模型 ${label}。不要用别的 TTS。`;
  if (lang === 'ja') return `吹き替えは運営者の音声ファイルがあればそれだけ。なければこの PC の音声モデル ${label} だけ。他の TTS は使わない。`;
  if (lang === 'en') return `Dubbing: use the operator audio file if present. If none, use only ${label} on this PC. Do not use another TTS.`;
  return `더빙은 운영자 음성 파일이 있으면 그것만. 없으면 이 PC의 음성 모델 ${label} 하나만 쓴다. 다른 TTS는 쓰지 않는다.`;
}

export function operatorDubMustKeep(language = 'ko'): string {
  const lang = voiceLang(language);
  if (lang === 'zh') return '配音只用操作员放进的语音文件。没有就保留原声。不要生成 TTS。';
  if (lang === 'ja') return '吹き替えは運営者が入れた音声ファイルだけ。なければ元の音。TTS は作らない。';
  if (lang === 'en') return 'Dubbing uses only the operator audio file. If none, keep the original. Do not generate TTS.';
  return '더빙은 운영자가 넣은 음성 파일만. 없으면 원본 소리. TTS를 만들지 않는다.';
}

export function voiceMustKeep(input: {
  wantDubbing?: boolean;
  wantTts?: boolean;
  voiceModelId?: unknown;
  personaKeep?: string;
  language?: string;
}): string | undefined {
  const language = input.language || 'ko';
  const lang = voiceLang(language);
  const dubbing = Boolean(input.wantDubbing);
  const tts = Boolean(input.wantTts);
  if (!dubbing && !tts) return undefined;
  if (dubbing && !tts) return operatorDubMustKeep(language);
  const persona = String(input.personaKeep || '').trim();
  const label = voiceModelLabel(input.voiceModelId);
  const engine = lang === 'zh'
    ? `TTS 只用这台电脑的语音模型 ${label}。`
    : lang === 'ja'
      ? `TTS はこの PC の音声モデル ${label} だけ。`
      : lang === 'en'
        ? `TTS uses only ${label} on this PC.`
        : `TTS는 이 PC의 음성 모델 ${label} 하나만.`;
  const noOther = lang === 'zh'
    ? '不要用别的 TTS。'
    : lang === 'ja'
      ? '他の TTS は使わない。'
      : lang === 'en'
        ? 'Do not use another TTS.'
        : '다른 TTS는 쓰지 않는다.';
  const noCover = lang === 'zh'
    ? '配音关着就不要盖原声。'
    : lang === 'ja'
      ? '吹き替えがオフなら元の音を覆わない。'
      : lang === 'en'
        ? 'If dubbing is off, do not cover the original.'
        : '더빙이 꺼져 있으면 원본 소리를 덮지 않는다.';
  if (!dubbing && tts) {
    return `${engine} ${noCover}${persona ? ` ${persona}` : ` ${noOther}`}`;
  }
  return `${dubbingMustKeep(input.voiceModelId, language)}${persona ? ` ${persona}` : ` ${noOther}`}`;
}

export function downloadPercent(download?: VoiceDownloadStatus | null): number {
  const received = Number(download?.received_bytes || 0);
  const total = Number(download?.total_bytes || 0);
  if (!total || total < 0) return 0;
  return Math.max(0, Math.min(100, Math.round((received / total) * 100)));
}
