import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  STUDIO_IMAGE_WIN,
  stopNamedWindowsProcess,
  stopProcessTree,
  windowsImageKillArgs,
  windowsTaskkillArgs,
} from './process-tree.mjs';

describe('desktop process tree', () => {
  it('uses a Windows process-tree kill so PyInstaller children do not stay', () => {
    assert.deepEqual(windowsTaskkillArgs(4242), ['/PID', '4242', '/T', '/F']);
    assert.deepEqual(windowsImageKillArgs(STUDIO_IMAGE_WIN), ['/IM', 'grok-crew-studio.exe', '/T', '/F']);
    const calls = [];
    const child = { pid: 4242, exitCode: null, kill() { this.killed = true; return true; } };
    const result = stopProcessTree(child, {
      platform: 'win32',
      run: (command, args) => {
        calls.push({ command, args });
        return { status: 0 };
      },
    });
    assert.equal(result.method, 'taskkill-tree');
    assert.deepEqual(calls, [{ command: 'taskkill', args: ['/PID', '4242', '/T', '/F'] }]);
    assert.equal(child.killed, undefined);
  });

  it('skips an already-exited child and does not invent a kill', () => {
    const calls = [];
    const result = stopProcessTree({ pid: 8, exitCode: 0, kill() { throw new Error('should not kill'); } }, {
      platform: 'win32',
      run: () => { calls.push(1); return { status: 0 }; },
    });
    assert.equal(result.skipped, true);
    assert.deepEqual(calls, []);
  });

  it('falls back to kill when taskkill cannot run', () => {
    const child = { pid: 9, exitCode: null, kill() { this.killed = true; return true; } };
    const result = stopProcessTree(child, {
      platform: 'win32',
      run: () => ({ status: 1 }),
    });
    assert.equal(result.method, 'kill-fallback');
    assert.equal(child.killed, true);
  });

  it('sends SIGTERM off Windows and never taskkills every python', () => {
    const calls = [];
    const child = { pid: 11, exitCode: null, kill(signal) { this.signal = signal; return true; } };
    const result = stopProcessTree(child, {
      platform: 'linux',
      run: (command) => { calls.push(command); return { status: 0 }; },
    });
    assert.equal(result.method, 'sigterm');
    assert.equal(child.signal, 'SIGTERM');
    assert.deepEqual(calls, []);
    const named = stopNamedWindowsProcess(STUDIO_IMAGE_WIN, { platform: 'linux', run: () => { calls.push('named'); return { status: 0 }; } });
    assert.equal(named.skipped, true);
    assert.deepEqual(calls, []);
  });

  it('clears leftover packaged sidecar images on Windows only', () => {
    const calls = [];
    const result = stopNamedWindowsProcess(STUDIO_IMAGE_WIN, {
      platform: 'win32',
      run: (command, args) => {
        calls.push({ command, args });
        return { status: 128 };
      },
    });
    assert.equal(result.ok, true);
    assert.deepEqual(calls[0].args, ['/IM', 'grok-crew-studio.exe', '/T', '/F']);
  });
});
