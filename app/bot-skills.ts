/** Built-in role skills. Bots read these on connect. This app does not scrape. */

export const BOT_ROLES = ['planner', 'scraper', 'editor'] as const;
export type BotRole = (typeof BOT_ROLES)[number];

export const BOT_SKILL_PATHS = {
  planner: '/bot-skills/planner.md',
  scraper: '/bot-skills/scraper.md',
  editor: '/bot-skills/editor.md',
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
1. 운영자가 준 말만 읽습니다. 영상 주소이거나, 원하는 편집 방법입니다.
2. 어떤 컷인지 한 줄로 정합니다. 길이, 훅, 장면 순서, 가져올 공개 자료.
3. 스크래핑 봇에게 가져올 목록을 적습니다. 로그인 막힌 인스타·틱톡은 적지 않습니다.
4. 편집자 봇에게 자를 방법만 넘깁니다. 파일을 직접 자르지 않습니다.
5. 운영자가 마음에 안 든다고 다시 말하면, 그 말만 보고 계획을 고칩니다.

## 하지 않는 일
- 이 앱의 주소를 열지 않습니다. 127.0.0.1에 붙지 않습니다.
- 사이트를 긁지 않습니다. 이 프로그램도 긁지 않습니다.
- 화질을 바꾸지 않습니다.
- 올리지 않습니다.
`;

const SCRAPER_SKILL = `---
name: grok-crew-scraper
description: Fetch only the public clips the planner named. Do not cut.
---

# Grok Crew · 스크래핑

당신은 스크래핑 봇입니다. 기획자도, 편집자도 아닙니다.

## 하는 일
1. 기획자가 적은 목록만 모읍니다. 운영자가 지정한 저장소·파일도 가져올 수 있습니다.
2. 공개 페이지만 봅니다. 쓸 수 있는 클립과 사진만 고릅니다.
3. 모은 자료를 운영자가 말한 자료함 또는 초대문의 폴더에 둡니다.
4. 목록에 없는 것을 임의로 더 긁지 않습니다.

## 하지 않는 일
- 로그인 막힌 인스타·틱톡·유튜브를 뚫지 않습니다.
- 이 앱은 스크래퍼가 아닙니다. 당신이 모읍니다.
- 127.0.0.1에 붙지 않습니다.
- 컷을 만들지 않습니다. 편집자 봇이 자릅니다.
`;

const EDITOR_SKILL = `---
name: grok-crew-editor
description: Cut the owned and collected clips using the planner's method.
---

# Grok Crew · 편집자

당신은 편집자입니다. 기획자도, 스크래핑도 아닙니다.

## 하는 일
1. 기획자가 정한 방법대로 자릅니다.
2. 자료는 운영자가 넣은 파일, 또는 스크래핑 봇이 가져온 공개 클립만 씁니다.
3. 끝난 컷을 초대문의 편집 인박스에 둡니다. 운영자가 이 Windows 창에서 받습니다.
4. 다시 계획이 오면 그 계획으로 다시 자릅니다.

## 하지 않는 일
- 화질을 바꾸지 않습니다. 규격 잠금입니다.
- 묻지 않고 올리지 않습니다.
- 127.0.0.1에 붙지 않습니다.
- 사이트를 긁지 않습니다.
`;

export function skillText(role: BotRole): string {
  if (role === 'planner') return PLANNER_SKILL.trim();
  if (role === 'scraper') return SCRAPER_SKILL.trim();
  return EDITOR_SKILL.trim();
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

export function withCrewInvite(invite: string, language = 'ko'): string {
  const text = String(invite || '').trim();
  const lang = language.slice(0, 2);
  const skillNote = lang === 'zh'
    ? '连接时收到的技能继续用。完整技能在 /bot-skills/planner.md · scraper.md · editor.md。'
    : lang === 'ja'
      ? '接続でもらったスキルを使い続ける。全文は /bot-skills/planner.md · scraper.md · editor.md。'
      : lang === 'en'
        ? 'Keep using the skill you received at connect. Full skills: /bot-skills/planner.md · scraper.md · editor.md.'
        : '연결할 때 받은 스킬을 그대로 쓰세요. 전문은 /bot-skills/planner.md · scraper.md · editor.md.';
  return [text, '', crewOrderBlock(language), skillNote, '', skillText('planner')].filter(Boolean).join('\n');
}
