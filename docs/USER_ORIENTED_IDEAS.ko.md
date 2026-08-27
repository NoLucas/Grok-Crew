# 사용자 지향 아이디어 — 밖에서 긁어 우리 길에 얹을 것

자동 탭이 연 문장:

> 제목만 적었어. 어제 붙인 봇이 컷을 가져오고, 이 창이 열리고, 파일은 이 PC에 남았으면 해.

그 문장을 더 사람 쪽으로 밀 때, 다른 제품·연구에 이미 있는 손길을 가져와 본다. 이 문서는 구현 순서가 아니다. 스크랩 메모다. 새 `/api/v2` 필드는 이 글만으로 만들지 않는다.

수집일: 2026-08-27. 화면 갤러리(Mobbin)는 유료 플랜이 필요해 못 열었다. 글·가이드는 Context.dev로 검색·스크랩했다.

## 필터 — 가져오지 말 것

우리 제품이 이미 고른 길이다. 아래는 스크랩에 자주 나오지만 **베끼지 않는다**.

| 밖에서 흔함 | 왜 안 가져오나 |
|---|---|
| 계정·로그인 먼저 | 서버가 오기 전에 가짜 로그인을 만들지 않는다 |
| QR/페어링이 `127.0.0.1`을 연다 | 다른 PC 봇은 이 주소를 못 연다. 구멍 안 뚫는다 |
| 컷이 오면 Instagram·TikTok에 바로 올린다 | 저장은 파일만. 묻지 않고 올리지 않는다 |
| 같은 PC 봇이 초대문을 “알아서” 읽는다 | 계약이 오기 전에 UI에 쓰지 않는다 |
| 스피너만 돌리고 “거의 다 됨” | 모르는 진행률을 꾸미지 않는다 |
| 적응형 메뉴(자주 쓰는 버튼이 자리를 옮김) | 자리 기억은 반의 이득이다 |
| 샘플을 勝手に 연다 | 이미 버린 길이다 |
| 연결 UI를 자동에도 다시 그린다 | 붙이고 끊는 권한은 **연결**만 |

한 줄: **사람은 말과 확인만 하고, 창은 순서와 대기를 맡는다.** 그 한 줄을 더 쉽게 하는 손길만 남긴다.

## 이미 우리 쪽에 있는 것 (다시 만들지 말 것)

스크랩과 겹치는 부분은 “이미 했다”로 표시하고, 다음 판에서 반복하지 않는다.

- 연결은 연결, 일은 자동. 벤치/서랍 분리.
- 한 칸 + 시작 + 다섯 등.
- 초대문은 클립보드만. 화면에 긴 글을 펼치지 않음.
- 마지막 스타일·레시피를 기억.
- 맡겨서 / 내 파일. 내가 열기는 자동 안의 탈출.
- 미리보기와 저장이 자동 안에 남음.
- 설정·편집·내보내기는 붙은 뒤에만 켜짐.

## 아이디어 — 자동 탭에 얹을 것

각 항목: 출처 → 밖에서 하는 일 → 우리 화면에 옮기면 → 지금 가능한지.

### 1. 시작 전에 “이번 일의 약속” 한 장

출처: [Jakob Nielsen, Slow AI](https://jakobnielsenphd.substack.com/p/slow-ai), [Progressive Disclosure](https://jakobnielsenphd.substack.com/p/progressive-disclosure)

밖에서: 긴 일을 맡기기 전에 **run contract**를 보여 준다. (a) 끝나는 시각은 점 추정이 아니라 구간, (b) 무엇을 하지 않는지, (c) 무엇이 “끝”인지. OpenAI Deep Research는 질문부터 한다.

우리: **시작**을 누르기 직전, 또는 누른 직후 한 줄 카드.

```
이번 일
  제목: …
  봇: Grok · 어제 붙임
  스타일: 인스타 릴
  하지 않음: 올리지 않음 · 화질 잠금 유지 · 이 PC에만 저장
  끝: 컷이 이 창에 뜨고, 저장을 물을 때
```

ETA를 꾸며 쓰지 않는다. 로컬로 “지난번 이 봇은 8–14분”이 있으면 구간만. 없으면 “봇이 일하는 동안 이 창을 끄지 마세요”가 정직하다.

계약: 없음. 이미 있는 봇 이름·레시피·로컬 기록.

### 2. 등만 켜지 말고, 의미 있는 빵가루

출처: Slow AI — Conceptual Breadcrumbs. NN/g [Visibility of System Status](https://www.nngroup.com/articles/visibility-system-status/), [Progress Indicators](https://www.nngroup.com/articles/progress-indicators/)

밖에서: “파일 245 받음”보다 “가설 세 개를 버렸다”. 10초 넘는 대기는 스피너 금지. 퍼센트를 모르면 **끝난 단계 / 남은 단계**. 가짜 “거의 다 됨”은 불신이다.

우리: 다섯 등은 유지. 노란등 옆에 한 줄만 바꾼다.

| 지금 | 더 사람 쪽 |
|---|---|
| 작업 중 | 봇 창에서 일하는 중 · 3분째 |
| 컷 도착 | 미리보기가 이 탭에 있음 · 저장만 남음 |
| (조용함) | 아직 컷 없음 · 봇이 이 초대문을 읽었는지 이 창은 모름 |

막히는 이유를 숨기지 않는다. “재시도 중”이 있으면 그 말을 쓴다. 퍼센트 바는 만들지 않는다. 단계를 모르면 경과 시간만.

계약: 새 필드 없이 등 + 경과 시간 + 사람 말. 봇이 “읽었음”을 알려면 계약이 따로 온다.

### 3. 돌아왔을 때 30초 브리핑

출처: Slow AI — Context Reboarding. NN/g [Long Waits and Interruptions](https://www.nngroup.com/articles/designing-for-waits-and-interruptions/) — briefing test, success dialog.

밖에서: 사람은 기다리지 않고 자리를 비운다. 돌아오면 **원래 부탁 / 중간에 한 결정 / 지금 상태 / 안 누르면 어떻게 되나**를 한 장에. Azure DevOps의 “Continue where you left off”. 성공 알림은 시작·끝·걸린 시간.

우리: 자동 탭을 다시 열면 맨 위.

```
아까 적은 말: …
붙인 봇: … · 마지막 확인 2분 전
지금: 컷이 와 있음 / 아직 없음 · 12분째
안 누르면: 이 탭에 미리보기만 남음. 올리지는 않음
```

저장이 끝나면 같은 톤.

```
이 PC에 두었음
  폴더: …
  시작 → 저장: 11분
  다음: 다른 제목 / 편집 열기
```

토스트가 사라지지 않게. 긴 대기 뒤 성공은 사람이 닫는다.

계약: 없음. 로컬 경과·경로·마지막 pull 시각.

### 4. 중간에서 “이 정도면 저장”

출처: Slow AI — stop-and-keep, 부분 결과를 미완으로 표시.

밖에서: 60%에서 쓸 만하면 멈춘다. “예비, 소스 40%”처럼 라벨을 붙인다.

우리: 첫 컷이 오면 저장 등을 켠다. 더 기다리라는 강요를 하지 않는다. 미리보기 위에 “첫 컷 · 더 올 수도 있음” 한 줄. 두 번째가 오면 갈아끼울지 묻는다 — 자동으로 덮지 않는다.

계약: 컷이 여러 개로 오는 규칙이 이미 있으면 UI만. 새 필드가 필요하면 여기서 멈춘다.

### 5. 빈칸은 다음 손길을 가리킨다

출처: NN/g [Empty States](https://www.nngroup.com/articles/empty-state-interface-design/). Pencil & Paper, LogRocket 빈 화면 가이드.

밖에서: 빈 패널을 그냥 두지 않는다. (1) 지금 상태, (2) 여기엔 무엇이 오나, (3) 바로 가는 버튼. Loggly는 “소스 추가”와 “데모 데이터” 둘. 로딩 중 “레코드 없음”은 거짓말이다.

우리:

| 빈 곳 | 쓸 말 | 버튼 |
|---|---|---|
| 봇 없음 | 아직 안 붙음. 자동은 제목보다 연결이 먼저 | 연결 열기 |
| 제목 없음 | 오늘 올릴 한 줄 | (시작은 꺼 둠) |
| 미리보기 없음 · 대기 | 컷이 오면 여기. 기다리는 중이니 비어 있음 | — |
| 미리보기 없음 · 내 파일 | 이 칸에 놓거나 고르기 | 파일 고르기 |
| 저장 후 | 이 PC에 두었음 | 폴더 열기 / 다음 제목 |
| 검색·목록 0건 | 없음을 말하고, 로딩과 구분 | 필터 지우기 |

샘플은 빈칸의 **작은 글**로만. 자동 재생·자동 프로젝트 생성은 하지 않는다.

계약: 없음.

### 6. 제목칸은 회상보다 알아보기

출처: Nielsen — 빈 채팅창은 disclosure cliff. [Recognition rather than recall](https://www.nngroup.com/articles/recognition-and-recall/). CapCut [템플릿·스타일 고르기](https://www.capcut.com/resource/runway-ai-video).

밖에서: CapCut은 한 줄 + 스타일(릴/영화/카툰) + 화면비. 스크립트→장면은 그 다음. 빈 프롬프트만 두면 사람이 능력을 짐작해야 한다.

우리: 제목칸 아래 **최근 세 줄**을 칩으로. 누르면 칸에 들어간다. 스타일 네 장은 이미 있다. 첫 화면에는 펼치지 말고, 추측된 하나 + “다른 스타일”. 화면비는 레시피가 이미 안다 — 사람 말로는 “세로 · 릴”.

계약: 없음. localStorage에 최근 제목.

### 7. 기다림은 백그라운드, 알림은 세 겹

출처: NN/g Long Waits §5. Slow AI — tiered notifications. WhatsApp [Linked devices](https://www.whatsapp.com/download/desktop) — 기기는 한 곳에서, 상태는 “마지막 사용”.

밖에서: 긴 일은 화면을 가두지 않는다. 막힐 때만 크게, 품질 선택은 다음에 앱을 열 때, 완료는 사람이 고른 크기. 이메일/SMS는 우리 서버가 없다.

우리:

- 자동을 떠나 편집·도구를 봐도 일은 계속. (이미 pull은 워크스페이스 새로고침)
- 타이틀바에 작은 점: 노랑=대기, 초록=컷. 등 다섯 개를 헤더에 복제하지 않는다.
- 컷이 오면 창이 뒤에 있을 때만 OS 알림. 보고 있으면 자동 탭 한 줄이면 충분.
- 연결됨 표시는 “Grok · 2분 전”처럼 마지막 확인. WhatsApp의 last seen과 같은 감각. 주소는 안 보여 준다.

계약: 트레이/OS 알림은 데스크톱 쪽. 새 `/api/v2` 아님. 같은 PC 봇 “읽음”은 여전히 계약 대기.

### 8. 로컬 파일이 스피너를 기다리지 않게

출처: [Ink & Switch, Local-first](https://www.inkandswitch.com/essay/local-first/) — 일곱 이상. 특히 “No spinners: your work at your fingertips”, “The network is optional”, “You retain ultimate ownership”.

밖에서: 내 데이터는 기기에 있고, 구름은 선택. 네트워크가 없어도 연다. 파일로 남긴다.

우리: 이미 로컬 우선이다. 사람 말로 더 드러낼 곳만.

- 내 파일로 시작은 **즉시** 타임라인이 보여야 한다. 봇 pull과 같은 대기 문장을 쓰지 않는다.
- 저장 성공 문장은 “클라우드에 올림”이 아니라 “이 PC · 이 폴더”.
- 오프라인에서 연결 등이 꺼져도, 이미 받은 컷·내 파일은 연다. 네트워크가 선택임을 빈칸에 한 줄.

계약: 없음.

### 9. 잘못된 길에서 멈추고, 한 줄로 고친다

출처: Slow AI — Quality Checks, sunk cost. Training Wheels (Carroll & Carrithers, 1984) — 닿을 수 없는 오류는 안 난다.

밖에서: 중간 결과(러프 컷, 스토리보드)를 보고 멈춘다. “같은 프롬프트로 다시”보다 “바늘 그림은 빼”처럼 증분 지시.

우리:

- 미리보기가 별로면 **저장하지 않기**가 기본 탈출이다. 편집 열기는 두 번째.
- 실패 한 줄 + 버튼 하나. “다시 시작”은 같은 제목·같은 봇으로 일을 한 번 더 복사. 화질·문·주소를 건드리지 않는다.
- 사람이 고칠 수 없는 길(로그인, 구멍, 업로드)은 버튼으로 열지 않는다.

계약: 봇에게 “이번엔 이렇게 고쳐”를 보내려면 brief 쪽에 손이 간다. UI만으로 가짜 재작성 계약을 만들지 않는다.

### 10. 히스토리와 쪽지 — 자리를 비운 사람의 기억

출처: NN/g Long Waits §3–4. 외부 기억.

밖에서: 최근 파일 + 썸네일. 왜 이 일을 열었는지 짧은 메모. 시스템 이름만 있으면 잘못된 파일을 연다.

우리:

- 자동 착지에 “이어서” — 마지막 제목, 마지막 컷 썸네일, 마지막 저장 폴더.
- 제목칸 옆 한 줄 메모는 과하다. 대신 제목 자체가 메모다. 같은 제목을 두 번 시작하면 “어제 그 일 / 새로”를 묻는다.
- 책장(프로젝트) 목록에 썸네일이 있으면 연다. 없으면 제목+날짜만으로도 “이어서”는 된다.

계약: 썸네일이 로컬에 있으면 UI. 새 스키마는 이 메모로 열지 않는다.

## 아이디어 — 연결 탭에 얹을 것

자동에 연결을 다시 그리지 않는다. 연결 쪽이 더 사람다워지면 자동의 초록등만 좋아진다.

### 11. 기기 연결은 “한 곳 + 마지막 본 시각”

출처: WhatsApp Desktop / Linked devices. HN에 남은 [로컬 QR 페어링 기억](https://news.ycombinator.com/item?id=24790170) — 카메라로 맞추되, 서버 계정 없이 P2P.

밖에서: 데스크톱은 QR을 크게, 폰은 찍기만. 연결된 기기 목록, 끊기, last seen. 로그인 폼이 아니다.

우리: 이미 페어 코드 + `GROK_CREW_OK`. QR로 `127.0.0.1`을 열지 않는다. 가져올 것은 **목록의 말투**다.

```
붙음
  Grok · 다른 PC · 2분 전 확인
  [ 끊기 ]
기다리는 중
  코드 · 클립보드에 있음 · 그 창에 붙이세요
```

코드 만료가 있으면 숨기지 않는다. Nielsen: 결정에 필요한 나쁜 소식은 1층.

계약: last-seen이 이미 heartbeat에 있으면 말투만.

### 12. 첫 연결의 빈칸은 튜토리얼이 아니라 한 동작

출처: NN/g empty states, Training Wheels, [Hick’s Law](https://jakobnielsenphd.substack.com/p/progressive-disclosure).

밖에서: 첫 화면 과제만 보이게. 나머지 문은 잠그되, 있다는 건 보이게.

우리: 이미 설정/편집/내보내기를 잠근다. 연결 빈칸은 버튼 하나 — **코드 복사**. SmartScreen 숫자는 이미 제품 안. 그 숫자를 자동 탭으로 옮기지 않는다.

## 아이디어 — 책상 전체

### 13. 워크벤치 시험 / 브리핑 시험

출처: Nielsen Progressive Disclosure.

- **워크벤치:** 처음 쓰는 사람이, 서랍을 안 열고, 제목 → 시작까지 끝나는가.
- **브리핑:** 자리 비운 사람이 30초 안에 상태·어디에 두었나·다음에 누를 것을 읽는가.

우리 릴리스 전에 이 두 질문만 하면 된다. 새 기능보다 이 시험이 싸다.

### 14. 문 라벨은 정직하게

출처: mystery-meat navigation (Flanders). Nielsen guideline 4 — “More…” 금지.

우리: **더보기** 뒤에 도구·제작·봇 확인이 있으면, 자동/연결의 사람 말과 온도가 다르다. 자동에서 쓰는 단어(연결, 시작, 이 PC에)를 헤더에도 맞춘다. “Export/Render/Handoff”를 사람 화면에 되살리지 않는다.

### 15. 두 번 누르기 경고를 쓰지 않는다

출처: NN/g Progress Indicators — “다시 누르지 마세요”는 최악.

우리: **시작**을 누르면 즉시 눌린 상태가 되고, 일이 나갈 때까지 다시 못 누른다. 경고 문장은 쓰지 않는다.

구현 판과 상품화는 `docs/AUTO_TRUST.ko.md`다. 아래 우선순위는 스크랩을 나눈 원장이다.

## 우선순위 (구현이 아니라 제품 판단)

계약 없이 자동만 손보면 되는 것부터.

1. 빈칸 세 곳(미리보기·봇 없음·저장 후) + 시작 버튼 즉시 피드백
2. 노란등 옆 경과 시간 + “이 창은 봇이 읽었는지 모름”
3. 돌아왔을 때 브리핑 카드 / 저장 성공 카드
4. 최근 제목 칩 + 시작 전 약속 한 장(하지 않음 포함)
5. 헤더 점 + (창이 뒤일 때만) 컷 도착 알림
6. 첫 컷에서 저장 가능, 다음 컷은 덮을지 묻기
7. 연결 목록의 last-seen 말투

3판(같은 PC 봇이 초대문을 읽기)이 오기 전에는 6–7의 “읽음”을 꾸며 쓰지 않는다.

## 출처

- Jakob Nielsen, [Slow AI: Designing User Control for Long Tasks](https://jakobnielsenphd.substack.com/p/slow-ai) (2025-10)
- Jakob Nielsen, [Progressive Disclosure](https://jakobnielsenphd.substack.com/p/progressive-disclosure) (2026-07)
- Aurora Harley, NN/g, [Visibility of System Status](https://www.nngroup.com/articles/visibility-system-status/)
- Katie Sherwin, NN/g, [Progress Indicators](https://www.nngroup.com/articles/progress-indicators/)
- Kate Kaplan, NN/g, [Empty States](https://www.nngroup.com/articles/empty-state-interface-design/)
- Kate Kaplan, NN/g, [Long Waits and Interruptions](https://www.nngroup.com/articles/designing-for-waits-and-interruptions/)
- Ink & Switch, [Local-first software](https://www.inkandswitch.com/essay/local-first/)
- CapCut, [AI video / template → export](https://www.capcut.com/resource/runway-ai-video)
- WhatsApp, [Desktop / linked devices](https://www.whatsapp.com/download/desktop)
- Carroll & Carrithers, Training Wheels (1984) — Nielsen 글에서 재인용

Mobbin 프로덕션 화면은 이 환경에서 유료 플랜이 필요해 열지 못했다.
