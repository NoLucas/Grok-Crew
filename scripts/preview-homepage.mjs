#!/usr/bin/env node
/** Local preview of the existing homepage + email download door. */

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
const root = new URL('..', import.meta.url);
const { takeGetLead, corsHeaders } = await import(new URL('../app/get-lead.ts', import.meta.url));

const port = Number(process.env.PORT || 43187);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
  const origin = req.headers.origin || '';

  if (req.method === 'OPTIONS' && url.pathname === '/api/get') {
    const headers = corsHeaders(origin, url.href);
    res.writeHead(204, headers);
    res.end();
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/get') {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    let body = {};
    try {
      body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
    } catch {
      body = {};
    }
    const result = await takeGetLead(body);
    const status = result.ok ? 200 : result.reason === 'save' ? 500 : 400;
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(origin, url.href),
    });
    res.end(JSON.stringify(result));
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405);
    res.end();
    return;
  }

  const path = url.pathname === '/' || url.pathname === '/get' ? '/existing-home.html' : url.pathname;
  const file = join(root.pathname, 'public', path.replace(/^\/+/, ''));
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Homepage door: http://127.0.0.1:${port}/`);
  console.log(`Same page:     http://127.0.0.1:${port}/get`);
});
