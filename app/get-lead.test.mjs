import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { register } from 'node:module';
import { afterEach, describe, it } from 'node:test';
register('./timeline/ts-resolver.helper.mjs', import.meta.url);

const {
  corsHeaders,
  downloadUrl,
  DEFAULT_DOWNLOAD_URL,
  isAllowedGetOrigin,
  isGetEmail,
  leadRecord,
  saveLeadLocal,
  takeGetLead,
  tooManyGetLeads,
} = await import('./get-lead.ts');

const previousPath = process.env.GROK_CREW_LEADS_PATH;
const previousBucket = process.env.GROK_CREW_LEADS_BUCKET;
const previousDownload = process.env.GROK_CREW_DOWNLOAD_URL;
const previousOrigin = process.env.GROK_CREW_PUBLIC_ORIGIN;

afterEach(() => {
  if (previousPath === undefined) delete process.env.GROK_CREW_LEADS_PATH;
  else process.env.GROK_CREW_LEADS_PATH = previousPath;
  if (previousBucket === undefined) delete process.env.GROK_CREW_LEADS_BUCKET;
  else process.env.GROK_CREW_LEADS_BUCKET = previousBucket;
  if (previousDownload === undefined) delete process.env.GROK_CREW_DOWNLOAD_URL;
  else process.env.GROK_CREW_DOWNLOAD_URL = previousDownload;
  if (previousOrigin === undefined) delete process.env.GROK_CREW_PUBLIC_ORIGIN;
  else process.env.GROK_CREW_PUBLIC_ORIGIN = previousOrigin;
});

describe('optional homepage news door', () => {
  it('accepts one email line and rejects empty, junk, or oversized values', () => {
    assert.equal(isGetEmail('you@example.com'), true);
    assert.equal(isGetEmail('  You@Example.COM  '), true);
    assert.equal(isGetEmail(''), false);
    assert.equal(isGetEmail('not-an-email'), false);
    assert.equal(isGetEmail(`bad<user>@example.com`), false);
    assert.equal(isGetEmail(`${'a'.repeat(250)}@x.co`), false);
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

  it('lets only localhost, same-origin, or GROK_CREW_PUBLIC_ORIGIN call this app', () => {
    delete process.env.GROK_CREW_PUBLIC_ORIGIN;
    assert.equal(isAllowedGetOrigin('https://evil.example'), false);
    assert.equal(isAllowedGetOrigin(''), false);
    assert.equal(isAllowedGetOrigin('http://127.0.0.1:43173'), true);
    assert.equal(isAllowedGetOrigin('https://pages.example', 'https://pages.example/api/get'), true);
    process.env.GROK_CREW_PUBLIC_ORIGIN = 'https://pages.example';
    assert.equal(isAllowedGetOrigin('https://pages.example'), true);
    const headers = corsHeaders('https://pages.example');
    assert.equal(headers['Access-Control-Allow-Origin'], 'https://pages.example');
    assert.deepEqual(corsHeaders('https://evil.example'), {});
  });

  it('points the Windows file at the Grok-Crew release', () => {
    assert.match(DEFAULT_DOWNLOAD_URL, /NoLucas\/Grok-Crew\/releases/);
  });

  it('ignores a download override that is not a GitHub https URL', () => {
    assert.equal(downloadUrl('https://files.example/GrokCrew-Windows.exe'), DEFAULT_DOWNLOAD_URL);
    assert.equal(downloadUrl('javascript:alert(1)'), DEFAULT_DOWNLOAD_URL);
    assert.equal(
      downloadUrl('https://github.com/NoLucas/Grok-Crew/releases/latest/download/GrokCrew-Windows.exe'),
      DEFAULT_DOWNLOAD_URL,
    );
  });

  it('keeps the door open when the disk file cannot be written', async () => {
    process.env.GROK_CREW_LEADS_PATH = '/proc/grok-crew-cannot-write.jsonl';
    delete process.env.GROK_CREW_LEADS_BUCKET;
    const result = await takeGetLead({ email: 'memory@example.com' });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.stored, true);
  });

  it('rate-limits repeated news posts from the same caller', () => {
    const key = `test-rate-${Date.now()}`;
    for (let i = 0; i < 8; i += 1) {
      assert.equal(tooManyGetLeads(key), false);
    }
    assert.equal(tooManyGetLeads(key), true);
  });
});
