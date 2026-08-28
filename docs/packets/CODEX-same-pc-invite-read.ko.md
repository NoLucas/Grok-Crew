# Codex · 같은 PC 봇이 대기 초대문을 스스로 읽기

AUTO 3판. UI는 이 계약이 merge되기 전에 “봇이 읽는 중”을 그리지 않는다.
사람은 그동안 **다시 복사**로 봇 창에 붙인다.

## Task packet
- Workstream / owner: `codex/same-pc-invite-read` · Codex (Integration Owner)
- Base commit: `3b32b9a` on `cursor/fix-tts-first-run-26a7` (Grok-crew-test). Rebase onto the later Auto/Connect commit on that branch if it is newer.
- User-visible outcome: 같은 Windows에 이미 체크인한 Grok 자리(`grok-planner` · `grok-scraper` · `grok-editor`)가, 운영자가 자동에서 일을 시작한 뒤, 사람이 초대문을 두 번 붙이지 않아도 자기 자리의 대기 초대문을 가져간다. 램프 문구는 여전히 **연결됨 / 연결되지않음**만. 복사만으로 초록불이 켜지지 않는다.
- Allowed paths:
  - `local_studio/handlers.py`
  - `local_studio/edit_spec.py`
  - `local_studio/studio_server.py` (라우트 등록이 여기 있으면)
  - `local_studio/config.py` (공개 경로를 열어야 하면, 기본은 토큰 유지)
  - `local_studio/grok_crew.py` (같은 PC CLI가 그 읽기를 호출해야 하면)
  - `local_studio/tests/test_edit_spec.py`
  - `local_studio/tests/test_api.py` (또는 이 계약 전용 focused test)
  - `docs/AUTO_TAB.ko.md` (3판 한 줄: 계약 경로만)
  - `desktop/preload.cjs` · `desktop/main.mjs` — **루프백 봇 읽기에 IPC가 꼭 필요할 때만**. 필요 없으면 열지 말 것.
- Forbidden paths:
  - `local_studio/schemas/**`
  - SQLite migration을 새 테이블로 늘리는 일 (기존 spec/heartbeat로 충분하면 금지)
  - `app/**` UI (“봇이 읽는 중” 문구, 붙여넣기 버튼 삭제)
  - `/api/v2`에 임시 필드 추가
  - 네 번째 문(door). 문은 `editor` · `collector`만.
  - `127.0.0.1`을 다른 PC·Linux·클라우드에 여는 일
  - 토큰을 채팅·초대문·스킬 파일에 넣는 일
  - `package.json` packaging, `.github/workflows/**`, release, Drive exe
- Frozen contracts and examples:
  - 기존 `GET /api/v2/edit-specs/{id}/invite`는 사람이 spec id를 알 때 쓰는 붙여넣기용. 봇은 spec id를 모름.
  - 재사용: `POST /api/bot-entry`, `POST /api/bots/heartbeat`, `GET /api/bot-activity`, roster `bot_id`.
  - 자리 id: `grok-planner` / `grok-scraper` / `grok-editor`. purpose: `plan_edit` / `collect` / `edit_video`.
  - scraper 자리 ↔ collector 문. editor 자리 ↔ editor 문. planner는 문이 없다. planner 문을 만들지 말 것.
  - spec `status === waiting_for_bot` 인 것만.
  - 루프백만. `Origin`이 브라우저이면 지금과 같이 localhost 렌더러만.
  - 토큰: 기본은 필요. Windows PowerShell이 `Origin` 없이 heartbeat를 치는 예외를 초대문 읽기에 넓히면, 그 예외를 테스트로 고정하고 채팅에 토큰을 넣지 말 것.
- Acceptance criteria:
  - 체크인한 `bot_id`가 자기 자리의 대기 초대문 텍스트와 `edit_spec_id`를 받는다. 이미 그 봇이 읽었으면 이미-읽음 표시.
  - 대기 없음 → 404. 다른 봇이 가져감 → 409. 자리 불일치 → 403.
  - 어제 leftover spec은 더 새로운 wait가 있으면 돌려주지 않는다.
  - 다른 봇이 가져간 spec은 재사용 금지.
  - 새 `/api/v2` 필드 없음. 초대문 본문에 토큰 없음.
  - UI는 이 PR에서 “봇이 읽는 중”을 그리지 않는다.
- Required focused tests:
  - 같은 PC, 체크인된 planner/scraper/editor가 각자 자기 wait만 받음
  - 자리 불일치 403
  - 두 번째 봇이 같은 spec을 못 가져감 409
  - 어제 spec vs 오늘 wait
  - 토큰/루프백 거부 (브라우저 Origin, 비-루프백)
- Required full checks:
  - `python -m pytest -q local_studio/tests`
  - 사이드카/핸들러를 바꿨으면 `npm run verify:desktop` (preload/main을 연 경우)
- Manual reproduction steps:
  1. Windows에서 기획·스크랩·편집 세 자리를 체크인한다.
  2. 자동에서 제목과 공개 파일 URL을 넣고 시작한다.
  3. 사람이 초대문을 다시 붙이지 않은 채, 체크인한 자리 CLI 또는 계약된 읽기 한 번으로 초대문 텍스트가 온다.
  4. 그 전까지 자동 화면은 여전히 “복사했습니다. 봇 창에 붙이세요.”
- Expected screenshots or fixtures: API JSON fixture. UI 스크린샷 없음 (UI는 후속 Claude 패킷).
- Dependencies / blocked-by PR: 없음. Connect 탭이 복사 후 자동으로 넘어가지 않는 UI 수정과는 독립.

## Contract request (Codex가 경로를 고른다)

```
Contract request
- consumer: app/desktop-auto-desk, app/desktop-crew-board (후속 UI)
- missing operation:
  GET or POST a waiting invite for one checked-in same-PC seat
  seats: planner | scraper | editor
  after the operator has connected once, that seat pulls the next invite itself
- input validation:
  same PC loopback only
  token required (or documented Windows no-Origin exception, never in chat)
  bot_id matches the seat
  spec status waiting_for_bot
  door matches the seat when a door exists (collector | editor). No planner door. No fourth door.
- expected success:
  invite text + edit_spec_id
  or already-read mark for that bot_id + spec
  next seat can start without a second human paste
- expected error:
  404 none waiting · 409 another bot already took it · 403 not this seat
- stale/locked:
  a spec another bot already took must not be reused
  a leftover yesterday spec must not be returned when a newer wait exists
```

권장 자리(강제 아님): 기존 `/api/bots/*` 가족. 예: `POST /api/bots/next-invite`. `/api/v2`에 필드를 더하지 말 것.

## 하지 말 것

- 이 Linux/클라우드 에이전트를 제품 봇으로 체크인
- `127.0.0.1`을 박스에서 이 책상으로 열기
- 가짜 “봇이 읽었다”, 가짜 %, 지어낸 봇 대화
- Guest Drive exe 덮어쓰기, 태그, Grok-Crew push
