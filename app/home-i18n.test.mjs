import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  HOME_COPY,
  HOME_LANGS,
  HOME_LANG_KEY,
  homeCopy,
  pickHomeLang,
  readQueryLang,
  readSavedLang,
} from '../public/home-i18n.js';

const homeHtml = await readFile(new URL('../public/home.html', import.meta.url), 'utf8');
const homeI18n = await readFile(fileURLToPath(new URL('../public/home-i18n.js', import.meta.url)), 'utf8');

describe('homepage language packs', () => {
  it('ships the same keys for English, Korean, Chinese, and Japanese', () => {
    assert.deepEqual(HOME_LANGS, ['en', 'ko', 'zh', 'ja']);
    const englishKeys = Object.keys(HOME_COPY.en).sort();
    for (const lang of HOME_LANGS) {
      assert.deepEqual(Object.keys(HOME_COPY[lang]).sort(), englishKeys, lang);
      assert.equal(HOME_COPY[lang].telemetry.length, 6);
      for (const row of HOME_COPY[lang].telemetry) {
        assert.equal(row.length, 2);
        assert.equal(typeof row[0], 'string');
        assert.match(row[1], /^\d{2}:\d{2}:\d{2}$/);
      }
    }
  });

  it('reads only an explicit query or saved choice, never a guessed locale', () => {
    assert.equal(HOME_LANG_KEY, 'grok-crew-home-lang');
    assert.equal(pickHomeLang('en'), 'en');
    assert.equal(pickHomeLang('KO'), 'ko');
    assert.equal(pickHomeLang('zh-CN'), 'zh');
    assert.equal(pickHomeLang('ja-JP'), 'ja');
    assert.equal(pickHomeLang('fr'), '');
    assert.equal(pickHomeLang(''), '');
    assert.equal(readQueryLang('?lang=ja'), 'ja');
    assert.equal(readQueryLang('?lang=fr'), '');
    assert.equal(readSavedLang({ getItem: () => 'zh' }), 'zh');
    assert.equal(readSavedLang({ getItem: () => 'de' }), '');
    assert.equal(homeCopy('').metaTitle, HOME_COPY.en.metaTitle);
    assert.match(homeCopy('ko').heroEyebrow, /무료/);
    assert.equal(homeHtml.includes('navigator.language'), false);
    assert.equal(homeI18n.includes('navigator.language'), false);
    assert.match(homeHtml, /data-home-lang="pick"/);
    assert.match(homeHtml, /Choose your language/);
    assert.match(homeHtml, /data-pick-lang="en"/);
    assert.match(homeHtml, /data-pick-lang="ko"/);
    assert.match(homeHtml, /data-pick-lang="zh"/);
    assert.match(homeHtml, /data-pick-lang="ja"/);
  });
});
