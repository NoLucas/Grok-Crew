#!/usr/bin/env node
/** Serves the public homepage and the Windows file for local preview. */

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';

const root = new URL('..', import.meta.url);
const publicDir = resolve(join(root.pathname, 'public'));
const port = Number(process.env.PORT || 43187);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.exe': 'application/octet-stream',
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'X-Content-Type-Options': 'nosniff' });
    res.end();
    return;
  }
  const path = url.pathname === '/' || url.pathname === '/home'
    ? 'home.html'
    : url.pathname.replace(/^\/+/, '');
  if (!path || path.includes('\0') || path.includes('..')) {
    res.writeHead(400, { 'X-Content-Type-Options': 'nosniff' });
    res.end();
    return;
  }
  const resolved = resolve(publicDir, path);
  if (resolved !== publicDir && !resolved.startsWith(publicDir + sep)) {
    res.writeHead(400, { 'X-Content-Type-Options': 'nosniff' });
    res.end();
    return;
  }
  try {
    const data = await readFile(resolved);
    const headers = {
      'Content-Type': types[extname(resolved)] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'no-referrer',
    };
    if (extname(resolved) === '.html') headers['Cache-Control'] = 'no-store';
    res.writeHead(200, headers);
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff' });
    res.end('Not found.');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Homepage: http://127.0.0.1:${port}/home`);
});
