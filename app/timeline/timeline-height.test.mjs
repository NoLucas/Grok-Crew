import assert from 'node:assert/strict';
import { register } from 'node:module';
import { describe, it } from 'node:test';

register('./ts-resolver.helper.mjs', import.meta.url);

const {
  DEFAULT_TIMELINE_HEIGHT,
  TIMELINE_HIDDEN,
  TIMELINE_MAX_OPEN,
  TIMELINE_MIN_OPEN,
  applyTimelineDelta,
  commitTimelineHeight,
  hideTimelineHeight,
  isTimelineHidden,
  liveTimelineHeight,
  normalizeTimelineHeight,
  raiseTimelineHeight,
} = await import('./timeline-height.ts');

describe('timeline height', () => {
  it('keeps the current 280px desk as the default', () => {
    assert.equal(normalizeTimelineHeight(null), DEFAULT_TIMELINE_HEIGHT);
    assert.equal(normalizeTimelineHeight('nope'), DEFAULT_TIMELINE_HEIGHT);
    assert.equal(commitTimelineHeight(280), 280);
  });

  it('can hide completely and snap a short drag down to the handle', () => {
    assert.equal(hideTimelineHeight(), TIMELINE_HIDDEN);
    assert.equal(isTimelineHidden(TIMELINE_HIDDEN), true);
    assert.equal(commitTimelineHeight(80), TIMELINE_HIDDEN);
    assert.equal(isTimelineHidden(commitTimelineHeight(280)), false);
  });

  it('raises from hidden back to the last open height', () => {
    assert.equal(raiseTimelineHeight(TIMELINE_HIDDEN, 360), 360);
    assert.equal(raiseTimelineHeight(280), 336);
    assert.equal(raiseTimelineHeight(TIMELINE_MAX_OPEN), TIMELINE_MAX_OPEN);
  });

  it('lets a live drag go down to the handle without jumping', () => {
    assert.equal(liveTimelineHeight(10), TIMELINE_HIDDEN);
    assert.equal(liveTimelineHeight(40), 40);
    assert.equal(applyTimelineDelta(280, -40), 240);
    assert.ok(applyTimelineDelta(280, -400) <= TIMELINE_MIN_OPEN || applyTimelineDelta(280, -400) === TIMELINE_HIDDEN);
    assert.equal(applyTimelineDelta(280, 400), TIMELINE_MAX_OPEN);
  });
});
