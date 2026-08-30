# 대화에서 잠근 결정

추측으로 뒤집지 않는다. 사용자가 한국어로 바꾼 것만 새 줄로 추가한다.

## 상품

| 결정 | 잠금 |
|---|---|
| 무엇이냐 | 이 PC 책상. 쓰던 봇을 붙인다. 파일은 여기 남는다 |
| 무엇이 아니냐 | 구름 편집, 구독 생성기, 스크랩 농장 |
| 돈 | 지금 무료. 받아서 연다. 도장·결제는 돈 받을 때 |
| 서버 | 오늘 일에 우리 서버 없음. SQLite + localStorage |
| 기본 TTS | Kokoro-82M. 고르지 않으면 이것 |

## 연결과 불

| 때 | 결정 |
|---|---|
| 초기 | 연결은 붙일 글만 복사. 답장을 이 창에 다시 붙이지 않음 |
| 1.0.17 | 봇은 OK만 보내고, 그 줄을 연결에 붙이면 책상이 입장. 채팅에 keep 금지 |
| 1.0.18 | 연결에 OK 붙여넣기 칸 없음. **복사만으로 입장** — 이후 회귀 |
| 1.0.19 | 복사는 기다림. 짧은 OK만 입장. OK만 멈추면 실패. 시작 글을 그 창에 붙임 |
| 1.0.20 A | 불은 이 Windows 명단 뒤에만. 채팅 「연결됨」·클립보드 OK만은 불이 아님 |
| 1.0.20 F | 붙은 Grok은 시작 후 next-invite 한 번. 책상은 초대문을 안 훔침 |
| 1.0.21 | leftover `still_here`만으로 다시 복사를 숨기지 않음 |
| 1.0.22 | 어제 저장된 OK·클립보드 Agent 불은 숨김/켜짐이 아님. 이번 실행·이번 연결 글·이 PC 명단만 |

초대 붙여넣기 이름은 `Grok Bot 기획자` 등. 표시 이름은 번호(`Grok Bot 1 -기획자`).

## 자리 확인

| 층 | 값 |
|---|---|
| 책상 keep (진짜 입장 뒤) | 60초 `still_here`만 |
| 보드 “마지막 확인” | `seconds_since_checkin >= 60` |
| 사이드카 presence | 300초까지 active, 그다음 idle. 불 글자는 둘 |
| 명단 폴링 | 5초 |
| 상수 | `SEAT_KEEP_SECONDS = 60`, `SEAT_ACTIVE_SECONDS = 300` |

Windows `keep` CLI는 이 PC용이다. **연결 붙여넣기가 채팅에 keep를 시키지 않는다.**

## 일과 파일

| 결정 | 잠금 |
|---|---|
| 문 | planner / collector / editor |
| 시작 칩 | 내파일/주소, 스타일, TTS생성, 업로드 위치 |
| 스타일 이름 | 릴스, 틱톡, 유튜브 쇼츠, 유튜브 본편 |
| 소리 | tts생성 + 페르소나. 내 목소리 없음 |
| H | 이 대기 시작 뒤 새 인박스만 여기에 놓기. leftover pending은 닫지 않음 |
| L | 집은 여기에 놓기. 최근기록은 같은 파일. 두 번째 미리보기 칸 없음 |
| 대화 | 시작·넘김 `detail.note`만. 자리 확인 줄 없음. 같은 노트는 접음 |
| 화질 | 운영자 규격. 봇이 quality를 바꾸지 않음 |
| 올리기 | 저장 다음, 한 번 더. 자동 게시 없음 |

## 다운로드와 저장소

| 결정 | 잠금 |
|---|---|
| 손님 첫 파일 | Google Drive `GrokCrew-Windows.exe`. 덮지 않음 (명시 전) |
| 이미 설치한 책상 | `NoLucas/Grok-crew-test` 업데이트 피드 |
| 공개 복제 | `https://github.com/NoLucas/Grok-Crew.git` |
| 에이전트 기본 push | `github` = Grok-crew-test. `origin`은 Cursor 호스트 |
| grok-crew main | force-push 하지 않음. 태그와 릴리스 파일은 사용자가 시키면 |
| 사람 exe / 봇 zip | 손님 기본은 exe 하나. 봇 zip은 숨긴 준비물 |
| GitHub handoff-inbox 저장소 | 지워도 됨. **이 PC** `workspace/handoff-inbox/`는 남김 |

## 글과 스킬

| 결정 | 잠금 |
|---|---|
| 위키 요청 없음 | 잠금·손님 글·봇 스킬·고치는 사람 네 종류만 |
| 지운 초안 | 되살리지 않음 |
| 개인 스킬 | `.cursor/skills/` gitignore. 공유 기준은 `docs/agent-pack/` |
| `/` | 책상. 공개 안내는 `/home` (운영 파일은 gitignore) |

## 구현 역할

Claude는 패킷의 UI와 focused test. Codex는 계약·Electron·sidecar·릴리스 조립. 태그·Drive·인장은 Maintainer. 사용자가 이 세션에서 태그와 두 GitHub 릴리스를 시키면 그때만 한다.

## 바꾸려면

사용자가 한국어로 새 한 줄을 잠글 때만 이 표를 고친다. 에이전트가 “더 자연스러워서” 뒤집지 않는다.
