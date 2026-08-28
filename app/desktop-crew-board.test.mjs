import assert from 'node:assert/strict';
import { register } from 'node:module';
import { describe, it } from 'node:test';

register('./timeline/ts-resolver.helper.mjs', import.meta.url);

const {
  activityForSpec,
  activityHandoffNote,
  activitySpecId,
  crewBoardScope,
  crewPipeline,
  crewTalkLine,
  crewNowLine,
  crewTalkMemo,
  crewTalkThread,
  handoffTargetName,
  nextSeatOfflineNote,
  parseActivityDetail,
  presenceStaleCopy,
  presenceStaleMinutes,
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
    assert.equal(thread[1].note, '카페 간판 두 장');
    assert.equal(thread[1].toName, 'Grok Bot 편집자');
    assert.equal(thread.length, 3);
    assert.doesNotMatch(JSON.stringify(thread), /plan_ready|collect_ready|still_here|hacked|\?\?\?|이 자리에 있음/);
    assert.match(crewTalkLine(thread[0], 'ko'), /기획자 → Grok Bot 스크래핑/);
  });

  it('keeps seat-check ticks off the talk list', () => {
    const now = Date.now();
    const thread = crewTalkThread([
      { id: 'c', bot_id: 'grok-planner', action: 'still_here', created_at: new Date(now - 10_000).toISOString() },
      { id: 'b', bot_id: 'grok-scraper', action: 'still_here', created_at: new Date(now - 70_000).toISOString() },
      { id: 'a', bot_id: 'grok-planner', action: 'still_here', created_at: new Date(now - 130_000).toISOString() },
    ], 'ko');
    assert.equal(thread.length, 0);
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
    assert.match(pipe[1].actionLabel, /공개 자료 고르는 중/);
    assert.match(crewNowLine(pipe, 'ko'), /기획자 · 컷 계획 남김|스크래핑 · 공개 자료 고르는 중/);
    assert.doesNotMatch(JSON.stringify(pipe), /plan_ready|collect_started|할 일은 아직 안 적음/);
  });

  it('keeps one spec’s work lines and leaves yesterday out', () => {
    const today = [
      { id: '2', bot_id: 'grok-planner', action: 'plan_ready', detail_json: { note: '오늘', edit_spec_id: 'spec-today' } },
      { id: '1', bot_id: 'grok-planner', action: 'plan_ready', detail_json: { note: '어제', edit_spec_id: 'spec-old' } },
      { id: '0', bot_id: 'grok-planner', action: 'still_here' },
    ];
    assert.equal(activitySpecId({ edit_spec_id: 'spec-today' }), 'spec-today');
    const scoped = activityForSpec(today, 'spec-today');
    assert.equal(scoped.filter((item) => item.action === 'plan_ready').length, 1);
    assert.equal(activityHandoffNote(scoped.find((item) => item.action === 'plan_ready')?.detail_json), '오늘');
    assert.equal(scoped.some((item) => item.action === 'still_here'), true);
  });

  it('keeps the real note and only marks the next seat offline after a ready handoff', () => {
    const rows = autoSeatRows({
      roster: {
        bots: [
          { bot_id: 'grok-planner', display_name: 'Grok Bot 기획자', presence: 'active', last_action: 'plan_ready', seconds_since_checkin: 180 },
        ],
      },
      language: 'ko',
    });
    assert.match(nextSeatOfflineNote(rows, 'planner', 'ko', 'grok'), /연결되지않음/);
    assert.equal(presenceStaleMinutes(180), 3);
    assert.match(presenceStaleCopy(3, 'ko'), /3분 끊김/);
    const pipe = crewPipeline(rows, [
      { id: '1', bot_id: 'grok-planner', action: 'plan_ready', created_at: new Date().toISOString(), detail_json: { note: '넘긴 말' } },
    ], 'ko');
    assert.equal(pipe[0].note, '넘긴 말');
    assert.match(pipe[0].nextOfflineNote, /연결되지않음/);
    assert.equal(pipe[0].staleMinutes, 3);
    assert.doesNotMatch(JSON.stringify(pipe), /읽었|read|읽음/);
  });

  it('does not put 연결되지않음 on a seat that has not left a ready handoff', () => {
    const rows = autoSeatRows({
      roster: {
        bots: [
          { bot_id: 'grok-planner', display_name: 'Grok Bot 기획자', presence: 'active', last_action: 'still_here' },
        ],
      },
      language: 'ko',
    });
    const pipe = crewPipeline(rows, [
      { id: '1', bot_id: 'grok-planner', action: 'still_here', created_at: new Date().toISOString() },
    ], 'ko');
    assert.equal(pipe[0].nextOfflineNote, '');
    assert.equal(pipe[0].note, '');
    assert.equal(pipe[0].actionLabel, '');
    assert.doesNotMatch(String(pipe[0].actionLabel), /할 일은 아직 안 적음|이 자리에 있음/);
  });

  it('matches the next offline seat in the same family, not the other bot kind', () => {
    const rows = autoSeatRows({
      roster: {
        bots: [
          { bot_id: 'grok-planner', display_name: 'Grok Bot 기획자', presence: 'active', last_action: 'plan_ready' },
        ],
      },
      links: {
        pairCode: 'ABCD',
        bots: [
          { id: 'c1', name: 'Agent 스크래핑', kind: 'custom', role: 'scraper', place: 'other_pc', status: 'connected', pairCode: 'ABCD' },
        ],
      },
      language: 'ko',
    });
    assert.match(nextSeatOfflineNote(rows, 'planner', 'ko', 'grok'), /연결되지않음/);
    assert.equal(nextSeatOfflineNote(rows, 'planner', 'ko', 'custom'), '');
    const pipe = crewPipeline(rows, [
      { id: '1', bot_id: 'grok-planner', action: 'plan_ready', created_at: new Date().toISOString(), detail_json: { note: '손과 간판' } },
    ], 'ko');
    const grokPlanner = pipe.find((seat) => seat.key === 'grok:planner');
    assert.equal(grokPlanner?.note, '손과 간판');
    assert.match(String(grokPlanner?.nextOfflineNote), /연결되지않음/);
  });

  it('keeps a live wait job and drops a leftover wait when a newer spec is on the board', () => {
    const today = [
      { id: '2', bot_id: 'grok-planner', action: 'plan_ready', detail_json: { note: '오늘', edit_spec_id: 'spec-today' } },
      { id: '1', bot_id: 'grok-planner', action: 'plan_ready', detail_json: { note: '어제', edit_spec_id: 'spec-old' } },
    ];
    assert.deepEqual(crewBoardScope({ specId: 'spec-today', title: '오늘 일' }, today), {
      specId: 'spec-today',
      jobTitle: '오늘 일',
    });
    assert.deepEqual(crewBoardScope({ specId: 'spec-old', title: '어제 일' }, today), {
      specId: 'spec-today',
    });
    assert.deepEqual(crewBoardScope({ specId: 'spec-wait', title: '아직' }, []), {
      specId: 'spec-wait',
      jobTitle: '아직',
    });
    assert.deepEqual(crewBoardScope({ specId: 'spec-new', title: '방금' }, today), {
      specId: 'spec-new',
      jobTitle: '방금',
    });
  });

  it('copies the thread as a local memo without inventing a line', () => {
    const memo = crewTalkMemo([
      { id: '1', kind: 'work', role: 'planner', name: 'Grok Bot 기획자', actionLabel: '컷 계획 남김', note: '손과 간판', toName: 'Grok Bot 스크래핑', when: '2분 전' },
    ], 'ko', '카페 오픈');
    assert.match(memo, /카페 오픈/);
    assert.match(memo, /기획자 → Grok Bot 스크래핑/);
    assert.match(memo, /손과 간판/);
    assert.doesNotMatch(memo, /읽었|token|LOCAL_STUDIO/);
  });
});
