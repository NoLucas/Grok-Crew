# 책상을 덜 헤매게 — 구현 계획

화면 디자인은 아래 **디자인 고정**을 따른다. 잔여 사이드카를 켤 때 정리하는 Electron 동작은 아직 Codex 슬라이스다.

기준 커밋: `e512e7780b878347418c9b03c418e5782939b0c04` (1.0.7, 종료 시 잔여 사이드카).
브랜치: 요청이 없으면 `cursor/fix-tts-first-run-26a7`를 유지한다. `main`에 커밋하지 않는다. 태그·릴리스·Drive 덮어쓰기는 Maintainer다.

우선순위(이전에 고른 앞 세 개): **잔여 사이드카·7214**, **어제랑 같게 다시 복사**, **연결 탭 크루 보드**.

---

## 이미 있는 것 — 다시 만들지 말 것

| 아이디어 | 지금 상태 |
| --- | --- |
| 창 닫기 = 숨기기, 종료 = 끊기 | `installCloseToTray`가 X를 숨긴다. 트레이에 숨기기/종료. 종료 경고는 `QUIT_WARNING`과 창의 종료 대화. 1.0.7은 `taskkill /T`로 `grok-crew-studio.exe`까지 끈다. |
| 7214 | 패키지 책상은 7214를 **먼저** 고른다. 잡혀 있으면 `reserveLoopbackPort`가 **아무 포트**를 쓴다. 연결 글은 그 포트를 넣지만, 어제 글·사람이 외운 7214와 어긋난다. |
| 나라·올릴 곳 기억 | `AUTO_PREFS_KEY`에 `market`, `recipeId`가 남는다. 자리 세 개 글을 **한 번에** 다시 복사하는 버튼은 없다. 자리는 하나씩. |
| 만들기 직후 복사 | 자동이 초대문을 클립보드에 넣는다. 대기 화면에 **다시 복사** 큰 버튼은 없다. 클립보드가 막히면 textarea. |
| SmartScreen 세 장 | `DesktopInstallHelp` SVG가 자동·짧은 책상 **접힌 도움** 안에 있다. 연결 탭에는 없다. 첫 설치가 여기서 멈춘다. |
| 크루 보드 | 자동 대기·도착과 **연결**에 있다. `GET /api/bot-activity` + 시작·넘김 `detail.note`만 대화로 쌓는다. 자리 확인은 올리지 않는다. 없는 말은 만들지 않는다. |
| 램프 | 연결됨 / 연결되지않음만. `seconds_since_checkin`은 roster에 이미 있다. |
| 업데이트 칩 | 새 버전이면 GitHub Release를 **연다**. exe를 받아 갈아끼우지는 않는다. `signed: false`면 `available_external`. |
| 같은 PC 봇이 초대문을 읽기 | `docs/AUTO_TAB.ko.md` 3판. 계약 전에 화면에 넣지 않는다. |
| Agent 체크인 | 닫혀 있다. 램프를 Agent에 쓰려면 그 결정이 먼저다. |

---

## 하지 않는 일 (전 슬라이스 공통)

- 구독·로그인 벽, 가짜 “봇이 읽었다”, 세 번째 램프 글자.
- 채팅·연결 글·메모에 토큰.
- 새 `/api/v2` 라우트. heartbeat `detail`에 필드 추가 + 클라이언트가 `GET /api/bot-activity`를 거르는 것으로 끝낸다.
- Agent Windows 체크인, 같은 PC 자동 읽기 UI.
- 호스트 이름 `DESKTOP-…` 하드코딩. 다른 사람 프로세스·모든 `python` 종료.
- exe 서명 값, Drive 자동 덮어쓰기, 설치 파일·`release/`·스크린샷 커밋.
- 한 PR에 여러 사용자 결과를 섞지 않는다.

---

## 슬라이스 순서와 의존

```
1  켤 때 잔여·7214          Codex (Electron main / process tree)
2  숨기기 ≠ 종료 글         Cursor 또는 Codex (글만, 동작은 1.0.7 유지)
3  어제랑 같게 + 대기 다시 복사   Cursor (app UI)
4  연결 탭 보드 + 한 건 묶기 + 메모 + keep 1분 자리 확인   Cursor (app UI, 초대문 한 줄)
5  SmartScreen 세 장을 연결에도   Cursor (그림·글만)
—  서명 / 제자리 업데이트 / Drive   Maintainer. 코드 슬라이스가 아니다.
```

1이 끝나야 연결 글의 포트가 어제와 같다. 3은 1 없이도 시작할 수 있으나, 잔여 포트가 바뀌면 “다시 복사”가 틀린 주소를 고정한다. **1 → 3 → 4**를 기본으로 한다. 2와 5는 글·그림이라 언제든 끼워도 된다.

버전을 1.0.8로 올리거나 태그하는 일은 **슬라이스가 끝나고 사람이 요청한 뒤**다.

---

## 슬라이스 1 — 켤 때 잔여만 정리하거나 7214를 쓴다

### Task packet

- **Workstream / owner:** `desk-port` / Codex (Integration Owner). Cursor는 이 슬라이스에서 `desktop/main.mjs`를 열지 않는다.
- **Base commit:** `e512e7780b878347418c9b03c418e5782939b0c04`
- **User-visible outcome:** 책상을 다시 켜면 체크인 주소가 **가능하면 127.0.0.1:7214**다. 예전에 죽은 `grok-crew-studio.exe`가 7214를 잡고 있으면 그 잔여만 끄거나, 그 사이드카가 살아 있으면 **그 포트에 붙는다.** 다른 프로그램이 7214를 쓰면 죽이지 않고 다른 포트를 쓰며, 연결 탭이 이미 하듯 그 주소를 크게 말한다.
- **Allowed paths:** `desktop/studio-port.mjs`, `desktop/studio-port.test.mjs`, `desktop/process-tree.mjs`, `desktop/process-tree.test.mjs`, `desktop/main.mjs`의 `startStudio`만, `scripts/smoke-tray.mjs`가 깨지면 그 파일.
- **Forbidden paths:** `local_studio/schemas/**`, `desktop/preload.cjs`, `/api/v2`, NSIS, 릴리스 워크플로, `app/**` (포트 경고 글은 이미 연결 탭에 있다).
- **Frozen contracts:** `DEFAULT_STUDIO_PORT = 7214`. 패키지 사이드카 이미지 이름 `grok-crew-studio.exe`. `POST /api/bot-entry`, `POST /api/bots/heartbeat`는 그대로. 토큰은 채팅에 안 넣는다. 루프백만.

### 동작 (추측하지 말 것)

지금 `reserveLoopbackPort`는 7214가 실패하면 `listen(0)`으로 **아무 포트**를 준다. `startStudio`는 그때마다 새 토큰으로 **새 프로세스**를 띄운다. 잔여 exe가 7214를 잡고 있으면 새 창은 7215 등을 열고, 어제 연결 글은 7214를 본다.

켤 때 순서:

1. 7214가 비면 지금처럼 7214를 예약하고 새 사이드카를 띄운다.
2. 7214가 열려 있으면 **누가 듣는지**만 본다. Windows에서 이미지 이름이 `grok-crew-studio.exe`이면 우리 잔여로 본다. 다른 이름(브라우저, 다른 앱)이면 건드리지 않는다.
3. 잔여이면 먼저 `http://127.0.0.1:7214/health`를 본다.
   - **살아 있으면** 새 사이드카를 띄우지 않고 그 포트를 쓴다. 새 랜덤 토큰으로 잔여를 밀어내지 않는다. 잔여가 거절하면(토큰 불일치) 잔여를 끈 뒤 7214를 다시 예약한다.
   - **죽어 있거나 health가 아니면** `stopNamedWindowsProcess('grok-crew-studio.exe')`로 **그 이미지만** 끈 뒤 7214를 다시 예약한다. 이미 있는 `process-tree.mjs`를 재사용한다.
4. 잔여가 아닌 점유면 지금처럼 다른 포트를 쓴다. 연결 탭의 “7214가 아니라 …” 글을 유지한다. 호스트 이름을 지어내지 않는다.
5. 개발(unpackaged)에서는 이미지 이름이 `python`일 수 있다. **모든 python을 끄지 않는다.** 개발은 포트만 예약하거나, 우리가 spawn한 PID만 추적한다.

창을 닫아 트레이로 숨긴 동안 사이드카는 **살아 있어야** 한다. 이 슬라이스는 **새 책상 프로세스의 시작**만 본다. 숨기기 경로에서 `taskkill`을 부르지 않는다.

### 수락

- 7214가 비면 7214로 뜬다.
- 죽은 `grok-crew-studio.exe`가 7214를 잡으면, 켠 뒤 체크인 주소가 다시 7214이거나, health가 되는 그 잔여 포트다.
- 다른 프로세스가 7214를 잡으면 그 프로세스는 살아 있고, 책상은 다른 포트 + 기존 경고.
- Linux CI에서 Windows `taskkill`을 호출하지 않는다. 오프-Windows는 지금처럼 SIGTERM / skip.

### 테스트

- `desktop/studio-port.test.mjs`: 선호 포트 성공, 실패 시 다른 포트, API base에서 포트 읽기(기존) + “잔여이면 선호 포트를 다시 시도” 순수 함수.
- `desktop/process-tree.test.mjs`: 이미지 종료 인자, 비-Windows skip (기존 확장).
- `npm run verify:desktop` (main/tray).
- 포커스: `npx tsx --test desktop/studio-port.test.mjs desktop/process-tree.test.mjs`

Windows 실기는 Maintainer: 1.0.6처럼 잔여를 남긴 뒤 1.0.7+를 켠다. 에이전트 VM은 Windows exe가 없다.

---

## 슬라이스 2 — 숨기기와 종료를 더 분명히

### Task packet

- **Workstream / owner:** `desk-quit-copy` / Cursor Cloud Agent (글). 종료 **동작**은 1.0.7에 있다. 끄기 로직을 다시 짜지 않는다.
- **Base commit:** 슬라이스 1 뒤 SHA, 또는 1과 같이 가지 않으면 `e512e77`.
- **User-visible outcome:** 사람이 X·숨기기·종료를 보고, **작업 관리자에 남는 것은 종료로만 끊긴다**는 것을 읽는다. 램프·연결 계약은 그대로다.
- **Allowed paths:** `desktop/tray-controller.mjs`의 `QUIT_WARNING` 문자열과 트레이 라벨, `scripts/smoke-tray.mjs`의 그 문자열 assert, `app/desktop-workspace.tsx` 종료 대화, `README.ko.md`·`docs/DESKTOP.ko.md`의 해당 두세 줄.
- **Forbidden paths:** `process-tree.mjs` 재작성, 스키마, 사이드카, 설치 프로그램.

### 넣을 말 (한국어 기준, 다른 언어는 같은 뜻)

- 종료 제목/본문 한 줄 추가: “창을 닫거나 숨기면 트레이에 남고 연결은 유지됩니다. `grok-crew-studio.exe`가 작업 관리자에 남는 것은 **종료**로만 끊깁니다.”
- 트레이: `숨기기`는 유지. `종료`는 유지. 필요하면 툴팁만.
- 창의 종료 버튼 옆에도 같은 한 줄. 버튼을 “강제 종료”로 바꾸지 않는다. 이미 있는 “종료”가 그 뜻이다.

### 수락

- X는 여전히 숨기기. 종료 확인 후에만 프로세스 트리를 끈다.
- `npm run desktop:tray-smoke`가 새 문구를 본다.
- 창을 닫았다고 사이드카를 끄지 않는다.

---

## 슬라이스 3 — 어제랑 같게, 대기 화면에 다시 복사

### Task packet

- **Workstream / owner:** `desk-recopy` / Cursor (Claude Code 역할: UI + focused test).
- **Base commit:** 슬라이스 1이 merge/푸시된 뒤 SHA를 고정한다. 포트가 어긋난 글을 저장하지 않기 위함이다.
- **User-visible outcome:**
  1. **연결**(그리고 자동 작성 화면이 필요하면 그곳)에 **어제랑 같게** 한 버튼. 누르면 마지막 **나라 · 올릴 곳 · Grok 자리 세 개** 연결 글을 다시 만든다. 클립보드에는 **한 번의 쓰기**로, 자리 이름이 적힌 세 덩어리를 넣는다. 사람이 봇 창 세 곳에 나눠 붙인다. “세 봇이 받았다”고 쓰지 않는다.
  2. 자동 **대기** 화면에 **다시 복사**가 크게 있다. 만드는 직후 넣었던 **그 일의 초대문**이다. 연결 글 세 개가 아니다.
- **Allowed paths:** `app/desktop-bot-links.ts`, `app/desktop-bot-links.test.mjs`, `app/desktop-bot-panel.tsx`, `app/desktop-auto-desk.tsx`, `app/desktop-auto-desk.test.mjs` 또는 자동 테스트가 있는 파일, `app/desktop-auto-state.ts`에 **토큰 없는** 마지막 복사 묶음 키만, `app/globals.css`(버튼 크기).
- **Forbidden paths:** Electron main/preload, sidecar, 스키마, Agent 체크인 문구 추가.

### 데이터

마지막 묶음은 이 PC `localStorage`다. 제안 키: `grok-crew-last-connect-bundle`.

저장할 것:

- `market`, `recipeId` (올릴 곳)
- `language`
- `copiedAt`
- 자리 세 개: `planner` / `scraper` / `editor`의 **종류(`grok`)** 와, 다시 만들 수 있는 입력(`pairCode`는 현재 창 것을 쓴다)

저장하지 말 것: 토큰, `LOCAL_STUDIO_TOKEN`, 전체 PowerShell에 박힌 비밀. 연결 글은 **누를 때** `remoteConnectPaste(..., studioPort, market)`로 다시 만든다. 어제 포트가 7214였고 오늘도 7214면 글이 같다. 오늘 포트가 다르면 **오늘 포트**가 맞다. 죽은 7214 글을 재생하지 않는다.

`AUTO_PREFS`의 나라·레시피를 고치는 것은 “어제랑 같게”의 일부다. 자동 작성칸의 나라·올릴 곳을 그 값으로 되돌린다. 연결 탭만 눌러도 세 자리 글은 복사된다.

클립보드가 하나라서 세 파일을 동시에 넣을 수 없다. **한 텍스트**에 자리 제목 + 구분선 + 각 연결 글을 잇는다. 막히면 세 textarea. 순차 복사(1번→2번→3번)는 하지 않는다. 사람이 세 번 버튼을 찾는 지금과 같아진다.

Agent 자리: 이미 대기/연결됨으로 저장된 글이 있을 때만 묶음에 넣는다. Agent 체크인 문장을 새로 만들지 않는다.

### 대기 화면

`showWaiting` 헤더 아래, “봇 창에 붙이세요” 바로 밑에 `desktop-primary` **다시 복사**. `inviteText`(만들기 직후 초대문)를 넣는다. 성공/막힘/빈 글 세 상태. 빈 글이면 버튼을 끄고 “다시 적기”로 보낸다.

### 수락

- 나라·올릴 곳을 바꾼 뒤 어제랑 같게를 누르면 그 두 값과 세 자리 글이 어제 저장본으로 돌아간다(포트는 오늘).
- 토큰 문자열이 묶음 JSON·클립보드 조립 함수 테스트에 나타나지 않는다.
- 대기 화면에서 다시 복사해도 램프는 그대로다. 복사 ≠ 연결됨.
- `node --test app/desktop-bot-links.test.mjs` (및 자동 데스크 focused test).

---

## 슬라이스 4 — 크루 보드를 연결에도, 한 건만, 메모

### Task packet

- **Workstream / owner:** `crew-board-connect` / Cursor.
- **Base commit:** 슬라이스 3 뒤 SHA.
- **User-visible outcome:** 연결 탭에도 같은 보드가 있다. 대기 중이 아니어도 남긴 한 줄을 본다. **한 규격**의 줄만 묶는다. 다음 자리가 연결되지않음이면 그 사실만 쓴다. 주고받은 말을 이 PC 메모로 저장·복사한다. Windows `keep`이 60초마다 자리 확인을 남긴다. 채팅은 매 분 예약 작업을 만들지 않는다. 60초를 넘기면 보드에 마지막 확인 N분만 적는다. 램프 글자는 늘 두 개다.
- **Allowed paths:** `app/desktop-crew-log.ts`, `app/desktop-crew-log.test.mjs`(없으면 추가), `app/desktop-crew-board.tsx`, `app/desktop-bot-panel.tsx`, `app/desktop-auto-desk.tsx`(필터·메모 버튼), `app/desktop-bot-links.ts`의 **Grok 초대 한 줄**(detail에 규격 id), `app/desktop-bot-links.test.mjs`, `app/globals.css`.
- **Forbidden paths:** `local_studio/studio_server.py` 새 라우트, `handlers.py`, 스키마, Agent 체크인, “읽음” 문구.

### 한 건만 묶기 — 새 API 없음

이미 있는 계약:

- `POST /api/bots/heartbeat` `{ bot_id, display_name, action, detail }`
- `safe_detail`는 dict를 그대로 두고, 너무 길면 `{ truncated: true }`
- `GET /api/bot-activity` 최근 80

초대문(Grok만)의 ready heartbeat 본문을 이렇게 바꾼다. 필드 이름은 이미 책상이 쓰는 **`edit_spec_id`** 로 통일한다. `spec_id`를 하나 더 만들지 않는다.

```json
{"note":"다음 자리에 남긴 한 줄","edit_spec_id":"<규격 id>"}
```

시작 heartbeat에도 같은 id를 넣으라고 한 줄만 적는다. `still_here`에는 id를 요구하지 않는다. 없으면 자리 확인 묶음으로만 본다.

클라이언트:

```ts
activityForSpec(activity, specId)
```

- `specId`가 있으면: `detail.edit_spec_id === specId` 인 일(start/ready)만 스레드·파이프라인에 넣는다.
- id가 없는 옛 줄은 **오늘 일 스레드에 넣지 않는다.** 섞느니 빈 보드가 낫다.
- `specId`가 없으면(연결 탭, 대기 전): id 있는 줄은 가장 최근 규격끼리만, id 없는 줄은 “규격 없이 남은 줄”로 나누거나 최근 묶음만. 어제와 오늘을 한 목록에 이어 붙이지 않는다.

자동 대기는 이미 `wait.specId`가 있다. 그 값을 보드에 넘긴다.

### 다음 자리 연결되지않음

`crewPipeline` / 보드 카드: `nextHandoffRole` 자리가 `connected === false`이면 메모·action 자리에 이 한 줄만 쓴다.

- ko: `다음 자리 · 연결되지않음`
- 읽지 않음, 대기 중, 봇이 안 봄 — 금지.

연결됨인데 heartbeat가 없으면 지금처럼 “남긴 말이 없습니다.” 읽었는지는 계속 모른다.

### 연결 탭에 같은 보드

`DesktopCrewBoard`를 `DesktopBotPanel` 아래(봇 붙이기 카드 뒤, 접힌 도움 앞)에 한 번 마운트한다. 자리 줄은 연결 탭이 이미 가진 roster/links로 `AutoSeatRow`를 만든다. 활동은 8초 폴링 `GET /api/bot-activity`. 로딩·빈·오류 카피는 기존 함수. 연결 램프를 보드에 복제하지 않는다.

### 자리 확인 분 — 보드만

Windows `keep`이 60초마다 `still_here`와 초대문 읽기를 한다. 채팅에 매 분 예약 작업을 만들지 않는다.

roster의 `seconds_since_checkin` 또는 마지막 `still_here` 시각. 60초를 넘기면 그 자리 카드에만:

- ko: `마지막 확인 N분 전`

N은 분으로 내림. 램프 라벨을 바꾸지 않는다. “끊김”·“자리 비움” 같은 세 번째 단어를 만들지 않는다.

### 이 PC 메모

보드에 **복사** / **이 PC에 저장**.

- 복사: 스레드를 사람 글(이름 · 시각 · note)로만. `detail.message`·truncated 덤프 없음. 없는 줄은 없음.
- 저장: 이 PC 파일. 사이드카가 쓰는 작업 폴더(`Videos/Grok Crew` 쪽) 또는 브라우저/데스크톱 저장 대화. 구름·Drive·채팅에 안 올린다.
- 파일에 토큰·초대 PowerShell 전체를 넣지 않는다.

IPC가 필요하면 기존 저장 길을 재사용한다. 새 preload 메서드를 먼저 만들지 말고, 막히면 계약 요청만 남긴다.

```text
Contract request
- consumer: app/desktop-crew-board.tsx
- missing operation: save a UTF-8 memo under the desk workspace
- input validation: text only, no token fields
- expected success/error: path shown / permission denied one line
- stale/locked behavior: none
```

### 수락

- 연결 탭에서 대기 없이 보드가 보인다.
- 규격 A의 ready와 규격 B의 ready가 한 스레드에 안 섞인다.
- 다음 자리 램프가 꺼져 있으면 보드가 “연결되지않음”만 쓴다.
- 램프 문자열 테스트에 세 번째 단어가 안 생긴다.
- focused: `app/desktop-crew-log` 필터·파이프라인·메모 텍스트.

---

## 슬라이스 5 — SmartScreen 그림 세 장

### Task packet

- **Workstream / owner:** `smartscreen-figures` / Cursor.
- **User-visible outcome:** 서명이 없을 때 첫 설치가 멈추는 그 세 장(보호 화면 → 추가 정보 → 그래도 실행)이 **연결 탭**과 기존 도움에 보인다. 접어 두지 않아도 연결이 비어 있으면 보인다.
- **Allowed paths:** `app/desktop-install-help.tsx`, `app/desktop-bot-panel.tsx`(도움 한 번 호출), `app/globals.css`, 이미 쓰는 SVG. **실사 PNG를 저장소에 새로 올리지 않는다** (용량·저작권). SVG를 파란 보호 화면에 더 가깝게 다듬는다.
- **Forbidden paths:** 서명 스크립트, NSIS, “이제 경고가 없다”는 문장.

`docs/SIGNED_INSTALL.ko.md`가 이미 이 길을 기본으로 둔다. 서명은 Maintainer 결정이다. 이 슬라이스는 그림과 위치만.

---

## 코드로 열지 않는 것

### Agent 램프

결정이 오기 전에 `remoteConnectPaste('custom', …)`에 Windows 체크인을 넣지 않는다. 연결 탭 Agent 칩·GROK_CREW_OK 붙이기는 지금 유지.

### 같은 PC 봇이 초대문을 스스로 읽기

`docs/AUTO_TAB.ko.md` 3판. 계약(누가 읽고, 실패하면 무슨 한 줄, 토큰·Origin)이 오기 전에 버튼·토글·미리보기를 만들지 않는다.

### exe 서명

`docs/SIGNED_INSTALL.ko.md`. 저장소 안에서 도장이 생기지 않는다. 자격 증명을 채팅·커밋에 넣지 않는다.

### 깔린 책상이 1.0.7+ exe를 받아 갈아끼우기

지금 `desktop/update-service.mjs`는 피드가 있으면 Release 페이지를 연다. 제자리 설치는 서명이 있어야 안전하다. 서명 없이 autoUpdater를 켜지 않는다.

나중에 열 때(별 패킷, Codex): electron-updater + `latest.yml`(이미 GHA가 만든다) + 서명된 exe. 그때 `updatePolicy`의 `signed: true`. 그 전까지 칩 문구를 “릴리스를 열어 다시 설치”로 더 분명히 해도 된다. 그건 글 한 줄이고 슬라이스 2에 붙여도 된다.

### Drive 손님 파일

파일 id `1f9vcPfX--XL--ysQzMfZa_DMPJfmyIkd`는 유지. Manage versions. 자동 덮어쓰기 없음. 에이전트 MCP는 ~250MB를 못 올린다.

---

## 검증 (슬라이스마다)

구현 중 가장 작은 focused test. 넘기기 전:

```powershell
npm run verify:core
python -m pytest -q local_studio/tests
```

`desktop/main.mjs`·preload·tray를 만졌으면:

```powershell
npm run verify:desktop
```

handoff는 `docs/AI_COLLABORATION.ko.md` 형식. 통과 수만 쓰지 말고 명령·OS·생략 이유를 적는다.

Windows에서만 되는 것(잔여 exe, SmartScreen, 트레이 종료)은 패킷에 “수동: …”로 남기고, Linux CI 실패로 위장하지 않는다.

---

## 한 슬라이스를 시작할 때

```powershell
git status --short
git fetch https://github.com/NoLucas/Grok-crew-test.git main
# 새 Claude 패킷이면 claude/<workstream>. Cursor 세션은 현재 브랜치 유지.
```

한 PR·한 세션에 사용자 결과 하나. 보드와 포트를 같이 넣지 않는다.

---

## 디자인 고정

새 화면은 기존 책상 토큰만 쓴다. `--desktop-blue` / `--desktop-amber` / `--desktop-green` / `--desktop-red`. 램프 글자는 연결됨 / 연결되지않음만. 세 번째 단어를 만들지 않는다.

| 화면 | 위계 | 상태 |
| --- | --- | --- |
| 종료 대화 | 제목 “숨기기와 종료는 다릅니다”. 위 카드는 숨기기(호박 줄), 아래 카드는 종료(빨강 줄). 버튼은 종료(빨강) · 돌아가기. 패키지 창도 **같은 카드**. 확인 뒤 `desktop:quit`는 네이티브 경고를 다시 띄우지 않는다. | 트레이 종료는 기존 네이티브 경고. 숨기기 카드에 숨기기 버튼. |
| 어제랑 같게 | 연결 탭, 자리 목록 **위**. 한 줄 요약(나라 · 올릴 곳 · 세 자리) + 가로로 꽉 찬 기본 버튼. | 복사함 / 막히면 **그 카드 안** textarea 하나. “세 봇이 받았다” 금지. |
| 대기 다시 복사 | “봇 창에 붙이세요” 바로 아래. 버튼이 제목 다음으로 크다. | `wait.inviteText`로 남긴다. 토큰 없음. 빈 초대문이면 꺼짐. 막히면 기존 textarea. |
| 크루 보드 | 연결에서는 **봇 붙이기 다음**, 이 PC에서 봇 쓰기 **앞**. 자동 대기·도착과 같은 컴포넌트. | 넘긴 `note`와 다음 자리 연결되지않음을 **같이**. ready 핸드오프가 있을 때만 다음 자리 줄. 어제 wait는 새 spec이 있으면 버린다. 읽음 없음. |
| SmartScreen | 연결이 비어 있으면 접지 않고 파란 그림 세 장. 붙인 뒤에는 접힌 도움. | 실사 PNG 없음. |
| 7214가 아님 | 호박 배너. 연결 글보다 위에. | 호스트 이름을 쓰지 않음. |

모바일(720px 이하)에서는 파이프와 SmartScreen 세 장이 한 줄로 내려간다.

