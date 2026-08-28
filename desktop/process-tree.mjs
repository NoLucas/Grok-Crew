import { spawnSync } from 'node:child_process';

export const STUDIO_IMAGE_WIN = 'grok-crew-studio.exe';

export function windowsTaskkillArgs(pid) {
  return ['/PID', String(pid), '/T', '/F'];
}

export function windowsImageKillArgs(imageName) {
  return ['/IM', String(imageName), '/T', '/F'];
}

function taskkillOk(status) {
  return status === 0 || status === 128;
}

/** Kill the spawned sidecar and its Windows children. PyInstaller onefile leaves a child if only kill() is used. */
export function stopProcessTree(child, { platform = process.platform, run = spawnSync } = {}) {
  if (!child || child.exitCode != null) return { ok: true, skipped: true };
  const pid = Number(child.pid);
  if (!Number.isInteger(pid) || pid <= 0) {
    try { child.kill(); } catch { /* already gone */ }
    return { ok: true, skipped: true };
  }
  if (platform === 'win32') {
    const result = run('taskkill', windowsTaskkillArgs(pid), { windowsHide: true, encoding: 'utf8' });
    if (taskkillOk(result.status)) return { ok: true, method: 'taskkill-tree' };
    try { child.kill(); return { ok: true, method: 'kill-fallback' }; } catch { return { ok: false, method: 'failed' }; }
  }
  try { child.kill('SIGTERM'); return { ok: true, method: 'sigterm' }; } catch { return { ok: false, method: 'failed' }; }
}

export function stopNamedWindowsProcess(imageName, { platform = process.platform, run = spawnSync } = {}) {
  const name = String(imageName || '').trim();
  if (platform !== 'win32' || !name) return { ok: true, skipped: true };
  const result = run('taskkill', windowsImageKillArgs(name), { windowsHide: true, encoding: 'utf8' });
  return { ok: taskkillOk(result.status), method: 'taskkill-image' };
}
