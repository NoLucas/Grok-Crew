import assert from 'node:assert/strict';
import { register } from 'node:module';
import { describe, it } from 'node:test';

register('./timeline/ts-resolver.helper.mjs', import.meta.url);

const {
  CREW_MARKETS,
  isCrewMarket,
  marketFromLanguage,
  marketLabel,
  marketPlanCode,
  resolveCrewMarket,
} = await import('./crew-market.ts');

describe('crew destination market', () => {
  it('maps UI language to the same-country default', () => {
    assert.deepEqual(CREW_MARKETS, ['kr', 'us', 'cn', 'jp']);
    assert.equal(marketFromLanguage('ko'), 'kr');
    assert.equal(marketFromLanguage('en'), 'us');
    assert.equal(marketFromLanguage('zh'), 'cn');
    assert.equal(marketFromLanguage('ja'), 'jp');
    assert.equal(marketFromLanguage('fr'), 'kr');
    assert.equal(isCrewMarket('kr'), true);
    assert.equal(isCrewMarket('korea'), false);
  });

  it('accepts country aliases and does not invent a fifth market', () => {
    assert.equal(resolveCrewMarket('한국', 'en'), 'kr');
    assert.equal(resolveCrewMarket('usa', 'ko'), 'us');
    assert.equal(resolveCrewMarket('zh', 'en'), 'cn');
    assert.equal(resolveCrewMarket('ja'), 'jp');
    assert.equal(resolveCrewMarket('', 'en'), 'us');
    assert.equal(resolveCrewMarket('nope', 'zh'), 'cn');
    assert.equal(marketPlanCode('kr'), 'ko');
    assert.equal(marketPlanCode('us'), 'en');
    assert.equal(marketLabel('kr', 'ko'), '한국');
    assert.equal(marketLabel('us', 'en'), 'United States');
    assert.equal(marketLabel('cn', 'zh'), '中国');
    assert.equal(marketLabel('jp', 'ja'), '日本');
  });
});
