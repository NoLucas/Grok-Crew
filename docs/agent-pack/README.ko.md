# Grok Crew 에이전트 팩

다른 AI·다른 채팅에서 Grok Crew를 고칠 때 쓰는 **커밋된 스킬과 잠금**이다.

개인 폴더 `.cursor/skills/`는 gitignore다. 그쪽 사본이 오래되면 이 폴더가 이긴다.

## 다른 채팅에서 여는 법

1. 이 저장소를 연다.
2. `docs/agent-pack/SKILL.md`를 읽는다. 추측으로 상품을 다시 만들지 않는다.
3. 할 일이 램프·초대·대기면 `PRESENCE.ko.md`. 보안이면 `SECURITY.ko.md`. 출시면 `RELEASE.ko.md`.
4. 코드를 열기 전에 `PACKET.md`를 채운다.
5. 끝난 뒤 같은 파일의 핸드오프를 남긴다.

Cursor에서 스킬로 쓰려면 이 폴더를 `.cursor/skills/grok-crew-implement/`에 복사해도 된다. 고친 규칙은 **여기로 다시 커밋**한다.

루트 `AGENTS.md`와 `CLAUDE.md`도 이곳을 가리킨다.

## 파일

| 파일 | 한 줄 |
|---|---|
| [SKILL.md](SKILL.md) | 입구. 여덟 칸 구현 순서 |
| [PRODUCT_LOCK.ko.md](PRODUCT_LOCK.ko.md) | 상품, 아닌 것, 화면 문구 잠금 |
| [IMPLEMENT.ko.md](IMPLEMENT.ko.md) | 아이디어를 슬라이스로 깎는 법 |
| [FIND_PROBLEMS.ko.md](FIND_PROBLEMS.ko.md) | 대기가 멈추는 이유를 찾는 법 |
| [SECURITY.ko.md](SECURITY.ko.md) | 커밋·루프백·토큰 점검 |
| [DECISIONS.ko.md](DECISIONS.ko.md) | 대화에서 잠근 결정 연표 |
| [PRESENCE.ko.md](PRESENCE.ko.md) | 불, keep, next-invite, A/F/H/L |
| [CAN_CANNOT.ko.md](CAN_CANNOT.ko.md) | 책상이 할 수 있는 것 / 없는 것 |
| [RELEASE.ko.md](RELEASE.ko.md) | 두 GitHub, 태그, Drive |
| [PACKET.md](PACKET.md) | 작업 패킷과 핸드오프 빈칸 |

## 이미 있는 문서를 대신하지 않는다

긴 구현 목록은 원래 자리에 있다.

- 서버·DB: `docs/STACK.ko.md`
- 구현 목록: `docs/BUILD.ko.md`
- 무료: `docs/FREE.ko.md`
- 자동 화면: `docs/AUTO_TAB.ko.md`, `docs/AUTO_TRUST.ko.md`
- 협업 역할: `docs/AI_COLLABORATION.ko.md`
- 같은 PC Cursor: `docs/CURSOR_AGENT.ko.md`
