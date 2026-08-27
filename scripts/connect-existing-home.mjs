#!/usr/bin/env node
/** One-shot: turn the live chatgpt.site HTML into the connected public door. */

import { readFile, writeFile } from 'node:fs/promises';

const source = process.argv[2] || '/tmp/grok-crew-home.html';
const dest = process.argv[3] || new URL('../public/existing-home.html', import.meta.url);

let html = await readFile(source, 'utf8');

html = html.replace(/<script>\(function\(\)\{function c\(\)\{[\s\S]*?<\/script>\s*<\/body>/, '</body>');

const install = `      <div class="terminal reveal delay-3" id="install" aria-label="Grok Crew 파일 받기">
        <div class="terminal-top">
          <span class="terminal-dots" aria-hidden="true"><i></i><i></i><i></i></span>
          <span class="terminal-title">grok-crew / windows file</span>
        </div>
        <form class="get-form" id="getLead">
          <label>
            <span>파일을 받을 이메일</span>
            <input type="email" name="email" autocomplete="email" required placeholder="name@example.com">
          </label>
          <label class="get-honey" aria-hidden="true">
            <span>Company</span>
            <input name="website" tabindex="-1" autocomplete="off">
          </label>
          <button class="btn btn-primary get-submit" type="submit">이메일을 남기고 받기</button>
          <p class="get-note">받는 것은 Windows 파일 하나입니다. 나중에 유료나 새 파일이 열리면 이 주소로만 알립니다. 영상은 안 받습니다. 창 안의 오늘 일은 이메일 없이 됩니다.</p>
          <p class="get-error" id="getError" hidden></p>
        </form>
        <div class="get-ready" id="getReady" hidden>
          <b>받을 문이 열렸습니다</b>
          <p>아래 파일을 받아 더블클릭하세요. 계정은 없습니다.</p>
          <a class="btn btn-primary" id="getDownload" href="#">GrokCrew-Windows.exe 받기</a>
          <ol class="get-steps">
            <li>파란 “Windows의 PC 보호”가 뜨면 추가 정보 → 그래도 실행.</li>
            <li>창이 열리면 연결에서 봇을 붙입니다.</li>
            <li>자동에 오늘 올릴 말만 적고 시작합니다.</li>
          </ol>
        </div>
      </div>`;

html = html.replace(
  /      <div class="terminal reveal delay-3" id="install"[\s\S]*?      <\/div>\n    <\/section>/,
  `${install}\n    </section>`,
);

html = html.replace('무료 설치 명령 보기', '이메일 남기고 받기');
html = html.replace(
  'Requires Node.js 22+ · Python 3.10+ · No Grok Crew cloud account · No API key',
  'Windows 파일 하나 · 계정 없음 · 지금은 무료',
);
html = html.replaceAll('https://github.com/NoLucas/Grok-Crew', 'https://github.com/NoLucas/Grok-crew-test');
html = html.replaceAll('<span class="brand-mark">G</span>', '<span class="brand-mark"><img src="/app-mark.png" alt="" width="28" height="28"></span>');
html = html.replace(
  /<article class="price-card featured[\s\S]*?<\/article>\s*<article class="price-card reveal delay-3">[\s\S]*?<\/article>/,
  `          <article class="price-card featured soon reveal delay-2">
            <span class="popular soon">Coming soon</span>
            <span class="plan">Pro</span>
            <div class="price">$39 <small>1회 결제</small></div>
            <p class="price-note">나중에 한 사람 한 PC 권리를 열 때 이야기입니다.</p>
            <p class="price-proof">지금은 살 수 없음 · 결제 문을 열지 않음</p>
            <ul class="features">
              <li>한 사람 한 PC 권리</li>
              <li>받아서 바로 열리는 설치</li>
              <li>연결을 더 짧게</li>
              <li>도장은 돈을 받을 때</li>
            </ul>
            <button class="btn btn-primary btn-soon" type="button" disabled>Coming soon</button>
            <p class="soon-note">열리면 위에 남긴 이메일로만 알립니다</p>
          </article>
          <article class="price-card soon reveal delay-3">
            <span class="popular soon">Coming soon</span>
            <span class="plan">Team</span>
            <div class="price">$8 <small>/ 시트 / 월</small></div>
            <p class="price-note">팀 공동 편집 테이블은 열지 않습니다. 각자 자기 PC입니다.</p>
            <p class="price-proof">지금은 살 수 없음 · 결제 문을 열지 않음</p>
            <ul class="features">
              <li>각자 자기 프로그램</li>
              <li>일과 끝난 파일만 옮김</li>
              <li>구름 위 공동 편집 없음</li>
            </ul>
            <button class="btn btn-secondary btn-soon" type="button" disabled>Coming soon</button>
            <p class="soon-note">지금은 살 수 없습니다</p>
          </article>`,
);
if (html.includes('Pro 확인하기') || html.includes('Team 확인하기')) {
  throw new Error('Connected homepage still sells Pro or Team.');
}

const formCss = `
    .get-form, .get-ready { padding:22px 20px 24px; }
    .get-form { display:grid; gap:14px; }
    .get-form label { display:flex; flex-direction:column; gap:8px; color:var(--soft); font-size:12px; font-weight:750; }
    .get-form input[type=email] {
      min-height:48px; padding:0 14px; border:1px solid var(--line); border-radius:8px;
      background:var(--bg); color:var(--text); font:650 15px var(--sans);
    }
    .get-form input[type=email]:focus { outline:2px solid color-mix(in srgb,var(--yellow) 55%,transparent); border-color:var(--yellow); }
    .get-honey { position:absolute; left:-9999px; width:1px; height:1px; overflow:hidden; }
    .get-submit { width:100%; border:0; cursor:pointer; }
    .get-submit:disabled { opacity:.6; cursor:wait; }
    .get-note, .get-ready p, .get-steps { margin:0; color:var(--soft); font-size:13px; line-height:1.55; }
    .get-error { margin:0; color:var(--red); font-size:13px; font-weight:700; }
    .get-ready { display:grid; gap:14px; }
    .get-form[hidden], .get-ready[hidden], .get-error[hidden] { display:none; }
    .get-ready b { font-size:18px; letter-spacing:-.03em; }
    .get-steps { padding-left:18px; }
    .get-steps li + li { margin-top:6px; }
`;

html = html.replace('  </style>', `${formCss}  </style>`);

const oldJsStart = `      const commands = 'git clone https://github.com/NoLucas/Grok-Crew.git grok-crew\\ncd grok-crew\\nnpm run local';
      const terminalText = document.getElementById('terminalText');
      const copyButton = document.getElementById('copyCommands');

      function colorizeTerminal(value) {
        terminalText.textContent = '';
        const lines = value.split('\\n');
        lines.forEach((line, index) => {
          const prompt = document.createElement('span');
          prompt.className = 'prompt';
          prompt.textContent = '$ ';
          terminalText.appendChild(prompt);
          terminalText.appendChild(document.createTextNode(line));
          if (index < lines.length - 1) terminalText.appendChild(document.createTextNode('\\n'));
        });
      }

      if (reduced) {
        colorizeTerminal(commands);
      } else {
        let typed = '';
        let cursor = 0;
        const type = () => {
          typed += commands[cursor++] || '';
          colorizeTerminal(typed);
          if (cursor < commands.length) setTimeout(type, commands[cursor - 1] === '\\n' ? 420 : 20 + Math.random() * 34);
        };
        setTimeout(type, 820);
      }

      copyButton.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(commands);
          copyButton.textContent = 'Copied';
        } catch (_) {
          copyButton.textContent = 'Select';
          const selection = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(terminalText);
          selection.removeAllRanges();
          selection.addRange(range);
        }
        setTimeout(() => { copyButton.textContent = 'Copy'; }, 1600);
      });

`;

const newJs = `      const getLead = document.getElementById('getLead');
      const getReady = document.getElementById('getReady');
      const getError = document.getElementById('getError');
      const getDownload = document.getElementById('getDownload');
      const getSubmit = getLead.querySelector('button[type="submit"]');
      const getApi = window.GROK_CREW_GET_API || '/api/get';

      getLead.addEventListener('submit', async (event) => {
        event.preventDefault();
        getError.hidden = true;
        getSubmit.disabled = true;
        getSubmit.textContent = '문을 여는 중';
        try {
          const data = new FormData(getLead);
          const response = await fetch(getApi, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ email: data.get('email'), website: data.get('website') }),
          });
          const body = await response.json();
          if (!response.ok || !body.ok || !body.downloadUrl) {
            getError.textContent = body.reason === 'save'
              ? '지금은 문을 열지 못했습니다. 잠시 뒤 다시 적어 주세요.'
              : '이메일 한 줄이 필요합니다.';
            getError.hidden = false;
            return;
          }
          getDownload.href = body.downloadUrl;
          getLead.hidden = true;
          getReady.hidden = false;
        } catch (_) {
          getError.textContent = '연결이 끊겼습니다. 같은 칸에 다시 적어 주세요.';
          getError.hidden = false;
        } finally {
          getSubmit.disabled = false;
          getSubmit.textContent = '이메일을 남기고 받기';
        }
      });

`;

if (!html.includes(oldJsStart)) {
  throw new Error('Could not find the git-clone install script to replace.');
}
html = html.replace(oldJsStart, newJs);

if (!html.includes('id="getLead"') || html.includes('git clone')) {
  throw new Error('Connected homepage still has the old install door.');
}

await writeFile(dest, html);
console.log(`wrote ${dest}`);
