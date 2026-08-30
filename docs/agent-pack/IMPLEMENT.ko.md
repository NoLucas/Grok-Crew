# 아이디어를 코드로 깎는 법

사용자는 위키를 요청하지 않는다. 한국어로 **무엇이 제품인지**를 말한다. 에이전트는 그걸 한 슬라이스로 만든다.

## 한 아이디어의 길

```
한국어 판단
  → 손님이 보는 한 문장
  → 세 센서 중 어디인가?     (클립보드 / 명단 / 인박스)
  → 이미 있는 필드·API인가?
  → 작업 패킷 (허용 경로)
  → 실패하는 focused test
  → 최소 코드
  → 보안 점검
  → 손님 글이 바뀌면 README 네 개 + 노트
  → 핸드오프
```

중간에서 “있으면 좋아 보이는 API”를 만들지 않는다.

## 1. 한 문장으로 잠근다

형식:

```text
손님이 보면: …
창이 실제로 아는 것: 클립보드 | 명단 | 인박스 | 없음
없는 계약을 만드는가: 아니오 | 계약 요청
아닌 것:
- …
```

창이 아는 것이 **없음**이면 구현이 아니라 [CAN_CANNOT.ko.md](CAN_CANNOT.ko.md)다. 아는 척하는 UI를 그리지 않는다.

## 2. 글자 슬라이스 (A+F+H+L 버릇)

큰 불만을 글자로 쪼갠 뒤, 글자마다 센서 하나를 고른다. 한 커밋에 글자 네 개를 섞지 않는 것이 이상이다. 출시 요청이 있으면 묶되, 테스트는 글자마다 둔다.

| 글자 | 뜻 (이 제품에서 쓴 예) | 센서 |
|---|---|---|
| A | 불은 이 Windows 명단 입장 뒤에만 | 명단. 채팅·클립보드 OK만은 아님 |
| F | 시작 후 자리가 next-invite를 한 번. 책상은 안 훔침 | 명단 + 연결 글. 가로채기 금지 |
| H | 이 대기 시작 뒤 새 인박스 파일만 여기에 놓기를 닫음 | 인박스 pending·이름·시각·크기 |
| L | 끝난 컷의 집은 여기에 놓기. 최근기록은 같은 파일 | 인박스 pull + 폴더 이동 |

새 불만도 이렇게 가른다. “연결이 안 된다”를 한 버그로 치지 않는다.

## 3. 이미 있는 것을 먼저 찾는다

| 손님 길 | 이미 쓰는 것 | 손대지 말 것 |
|---|---|---|
| 붙인다 | `desktop-bot-links.ts`, 페어 코드, `GROK_CREW_OK` | QR, 터널, 자동에 연결 UI 복제 |
| 적고 시작 | `POST /api/v2/edit-specs`, `source_mode: bot` | 크레딧, 첫 화면에 레시피 네 장 |
| 일 글 | `GET .../invite`, 클립보드, `POST /api/bots/next-invite` | 초대문을 우리 서버에 올리기 |
| 컷 | `POST /api/v2/handoff/pull`, 편집 인박스 | 받기 버튼, 루프백을 밖으로 |
| 자리 확인 | 책상 `still_here` 60초. 채팅 루틴 없음 | 봇에게 keep를 예약 작업으로 |

UI가 새 칸이 필요해 보여도 로컬 가짜 필드, 두 번째 `/api/v2`, localStorage로 서버를 흉내 내지 않는다.

```text
Contract request
- consumer: app/... 
- missing operation or field:
- input validation:
- expected success/error:
- stale/locked:
```

## 4. 누가 어떤 파일을 여는가

| 역할 | 연다 | 안 연다 |
|---|---|---|
| Claude / UI 슬라이스 | 패킷의 `app/**`와 focused test | 스키마, migration, preload, `/api/v2`, 패키징 |
| Codex | 계약, Electron main, sidecar, 렌더, 릴리스 조립 | Claude 브랜치를 임의로 덮기 |
| Cursor 세션 | 사용자가 연 슬라이스. 기본은 현재 브랜치 | 값 지어내기 (OAuth, 서명) |
| Maintainer | 우선순위, 병합, 태그, Drive, 인증서 | 미검증 자동 병합 |

한 PR에 구현 책임자 한 명. 같은 폴더 동시 편집 금지.

## 5. 코드 버릇

- 한 사용자 결과만. 기회주의적 리포맷 없음
- 타입·에러 코드는 한곳. UI와 sidecar에 복사하지 않음
- loading / empty / error / leftover / locked를 정상과 같이 테스트
- 손님이 보면 한국어 먼저. `t(ko, en, zh, ja)` 네 칸
- 기능은 지우지 않고 접는다

## 6. 검증 순서

개발 중: 가장 작은 focused test.

핸드오프 전:

```powershell
npm run verify:core
python -m pytest -q local_studio/tests
```

Electron main/preload/tray면 `npm run verify:desktop`.

이 Linux/클라우드에서 운영자 `127.0.0.1:7214`를 열지 않는다. 그 주소는 운영자 Windows다.

화면 검증은 스크린샷 한 장이 아니다. 손님 길로 클릭한다. 여기 Windows 책장이 없으면 테스트와 한계를 적는다.

## 7. 글이 코드보다 먼저인 경우

사용자가 “내용을 전부 업데이트”하면 화면과 같은 말을 README.ko/en/zh/ja, CHANGELOG, `docs/RELEASE_NOTES.vX.Y.Z.md`에 같이 쓴다. 손님 트랙은 **받아서 연다.**

봇이 읽는 글(`remoteConnectPaste`, `public/bot-skills/`)을 바꾸면 **이미 붙은 봇은 연결 글을 다시 복사**해야 한다. 그 사실을 노트에 적는다.
