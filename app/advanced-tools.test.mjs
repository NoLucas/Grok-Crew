import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { register } from 'node:module';
import { describe, it } from 'node:test';

register('./timeline/ts-resolver.helper.mjs', import.meta.url);

const {
  ADVANCED_TOOLS,
  ADVANCED_TOOLS_SCHEMA,
  draftAdvancedTools,
  featuredAdvancedTools,
  formatToolApi,
  liveAdvancedTools,
  localizeQuad,
  moreAdvancedTools,
  primaryToolApi,
  toolCatalogPayload,
} = await import('./advanced-tools.ts');

const jsonPath = join(dirname(fileURLToPath(import.meta.url)), '../local_studio/advanced-tools.json');
const source = JSON.parse(readFileSync(jsonPath, 'utf8'));

describe('advanced tools catalog', () => {
  it('reads the same JSON file Python ships', () => {
    assert.equal(ADVANCED_TOOLS_SCHEMA, 'grok-crew.advanced-tools/v1');
    assert.equal(source.schema, ADVANCED_TOOLS_SCHEMA);
    assert.deepEqual(
      ADVANCED_TOOLS.map((tool) => tool.id),
      source.tools.map((tool) => tool.id),
    );
  });

  it('keeps production and bot check as the only live consoles on the hub', () => {
    const live = liveAdvancedTools();
    assert.deepEqual(live.map((tool) => tool.id), ['production', 'bots']);
    assert.ok(draftAdvancedTools().every((tool) => !tool.live && !tool.screenLive));
    assert.equal(ADVANCED_TOOLS.some((tool) => tool.id === 'hub'), true);
  });

  it('puts operations, cut, and the bot guide on the hub and hides API-less drafts', () => {
    assert.deepEqual(
      featuredAdvancedTools().map((tool) => tool.id),
      ['production', 'bots', 'cut', 'operations', 'bot-guide'],
    );
    const extra = moreAdvancedTools().map((tool) => tool.id);
    assert.ok(extra.includes('agent'));
    assert.ok(extra.includes('packet'));
    assert.ok(extra.includes('connect'));
    assert.ok(extra.includes('edit'));
    assert.ok(!extra.includes('operations'));
  });

  it('splits screen draft from live API on operations', () => {
    const operations = ADVANCED_TOOLS.find((tool) => tool.id === 'operations');
    assert.equal(operations.live, false);
    assert.equal(operations.screenLive, false);
    assert.equal(operations.apiLive, true);
    assert.equal(primaryToolApi(operations), 'POST /api/projects/{id}/inspect');
    const payload = toolCatalogPayload('ko').tools.find((tool) => tool.id === 'operations');
    assert.equal(payload.screen_live, false);
    assert.equal(payload.api_live, true);
  });

  it('maps production to the render API and tells bots not to scrape HTML', () => {
    const production = ADVANCED_TOOLS.find((tool) => tool.id === 'production');
    assert.ok(production.botApi.write.includes('POST /api/projects/{id}/render'));
    assert.match(formatToolApi(production), /GET \/api\/projects/);
    assert.match(localizeQuad(ADVANCED_TOOLS.find((tool) => tool.id === 'hub').never, 'ko'), /api\/v2\/tools/);
  });
});
