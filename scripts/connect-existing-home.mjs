#!/usr/bin/env node
/** Print how to attach this repo's homepage script to a live page. */

import { access } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('..', import.meta.url);
const home = join(root.pathname, 'public', 'home.html');
const script = join(root.pathname, 'public', 'connect-install.js');
const origin = String(process.env.GROK_CREW_PUBLIC_ORIGIN || 'http://127.0.0.1:43127').replace(/\/$/, '');

await access(home);
await access(script);

console.log('Homepage is back on /home.');
console.log(`Open: ${origin}/home`);
console.log('');
console.log('To connect a live page, add this tag to that page:');
console.log(`<script src="${origin}/connect-install.js" data-api="${origin}/api/get"></script>`);
console.log('');
console.log('Set GROK_CREW_PUBLIC_ORIGIN to that live page origin so POST /api/get accepts it.');
console.log('Do not commit a personal host into the repo.');
