import type { VoiceAccent, VoiceFeel, VoiceGender } from './desktop-voice-personas';

export const VOICE_PREVIEW_PHRASE: Record<VoiceAccent, string> = {
  ko: '안녕하세요 Grok Crew 입니다 잘부탁드려요',
  'en-us': 'Hello. This is Grok Crew. Nice to meet you.',
  'en-gb': 'Hello. This is Grok Crew. Nice to meet you.',
  zh: '你好，我是 Grok Crew，请多关照。',
  ja: 'こんにちは。Grok Crewです。よろしくお願いします。',
};

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

type SpeechVoice = { lang?: string; name?: string };
type SpeechHandle = {
  cancel: () => void;
  speak: (utterance: unknown) => void;
  getVoices: () => SpeechVoice[];
};

function scoreVoice(voice: SpeechVoice, lang: string, gender: VoiceGender): number {
  const voiceLang = String(voice.lang || '').replace('_', '-');
  const name = String(voice.name || '').toLowerCase();
  let score = 0;
  if (voiceLang.toLowerCase() === lang.toLowerCase()) score += 8;
  else if (voiceLang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase())) score += 5;
  const female = /female|woman|girl|zira|samantha|karen|moira|yuna|heami|xiaoxiao|nanami|kyoko|haruka/.test(name);
  const male = /male|man|boy|david|mark|george|daniel|yunjian|keita|ichiro/.test(name);
  if (gender === 'female' && female) score += 3;
  if (gender === 'male' && male) score += 3;
  if (gender === 'female' && male) score -= 2;
  if (gender === 'male' && female) score -= 2;
  return score;
}

export function pickPreviewVoice(
  voices: SpeechVoice[],
  lang: string,
  gender: VoiceGender,
): SpeechVoice | null {
  let best: SpeechVoice | null = null;
  let bestScore = 0;
  for (const voice of voices) {
    const score = scoreVoice(voice, lang, gender);
    if (score > bestScore) {
      best = voice;
      bestScore = score;
    }
  }
  return bestScore > 0 ? best : null;
}

export function playVoicePreview(
  input: { accent: VoiceAccent; gender?: VoiceGender; feel?: VoiceFeel },
  speech?: SpeechHandle | null,
): 'playing' | 'blocked' {
  const handle = speech ?? (typeof window !== 'undefined' ? window.speechSynthesis as SpeechHandle | undefined : undefined);
  if (!handle?.speak) return 'blocked';
  const lang = voicePreviewLang(input.accent);
  const text = voicePreviewPhrase(input.accent);
  const gender = input.gender === 'male' ? 'male' : 'female';
  const utterance = typeof SpeechSynthesisUtterance === 'function'
    ? new SpeechSynthesisUtterance(text)
    : { text, lang, rate: voicePreviewRate(input.feel || 'warm'), voice: null as SpeechVoice | null };
  utterance.lang = lang;
  utterance.rate = voicePreviewRate(input.feel || 'warm');
  const voice = pickPreviewVoice(handle.getVoices?.() ?? [], lang, gender);
  if (voice && 'voice' in utterance) utterance.voice = voice as SpeechSynthesisVoice;
  try {
    handle.cancel();
    handle.speak(utterance);
    return 'playing';
  } catch {
    return 'blocked';
  }
}

export function stopVoicePreview(speech?: SpeechHandle | null) {
  const handle = speech ?? (typeof window !== 'undefined' ? window.speechSynthesis as SpeechHandle | undefined : undefined);
  handle?.cancel?.();
}
