(function () {
  var install = document.getElementById('install');
  if (!install) return;
  var script = document.currentScript;
  var api = window.GROK_CREW_GET_API
    || (script && script.getAttribute('data-api'))
    || (script && script.src ? new URL('/api/get', script.src).href : '/api/get');

  if (!document.getElementById('get-form-style')) {
    var style = document.createElement('style');
    style.id = 'get-form-style';
    style.textContent = '.get-form,.get-ready{padding:22px 20px 24px}.get-form{display:grid;gap:14px}.get-form label{display:flex;flex-direction:column;gap:8px;color:var(--soft);font-size:12px;font-weight:750}.get-form input[type=email]{min-height:48px;padding:0 14px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--text);font:650 15px var(--sans)}.get-honey{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}.get-submit{width:100%;border:0;cursor:pointer}.get-note,.get-ready p,.get-steps{margin:0;color:var(--soft);font-size:13px;line-height:1.55}.get-error{margin:0;color:var(--red);font-size:13px;font-weight:700}.get-ready{display:grid;gap:14px}.get-form[hidden],.get-ready[hidden],.get-error[hidden]{display:none}.get-ready b{font-size:18px}';
    document.head.appendChild(style);
  }
  install.setAttribute('aria-label', 'Grok Crew 파일 받기');
  install.innerHTML = ''
    + '<div class="terminal-top">'
    + '<span class="terminal-dots" aria-hidden="true"><i></i><i></i><i></i></span>'
    + '<span class="terminal-title">grok-crew / windows file</span>'
    + '</div>'
    + '<form class="get-form" id="getLead">'
    + '<label><span>이메일</span><input type="email" name="email" autocomplete="email" required placeholder="you@example.com"></label>'
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
})();
