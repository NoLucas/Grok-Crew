import { resolveVoiceAccentForModel, voiceAccentsForModel } from './desktop-voice-models';
import {
  resolveVoicePersona,
  type VoiceAccent,
  type VoiceFeel,
  type VoiceGender,
} from './desktop-voice-personas';

export const VOICE_PREVIEW_ENGINE = 'kokoro-82m';

export const VOICE_PREVIEW_PHRASE: Record<VoiceAccent, string> = {
  ko: '안녕하세요 Grok Crew 입니다 잘부탁드려요',
  'en-us': 'Hello. This is Grok Crew. Nice to meet you.',
  'en-gb': 'Hello. This is Grok Crew. Nice to meet you.',
  zh: '你好，我是 Grok Crew，请多关照。',
  ja: 'こんにちは。Grok Crewです。よろしくお願いします。',
};

export type VoicePreviewStatus = 'playing' | 'blocked' | 'missing';

export function voicePreviewPhrase(accent: VoiceAccent): string {
  return VOICE_PREVIEW_PHRASE[accent] || VOICE_PREVIEW_PHRASE.ko;
}

export function voicePreviewLang(accent: VoiceAccent): string {
  if (accent === 'en-us') return 'en-US';
  if (accent === 'en-gb') return 'en-GB';
  if (accent === 'zh') return 'zh-CN';
  if (accent === 'ja') return 'ja-JP';
  return 'ko-KR';
}

export function voicePreviewRate(feel: VoiceFeel): number {
  if (feel === 'bright') return 1.08;
  if (feel === 'calm') return 0.88;
  if (feel === 'warm') return 0.94;
  return 1;
}

export function voicePreviewFileName(input: {
  gender?: VoiceGender;
  feel?: VoiceFeel;
  accent?: VoiceAccent;
}): string {
  const persona = resolveVoicePersona(input);
  return `${persona.gender}__${persona.feel}__${persona.accent}.wav`;
}

export function voicePreviewMediaUrl(
  input: { gender?: VoiceGender; feel?: VoiceFeel; accent?: VoiceAccent },
  studioOrigin = '',
): string {
  const base = studioOrigin.replace(/\/$/, '');
  return `${base}/media/voice-previews/${voicePreviewFileName(input)}`;
}

type PreviewAudio = {
  pause: () => void;
  src: string;
};

type PreviewRequest = (path: string, init?: RequestInit) => Promise<Record<string, unknown>>;

let currentAudio: PreviewAudio | null = null;

function isKokoroEngine(value: unknown): boolean {
  return String(value || '').trim().toLowerCase() === VOICE_PREVIEW_ENGINE;
}

const PREVIEW_MEDIA_PATH = /^\/media\/voice-previews\/[a-z]+__[a-z]+__(?:ko|en-us|en-gb|zh|ja)\.wav$/;

function loopbackOrigin(origin: string): boolean {
  try {
    const host = new URL(origin).hostname.toLowerCase();
    return host === '127.0.0.1' || host === 'localhost' || host === '::1';
  } catch {
    return false;
  }
}

function trustedPreviewUrl(returned: string, expectedPath: string, studioOrigin = ''): string {
  const base = studioOrigin.replace(/\/$/, '');
  const fallback = base ? `${base}${expectedPath}` : expectedPath;
  const raw = String(returned || '').trim();
  if (!raw || !PREVIEW_MEDIA_PATH.test(expectedPath)) return fallback;
  if (raw === expectedPath) return fallback;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return fallback;
    if (!loopbackOrigin(parsed.origin)) return fallback;
    if (parsed.pathname !== expectedPath) return fallback;
    return parsed.toString();
  } catch {
    return fallback;
  }
}

export function stopVoicePreview(audio: PreviewAudio | null = currentAudio) {
  const handle = audio ?? currentAudio;
  if (!handle) return;
  try {
    handle.pause();
    handle.src = '';
  } catch {
    /* already stopped */
  }
  if (handle === currentAudio) currentAudio = null;
}

async function playHtmlAudio(url: string): Promise<void> {
  if (typeof Audio !== 'function') throw new Error('blocked');
  const audio = new Audio(url);
  currentAudio = audio;
  await new Promise<void>((resolve, reject) => {
    audio.onplaying = () => resolve();
    audio.onerror = () => reject(new Error('blocked'));
    const started = audio.play();
    if (started && typeof started.then === 'function') {
      started.then(() => resolve()).catch(() => reject(new Error('blocked')));
    }
  });
}

export async function playVoicePreview(
  input: { accent: VoiceAccent; gender?: VoiceGender; feel?: VoiceFeel; modelId?: string },
  deps?: {
    request?: PreviewRequest;
    studioOrigin?: string;
    play?: (url: string) => Promise<void>;
  },
): Promise<VoicePreviewStatus> {
  stopVoicePreview();
  const accent = resolveVoiceAccentForModel(input.accent, input.modelId);
  const persona = resolveVoicePersona({
    ...input,
    accent,
    allowedAccents: voiceAccentsForModel(input.modelId),
  });
  const studioOrigin = deps?.studioOrigin || '';
  let url = '';
  let missing = false;
  if (deps?.request) {
    try {
      const data = await deps.request('/api/v2/first-run/voice-preview', {
        method: 'POST',
        body: JSON.stringify({
          gender: persona.gender,
          feel: persona.feel,
          accent: persona.accent,
          speaker_id: persona.speakerId,
          model_id: input.modelId,
        }),
      });
      if (data.engine != null && !isKokoroEngine(data.engine)) return 'blocked';
      const expectedPath = `/media/voice-previews/${voicePreviewFileName(persona)}`;
      const returned = String(data.url || '').trim();
      if (returned) url = trustedPreviewUrl(returned, expectedPath, studioOrigin);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error || '');
      missing = /not on this PC|voice_missing|Kokoro-82M is not installed/i.test(message);
    }
  }
  if (!url && studioOrigin) url = voicePreviewMediaUrl(persona, studioOrigin);
  if (!url) {
    const page = typeof window !== 'undefined' ? window.location.origin : '';
    if (page) url = `${page}/voice-previews/${voicePreviewFileName(persona)}`;
  }
  if (!url) return missing ? 'missing' : 'blocked';
  try {
    if (deps?.play) await deps.play(url);
    else await playHtmlAudio(url);
    return 'playing';
  } catch {
    return missing ? 'missing' : 'blocked';
  }
}
