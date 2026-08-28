import assert from 'node:assert/strict';
import { app, BrowserWindow } from 'electron';
import { confirmQuit, createDesktopTray, createTrayMenu, installCloseToTray, installQuitGuard, QUIT_WARNING } from '../desktop/tray-controller.mjs';

async function run() {
  let quitting = false;
  let showCalls = 0;
  let hideCalls = 0;
  let quitCalls = 0;
  const window = new BrowserWindow({ show: false });
  installCloseToTray(window, () => quitting);
  window.show();
  window.close();
  assert.equal(window.isDestroyed(), false, 'Close must preserve the desktop window.');
  assert.equal(window.isVisible(), false, 'Close must hide the desktop window.');

  const actions = {
    show: () => { showCalls += 1; },
    hide: () => { hideCalls += 1; },
    quit: () => { quitCalls += 1; },
  };
  const menu = createTrayMenu(actions);
  assert.deepEqual(menu.items.filter((item) => item.type !== 'separator').map((item) => item.label), ['Grok Crew 열기', '숨기기', '종료']);
  menu.items[0].click();
  menu.items[1].click();
  menu.items[3].click();
  assert.deepEqual([showCalls, hideCalls, quitCalls], [1, 1, 1]);

  const tray = createDesktopTray(actions);
  tray.emit('click');
  assert.equal(showCalls, 2, 'Clicking the tray icon must restore the app.');
  tray.destroy();
  quitting = true;
  window.destroy();

  const stayDialog = { showMessageBox: async () => ({ response: 1 }) };
  const quitDialog = { showMessageBox: async () => ({ response: 0 }) };
  assert.equal(await confirmQuit(stayDialog), false);
  assert.equal(await confirmQuit(quitDialog), true);
  assert.match(QUIT_WARNING.message, /Grok Bot과 Agent 연결이 끊어집니다/);
  assert.equal(QUIT_WARNING.quit, '종료');

  let quitCallsFromGuard = 0;
  let disconnectCalls = 0;
  let confirmedCalls = 0;
  const fakeApp = {
    listeners: [],
    quit() { quitCallsFromGuard += 1; this.listeners.forEach((fn) => fn({ preventDefault() {} })); },
    on(_name, fn) { this.listeners.push(fn); },
  };
  const guard = installQuitGuard(fakeApp, {
    dialog: stayDialog,
    getWindow: () => undefined,
    disconnect: async () => { disconnectCalls += 1; },
    onConfirmed: () => { confirmedCalls += 1; },
  });
  guard.requestQuit();
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(disconnectCalls, 0, 'Cancel must keep bot links.');
  assert.equal(confirmedCalls, 0, 'Cancel must not mark the app quitting.');

  const quittingApp = {
    listeners: [],
    quit() { quitCallsFromGuard += 1; },
    on(_name, fn) { this.listeners.push(fn); },
  };
  const yesGuard = installQuitGuard(quittingApp, {
    dialog: quitDialog,
    getWindow: () => undefined,
    disconnect: async () => { disconnectCalls += 1; },
    onConfirmed: () => { confirmedCalls += 1; },
  });
  quittingApp.listeners[0]({ preventDefault() {} });
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(disconnectCalls, 1, 'Confirm must drop stored bot links.');
  assert.equal(confirmedCalls, 1, 'Confirm must allow the process to exit.');
  yesGuard.forceQuit();
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.ok(quitCallsFromGuard >= 1);

  console.log('Desktop close-to-tray smoke test passed.');
}

app.whenReady().then(run).then(() => app.quit()).catch((error) => {
  console.error(error);
  app.exit(1);
});
