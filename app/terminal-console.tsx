"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "./language";
import { SiteHeader } from "./site-header";
import { useWorkspaceProfile } from "./workspace-profile";

type Health = {
  status: string;
  bind: string;
  moviepy_installed: boolean;
  bots?: { active_now: number };
};
const studio = "http://127.0.0.1:7214";
const productionUrl = "http://localhost:3000/production";
const cloneBootstrap = "python local_studio/grok_crew.py contract";

const powershellDownload =
  "Invoke-WebRequest http://127.0.0.1:7214/downloads/grok-crew.py -OutFile grok-crew.py; python grok-crew.py contract";
const shellDownload =
  "curl -fsS http://127.0.0.1:7214/downloads/grok-crew.py -o grok-crew.py && python3 grok-crew.py contract";
const commands = [
  {
    ko: "시작과 상태",
    en: "Start and status",
    code: "health · contract · guide · site --page production · entry · policy get|set · heartbeat · bots list|activity|entries",
    detailKo:
      "로컬 서비스 상태를 읽고, 브라우저 작업 주소·봇 입장·실행 정책·활동 기록을 남깁니다.",
    detailEn:
      "Read local service status, browser workspace URLs, bot entry, execution policy, and activity records.",
  },
  {
    ko: "프로젝트와 편집 방식",
    en: "Projects and edit method",
    code: "projects list|get|create · method get|set",
    detailKo: "프로젝트·EDL을 만들고 공유 편집 방식을 설정합니다.",
    detailEn: "Create projects and EDLs, then set the shared edit method.",
  },
  {
    ko: "P0–P2 운영",
    en: "P0–P2 operations",
    code: "ops show|inspect|cut-map|quality|artifact|update · brand list|save",
    detailKo:
      "대본 컷 맵, 검사, QA, 봇 작업, 메모, 오디오, 버전, 오버레이, 성과 기록을 사용합니다.",
    detailEn:
      "Use cut maps, inspection, QA, bot work, memory, audio, variants, overlays, and performance notes.",
  },
  {
    ko: "로컬 렌더와 게시",
    en: "Local render and publishing",
    code: "jobs list|render --bot-id · instagram · run",
    detailKo:
      "auto_local 봇은 로컬 렌더를 자동 실행하고, 승인 모드 봇은 사람 승인을 요청합니다. Instagram 실제 게시는 항상 별도 승인입니다.",
    detailEn:
      "auto_local bots run local renders automatically; approval-mode bots request a person. Instagram publishing always has a separate approval.",
  },
];

export default function TerminalConsole() {
  const { t } = useLanguage();
  const { profile } = useWorkspaceProfile();
  const escapedBotLabel = profile.defaultBotLabel.replace(/["\\]/g, "\\$&");
  const firstEntry = `python local_studio/grok_crew.py entry --bot-id local-editor-bot --display-name "${escapedBotLabel}" --purpose edit_video --task "Prepare a transcript-first edit plan." --execution-mode auto_local`;
  const [health, setHealth] = useState<Health | null>(null);
  const [copied, setCopied] = useState("");
  const [message, setMessage] = useState("");
  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`${studio}/health`);
      const value = (await response.json()) as Health & { error?: string };
      if (!response.ok)
        throw new Error(value.error ?? "local service unavailable");
      setHealth(value);
      setMessage(
        t(
          "Grok bot 터미널은 이 PC의 Local Studio에만 연결됩니다.",
          "Grok bot terminals connect only to Local Studio on this computer.",
        ),
      );
    } catch (error) {
      setHealth(null);
      setMessage(
        error instanceof Error
          ? `${error.message} — ${t("Local Studio를 먼저 실행하세요.", "Start Local Studio first.")}`
          : t(
              "Local Studio에 연결할 수 없습니다.",
              "Cannot connect to Local Studio.",
            ),
      );
    }
  }, [t]);
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [refresh]);
  const copy = async (name: string, value: string) => {
    await navigator.clipboard?.writeText(value);
    setCopied(name);
    window.setTimeout(() => setCopied(""), 1700);
  };

  return (
    <>
      <SiteHeader current="terminal" />
      <main className="terminal-main">
        <section className="terminal-hero">
          <div>
            <p className="kicker">{t("GROK CREW · 터미널 CLI", "GROK CREW · TERMINAL CLI")}</p>
            <h1>
              {t("각 bot의 터미널에서", "Give every bot terminal")}
              <br />
              <span>
                {t(
                  "로컬 편집 도구를 실행하세요.",
                  "the complete local editor.",
                )}
              </span>
            </h1>
            <p>
              {t(
                "GitHub 복제본에는 봇 CLI가 이미 포함되어 있습니다. 이 PC의 각 터미널에서 입장·편집·검사·운영·승인된 전달 작업을 브라우저 없이 실행할 수 있습니다.",
                "Every GitHub clone already includes the bot CLI. Each terminal on this computer can run entry, editing, QA, operations, and approved delivery work without browser interaction.",
              )}
            </p>
          </div>
          <aside className={`terminal-health ${health ? "ready" : ""}`}>
            <span>{t("로컬 CLI 연결", "LOCAL CLI GATEWAY")}</span>
            <b>
              {health
                ? t("연결 준비됨", "READY TO CONNECT")
                : t("서비스 꺼짐", "SERVICE OFFLINE")}
            </b>
            <p>
              {health
                ? `127.0.0.1 · ${health.moviepy_installed ? "MoviePy ready" : t("렌더 설정 필요", "render setup needed")} · ${health.bots?.active_now ?? 0} ${t("활성 봇", "active bot(s)")}`
                : t(
                    "Local Studio를 실행하면 로컬 봇 연결이 준비됩니다.",
                    "Start Local Studio to make local bot connections available.",
                  )}
            </p>
            <button onClick={() => void refresh()}>
              {t("연결 다시 확인", "Check connection")}
            </button>
          </aside>
        </section>
        <section className="terminal-rule">
          <b>{t("같은 PC 전용", "Same computer only")}</b>
          <span>
            {t(
              "CLI는 127.0.0.1 또는 localhost 이외의 주소로 연결할 수 없습니다. 외부 Grok API·클라우드 서버·외부 데이터베이스는 사용하지 않습니다.",
              "The CLI can connect only to 127.0.0.1 or localhost. It uses no external Grok API, cloud server, or external database.",
            )}
          </span>
        </section>
        <section className="terminal-port-map">
          <article>
            <span>{t("봇 CLI · JSON API", "BOT CLI · JSON API")}</span>
            <b>127.0.0.1:7214</b>
            <p>
              {t(
                "다운로드·명령·데이터용 주소입니다. 이 주소에 /production 같은 화면 경로를 붙이지 마세요.",
                "Use this for downloads, commands, and data. Do not append browser paths such as /production.",
              )}
            </p>
          </article>
          <article>
            <span>{t("브라우저 작업 공간 · 스크린샷", "BROWSER WORKSPACE · SCREENSHOT")}</span>
            <b>localhost:3000</b>
            <p>
              {t(
                "화면 열기·스크린샷은 이 주소입니다. CLI에서는 site --page production으로 정확한 주소를 받습니다.",
                "Open pages and take screenshots here. In the CLI, use site --page production to print the exact URL.",
              )}
            </p>
            <div>
              <code>{productionUrl}</code>
              <button
                onClick={() => void copy("production-url", productionUrl)}
              >
                {copied === "production-url"
                  ? t("복사됨", "Copied")
                  : t("편집 화면 주소 복사", "Copy editor URL")}
              </button>
            </div>
          </article>
        </section>
        <section className="terminal-clone">
          <div>
            <p className="kicker">{t("GitHub 복제본 · 내장 봇 CLI", "GITHUB CLONE · BUILT-IN BOT CLI")}</p>
            <h2>
              {t(
                "복제본에는 봇 CLI가 이미 들어 있습니다.",
                "Every clone already includes the bot CLI.",
              )}
            </h2>
            <p>
              {t(
                "GitHub에서 내려받은 폴더의 최상위에서 실행하세요. 파일을 다시 내려받을 필요가 없으므로 구버전 CLI 혼동도 없습니다.",
                "Run this from the top folder of a GitHub clone. No additional download means no stale-CLI confusion.",
              )}
            </p>
          </div>
          <div>
            <code>{cloneBootstrap}</code>
            <button
              onClick={() => void copy("clone-bootstrap", cloneBootstrap)}
            >
              {copied === "clone-bootstrap"
                ? t("복사됨", "Copied")
                : t("복제본 CLI 명령 복사", "Copy clone CLI command")}
            </button>
          </div>
        </section>
        <section className="terminal-download-grid">
          <article className="terminal-card">
            <div className="terminal-card-head">
              <span>01 · WINDOWS / POWERSHELL</span>
              <button
                onClick={() => void copy("powershell", powershellDownload)}
              >
                {copied === "powershell"
                  ? t("복사됨", "Copied")
                  : t("명령 복사", "Copy command")}
              </button>
            </div>
            <pre>{powershellDownload}</pre>
            <p>
              {t(
                "각 Grok bot 터미널에서 실행하면 현재 Local Studio가 제공하는 CLI를 내려받고 기능 계약을 확인합니다.",
                "Run this in a Grok bot terminal to download the current Local Studio CLI and inspect its capability contract.",
              )}
            </p>
          </article>
          <article className="terminal-card">
            <div className="terminal-card-head">
              <span>02 · MAC / LINUX SHELL</span>
              <button onClick={() => void copy("shell", shellDownload)}>
                {copied === "shell"
                  ? t("복사됨", "Copied")
                  : t("명령 복사", "Copy command")}
              </button>
            </div>
            <pre>{shellDownload}</pre>
            <p>
              {t(
                "같은 로컬 장치에서만 실행하세요. 원격 서버나 인터넷 주소로는 연결되지 않습니다.",
                "Run it only on the same local device. It cannot connect to a remote server or internet address.",
              )}
            </p>
          </article>
        </section>
        <section className="terminal-flow">
          <div className="terminal-flow-head">
            <div>
              <p className="kicker">{t("봇 시작 순서", "BOT START SEQUENCE")}</p>
              <h2>
                {t("내려받고 · 입장하고 ·", "Download · enter ·")}{" "}
                <span>{t("작업을 이어갑니다.", "continue the work.")}</span>
              </h2>
            </div>
            <button onClick={() => void copy("entry", firstEntry)}>
              {copied === "entry"
                ? t("입장 명령 복사됨", "Entry command copied")
                : t("첫 입장 명령 복사", "Copy first entry command")}
            </button>
          </div>
          <pre>{firstEntry}</pre>
          <div className="terminal-flow-steps">
            <article>
              <i>01</i>
              <b>contract</b>
              <p>
                {t(
                  "CLI가 가진 모든 명령과 승인 규칙을 읽습니다.",
                  "Read every CLI command and approval rule.",
                )}
              </p>
            </article>
            <article>
              <i>02</i>
              <b>entry</b>
              <p>
                {t(
                  "봇 이름·목적·작업을 기록하고 첫 체크인을 남깁니다.",
                  "Record the bot name, purpose, task, and first check-in.",
                )}
              </p>
            </article>
            <article>
              <i>03</i>
              <b>guide / ops</b>
              <p>
                {t(
                  "편집 설명서를 읽고 대본·검사·작업 보드로 진행합니다.",
                  "Read the guide, then continue with transcript, checks, and the task board.",
                )}
              </p>
            </article>
            <article>
              <i>04</i>
              <b>heartbeat</b>
              <p>
                {t(
                  "의미 있는 상태가 바뀔 때 활동 기록을 갱신합니다.",
                  "Update activity whenever a meaningful state changes.",
                )}
              </p>
            </article>
          </div>
        </section>
        <section className="terminal-capabilities">
          <div className="terminal-section-head">
            <div>
              <p className="kicker">{t("전체 로컬 기능 목록", "FULL LOCAL CAPABILITY MAP")}</p>
              <h2>
                {t(
                  "브라우저 화면의 운영 기능을",
                  "Browser workspace operations,",
                )}
                <br />
                <span>
                  {t(
                    "터미널에서도 같은 계약으로.",
                    "with the same terminal contract.",
                  )}
                </span>
              </h2>
            </div>
            <p>
              {t(
                "복잡한 JSON 입력은 파일로 전달합니다. 예: --file project.json. CLI는 별도 패키지를 설치하지 않습니다.",
                "Pass complex JSON input as a file, for example --file project.json. The CLI has no extra package dependency.",
              )}
            </p>
          </div>
          <div className="terminal-command-list">
            {commands.map((command, index) => (
              <article key={command.en}>
                <i>{String(index + 1).padStart(2, "0")}</i>
                <div>
                  <b>{t(command.ko, command.en)}</b>
                  <code>{command.code}</code>
                  <p>{t(command.detailKo, command.detailEn)}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="terminal-safety-grid">
          <article className="terminal-card token-card">
            <div className="terminal-card-head">
              <span>{t("로컬 토큰", "LOCAL TOKEN")}</span>
              <em>{t("선택 보호", "optional protection")}</em>
            </div>
            <h3>
              {t(
                "토큰은 bot 터미널에만 둡니다.",
                "Keep tokens in the bot terminal only.",
              )}
            </h3>
            <p>
              {t(
                "보호 토큰을 켠 경우에만 각 터미널 환경 변수 LOCAL_STUDIO_TOKEN으로 전달하세요. CLI와 웹사이트, SQLite는 토큰을 저장하거나 읽지 않습니다.",
                "Only when token protection is enabled, pass LOCAL_STUDIO_TOKEN through each terminal environment. The CLI, website, and SQLite never store or read it.",
              )}
            </p>
            <button
              onClick={() =>
                void copy("contract", `${studio}/api/terminal-contract`)
              }
            >
              {copied === "contract"
                ? t("계약 주소 복사됨", "Contract address copied")
                : t("터미널 계약 주소 복사", "Copy terminal contract URL")}
            </button>
          </article>
          <article className="terminal-card approval-card">
            <div className="terminal-card-head">
              <span>{t("봇 실행 정책", "BOT EXECUTION POLICY")}</span>
              <em>{t("봇이 선택", "bot selected")}</em>
            </div>
            <h3>
              {t(
                "입장하면 기본으로 자동 로컬 렌더가 켜집니다.",
                "Entry enables automatic local rendering by default.",
              )}
            </h3>
            <p>
              {t(
                "policy set --bot-id &lt;id&gt; --mode approval_required로 바꾸면 그 봇의 렌더에는 --human-approved가 필요합니다. Instagram 실제 게시에는 언제나 사람 승인, 서버 게시 허용, PUBLISH 확인이 필요합니다.",
                "Use policy set --bot-id &lt;id&gt; --mode approval_required to require --human-approved for that bot. Instagram publishing always needs human approval, the server switch, and PUBLISH confirmation.",
              )}
            </p>
          </article>
          <article className="terminal-card">
            <div className="terminal-card-head">
              <span>{t("실시간 상태", "LIVE STATUS")}</span>
              <em>
                {health ? t("연결됨", "connected") : t("오프라인", "offline")}
              </em>
            </div>
            <h3>{t("현재 로컬 실행 상태", "Current local status")}</h3>
            <p>
              {message ||
                t(
                  "로컬 터미널 연결을 확인하는 중입니다.",
                  "Checking the local terminal connection.",
                )}
            </p>
            <Link href="/bots">
              {t("봇 활동 확인으로 이동", "Open bot activity")} →
            </Link>
          </article>
        </section>
      </main>
    </>
  );
}
