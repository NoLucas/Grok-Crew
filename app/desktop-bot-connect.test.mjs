import assert from 'node:assert/strict';
import { register } from 'node:module';
import { describe, it } from 'node:test';

register('./timeline/ts-resolver.helper.mjs', import.meta.url);

const { connectedBot, connectPaste } = await import('./desktop-bot-connect.ts');

describe('desk bot connect', () => {
  it('has no bot until a check-in exists', () => {
    assert.equal(connectedBot(undefined), null);
    assert.equal(connectedBot({ bots: [] }), null);
    assert.equal(connectedBot({ bots: [{ display_name: '' }] }), null);
  });

  it('prefers an active check-in', () => {
    const bot = connectedBot({
      bots: [
        { display_name: 'Idle Bot', presence: 'idle' },
        { display_name: 'Cursor', presence: 'active' },
      ],
    });
    assert.equal(bot?.display_name, 'Cursor');
  });

  it('connect paste is check-in only', () => {
    const text = connectPaste('ko');
    assert.match(text, /체크인/);
    assert.match(text, /bot-entry|grok-crew\.py entry/);
    assert.match(text, /127\.0\.0\.1:7214\/downloads\/grok-crew\.py/);
    assert.doesNotMatch(text, /git clone/);
    assert.doesNotMatch(text, /handoff-inbox/);
  });
});
