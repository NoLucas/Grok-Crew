/** Curated TTS speakers. Gender, feel, and accent — not a race clone. */

export const VOICE_GENDERS = ['female', 'male'] as const;
export const VOICE_FEELS = ['warm', 'clear', 'bright', 'calm'] as const;
export const VOICE_ACCENTS = ['ko', 'en-us', 'en-gb', 'zh', 'ja'] as const;

export type VoiceGender = (typeof VOICE_GENDERS)[number];
export type VoiceFeel = (typeof VOICE_FEELS)[number];
export type VoiceAccent = (typeof VOICE_ACCENTS)[number];

export type VoicePersona = {
  gender: VoiceGender;
  feel: VoiceFeel;
  accent: VoiceAccent;
  speakerId: string;
};

export const DEFAULT_VOICE_GENDER: VoiceGender = 'female';
export const DEFAULT_VOICE_FEEL: VoiceFeel = 'warm';
export const DEFAULT_VOICE_ACCENT: VoiceAccent = 'en-us';
export const DEFAULT_VOICE_SPEAKER_ID = 'af_heart';

const SPEAKERS: Record<string, string> = {
  'female:warm:ko': 'af_heart',
  'female:warm:en-us': 'af_heart',
  'female:warm:en-gb': 'bf_emma',
  'female:warm:zh': 'zf_xiaoxiao',
  'female:warm:ja': 'jf_alpha',
  'female:clear:ko': 'af_sarah',
  'female:clear:en-us': 'af_sarah',
  'female:clear:en-gb': 'bf_alice',
  'female:clear:zh': 'zf_xiaoyi',
  'female:clear:ja': 'jf_nezumi',
  'female:bright:ko': 'af_nova',
  'female:bright:en-us': 'af_nova',
  'female:bright:en-gb': 'bf_lily',
  'female:bright:zh': 'zf_xiaoni',
  'female:bright:ja': 'jf_tebukuro',
  'female:calm:ko': 'af_river',
  'female:calm:en-us': 'af_river',
  'female:calm:en-gb': 'bf_isabella',
  'female:calm:zh': 'zf_xiaobei',
  'female:calm:ja': 'jf_gongitsune',
  'male:warm:ko': 'am_liam',
  'male:warm:en-us': 'am_liam',
  'male:warm:en-gb': 'bm_george',
  'male:warm:zh': 'zm_yunxia',
  'male:warm:ja': 'jm_kumo',
  'male:clear:ko': 'am_michael',
  'male:clear:en-us': 'am_michael',
  'male:clear:en-gb': 'bm_daniel',
  'male:clear:zh': 'zm_yunxi',
  'male:clear:ja': 'jm_kumo',
  'male:bright:ko': 'am_puck',
  'male:bright:en-us': 'am_puck',
  'male:bright:en-gb': 'bm_fable',
  'male:bright:zh': 'zm_yunyang',
  'male:bright:ja': 'jm_kumo',
  'male:calm:ko': 'am_onyx',
  'male:calm:en-us': 'am_onyx',
  'male:calm:en-gb': 'bm_lewis',
  'male:calm:zh': 'zm_yunjian',
  'male:calm:ja': 'jm_kumo',
};

export function isVoiceGender(value: unknown): value is VoiceGender {
  return VOICE_GENDERS.includes(String(value || '') as VoiceGender);
}

export function isVoiceFeel(value: unknown): value is VoiceFeel {
  return VOICE_FEELS.includes(String(value || '') as VoiceFeel);
}

export function isVoiceAccent(value: unknown): value is VoiceAccent {
  return VOICE_ACCENTS.includes(String(value || '') as VoiceAccent);
}

export function resolveVoiceGender(value?: unknown): VoiceGender {
  return isVoiceGender(value) ? value : DEFAULT_VOICE_GENDER;
}

export function resolveVoiceFeel(value?: unknown): VoiceFeel {
  return isVoiceFeel(value) ? value : DEFAULT_VOICE_FEEL;
}

export function resolveVoiceAccent(
  value?: unknown,
  allowed?: readonly VoiceAccent[],
): VoiceAccent {
  const raw = isVoiceAccent(value) ? value : DEFAULT_VOICE_ACCENT;
  if (!allowed || allowed.length === 0) return raw;
  if (allowed.includes(raw)) return raw;
  if (allowed.includes(DEFAULT_VOICE_ACCENT)) return DEFAULT_VOICE_ACCENT;
  return allowed[0];
}

export function resolveVoicePersona(input: {
  gender?: unknown;
  feel?: unknown;
  accent?: unknown;
  allowedAccents?: readonly VoiceAccent[];
} = {}): VoicePersona {
  const gender = resolveVoiceGender(input.gender);
  const feel = resolveVoiceFeel(input.feel);
  const accent = resolveVoiceAccent(input.accent, input.allowedAccents);
  const speakerId = SPEAKERS[`${gender}:${feel}:${accent}`] || DEFAULT_VOICE_SPEAKER_ID;
  return { gender, feel, accent, speakerId };
}

export function voiceGenderLabel(gender: VoiceGender, language = 'ko'): string {
  const lang = language.slice(0, 2);
  if (gender === 'male') {
    if (lang === 'zh') return '男声';
    if (lang === 'ja') return '男の声';
    return lang === 'en' ? 'Male' : '남자';
  }
  if (lang === 'zh') return '女声';
  if (lang === 'ja') return '女の声';
  return lang === 'en' ? 'Female' : '여자';
}

export function voiceFeelLabel(feel: VoiceFeel, language = 'ko'): string {
  const lang = language.slice(0, 2);
  if (feel === 'clear') {
    if (lang === 'zh') return '清晰';
    if (lang === 'ja') return 'はっきりした';
    return lang === 'en' ? 'Clear' : '또렷한';
  }
  if (feel === 'bright') {
    if (lang === 'zh') return '明亮';
    if (lang === 'ja') return '明るい';
    return lang === 'en' ? 'Bright' : '밝은';
  }
  if (feel === 'calm') {
    if (lang === 'zh') return '沉稳';
    if (lang === 'ja') return '落ち着いた';
    return lang === 'en' ? 'Calm' : '차분한';
  }
  if (lang === 'zh') return '温暖';
  if (lang === 'ja') return 'あたたかい';
  return lang === 'en' ? 'Warm' : '따뜻한';
}

export function voiceAccentLabel(accent: VoiceAccent, language = 'ko'): string {
  const lang = language.slice(0, 2);
  if (accent === 'en-us') {
    if (lang === 'zh') return '美式英语';
    if (lang === 'ja') return 'アメリカ英語';
    return lang === 'en' ? 'US English' : '미국 영어';
  }
  if (accent === 'en-gb') {
    if (lang === 'zh') return '英式英语';
    if (lang === 'ja') return 'イギリス英語';
    return lang === 'en' ? 'UK English' : '영국 영어';
  }
  if (accent === 'zh') {
    if (lang === 'zh') return '中文';
    if (lang === 'ja') return '中国語';
    return lang === 'en' ? 'Chinese' : '중국어';
  }
  if (accent === 'ja') {
    if (lang === 'zh') return '日语';
    if (lang === 'ja') return '日本語';
    return lang === 'en' ? 'Japanese' : '일본어';
  }
  if (lang === 'zh') return '韩语';
  if (lang === 'ja') return '韓国語';
  return lang === 'en' ? 'Korean' : '한국어';
}

export function voicePersonaLabel(persona: VoicePersona, language = 'ko'): string {
  return `${voiceFeelLabel(persona.feel, language)} ${voiceGenderLabel(persona.gender, language)} · ${voiceAccentLabel(persona.accent, language)}`;
}

export function voicePersonaKeep(persona: VoicePersona): string {
  return `목소리는 ${voicePersonaLabel(persona, 'ko')}. 화자는 ${persona.speakerId} 하나만. 사람을 복제하지 않는다. 다른 화자·TTS는 쓰지 않는다.`;
}
