# 홈페이지는 이미 있다 — 받기 문만 연결한다

공개 홈페이지는 새로 만들지 않는다. 이미 있는 주소다.

https://grok-crew-local.jinegcc.chatgpt.site

그 페이지의 `#install`만 연다. 이메일을 남기면 `GrokCrew-Windows.exe`를 받는다. 창 안의 오늘 일(연결·시작·저장)은 이메일 없이 된다.

이 저장소의 `/get`과 `connect-install.js`는 **같은 페이지를 검수한 뒤** Pro/Team 구매를 막고, 아이콘을 우리 마크로 바꾸고, 팔면 안 되는 문장을 고친다. 새 랜딩을 만들지 않는다.

## 서버 환경 — 이 저장소의 Node

| 쓰는 것 | 안 쓰는 것 |
|---|---|
| Node.js 22+, 이 앱의 `POST /api/get` | PHP, Nginx 전용 서버, 손님용 Postgres |
| (선택) AWS 무료 플랜의 S3, 서울 `ap-northeast-2` | DynamoDB, Lambda를 지금 새로 열기 |
| 로컬 폴백 `data/leads.jsonl` | 결제, OAuth, 로그인, 문의 티켓 |

손님이 오늘 일을 하는 프로그램은 여전히 이 PC의 Electron + Local Studio다. 회사 서버는 이메일과 파일 문만 연다.

## 연결하는 기능 / 연결하지 않는 기능

연결함:

- 이메일 한 칸
- 통과하면 Windows 파일 하나
- 기존 홈페이지의 “무료로 시작하기” → `#install`
- 우리 아이콘(`app-mark.png` / `favicon.svg`)
- Pro / Team 카드는 보이되 **Coming soon**. 결제 링크 없음

지금 열지 않음:

- 결제, Pro/Team 카드 실제 결제
- OAuth, GitHub/Google 로그인
- 문의 폼, 크레딧, 계정

## 검수 — 라이브 문장 vs 우리가 만드는 것

라이브 chatgpt.site를 그대로 두면 아래가 어긋난다. `/get`과 `connect-install.js`가 고친다.

| 라이브에 있던 말 | 우리가 만드는 것 | 처리 |
|---|---|---|
| Claude/Codex가 로컬 API로 편집하고 게시 | 사람이 봇 창에 붙인다. 글과 끝난 파일만 | 문장 교체 |
| Instagram / TikTok / YouTube 자동 게시 | 저장이 기본. 올리는 것은 원할 때만 | 문장 교체 |
| 원본부터 게시 큐까지, 대본 컷맵 파이프라인 | 연다 → 붙인다 → 한 줄 → 붙인다 → 저장 | 다섯 걸음으로 교체 |
| Free에 수동 OAuth | OAuth 없음. 계정 없이 시작 | 문장 교체 |
| Pro $39 / Team $8 구매 링크 | 지금은 무료. 살 수 없음 | Coming soon, 버튼 비활성 |
| 노란 원 안 글자 G | 셔터-플레이 마크 | `app-mark.png` |
| `git clone` + `npm run local` | 이메일 한 칸 → exe | `#install`만 교체 |

팔면 안 되는 다섯은 `docs/STACK.ko.md`와 같다. 홈페이지에도 쓰지 않는다.

## 이 앱에서 열리는 주소

- `/get` — 위 홈페이지를 그대로 두고, 설치 칸·가격 칸·아이콘만 검수한 문
- 공개 호스트에서 `GROK_CREW_PUBLIC_SITE=1`이면 `/`도 그 문
- `POST /api/get` — `{ email, website? }` → `{ ok, downloadUrl }`
- 라이브 chatgpt.site에서 이 API를 부르면 CORS가 그 출처만 연다

데스크톱 `npm run local`의 `/`는 책상이다. 공개 사이트가 아니다.

## AWS 무료 플랜

버킷을 아직 안 열면 이메일은 `data/leads.jsonl`에만 쌓인다. 깃에 올리지 않는다.

S3를 쓰면:

1. 비공개 버킷. 접두사 `leads/`
2. 환경 변수 `GROK_CREW_LEADS_BUCKET`, `AWS_REGION=ap-northeast-2`
3. 키는 깃에 넣지 않는다. IAM은 그 접두사 `PutObject`만

파일 자체는 기본이 GitHub Release다. exe를 S3/CloudFront에 두면 `GROK_CREW_DOWNLOAD_URL`만 바꾼다.

값은 `docs/homepage.env.example`.

## 라이브 사이트에 스크립트만 꽂을 때

이 앱을 어딘가에 띄운 뒤, 기존 홈페이지 끝에 한 줄이면 `#install`·Pro/Team·아이콘·어긋난 문장이 같이 맞춰진다.

```html
<script src="https://이-앱-주소/connect-install.js"></script>
```

스크립트 주소에서 `/api/get`와 `app-mark.png`를 찾는다. 따로 `GROK_CREW_GET_API`를 줄 수도 있다.

## 검수

1. 새 랜딩을 만들지 않았다. 기존 페이지의 뼈대다.
2. 이메일을 적으면 받기 링크가 열린다.
3. 꿀단지(`website`)를 채우면 저장하지 않고 링크만 준다.
4. 이메일 없이 **시작**은 창 안에서 된다.
5. Pro / Team 버튼은 Coming soon이다. 결제 URL이 없다.
6. “우리가 영상을 만든다”, “알아서 인스타에 올린다”, “로컬 API가 알아서 편집한다”가 없다.
7. 헤더·파비콘이 우리 마크다.
