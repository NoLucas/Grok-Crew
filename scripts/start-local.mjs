#!/usr/bin/env node
/** Start the complete local video workspace on this computer only. */

import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const studioRoot = join(root, 'local_studio');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const venvPython = join(studioRoot, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: 'inherit', ...options });
    child.on('error', reject);
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${command} exited with code ${code ?? 'unknown'}.`)));
  });
}

function available(command, args) {
  const result = spawnSync(command, args, { stdio: 'ignore' });
  return !result.error && result.status === 0;
}

function findPython() {
  if (process.env.PYTHON) return { command: process.env.PYTHON, args: [] };
  const candidates = process.platform === 'win32'
    ? [{ command: 'py', args: ['-3'] }, { command: 'python', args: [] }]
    : [{ command: 'python3', args: [] }, { command: 'python', args: [] }];
  const found = candidates.find(({ command, args }) => available(command, [...args, '--version']));
  if (!found) throw new Error('Python 3.10 or newer is required. Install it, then run npm run local again.');
  return found;
}

async function studioReady() {
  try {
    const response = await fetch('http://127.0.0.1:7214/health');
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForStudio() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (await studioReady()) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('Local Studio did not become ready on http://127.0.0.1:7214.');
}

async function main() {
  if (!existsSync(join(root, 'node_modules'))) await run(npm, ['ci']);

  const python = findPython();
  await run(python.command, [...python.args, '-c', "import sys; assert sys.version_info >= (3, 10), 'Python 3.10+ is required'"]);
  if (!existsSync(venvPython)) await run(python.command, [...python.args, '-m', 'venv', join(studioRoot, '.venv')]);
  await run(venvPython, ['-m', 'pip', 'install', '-r', join(studioRoot, 'requirements.txt')]);

  let studio = null;
  if (!await studioReady()) {
    studio = spawn(venvPython, ['studio_server.py', '--port', '7214'], { cwd: studioRoot, stdio: 'inherit' });
    studio.on('error', (error) => console.error(`Local Studio could not start: ${error.message}`));
    await waitForStudio();
  }

  console.log('\nLocal Video Workspace is ready at http://localhost:3000/production');
  console.log('Bots in this cloned folder can use: python local_studio/grok_crew.py contract\n');
  const web = spawn(npm, ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '3000', '--strictPort'], { cwd: root, stdio: 'inherit' });
  const close = () => { if (studio && !studio.killed) studio.kill(); if (!web.killed) web.kill(); };
  process.on('SIGINT', close); process.on('SIGTERM', close);
  web.on('exit', (code) => { close(); process.exitCode = code ?? 1; });
}

main().catch((error) => { console.error(`\nCould not start Local Video Workspace: ${error.message}`); process.exitCode = 1; });
