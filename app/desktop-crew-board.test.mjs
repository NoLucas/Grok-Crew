import assert from 'node:assert/strict';
import { register } from 'node:module';
import { describe, it } from 'node:test';

register('./timeline/ts-resolver.helper.mjs', import.meta.url);

const {
  activityHandoffNote,
  crewPipeline,
  crewTalkLine,
  crewTalkThread,
  handoffTargetName,
  parseActivityDetail,
} = await import('./desktop-crew-log.ts');
const { autoSeatRows } = await import('./desktop-auto-state.ts');

describe('crew board notes', () => {
  it('keeps only detail.note and never invents speech', () => {
    assert.equal(activityHandoffNote({ note: '손과 간판 3컷' }), '손과 간판 3컷');
    assert.equal(activityHandoffNote({ message: 'should not become speech' }), '');
    assert.equal(activityHandoffNote({ truncated: true, note: 'hidden' }), '');
    assert.equal(activityHandoffNote('{"note":"15초 훅"}'), '15초 훅');
    assert.deepEqual(parseActivityDetail('not-json'), {});
    assert.equal(handoffTargetName('planner', 'ko'), 'Grok Bot 스크래핑');
    assert.equal(handoffTargetName('editor', 'en'), 'this window');
  });

  it('builds a chronological handoff thread from real heartbeats', () => {
    const now = Date.now();
    const thread = crewTalkThread([
      { id: '4', bot_id: 'grok-editor', action: 'cut_started', created_at: new Date(now - 10_000).toISOString() },
      { id: '3', bot_id: 'grok-scraper', action: 'collect_ready', created_at: new Date(now - 40_000).toISOString(), detail_json: { note: '카페 간판 두 장' } },
      { id: '2', bot_id: 'grok-planner', action: 'still_here', created_at: new Date(now - 80_000).toISOString() },
      { id: '1', bot_id: 'grok-planner', action: 'plan_ready', created_at: new Date(now - 120_000).toISOString(), detail_json: { note: '15초 훅' } },
      { id: 'x', bot_id: 'mystery', action: 'hacked', created_at: new Date(now).toISOString(), detail_json: { note: 'no' } },
    ], 'ko');
    assert.equal(thread[0].name, 'Grok Bot 기획자');
    assert.equal(thread[0].note, '15초 훅');
    assert.equal(thread[0].toName, 'Grok Bot 스크래핑');
    assert.equal(thread[0].kind, 'work');
    assert.equal(thread[1].kind, 'presence');
    assert.equal(thread[1].count, 1);
    assert.equal(thread[2].note, '카페 간판 두 장');
    assert.equal(thread[2].toName, 'Grok Bot 편집자');
    assert.doesNotMatch(JSON.stringify(thread), /plan_ready|collect_ready|still_here|hacked|\?\?\?/);
    assert.match(crewTalkLine(thread[0], 'ko'), /기획자 → Grok Bot 스크래핑/);
  });

  it('groups repeated seat checks instead of flooding the board', () => {
    const now = Date.now();
    const thread = crewTalkThread([
      { id: 'c', bot_id: 'grok-planner', action: 'still_here', created_at: new Date(now - 10_000).toISOString() },
      { id: 'b', bot_id: 'grok-planner', action: 'still_here', created_at: new Date(now - 70_000).toISOString() },
      { id: 'a', bot_id: 'grok-planner', action: 'still_here', created_at: new Date(now - 130_000).toISOString() },
    ], 'ko');
    assert.equal(thread.length, 1);
    assert.equal(thread[0].kind, 'presence');
    assert.equal(thread[0].count, 3);
    assert.match(crewTalkLine(thread[0], 'ko'), /3번 자리 확인/);
  });

  it('puts the latest real note on the pipeline seat', () => {
    const rows = autoSeatRows({
      roster: {
        bots: [
          { bot_id: 'grok-planner', display_name: 'Grok Bot 기획자', presence: 'active', last_action: 'plan_ready' },
          { bot_id: 'grok-scraper', display_name: 'Grok Bot 스크래핑', presence: 'active', last_action: 'collect_started' },
        ],
      },
      language: 'ko',
    });
    const pipe = crewPipeline(rows, [
      { id: '1', bot_id: 'grok-planner', action: 'plan_ready', created_at: new Date().toISOString(), detail_json: { note: '손과 간판' } },
      { id: '2', bot_id: 'grok-scraper', action: 'collect_started', created_at: new Date().toISOString() },
    ], 'ko');
    assert.equal(pipe[0].note, '손과 간판');
    assert.equal(pipe[1].note, '');
    assert.match(pipe[0].actionLabel, /컷 계획 남김/);
    assert.doesNotMatch(JSON.stringify(pipe), /plan_ready|collect_started/);
  });
});
