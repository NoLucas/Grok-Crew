import assert from 'node:assert/strict';
import { register } from 'node:module';
import { describe, it } from 'node:test';

register('./ts-resolver.helper.mjs', import.meta.url);

const {
  DEFAULT_TIMELINE_HEIGHT,
  TIMELINE_HEIGHT_STEPS,
  normalizeTimelineHeight,
  stepTimelineHeight,
} = await import('./timeline-height.ts');

describe('timeline height', () => {
  it('snaps unknown values to the current 280px desk', () => {
    assert.equal(normalizeTimelineHeight(null), DEFAULT_TIMELINE_HEIGHT);
    assert.equal(normalizeTimelineHeight('nope'), DEFAULT_TIMELINE_HEIGHT);
    assert.equal(normalizeTimelineHeight(280), 280);
    assert.equal(normalizeTimelineHeight(300), 280);
  });

  it('raises and lowers one step and stops at the ends', () => {
    assert.equal(stepTimelineHeight(280, 1), 360);
    assert.equal(stepTimelineHeight(280, -1), 224);
    assert.equal(stepTimelineHeight(TIMELINE_HEIGHT_STEPS[0], -1), TIMELINE_HEIGHT_STEPS[0]);
    assert.equal(stepTimelineHeight(TIMELINE_HEIGHT_STEPS.at(-1), 1), TIMELINE_HEIGHT_STEPS.at(-1));
  });
});
