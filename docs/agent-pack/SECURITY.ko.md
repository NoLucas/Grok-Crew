# 보안 점검

새 기능을 손님 길에 넣기 전에 이 표를 닫는다. 구멍보다 새 탭을 먼저 열지 않는다.

## 매번

| 확인 | 깨지면 |
|---|---|
| 짝 코드·난수는 `crypto.getRandomValues` / CSPRNG | 추측 가능한 입장 |
| 실패 문장에 토큰·키가 다시 안 적힘 | 화면이 비밀을 흘림 |
| 연결 글·채팅·메모에 토큰 없음 | 봇 창이 이 책장 열쇠를 봄 |
| 루프백·내부 주소를 봇/게시 URL에 안 넘김 | 다른 컴퓨터가 이 PC를 열려고 함 |
| 수집 URL이 `file://`, 루프백, 링크 로컬, 매핑된 사설을 거절 | 사이드카가 로컬 파일을 가져감 |
| 경로가 workspace 밖을 못 나감 | 임의 파일 읽기/쓰기 |
| `nodeIntegration: false`, preload만 | 렌더러가 Node/비밀에 닿음 |
| `/api/v2`를 하나 더 안 만듦 | 두 계약, 우회 인증 |
| exe, `.env`, DB, 설치물, `verification_screenshots/` 미커밋 | 비밀·손님 영상이 git에 감 |

## 루프백과 토큰

Local Studio는 `127.0.0.1`만 듣는다. 실행마다 포트와 토큰이 바뀔 수 있다.

- 렌더러에 토큰을 주지 않는다.
- `grok-crew.py`는 런타임에서만 받는다. `.env`를 읽지 않는다.
- `POST /api/bots/next-invite`는 **이 PC 루프백**이다. 클라우드 Grok은 못 친다.
- 책상 keep은 `/api/bot-entry`와 `still_here`만. next-invite를 치면 자리 일을 훔친다.
- tokenless `/media`는 미리보기만. 모델 가중치를 열지 않는다.

다른 PC 봇의 통로는 **글과 끝난 파일**이다. 우리가 중간 터널을 여는 순간 구멍 상품이 된다.

## 장부와 타임라인

- 타임라인 리비전은 불변이다. stale·lock은 자동 병합하지 않는다.
- 서명 검증과 stale-revision 거부를 끄지 않는다.
- 게시 기본은 “저장 후 한 번 더”. 묻지 않고 올리지 않는다.

## 수집과 공개 경로

사이드카가 사이트를 검색하지 않는다. 스크래핑 자리도 기획자가 적은 **직접 파일 URL**만.

`PUBLIC_POST_PATHS`에 경로를 더할 때는 Codex 계약이다. UI가 공개 POST를 늘리지 않는다.

## 커밋 금지

```
.env*  토큰  개인 미디어  *.sqlite
verification_screenshots/  release/  dist/  build/
GrokCrew-Windows.exe  복호화된 대본·썸네일
relay payload
```

홈페이지 운영 파일(`public/home.html` 등)은 이 기계에만 둔다. gitignore다.

## 출시 전에 한 번 더

```powershell
npm audit --omit=dev
```

강제 `npm audit fix --force`로 잠긴 도구를 올리지 않는다. 서명 값·Drive 자격은 채팅에 붙이지 않는다.

인증서 없이 “서명된 exe”를 코드로 만들 수 없다. 파란 화면은 정직하게 남긴다.
