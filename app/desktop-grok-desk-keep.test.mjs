import assert from 'node:assert/strict';
import { register } from 'node:module';
import { describe, it } from 'node:test';

register('./timeline/ts-resolver.helper.mjs', import.meta.url);

const {
  heartbeatLastAction,
  enterGrokSeatOnDesk,
  runDeskKeepTick,
} = await import('./desktop-grok-desk-keep.ts');
const {
  confirmedGrokRoles,
  grokKeepBeatBody,
  grokSeatEntryBody,
} = await import('./desktop-bot-links.ts');

describe('desk-side Grok enter after GROK_CREW_OK', () => {
  it('builds the same bot-entry the Windows keep uses', () => {
    assert.deepEqual(grokSeatEntryBody('planner', 'ko'), {
      bot_id: 'grok-planner',
      display_name: 'Grok Bot 기획자',
      purpose: 'plan_edit',
    });
    assert.deepEqual(grokSeatEntryBody('scraper', 'ko'), {
      bot_id: 'grok-scraper',
      display_name: 'Grok Bot 스크래핑',
      purpose: 'collect',
    });
    assert.deepEqual(grokKeepBeatBody('editor', 'ko'), {
      bot_id: 'grok-editor',
      display_name: 'Grok Bot 편집자',
      action: 'still_here',
    });
  });

  it('only desk-keeps Grok seats that the operator confirmed', () => {
    assert.deepEqual(confirmedGrokRoles({
      pairCode: 'YZ3WCB',
      bots: [
        {
          id: 'grok-planner-YZ3WCB',
          name: 'Grok Bot 기획자',
          kind: 'grok',
          role: 'planner',
          place: 'other_pc',
          status: 'connected',
          pairCode: 'YZ3WCB',
          confirmedAt: '2026-08-29T00:00:00.000Z',
        },
        {
          id: 'grok-scraper-YZ3WCB',
          name: 'Grok Bot 스크래핑',
          kind: 'grok',
          role: 'scraper',
          place: 'other_pc',
          status: 'waiting',
          pairCode: 'YZ3WCB',
        },
      ],
    }), ['planner']);
  });

  it('posts bot-entry then still_here, and stops after disconnected', async () => {
    const calls = [];
    const post = async (path, body) => {
      calls.push([path, body]);
      if (path === '/api/bots/heartbeat') {
        return { bot: { last_action: body.action } };
      }
      return { entry: { bot_id: body.bot_id } };
    };
    await enterGrokSeatOnDesk({ post, role: 'planner', language: 'ko' });
    assert.equal(calls[0][0], '/api/bot-entry');
    assert.equal(calls[0][1].bot_id, 'grok-planner');
    assert.equal(await runDeskKeepTick({ post, role: 'planner', language: 'ko' }), 'ok');
    assert.equal(calls[1][0], '/api/bots/heartbeat');
    assert.equal(calls[1][1].action, 'still_here');
    assert.equal(calls.some((item) => item[0] === '/api/bots/next-invite'), false);

    const closed = async (path, body) => {
      calls.push([path, body]);
      return { bot: { last_action: 'disconnected' } };
    };
    assert.equal(await runDeskKeepTick({ post: closed, role: 'planner', language: 'ko' }), 'disconnected');
  });

  it('reads last_action from a heartbeat payload', () => {
    assert.equal(heartbeatLastAction({ bot: { last_action: 'disconnected' } }), 'disconnected');
    assert.equal(heartbeatLastAction({ last_action: 'still_here' }), 'still_here');
    assert.equal(heartbeatLastAction(null), '');
  });
});
