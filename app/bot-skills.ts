/** Built-in role skills. Bots read these on connect. This app does not scrape. */

import { resolveVoiceModelId, voiceModelLabel } from './desktop-voice-models';

export const BOT_ROLES = ['planner', 'scraper', 'editor'] as const;
export type BotRole = (typeof BOT_ROLES)[number];

export const BOT_SKILL_PATHS = {
  planner: '/bot-skills/planner.md',
  scraper: '/bot-skills/scraper.md',
  editor: '/bot-skills/editor.md',
  'edit-plan': '/bot-skills/edit-plan.md',
  'public-pick': '/bot-skills/public-pick.md',
  'cut-to-plan': '/bot-skills/cut-to-plan.md',
} as const;

export const ROLE_EXTRA_SKILLS = {
  planner: ['edit-plan'],
  scraper: ['public-pick'],
  editor: ['cut-to-plan'],
} as const;

export function isBotRole(value: unknown): value is BotRole {
  return value === 'planner' || value === 'scraper' || value === 'editor';
}

export function roleLabel(role: BotRole, language = 'ko'): string {
  const lang = language.slice(0, 2);
  if (role === 'planner') {
    if (lang === 'zh') return '策划';
    if (lang === 'ja') return '企画者';
    return lang === 'en' ? 'Planner' : '기획자';
  }
  if (role === 'scraper') {
    if (lang === 'zh') return '抓取';
    if (lang === 'ja') return '収集';
    return lang === 'en' ? 'Scraper' : '스크래핑';
  }
  if (lang === 'zh') return '剪辑';
  if (lang === 'ja') return '編集者';
  return lang === 'en' ? 'Editor' : '편집자';
}

export function seatName(kind: 'grok' | 'custom' | string, role: BotRole, language = 'ko'): string {
  const family = kind === 'grok' ? 'Grok Bot' : 'Agent';
  return `${family} ${roleLabel(role, language)}`;
}

const PLANNER_SKILL = `---
name: grok-crew-planner
description: Turn the operator prompt into an edit plan. Do not cut or scrape.
---

# Grok Crew · 기획자

당신은 기획자입니다. 편집자도, 스크래핑도 아닙니다.

## 하는 일
1. 운영자가 준 말만 읽습니다. 영상 주소이거나, 원하는 편집 방법입니다. 한국어만이 아닙니다.
2. 어떤 컷인지 한 줄로 정합니다. 원본 나라·보낼 곳, 길이, 훅, 장면 순서, 컷 밀도, 효과, 가져올 공개 자료. 원본이 중국이고 보낼 곳이 한국이면 그렇게 적습니다.
3. 스크래핑 봇에게 가져올 목록을 적습니다. 원본 공개 페이지와, 적을 때만 보낼 곳 자료. 로그인 막힌 인스타·틱톡은 적지 않습니다.
4. 편집자 봇에게 자를 방법만 넘깁니다. 파일을 직접 자르지 않습니다.
5. 운영자가 마음에 안 든다고 다시 말하면, 그 말만 보고 계획을 고칩니다.

## 하지 않는 일
- 이 앱의 주소를 열지 않습니다. 127.0.0.1에 붙지 않습니다.
- 사이트를 긁지 않습니다. 이 프로그램도 긁지 않습니다.
- 화질을 바꾸지 않습니다.
- 올리지 않습니다.
`;

const EDIT_PLAN_SKILL = `---
name: grok-crew-edit-plan
description: Write a short cut plan the scraper and editor can follow.
---

# 컷 계획서

기획자만 씁니다. 스크래핑·편집자가 그대로 읽게 짧게 적습니다.

## 적을 것
1. 한 줄 목표 — 이 컷이 끝나는 느낌.
2. 보낼 곳 — ko / en / zh / ja. 이 앱은 네 언어를 씁니다. 운영자 말을 따릅니다. 한국만 가정하지 않습니다.
3. 원본 — 같으면 「같음」. 다르면 예: 원본 zh → 보낼 곳 ko.
4. 길이 — 초. 형태가 있으면 그 길이를 지킵니다.
5. 훅 — 맨 앞 1–2초. 보낼 곳에서 잘 먹히는 첫 화면. 한국이면 한글·얼굴·가게.
6. 장면 순서 — 번호, 무엇을 보여 주는지, 대략 몇 초.
7. 컷 밀도·효과 — 적음 / 중간 / 많음. 보낼 곳 버릇이 기본. 원본의 빠른 컷을 유지하라고 하면 그걸 적습니다.
8. 가져올 것 — 원본 주소·파일, 그리고 계획에 적은 보낼 곳 자료만. 로그인 막힌 인스타·틱톡·유튜브는 적지 않습니다.
9. 자를 방법 — 편집자에게 한 줄. 화면은 원본인지, 말·자막만 바꾸는지.

## 원본과 보낼 곳이 다르면
화면은 그 원본을 씁니다. 비슷한 한국 영상으로 갈아치우지 않습니다. 바꿀 것은 훅 말, 자막, 화면 글자, 가격·유행어입니다. 원본 소리가 중국어면 소리를 두고 한글 자막. 더빙은 운영자가 준 한국어 소리만. 예: 중국 영상 → 한국 컷.

## 나라 버릇
- 한국(ko): 첫 1초 글자·얼굴·가게. 자막이 큽니다. 컷은 중간, 효과는 적음. 15–30초.
- English(en): 말로 훅. 얼굴·제품. 컷은 분명, 효과는 절제.
- 中文(zh): 첫 화면이 크고 빠릅니다. 글자가 많습니다. 컷이 많고 전환이 짧습니다.
- 日本語(ja): 호흡이 조금 깁니다. 화면이 정돈됩니다. 컷은 적음~중간, 효과는 적음.

## 주소가 오면
그 영상의 쓸 장면만 계획에 적습니다. 주소의 언어는 원본입니다. 보낼 곳은 운영자 말을 따릅니다. 직접 긁거나 자르지 않습니다.

## 다시 오면
운영자가 고치라는 말만 반영합니다. 계획 전체를 새로 꾸미지 않습니다.

## 하지 말 것
127.0.0.1을 열지 않습니다. 로그인 막힌 인스타·틱톡·유튜브를 가져올 것에 적지 않습니다.

## 자동 스위치
자막·더빙은 운영자가 자동에서 켠 뒤에만 계획에 적습니다. 초대문에 「자막 끔」이면 음성인식·자막을 시키지 않습니다. 「더빙 끔」이면 소리를 바꾸지 않습니다. 「더빙 켬」이면 운영자 음성이 있을 때 그것만. 없으면 초대문에 적힌 음성 모델 하나만 씁니다. 다른 TTS는 쓰지 않습니다.
`;

const SCRAPER_SKILL = `---
name: grok-crew-scraper
description: Fetch only the public clips the planner named. Do not cut.
---

# Grok Crew · 스크래핑

당신은 스크래핑 봇입니다. 기획자도, 편집자도 아닙니다.

## 하는 일
1. 기획자가 적은 목록만 모읍니다. 운영자가 지정한 저장소·파일도 가져올 수 있습니다.
2. 공개 페이지만 봅니다. 기획이 적은 원본과, 적을 때만 보낼 곳 자료를 고릅니다. 한국 사이트만이 아닙니다.
3. 모은 자료를 운영자가 말한 자료함 또는 초대문의 폴더에 둡니다.
4. 목록에 없는 것을 임의로 더 긁지 않습니다.

## 하지 않는 일
- 로그인 막힌 인스타·틱톡·유튜브를 뚫지 않습니다.
- 이 앱은 스크래퍼가 아닙니다. 당신이 모읍니다.
- 127.0.0.1에 붙지 않습니다.
- 컷을 만들지 않습니다. 편집자 봇이 자릅니다.
`;

const PUBLIC_PICK_SKILL = `---
name: grok-crew-public-pick
description: Choose only usable public clips named in the plan.
---

# 공개 자료 고르기

스크래핑만 씁니다. 기획 목록 밖을 찾지 않습니다. 한국 사이트만 보지 않습니다.

## 나라·언어
기획의 원본과 보낼 곳을 같이 읽습니다. 영어·중국어·일본어 원본이어도 됩니다. 원본이 중국이고 보낼 곳이 한국이면 그 중국 공개 자료를 가져오고, 한국에서 비슷한 유행 영상으로 바꾸지 않습니다. 보낼 곳 자료는 계획에 적힌 것만. 그 나라 공개 창구 예: 공개 뉴스·공공·브랜드, 네이버 TV 공개, Vimeo 공개, 哔哩哔哩 공개, ニコニコ 공개. 인기 있어도 로그인·앱 전용이면 적고 건너뜁니다.

## 잘 고르는 법
1. 운영자가 지정한 저장소·파일이 있으면 그걸 먼저 씁니다.
2. 기획자가 적은 이름·주소만 봅니다. 목록에 없는 “비슷한 유행 영상”으로 바꾸지 않습니다.
3. 원본으로 적힌 클립은 말이 보낼 곳과 달라도 가져옵니다. 보낼 곳 언어가 아니라고 버리지 않습니다.
4. 형태가 세로면 세로에 가까운 클립을 고릅니다.
5. 장면마다 쓸 만한 것 하나. 더미로 쌓지 않습니다.
6. 쓸 수 있는 클립·사진만 고릅니다. 출처와 언어를 이름 옆에 적습니다.
7. 흔들리거나 어두운 것만 있으면, 없는 장면이라고 적고 넘어갑니다.

## 건너뛰기
- 로그인·결제·앱 뒤에 있는 인스타·틱톡·유튜브·더우인·샤오홍슈.
- 쓸 수 있는지 모르는 워터마크·재배포 금지 표시.
- 목록에 없는 “비슷한 것”, 다른 나라 유행으로 바꾼 것.

## 넘기는 법
모은 파일을 자료함 또는 초대문 폴더에 둡니다. 무엇을 왜 골랐는지 한 줄씩만 적습니다. 자르지 않습니다. 127.0.0.1에 붙지 않습니다.
`;

const EDITOR_SKILL = `---
name: grok-crew-editor
description: Cut the owned and collected clips using the planner's method.
---

# Grok Crew · 편집자

당신은 편집자입니다. 기획자도, 스크래핑도 아닙니다.

## 하는 일
1. 기획자가 정한 방법대로 자릅니다. 나라 스타일·컷 밀도·효과, 원본과 보낼 곳이 다를 때도 계획에 따릅니다.
2. 자료는 운영자가 넣은 파일, 또는 스크래핑 봇이 가져온 공개 클립만 씁니다.
3. 끝난 컷을 초대문의 편집 인박스에 둡니다. 운영자가 이 Windows 창에서 받습니다.
4. 다시 계획이 오면 그 계획으로 다시 자릅니다.

## 하지 않는 일
- 화질을 바꾸지 않습니다. 규격 잠금입니다.
- 묻지 않고 올리지 않습니다.
- 127.0.0.1에 붙지 않습니다.
- 사이트를 긁지 않습니다.
`;

const CUT_TO_PLAN_SKILL = `---
name: grok-crew-cut-to-plan
description: Cut in the planned order and return one finished file.
---

# 계획대로 자르기

편집자만 씁니다. 기획에 없는 장면을 만들지 않습니다.

## 자르는 법
1. 계획이 훅을 시키면 첫 1–2초에 그 화면을 둡니다.
2. 장면 번호 순서대로 붙입니다. 빠지면 있는 것만 자르고, 빠진 번호를 한 줄로 적습니다.
3. 자료는 운영자 파일과 스크래핑이 가져온 것만 씁니다.
4. 화질·해상도·프레임은 규격 그대로입니다. 더 선명하게 바꾸지 않습니다.
5. 컷 밀도와 효과는 계획이 적은 나라 버릇을 따릅니다. 계획이 다르게 적으면 계획을 따릅니다.

## 나라 스타일
- 한국(ko): 자막 크게. 컷은 중간. 효과는 적게.
- English(en): 말 훅을 살립니다. 컷은 분명하게. 효과는 필요할 때만.
- 中文(zh): 컷을 더 자주. 글자를 크게. 전환은 짧게. 효과가 많다고 적히면 그 밀도만.
- 日本語(ja): 컷을 덜 자주. 화면을 정돈. 효과는 과하지 않게.

계획에 없는 효과를 넣지 않습니다. 색·화질을 바꿔 효과를 내지 않습니다.

## 원본과 보낼 곳이 다르면
예: 중국 영상 → 한국 컷.
1. 그 원본 화면을 씁니다. 한국에서 비슷한 영상으로 갈아치우지 않습니다.
2. 첫 1–2초 훅과 자막은 보낼 곳 말. 한국이면 한글을 크게.
3. 원본 위 중국어 글자·가격·유행어는 계획이 시키면 가리거나 한글로 덮습니다.
4. 원본 말이 중국어면 소리를 두고 한글 자막. 더빙은 운영자가 준 한국어 소리만.
5. 컷 밀도는 보낼 곳(한국이면 중간). 계획이 「원본처럼 빠르게」면 빠르게.
6. 계획에 없는 한국 화면을 끼워 넣지 않습니다.

## 자동 스위치
초대문에 「자막 끔」이면 음성인식·자막을 하지 않습니다. 「자막 켬」일 때만 말 구간을 자막·word_timings로 붙입니다. 「더빙 끔」이면 원본 소리를 유지합니다. 「더빙 켬」이면 운영자 음성이 있을 때 그것만. 없으면 초대문에 적힌 음성 모델 하나만 씁니다. 다른 TTS는 쓰지 않습니다.

## 끝내는 법
끝난 컷 파일 하나를 편집 인박스에 둡니다. 묻지 않고 올리지 않습니다. 다시 계획이 오면 그 계획으로만 다시 자릅니다. 127.0.0.1에 붙지 않습니다. 사이트를 긁지 않습니다.
`;

const CORE_SKILLS: Record<BotRole, string> = {
  planner: PLANNER_SKILL,
  scraper: SCRAPER_SKILL,
  editor: EDITOR_SKILL,
};

const EXTRA_SKILLS: Record<BotRole, string> = {
  planner: EDIT_PLAN_SKILL,
  scraper: PUBLIC_PICK_SKILL,
  editor: CUT_TO_PLAN_SKILL,
};

export function extraSkillText(role: BotRole): string {
  return EXTRA_SKILLS[role].trim();
}

export function skillText(role: BotRole): string {
  return [CORE_SKILLS[role].trim(), extraSkillText(role)].join('\n\n');
}

export function crewOrderBlock(language = 'ko'): string {
  const lang = language.slice(0, 2);
  if (lang === 'zh') {
    return [
      '顺序：策划看提示 → 抓取按计划取公开素材或用操作员的文件 → 剪辑按计划剪 → 成片回到这个窗口。',
      '不满意就再对策划说一句。这个应用不抓站。',
    ].join('\n');
  }
  if (lang === 'ja') {
    return [
      '順：企画者が言葉を読む → 収集が計画の公開素材か運営者のファイルを取る → 編集者が計画どおり切る → 完成はこの窓。',
      '気に入らなければ企画者にもう一度言う。このアプリは掻きません。',
    ].join('\n');
  }
  if (lang === 'en') {
    return [
      'Order: planner reads the prompt → scraper fetches the planned public clips or uses the operator files → editor cuts to the plan → the cut returns to this window.',
      'If the cut is wrong, tell the planner again. This app does not scrape.',
    ].join('\n');
  }
  return [
    '순서: 기획자가 말을 읽는다 → 스크래핑이 계획된 공개 자료 또는 운영자 파일을 가져온다 → 편집자가 계획대로 자른다 → 컷은 이 창으로 돌아온다.',
    '마음에 안 들면 기획자에게 다시 말한다. 이 앱은 긁지 않는다.',
  ].join('\n');
}

const SKILL_INDEX = '/bot-skills/planner.md · /bot-skills/edit-plan.md · /bot-skills/scraper.md · /bot-skills/public-pick.md · /bot-skills/editor.md · /bot-skills/cut-to-plan.md';

export type VoiceInvite = {
  captions?: boolean;
  dubbing?: boolean;
  voiceModelId?: string;
};

function dubbingInviteLine(language: string, dubbing: boolean, voiceModelId?: string): string {
  const label = voiceModelLabel(resolveVoiceModelId(voiceModelId));
  const lang = language.slice(0, 2);
  if (lang === 'zh') {
    return dubbing
      ? `配音：开。有操作员语音就只用那个。没有就只用这台电脑上的 ${label}。不要用别的 TTS。`
      : '配音：关。不要配音，不要改原声。';
  }
  if (lang === 'ja') {
    return dubbing
      ? `吹き替え：オン。運営者の音声があればそれだけ。なければこの PC の ${label} だけ。他の TTS は使わない。`
      : '吹き替え：オフ。吹き替えしない。元の音を変えない。';
  }
  if (lang === 'en') {
    return dubbing
      ? `Dubbing: on. Use the operator’s audio if present. If none, use only ${label} on this PC. Do not use another TTS.`
      : 'Dubbing: off. Do not dub. Do not replace the original audio.';
  }
  return dubbing
    ? `더빙: 켬. 운영자 음성이 있으면 그것만. 없으면 이 PC의 ${label} 하나만. 다른 TTS는 쓰지 않습니다.`
    : '더빙: 끔. 더빙하지 않습니다. 원본 소리를 바꾸지 않습니다.';
}

export function voiceInviteBlock(language = 'ko', voice: VoiceInvite = {}): string {
  const captions = Boolean(voice.captions);
  const dubLine = dubbingInviteLine(language, Boolean(voice.dubbing), voice.voiceModelId);
  const lang = language.slice(0, 2);
  if (lang === 'zh') {
    return [
      captions ? '字幕：开。只识别说话的段落，再写成字幕。源语言和去向不同时只改字幕，声音仍是原片。' : '字幕：关。不要语音识别，不要烧字幕。',
      dubLine,
    ].join('\n');
  }
  if (lang === 'ja') {
    return [
      captions ? '字幕：オン。話している区間だけ認識して字幕にする。元の言語と送り先が違うときは字幕だけ変える。音は元のまま。' : '字幕：オフ。音声認識も字幕焼き込みもしない。',
      dubLine,
    ].join('\n');
  }
  if (lang === 'en') {
    return [
      captions
        ? 'Captions: on. Transcribe speech windows only and burn those lines. If source and destination differ, change captions only. Keep the original audio.'
        : 'Captions: off. Do not run speech recognition. Do not burn captions.',
      dubLine,
    ].join('\n');
  }
  return [
    captions
      ? '자막: 켬. 말 구간만 인식해 자막을 붙입니다. 원본 말과 보낼 곳이 다르면 자막만 바꿉니다. 소리는 원본입니다.'
      : '자막: 끔. 음성인식하지 않습니다. 자막을 굽지 않습니다.',
    dubLine,
  ].join('\n');
}

export function withCrewInvite(invite: string, language = 'ko', voice: VoiceInvite = {}): string {
  const text = String(invite || '').trim();
  const lang = language.slice(0, 2);
  const skillNote = lang === 'zh'
    ? `连接时收到的技能继续用。角色核心和一项辅助技能在 ${SKILL_INDEX}。`
    : lang === 'ja'
      ? `接続でもらったスキルを使い続ける。役割の本体と補助スキルは ${SKILL_INDEX}。`
      : lang === 'en'
        ? `Keep using the skill you received at connect. Role core plus one extra: ${SKILL_INDEX}.`
        : `연결할 때 받은 스킬을 그대로 쓰세요. 역할 코어와 보조 스킬은 ${SKILL_INDEX}.`;
  return [text, '', crewOrderBlock(language), voiceInviteBlock(language, voice), skillNote, '', skillText('planner')].filter(Boolean).join('\n');
}
