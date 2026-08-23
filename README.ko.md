# Grok Crew

<p align="right"><a href="README.md">English</a> · <strong>한국어</strong></p>

**거친 짧은 영상 소스를 봇이 이해할 수 있는 편집 계획, 로컬 MP4, 선택적 Instagram 업로드로 바꾸세요. 프로젝트·미디어·봇 이력을 클라우드 백엔드로 보낼 필요가 없습니다.**

<p>
  <img alt="로컬 우선" src="https://img.shields.io/badge/local--first-127.0.0.1-1d1d1b?style=flat-square">
  <img alt="Node 22 이상" src="https://img.shields.io/badge/Node.js-22%2B-339933?style=flat-square">
  <img alt="Python 3.10 이상" src="https://img.shields.io/badge/Python-3.10%2B-3776AB?style=flat-square">
  <img alt="내 컴퓨터에서 실행" src="https://img.shields.io/badge/runs-on%20your%20computer-f4c400?style=flat-square">
</p>

![Grok Crew 영문 제작 화면](public/readme/production-workspace.png)

## 작동 영상

[![21초 Grok Crew 작업 흐름 데모 보기](public/demo/grok-crew-workflow.gif)](public/demo/grok-crew-workflow.mp4)

*미리보기는 이 README에서 바로 재생됩니다. 클릭하면 원본 MP4를 엽니다.*

## 왜 Grok Crew인가요?

짧은 영상 편집은 창작 브리프, 봇 지시, 컷 결정, 렌더 작업, 전달 상태가 서로 다른 도구에 흩어질 때 맥락을 잃습니다. Grok Crew는 이 전달 과정을 한 컴퓨터 안에서 보이게 만들고 반복할 수 있게 합니다.

```text
거친 소스 → 대본 컷 맵 → 봇 편집 방식 → 로컬 MP4 → 대기열 또는 자동 업로드
```

Grok Crew는 **사람과 같은 PC에서 실행되는 봇을 위한 로컬 제작 데스크**입니다. 클라우드 영상 편집기나 원격 봇 서비스가 아닙니다.

## 5분 안에 시작하기

### 준비물

- Node.js 22 이상
- Python 3.10 이상
- 이 저장소의 로컬 복제본

### 실행

```sh
git clone https://github.com/NoLucas/JIN-Reel-forge.git grok-crew
cd grok-crew
npm run local
```

첫 실행은 브라우저·로컬 렌더 의존성을 설치하고, 개인 Python 환경과 Local Studio를 시작합니다. 그런 다음 [http://localhost:3000/production](http://localhost:3000/production)을 여세요.

클라우드 계정이나 제공자 API 키는 필요하지 않습니다. `Ctrl+C`로 멈추고 같은 명령을 다시 실행하면 이전 로컬 작업 공간을 이어서 사용합니다.

### 로컬 봇에 첫 작업 주기

복제한 폴더 안에서 봇의 터미널에 다음 명령을 실행합니다.

```sh
python local_studio/grok_crew.py contract
python local_studio/grok_crew.py entry --bot-id editor-01 --display-name "Editor 01" --purpose edit_video --task "Prepare a transcript-first short-form edit plan." --execution-mode auto_local
```

그다음 [Bot Check](http://localhost:3000/bots?lang=ko)를 엽니다. 봇은 실제로 체크인한 뒤에만 화면에 나타납니다.

## 가장 빠른 작업 흐름

1. **Production**을 열고 `local_studio/workspace/inputs`의 미디어로 프로젝트를 만듭니다.
2. 봇이 [Bot Guide](http://localhost:3000/bot-guide?lang=ko)를 읽고 편집 방식을 설정한 뒤 대본 컷 맵을 저장하게 합니다.
3. **Operations Center**에서 미디어를 검사하고, 프로젝트 기억을 남기고, A/B 편집을 비교하며 품질 검사를 실행합니다.
4. 로컬 렌더를 실행합니다. 봇은 `auto_local`을 사용하거나 자체 렌더에만 사람 승인 게이트를 선택할 수 있습니다.
5. Instagram 작업을 추가합니다. **Auto-upload**을 켜면 즉시 시작하고, 끄면 로컬 대기열에서 필요할 때 직접 실행합니다.

## 무엇이 달라지나요?

| 기존 문제 | Grok Crew가 제공하는 것 |
| --- | --- |
| 모호한 프롬프트만 받고 편집하는 봇 | 구조화된 로컬 가이드, 편집 방식, 프로젝트 기억장, 작업 보드 |
| 침묵·재촬영·군더더기 위치를 추측 | 대본 우선 컷 맵과 미디어 사전 검사 보고서 |
| 내보낸 뒤에야 문제 발견 | 렌더 전·렌더 후·전달 전 품질 보고서 |
| 봇 실행 사이에 편집 맥락 유실 | 로컬 SQLite 프로젝트 기억, 작업 이력, 봇 heartbeat |
| 상태를 알 수 없는 게시 작업 | 로컬 MP4 렌더 대기열과 작업별 선택적 Instagram 자동 업로드 |

### 내장 제작 도구

- 프로젝트 설정, 로컬 소스/출력 경로, 렌더 설정
- 단어·구절 중심의 대본 컷 맵
- 리프레임, 자막, 속도, FPS, 룩, 오디오 정책, 품질 선택
- 방향·FPS·길이·오디오·검은 화면·무음을 위한 미디어 검사
- 렌더 전·렌더 후·전달 전 품질 검사
- 프로젝트 기억장, 봇 작업 보드, 오디오 계획, A/B 버전, 브랜드 키트, 오버레이 슬롯
- 다음 편집을 위한 실패 메모와 성과 메모
- 실제 입장·heartbeat·편집·렌더·업로드 진행을 보여 주는 Bot Check
- 한국어·영문 화면과 기계가 읽는 봇 설명서

## 봇: 브라우저 또는 터미널

모든 복제본에는 의존성이 없는 로컬 CLI가 포함됩니다. 이 CLI는 loopback 주소만 사용합니다.

```sh
# 기계가 읽는 전체 설명서
python local_studio/grok_crew.py guide

# 어떤 작업 공간이든 올바른 브라우저 주소 출력
python local_studio/grok_crew.py site --page operations
python local_studio/grok_crew.py site --page export

# 실제 봇 접속과 작업 이력 확인
python local_studio/grok_crew.py bots list
python local_studio/grok_crew.py bots activity
```

사용 가능한 화면은 `studio`, `edit`, `cut`, `production`, `operations`, `bots`, `guide`, `terminal`, `library`, `agent`, `connect`, `packet`, `gates`, `export`, `privacy`입니다.

전체 명령은 [로컬 봇 설명서](local_studio/README.md)를 보거나, 작업 공간을 시작한 뒤 [Bot Guide](http://localhost:3000/bot-guide?lang=ko)를 여세요.

## 개인정보와 선택적 Instagram 전달

브라우저 작업 공간은 `localhost:3000`에서, Local Studio는 `127.0.0.1:7214`에서 실행됩니다. 소스 미디어, 렌더 결과, SQLite 기록, 봇 이력은 현재 컴퓨터의 `local_studio/` 아래에 남습니다.

Instagram 전달은 선택 사항입니다. 소유자가 로컬에 설정한 Meta 자격 증명과 지원되는 로컬 MP4가 필요합니다. 작업은 대기열에 남기거나 `--auto-upload`으로 즉시 시작할 수 있으며, 자격 증명은 SQLite에 저장되거나 이 프로젝트를 통해 봇에 노출되지 않습니다.

## 사용 사례

- 크리에이터가 말하는 영상에서 편집 이유를 잃지 않고 타이트한 세로형 릴을 만듭니다.
- 소규모 콘텐츠 팀이 여러 로컬 봇으로 리서치, 컷 계획, QA, 패키징을 나누면서 담당자와 상태를 확인합니다.
- 개발자가 어떤 작업을 기기 밖으로 보내기 전에 영상 편집 에이전트를 로컬에서 검증합니다.

## 로드맵

- [x] 로컬 프로젝트 데스크, 봇 입장, 작업 기억, 렌더, 선택적 Instagram 전달
- [x] 대본 컷 맵, 미디어 사전 검사, 렌더 QA, A/B 버전, 오디오 계획, 오버레이, 브랜드 키트
- [x] 한국어/영문 봇 설명서와 브라우저 페이지 지도
- [ ] 이식 가능한 프로젝트 번들 가져오기/내보내기
- [ ] 더 많은 로컬 렌더 프리셋과 자막 레이아웃
- [ ] 커뮤니티 유지 예제 편집 팩

## 피드백과 기여

개선할 부분이나 지켜야 할 편집 작업 흐름이 있다면 [CONTRIBUTING.md](CONTRIBUTING.md)부터 읽어 주세요. 버그 보고, 기능 제안, 작고 집중된 Pull Request, 재현 가능한 로컬 작업 실패 기록이 특히 도움이 됩니다.

저장소를 공개하기 전에 원하는 이용 방식을 반영한 오픈소스 라이선스를 선택해 추가하세요. 현재는 라이선스가 없으므로 재사용 권한이 부여되지 않습니다.

## 관리자 출시 체크리스트

저장소에는 [출시 체크리스트](docs/LAUNCH.md), [홍보문 키트](docs/ANNOUNCEMENT.md), [변경 기록](CHANGELOG.md)이 포함되어 있습니다. 알리기 전 라이선스를 정하고, GitHub 토픽을 추가한 뒤 첫 태그 릴리스를 만드세요.
