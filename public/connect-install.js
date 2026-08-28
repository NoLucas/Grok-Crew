(function () {
  var script = document.currentScript;
  var origin = script && script.src ? new URL('.', script.src).href : location.origin + '/';
  var api = (script && script.getAttribute('data-api'))
    || new URL('api/get', origin).href;
  var releaseUrl = 'https://github.com/NoLucas/Grok-Crew/releases/tag/v1.0.0';
  var repoUrl = 'https://github.com/NoLucas/Grok-Crew';
  var markUrl = new URL('app-mark.png', origin).href;
  window.GROK_CREW_GET_API = api;

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

  function openDownloadDoor() {
    var install = document.getElementById('install');
    if (!install) return;
    install.setAttribute('aria-label', 'Grok Crew 파일 받기');
    install.innerHTML = ''
      + '<div class="terminal-top">'
      + '<span class="terminal-dots" aria-hidden="true"><i></i><i></i><i></i></span>'
      + '<span class="terminal-title">grok-crew / windows file</span>'
      + '</div>'
      + '<div class="get-ready" id="getReady">'
      + '<b>Windows 파일은 이메일 없이 받습니다</b>'
      + '<p>v1.0.0입니다. 받아서 엽니다. 계정은 없습니다.</p>'
      + '<a class="btn btn-primary" id="getDownload" href="' + releaseUrl + '">GrokCrew-Windows.exe 받기</a>'
      + '<ol class="get-steps">'
      + '<li>파란 “Windows의 PC 보호”가 뜨면 추가 정보 → 그래도 실행.</li>'
      + '<li>창이 열리면 연결에서 Grok Bot 또는 Agent를 붙입니다.</li>'
      + '<li>자동에 하고 싶은 말을 적고 만들기를 누릅니다.</li>'
      + '</ol>'
      + '</div>'
      + '<form class="get-form" id="getLead">'
      + '<label><span>나중에 소식만 받을 이메일 (선택)</span><input type="email" name="email" autocomplete="email" placeholder="name@example.com"></label>'
      + '<label class="get-honey" aria-hidden="true"><span>Company</span><input name="website" tabindex="-1" autocomplete="off"></label>'
      + '<button class="btn btn-secondary get-submit" type="submit">소식만 남기기</button>'
      + '<p class="get-note">이메일은 파일을 받는 문이 아닙니다. 영상은 받지 않습니다.</p>'
      + '<p class="get-error" id="getError" hidden></p>'
      + '</form>';

    var form = document.getElementById('getLead');
    var error = document.getElementById('getError');
    var submit = form.querySelector('button[type="submit"]');
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      error.hidden = true;
      submit.disabled = true;
      submit.textContent = '남기는 중';
      var data = new FormData(form);
      fetch(api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email: data.get('email'), website: data.get('website') }),
      }).then(function (response) {
        return response.json().then(function (body) { return { response: response, body: body }; });
      }).then(function (result) {
        if (!result.response.ok || !result.body.ok) {
          error.textContent = result.body.reason === 'save'
            ? '지금은 남기지 못했습니다. 잠시 뒤 다시 적어 주세요.'
            : '소식을 받으려면 이메일 한 줄이 필요합니다.';
          error.hidden = false;
          return;
        }
        form.hidden = true;
      }).catch(function () {
        error.textContent = '연결이 끊겼습니다. 같은 칸에 다시 적어 주세요.';
        error.hidden = false;
      }).then(function () {
        submit.disabled = false;
        submit.textContent = '소식만 남기기';
      });
    });
  }

  function alignCopy() {
    document.title = 'Grok Crew — with Grok Bot';
    setMeta('meta[name="description"]', 'content', 'v1.0.0. 쓰던 Grok Bot이나 Agent를 붙이면, 다듬은 파일이 이 PC 폴더에 남습니다. 지금은 무료입니다.');
    setMeta('meta[property="og:title"]', 'content', 'Grok Crew — with Grok Bot');
    setMeta('meta[property="og:description"]', 'content', '쇼츠를 혼자 자를 필요 없습니다. 쓰던 봇을 붙이면 파일이 이 PC에 남습니다.');
    setMeta('meta[name="twitter:title"]', 'content', 'Grok Crew — with Grok Bot');
    setMeta('meta[name="twitter:description"]', 'content', '쇼츠를 혼자 자를 필요 없습니다. 쓰던 봇을 붙이면 파일이 이 PC에 남습니다.');

    var replacements = [
      ['v0.2.3 · dev preview', 'v1.0.0 · with Grok Bot · 지금 무료'],
      ['v0.2.3 · 지금은 무료', 'v1.0.0 · with Grok Bot · 지금은 무료'],
      ['Grok에게 맡기고.', '쇼츠를 혼자'],
      ['필요할 때 잡는다.', '자를 필요 없다.'],
      ['이미 쓰는 봇에게 오늘 일을 넘기고, 완성 파일은 그 폴더에 남깁니다. 올리는 것은 저장한 뒤에, 원할 때만.', '쓰던 Grok Bot이나 Agent를 붙이면, 다듬은 파일이 이 PC 폴더에 남습니다. 계정 없고, 카드 없고, 크레딧 없습니다.'],
      ['이미 쓰는 Grok, Cursor, Claude, 또는 당신 봇을 연결합니다. 다른 PC의 봇은 이 주소를 열지 못합니다.', '쓰던 Grok Bot이나 Agent를 기획자·스크래핑·편집자로 붙입니다. 붙일 글만 복사합니다.'],
      ['이메일을 남기면 Windows 파일 하나를 받습니다. Pro와 Team은 Coming soon입니다. 지금은 살 수 없습니다.', '지금은 무료입니다. Windows 파일은 이메일 없이 받습니다. 내장 스킬이 연결과 함께 붙습니다.'],
      ['지금은 무료로 받는다.', '봇과 Agent용'],
      ['Pro와 Team은 아직이다.', '스킬이 이미 있다.'],
    ];
    replacements.forEach(function (pair) {
      replaceText(pair[0], pair[1]);
    });

    document.querySelectorAll('a[href*="github.com/NoLucas/"]').forEach(function (link) {
      var href = link.getAttribute('href') || '';
      if (href.indexOf('#') === 0) return;
      if (href.indexOf('/releases') !== -1) {
        link.href = releaseUrl;
        return;
      }
      link.href = repoUrl;
    });
  }

  swapIcons();
  alignCopy();
  openDownloadDoor();
})();
