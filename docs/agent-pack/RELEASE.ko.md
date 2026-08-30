# 원격, 버전, exe

사용자가 출시를 시키기 전에는 태그·GitHub Release·Drive를 열지 않는다. 시키면 이 순서를 그대로 쓴다.

## 원격

| remote | URL | 하는 일 |
|---|---|---|
| `github` | `https://github.com/NoLucas/Grok-crew-test.git` | **기본 push.** 설치 책상의 업데이트 피드. Windows CI exe |
| `grok-crew` | `https://github.com/NoLucas/Grok-Crew.git` | 공개 복제. `main` force-push 금지. 사용자가 시키면 태그와 같은 네 파일 |
| `origin` | Cursor git 호스트 | 세션 추적. 제품 기본이 아님 |

`main`에 직접 커밋하지 않는다. 브랜치: Cursor는 현재 브랜치 유지. Claude는 `claude/<workstream>`. Codex는 `codex/<workstream>`.

## 손님이 받는 파일

- **첫 다운로드:** Google Drive `GrokCrew-Windows.exe`. 덮지 않는다 (명시 전).
- **이미 설치:** Grok-crew-test 태그 + `latest.yml`.
- 릴리스에 같은 네 개: `GrokCrew-Windows.exe`, `.blockmap`, `latest.yml`, `GrokCrew-bot-pack.zip`.

Windows 워크플로: `.github/workflows/release.yml`. 태그 `v*`가 Grok-crew-test에 오면 exe job. Grok-Crew notes job은 권한 403이 날 수 있다. 그때 Maintainer/`gh`로 릴리스를 만들고 네 파일을 붙인다.

## 버전을 올릴 때 같이 고치는 파일

같은 숫자.

- `package.json`, `package-lock.json`
- `installer/voice-catalog.json` (`GrokCrew-Desktop/x.y.z`)
- `.github/workflows/release.yml` default 태그
- `CHANGELOG.md`
- `docs/RELEASE_NOTES.vX.Y.Z.md` (워크플로가 이 이름을 읽음)
- `docs/LAUNCH.md`
- `README.md`, `README.ko.md`, `README.ja.md`, `README.zh.md`

손님 노트는 한국어. 받아서 연다. Drive는 안 덮었다. 이미 붙은 봇은 연결 글을 다시 복사하라고 적는다.

## 출시 순서 (사용자가 시켰을 때)

1. 기능 커밋. 설치물·스크린샷 없이.
2. 버전·노트 커밋.
3. `git push github <branch>` (필요하면 origin, grok-crew 브랜치. grok-crew `main`은 일반 fast-forward만, force 없음).
4. 주석 태그 `vX.Y.Z`. 태그를 `github`와 (시키면) `grok-crew`에 push.
5. Grok-crew-test Windows job을 기다린다.
6. 네 파일을 받아 Grok-Crew 릴리스에도 붙인다. 해시는 같아야 한다.
7. Drive는 그대로. `main` 병합은 Maintainer.

이 Linux에서 `npm run desktop:dist`로 손님 exe를 만들지 않는다. CI가 만든다.

## 설치한 사람에게

이미 옛 버전이 있으면 트레이까지 끄고, `grok-crew-studio.exe`가 있으면 작업 관리자에서 끝낸 뒤 새 exe를 연다. 파란 화면이면 추가 정보 → 그래도 실행.
