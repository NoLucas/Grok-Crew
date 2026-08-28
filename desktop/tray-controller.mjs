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

export const QUIT_WARNING = {
  title: 'Grok Crew',
  message: '지금 종료하면 Grok Bot과 Agent 연결이 끊어집니다.',
  detail: '다시 쓰려면 연결 글을 봇 창에 다시 붙이세요. 창을 닫아 숨기기만 하면 연결은 그대로입니다.',
  quit: '종료',
  stay: '돌아가기',
};

export async function confirmQuit(dialogApi, window) {
  const box = {
    type: 'warning',
    buttons: [QUIT_WARNING.quit, QUIT_WARNING.stay],
    defaultId: 1,
    cancelId: 1,
    noLink: true,
    title: QUIT_WARNING.title,
    message: QUIT_WARNING.message,
    detail: QUIT_WARNING.detail,
  };
  const result = window
    ? await dialogApi.showMessageBox(window, box)
    : await dialogApi.showMessageBox(box);
  return result.response === 0;
}

export function installQuitGuard(app, { dialog: dialogApi, getWindow, disconnect, onConfirmed }) {
  let confirmed = false;
  let asking = false;
  let finishing = false;

  const finish = async () => {
    if (finishing) {
      confirmed = true;
      onConfirmed?.();
      return;
    }
    finishing = true;
    await disconnect?.();
    confirmed = true;
    onConfirmed?.();
  };

  const markConfirmed = () => {
    void finish();
  };

  const requestQuit = () => {
    app.quit();
  };

  const forceQuit = () => {
    void finish().then(() => app.quit());
  };

  app.on('before-quit', (event) => {
    if (confirmed) {
      onConfirmed?.();
      return;
    }
    event.preventDefault();
    if (asking) return;
    asking = true;
    void confirmQuit(dialogApi, getWindow?.())
      .then(async (ok) => {
        asking = false;
        if (!ok) return;
        await finish();
        app.quit();
      })
      .catch(() => {
        asking = false;
      });
  });

  return { requestQuit, forceQuit, markConfirmed };
}
