"use client";

import { useCallback, useEffect, useState } from "react";
import { useLanguage } from "./language";
import { SiteHeader } from "./site-header";

type GuideStep = { step: number; name: string; action: string; goal: string };
type SiteFeature = {
  id: string;
  area: string;
  name: string;
  use_when: string;
  bot_action: string;
  result: string;
};
type WorkspacePage = {
  id: string;
  url: string;
  name: string;
  purpose: string;
  bot_use: string;
};
type Guide = {
  schema: string;
  title: string;
  scope: string;
  first_action: string;
  non_negotiables: string[];
  workflow: GuideStep[];
  edit_heuristics: Record<string, string>;
  approval_gates: string[];
  site_features?: SiteFeature[];
  workspace_pages?: WorkspacePage[];
  execution_policy?: {
    on_entry: string;
    modes: Record<string, string>;
    external_boundary: string;
  };
  allowed_endpoints: {
    read: string[];
    write_after_scope_check: string[];
    local_render?: string[];
    write_for_delivery: string[];
  };
  never: string[];
  heartbeat_example: Record<string, unknown>;
};

const studio = "http://127.0.0.1:7214";
const fallbackGuide: Guide = {
  schema: "local-video-workspace.bot-guide/v1",
  title: "Local Video Workspace Editing Playbook",
  scope: "Same workstation only.",
  first_action:
    "Enter Local Studio to record the first heartbeat before preparing work.",
  non_negotiables: [
    "Stay inside the local workspace.",
    "Plan from transcript before adding effects.",
    "Choose the local render policy before output work.",
    "Use the project’s auto-upload setting for Instagram delivery.",
  ],
  workflow: [
    {
      step: 1,
      name: "enter_local_studio",
      action: "POST /api/bot-entry",
      goal: "Record a local entry, first heartbeat, and auto_local default.",
    },
    {
      step: 2,
      name: "read_the_guide",
      action: "GET /api/bot-guide",
      goal: "Load the local rules before planning.",
    },
    {
      step: 3,
      name: "set_edit_method",
      action: "POST /api/edit-method",
      goal: "Set only the permitted local edit controls.",
    },
    {
      step: 4,
      name: "plan_the_cut",
      action: "Create transcript-first EDL",
      goal: "Keep the hook and remove filler.",
    },
    {
      step: 5,
      name: "prepare_finish",
      action: "Set reframe, sound, look, captions, quality, and FPS",
      goal: "Make the smallest useful changes.",
    },
    {
      step: 6,
      name: "choose_execution_policy",
      action: "GET/POST /api/bots/{bot_id}/execution-policy",
      goal: "Keep automatic local rendering or require a person.",
    },
    {
      step: 7,
      name: "render",
      action: "Queue and run the local render",
      goal: "Report the MP4 path or exact failure.",
    },
    {
      step: 8,
      name: "publish_or_queue",
      action: "Queue Instagram, with auto-upload when requested",
      goal: "Deliver immediately or leave the job ready to run.",
    },
  ],
  edit_heuristics: {
    hook: "Lead with the payoff.",
    cutting: "Remove filler and dead space.",
    captions: "Keep captions short and readable.",
    reframe: "Preserve the subject in 9:16.",
  },
  approval_gates: ["Instagram needs local credentials and a supported render file."],
  execution_policy: {
    on_entry: "Every entered bot receives auto_local.",
    modes: {
      auto_local: "Run its local render automatically.",
      approval_required: "Require human approval for each render.",
    },
    external_boundary:
      "Instagram upload can run immediately when auto-upload is enabled, or remain queued for direct execution.",
  },
  allowed_endpoints: {
    read: ["GET /health"],
    write_after_scope_check: ["POST /api/bots/heartbeat"],
    local_render: ["POST /api/projects/{id}/render"],
    write_for_delivery: ["POST /api/projects/{id}/instagram"],
  },
  never: ["Do not read credentials.", "Do not use media outside the local workspace."],
  heartbeat_example: { bot_id: "local-editor-bot", action: "render_started" },
};

export default function BotGuideConsole() {
  const { t, language } = useLanguage();
  const [guide, setGuide] = useState<Guide>(fallbackGuide);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState("");
  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`${studio}/api/bot-guide?lang=${language}`);
      const value = (await response.json()) as Guide & { error?: string };
      if (!response.ok) throw new Error(value.error ?? "guide unavailable");
      setGuide(value);
      setLoaded(true);
      setMessage(
        t(
          "로컬 JSON 가이드와 화면 안내가 같은 기준으로 준비되었습니다.",
          "The local JSON guide and the screen guide now use the same rules.",
        ),
      );
    } catch {
      setLoaded(false);
      setMessage(
        t(
          "로컬 서비스에 연결하지 못해 내장된 읽기 전용 가이드를 표시하고 있습니다.",
          "Local Studio is unavailable, so the built-in read-only guide is shown.",
        ),
      );
    }
  }, [language, t]);
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [refresh]);
  const copy = async (kind: "url" | "heartbeat") => {
    const text =
      kind === "url"
        ? `${studio}/api/bot-guide`
        : JSON.stringify(guide.heartbeat_example, null, 2);
    await navigator.clipboard?.writeText(text);
    setCopied(kind);
    window.setTimeout(() => setCopied(""), 1600);
  };
  const entries = Object.entries(guide.edit_heuristics);

  return (
    <>
      <SiteHeader current="bot-guide" />
      <main className="guide-main">
        <section className="guide-hero">
          <div>
            <p className="kicker">{t("GROK CREW · 편집 설명서", "GROK CREW · EDITOR MANUAL")}</p>
            <h1>
              {t("봇이 들어와도", "A working manual for")}
              <br />
              <span>
                {t("제대로 편집하게 하는", "bots that edit correctly")}
              </span>
              <br />
              {t("작업 설명서.", "from the first step.")}
            </h1>
            <p>
              {t(
                "이 가이드는 봇이 어떤 순서로 판단하고, 언제 멈추며, 무엇을 기록해야 하는지 정의합니다. 모든 규칙은 로컬 제작 서비스의 실제 권한과 맞춰져 있습니다.",
                "This guide defines how a bot should decide, when it must stop, and what it must record. Every rule matches the real permissions of the local production service.",
              )}
            </p>
          </div>
          <aside className="guide-source">
            <span>{t("봇 시작 지점", "BOT ENTRY POINT")}</span>
            <b>GET /api/bot-guide</b>
            <p>
              {t(
                "사람은 이 화면을 읽고, 봇은 같은 내용을 구조화된 JSON으로 읽습니다.",
                "People read this screen; bots read the same guide as structured JSON.",
              )}
            </p>
            <button onClick={() => void copy("url")}>
              {copied === "url"
                ? t("주소 복사됨", "Address copied")
                : t("JSON 안내 주소 복사", "Copy JSON guide URL")}
            </button>
          </aside>
        </section>
        <section className="guide-first">
          <b>{t("첫 번째 작업", "FIRST ACTION")}</b>
          <span>{guide.first_action}</span>
          <em>{loaded ? t("로컬 가이드 불러옴", "Local guide loaded") : t("기본 가이드 표시 중", "Fallback shown")}</em>
        </section>
        <section className="guide-layout guide-start-layout">
          <article className="guide-card">
            <div className="guide-card-head">
              <span>{t("필수 준수 사항", "NON-NEGOTIABLE")}</span>
              <em>{t("작업 전 읽기", "read before work")}</em>
            </div>
            <ol className="guide-rules">
              {guide.non_negotiables.map((rule, index) => (
                <li key={rule}>
                  <i>{String(index + 1).padStart(2, "0")}</i>
                  <span>{rule}</span>
                </li>
              ))}
            </ol>
          </article>
          <article className="guide-card guide-scope-card">
            <div className="guide-card-head">
              <span>{t("작업 범위", "OPERATING SCOPE")}</span>
              <em>{guide.schema}</em>
            </div>
            <h2>
              {t("이 봇은 무엇을 전제로 움직이나", "What this bot operates on")}
            </h2>
            <p>{guide.scope}</p>
            <div>
              <b>{t("편집 전", "Before editing")}</b>
              <span>
                {t(
                  "상태 확인 · 체크인 · 기존 작업 확인",
                  "Check status · check in · inspect existing work",
                )}
              </span>
            </div>
            <div>
              <b>{t("편집 중", "While editing")}</b>
              <span>
                {t(
                  "대본 우선 · 최소 효과 · 읽히는 자막",
                  "Transcript first · minimal effects · readable captions",
                )}
              </span>
            </div>
            <div>
              <b>{t("로컬 렌더", "Local render")}</b>
              <span>
                {guide.execution_policy?.on_entry ??
                  t(
                    "봇 정책에 따라 자동 또는 사람 승인",
                    "Automatic or human-approved by bot policy",
                  )}
              </span>
            </div>
            <div>
              <b>{t("외부 게시", "External publishing")}</b>
              <span>
                {guide.execution_policy?.external_boundary ??
                  t(
                    "프로젝트별 자동 업로드 또는 대기열 실행",
                    "Project auto-upload or direct queue execution",
                  )}
              </span>
            </div>
          </article>
        </section>
        <section className="guide-workflow">
          <div className="guide-section-head">
            <div>
              <p className="kicker">{t("편집 작업 흐름", "EDITING WORKFLOW")}</p>
              <h2>
                {t("봇이 따라야 할", "The bot workflow in")}{" "}
                <span>
                  {t(
                    `${guide.workflow.length}단계 편집 흐름.`,
                    `${guide.workflow.length} steps.`,
                  )}
                </span>
              </h2>
            </div>
            <p>
              {t(
                "중간에 실패하면 임의로 다음 단계로 넘어가지 말고 체크인에 실패 원인을 남깁니다.",
                "If a step fails, record the cause in a check-in instead of moving on arbitrarily.",
              )}
            </p>
          </div>
          <div className="guide-steps">
            {guide.workflow.map((item) => (
              <article key={item.step}>
                <i>{String(item.step).padStart(2, "0")}</i>
                <div>
                  <b>{item.name.replaceAll("_", " ")}</b>
                  <span>{item.action}</span>
                  <p>{item.goal}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
        {guide.site_features && guide.site_features.length > 0 && (
          <section className="guide-capabilities">
            <div className="guide-section-head">
              <div>
                <p className="kicker">{t("사이트 기능 설명서", "SITE FUNCTION MANUAL")}</p>
                <h2>
                  {t("봇이 사용할 수 있는", "What a bot can use in the")} {" "}
                  <span>{t("모든 작업 도구.", "local workspace.")}</span>
                </h2>
              </div>
              <p>
                {t(
                  "각 카드는 언제 사용하고, 무엇을 기록하며, 어떤 결과를 확인해야 하는지 알려 줍니다.",
                  "Each card states when to use the feature, what the bot records, and what result to check.",
                )}
              </p>
            </div>
            <div className="guide-feature-grid">
              {guide.site_features.map((feature) => (
                <article key={feature.id}>
                  <div>
                    <i>{feature.id}</i>
                    <span>{feature.area}</span>
                  </div>
                  <h3>{feature.name}</h3>
                  <dl>
                    <div><dt>{t("사용 시점", "Use when")}</dt><dd>{feature.use_when}</dd></div>
                    <div><dt>{t("봇 작업", "Bot action")}</dt><dd>{feature.bot_action}</dd></div>
                    <div><dt>{t("확인 결과", "Check")}</dt><dd>{feature.result}</dd></div>
                  </dl>
                </article>
              ))}
            </div>
          </section>
        )}
        {guide.workspace_pages && guide.workspace_pages.length > 0 && (
          <section className="guide-pages">
            <div className="guide-section-head">
              <div>
                <p className="kicker">{t("전체 사이트 지도", "FULL WORKSPACE MAP")}</p>
                <h2>
                  {t("모든 화면의", "Every page, with its")} {" "}
                  <span>{t("봇 사용 목적.", "bot purpose.")}</span>
                </h2>
              </div>
              <p>
                {t(
                  "터미널 봇은 site --page 이름으로 정확한 로컬 주소를 출력할 수 있습니다.",
                  "A terminal bot can print the matching local URL with site --page name.",
                )}
              </p>
            </div>
            <div className="guide-page-grid">
              {guide.workspace_pages.map((page) => (
                <article key={page.id}>
                  <div><i>{page.id}</i><code>{page.url}</code></div>
                  <h3>{page.name}</h3>
                  <p>{page.purpose}</p>
                  <small><b>{t("봇 사용", "Bot use")}</b>{page.bot_use}</small>
                </article>
              ))}
            </div>
          </section>
        )}
        <section className="guide-layout">
          <article className="guide-card heuristic-card">
            <div className="guide-card-head">
              <span>{t("편집 판단 기준", "EDIT DECISION RULES")}</span>
              <em>{t("효과보다 품질", "quality before effects")}</em>
            </div>
            <div className="heuristic-grid">
              {entries.map(([name, rule]) => (
                <article key={name}>
                  <b>{name}</b>
                  <p>{rule}</p>
                </article>
              ))}
            </div>
          </article>
          <article className="guide-card approvals-card">
            <div className="guide-card-head">
              <span>{t("승인 조건", "APPROVAL GATES")}</span>
              <em>{t("중단 조건", "stop conditions")}</em>
            </div>
            {guide.approval_gates.map((gate, index) => (
              <div key={gate}>
                <i>{index + 1}</i>
                <p>{gate}</p>
              </div>
            ))}
          </article>
        </section>
        <section className="guide-layout guide-endpoint-layout">
          <article className="guide-card endpoint-guide">
            <div className="guide-card-head">
              <span>{t("로컬 엔드포인트 목록", "LOCAL ENDPOINT MAP")}</span>
              <em>{t("클라우드 의존 없음", "no cloud dependency")}</em>
            </div>
            <div>
              <b>{t("읽기 가능", "Read")}</b>
              <p>{guide.allowed_endpoints.read.join(" · ")}</p>
            </div>
            <div>
              <b>{t("범위 확인 후 작성", "Write after scope check")}</b>
              <p>
                {guide.allowed_endpoints.write_after_scope_check.join(" · ")}
              </p>
            </div>
            {guide.allowed_endpoints.local_render && (
              <div>
                <b>
                  {t("봇 정책에 따른 로컬 렌더", "Local render by bot policy")}
                </b>
                <p>{guide.allowed_endpoints.local_render.join(" · ")}</p>
              </div>
            )}
            <div>
              <b>{t("렌더·업로드 작업", "Render and upload")}</b>
              <p>
                {guide.allowed_endpoints.write_for_delivery.join(" · ")}
              </p>
            </div>
          </article>
          <article className="guide-card heartbeat-guide">
            <div className="guide-card-head">
              <span>{t("체크인 예시", "CHECK-IN EXAMPLE")}</span>
              <button onClick={() => void copy("heartbeat")}>
                {copied === "heartbeat"
                  ? t("복사됨", "Copied")
                  : t("JSON 복사", "Copy JSON")}
              </button>
            </div>
            <pre>{JSON.stringify(guide.heartbeat_example, null, 2)}</pre>
            <p>
              {t(
                "봇은 시작, 계획 완료, 승인 대기, 렌더 완료, 실패 시점에 체크인을 남깁니다. Bot Check에서 이 기록으로 실제 사용 여부를 확인합니다.",
                "Bots check in when they start, finish planning, wait for approval, finish rendering, or fail. Bot Check uses this record to verify real use.",
              )}
            </p>
          </article>
        </section>
        <section className="guide-never">
          <div>
            <p className="kicker">{t("절대 중단", "HARD STOP")}</p>
            <h2>
              {t("봇이 절대 하면 안 되는 일.", "What a bot must never do.")}
            </h2>
          </div>
          <div>
            {guide.never.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </section>
        <p className="guide-message">{message}</p>
      </main>
    </>
  );
}
