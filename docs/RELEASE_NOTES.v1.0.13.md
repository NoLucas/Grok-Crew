# Grok Crew 1.0.13

with Grok Bot. 이 PC에서 여는 프로그램입니다.

공개 파일: **Windows에서 열기** → `GrokCrew-Windows.exe`. 받는 곳: [Grok-crew-test v1.0.13](https://github.com/NoLucas/Grok-crew-test/releases/tag/v1.0.13)과 [Grok-Crew v1.0.13](https://github.com/NoLucas/Grok-Crew/releases/tag/v1.0.13). 손님용 Google 드라이브 파일은 덮지 않았습니다. 이미 설치한 책상은 이 업데이트를 봅니다.

1.0.12와 같은 길입니다. 받아서 엽니다.

## 1.0.12에서 달라진 것

- TTS 미리듣기는 카탈로그에 있는 화자만 씁니다. 요청으로 다른 음성 파일을 열지 않습니다.
- 미리듣기 응답에 이 PC 절대 경로를 넣지 않습니다.
- 수집 주소는 공개 `http(s)` 파일만 받습니다. `file://`과 이 PC 주소는 거절합니다.
- `/media`는 미리보기 영상·소리만 줍니다. 받은 TTS 가중치는 열지 않습니다.
- 목소리 받기는 Hugging Face HTTPS만 따릅니다.

## 받아서 연다

1. `GrokCrew-Windows.exe`를 받아 엽니다. 파란 보호 화면이면 **추가 정보 → 그래도 실행**.
2. 설치가 TTS를 묻습니다. 이미 있으면 건너뜁니다. 고르지 않으면 Kokoro-82M입니다.
3. 이미 1.0.12가 있으면 책상을 트레이까지 끈 뒤, 작업 관리자에 `grok-crew-studio.exe`가 있으면 끝내고, 이 파일을 설치하세요.
4. **시작 → TTS생성**을 켜면 말투에 미국 영어·영국 영어·중국어·일본어만 보여야 합니다. 한국어가 보이면 이전 설치가 아직 켜져 있는 것입니다.

## 1.0.13에 없는 것

- 서명된 exe, SNS OAuth, 드라이브 손님용 파일 자동 덮어쓰기

질문: [NoLucas/Grok-Crew](https://github.com/NoLucas/Grok-Crew) 이슈.
