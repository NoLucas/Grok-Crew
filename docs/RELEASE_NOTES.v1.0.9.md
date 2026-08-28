# Grok Crew 1.0.9

with Grok Bot. 이 PC에서 여는 프로그램입니다.

공개 파일: **Windows에서 열기** → `GrokCrew-Windows.exe`. 받는 곳: 홈페이지에서 인증한 뒤 열리는 Google 드라이브 파일. 이미 설치한 책상은 [v1.0.9 업데이트](https://github.com/NoLucas/Grok-crew-test/releases/tag/v1.0.9)를 봅니다. 설치 파일은 Grok-crew-test 릴리스에만 올립니다.

1.0.8과 같은 길입니다. 받아서 엽니다.

## 1.0.8에서 달라진 것

- 설치가 Kokoro-82M을 받을 때 Hugging Face의 진짜 파일 이름 `kokoro-v1_0.pth`를 씁니다. 1.0.8은 없는 `kokoro-v1.0.pth`를 받아 404가 나고, **그 목소리를 이 PC에 두지 못했습니다**가 떴습니다.
- TTS를 고른 뒤 받기는 설치 로그가 없는 페이지에서도 PowerShell이 실행됩니다.

## 받아서 연다

1. `GrokCrew-Windows.exe`를 받아 엽니다. 파란 보호 화면이면 **추가 정보 → 그래도 실행**.
2. 설치가 TTS를 묻습니다. **다음**을 누르면 그 모델만 받습니다. Kokoro는 약 330MB라 몇 분 걸릴 수 있습니다. 고르지 않으면 Kokoro-82M입니다.
3. 이미 1.0.8이 있으면 책상을 트레이까지 끈 뒤, 작업 관리자에 `grok-crew-studio.exe`가 있으면 끝내고, 이 파일을 설치하세요.
4. **연결** 글은 1.0.8과 같습니다.

## 1.0.9에 없는 것

- 서명된 exe, SNS OAuth, 드라이브 손님용 파일 자동 덮어쓰기

질문: [NoLucas/Grok-Crew](https://github.com/NoLucas/Grok-Crew) 이슈.
