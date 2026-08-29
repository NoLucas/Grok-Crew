import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

function src(name) {
  return readFileSync(new URL(`./${name}`, import.meta.url), 'utf8');
}

describe('desk composer restage', () => {
  it('Connect shows one family at a time and folds extras', () => {
    const text = src('desktop-bot-panel.tsx');
    assert.match(text, /data-stage="compose"/);
    assert.match(text, /봇 붙이기/);
    assert.equal(text.includes('desktop-spec-hero'), false);
    assert.equal(text.includes('이 PC에서 봇 쓰기'), false);
    assert.equal(text.includes('크루 보드'), false);
    assert.equal(text.includes('안 열리면'), false);
    assert.equal(text.includes('봇 없이 영상 열기'), false);
    assert.match(text, /이 창의 다른 연결/);
    assert.equal(text.includes('한 줄로 붙이기'), false);
    assert.equal(text.includes('이 줄로 붙이기'), false);
    assert.equal(text.includes('Grok 제작기'), false);
    assert.equal(text.includes('relay 저장소'), false);
    assert.equal((text.match(/<h1>/g) || []).length, 1);
  });

  it('Start keeps open-own-file and leaves the crew board on Auto', () => {
    const auto = src('desktop-auto-desk.tsx');
    const chrome = src('desktop-workspace.tsx');
    assert.match(auto, /내 영상 재편집/);
    assert.match(auto, /영상제목 설정/);
    assert.match(auto, /영상의 이름을 설정하지 않으면 프롬프트가 제목이됩니다/);
    assert.equal(auto.includes('봇 없이 영상 열기'), false);
    assert.equal(auto.includes('이름 붙이기'), false);
    assert.equal(auto.includes('비우면 위의 첫 줄'), false);
    assert.match(auto, /어떤 영상을 만들까요\?/);
    assert.match(auto, /desktop-auto-composer-drop/);
    assert.match(auto, /제작 시작/);
    assert.match(auto, /새로 만들기/);
    assert.equal(auto.includes('이걸로 만들기'), false);
    assert.equal(auto.includes('다른 영상 적기'), false);
    assert.equal(auto.includes('마음에 안 들면 다시 말하기'), false);
    assert.match(auto, /내파일\/주소/);
    assert.match(auto, /원하는 파일이나 주소를 넣어주세요/);
    assert.match(auto, /TTS생성/);
    assert.match(auto, /업로드 위치/);
    assert.match(auto, /desktop-auto-caption-check/);
    assert.match(auto, /tts생성/);
    assert.match(auto, /미리듣기/);
    assert.match(auto, /Kokoro-82M/);
    assert.match(auto, /allowedAccents\.map/);
    assert.equal(auto.includes('VOICE_ACCENTS.map'), false);
    assert.match(auto, /한국어 언어팩이 없습니다/);
    assert.match(auto, /You can only pick languages it supports/);
    assert.match(auto, /只能选择它支持的语种/);
    assert.match(auto, /対応している言語だけ選べます/);
    assert.equal(auto.includes('How it sounds'), false);
    assert.equal(auto.includes('Making Kokoro'), false);
    assert.equal(auto.includes('只显示它收下的语种'), false);
    assert.equal(auto.includes('speechSynthesis'), false);
    assert.equal(auto.includes('미리듣기는 이 창에서 재생하지 않습니다'), false);
    assert.equal(auto.includes('목소리 만들기'), false);
    assert.equal(auto.includes('내 목소리'), false);
    assert.equal(auto.includes("t('화면',"), false);
    assert.equal(auto.includes("t('올릴 곳'"), false);
    assert.equal(auto.includes("t('어디에 올릴까요'"), false);
    assert.equal(auto.includes("t('보낼 나라'"), false);
    assert.match(auto, /DesktopCrewBoard/);
    assert.equal(auto.includes("mode === 'own_file' ?"), false);
    assert.equal(auto.includes('안 열리면'), false);
    assert.match(chrome, /t\('시작', 'Start', '开始', '開始'\)/);
    assert.match(chrome, /사용자 설정/);
    assert.match(chrome, /projectForReedit/);
    assert.match(chrome, /이 영상을 다시 엽니다/);
  });

  it('Setup and Export use option chips, not four cards at once', () => {
    const text = src('desktop-workspace.tsx');
    assert.match(text, /desktop-setup-grid is-composer/);
    assert.match(text, /desktop-export-grid is-composer/);
    assert.match(text, /DesktopReviseCard/);
    assert.equal(text.includes('v{timeline.revision}'), false);
    assert.match(src('desktop-revise-card.tsx'), /마음에 안 들면 다시 말하기/);
    assert.match(text, /setupPane === 'shape'/);
    assert.match(text, /exportPane === 'post'/);
    assert.match(text, /지금 만들기/);
    assert.match(text, /다른 편집기/);
    assert.match(text, /올린 기록/);
    assert.equal(text.includes('desktop-version-fold'), false);
    assert.equal(text.includes('버전 기록'), false);
    assert.match(src('desktop-project-library.tsx'), /폴더 만들기/);
    assert.equal(text.includes("t('새 규격'"), false);
    assert.equal(text.includes('desktop-create-card'), false);
    assert.equal(text.includes('desktop-side-head'), false);
    assert.equal(text.includes('addingFolder'), false);
    assert.match(text, /미리보기 프록시/);
    assert.equal(text.includes('desktop-card-title'), false);
  });

  it('Advanced spec starts with a composer and folds doors', () => {
    const text = src('desktop-spec-desk.tsx');
    assert.match(text, /is-composer/);
    assert.match(text, /specPane/);
    assert.match(text, /보낼함과 받기/);
    assert.equal(text.includes('desktop-spec-hero'), false);
  });
});
