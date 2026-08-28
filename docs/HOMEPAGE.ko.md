# 홈페이지는 받기 안내만

공개 안내는 `/home`이다. 제품은 여전히 이 PC에 두는 프로그램이다.
받는다 → 연다 → 연결한다 → 자동에서 적는다 → 붙인다.

`/` 는 책상이다. 랜딩으로 바꾸지 않는다.

## 하는 것

- `/home`에 v1.0.0 안내. with Grok Bot, 내장 스킬, 지금은 무료
- 처음 방문은 설명 문장 없이 마크와 고유어 이름만 둔다. 네 언어: English / 한국어 / 中文 / 日本語. 브라우저 언어로 건너뛰지 않는다. 선택은 `?lang=` 과 localStorage `grok-crew-home-lang`에 남고, 헤더에서 다시 바꿀 수 있다
- Windows 파일은 GitHub Release에서 이메일 없이 받는다
- 소식 이메일은 선택. `POST /api/get`
- 라이브 페이지에 `public/connect-install.js`를 꽂으면 문구와 받기 칸이 맞춰진다
- 그 페이지가 `POST /api/get`을 부르려면 `GROK_CREW_PUBLIC_ORIGIN`에 그 출처만 넣는다. 개인 호스트를 코드에 넣지 않는다

## 하지 않는 것

- `/` 을 랜딩으로 바꾸기
- 이메일 없이 오늘 일을 시작하지 못하게 막기
- Pro / Team 가격 페이지, 결제, OAuth
- 우리가 영상을 만들어 준다는 문장

파일은 [Grok Crew v1.0.0](https://github.com/NoLucas/Grok-Crew/releases/tag/v1.0.0)에서 받는다.

로컬에서 페이지만 보려면 `node scripts/preview-homepage.mjs` 또는 책상을 연 뒤 `/home`이다.
라이브 페이지에 스크립트를 꽂는 법은 `node scripts/connect-existing-home.mjs`다.
