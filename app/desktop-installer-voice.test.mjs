import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { register } from 'node:module';
import { describe, it } from 'node:test';

register('./timeline/ts-resolver.helper.mjs', import.meta.url);

const { DEFAULT_VOICE_MODEL_ID, VOICE_MODEL_IDS } = await import('./desktop-voice-models.ts');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('installer voice pick', () => {
  const catalog = JSON.parse(readFileSync(join(root, 'installer/voice-catalog.json'), 'utf8'));
  const nsh = readFileSync(join(root, 'installer/voice-setup.nsh'), 'utf8');
  const ps1 = readFileSync(join(root, 'installer/download-voice.ps1'), 'utf8');
  const pack = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

  it('asks for one known model before app files copy, and does not one-click download', () => {
    assert.equal(pack.build.nsis.oneClick, false);
    assert.equal(pack.build.nsis.allowToChangeInstallationDirectory, false);
    assert.equal(pack.build.nsis.include, 'installer/voice-setup.nsh');
    assert.doesNotMatch(nsh, /MUI_HEADER_TEXT/);
    assert.match(nsh, /customPageAfterChangeDir/);
    assert.match(nsh, /Page custom grokCrewVoicePage grokCrewVoicePageLeave/);
    assert.match(nsh, /Opening the exe did not start a download/);
    assert.match(nsh, /A failed download stops the install|받기 실패면 설치를 끝내지 않습니다/);
    assert.match(nsh, /customInstall/);
    assert.match(nsh, /IfSilent/);
    assert.match(nsh, /ifndef BUILD_UNINSTALLER/);
    assert.match(nsh, /nsExec::Exec /);
    assert.doesNotMatch(nsh, /nsExec::ExecToLog/);
    assert.equal(catalog.default, DEFAULT_VOICE_MODEL_ID);
    assert.equal(catalog.workspaceFolder, 'Grok Crew');
    assert.deepEqual(Object.keys(catalog.models).sort(), [...VOICE_MODEL_IDS].sort());
    assert.match(ps1, /GetFolderPath\("MyVideos"\)/);
    assert.match(ps1, /voice-models/);
    assert.match(ps1, /Skip when that model is already there|already on this PC/);
    assert.match(ps1, /chosen\.json/);
    assert.match(ps1, /active\.json/);
    assert.match(ps1, /voice-error\.txt/);
    assert.equal(catalog.models['kokoro-82m'].repo, 'hexgrad/Kokoro-82M');
    assert.deepEqual(catalog.models['kokoro-82m'].weight_files, ['kokoro-v1_0.pth']);
    assert.deepEqual(catalog.models['kokoro-82m'].fallbacks, ['kokoro-v1.0.pth']);
  });
});
