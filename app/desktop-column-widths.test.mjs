import assert from 'node:assert/strict';
import { register } from 'node:module';
import { describe, it } from 'node:test';

register('./timeline/ts-resolver.helper.mjs', import.meta.url);

const {
  CENTER_MIN,
  COLUMN_HANDLE,
  INSPECTOR_DEFAULT,
  INSPECTOR_MAX,
  INSPECTOR_MIN,
  SIDEBAR_DEFAULT,
  SIDEBAR_MAX,
  SIDEBAR_MIN,
  applyInspectorDelta,
  applySidebarDelta,
  clampInspector,
  clampSidebar,
  fitColumnWidths,
  normalizeColumnWidths,
} = await import('./desktop-column-widths.ts');

describe('desktop column widths', () => {
  it('keeps the current desk columns as the default', () => {
    assert.deepEqual(normalizeColumnWidths(null), { sidebar: SIDEBAR_DEFAULT, inspector: INSPECTOR_DEFAULT });
    assert.equal(SIDEBAR_DEFAULT, 245);
    assert.equal(INSPECTOR_DEFAULT, 290);
  });

  it('lets the operator move each column only a little', () => {
    assert.equal(clampSidebar(100), SIDEBAR_MIN);
    assert.equal(clampSidebar(900), SIDEBAR_MAX);
    assert.equal(clampInspector(80), INSPECTOR_MIN);
    assert.equal(clampInspector(900), INSPECTOR_MAX);
    assert.ok(SIDEBAR_MAX - SIDEBAR_MIN <= 140);
    assert.ok(INSPECTOR_MAX - INSPECTOR_MIN <= 160);
  });

  it('grows the project list to the right and the remote pane to the left', () => {
    assert.equal(applySidebarDelta(245, 20), 265);
    assert.equal(applySidebarDelta(245, 400), SIDEBAR_MAX);
    assert.equal(applyInspectorDelta(290, 20), 270);
    assert.equal(applyInspectorDelta(290, -40), 330);
    assert.equal(applyInspectorDelta(290, -400), INSPECTOR_MAX);
  });

  it('keeps a usable center when the body is tight', () => {
    const fitted = fitColumnWidths(
      { sidebar: SIDEBAR_MAX, inspector: INSPECTOR_MAX },
      SIDEBAR_MIN + INSPECTOR_MIN + CENTER_MIN + COLUMN_HANDLE * 2,
      true,
    );
    assert.equal(fitted.sidebar, SIDEBAR_MIN);
    assert.equal(fitted.inspector, INSPECTOR_MIN);
  });
});
