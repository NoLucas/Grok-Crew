import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const {
  crewOrderBlock,
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
    assert.doesNotMatch(planner, /git clone/);
    assert.match(scraper, /공개/);
    assert.match(scraper, /로그인 막힌/);
    assert.match(editor, /기획자가 정한 방법/);
    for (const text of [planner, scraper, editor]) {
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
    assert.equal(crewOrderBlock('en').includes('This app does not scrape'), true);
  });

  it('keeps the public skill files in lockstep', () => {
    const root = join(process.cwd(), 'public', 'bot-skills');
    assert.match(readFileSync(join(root, 'planner.md'), 'utf8'), /기획자/);
    assert.match(readFileSync(join(root, 'scraper.md'), 'utf8'), /스크래핑/);
    assert.match(readFileSync(join(root, 'editor.md'), 'utf8'), /편집자/);
  });
});
