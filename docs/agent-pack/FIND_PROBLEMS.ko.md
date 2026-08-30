# 문제를 찾는 법

손님이 “연결이 안 돼요”, “일이 안 가요”, “영상이 안 떠요”라고 하면 한 버그로 받지 않는다. 창이 **아는 것**과 **말하는 것**을 가른다.

## 창이 아는 세 줄

```
클립보드 2초 폴링 (창이 앞에 있을 때)
  → 짧은 GROK_CREW_OK 만 입장 트리거
이 PC 명단 5초 새로고침
  → bot-entry, still_here, disconnected, *_started / *_ready
편집 인박스 pending
  → 이 대기 시작 때보다 숫자가 늘었는가
```

Grok 채팅 전문, 봇 디스크, 다른 컴퓨터의 `127.0.0.1`은 없다.

## 자주 섞이는 여섯

| 손님이 본 것 | 창이 아는 것 | 자주 틀린 수정 |
|---|---|---|
| 채팅에 「연결됨」 | 없음 | 불을 켜면 거짓 연결 |
| 연결 글을 복사함 | 기다림. 불 아님 | 복사 = 입장으로 저장 (1.0.18 회귀) |
| `GROK_CREW_OK`만 보냄 | 입장 트리거. 일 아님 | 불을 켜거나 시작 글을 숨김 |
| 어제 leftover 명단 | `still_here`가 남아 있음 | 다시 복사를 숨기면 대기가 멈춤 |
| 어제 인박스 파일 | pending이 안 늘었거나 폴더 시각이 옛것 | 여기에 놓기를 닫으면 오늘 일이 아님 |
| 파일이 「파일」칸에만 있음 | 편집 인박스가 아님 | 집으로 착각 |

## 대기 화면이 멈출 때 순서

1. 불이 켜져 있는가. 꺼져 있으면 이 Windows `bot-entry`가 없다.
2. **다시 복사**가 보이는가. leftover 명단만으로 숨기면 사람이 시작 글을 못 붙인다.
3. 봇이 **이번** 연결 글을 읽었는가. 옛 글은 “시작 글을 붙여 달라”고 안다.
4. 자리가 이 Windows인가. Linux 봇의 `127.0.0.1`은 이 책장이 아니다.
5. 인박스 pending이 이 대기 시작보다 큰가. 아니면 덮어쓰기·다른 문.
6. `edit_spec_id`가 오늘 규격과 같은가. 다르면 leftover.

## 재현을 코드로 고정하는 법

UI 추정 대신 `app/*.test.mjs`에 상태를 넣는다.

- 불: `seatIsConnected`, `hasConnectedBot`, `confirmedGrokRoles`
- 다시 복사: `samePcInviteReady` (명단만으로는 false)
- 인박스: `shouldAutoPullInbox`, `pickArrivedImport(..., waitCopiedAt)`, `shouldClearWaitForImport`
- 대화: `crewTalkThread` — 같은 role+note+action은 한 줄
- 소스 잠금: 화면 파일을 읽어 금지 문구가 없는지 (`봇이 읽는 중`, 퍼센트)

테스트 이름에 손님 말을 쓴다. “does not light from clipboard OK alone”.

## 회귀 목록 (다시 열지 말 것)

| 옛 실수 | 왜 깨졌나 | 지키는 테스트/규칙 |
|---|---|---|
| 연결 글 복사 = 불 | 가짜 입장이 시작 글을 숨김 | 복사는 waiting. OK만 입장 트리거 |
| OK만 보내고 멈춤 = 성공 | 그 한 줄은 일이 아님 | 연결 글: 두 줄 답. OK만은 실패 |
| 책상 keep이 next-invite | 자리 일을 훔침 | `desktop-grok-desk-keep.ts`는 presence만 |
| leftover 명단으로 다시 복사 숨김 | 옛 봇이 시작 글을 못 받음 | `samePcInviteReady`는 this-PC 입장 필요 |
| leftover 인박스로 대기 종료 | 어제 컷이 여기에 놓기 | pending 증가 + 대기 시작 이후 폴더 |
| 도착 화면이 두 칸 | 여기에 놓기와 미리보기 집 둘 | `desktop-auto-place` 하나. canvas 복제 없음 |
| 같은 시작 노트 세 번 | heartbeat 중복 INSERT | 보드에서 접음 |
| 채팅에 keep 루틴 | 매 분 헛돌거나 초대 가로챔 | 연결 글: 루틴 만들지 말 것 |

## 이 환경에서 못 보는 것

Linux/클라우드 에이전트는 운영자 책장을 대신 클릭하지 못한다. `127.0.0.1:7214`를 여기서 열지 않는다.

확인했으면: 명령, pass 수, 못 본 화면. “통과함”만 쓰지 않는다.

## 로그에 넣지 말 것

토큰, `.env`, 로컬 영상 절대 경로, relay 원문, 복호화된 대본.
