# Grok Crew 1.0.4

with Grok Bot. 이 PC에서 여는 프로그램입니다. 쇼츠를 혼자 자르며 밤을 샐 필요 없습니다.

공개 파일: **Windows에서 열기** → `GrokCrew-Windows.exe`. 받는 곳: 홈페이지에서 인증한 뒤 열리는 Google 드라이브 파일. 이미 설치한 책상은 [v1.0.4 업데이트](https://github.com/NoLucas/Grok-crew-test/releases/tag/v1.0.4)를 봅니다.

1.0.3과 같은 길입니다. 받아서 엽니다. 계정 없고, 카드 없고, 크레딧 없습니다.

영상을 대신 만들어 주는 구독 서비스가 아닙니다. 쓰던 Grok Bot이나 Agent를 붙이면, 다듬은 파일이 **이 PC 폴더**에 남습니다.

## 1.0.3에서 달라진 것

- 창이 켜져 있으면 이 책상은 `127.0.0.1:7214`를 엽니다. 나라마다 포트가 다르지 않습니다. 7214가 이미 쓰이면 연결 화면에 실제 주소를 보여 주고, 연결 글도 그 주소를 씁니다.
- 등록된 Windows에서 PowerShell로 체크인하면 토큰을 묻지 않습니다. 채팅에 토큰을 넣지 않습니다. 브라우저·렌더·게시는 그대로 토큰이 필요합니다.
- 7214가 없으면 봇은 한 줄로 멈추고 디스크에서 스크립트를 찾지 않습니다. 그때는 `GROK_CREW_OK` 한 줄을 연결 칸에 붙입니다.

## 받아서 연다

1. `GrokCrew-Windows.exe`를 받아 엽니다. 관리자 비밀번호를 묻지 않습니다. 서명이 없어 파란 보호 화면이면 **추가 정보 → 그래도 실행**.
2. 처음 열면 어떤 TTS를 받을지 고릅니다. 고른 뒤에 책상이 열립니다.
3. **연결**에서 쓸 자리의 연결 글을 복사해 봇 창에 넣습니다. Grok Crew 창은 켜 둡니다.
4. 봇이 등록된 Windows에서 승인하면 그 자리가 **연결됨**이 됩니다. 안 되면 봇이 보낸 `GROK_CREW_OK` 한 줄을 여기 붙입니다.
5. **자동**에 하고 싶은 말을 적고 **만들기**를 누릅니다.
6. 사람이 봇 창에 붙여 넣습니다. 이 창은 기다립니다.
7. 미리보기가 뜨면 **이 PC에 저장**합니다.

`git clone` / `npm run local`은 소스를 받는 사람용입니다.

## 봇·에이전트 내장 스킬

연결할 때 그 자리의 스킬이 함께 붙습니다. 기획·수집·편집 프롬프트를 따로 짜지 않아도 됩니다.

| 자리 | 기본 | 추가 |
|---|---|---|
| 기획자 | `planner` | `edit-plan` |
| 스크래핑 | `scraper` | `public-pick` |
| 편집자 | `editor` | `cut-to-plan` |

원문: `public/bot-skills/`. 이 프로그램은 사이트를 긁지 않습니다. 로그인 막힌 인스타·틱톡은 적지 않습니다.

## 1.0.4에 없는 것

- 서명된 `GrokCrew-Windows.exe` (SmartScreen 경고가 남을 수 있음)
- Instagram / TikTok / YouTube OAuth 앱
- macOS 공증, 제자리 자동 업데이트 설치
- 로그인 벽이 있는 사이트를 긁기
- Local Studio를 인터넷에 열기

Windows에서 exe를 만들려면 그 PC에서 `npm run desktop:dist`입니다. 파란 보호 화면이면 **추가 정보 → 그래도 실행**.

## 소스에서 열기

```sh
git clone https://github.com/NoLucas/Grok-Crew.git
cd Grok-Crew
npm install
npm run local
```

손님용 창은 `npm run desktop`입니다.

질문: [NoLucas/Grok-Crew](https://github.com/NoLucas/Grok-Crew) 이슈.
