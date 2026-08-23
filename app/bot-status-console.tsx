"use client";

import { useCallback, useEffect, useState } from "react";
import { useLanguage } from "./language";
import { SiteHeader } from "./site-header";

type ExecutionPolicy = {
  mode: "auto_local" | "approval_required";
  updated_by: string;
  updated_at: string | null;
  is_default?: boolean;
};
type Bot = {
  bot_id: string;
  display_name: string;
  last_action: string;
  last_detail_json: Record<string, unknown>;
  last_seen: string;
  presence: "active" | "idle";
  seconds_since_checkin: number;
  execution_policy?: ExecutionPolicy;
};
type Activity = {
  id: string;
  bot_id: string;
  action: string;
  detail_json: Record<string, unknown>;
  created_at: string;
};
type BotSummary = {
  total_known: number;
  active_now: number;
  activity_rule: string;
};
type Health = {
  status: string;
  bind: string;
  moviepy_installed: boolean;
  instagram_publish_enabled: boolean;
  bots?: BotSummary;
};
type BotEntryGuide = {
  schema: string;
  scope: string;
  entry_endpoint: string;
  entry_body: Record<string, string>;
  first_requests: string[];
  keep_alive: string;
  approval_boundary: string;
};
type BotEntry = {
  id: string;
  bot_id: string;
  display_name: string;
  purpose: string;
  task: string;
  joined_at: string;
  presence: "active" | "idle";
  seconds_since_checkin: number | null;
};

const studio = "http://127.0.0.1:7214";
const capabilities = [
  {
    ko: "편집 계획 작성",
    en: "Edit planning",
    detailKo:
      "Cut Log의 자막·타임코드를 읽고, 남길 구간과 순서를 EDL로 준비합니다.",
    detailEn:
      "Read Cut Log captions and timecodes, then prepare the kept segments and order as an EDL.",
    mode: "auto",
  },
  {
    ko: "로컬 프로젝트 생성",
    en: "Create a local project",
    detailKo: "원본·결과 파일 경로, 캡션, EDL을 SQLite 프로젝트로 기록합니다.",
    detailEn:
      "Record source and output paths, captions, and EDLs as SQLite projects.",
    mode: "auto",
  },
  {
    ko: "작업 상태 읽기",
    en: "Read job status",
    detailKo:
      "프로젝트·렌더·게시 작업의 대기, 실패, 완료 상태를 확인해 다음 행동을 정합니다.",
    detailEn:
      "Check queued, failed, and complete project, render, and publish work to determine the next action.",
    mode: "auto",
  },
  {
    ko: "품질 확인 제안",
    en: "Suggest quality checks",
    detailKo:
      "빈 구간, 짧은 훅, 자막 길이, 릴 형식 문제를 찾아 수정안을 남깁니다.",
    detailEn:
      "Find empty segments, weak hooks, caption-length, and reel-format issues, then record fixes.",
    mode: "auto",
  },
  {
    ko: "렌더 작업 대기열",
    en: "Queue a render",
    detailKo:
      "연결된 봇은 자신의 정책을 auto_local 또는 사람 승인 필요로 정합니다. 기본값은 자동 로컬 렌더입니다.",
    detailEn:
      "A connected bot chooses auto_local or human approval. The default is automatic local rendering.",
    mode: "auto",
  },
  {
    ko: "로컬 MP4 렌더 실행",
    en: "Run a local MP4 render",
    detailKo:
      "auto_local 봇은 이 PC에서 9:16 H.264/AAC MP4를 바로 만들고, 승인 모드 봇은 사람 승인 뒤 실행합니다.",
    detailEn:
      "auto_local bots make a 9:16 H.264/AAC MP4 on this computer right away; approval-mode bots wait for a person.",
    mode: "auto",
  },
  {
    ko: "Instagram 게시 준비",
    en: "Prepare Instagram publishing",
    detailKo: "캡션·공유 여부·완성 MP4를 게시 대기열로 넣습니다.",
    detailEn:
      "Add the caption, share option, and final MP4 to a publish queue.",
    mode: "review",
  },
  {
    ko: "Instagram 실제 게시",
    en: "Publish to Instagram",
    detailKo:
      "자동 업로드가 켜진 작업은 즉시 전송하고, 꺼진 작업은 대기열에서 직접 실행합니다.",
    detailEn:
      "Jobs with auto-upload run immediately; queued jobs can be run directly from the job board.",
    mode: "auto",
  },
  {
    ko: "작업 이력 요약",
    en: "Summarize job history",
    detailKo:
      "실패 원인·결과물 위치·마지막 작업을 짧은 운영 보고로 정리합니다.",
    detailEn:
      "Summarize failures, output locations, and the last action as a concise operations report.",
    mode: "auto",
  },
  {
    ko: "자격증명 보호",
    en: "Protect credentials",
    detailKo:
      "Meta 토큰, 로컬 보호 토큰, .env 파일을 읽거나 노출할 수 없습니다.",
    detailEn:
      "Never read or reveal Meta tokens, local protection tokens, or .env files.",
    mode: "never",
  },
];

function dateTime(value: string, language: "ko" | "en") {
  return new Date(value).toLocaleString(language === "ko" ? "ko-KR" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
function since(seconds: number, language: "ko" | "en") {
  if (language === "en")
    return seconds < 60
      ? `${seconds}s ago`
      : seconds < 3600
        ? `${Math.floor(seconds / 60)}m ago`
        : `${Math.floor(seconds / 3600)}h ago`;
  return seconds < 60
    ? `${seconds}초 전`
    : seconds < 3600
      ? `${Math.floor(seconds / 60)}분 전`
      : `${Math.floor(seconds / 3600)}시간 전`;
}

export default function BotStatusConsole() {
  const { t, language } = useLanguage();
  const [health, setHealth] = useState<Health | null>(null);
  const [bots, setBots] = useState<Bot[]>([]);
  const [summary, setSummary] = useState<BotSummary | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [entryGuide, setEntryGuide] = useState<BotEntryGuide | null>(null);
  const [entries, setEntries] = useState<BotEntry[]>([]);
  const [message, setMessage] = useState("");
  const [lastRefresh, setLastRefresh] = useState("");
  const [copied, setCopied] = useState("");
  const [checking, setChecking] = useState(false);
  const botRequest = `POST ${studio}/api/bots/heartbeat\nContent-Type: application/json\nAuthorization: Bearer <LOCAL_STUDIO_TOKEN if configured>\n\n{\n  "bot_id": "local-editor-bot",\n  "display_name": "Local Editor Bot",\n  "action": "cut_plan_ready",\n  "detail": { "project": "my-video-project", "next": "render or queue/auto-upload Instagram" }\n}`;
  const botEntryRequest = `POST ${studio}/api/bot-entry\nContent-Type: application/json\nAuthorization: Bearer <LOCAL_STUDIO_TOKEN if configured>\n\n{\n  "bot_id": "local-editor-bot",\n  "display_name": "Local Editor Bot",\n  "purpose": "edit_video",\n  "task": "Prepare a transcript-first local edit plan.",\n  "execution_mode": "auto_local"\n}`;

  const refresh = useCallback(async (quiet = false) => {
    setChecking(true);
    try {
      const [
        healthResponse,
        botResponse,
        activityResponse,
        entryResponse,
        entriesResponse,
      ] = await Promise.all([
        fetch(`${studio}/health`),
        fetch(`${studio}/api/bots`),
        fetch(`${studio}/api/bot-activity`),
        fetch(`${studio}/api/bot-entry`),
        fetch(`${studio}/api/bot-entries`),
      ]);
      const [nextHealth, nextBots, nextActivity, nextEntryGuide, nextEntries] =
        (await Promise.all([
          healthResponse.json(),
          botResponse.json(),
          activityResponse.json(),
          entryResponse.json(),
          entriesResponse.json(),
        ])) as [
          Health,
          { bots?: Bot[]; summary?: BotSummary; error?: string },
          { activity?: Activity[]; error?: string },
          BotEntryGuide & { error?: string },
          { entries?: BotEntry[]; error?: string },
        ];
      if (
        !healthResponse.ok ||
        !botResponse.ok ||
        !activityResponse.ok ||
        !entryResponse.ok ||
        !entriesResponse.ok
      )
        throw new Error(
          nextBots.error ??
            nextActivity.error ??
            nextEntryGuide.error ??
            nextEntries.error ??
            t("로컬 서비스 응답 오류", "Local service response error"),
        );
      setHealth(nextHealth);
      setBots(nextBots.bots ?? []);
      setSummary(nextBots.summary ?? null);
      setActivity(nextActivity.activity ?? []);
      setEntryGuide(nextEntryGuide);
      setEntries(nextEntries.entries ?? []);
      setLastRefresh(new Date().toLocaleTimeString(language === "ko" ? "ko-KR" : "en-US"));
      if (!quiet)
        setMessage(
          (nextBots.summary?.active_now ?? 0)
            ? t(`${nextBots.summary?.active_now}개 봇이 최근 5분 안에 실제 체크인했습니다.`, `${nextBots.summary?.active_now} bot(s) checked in during the last five minutes.`)
            : t("최근 5분 안에 체크인한 봇이 없습니다. 아직 실제 사용 중이라고 확인된 봇은 없습니다.", "No bot has checked in during the last five minutes, so none is verified as in use yet."),
        );
    } catch (error) {
      setHealth(null);
      setBots([]);
      setSummary(null);
      setActivity([]);
      setEntryGuide(null);
      setEntries([]);
      setMessage(
        error instanceof Error
          ? `${error.message} — ${t("Local Studio가 실행 중인지 확인하세요.", "Check that Local Studio is running.")}`
          : t("Local Studio에 연결할 수 없습니다.", "Cannot connect to Local Studio."),
      );
    } finally {
      setChecking(false);
    }
  }, [language, t]);
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void refresh();
    }, 0);
    const interval = window.setInterval(() => {
      void refresh(true);
    }, 30000);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, [refresh]);
  const copyRequest = async (kind: "entry" | "heartbeat") => {
    await navigator.clipboard?.writeText(
      kind === "entry" ? botEntryRequest : botRequest,
    );
    setCopied(kind);
    window.setTimeout(() => setCopied(""), 1700);
  };
  const activityText = activity.map((item) => item.action.toLowerCase()).join(" ");
  const botFlow = [
    { id: "01", label: t("입장 기록", "Entry recorded"), detail: t("봇 ID·표시명·목적을 보내고 첫 체크인을 남깁니다.", "The bot sends its ID, display name, purpose, and first check-in."), done: entries.length > 0 },
    { id: "02", label: t("활동 확인", "Activity verified"), detail: t("heartbeat가 기록되면 이 화면에 활성 또는 대기 상태가 보입니다.", "A recorded heartbeat shows active or idle status here."), done: bots.length > 0 || activity.length > 0 },
    { id: "03", label: t("편집 진행", "Editing in progress"), detail: t("봇이 컷 맵·편집 방식·검사를 남기면 최근 활동에 표시됩니다.", "Cut maps, edit methods, and checks appear in recent activity."), done: /cut|edit|inspect|plan|project/.test(activityText) },
    { id: "04", label: t("렌더·업로드", "Render and upload"), detail: t("렌더 또는 Instagram 업로드 기록이 남으면 마지막 단계가 완료됩니다.", "The final stage completes when a render or Instagram upload is recorded."), done: /render|upload|instagram|publish/.test(activityText) },
  ];

  return (
    <>
      <SiteHeader current="bots" />
      <main className="bot-main">
        <section className="bot-hero">
          <div>
            <p className="kicker">{t("GROK CREW · 봇 확인", "GROK CREW · BOT CHECK")}</p>
            <h1>
              {t("내 봇들이", "See what your bots")}{" "}
              <span>{t("무엇을 하고 있는지", "are actually doing")}</span>
              <br />
              {t("확인 가능한 곳.", "on this computer.")}
            </h1>
            <p>
              {t(
                "이 화면은 추측으로 “봇이 접속했다”고 말하지 않습니다. 로컬 제작 서비스에 체크인을 남긴 봇만 표시하며, 최근 5분 이내의 기록만 활성 상태로 봅니다.",
                "This screen never guesses that a bot is present. It only shows bots that checked in to Local Studio, and counts activity from the last five minutes.",
              )}
            </p>
          </div>
          <aside className={`bot-live-card ${health ? "ready" : ""}`}>
            <span>{t("실시간 상태", "LIVE ANSWER")}</span>
            <b>
              {summary?.active_now
                ? t("예 · 활성 봇 확인", "YES · ACTIVE BOTS FOUND")
                : health
                  ? t("아니요 · 확인된 봇 없음", "NO · NO VERIFIED BOT YET")
                  : t("서비스 꺼짐", "SERVICE OFFLINE")}
            </b>
            <p>
              {summary?.active_now
                ? t(
                    `${summary.active_now}개 봇이 로컬 서비스에 최근 체크인을 기록했습니다.`,
                    `${summary.active_now} bot(s) checked in to the local service recently.`,
                  )
                : health
                  ? t(
                      "현재는 어떤 봇도 체크인하지 않았습니다. 브라우저를 열어 둔 것만으로는 사용 중으로 간주하지 않습니다.",
                      "No bot has checked in yet. Keeping a browser tab open is not treated as bot activity.",
                    )
                  : t(
                      "로컬 제작 서비스를 시작한 뒤 다시 확인하세요.",
                      "Start Local Studio, then check again.",
                    )}
            </p>
            <button onClick={() => void refresh()} disabled={checking}>
              {checking
                ? t("확인 중…", "Checking…")
                : t("지금 다시 확인", "Check now")}
            </button>
          </aside>
        </section>
        <section className="bot-answer-strip">
          <b>{t("현재 확인 결과", "Current result")}</b>
          <span>{message}</span>
          <em>{lastRefresh ? t(`마지막 확인 ${lastRefresh}`, `Last checked ${lastRefresh}`) : t("연결 대기", "Waiting for connection")}</em>
        </section>
        <section className="bot-entry-panel">
          <div>
            <p className="kicker">{t("로컬 봇 입장", "LOCAL BOT ENTRY")}</p>
            <h2>
              {t("Grok bot이", "A Grok bot can")} <span>{t("입장하고 바로 작업을 시작", "enter and start work immediately")}</span>{t("할 수 있습니다.", ".")}
            </h2>
            <p>
              {t("같은 PC에서 실행되는 Grok bot은 입장 요청을 한 번 보내면 자동으로 첫 체크인이 기록됩니다. 입장한 봇은 모든 로컬 편집·검사·프로젝트·운영 기능을 곧바로 사용하며, 로컬 렌더는 기본 자동 실행 또는 사람 승인 모드 중 스스로 선택합니다.", "A Grok bot running on this computer records its first check-in when it sends one entry request. Entered bots can immediately use local editing, checks, projects, and operations, then choose automatic or human-approved local rendering.")}
            </p>
            <div className="bot-entry-steps">
              <span>{t("01 · 입장 기록", "01 · Record entry")}</span>
              <span>{t("02 · 실행 정책 선택", "02 · Choose execution policy")}</span>
              <span>{t("03 · 편집·렌더 시작", "03 · Start editing and rendering")}</span>
            </div>
          </div>
          <aside>
            <span>
              {entryGuide
                ? t("입장 준비됨 · 이 기기 전용", "ENTRY READY · LOCAL ONLY")
                : health
                  ? t("입장 정보 불러오는 중", "ENTRY LOADING")
                  : t("서비스 꺼짐", "SERVICE OFFLINE")}
            </span>
            <b>
              {entries.length
                ? t(`${entries.length}개의 입장 기록`, `${entries.length} entry record(s)`)
                : t("아직 입장한 봇 없음", "No bot has entered yet")}
            </b>
            <p>
              {entries[0]
                ? `${entries[0].display_name} · ${entries[0].purpose} · ${entries[0].presence.toUpperCase()}`
                : (entryGuide?.scope ??
                  t("Local Studio를 시작하면 입장 주소가 준비됩니다.", "Start Local Studio to make the entry address available."))}
            </p>
            <button onClick={() => void copyRequest("entry")}>
              {copied === "entry" ? t("입장 요청 복사됨", "Entry request copied") : t("봇 입장 요청 복사", "Copy bot entry request")}
            </button>
            <small>
              {entryGuide?.approval_boundary ??
                t("기본 auto_local은 로컬 렌더에만 적용됩니다. Instagram 업로드는 작업별 자동 업로드 설정을 따릅니다.", "The default auto_local applies only to local renders. Instagram upload follows the per-job auto-upload setting.")}
            </small>
          </aside>
        </section>
        <section className="bot-flow-panel">
          <div className="bot-flow-head">
            <div>
              <p className="kicker">{t("봇 접속 진행 상황", "BOT CONNECTION FLOW")}</p>
              <h2>{t("봇이 들어온 뒤의 진행 상태를", "See each step after a bot enters,")} <span>{t("실제 기록으로 확인합니다.", "based on real local records.")}</span></h2>
            </div>
            <p>{entries[0] ? t(`${entries[0].display_name}의 입장 기록과 활동을 기준으로 표시합니다.`, `Based on ${entries[0].display_name}'s entry record and activity.`) : t("아직 입장 기록이 없습니다. 봇이 entry 요청을 보내면 첫 단계가 완료됩니다.", "There is no entry record yet. The first step completes when a bot sends an entry request.")}</p>
          </div>
          <div className="bot-flow-steps">
            {botFlow.map((step) => <article className={step.done ? "done" : "pending"} key={step.id}><i>{step.done ? "✓" : step.id}</i><div><b>{step.label}</b><p>{step.detail}</p></div><em>{step.done ? t("확인됨", "Verified") : t("대기", "Waiting")}</em></article>)}
          </div>
        </section>
        <section className="bot-summary-grid">
          <article>
            <b>{summary?.total_known ?? 0}</b>
            <span>{t("등록된 로컬 봇", "Known local bots")}</span>
            <p>{t("체크인을 한 적 있는 봇 수", "Bots that have checked in")}</p>
          </article>
          <article className={summary?.active_now ? "active" : ""}>
            <b>{summary?.active_now ?? 0}</b>
            <span>{t("현재 활성 봇", "Active bots now")}</span>
            <p>{t("5분 이내 체크인 기준", "Checked in within five minutes")}</p>
          </article>
          <article>
            <b>{activity.length}</b>
            <span>{t("최근 작업 기록", "Recent activity")}</span>
            <p>{t("로컬 SQLite의 봇 활동", "Bot activity in local SQLite")}</p>
          </article>
          <article className={health?.moviepy_installed ? "active" : ""}>
            <b>{health?.moviepy_installed ? "READY" : "CHECK"}</b>
            <span>{t("로컬 렌더", "Local rendering")}</span>
            <p>{t("MoviePy 실행 가능 여부", "Whether MoviePy can run")}</p>
          </article>
        </section>
        <section className="bot-section bot-capability-section">
          <div className="bot-section-head">
            <div>
              <p className="kicker">{t("봇이 할 수 있는 일", "WHAT BOTS CAN DO")}</p>
              <h2>
                {t(
                  "봇에게 맡길 수 있는 일과",
                  "What you can delegate to bots,",
                )}
                <br />
                <span>
                  {t(
                    "사람이 반드시 결정할 일.",
                    "and what a person must decide.",
                  )}
                </span>
              </h2>
            </div>
            <p>
              {t(
                "로컬 제작 서비스의 실제 권한을 기준으로 표시합니다.",
                "Based on the actual permissions of the local production service.",
              )}
            </p>
          </div>
          <div className="capability-list">
            {capabilities.map((capability, index) => (
              <article key={capability.en}>
                <i>{String(index + 1).padStart(2, "0")}</i>
                <div>
                  <b>{t(capability.ko, capability.en)}</b>
                  <p>{t(capability.detailKo, capability.detailEn)}</p>
                </div>
                <span
                  className={
                    capability.mode === "never"
                      ? "never"
                      : capability.mode === "auto"
                        ? "auto"
                        : "review"
                  }
                >
                  {capability.mode === "auto"
                    ? t("자동 가능", "Automatable")
                    : capability.mode === "review"
                      ? t("사람 승인 필요", "Human approval required")
                      : capability.mode === "triple"
                        ? t("3중 승인 필요", "Three approvals required")
                        : t("절대 금지", "Never allowed")}
                </span>
              </article>
            ))}
          </div>
        </section>
        <section className="bot-layout">
          <article className="bot-card bot-check-card">
            <div className="bot-card-head">
              <span>{t("확인된 봇 활동", "VERIFIED BOT PRESENCE")}</span>
              <em>
                {summary?.activity_rule ??
                  t("로컬 체크인만", "local check-in only")}
              </em>
            </div>
            <h2>{t("실제로 사용하는 봇 목록", "Bots verified as in use")}</h2>
            {bots.length ? (
              <div className="bot-presence-list">
                {bots.map((bot) => (
                  <article key={bot.bot_id}>
                    <div className={`presence-dot ${bot.presence}`} />
                    <div>
                      <b>{bot.display_name}</b>
                      <span>{bot.bot_id}</span>
                      <p>
                        {t("마지막 작업:", "Last action:")}{" "}
                        <strong>{bot.last_action}</strong> ·{" "}
                        {since(bot.seconds_since_checkin, language)}
                      </p>
                      <p>
                        {t("로컬 렌더 정책:", "Local render policy:")}{" "}
                        <strong>
                          {bot.execution_policy?.mode === "auto_local"
                            ? "AUTO LOCAL"
                            : "HUMAN APPROVAL"}
                        </strong>
                      </p>
                      <small>{JSON.stringify(bot.last_detail_json)}</small>
                    </div>
                    <em className={bot.presence}>
                      {bot.presence === "active" ? "ACTIVE" : "IDLE"}
                    </em>
                  </article>
                ))}
              </div>
            ) : (
              <div className="no-bot-state">
                <b>
                  {t("아직 입장한 봇이 없습니다.", "No bot has entered yet.")}
                </b>
                <p>
                  {t(
                    "오류가 아닙니다. Grok bot의 로컬 실행 환경에 위 입장 요청을 넣으면 입장 기록과 첫 체크인이 함께 남고, 실제 활동만 이 목록에 표시됩니다.",
                    "This is not an error. Send the entry request above from a Grok bot on this computer to record entry and the first check-in; only real activity appears here.",
                  )}
                </p>
              </div>
            )}
          </article>
          <article className="bot-card bot-automation-card">
            <div className="bot-card-head">
              <span>{t("자동화 정책", "AUTOMATION POLICY")}</span>
              <em>{t("봇이 선택", "bot selected")}</em>
            </div>
            <h2>{t("봇이 로컬 렌더 허용 방식을 선택합니다", "Bots choose how local rendering is allowed")}</h2>
            <div className="automation-rows">
              <div>
                <b>{t("기본: 자동 로컬", "Default: automatic local")}</b>
                <p>
                  {t("입장한 봇은 계획·검사·프로젝트·운영과 자신의 로컬 렌더를 바로 실행할 수 있습니다.", "Entered bots can immediately use planning, checks, projects, operations, and their own local rendering.")}
                </p>
              </div>
              <div>
                <b>{t("선택: 사람 승인", "Optional: human approval")}</b>
                <p>
                  <code>
                    policy set --bot-id &lt;id&gt; --mode approval_required
                  </code>
                  {t("로 바꾸면 렌더마다 사람 승인을 요청합니다.", " to request a person’s approval for every render.")}
                </p>
              </div>
              <div>
                <b>{t("항상 사람 확인", "Always human-confirmed")}</b>
                <p>
                  {t("비밀값과 작업 공간 밖 파일", "Secrets and files outside the workspace")}
                </p>
              </div>
            </div>
            <p className="automation-note">
              {t("Instagram 업로드는 각 작업의 자동 업로드 설정을 따릅니다. 자동 업로드를 끄면 작업 보드에서 직접 실행할 수 있습니다.", "Instagram upload follows each job's auto-upload setting. When it is off, run the job directly from the job board.")}
            </p>
          </article>
        </section>
        <section className="bot-layout bot-bottom-layout">
          <article className="bot-card bot-contract-card">
            <div className="bot-card-head">
              <span>{t("봇 체크인 계약", "BOT CHECK-IN CONTRACT")}</span>
              <button onClick={() => void copyRequest("heartbeat")}>
                {copied === "heartbeat" ? t("복사됨", "Copied") : t("체크인 요청 복사", "Copy check-in request")}
              </button>
            </div>
            <pre>{botRequest}</pre>
            <p>
              {t("봇은 작업을 시작·완료·대기 상태로 바꿀 때마다 이 체크인을 남깁니다. 보호 토큰을 켠 경우 토큰은 봇의 실행 환경에만 주입하고, 봇이 `.env`를 읽게 하면 안 됩니다.", "Bots record this check-in whenever work starts, completes, or waits. If a protection token is enabled, give it only to the bot runtime; the bot must not read .env.")}
            </p>
          </article>
          <article className="bot-card bot-activity-card">
            <div className="bot-card-head">
              <span>{t("최근 체크인", "RECENT CHECK-INS")}</span>
              <em>
                {activity.length} {t("개 기록", "entries")}
              </em>
            </div>
            {activity.length ? (
              <div className="bot-activity-list">
                {activity.map((item) => (
                  <article key={item.id}>
                    <b>{item.action}</b>
                    <span>{item.bot_id}</span>
                    <p>{dateTime(item.created_at, language)}</p>
                    <small>{JSON.stringify(item.detail_json)}</small>
                  </article>
                ))}
              </div>
            ) : (
              <div className="no-bot-state">
                <b>
                  {t(
                    "표시할 체크인이 없습니다.",
                    "There are no check-ins to show.",
                  )}
                </b>
                <p>
                  {t(
                    "첫 봇이 heartbeat를 보내면 이곳에 시간·작업·세부 내용이 남습니다.",
                    "When the first bot sends a heartbeat, its time, work, and details appear here.",
                  )}
                </p>
              </div>
            )}
          </article>
        </section>
      </main>
    </>
  );
}
