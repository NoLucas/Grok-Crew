# Grok Crew 1.0.0

with Grok Bot. 이 PC에서 여는 프로그램입니다. 쇼츠를 혼자 자르며 밤을 샐 필요 없습니다.

공개 파일: **Windows에서 열기** → `GrokCrew-Windows.exe`. 받는 곳: [v1.0.0 릴리스](https://github.com/NoLucas/Grok-Crew/releases/tag/v1.0.0).

지금은 **무료**입니다. 계정 없고, 카드 없고, 크레딧 없습니다. 받아서 엽니다.

영상을 대신 만들어 주는 구독 서비스가 아닙니다. 쓰던 Grok Bot이나 Agent를 붙이면, 다듬은 파일이 **이 PC 폴더**에 남습니다.

## 받아서 연다

1. `GrokCrew-Windows.exe`를 받아 엽니다. 관리자 비밀번호를 묻지 않습니다. 서명이 없어 파란 보호 화면이면 **추가 정보 → 그래도 실행**.
2. **연결**에서 쓰던 봇을 붙입니다. 붙일 글을 봇 창에 넣습니다.
3. **자동**에 하고 싶은 말을 적고 **만들기**를 누릅니다.
4. 사람이 봇 창에 붙여 넣습니다. 이 창은 기다립니다.
5. 미리보기가 뜨면 **이 PC에 저장**합니다.

`git clone` / `npm run local`은 소스를 받는 사람용입니다.

## 봇·에이전트 내장 스킬

연결할 때 그 자리의 스킬이 함께 붙습니다. 기획·수집·편집 프롬프트를 따로 짜지 않아도 됩니다.

| 자리 | 기본 | 추가 |
|---|---|---|
| 기획자 | `planner` | `edit-plan` |
| 스크래핑 | `scraper` | `public-pick` |
| 편집자 | `editor` | `cut-to-plan` |

원문: `public/bot-skills/`. 이 프로그램은 사이트를 긁지 않습니다. 로그인 막힌 인스타·틱톡은 적지 않습니다.

## 0.2.1에서 달라진 것

예전 Grok-Crew는 브라우저 작업대에 가까웠습니다. 1.0.0은 **이 PC의 창**입니다.

- 연결 · 자동 · 설정 · 편집 · 내보내기: 할 일은 하나이고, 나머지는 칩입니다
- Grok Bot / Agent를 기획자·스크래핑·편집자로 붙입니다. 내장 스킬이 함께 붙습니다
- 붙일 글만 복사합니다. 답장을 이 창에 다시 붙이지 않습니다. `127.0.0.1`을 봇에게 보여 주지 않습니다
- 자막·더빙·TTS는 켠 것만 돌아갑니다. 기본값은 꺼져 있습니다
- 파일은 이 PC에 남습니다. GitHub 편지함이 없어도 됩니다
- 짝 코드는 암호학적으로 안전한 난수입니다. GitHub 토큰 오류 메시지에 토큰을 다시 보여 주지 않습니다
- 공개 사이트 트랙은 닫혀 있습니다. 설치 파일은 이 릴리스에서만 받습니다

전체 목록은 `CHANGELOG.md`의 `1.0.0`에 있습니다.

## 1.0에 들어 있는 것

- 첫 화면: 연결 다음 자동. 한 줄, 만들기, 미리보기, 이 PC에 저장
- 문 둘: `editor/` · `collector/`. 남은 `grok/` · `agents/`는 읽기만 합니다
- 타임라인 v2, 이 PC에서 MoviePy로 렌더, 초안 미리보기. 최종 파일은 원본입니다
- 선택 게시: 가진 액세스 토큰. 영수증과 재시도
- 핸드오프·경로·git 원격 가드
- 화질은 규격으로 잠급니다. 화면 비율·자막·템포·룩은 설정에서 바꿉니다

## 1.0에 없는 것

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
