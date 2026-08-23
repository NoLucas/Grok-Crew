"use client";

import { useCallback, useEffect, useState } from "react";
import { useLanguage } from "./language";
import { SiteHeader } from "./site-header";

type TimelineClip = {
  in: number;
  out: number;
  keep: boolean;
  caption: string;
  speaker?: string;
};
type RenderSettings = {
  fps: 24 | 30 | 60;
  quality: "compact" | "balanced" | "high";
  crop_anchor: "left" | "center" | "right";
  speed: number;
  volume: number;
  normalize_audio: boolean;
  mute_audio: boolean;
  fade_in: number;
  fade_out: number;
  look: "natural" | "punchy" | "mono" | "night";
  brightness: number;
  contrast: number;
  gamma: number;
  mirror: boolean;
  captions_enabled: boolean;
  caption_color: string;
  caption_size: number;
  caption_y: number;
  caption_stroke: number;
};
type StudioProject = {
  id: string;
  title: string;
  source_path: string;
  output_path: string;
  caption: string;
  timeline_json: { clips: TimelineClip[] };
  created_at: string;
};
type StudioJob = {
  id: string;
  project_id: string;
  kind: "render" | "instagram_publish";
  status: string;
  approved: number;
  error_text?: string | null;
  created_at: string;
  result_json?: Record<string, unknown> | null;
};
type StudioHealth = {
  status: string;
  bind: string;
  workspace: string;
  database: string;
  moviepy_installed: boolean;
  instagram_publish_enabled: boolean;
  credentials_configured: boolean;
};
type BotEditMethod = {
  method: {
    hook_strategy: "payoff_first" | "question_first" | "chronological";
    pacing: "tight" | "balanced" | "deliberate";
    filler_policy: "remove" | "review" | "keep";
    caption_mode: "burn_in" | "off";
    reframe_anchor: "left" | "center" | "right";
    look: RenderSettings["look"];
    audio_policy: "preserve" | "normalize" | "mute";
    speed: number;
    fps: RenderSettings["fps"];
    quality: RenderSettings["quality"];
  };
  updated_by: string;
  updated_at: string | null;
  is_default: boolean;
};

const studio = "http://127.0.0.1:7214";
const fallbackTimeline: TimelineClip[] = [
  { in: 1.8, out: 3.65, keep: true, caption: "SIX LINES", speaker: "S0" },
  { in: 4.1, out: 6.2, keep: true, caption: "ONE RULE", speaker: "S0" },
  { in: 6.45, out: 9.8, keep: true, caption: "NO GREETING", speaker: "S0" },
];
const defaultRenderSettings: RenderSettings = {
  fps: 30,
  quality: "balanced",
  crop_anchor: "center",
  speed: 1,
  volume: 100,
  normalize_audio: false,
  mute_audio: false,
  fade_in: 0.08,
  fade_out: 0.08,
  look: "natural",
  brightness: 0,
  contrast: 0,
  gamma: 1,
  mirror: false,
  captions_enabled: true,
  caption_color: "#FFFFFF",
  caption_size: 78,
  caption_y: 74,
  caption_stroke: 3,
};

function cutLogTimeline(): TimelineClip[] {
  try {
    const saved = JSON.parse(
      window.localStorage.getItem("localVideoCutLog") ?? "{}",
    ) as {
      clips?: {
        start: number;
        end: number;
        keep: boolean;
        text: string;
        speaker?: string;
      }[];
    };
    const clips = (saved.clips ?? [])
      .filter((clip) => clip.keep && clip.end > clip.start)
      .map((clip) => ({
        in: clip.start,
        out: clip.end,
        keep: true,
        caption: (clip.text.match(/[A-Za-z0-9']+/g) ?? ["VIDEO"])
          .slice(0, 2)
          .join(" ")
          .toUpperCase(),
        speaker: clip.speaker,
      }));
    return clips.length ? clips : fallbackTimeline;
  } catch {
    return fallbackTimeline;
  }
}

function stamp(value: string, language: "ko" | "en") {
  return value
    ? new Date(value).toLocaleString(language === "ko" ? "ko-KR" : "en-US", {
        hour: "2-digit",
        minute: "2-digit",
        month: "short",
        day: "numeric",
      })
    : "—";
}

export default function ProductionConsole() {
  const { t, language } = useLanguage();
  const [health, setHealth] = useState<StudioHealth | null>(null);
  const [projects, setProjects] = useState<StudioProject[]>([]);
  const [jobs, setJobs] = useState<StudioJob[]>([]);
  const [botEditMethod, setBotEditMethod] = useState<BotEditMethod | null>(
    null,
  );
  const [title, setTitle] = useState("Untitled video project");
  const [sourcePath, setSourcePath] = useState("inputs/source.mp4");
  const [outputPath, setOutputPath] = useState("outputs/final-video.mp4");
  const [caption, setCaption] = useState(
    "One ask. Six lines. No greeting essay.\n\n#aiatwork #prompts",
  );
  const [selected, setSelected] = useState("");
  const [token, setToken] = useState("");
  const [approved, setApproved] = useState(false);
  const [shareToFeed, setShareToFeed] = useState(true);
  const [publishConfirm, setPublishConfirm] = useState("");
  const [renderSettings, setRenderSettings] = useState<RenderSettings>(
    defaultRenderSettings,
  );
  const [finishLoaded, setFinishLoaded] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const patchSettings = <K extends keyof RenderSettings>(
    key: K,
    value: RenderSettings[K],
  ) => setRenderSettings((current) => ({ ...current, [key]: value }));

  const api = useCallback(
    async (path: string, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (init?.body) headers.set("Content-Type", "application/json");
      if (token) headers.set("Authorization", `Bearer ${token}`);
      const response = await fetch(`${studio}${path}`, { ...init, headers });
      const data = (await response.json()) as Record<string, unknown>;
      if (!response.ok)
        throw new Error(
          String(data.error ?? `Local Studio error ${response.status}`),
        );
      return data;
    },
    [token],
  );
  const refresh = useCallback(
    async (quiet = false) => {
      try {
        const [nextHealth, nextProjects, nextJobs, nextMethod] =
          await Promise.all([
            api("/health"),
            api("/api/projects"),
            api("/api/jobs"),
            api("/api/edit-method"),
          ]);
        setHealth(nextHealth as unknown as StudioHealth);
        setProjects((nextProjects.projects ?? []) as StudioProject[]);
        setJobs((nextJobs.jobs ?? []) as StudioJob[]);
        setBotEditMethod(nextMethod as unknown as BotEditMethod);
        if (!quiet)
          setMessage(
            t("로컬 제작 서비스가 연결되었습니다. 모든 작업 데이터는 이 PC의 SQLite에 저장됩니다.", "Local Studio is connected. All work data is stored in SQLite on this computer."),
          );
      } catch (error) {
        setHealth(null);
        if (!quiet)
          setMessage(
            error instanceof Error
              ? `${error.message} — ${t("local_studio를 먼저 실행하세요.", "Start local_studio first.")}`
              : t("Local Studio에 연결할 수 없습니다.", "Cannot connect to Local Studio."),
          );
      }
    },
    [api, t],
  );
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [refresh]);
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem("localVideoFinishRack");
        if (saved)
          setRenderSettings({
            ...defaultRenderSettings,
            ...(JSON.parse(saved) as Partial<RenderSettings>),
          });
      } catch {
        /* Use the local default if a previous draft cannot be read. */
      } finally {
        setFinishLoaded(true);
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);
  useEffect(() => {
    if (finishLoaded)
      window.localStorage.setItem(
        "localVideoFinishRack",
        JSON.stringify(renderSettings),
      );
  }, [renderSettings, finishLoaded]);

  const applyBotEditMethod = () => {
    if (!botEditMethod) {
      setMessage(t("먼저 Local Studio의 봇 편집 방법을 불러오세요.", "Load the bot edit method from Local Studio first."));
      return;
    }
    const method = botEditMethod.method;
    setRenderSettings((current) => ({
      ...current,
      crop_anchor: method.reframe_anchor,
      speed: method.speed,
      look: method.look,
      fps: method.fps,
      quality: method.quality,
      captions_enabled: method.caption_mode === "burn_in",
      normalize_audio: method.audio_policy === "normalize",
      mute_audio: method.audio_policy === "mute",
    }));
    setMessage(
      t(`${botEditMethod.updated_by}의 편집 방법을 Finish Rack에 적용했습니다. 렌더와 게시에는 여전히 사람 승인이 필요합니다.`, `Applied ${botEditMethod.updated_by}'s edit method to the Finish Rack. Rendering and publishing still need human approval.`),
    );
  };

  const createProject = async () => {
    setBusy(true);
    try {
      const response = await api("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          title,
          source_path: sourcePath,
          output_path: outputPath,
          caption,
          timeline: {
            schema: "local-video-workspace.edl/v1",
            clips: cutLogTimeline(),
            render_settings: renderSettings,
            bot_edit_method: botEditMethod?.method ?? null,
            bot_edit_method_by: botEditMethod?.updated_by ?? null,
            bot_edit_method_at: botEditMethod?.updated_at ?? null,
          },
        }),
      });
      const project = response.project as StudioProject;
      setSelected(project.id);
      setApproved(false);
      setMessage(
        t("프로젝트와 Cut Log EDL을 로컬 SQLite에 저장했습니다. 이제 렌더 승인을 기록할 수 있습니다.", "The project and Cut Log EDL were saved to local SQLite. You can now record render approval."),
      );
      await refresh(true);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : t("프로젝트를 만들지 못했습니다.", "Could not create the project."),
      );
    } finally {
      setBusy(false);
    }
  };
  const queueRender = async () => {
    if (!selected) {
      setMessage(t("먼저 로컬 프로젝트를 만드세요.", "Create a local project first."));
      return;
    }
    if (!approved) {
      setMessage(t("렌더 전에 사람 승인을 체크하세요.", "Record human approval before rendering."));
      return;
    }
    setBusy(true);
    try {
      await api(`/api/projects/${selected}/render`, {
        method: "POST",
        body: JSON.stringify({ approved: true, requested_by: "Local browser" }),
      });
      setMessage(
        t("렌더 작업을 대기열에 넣었습니다. 아래에서 “승인된 작업 실행”을 누르면 이 PC에서 MoviePy가 렌더합니다.", "The render job is queued. Choose Run approved job below to render with MoviePy on this computer."),
      );
      await refresh(true);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : t("렌더 작업을 만들지 못했습니다.", "Could not create the render job."),
      );
    } finally {
      setBusy(false);
    }
  };
  const queueInstagram = async () => {
    if (!selected || !approved) {
      setMessage(t("프로젝트와 사람 승인이 모두 필요합니다.", "A project and human approval are both required."));
      return;
    }
    setBusy(true);
    try {
      await api(`/api/projects/${selected}/instagram`, {
        method: "POST",
        body: JSON.stringify({
          approved: true,
          render_path: outputPath,
          caption,
          share_to_feed,
          requested_by: "Local browser",
        }),
      });
      setMessage(
        t("Instagram 게시 작업은 대기열에만 넣었습니다. 실제 전송은 별도 실행 승인과 PUBLISH 확인이 있어야 합니다.", "The Instagram publish job is only queued. Sending still needs separate execution approval and PUBLISH confirmation."),
      );
      await refresh(true);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : t("게시 작업을 만들지 못했습니다.", "Could not create the publish job."),
      );
    } finally {
      setBusy(false);
    }
  };
  const runJob = async (job: StudioJob) => {
    if (job.kind === "instagram_publish" && publishConfirm !== "PUBLISH") {
      setMessage(
        t("게시 작업은 아래 입력칸에 PUBLISH를 정확히 입력해야 실행됩니다.", "Type PUBLISH exactly in the field below before running a publish job."),
      );
      return;
    }
    setBusy(true);
    try {
      const response = await api(`/api/jobs/${job.id}/run`, {
        method: "POST",
        body: JSON.stringify(
          job.kind === "instagram_publish" ? { confirmation: "PUBLISH" } : {},
        ),
      });
      const final = response.job as StudioJob;
      setMessage(
        final.status === "succeeded"
          ? t(`${job.kind === "render" ? "로컬 MP4 렌더" : "Instagram 게시"}가 완료되었습니다.`, `${job.kind === "render" ? "Local MP4 render" : "Instagram publishing"} completed.`)
          : t(`작업 결과: ${final.status}${final.error_text ? ` — ${final.error_text}` : ""}`, `Job result: ${final.status}${final.error_text ? ` — ${final.error_text}` : ""}`),
      );
      await refresh(true);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : t("작업을 실행하지 못했습니다.", "Could not run the job."),
      );
    } finally {
      setBusy(false);
    }
  };
  const selectedProject = projects.find((project) => project.id === selected);
  const selectedJobs = jobs.filter((job) => job.project_id === selected);
  const contract = JSON.stringify(
    {
      scope: "127.0.0.1 only",
      actor: "Grok bot",
      on_entry:
        "all local editing features enabled; local render defaults to auto_local",
      bot_choice: ["auto_local render", "approval_required render"],
      always_human: [
        "Instagram queue approval",
        "Instagram publish switch",
        "PUBLISH confirmation",
      ],
      never: ["read Meta credentials", "access outside workspace"],
    },
    null,
    2,
  );

  return (
    <>
      <SiteHeader current="production" />
      <main className="production-main">
        <section className="production-hero">
          <div>
            <p className="kicker">{t("로컬 제작 노드", "LOCAL PRODUCTION NODE")}</p>
            <h1>
              {t("컷 로그부터", "From cut log to")}
              <br />
              <span>
                {t(
                  "실제 MP4와 게시 대기열까지.",
                  "a real MP4 and publish queue.",
                )}
              </span>
            </h1>
            <p>
              {t(
                "Grok bot은 편집 계획과 대기열을 만들 수 있습니다. 파일·SQLite·자격증명은 모두 이 PC에 남고, Instagram에는 사람이 승인한 게시만 전송됩니다.",
                "Grok bots can plan edits and prepare queues. Files, SQLite, and credentials stay on this PC; only a human-approved Instagram post can be sent.",
              )}
            </p>
          </div>
          <aside className={`production-health ${health ? "ready" : ""}`}>
            <span>{t("로컬 스튜디오", "LOCAL STUDIO")}</span>
            <b>{health ? t("연결됨", "CONNECTED") : t("오프라인", "OFFLINE")}</b>
            <p>
              {health
                ? `SQLite · ${health.moviepy_installed ? t("MoviePy 준비됨", "MoviePy ready") : t("MoviePy 설치 필요", "MoviePy install needed")} · ${t("게시 스위치", "publish switch")} ${health.instagram_publish_enabled ? t("켜짐", "on") : t("꺼짐", "off")}`
                : t(
                    "local_studio/studio_server.py를 실행하면 연결됩니다.",
                    "Start local_studio/studio_server.py to connect.",
                  )}
            </p>
            <button onClick={() => void refresh()} disabled={busy}>
              {t("연결 다시 확인", "Check connection")}
            </button>
          </aside>
        </section>
        <div className="production-note">
          <b>{t("로컬 우선", "LOCAL FIRST")}</b>
          <span>
            {t("소스는", "Sources are in")} <code>local_studio/workspace/inputs</code>, {t("결과물은", "and output is in")} <code>workspace/outputs</code>{t("입니다. 프로젝트·작업 이력은 SQLite에 저장됩니다. 입장한 봇은 모든 로컬 기능을 사용할 수 있고, 로컬 렌더는 기본 자동 실행 또는 사람 승인 모드를 봇별로 선택합니다.", ". Project and job history is stored in SQLite. Entered bots can use every local function and choose automatic or human-approved local rendering.")}
          </span>
        </div>
        <section className="bot-method-panel">
          <div>
            <p className="kicker">{t("봇 편집 방식", "BOT EDIT METHOD")}</p>
            <h2>
              {t("Grok bot이 정한", "The edit method chosen by the")} <span>{t("편집 방식", "Grok bot")}</span>
            </h2>
            <p>
              {t("봇은 훅 순서, 템포, 군더더기 처리, 자막, 리프레임, 룩, 오디오, 속도, FPS, 품질을 로컬 API에 설정할 수 있습니다. 아래 버튼을 누르면 실제 Finish Rack과 새 프로젝트 EDL에 반영됩니다.", "Bots can set hook order, pacing, filler handling, captions, reframing, look, audio, speed, FPS, and quality through the local API. The button below applies the choice to the real Finish Rack and new project EDLs.")}
            </p>
          </div>
          <aside>
            {botEditMethod ? (
              <>
                <span>
                  {botEditMethod.is_default
                    ? t("기본 편집 방식", "DEFAULT METHOD")
                    : t(`${botEditMethod.updated_by}가 설정`, `SET BY ${botEditMethod.updated_by}`)}
                </span>
                <b>
                  {botEditMethod.method.hook_strategy.replaceAll("_", " ")} ·{" "}
                  {t(`${botEditMethod.method.pacing} 템포`, `${botEditMethod.method.pacing} pace`)}
                </b>
                <div className="bot-method-tags">
                  <em>{t(`${botEditMethod.method.filler_policy} 군더더기`, `${botEditMethod.method.filler_policy} filler`)}</em>
                  <em>{botEditMethod.method.caption_mode}</em>
                  <em>{t(`${botEditMethod.method.reframe_anchor} 프레임`, `${botEditMethod.method.reframe_anchor} frame`)}</em>
                  <em>{botEditMethod.method.look}</em>
                  <em>{t(`${botEditMethod.method.audio_policy} 오디오`, `${botEditMethod.method.audio_policy} audio`)}</em>
                  <em>
                    {botEditMethod.method.speed.toFixed(2)}× ·{" "}
                    {botEditMethod.method.fps}fps ·{" "}
                    {botEditMethod.method.quality}
                  </em>
                </div>
                <small>
                  {botEditMethod.updated_at
                    ? `${botEditMethod.updated_by} · ${stamp(botEditMethod.updated_at, language)}`
                    : t("아직 봇이 별도 편집 방법을 설정하지 않았습니다.", "No bot-specific edit method has been set yet.")}
                </small>
                <button onClick={applyBotEditMethod} disabled={busy}>
                  {t("봇 편집 방식 적용", "Apply bot edit method")}
                </button>
              </>
            ) : (
              <>
                <span>{t("로컬 스튜디오 오프라인", "LOCAL STUDIO OFFLINE")}</span>
                <b>{t("편집 방식을 불러오는 중입니다.", "Loading the edit method.")}</b>
                <p>
                  {t("Local Studio를 실행하면 봇이 설정한 방식을 이곳에서 확인할 수 있습니다.", "Start Local Studio to review the method set by a bot here.")}
                </p>
              </>
            )}
          </aside>
        </section>
        <section className="production-grid production-setup-grid">
          <article className="production-card blueprint-card">
            <div className="production-card-head">
              <span>{t("01 · 프로젝트 설계", "01 · PROJECT BLUEPRINT")}</span>
              <em>{t("Cut Log EDL 자동 사용", "Uses Cut Log EDL automatically")}</em>
            </div>
            <label>
              {t("프로젝트 이름", "Project name")}
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <div className="path-grid">
              <label>
                {t("원본 파일 (작업 공간 내부)", "Source file (inside workspace)")}
                <input
                  value={sourcePath}
                  onChange={(event) => setSourcePath(event.target.value)}
                  placeholder="inputs/source.mp4"
                />
              </label>
              <label>
                {t("MP4 결과 위치", "MP4 output location")}
                <input
                  value={outputPath}
                  onChange={(event) => setOutputPath(event.target.value)}
                  placeholder="outputs/final-video.mp4"
                />
              </label>
            </div>
            <label>
              {t("Instagram 캡션", "Instagram caption")}
              <textarea
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                maxLength={2200}
              />
            </label>
            <p>
              {t("Cut Log에서 저장한 남길 구간·자막을 읽어 EDL로 넣습니다. 아직 없으면 기본 3개 컷을 사용합니다.", "Uses kept segments and captions saved in Cut Log to create the EDL. If there is none, it uses three starter cuts.")}
            </p>
            <button
              className="production-primary"
              onClick={() => void createProject()}
              disabled={busy}
            >
              {t("로컬 프로젝트 만들기", "Create local project")}
            </button>
          </article>
          <article className="production-card local-status-card">
            <div className="production-card-head">
              <span>{t("로컬 서비스 상태", "LOCAL SERVICE STATUS")}</span>
              <em>{health?.status ?? t("연결 안 됨", "not connected")}</em>
            </div>
            <dl>
              <div>
                <dt>{t("바인딩", "Binding")}</dt>
                <dd>
                  {health?.bind ?? "—"} <small>{t("외부 공개 없음", "not exposed externally")}</small>
                </dd>
              </div>
              <div>
                <dt>{t("데이터베이스", "Database")}</dt>
                <dd>{health ? t("SQLite · 이 기기 전용", "SQLite · local only") : "—"}</dd>
              </div>
              <div>
                <dt>{t("MoviePy 렌더", "MoviePy render")}</dt>
                <dd className={health?.moviepy_installed ? "good" : ""}>
                  {health?.moviepy_installed ? t("준비됨", "Ready") : t("설치 필요", "Install needed")}
                </dd>
              </div>
              <div>
                <dt>{t("Instagram 자격증명", "Instagram credentials")}</dt>
                <dd className={health?.credentials_configured ? "good" : ""}>
                  {health?.credentials_configured
                    ? t("로컬 .env에서 확인됨", "Found in local .env")
                    : t("아직 설정 안 됨", "Not configured")}
                </dd>
              </div>
            </dl>
            <label className="token-field">
              {t("로컬 보호 토큰", "Local protection token")} {" "}
              <input
                type="password"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder={t("필요한 경우 이 브라우저 탭에서만 입력", "Enter only in this browser tab if needed")}
              />
            </label>
            <p>{t("토큰은 이 화면이나 SQLite에 저장되지 않습니다.", "Tokens are never saved in this screen or SQLite.")}</p>
          </article>
        </section>
        <section className="finish-rack">
          <div className="finish-rack-head">
            <div>
              <p className="kicker">{t("04 · 마무리 설정", "04 · FINISH RACK")}</p>
              <h2>
                {t("보이는 편집값을", "Apply visible edit values to the")} <span>{t("실제 로컬 렌더", "real local render")}</span>{t("에도 적용.", ".")}
              </h2>
            </div>
            <p>
              {t("이 설정은 다음에 만드는 프로젝트의 EDL 안에 저장됩니다. 미리보기용 버튼이 아니라 MoviePy 렌더에서 직접 사용됩니다.", "These settings are saved in the EDL for the next project and used directly by MoviePy rendering, not just for preview.")}
            </p>
          </div>
          <div className="finish-grid">
            <article>
              <span>{t("세로 리프레임", "VERTICAL REFRAME")}</span>
              <h3>{t("9:16 프레이밍", "9:16 framing")}</h3>
              <label>
                {t("피사체 기준 위치", "Subject anchor")}
                <select
                  value={renderSettings.crop_anchor}
                  onChange={(event) =>
                    patchSettings(
                      "crop_anchor",
                      event.target.value as RenderSettings["crop_anchor"],
                    )
                  }
                >
                  <option value="left">{t("왼쪽 우선", "Left")}</option>
                  <option value="center">{t("가운데", "Center")}</option>
                  <option value="right">{t("오른쪽 우선", "Right")}</option>
                </select>
              </label>
              <label className="finish-toggle">
                <input
                  type="checkbox"
                  checked={renderSettings.mirror}
                  onChange={(event) =>
                    patchSettings("mirror", event.target.checked)
                  }
                />{" "}
                {t("좌우 반전", "Mirror horizontally")}
              </label>
              <p>
                {t("가로 영상을 세로 1080×1920으로 채울 때 어느 쪽을 유지할지 정합니다.", "Choose which side to preserve when filling a vertical 1080×1920 frame from horizontal footage.")}
              </p>
            </article>
            <article>
              <span>{t("움직임 + 오디오", "MOTION + AUDIO")}</span>
              <h3>{t("속도와 음량", "Speed and volume")}</h3>
              <label>
                {t("전체 속도", "Overall speed")} <output>{renderSettings.speed.toFixed(2)}×</output>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.05"
                  value={renderSettings.speed}
                  onChange={(event) =>
                    patchSettings("speed", Number(event.target.value))
                  }
                />
              </label>
              <label>
                {t("원본 음량", "Source volume")} {" "}
                <output>
                  {renderSettings.mute_audio
                    ? t("음소거", "mute")
                    : `${renderSettings.volume}%`}
                </output>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={renderSettings.volume}
                  disabled={renderSettings.mute_audio}
                  onChange={(event) =>
                    patchSettings("volume", Number(event.target.value))
                  }
                />
              </label>
              <div className="finish-pair">
                <label>
                  {t("시작 페이드", "Fade in")}
                  <input
                    type="number"
                    min="0"
                    max="2"
                    step=".02"
                    value={renderSettings.fade_in}
                    onChange={(event) =>
                      patchSettings("fade_in", Number(event.target.value))
                    }
                  />
                </label>
                <label>
                  {t("끝 페이드", "Fade out")}
                  <input
                    type="number"
                    min="0"
                    max="2"
                    step=".02"
                    value={renderSettings.fade_out}
                    onChange={(event) =>
                      patchSettings("fade_out", Number(event.target.value))
                    }
                  />
                </label>
              </div>
              <label className="finish-toggle">
                <input
                  type="checkbox"
                  checked={renderSettings.normalize_audio}
                  onChange={(event) =>
                    patchSettings("normalize_audio", event.target.checked)
                  }
                />{" "}
                {t("음량 정규화", "Normalize volume")}
              </label>
              <label className="finish-toggle">
                <input
                  type="checkbox"
                  checked={renderSettings.mute_audio}
                  onChange={(event) =>
                    patchSettings("mute_audio", event.target.checked)
                  }
                />{" "}
                {t("원본 오디오 제거", "Mute source audio")}
              </label>
            </article>
            <article>
              <span>{t("색상 + 룩", "COLOR + LOOK")}</span>
              <h3>{t("색감 보정", "Color correction")}</h3>
              <label>
                {t("룩 프리셋", "Look preset")}
                <select
                  value={renderSettings.look}
                  onChange={(event) =>
                    patchSettings(
                      "look",
                      event.target.value as RenderSettings["look"],
                    )
                  }
                >
                  <option value="natural">{t("자연스러움", "Natural")}</option>
                  <option value="punchy">{t("강한 대비", "Punchy contrast")}</option>
                  <option value="mono">{t("흑백", "Black & white")}</option>
                  <option value="night">{t("야간 보정", "Night lift")}</option>
                </select>
              </label>
              <div className="finish-pair">
                <label>
                  {t("밝기", "Brightness")} {" "}
                  <output>
                    {renderSettings.brightness > 0 ? "+" : ""}
                    {renderSettings.brightness}
                  </output>
                  <input
                    type="range"
                    min="-40"
                    max="40"
                    value={renderSettings.brightness}
                    onChange={(event) =>
                      patchSettings("brightness", Number(event.target.value))
                    }
                  />
                </label>
                <label>
                  {t("대비", "Contrast")} {" "}
                  <output>
                    {renderSettings.contrast > 0 ? "+" : ""}
                    {renderSettings.contrast}
                  </output>
                  <input
                    type="range"
                    min="-40"
                    max="55"
                    value={renderSettings.contrast}
                    onChange={(event) =>
                      patchSettings("contrast", Number(event.target.value))
                    }
                  />
                </label>
              </div>
              <label>
                {t("감마", "Gamma")} <output>{renderSettings.gamma.toFixed(2)}</output>
                <input
                  type="range"
                  min="0.65"
                  max="1.55"
                  step=".05"
                  value={renderSettings.gamma}
                  onChange={(event) =>
                    patchSettings("gamma", Number(event.target.value))
                  }
                />
              </label>
            </article>
            <article>
              <span>{t("자막 + 전달", "CAPTION + DELIVERY")}</span>
              <h3>{t("읽히는 최종본", "A readable final")}</h3>
              <label className="finish-toggle">
                <input
                  type="checkbox"
                  checked={renderSettings.captions_enabled}
                  onChange={(event) =>
                    patchSettings("captions_enabled", event.target.checked)
                  }
                />{" "}
                {t("선택 구간 자막 번인", "Burn captions into kept clips")}
              </label>
              <div className="finish-pair">
                <label>
                  {t("자막 색상", "Caption color")}
                  <input
                    type="color"
                    value={renderSettings.caption_color}
                    onChange={(event) =>
                      patchSettings("caption_color", event.target.value)
                    }
                  />
                </label>
                <label>
                  {t("테두리", "Outline")} <output>{renderSettings.caption_stroke}px</output>
                  <input
                    type="range"
                    min="0"
                    max="8"
                    value={renderSettings.caption_stroke}
                    onChange={(event) =>
                      patchSettings(
                        "caption_stroke",
                        Number(event.target.value),
                      )
                    }
                  />
                </label>
              </div>
              <label>
                {t("자막 크기", "Caption size")} <output>{renderSettings.caption_size}px</output>
                <input
                  type="range"
                  min="38"
                  max="110"
                  value={renderSettings.caption_size}
                  onChange={(event) =>
                    patchSettings("caption_size", Number(event.target.value))
                  }
                />
              </label>
              <label>
                {t("자막 세로 위치", "Caption vertical position")} <output>{renderSettings.caption_y}%</output>
                <input
                  type="range"
                  min="48"
                  max="84"
                  value={renderSettings.caption_y}
                  onChange={(event) =>
                    patchSettings("caption_y", Number(event.target.value))
                  }
                />
              </label>
              <label>
                {t("출력 품질", "Output quality")}
                <select
                  value={renderSettings.quality}
                  onChange={(event) =>
                    patchSettings(
                      "quality",
                      event.target.value as RenderSettings["quality"],
                    )
                  }
                >
                  <option value="compact">{t("간단 · 빠른 검토", "Compact · quick review")}</option>
                  <option value="balanced">{t("균형 · 일반 게시", "Balanced · normal publishing")}</option>
                  <option value="high">{t("고품질 · 보관/게시", "High · archive/publish")}</option>
                </select>
              </label>
              <label>
                {t("프레임레이트", "Frame rate")}
                <select
                  value={renderSettings.fps}
                  onChange={(event) =>
                    patchSettings(
                      "fps",
                      Number(event.target.value) as RenderSettings["fps"],
                    )
                  }
                >
                  <option value="24">{t("24 fps · 시네마틱", "24 fps · cinematic")}</option>
                  <option value="30">{t("30 fps · 릴 기본", "30 fps · reel standard")}</option>
                  <option value="60">{t("60 fps · 빠른 동작", "60 fps · fast action")}</option>
                </select>
              </label>
            </article>
          </div>
          <div className="finish-readout">
            <b>{t("다음 렌더", "Next render")}</b>
            <span>
              {renderSettings.crop_anchor} crop ·{" "}
              {renderSettings.speed.toFixed(2)}× · {renderSettings.look} ·{" "}
              {renderSettings.mute_audio
                ? t("원본 오디오 끔", "source audio off")
                : t(`${renderSettings.volume}% 음량`, `${renderSettings.volume}% audio`)}{" "}
              ·{" "}
              {renderSettings.captions_enabled
                ? t("자막 번인", "burn-in captions")
                : t("자막 없음", "no captions")}{" "}
              · {renderSettings.fps}fps · {renderSettings.quality}
            </span>
          </div>
        </section>
        <section className="production-grid production-action-grid">
          <article className="production-card lane-card">
            <div className="production-card-head">
              <span>{t("02 · 렌더 작업", "02 · RENDER LANE")}</span>
              <em>MoviePy · H.264/AAC · 1080×1920</em>
            </div>
            <h2>{t("승인된 EDL을 로컬 MP4로 렌더", "Render an approved EDL as local MP4")}</h2>
            <p>
              {t("작업 생성만으로 렌더는 시작되지 않습니다. 실행 버튼을 한 번 더 눌러야 하며, 실패·완료 결과도 로컬 이력에 남습니다.", "Creating a job does not start rendering. Run it separately; failures and completions remain in local history.")}
            </p>
            <label className="approval-check">
              <input
                type="checkbox"
                checked={approved}
                onChange={(event) => setApproved(event.target.checked)}
              />{" "}
              {t("이 편집 결정을 사람이 검토·승인했습니다.", "A person reviewed and approved this edit decision.")}
            </label>
            <button
              className="production-primary"
              onClick={() => void queueRender()}
              disabled={busy || !selected}
            >
              {t("승인된 렌더 작업 대기열에 넣기", "Queue approved render job")}
            </button>
            <small>
              {selectedProject
                ? t(`현재 프로젝트: ${selectedProject.title}`, `Current project: ${selectedProject.title}`)
                : t("프로젝트를 만든 뒤 활성화됩니다.", "Available after you create a project.")}
            </small>
          </article>
          <article className="production-card lane-card instagram-card">
            <div className="production-card-head">
              <span>{t("03 · Instagram 게시", "03 · INSTAGRAM LANE")}</span>
              <em>{t("전문 계정 전용", "Professional account only")}</em>
            </div>
            <h2>{t("자동 게시가 아닌, 승인된 게시 실행", "Run approved publishing, not automatic publishing")}</h2>
            <p>
              {t("작업을 먼저 대기열에 넣고, 서버를 게시 허용 모드로 시작한 뒤,", "First queue the job and start the server with publishing enabled; then")}{" "}
              <b>PUBLISH</b>{t("라는 정확한 확인까지 있어야 실제 전송됩니다.", " confirmation is required before it can be sent.")}
            </p>
            <label className="approval-check">
              <input
                type="checkbox"
                checked={shareToFeed}
                onChange={(event) => setShareToFeed(event.target.checked)}
              />{" "}
              {t("릴을 프로필 피드에도 공유", "Also share the reel to the profile feed")}
            </label>
            <button
              className="production-outline"
              onClick={() => void queueInstagram()}
              disabled={busy || !selected || !approved}
            >
              {t("Instagram 게시 작업 대기열에 넣기", "Queue Instagram publish job")}
            </button>
            <label className="publish-field">
              {t("실제 게시 실행 확인", "Confirm actual publishing")}{" "}
              <input
                value={publishConfirm}
                onChange={(event) => setPublishConfirm(event.target.value)}
                placeholder={t("PUBLISH 입력", "Type PUBLISH")}
              />
            </label>
          </article>
        </section>
        <section className="production-jobs">
          <div className="production-section-head">
            <div>
              <p className="kicker">{t("로컬 작업 보드", "LOCAL JOB BOARD")}</p>
              <h2>
                {t("브라우저에서는 사람이", "In the browser, a person")} <span>{t("실행을 허용", "allows execution")}</span>{t("하고, 봇은 정책에 따라 자동화합니다.", ", while bots automate according to their policy.")}
              </h2>
            </div>
            <span>{t(`${jobs.length}개 작업`, `${jobs.length} total jobs`)}</span>
          </div>
          <div className="job-layout">
            <div className="project-list">
              {projects.length ? (
                projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => setSelected(project.id)}
                    className={selected === project.id ? "chosen" : ""}
                  >
                    <b>{project.title}</b>
                    <span>
                      {t(`${project.timeline_json.clips.length}개 컷`, `${project.timeline_json.clips.length} clips`)} ·{" "}
                      {stamp(project.created_at, language)}
                    </span>
                    <i>{project.id.slice(0, 8)}</i>
                  </button>
                ))
              ) : (
                <div className="empty-job">
                  {t("아직 로컬 프로젝트가 없습니다.", "There are no local projects yet.")}
                  <br />
                  {t("위에서 첫 프로젝트를 만드세요.", "Create your first project above.")}
                </div>
              )}
            </div>
            <div className="job-list">
              {selected ? (
                selectedJobs.length ? (
                  selectedJobs.map((job) => (
                    <article key={job.id} className={`job-row ${job.status}`}>
                      <div>
                        <span>
                          {job.kind === "render" ? "RENDER" : "INSTAGRAM"}
                        </span>
                        <b>{job.status.toUpperCase()}</b>
                        <p>
                          {stamp(job.created_at, language)} ·{" "}
                          {job.kind === "render"
                            ? t("로컬 렌더 승인", "local render authorization")
                            : t("사람 승인", "human approval")}{" "}
                          {job.approved ? t("기록됨", "recorded") : t("누락", "missing")}
                        </p>
                        {job.error_text && <small>{job.error_text}</small>}
                      </div>
                      <button
                        onClick={() => void runJob(job)}
                        disabled={
                          busy ||
                          !job.approved ||
                          !["queued", "failed"].includes(job.status)
                        }
                      >
                        {job.kind === "instagram_publish"
                          ? t("PUBLISH 실행", "Run PUBLISH")
                          : t("렌더 실행", "Run render")}
                      </button>
                    </article>
                  ))
                ) : (
                  <div className="empty-job">
                    {t("선택한 프로젝트에는 아직 작업이 없습니다.", "The selected project has no jobs yet.")}
                    <br />
                    {t("렌더 또는 Instagram 게시에서 대기열을 만드세요.", "Create a queue in the Render or Instagram lane.")}
                  </div>
                )
              ) : (
                <div className="empty-job">{t("왼쪽에서 프로젝트를 선택하세요.", "Choose a project on the left.")}</div>
              )}
            </div>
          </div>
        </section>
        <section className="production-grid production-footer-grid">
          <article className="production-card bot-card">
            <div className="production-card-head">
              <span>{t("Grok 봇 범위", "GROK BOT BOUNDARY")}</span>
              <em>{t("제한된 로컬 계약", "narrow local contract")}</em>
            </div>
            <pre>{contract}</pre>
            <p>
              {t("봇은 프로젝트를 준비하고 승인된 작업을 대기열에 넣을 수 있습니다. Meta 토큰이나 작업 공간 밖 파일에는 접근할 수 없고, 승인 없이 게시할 수 없습니다.", "Bots can prepare projects and queue approved jobs. They cannot access Meta tokens or files outside the workspace, or publish without approval.")}
            </p>
          </article>
          <article className="production-card idea-card">
            <div className="production-card-head">
              <span>{t("적용한 제작 원칙", "ADOPTED PRODUCTION IDEAS")}</span>
              <em>{t("조사 → 구현", "research → implementation")}</em>
            </div>
            <ul>
              <li>
                <b>Transcript → EDL → render</b>
                <span>
                  {t("영상 전체를 덤프하지 않고 선택한 말 구간만 렌더합니다.", "Render only the chosen speech segments instead of dumping the entire video.")}
                </span>
              </li>
              <li>
                <b>{t("승인 조건", "Approval gates")}</b>
                <span>{t("렌더와 게시 모두 기록된 사람 승인이 선행됩니다.", "Both rendering and publishing require recorded human approval.")}</span>
              </li>
              <li>
                <b>{t("지속되는 작업 기록", "Persistent job memory")}</b>
                <span>
                  {t("SQLite에 작업·실패·결과를 남겨 봇이 재시도와 상태 확인을 할 수 있습니다.", "Jobs, failures, and results remain in SQLite so bots can retry and check status.")}
                </span>
              </li>
              <li>
                <b>{t("이어갈 수 있는 게시", "Resumable publishing")}</b>
                <span>
                  {t("승인된 로컬 MP4를 컨테이너 업로드·처리 확인 뒤 게시합니다.", "Publish an approved local MP4 after container upload and processing checks.")}
                </span>
              </li>
            </ul>
          </article>
        </section>
        <p className="production-message" aria-live="polite">
          {message}
        </p>
      </main>
    </>
  );
}
