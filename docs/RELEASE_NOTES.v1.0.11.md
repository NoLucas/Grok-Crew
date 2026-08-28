# Grok Crew 1.0.11

with Grok Bot. 이 PC에서 여는 프로그램입니다.

이 컷은 **로컬 책상용 zip**입니다. GitHub Release를 올리지 않았고, 손님용 Google 드라이브 파일도 덮지 않았습니다. 이미 설치한 책상의 업데이트 칸은 마지막 공개 태그인 [v1.0.10](https://github.com/NoLucas/Grok-crew-test/releases/tag/v1.0.10)을 봅니다.

공개 손님 파일은 그대로 **Windows에서 열기** → 홈페이지에서 인증한 뒤 열리는 Google 드라이브 `GrokCrew-Windows.exe`입니다.

## 1.0.10에서 달라진 것

- **자동**에서 공개 장면 찾기는 없습니다. 받을 때는 **한 줄에 공개 파일 주소 하나**만 적습니다. 검색어는 일을 시작하지 않습니다.
- 기획·수집·편집 스킬은 `curl` → `CopyFromBox` → 이 PC 자료함입니다. 이 프로그램은 사이트를 긁지 않습니다.
- 내 파일을 고르면 책상이 `Videos\Grok Crew\inputs\`에 복사합니다. 1.0.10은 그 상대 경로(`inputs\hero.png`)를 못 찾아 빨간 오류가 났습니다. 1.0.11은 그 경로를 자료함으로 잇습니다.

## 받아서 연다

1. `GrokCrew-Windows-1.0.11.zip`을 풉니다.
2. 폴더 안의 `Grok Crew Desktop.exe`를 엽니다. 파란 보호 화면이면 **추가 정보 → 그래도 실행**.
3. 이미 1.0.10이 있으면 책상을 트레이까지 끈 뒤, 작업 관리자에 `grok-crew-studio.exe`가 있으면 끝내고, 이 파일을 엽니다.
4. **자동 → 화면**에 **공개 파일 주소로 받기**가 보여야 합니다. **장면 찾아오기**면 이전 설치가 아직 켜져 있는 것입니다.
5. 봇 테스트에는 **이미 있는 영상 열기**를 쓰지 마세요. 그건 봇 없이 파일을 여는 칸입니다.

이 zip은 설치 프로그램(NSIS)이 아닙니다. TTS 설치 마법사는 이 폴더 실행에는 없습니다. 이미 받아 둔 Kokoro는 `Videos\Grok Crew\voice-models`에 그대로 있습니다.

## 이 컷에 없는 것

- GitHub Release 태그, 서명된 exe, 드라이브 손님용 파일 덮어쓰기
- Windows에서 다시 빌드한 사이드카. 이 zip의 `grok-crew-studio.exe`는 공개 1.0.10 바이너리입니다. 화면·스킬·자동 시작 규칙은 1.0.11입니다. 초대문 본문의 「받을 것」줄은 사이드카를 Windows에서 다시 묶기 전에는 1.0.10 글일 수 있습니다.

질문: [NoLucas/Grok-Crew](https://github.com/NoLucas/Grok-Crew) 이슈.
