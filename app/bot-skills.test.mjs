import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const {
  BOT_SKILL_PATHS,
  ROLE_EXTRA_SKILLS,
  crewOrderBlock,
  extraSkillText,
  isBotRole,
  roleLabel,
  seatName,
  skillText,
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
  });

  it('keeps each skill in its lane and forbids loopback plus login walls', () => {
    const planner = skillText('planner');
    const scraper = skillText('scraper');
    const editor = skillText('editor');
    assert.match(planner, /기획자/);
    assert.match(planner, /다시 말하면/);
    assert.match(planner, /grok-crew-edit-plan/);
    assert.match(planner, /컷 계획서/);
    assert.match(planner, /나라 버릇/);
    assert.match(planner, /中文\(zh\)/);
    assert.match(planner, /日本語\(ja\)/);
    assert.match(planner, /원본과 보낼 곳이 다르면/);
    assert.match(planner, /중국 영상 → 한국 컷/);
    assert.doesNotMatch(planner, /git clone/);
    assert.match(scraper, /공개/);
    assert.match(scraper, /로그인 막힌/);
    assert.match(scraper, /grok-crew-public-pick/);
    assert.match(scraper, /비슷한 것/);
    assert.match(scraper, /한국 사이트만 보지 않습니다/);
    assert.match(scraper, /哔哩哔哩/);
    assert.match(scraper, /ニコニコ/);
    assert.match(editor, /기획자가 정한 방법/);
    assert.match(editor, /grok-crew-cut-to-plan/);
    assert.match(editor, /첫 1–2초/);
    assert.match(editor, /컷을 더 자주/);
    assert.match(editor, /효과는 과하지 않게/);
    assert.match(editor, /중국 영상 → 한국 컷/);
    assert.match(editor, /한글 자막/);
    assert.deepEqual(ROLE_EXTRA_SKILLS.planner, ['edit-plan']);
    assert.deepEqual(ROLE_EXTRA_SKILLS.scraper, ['public-pick']);
    assert.deepEqual(ROLE_EXTRA_SKILLS.editor, ['cut-to-plan']);
    for (const text of [planner, scraper, editor, extraSkillText('planner'), extraSkillText('scraper'), extraSkillText('editor')]) {
      assert.match(text, /127\.0\.0\.1/);
      assert.doesNotMatch(text, /git clone/);
    }
  });

  it('appends the crew order to an invite without inventing a new API', () => {
    const text = withCrewInvite('제목: 카페 오픈', 'ko');
    assert.match(text, /제목: 카페 오픈/);
    assert.match(text, /기획자/);
    assert.match(text, /스크래핑/);
    assert.match(text, /편집자/);
    assert.match(text, /이 앱은 긁지 않는다/);
    assert.match(text, /\/bot-skills\/planner\.md/);
    assert.match(text, /\/bot-skills\/edit-plan\.md/);
    assert.match(text, /\/bot-skills\/public-pick\.md/);
    assert.match(text, /\/bot-skills\/cut-to-plan\.md/);
    assert.equal(crewOrderBlock('en').includes('This app does not scrape'), true);
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
