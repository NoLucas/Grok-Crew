---
name: grok-crew-implement
description: >-
  Grok Crew 아이디어를 코드로 구현할 때 항상 연다.
  상품 한 줄, 손님 한 바퀴, 책상이 실제로 보는 세 센서(클립보드·명단·인박스),
  계약 한 줄, 램프/초대/자리 확인, 보안 경계, 문제 찾기, 릴리스 맞춤에 쓴다.
  “연결됨 불”, “시작 글”, “여기에 놓기”, “next-invite”, “A+F+H+L”,
  “이 제품을 끝까지”, “보안 구멍”, “왜 대기가 멈추나”라고 할 때도 연다.
---

# Grok Crew — 아이디어를 구현하는 법

다른 채팅·다른 AI도 이 파일부터 읽는다. 대화를 처음부터 추측하지 않는다.

이 팩은 **고치는 사람용**이다. 손님 README와 섞지 않는다. 개인용 `.cursor/skills/` 사본이 있어도, 저장소에 커밋된 기준은 여기다.

| 다음에 읽을 것 | 파일 |
|---|---|
| 상품·아닌 것·화면 잠금 | [PRODUCT_LOCK.ko.md](PRODUCT_LOCK.ko.md) |
| 아이디어 → 코드 순서 | [IMPLEMENT.ko.md](IMPLEMENT.ko.md) |
| 문제·회귀를 찾는 법 | [FIND_PROBLEMS.ko.md](FIND_PROBLEMS.ko.md) |
| 보안 점검 | [SECURITY.ko.md](SECURITY.ko.md) |
| 대화에서 잠근 결정 | [DECISIONS.ko.md](DECISIONS.ko.md) |
| 램프·keep·초대 | [PRESENCE.ko.md](PRESENCE.ko.md) |
| 고칠 수 있는 것 / 못 고치는 것 | [CAN_CANNOT.ko.md](CAN_CANNOT.ko.md) |
| 원격·태그·exe | [RELEASE.ko.md](RELEASE.ko.md) |
| 패킷·핸드오프 빈칸 | [PACKET.md](PACKET.md) |

이미 있는 잠금과 겹치면 **그 문서를 고친다.** 같은 목적의 새 위키를 만들지 않는다. `docs/STACK.ko.md`, `BUILD`, `FREE`, `AUTO_TAB`, `AUTO_TRUST`, `AI_COLLABORATION.ko.md`.

## 30초 잠금

상품: 손님이 쓰는 **이 PC 프로그램**이다. 쓰던 Grok Bot이나 Agent를 붙이면, 다듬은 파일이 **이 PC 폴더**에 남는다. 로그인 없이 연다. 지금 트랙은 무료다.

한 바퀴: 연다 → **연결**에서 글을 봇 창에 붙인다 → **시작**에 한 줄을 적고 제작 시작 → (이 Windows면 자리가 `next-invite`를 한 번) → 끝난 컷은 **여기에 놓기** → **이 PC에 저장**. 올리기는 그다음, 원할 때만.

책상이 보는 것은 셋뿐이다.

1. 클립보드 (짧은 `GROK_CREW_OK`만 입장 트리거)
2. 이 PC 명단 (`bot-entry` / `still_here` / `disconnected`)
3. 편집 인박스 pending

채팅의 「연결됨」, 봇이 디스크에 둔 파일, Linux의 `127.0.0.1`은 연결이 아니다.

## 구현할 때 여덟 칸

1. 사용자 말을 **손님이 보는 한 문장**으로 잠근다. 없으면 코드를 열지 않는다.
2. 그 일이 세 센서 중 어디에 보이는지 고른다. 안 보이면 [CAN_CANNOT.ko.md](CAN_CANNOT.ko.md)다.
3. 새 `/api/v2`·스키마·IPC를 만들지 않는다. 없으면 계약 요청만 남긴다.
4. 허용 경로만 고친다. 한 PR에 사용자 결과 하나.
5. 실패하는 focused test를 먼저 고정한다.
6. 창이 모르는 일을 아는 척하지 않는다. 가짜 “봇이 읽었다”를 그리지 않는다.
7. [SECURITY.ko.md](SECURITY.ko.md)를 통과하기 전에 끝났다고 하지 않는다.
8. 손님이 보면 README 네 언어와 릴리스 노트를 같은 숫자로 맞춘다.

## 하지 말 것

- 클라우드 편집기, 구독, 컷당 크레딧, 로그인 벽
- 인스타·틱톡 자동 올리기, 로그인된 SNS 긁기
- 봇에게 토큰을 보여 주기, QR로 `127.0.0.1` 열기, 회사 터널
- 책상이 `next-invite`를 가로채기 (자리 일을 훔침)
- 램프 세 번째 글자, 퍼센트 바, “거의 다 됐다”
- exe, `.env`, 토큰, SQLite, `verification_screenshots/`, `release/` 커밋
- 지운 초안·사본 되살리기 (`docs/archive/`, ANNOUNCEMENT, USER_ORIENTED_IDEAS)
- `main` 직접 커밋. 기본 push 대상은 `github` = `NoLucas/Grok-crew-test`
- 손님용 Drive exe를 덮는 일 (명시하기 전)
- `grok-crew` `main` force-push

사용자는 한국어로 제품 판단을 말한다. 경로를 먼저 주지 않는다. 에이전트가 종류를 고른다. 잠금은 `docs/*.ko.md`, 손님 글은 README·릴리스 노트, 봇 글은 `public/bot-skills/`.
