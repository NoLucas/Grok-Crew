import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { register } from 'node:module';
import { afterEach, describe, it } from 'node:test';
register('./timeline/ts-resolver.helper.mjs', import.meta.url);

const {
  DISCONNECTED_HOME_ORIGIN,
  corsHeaders,
  downloadUrl,
  DEFAULT_DOWNLOAD_URL,
  isAllowedGetOrigin,
  isGetEmail,
  isHoneypot,
  leadRecord,
  saveLeadLocal,
  takeGetLead,
} = await import('./get-lead.ts');

const previousPath = process.env.GROK_CREW_LEADS_PATH;
const previousBucket = process.env.GROK_CREW_LEADS_BUCKET;
const previousDownload = process.env.GROK_CREW_DOWNLOAD_URL;

afterEach(() => {
  if (previousPath === undefined) delete process.env.GROK_CREW_LEADS_PATH;
  else process.env.GROK_CREW_LEADS_PATH = previousPath;
  if (previousBucket === undefined) delete process.env.GROK_CREW_LEADS_BUCKET;
  else process.env.GROK_CREW_LEADS_BUCKET = previousBucket;
  if (previousDownload === undefined) delete process.env.GROK_CREW_DOWNLOAD_URL;
  else process.env.GROK_CREW_DOWNLOAD_URL = previousDownload;
});

describe('email door without a public site', () => {
  it('accepts one email line and rejects empty or junk', () => {
    assert.equal(isGetEmail('you@example.com'), true);
    assert.equal(isGetEmail('  You@Example.COM  '), true);
    assert.equal(isGetEmail(''), false);
    assert.equal(isGetEmail('not-an-email'), false);
  });

  it('treats a filled honeypot as a fake success and does not store', async () => {
    const result = await takeGetLead({ email: 'bot@example.com', website: 'https://spam.test' });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.stored, false);
  });

  it('stores a lead locally and returns the Windows file URL', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'grok-crew-leads-'));
    const path = join(dir, 'leads.jsonl');
    process.env.GROK_CREW_LEADS_PATH = path;
    delete process.env.GROK_CREW_LEADS_BUCKET;
    const result = await takeGetLead({ email: ' Guest@Example.com ' });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.stored, true);
    assert.equal(result.downloadUrl, DEFAULT_DOWNLOAD_URL);
    const lines = (await readFile(path, 'utf8')).trim().split('\n');
    assert.equal(lines.length, 1);
    const record = JSON.parse(lines[0]);
    assert.equal(record.email, 'guest@example.com');
    assert.equal(record.source, 'homepage-get');
  });

  it('writes one JSON line when saving locally', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'grok-crew-leads-'));
    const path = join(dir, 'leads.jsonl');
    await saveLeadLocal(leadRecord('a@b.co'), path);
    const text = await readFile(path, 'utf8');
    assert.match(text, /"email":"a@b.co"/);
  });

  it('does not let the disconnected chatgpt.site call this app', () => {
    assert.equal(isAllowedGetOrigin(DISCONNECTED_HOME_ORIGIN), false);
    assert.equal(isAllowedGetOrigin('https://evil.example'), false);
    assert.equal(isAllowedGetOrigin('http://127.0.0.1:43173'), true);
    const headers = corsHeaders(DISCONNECTED_HOME_ORIGIN);
    assert.equal(headers['Access-Control-Allow-Origin'], undefined);
  });

  it('uses the download override when set', () => {
    assert.equal(downloadUrl('https://files.example/GrokCrew-Windows.exe'), 'https://files.example/GrokCrew-Windows.exe');
  });

  it('keeps the door open when the disk file cannot be written', async () => {
    process.env.GROK_CREW_LEADS_PATH = '/proc/grok-crew-cannot-write.jsonl';
    delete process.env.GROK_CREW_LEADS_BUCKET;
    const result = await takeGetLead({ email: 'memory@example.com' });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.stored, true);
  });

});
