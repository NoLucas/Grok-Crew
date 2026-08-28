import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { describe, it } from 'node:test';
import { DEFAULT_STUDIO_PORT, reserveLoopbackPort, studioPortFromApiBase } from './studio-port.mjs';

function holdLoopback(port) {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

describe('studio loopback port', () => {
  it('reads the port from a loopback apiBase', () => {
    assert.equal(studioPortFromApiBase('http://127.0.0.1:7214'), 7214);
    assert.equal(studioPortFromApiBase('http://127.0.0.1:8123/'), 8123);
    assert.equal(studioPortFromApiBase('http://localhost:9000'), 9000);
    assert.equal(studioPortFromApiBase('https://example.com:7214'), DEFAULT_STUDIO_PORT);
    assert.equal(studioPortFromApiBase('not-a-url'), DEFAULT_STUDIO_PORT);
    assert.equal(studioPortFromApiBase(''), DEFAULT_STUDIO_PORT);
  });

  it('uses the preferred port when it is free', async () => {
    const preferred = await reserveLoopbackPort(0);
    const again = await reserveLoopbackPort(preferred);
    assert.equal(again, preferred);
  });

  it('falls back when the preferred port is busy', async () => {
    const blocker = await holdLoopback(0);
    const preferred = blocker.address().port;
    const port = await reserveLoopbackPort(preferred);
    assert.notEqual(port, preferred);
    assert.ok(port >= 1 && port <= 65535);
    await new Promise((resolve) => blocker.close(resolve));
  });
});
