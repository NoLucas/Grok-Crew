import assert from 'node:assert/strict';
import { register } from 'node:module';
import { describe, it } from 'node:test';

register('./timeline/ts-resolver.helper.mjs', import.meta.url);

const {
  ADVANCED_TOOLS,
  ADVANCED_TOOLS_SCHEMA,
  draftAdvancedTools,
  formatToolApi,
  liveAdvancedTools,
  localizeQuad,
} = await import('./advanced-tools.ts');

describe('advanced tools catalog', () => {
  it('keeps production and bot check as the only live consoles', () => {
    const live = liveAdvancedTools();
    assert.deepEqual(live.map((tool) => tool.id), ['production', 'bots']);
    assert.ok(draftAdvancedTools().every((tool) => !tool.live));
    assert.equal(ADVANCED_TOOLS.some((tool) => tool.id === 'hub'), true);
  });

  it('maps production to the render API and tells bots not to scrape HTML', () => {
    const production = ADVANCED_TOOLS.find((tool) => tool.id === 'production');
    assert.ok(production.botApi.write.includes('POST /api/projects/{id}/render'));
    assert.match(formatToolApi(production), /GET \/api\/projects/);
    assert.match(localizeQuad(ADVANCED_TOOLS.find((tool) => tool.id === 'hub').never, 'ko'), /api\/v2\/tools/);
    assert.equal(ADVANCED_TOOLS_SCHEMA, 'grok-crew.advanced-tools/v1');
  });
});
