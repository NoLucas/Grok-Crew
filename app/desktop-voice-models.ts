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
  languages: VoiceCopy;
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
      en: 'Default. A light dubbing voice. Next downloads this one.',
      zh: '默认。轻量配音。只按下一步就下载这个。',
      ja: '初期値。軽い吹き替え。次へだけ押せばこれを受け取る。',
    },
    languages: {
      ko: '한국어 · 영어 · 중국어 · 일본어',
      en: 'Korean · English · Chinese · Japanese',
      zh: '韩语 · 英语 · 中文 · 日语',
      ja: '韓国語 · 英語 · 中国語 · 日本語',
    },
    warning: {
      ko: '메모리 4GB면 됩니다. CPU만으로도 됩니다. 외장 그래픽이 없어도 됩니다. 목소리는 복제하지 않습니다.',
      en: 'About 4GB RAM. CPU is enough. A discrete GPU is not required. It does not clone a voice.',
      zh: '大约 4GB 内存。只用 CPU 即可。不需要独立显卡。不会克隆声音。',
      ja: 'メモリ 4GB あれば足ります。CPU だけで動きます。外付け GPU は不要。声の複製はしません。',
    },
  },
  {
    id: 'step-audio-editx',
    label: 'Step Audio EditX',
    repo: 'stepfun-ai/Step-Audio-EditX',
    license: 'Apache-2.0',
    summary: {
      ko: '더 무거운 더빙. 짧은 클립용. NVIDIA 그래픽이 필요합니다.',
      en: 'Heavier dubbing. Short clips. Needs an NVIDIA GPU.',
      zh: '更重的配音。短片段。需要 NVIDIA 显卡。',
      ja: '重い吹き替え。短いクリップ向け。NVIDIA GPU が必要。',
    },
    languages: {
      ko: '한국어 · 영어 · 중국어 · 일본어',
      en: 'Korean · English · Chinese · Japanese',
      zh: '韩语 · 英语 · 中文 · 日语',
      ja: '韓国語 · 英語 · 中国語 · 日本語',
    },
    warning: {
      ko: '그래픽 메모리 12GB가 바닥입니다. 16GB가 더 안전합니다. NVIDIA + CUDA가 필요합니다. 내장 그래픽·일반 노트북에서는 받지 마세요. 한 번에 대략 30초 클립입니다. 받기도 큽니다.',
      en: '12GB VRAM is the floor; 16GB is safer. Needs NVIDIA + CUDA. Skip this on integrated graphics or a typical laptop. Clips are about 30 seconds. The download is large.',
      zh: '显存 12GB 是下限，16GB 更稳。需要 NVIDIA + CUDA。核显或普通笔记本不要下。片段大约 30 秒。下载也很大。',
      ja: 'VRAM 12GB が下限、16GB の方が安全。NVIDIA + CUDA が必要。内蔵 GPU や普通のノートでは受けないでください。クリップはおよそ 30 秒。ダウンロードも大きいです。',
    },
  },
  {
    id: 'zonos-v0.1',
    label: 'Zonos-v0.1',
    repo: 'Zyphra/Zonos-v0.1-transformer',
    license: 'Apache-2.0',
    summary: {
      ko: '44kHz 더빙. 영어·일본어·중국어는 됩니다. 한국어는 약합니다.',
      en: '44kHz dubbing. English, Japanese, and Chinese are fine. Korean is weak.',
      zh: '44kHz 配音。英日中可以。韩语偏弱。',
      ja: '44kHz の吹き替え。英・日・中は使える。韓国語は弱い。',
    },
    languages: {
      ko: '영어 · 일본어 · 중국어 (한국어 약함)',
      en: 'English · Japanese · Chinese (Korean is weak)',
      zh: '英语 · 日语 · 中文（韩语弱）',
      ja: '英語 · 日本語 · 中国語（韓国語は弱い）',
    },
    warning: {
      ko: '그래픽 메모리 약 6GB가 필요합니다. 한국 더빙이면 Kokoro-82M을 쓰세요. 이 모델을 고르면 한국어가 흐릴 수 있습니다.',
      en: 'Needs about 6GB VRAM. For Korean dubbing, use Kokoro-82M. Korean on this model can sound thin.',
      zh: '大约需要 6GB 显存。韩语配音请用 Kokoro-82M。这个模型的韩语可能发虚。',
      ja: 'VRAM およそ 6GB が必要。韓国語の吹き替えなら Kokoro-82M。このモデルの韓国語は弱く聞こえることがあります。',
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

export function needsFirstVoiceSetup(setup?: VoiceSetup | null, installed?: VoiceInstallHint | null): boolean {
  if (setup?.done) return false;
  if (installedVoiceModelId(installed)) return false;
  return true;
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

export function dubbingMustKeep(value?: unknown): string {
  const label = voiceModelLabel(value);
  return `더빙은 운영자 음성 파일이 있으면 그것만. 없으면 이 PC의 음성 모델 ${label} 하나만 쓴다. 다른 TTS는 쓰지 않는다.`;
}

export function operatorDubMustKeep(): string {
  return '더빙은 운영자가 넣은 음성 파일만. 없으면 원본 소리. TTS를 만들지 않는다.';
}

export function voiceMustKeep(input: {
  wantDubbing?: boolean;
  wantTts?: boolean;
  voiceModelId?: unknown;
  personaKeep?: string;
}): string | undefined {
  const dubbing = Boolean(input.wantDubbing);
  const tts = Boolean(input.wantTts);
  if (!dubbing && !tts) return undefined;
  if (dubbing && !tts) return operatorDubMustKeep();
  const persona = String(input.personaKeep || '').trim();
  const engine = `TTS는 이 PC의 음성 모델 ${voiceModelLabel(input.voiceModelId)} 하나만.`;
  const extra = persona ? ` ${persona}` : ' 다른 TTS는 쓰지 않는다.';
  if (!dubbing && tts) {
    return `${engine} 더빙이 꺼져 있으면 원본 소리를 덮지 않는다.${persona ? ` ${persona}` : ' 다른 TTS는 쓰지 않는다.'}`;
  }
  return `${dubbingMustKeep(input.voiceModelId)}${persona ? ` ${persona}` : extra}`;
}

export function downloadPercent(download?: VoiceDownloadStatus | null): number {
  const received = Number(download?.received_bytes || 0);
  const total = Number(download?.total_bytes || 0);
  if (!total || total < 0) return 0;
  return Math.max(0, Math.min(100, Math.round((received / total) * 100)));
}
