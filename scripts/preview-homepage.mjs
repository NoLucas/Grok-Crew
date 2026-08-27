#!/usr/bin/env node
/** Site track is closed. This process only serves the local Windows file. */

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('..', import.meta.url);
const port = Number(process.env.PORT || 43187);
const exeName = 'GrokCrew-Windows.exe';

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405);
    res.end();
    return;
  }
  if (url.pathname === `/${exeName}`) {
    try {
      const data = await readFile(join(root.pathname, 'public', exeName));
      res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
      res.end(req.method === 'HEAD' ? undefined : data);
      return;
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Windows file is not in this folder.');
      return;
    }
  }
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('No public site. Grok Crew is the program on this PC.');
});

server.listen(port, '127.0.0.1', () => {
  console.log(`No public site. File only: http://127.0.0.1:${port}/${exeName}`);
});
