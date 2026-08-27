(function () {
  var script = document.currentScript;
  var origin = script && script.src ? new URL('.', script.src).href : location.origin + '/';
  var api = window.GROK_CREW_GET_API
    || (script && script.getAttribute('data-api'))
    || new URL('api/get', origin).href;
  var markUrl = new URL('app-mark.png', origin).href;

  function ensureStyle() {
    if (document.getElementById('get-form-style')) return;
    var style = document.createElement('style');
    style.id = 'get-form-style';
    style.textContent = [
      '.get-form,.get-ready{padding:22px 20px 24px}',
      '.get-form{display:grid;gap:14px}',
      '.get-form label{display:flex;flex-direction:column;gap:8px;color:var(--soft);font-size:12px;font-weight:750}',
      '.get-form input[type=email]{min-height:48px;padding:0 14px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--text);font:650 15px var(--sans)}',
      '.get-honey{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}',
      '.get-submit{width:100%;border:0;cursor:pointer}',
      '.get-note,.get-ready p,.get-steps{margin:0;color:var(--soft);font-size:13px;line-height:1.55}',
      '.get-error{margin:0;color:var(--red);font-size:13px;font-weight:700}',
      '.get-ready{display:grid;gap:14px}',
      '.get-form[hidden],.get-ready[hidden],.get-error[hidden]{display:none}',
      '.get-ready b{font-size:18px}',
      '.brand-mark{display:grid;place-items:center;width:28px;height:28px;border:0;border-radius:8px;overflow:hidden;padding:0;background:transparent}',
      '.brand-mark img{width:100%;height:100%;display:block}',
      '.price-card.soon{opacity:.92}',
      '.popular.soon{background:var(--line);color:var(--text)}',
      '.btn-soon{opacity:.55;cursor:not-allowed;pointer-events:none;transform:none}',
      '.soon-note{margin:10px 0 0;color:var(--soft);font:650 11px/1.5 var(--mono);letter-spacing:.04em;text-transform:uppercase}',
    ].join('');
    document.head.appendChild(style);
  }

  function setMeta(selector, attr, value) {
    var el = document.querySelector(selector);
    if (el) el.setAttribute(attr, value);
  }

  function replaceText(from, to) {
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    var node;
    while ((node = walker.nextNode())) {
      if (node.nodeValue && node.nodeValue.indexOf(from) !== -1) {
        node.nodeValue = node.nodeValue.split(from).join(to);
      }
    }
  }

  function swapIcons() {
    var link = document.querySelector('link[rel="icon"]') || document.createElement('link');
    link.rel = 'icon';
    link.href = markUrl;
    if (!link.parentNode) document.head.appendChild(link);
    document.querySelectorAll('.brand-mark').forEach(function (mark) {
      mark.textContent = '';
      var img = document.createElement('img');
      img.src = markUrl;
      img.alt = '';
      img.width = 28;
      img.height = 28;
      mark.appendChild(img);
    });
  }

  function openEmailDoor() {
    var install = document.getElementById('install');
    if (!install) return;
    install.setAttribute('aria-label', 'Grok Crew 파일 받기');
    install.innerHTML = ''
      + '<div class="terminal-top">'
      + '<span class="terminal-dots" aria-hidden="true"><i></i><i></i><i></i></span>'
      + '<span class="terminal-title">grok-crew / windows file</span>'
      + '</div>'
      + '<form class="get-form" id="getLead">'
      + '<label><span>파일을 받을 이메일</span><input type="email" name="email" autocomplete="email" required placeholder="name@example.com"></label>'
      + '<label class="get-honey" aria-hidden="true"><span>Company</span><input name="website" tabindex="-1" autocomplete="off"></label>'
      + '<button class="btn btn-primary get-submit" type="submit">이메일을 남기고 받기</button>'
      + '<p class="get-note">받는 것은 Windows 파일 하나입니다. 나중에 유료나 새 파일이 열리면 이 주소로만 알립니다. 영상은 안 받습니다. 창 안의 오늘 일은 이메일 없이 됩니다.</p>'
      + '<p class="get-error" id="getError" hidden></p>'
      + '</form>'
      + '<div class="get-ready" id="getReady" hidden>'
      + '<b>받을 문이 열렸습니다</b>'
      + '<p>아래 파일을 받아 더블클릭하세요. 계정은 없습니다.</p>'
      + '<a class="btn btn-primary" id="getDownload" href="#">GrokCrew-Windows.exe 받기</a>'
      + '<ol class="get-steps">'
      + '<li>파란 “Windows의 PC 보호”가 뜨면 추가 정보 → 그래도 실행.</li>'
      + '<li>창이 열리면 연결에서 봇을 붙입니다.</li>'
      + '<li>자동에 오늘 올릴 말만 적고 시작합니다.</li>'
      + '</ol>'
      + '</div>';

    var form = document.getElementById('getLead');
    var ready = document.getElementById('getReady');
    var error = document.getElementById('getError');
    var download = document.getElementById('getDownload');
    var submit = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      error.hidden = true;
      submit.disabled = true;
      submit.textContent = '문을 여는 중';
      var data = new FormData(form);
      fetch(api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email: data.get('email'), website: data.get('website') }),
      }).then(function (response) {
        return response.json().then(function (body) { return { response: response, body: body }; });
      }).then(function (result) {
        if (!result.response.ok || !result.body.ok || !result.body.downloadUrl) {
          error.textContent = result.body.reason === 'save'
            ? '지금은 문을 열지 못했습니다. 잠시 뒤 다시 적어 주세요.'
            : '이메일 한 줄이 필요합니다.';
          error.hidden = false;
          return;
        }
        download.href = result.body.downloadUrl;
        form.hidden = true;
        ready.hidden = false;
      }).catch(function () {
        error.textContent = '연결이 끊겼습니다. 같은 칸에 다시 적어 주세요.';
        error.hidden = false;
      }).then(function () {
        submit.disabled = false;
        submit.textContent = '이메일을 남기고 받기';
      });
    });
  }

  function comingSoonButton(kind) {
    var wrap = document.createElement('div');
    var button = document.createElement('button');
    button.className = kind === 'Pro' ? 'btn btn-primary btn-soon' : 'btn btn-secondary btn-soon';
    button.type = 'button';
    button.disabled = true;
    button.textContent = 'Coming soon';
    var note = document.createElement('p');
    note.className = 'soon-note';
    note.textContent = kind === 'Pro'
      ? '열리면 위에 남긴 이메일로만 알립니다'
      : '지금은 살 수 없습니다';
    wrap.appendChild(button);
    wrap.appendChild(note);
    return wrap;
  }

  function blockPaidPlans() {
    document.querySelectorAll('.price-card').forEach(function (card) {
      var plan = card.querySelector('.plan');
      var name = plan ? plan.textContent.trim() : '';
      if (name !== 'Pro' && name !== 'Team') return;
      card.classList.add('soon');
      var popular = card.querySelector('.popular');
      if (!popular) {
        popular = document.createElement('span');
        popular.className = 'popular';
        card.insertBefore(popular, card.firstChild);
      }
      popular.classList.add('soon');
      popular.textContent = 'Coming soon';
      card.querySelectorAll('a.btn').forEach(function (link) {
        link.replaceWith(comingSoonButton(name));
      });
    });
  }

  function alignCopy() {
    document.title = 'Grok Crew — 이 PC에서 열고, 봇에게 넘긴다';
    setMeta('meta[name="description"]', 'content', '이 PC에 두는 프로그램. 쓰는 봇에게 오늘 일을 넘기고, 완성 파일은 그 폴더에 남긴다.');
    setMeta('meta[property="og:title"]', 'content', 'Grok Crew — 이 PC에서 열고, 봇에게 넘긴다');
    setMeta('meta[property="og:description"]', 'content', '이 PC에 두는 프로그램. 쓰는 봇에게 오늘 일을 넘기고, 완성 파일은 그 폴더에 남긴다.');
    setMeta('meta[name="twitter:title"]', 'content', 'Grok Crew — 이 PC에서 열고, 봇에게 넘긴다');
    setMeta('meta[name="twitter:description"]', 'content', '이 PC에 두는 프로그램. 쓰는 봇에게 오늘 일을 넘기고, 완성 파일은 그 폴더에 남긴다.');

    var replacements = [
      ['Claude Code, Codex 같은 에이전트가 로컬 API로 편집하고 게시합니다. 얼마나 맡길지는 당신이 정합니다.', '이미 쓰는 봇에게 오늘 일을 넘기고, 완성 파일은 그 폴더에 남깁니다. 올리는 것은 저장한 뒤에, 원할 때만.'],
      ['Local-first video editing workspace for people and same-PC bots. ', '이 PC에 두는 프로그램입니다. '],
      ['Grok Crew는 클라우드 영상 편집 툴이 아닙니다. 같은 PC의 에이전트가 로컬 API를 통해 편집하고, 로컬 MP4를 만듭니다.', '클라우드 편집기도, 영상을 만들어 주는 집도 아닙니다. 프로그램을 열고, 쓰는 봇을 붙이고, 한 줄을 넘기면 컷이 이 화면에 옵니다.'],
      ['원본을 서비스로 업로드해 웹에서 처리', '원본을 서비스로 올려 웹에서 처리'],
      ['로그인과 서비스 연결을 먼저 구성', '로그인과 결제를 먼저 여야 시작'],
      ['에이전트는 브라우저와 로컬 파일 사이를 오감', '우리가 영상을 만들거나 알아서 올리는 집'],
      ['원본, 편집 API, 렌더가 같은 PC에 존재', '프로그램·원본·컷이 같은 PC에 남음'],
      ['Grok Crew 클라우드 계정·API 키 없이 시작', '계정 없이 연다. 시작 앞에 로그인이 없음'],
      ['Claude Code와 Codex가 로컬 API를 직접 호출', '사람이 봇 창에 붙인다. 글과 끝난 파일만 오간다'],
      ['증거: 로컬 MP4 렌더 → 큐 또는 자동 게시', '증거: 저장은 이 PC 폴더. 자동 게시는 기본이 아니다'],
      ['촬영본에서 게시 큐까지. Grok이 수행하는 실제 순서입니다. 중간에 멈추고 직접 편집해도 됩니다.', '촬영본을 우리가 올리는 흐름이 아닙니다. 받아서 열고, 붙이고, 한 줄 적고, 파일을 받습니다.'],
      ['다섯 단계.', '다섯 걸음.'],
      ['Grok이 로컬 API로 편집을 수행합니다. 맡길 범위를 정하고, 필요하면 직접 이어받습니다.', '프로그램이 일을 복사해 두고, 사람은 봇 창에 붙입니다. 이 화면은 봇이 읽었는지 모릅니다.'],
      ['완성본을 큐에 두거나 Instagram, TikTok, YouTube로 자동 게시합니다.', '컷이 오면 이 화면에서 보고, 이 컴퓨터 폴더에 파일로 둡니다. 올리는 것은 저장한 뒤에, 원할 때만.'],
      ['구체적 증거 · 세 플랫폼 게시 흐름까지 연결', '구체적 증거 · 저장은 이 PC. 게시는 기본이 아님'],
      ['큐 또는 자동 게시', '이 폴더에 저장'],
      ['무료 버전도 로컬 전체 기능을 포함합니다. 설치와 연결의 수고를 줄이거나 팀에서 쓸 때 업그레이드합니다.', '이메일을 남기면 Windows 파일 하나를 받습니다. Pro와 Team은 Coming soon입니다. 지금은 살 수 없습니다.'],
      ['로컬로 시작.', '지금은 무료로 받는다.'],
      ['필요한 만큼 확장.', 'Pro와 Team은 아직이다.'],
      ['로컬에서 전부 직접 구성합니다.', '받아서 엽니다. 카드와 계정이 없습니다.'],
      ['증거 · 로컬 전체 기능 + 수동 OAuth 설정', '증거 · Windows 파일 + 계정 없이 시작'],
      ['수동 OAuth 설정', '계정 없이 연결 · 자동 · 저장'],
      ['설치와 게시 연결을 짧게 만듭니다.', '나중에 한 사람 한 PC 권리를 열 때 이야기입니다.'],
      ['증거 · 서명된 설치파일 + 원클릭 OAuth 연결', '지금은 살 수 없음 · 결제 문을 열지 않음'],
      ['원클릭 OAuth 연결', '연결을 더 짧게'],
      ['하이라이트 자동 클리핑', '도장은 돈을 받을 때'],
      ['게시 성과 피드백', '결제 없음'],
      ['워터마크 제거', '지금은 살 수 없음'],
      ['대본 컷맵을 만들고, 봇 편집 방식을 적용하고, MP4를 렌더하고, 게시 큐까지 보냅니다. 당신은 언제든 타임라인을 다시 잡을 수 있습니다.', '연결에서 봇을 붙이고, 자동에 한 줄을 적고, 그 창에 붙이면 컷이 이 화면에 옵니다. 파일은 그 폴더에 남습니다. 올리는 것은 원할 때만.'],
      ['로컬에서 시작한다.', '이 PC에서 연다.'],
      ['Grok이 이어받는다.', '봇이 이어받는다.'],
      ['Pipeline telemetry · live demo', 'This PC · guest loop'],
      ['AGENT: 씬 4/9 컷 편집 중', 'PERSON: 봇 창에 붙임'],
      ['QUEUE: 게시 준비 완료', 'SAVE: 이 PC 폴더에 저장'],
      ['Requires Node.js 22+ · Python 3.10+ · No Grok Crew cloud account · No API key', 'Windows 파일 하나 · 계정 없음 · 지금은 무료'],
      ['무료 설치 명령 보기', '이메일 남기고 받기'],
    ];
    replacements.forEach(function (pair) {
      replaceText(pair[0], pair[1]);
    });

    document.querySelectorAll('a[href*="github.com/NoLucas/Grok-Crew"]').forEach(function (link) {
      if (link.getAttribute('href').indexOf('#') === 0) return;
      link.href = 'https://github.com/NoLucas/Grok-crew-test';
    });
  }

  ensureStyle();
  swapIcons();
  alignCopy();
  blockPaidPlans();
  openEmailDoor();
})();
