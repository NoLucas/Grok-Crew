import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Menu, nativeImage, Tray } from 'electron';

const here = dirname(fileURLToPath(import.meta.url));

function loadTrayIcon() {
  const candidates = [
    join(here, 'icons', 'icon.png'),
    process.resourcesPath ? join(process.resourcesPath, 'icons', 'icon.png') : '',
  ].filter(Boolean);
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    const icon = nativeImage.createFromBuffer(readFileSync(path));
    if (icon.isEmpty()) continue;
    return icon.resize({ width: 24, height: 24 });
  }
  throw new Error('The Grok Crew tray icon could not be decoded.');
}

export function installCloseToTray(window, isQuitting) {
  window.on('close', (event) => {
    if (isQuitting()) return;
    event.preventDefault();
    window.hide();
  });
}

export function createTrayMenu({ show, hide, quit }) {
  return Menu.buildFromTemplate([
    { label: 'Grok Crew 열기', click: show },
    { label: '숨기기', click: hide },
    { type: 'separator' },
    { label: '종료', click: quit },
  ]);
}

export function createDesktopTray({ show, hide, quit }) {
  const icon = loadTrayIcon();
  const tray = new Tray(icon);
  tray.setToolTip('Grok Crew Desktop');
  tray.setContextMenu(createTrayMenu({ show, hide, quit }));
  tray.on('click', show);
  return tray;
}
