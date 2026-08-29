import assert from 'node:assert/strict';
import { register } from 'node:module';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

register('./timeline/ts-resolver.helper.mjs', import.meta.url);

const {
  BOT_SKILL_PATHS,
  ROLE_EXTRA_SKILLS,
  crewOrderBlock,
  destinationInviteLine,
  extraSkillText,
  isBotRole,
  roleLabel,
  seatName,
  seatShortLabel,
  skillText,
  voiceInviteBlock,
  withCrewInvite,
} = await import('./bot-skills.ts');

describe('built-in bot skills', () => {
  it('names the six seats and rejects junk roles', () => {
    assert.equal(isBotRole('planner'), true);
    assert.equal(isBotRole('scraper'), true);
    assert.equal(isBotRole('editor'), true);
    assert.equal(isBotRole('runner'), false);
    assert.equal(seatName('grok', 'planner', 'ko'), 'Grok Bot 기획자');
    assert.equal(seatName('grok', 'editor', 'ko'), 'Grok Bot 편집자');
    assert.equal(seatName('grok', 'scraper', 'ko'), 'Grok Bot 스크래핑');
    assert.equal(seatName('custom', 'planner', 'ko'), 'Agent 기획자');
    assert.equal(seatName('custom', 'editor', 'en'), 'Agent Editor');
    assert.equal(roleLabel('planner', 'ko'), '기획자');
    assert.equal(seatShortLabel('planner', 'ko'), '기획');
    assert.equal(seatShortLabel('scraper', 'ko'), '스크랩');
    assert.equal(seatShortLabel('editor', 'ko'), '편집');
    assert.equal(seatShortLabel('scraper', 'en'), 'Scrap');
  });

  it('keeps Korean Korea skills in their lane and forbids loopback plus login walls', () => {
    const planner = skillText('planner');
    const scraper = skillText('scraper');
    const editor = skillText('editor');
    assert.match(planner, /기획자/);
    assert.match(planner, /다시 말하면/);
    assert.match(planner, /grok-crew-edit-plan/);
    assert.match(planner, /컷 계획서/);
    assert.match(planner, /한국만 다룹니다/);
    assert.match(planner, /원본과 보낼 곳이 다르면/);
    assert.match(planner, /중국 영상 → 한국 컷/);
    assert.match(planner, /자동 스위치/);
    assert.match(planner, /봇이 돌아가는 리눅스/);
    assert.match(planner, /직접 파일 URL/);
    assert.match(planner, /SendToAgent/);
    assert.doesNotMatch(planner, /미국 버릇|중국 버릇|일본 버릇/);
    assert.doesNotMatch(planner, /中文\(zh\)/);
    assert.doesNotMatch(planner, /日本語\(ja\)/);
    assert.doesNotMatch(planner, /git clone/);
    assert.match(scraper, /공개/);
    assert.match(scraper, /로그인 막힌/);
    assert.match(scraper, /grok-crew-public-pick/);
    assert.match(scraper, /비슷한 것/);
    assert.match(scraper, /네이버 TV 공개/);
    assert.match(scraper, /빌리빌리·니코니코를 기본으로 넣지 않습니다/);
    assert.match(scraper, /curl/);
    assert.match(scraper, /CopyFromBox/);
    assert.match(scraper, /missing: dest_path/);
    assert.doesNotMatch(scraper, /Vimeo 공개, 공개 뉴스/);
    assert.match(editor, /기획자가 정한 방법/);
    assert.match(editor, /grok-crew-cut-to-plan/);
    assert.match(editor, /첫 1–2초/);
    assert.match(editor, /자막 크게/);
    assert.match(editor, /중국 영상 → 한국 컷/);
    assert.match(editor, /한글 자막/);
    assert.match(editor, /자막 끔/);
    assert.match(editor, /Windows 자료함/);
    assert.match(editor, /수집 스킬은 없습니다/);
    assert.match(editor, /CopyFromBox/);
    assert.doesNotMatch(editor, /컷을 더 자주/);
    assert.doesNotMatch(editor, /효과는 과하지 않게/);
    assert.deepEqual(ROLE_EXTRA_SKILLS.planner, ['edit-plan']);
    assert.deepEqual(ROLE_EXTRA_SKILLS.scraper, ['public-pick']);
    assert.deepEqual(ROLE_EXTRA_SKILLS.editor, ['cut-to-plan']);
    for (const text of [planner, scraper, editor, extraSkillText('planner'), extraSkillText('scraper'), extraSkillText('editor')]) {
      assert.match(text, /127\.0\.0\.1/);
      assert.doesNotMatch(text, /git clone/);
    }
  });

  it('writes English United States skills without a Korean body', () => {
    const planner = skillText('planner', 'en');
    const scraper = skillText('scraper', 'en');
    const editor = skillText('editor', 'en');
    assert.match(planner, /You are the planner/);
    assert.match(planner, /United States only/);
    assert.match(planner, /A spoken hook/);
    assert.doesNotMatch(planner, /당신은 기획자/);
    assert.doesNotMatch(planner, /한국만 다룹니다/);
    assert.doesNotMatch(planner, /中文\(zh\)|日本語\(ja\)/);
    assert.match(scraper, /Vimeo public pages/);
    assert.match(scraper, /Do not default to Naver or Bilibili/);
    assert.doesNotMatch(scraper, /네이버 TV/);
    assert.doesNotMatch(scraper, /哔哩哔哩/);
    assert.match(editor, /You are the editor/);
    assert.match(editor, /Keep the spoken hook/);
    assert.match(editor, /TTS off/);
    assert.match(skillText('scraper', 'en', 'cn'), /Bilibili public pages/);
    assert.doesNotMatch(skillText('scraper', 'en', 'cn'), /Vimeo public pages/);
    assert.match(skillText('planner', 'ko', 'cn'), /중국만 다룹니다/);
    assert.match(skillText('planner', 'ko', 'cn'), /첫 화면이 크고 빠릅니다/);
    assert.doesNotMatch(skillText('planner', 'ko', 'cn'), /한국만 다룹니다/);
    assert.match(skillText('editor', 'ja', 'jp'), /カットは控えめに/);
    assert.match(skillText('scraper', 'zh', 'jp'), /Niconico/);
  });

  it('appends the crew order to an invite without inventing a new API', () => {
    const text = withCrewInvite('제목: 카페 오픈', 'ko');
    assert.match(text, /제목: 카페 오픈/);
    assert.match(text, /기획자/);
    assert.match(text, /스크래핑/);
    assert.match(text, /편집자/);
    assert.match(text, /이 앱은 긁지 않는다/);
    assert.match(text, /CopyFromBox/);
    assert.match(text, /직접 파일 URL/);
    assert.match(text, /보낼 나라: 한국/);
    assert.match(text, /\/bot-skills\/planner\.md/);
    assert.match(text, /\/bot-skills\/edit-plan\.md/);
    assert.match(text, /\/bot-skills\/public-pick\.md/);
    assert.match(text, /\/bot-skills\/cut-to-plan\.md/);
    assert.equal(crewOrderBlock('en').includes('This app does not scrape'), true);
    assert.match(text, /자막: 끔/);
    assert.match(text, /더빙: 끔/);
    assert.match(text, /TTS: 끔/);
    assert.match(withCrewInvite('제목: 카페 오픈', 'ko', { captions: true, dubbing: true }), /자막: 켬/);
    assert.doesNotMatch(withCrewInvite('제목: 카페 오픈', 'ko', { captions: true, dubbing: true }), /Kokoro-82M/);
    assert.match(withCrewInvite('제목: 카페 오픈', 'ko', { tts: true }), /TTS: 켬/);
    assert.match(withCrewInvite('제목: 카페 오픈', 'ko', { tts: true }), /Kokoro-82M 하나만/);
    assert.match(withCrewInvite('제목: 카페 오픈', 'ko', { tts: true }), /따뜻한 여자 · 미국 영어/);
    assert.match(voiceInviteBlock('ko', { tts: true }), /따뜻한 여자 · 미국 영어/);
    assert.doesNotMatch(voiceInviteBlock('ko', { tts: true }), /한국어/);
    assert.doesNotMatch(voiceInviteBlock('ko', { tts: true, voiceAccent: 'ko' }), /한국어/);
    assert.match(withCrewInvite('제목: 카페 오픈', 'ko', { tts: true, voiceAccent: 'ko' }), /따뜻한 여자 · 미국 영어/);
    assert.match(withCrewInvite('제목: 카페 오픈', 'ko', { tts: true, voiceGender: 'male', voiceFeel: 'clear', voiceAccent: 'zh' }), /또렷한 남자 · 중국어/);
    assert.match(withCrewInvite('제목: 카페 오픈', 'ko', { tts: true, voiceModelId: 'step-audio-editx' }), /Step Audio EditX 하나만/);
    const english = withCrewInvite('Title: cafe', 'en', {}, 'cn');
    assert.match(english, /Destination country: China/);
    assert.match(english, /This skill covers China only/);
    assert.doesNotMatch(english, /당신은 기획자/);
    assert.match(voiceInviteBlock('en'), /Captions: off/);
    assert.match(voiceInviteBlock('en'), /TTS: off/);
    assert.match(skillText('planner'), /TTS 끔/);
    assert.match(skillText('editor'), /TTS 끔/);
    assert.match(destinationInviteLine('ko', 'jp'), /일본/);
    const withSpec = withCrewInvite('제목: 카페 오픈', 'ko', {}, 'kr', 'spec-today');
    assert.match(withSpec, /edit_spec_id/);
    assert.match(withSpec, /spec-today/);
    assert.doesNotMatch(withCrewInvite('제목: 카페 오픈', 'ko'), /edit_spec_id/);
  });

  it('keeps the public skill files in lockstep', () => {
    const root = join(process.cwd(), 'public', 'bot-skills');
    const publicSkill = (name) => readFileSync(join(root, name), 'utf8').trim();
    assert.equal(skillText('planner'), `${publicSkill('planner.md')}\n\n${publicSkill('edit-plan.md')}`);
    assert.equal(skillText('scraper'), `${publicSkill('scraper.md')}\n\n${publicSkill('public-pick.md')}`);
    assert.equal(skillText('editor'), `${publicSkill('editor.md')}\n\n${publicSkill('cut-to-plan.md')}`);
    assert.equal(extraSkillText('planner'), publicSkill('edit-plan.md'));
    assert.equal(BOT_SKILL_PATHS['edit-plan'], '/bot-skills/edit-plan.md');
    assert.equal(BOT_SKILL_PATHS['public-pick'], '/bot-skills/public-pick.md');
    assert.equal(BOT_SKILL_PATHS['cut-to-plan'], '/bot-skills/cut-to-plan.md');
  });
});
