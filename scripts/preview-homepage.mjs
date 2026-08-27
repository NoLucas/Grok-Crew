#!/usr/bin/env node
/** Serves the public homepage and the Windows file for local preview. */

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const root = new URL('..', import.meta.url);
const publicDir = join(root.pathname, 'public');
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
    res.writeHead(405);
    res.end();
    return;
  }
  const path = url.pathname === '/' || url.pathname === '/home'
    ? 'home.html'
    : url.pathname.replace(/^\/+/, '');
  if (path.includes('..')) {
    res.writeHead(400);
    res.end();
    return;
  }
  try {
    const data = await readFile(join(publicDir, path));
    res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream' });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found.');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Homepage: http://127.0.0.1:${port}/home`);
});
