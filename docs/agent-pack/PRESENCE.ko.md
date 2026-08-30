# 불, 입장, 초대문

연결 버그의 대부분이 여기서 난다. 코드를 만지기 전에 층을 고른다.

## 세 층 — 섞지 말 것

| 층 | 진실 | 코드 |
|---|---|---|
| 입장 트리거 | 짧은 `GROK_CREW_OK` + 자리 이름. 연결 글 안의 OK는 답이 아님 | `confirmRemoteReplies`, `isBareConnectReply` |
| 램프 | Grok은 이 PC 명단에 그 자리가 있고 `disconnected`가 아님. 클립보드만으로는 꺼짐 | `seatIsConnected` |
| 시작 가능 | 불 또는 복사 대기 또는 확인된 OK 자리 | `seatReadyToStart`, `hasWaitingCopiedSeat`, `confirmedGrokRoles` |
| 시작 글 숨김 | this-PC 입장(OK 또는 일 heartbeat) + 명단. leftover `still_here`만은 숨기지 않음 | `samePcInviteReady` |
| 자리 확인 | 책상이 60초마다 `still_here`. 초대문 읽기 아님 | `enterGrokSeatOnDesk`, `runDeskKeepTick` |
| 일 읽기 | 자리가 `POST /api/bots/next-invite`를 **한 번**. 책상은 안 침 | 연결 글 + sidecar. keep에 넣지 말 것 |

## 상수

`app/desktop-bot-links.ts`, `local_studio/config.py`:

- `SEAT_KEEP_SECONDS = 60`
- `SEAT_ACTIVE_SECONDS = 300`
- 기본 포트 `7214` (패키지가 못 쓰면 다른 루프백)

## A — 불

- 채팅의 「연결됨」은 불이 될 수 없다. 창이 채팅을 못 읽는다.
- 클립보드 OK는 책상 `bot-entry`를 부르게 할 수 있다. 불은 명단 뒤.
- Agent는 아직 `status === 'connected'`로 불이 켜질 수 있다. Grok과 같게 만들려면 결정이 먼저다.
- 운영자가 연결 해제하면 `disconnected`. leftover `still_here`로 다시 켜지 않는다.

## F — 시작 글과 next-invite

- 이 Windows에 들어온 Grok은 시작 후 초대문을 한 번 읽는다. 다시 복사는 숨긴다.
- 책상이 대신 읽으면 봇이 404를 본다. **훔치지 않는다.**
- leftover 명단만 있으면 다시 복사를 보여 준다. 불이 켜져 있어도 이 자리 글이 안 갔을 수 있다.
- Linux·다른 PC는 이 Windows 루프백을 못 친다. 시작 글을 그 창에 붙인다.
- 이미 붙은 봇은 **새 연결 글**을 다시 붙여야 새 지시를 읽는다. 자동으로 봇 창에 넣지 못한다.

## H — 인박스

- `shouldAutoPullInbox`: 연결 칸이 열려 있지 않고, 규격이 있고, pending이 대기 시작보다 큼.
- `pickArrivedImport`: 오늘 규격 id가 있으면 그것. 없으면 대기 시작 **이후** wrap_loose. 그보다 오래된 폴더는 null.
- 다른 규격 id는 leftover. 여기에 놓기를 닫지 않음.

## L — 집

- 끝난 컷은 `desktop-auto-drop is-here` + `desktop-auto-place`.
- `desktop-auto-preview desktop-auto-canvas` 두 번째 집을 만들지 않음.
- 최근기록 이동은 같은 프로젝트. 실패하면 한 줄. 컷은 이미 열려 있음.

## 연결 글이 봇에게 시키는 것

Grok: 두 줄 답(OK + 준비됨) → 그 Windows에서 next-invite 한 번 → 역할만. 루틴·keep·토큰 금지.

Agent: next-invite를 시키지 않는다. 기획·수집·편집은 그 채팅에 적는다.

첫 답이 OK 한 줄이면 실패다.

## 파일

| 일 | 파일 |
|---|---|
| 불·OK·연결 글 | `app/desktop-bot-links.ts` |
| 다시 복사·인박스 고르기 | `app/desktop-auto-state.ts` |
| 대기 화면 | `app/desktop-auto-desk.tsx` |
| pull·최근기록 | `app/desktop-workspace.tsx` |
| keep | `app/desktop-grok-desk-keep.ts` |
| 연결 칸 글 | `app/desktop-bot-panel.tsx` |
| next-invite 계약 | `local_studio/handlers.py`, `edit_spec.py` |
