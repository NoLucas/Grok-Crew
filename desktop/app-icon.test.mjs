import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const desktopDir = dirname(fileURLToPath(import.meta.url));
const iconIco = join(desktopDir, 'icons', 'icon.ico');
const iconPng = join(desktopDir, 'icons', 'icon.png');

test('Windows ICO is a multi-size Grok Crew mark', () => {
  const bytes = readFileSync(iconIco);
  assert.equal(bytes.subarray(0, 4).toString('hex'), '00000100');
  const count = bytes.readUInt16LE(4);
  assert.ok(count >= 6, `ICO should ship several sizes, got ${count}`);
  const sizes = [];
  for (let index = 0; index < count; index += 1) {
    const width = bytes[6 + index * 16];
    sizes.push(width === 0 ? 256 : width);
  }
  assert.ok(sizes.includes(256), `ICO needs a 256px image for the exe, got ${sizes.join(',')}`);
  assert.ok(sizes.includes(32), `ICO needs a 32px image for shortcuts, got ${sizes.join(',')}`);
});

test('PNG mark is present for the running window', () => {
  const bytes = readFileSync(iconPng);
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.ok(bytes.length > 800, 'PNG mark is too small to be the desk logo');
});
