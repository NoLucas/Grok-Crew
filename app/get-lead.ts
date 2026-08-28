import { createHash, randomBytes } from 'node:crypto';
import { appendFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export const DEFAULT_DOWNLOAD_URL =
  'https://github.com/NoLucas/Grok-Crew/releases/latest/download/GrokCrew-Windows.exe';

const DOWNLOAD_HOSTS = new Set([
  'github.com',
  'objects.githubusercontent.com',
  'release-assets.githubusercontent.com',
]);

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
  const email = normalizeEmail(value);
  if (email.length < 3 || email.length > 254) return false;
  if (/[<>\r\n\0]/.test(email)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function downloadUrl(raw?: string): string {
  const value = String(raw ?? process.env.GROK_CREW_DOWNLOAD_URL ?? DEFAULT_DOWNLOAD_URL).trim();
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:') return DEFAULT_DOWNLOAD_URL;
    if (!DOWNLOAD_HOSTS.has(parsed.hostname)) return DEFAULT_DOWNLOAD_URL;
    return parsed.href;
  } catch {
    return DEFAULT_DOWNLOAD_URL;
  }
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

export function localLeadsPath(): string {
  const override = String(process.env.GROK_CREW_LEADS_PATH || '').trim();
  if (!override || override.includes('..') || override.includes('\0')) {
    return join(process.cwd(), 'data', 'leads.jsonl');
  }
  return override;
}

export function allowedGetOrigins(): string[] {
  return String(process.env.GROK_CREW_PUBLIC_ORIGIN || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

export function isAllowedGetOrigin(origin: string, requestUrl?: string): boolean {
  const value = String(origin || '').trim();
  if (!value) return false;
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

const MEMORY_LEAD_CAP = 32;
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
  if (memoryLeads.length > MEMORY_LEAD_CAP) {
    memoryLeads.splice(0, memoryLeads.length - MEMORY_LEAD_CAP);
  }
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

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 8;
const recentPosts = new Map<string, number[]>();

export function getLeadClientKey(request: Request): string {
  const origin = request.headers.get('origin') || '';
  const forwarded = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim();
  return `${origin}|${forwarded.slice(0, 64)}`;
}

export function tooManyGetLeads(key: string, now = Date.now()): boolean {
  const hits = (recentPosts.get(key) || []).filter((stamp) => now - stamp < RATE_WINDOW_MS);
  if (hits.length >= RATE_MAX) {
    recentPosts.set(key, hits);
    return true;
  }
  hits.push(now);
  recentPosts.set(key, hits);
  return false;
}

export const HOME_PAGE_HEADERS: Record<string, string> = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "connect-src 'self'",
    "font-src 'self' data:",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'self'",
  ].join('; '),
};
