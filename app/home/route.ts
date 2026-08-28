import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { HOME_PAGE_HEADERS } from '../../get-lead';

export const runtime = 'nodejs';

export async function GET() {
  const html = await readFile(join(process.cwd(), 'public/home.html'), 'utf8');
  return new Response(html, { headers: HOME_PAGE_HEADERS });
}
