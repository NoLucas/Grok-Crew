import { createHash, randomBytes } from 'node:crypto';
import { appendFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export const DEFAULT_DOWNLOAD_URL =
  'https://github.com/NoLucas/Grok-crew-test/releases/latest/download/GrokCrew-Windows.exe';

export type GetLeadInput = {
  email?: string;
  website?: string;
};

export type GetLeadResult =
  | { ok: true; downloadUrl: string; stored: boolean }
  | { ok: false; reason: 'email' | 'save' };

export type LeadRecord = {
  id: string;
  email: string;
  emailHash: string;
  source: string;
  createdAt: string;
};

export function normalizeEmail(value: string): string {
  return String(value || '').trim().toLowerCase();
}

export function isGetEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

export function downloadUrl(raw?: string): string {
  const value = String(raw ?? process.env.GROK_CREW_DOWNLOAD_URL ?? DEFAULT_DOWNLOAD_URL).trim();
  return value || DEFAULT_DOWNLOAD_URL;
}

export function isHoneypot(value: string | undefined): boolean {
  return Boolean(String(value || '').trim());
}

export function emailHash(email: string): string {
  return createHash('sha256').update(normalizeEmail(email)).digest('hex');
}

export function leadRecord(email: string, createdAt = new Date().toISOString()): LeadRecord {
  const normalized = normalizeEmail(email);
  return {
    id: randomBytes(8).toString('hex'),
    email: normalized,
    emailHash: emailHash(normalized),
    source: 'homepage-get',
    createdAt,
  };
}

export const EXISTING_HOME_ORIGIN = 'https://grok-crew-local.jinegcc.chatgpt.site';

export function localLeadsPath(): string {
  const override = String(process.env.GROK_CREW_LEADS_PATH || '').trim();
  if (override) return override;
  return join(process.cwd(), 'data', 'leads.jsonl');
}

export function allowedGetOrigins(): string[] {
  const extra = String(process.env.GROK_CREW_PUBLIC_ORIGIN || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return [EXISTING_HOME_ORIGIN, ...extra];
}

export function isAllowedGetOrigin(origin: string, requestUrl?: string): boolean {
  const value = String(origin || '').trim();
  if (!value) return true;
  if (allowedGetOrigins().includes(value)) return true;
  try {
    const parsed = new URL(value);
    if (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost') return true;
    if (requestUrl && new URL(requestUrl).origin === value) return true;
  } catch {
    return false;
  }
  return false;
}

export function corsHeaders(origin: string, requestUrl?: string): Record<string, string> {
  if (!origin || !isAllowedGetOrigin(origin, requestUrl)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    Vary: 'Origin',
  };
}

const memoryLeads: LeadRecord[] = [];

export function rememberedLeads(): LeadRecord[] {
  return memoryLeads.slice();
}

export async function saveLeadLocal(record: LeadRecord, path = localLeadsPath()): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await appendFile(path, `${JSON.stringify(record)}\n`, { encoding: 'utf8' });
}

export async function saveLeadMemory(record: LeadRecord): Promise<void> {
  memoryLeads.push(record);
}

export async function saveLeadS3(record: LeadRecord, bucket: string, region: string): Promise<void> {
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
  const client = new S3Client({ region });
  const day = record.createdAt.slice(0, 10);
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: `leads/${day}/${record.emailHash}.json`,
    Body: JSON.stringify(record),
    ContentType: 'application/json',
    ServerSideEncryption: 'AES256',
  }));
}

export async function saveLead(record: LeadRecord): Promise<void> {
  const bucket = String(process.env.GROK_CREW_LEADS_BUCKET || '').trim();
  if (bucket) {
    const region = String(process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'ap-northeast-2').trim();
    await saveLeadS3(record, bucket, region);
    return;
  }
  try {
    await saveLeadLocal(record);
  } catch {
    await saveLeadMemory(record);
  }
}

export async function takeGetLead(input: GetLeadInput): Promise<GetLeadResult> {
  if (isHoneypot(input.website)) {
    return { ok: true, downloadUrl: downloadUrl(), stored: false };
  }
  if (!isGetEmail(String(input.email || ''))) {
    return { ok: false, reason: 'email' };
  }
  try {
    await saveLead(leadRecord(String(input.email)));
    return { ok: true, downloadUrl: downloadUrl(), stored: true };
  } catch {
    return { ok: false, reason: 'save' };
  }
}
