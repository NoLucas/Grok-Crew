"use client";

import { useCallback, useEffect, useState } from "react";
import { useLanguage, type AppLanguage } from "./language";
import { SiteHeader } from "./site-header";
import type { RenderSettings } from "./production-finish-rack";

type TFn = (ko: string, en: string, zh: string, ja: string) => string;

type TimelineClip = { in: number; out: number; keep: boolean; caption: string; speaker?: string };
type StudioProject = {
  id: string;
  title: string;
  caption: string;
  timeline_json: { clips?: TimelineClip[]; render_settings?: Partial<RenderSettings> };
  created_at: string;
};
type StudioJob = {
  id: string;
  project_id: string;
  kind: "render" | "instagram_publish";
  status: string;
  result_json?: Record<string, unknown> | null;
  error_text?: string | null;
  created_at: string;
};
type HistoryItem = { project: StudioProject; jobs: StudioJob[] };
type Bot = {
  bot_id: string;
  display_name: string;
  last_action: string;
  last_seen: string;
  presence: "active" | "idle";
  seconds_since_checkin: number;
};
type Activity = {
  bot_id: string;
  action: string;
  detail_json: Record<string, unknown>;
  created_at: string;
};

const studio = "http://127.0.0.1:7214";
const CLOUD_BOT_ID = "cloud-handoff";
const HISTORY_LIMIT = 20;

function since(seconds: number, language: AppLanguage) {
  if (language === "en")
    return seconds < 60 ? `${seconds}s ago` : seconds < 3600 ? `${Math.floor(seconds / 60)}m ago` : `${Math.floor(seconds / 3600)}h ago`;
  if (language === "zh")
    return seconds < 60 ? `${seconds}秒前` : seconds < 3600 ? `${Math.floor(seconds / 60)}分钟前` : `${Math.floor(seconds / 3600)}小时前`;
  if (language === "ja")
    return seconds < 60 ? `${seconds}秒前` : seconds < 3600 ? `${Math.floor(seconds / 60)}分前` : `${Math.floor(seconds / 3600)}時間前`;
  return seconds < 60 ? `${seconds}초 전` : seconds < 3600 ? `${Math.floor(seconds / 60)}분 전` : `${Math.floor(seconds / 3600)}시간 전`;
}
function stamp(value: string, language: AppLanguage) {
  const locale = language === "ko" ? "ko-KR" : language === "zh" ? "zh-CN" : language === "ja" ? "ja-JP" : "en-US";
  return value ? new Date(value).toLocaleString(locale, { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" }) : "—";
}
function captionPreview(caption: string, t: TFn) {
  const trimmed = (caption ?? "").trim();
  if (!trimmed) return t("(캡션 없음)", "(no caption)", "(无文案)", "(キャプションなし)");
  return trimmed.length <= 100 ? trimmed : `${trimmed.slice(0, 100).trimEnd()}…`;
}
function displayTitle(title: string) {
  return (title ?? "").replace(/ \(imported\)$/, "");
}
function renderSettingsSummary(settings: Partial<RenderSettings> | undefined, t: TFn) {
  if (!settings || Object.keys(settings).length === 0) return t("기본값", "defaults", "默认设置", "デフォルト");
  const parts: string[] = [];
  if (settings.platform) parts.push(settings.platform);
  if (settings.crop_anchor) parts.push(t(`리프레임 ${settings.crop_anchor}`, `reframe ${settings.crop_anchor}`, `重构图 ${settings.crop_anchor}`, `リフレーム ${settings.crop_anchor}`));
  parts.push(
    settings.captions_enabled === false
      ? t("자막 없음", "no captions", "无字幕", "字幕なし")
      : t("자막 있음", "captions on", "字幕开启", "字幕あり"),
  );
  if (settings.music_track) parts.push(t("음악 있음", "music", "配乐", "音楽あり"));
  if (settings.quality) parts.push(settings.quality);
  return parts.join(" · ");
}
function jobBadge(jobs: StudioJob[], kind: "render" | "instagram_publish", t: TFn): { label: string; tone: "active" | "idle" } {
  const job = jobs.filter((candidate) => candidate.kind === kind).sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
  if (!job)
    return kind === "render"
      ? { label: t("렌더 없음", "no render job", "无渲染任务", "レンダーなし"), tone: "idle" }
      : { label: t("인스타 작업 없음", "no Instagram job", "无 Instagram 任务", "Instagramジョブなし"), tone: "idle" };
  const label =
    job.status === "succeeded"
      ? t("성공", "succeeded", "成功", "成功")
      : job.status === "failed"
        ? t("실패", "failed", "失败", "失敗")
        : job.status === "running"
          ? t("진행 중", "running", "进行中", "実行中")
          : t("대기 중", "queued", "排队中", "キュー待ち");
  return { label, tone: job.status === "succeeded" ? "active" : "idle" };
}

export default function HandoffConsole() {
  const { t, language } = useLanguage();
  const [health, setHealth] = useState<unknown>(null);
  const [bots, setBots] = useState<Bot[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [message, setMessage] = useState("");
  const [lastRefresh, setLastRefresh] = useState("");
  const [checking, setChecking] = useState(false);
  const [token, setToken] = useState("");

  const api = useCallback(
    async (path: string) => {
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await fetch(`${studio}${path}`, { headers });
      const data = (await response.json()) as Record<string, unknown>;
      if (!response.ok) throw new Error(String(data.error ?? `Local Studio error ${response.status}`));
      return data;
    },
    [token],
  );

  const refresh = useCallback(
    async (quiet = false) => {
      setChecking(true);
      try {
        const [healthResponse, botsResponse, activityResponse] = await Promise.all([
          api("/health"),
          api("/api/bots"),
          api("/api/bot-activity"),
        ]);
        setHealth(healthResponse);
        setBots(((botsResponse.bots ?? []) as Bot[]));
        const activity = (activityResponse.activity ?? []) as Activity[];
        const seen = new Set<string>();
        const projectIds: string[] = [];
        for (const event of activity) {
          if (event.bot_id !== CLOUD_BOT_ID || event.action !== "handoff_processed") continue;
          const projectId = event.detail_json?.project_id;
          if (typeof projectId !== "string" || seen.has(projectId)) continue;
          seen.add(projectId);
          projectIds.push(projectId);
          if (projectIds.length >= HISTORY_LIMIT) break;
        }
        const details = await Promise.all(
          projectIds.map((id) =>
            api(`/api/projects/${id}`).catch(() => null),
          ),
        );
        const items: HistoryItem[] = [];
        for (const detail of details) {
          const project = detail?.project as StudioProject | undefined;
          if (project) items.push({ project, jobs: (detail?.jobs ?? []) as StudioJob[] });
        }
        setHistory(items);
        setLastRefresh(new Date().toLocaleTimeString(language === "ko" ? "ko-KR" : "en-US"));
        if (!quiet)
          setMessage(
            t(
              `핸드오프 히스토리 ${items.length}건을 확인했습니다.`,
              `Checked ${items.length} handoff history item(s).`,
              `已确认 ${items.length} 条交接历史。`,
              `引き継ぎ履歴 ${items.length} 件を確認しました。`,
            ),
          );
      } catch (error) {
        setHealth(null);
        setBots([]);
        setHistory([]);
        setMessage(
          error instanceof Error
            ? `${error.message} — ${t("Local Studio가 실행 중인지 확인하세요.", "Check that Local Studio is running.", "请确认 Local Studio 是否在运行。", "Local Studio が実行中か確認してください。")}`
            : t("Local Studio에 연결할 수 없습니다.", "Cannot connect to Local Studio.", "无法连接到 Local Studio。", "Local Studio に接続できません。"),
        );
      } finally {
        setChecking(false);
      }
    },
    [api, language, t],
  );

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

  const cloudBot = bots.find((bot) => bot.bot_id === CLOUD_BOT_ID);

  return (
    <>
      <SiteHeader current="handoff" />
      <main className="bot-main">
        <section className="bot-hero">
          <div>
            <p className="kicker">{t("GROK CREW · 인계 모니터", "GROK CREW · HANDOFF MONITOR", "GROK CREW · 交接监视器", "GROK CREW · 引き継ぎモニター")}</p>
            <h1>
              {t("다른 컴퓨터의 봇이", "See what the bot on", "看看在另一台电脑上的机器人", "別のコンピューターのボットが")}{" "}
              <span>{t("여기서 뭘 했는지", "another computer did here", "在这里做了什么", "ここで何をしたか")}</span>
              <br />
              {t("확인 가능한 곳.", "confirm without watching a console.", "无需盯着控制台就能确认。", "コンソールを見なくても確認できる場所。")}
            </h1>
            <p>
              {t(
                "이 화면은 local_studio/handoff_watcher.py가 원격 봇의 제출물을 가져와 처리할 때마다 남긴 기록만 보여줍니다. Operations Center에서 사람이 직접 가져온 번들은 여기 표시되지 않습니다.",
                "This screen only shows what local_studio/handoff_watcher.py recorded while applying a remote bot's submissions. A bundle a person imports directly from Operations Center never appears here.",
                "此界面只显示 local_studio/handoff_watcher.py 在处理远程机器人提交内容时留下的记录。有人从 Operations Center 直接导入的包不会出现在这里。",
                "この画面は local_studio/handoff_watcher.py がリモートボットの提出物を取り込んだ際に残した記録だけを表示します。Operations Center から人が直接インポートしたバンドルはここには表示されません。",
              )}
            </p>
          </div>
          <aside className={`bot-live-card ${health ? "ready" : ""}`}>
            <span>{t("연결 상태", "CONNECTION", "连接状态", "接続状態")}</span>
            <b>
              {!health
                ? t("서비스 꺼짐", "SERVICE OFFLINE", "服务已关闭", "サービス停止中")
                : !cloudBot
                  ? t("연결된 적 없음", "NEVER CONNECTED", "从未连接过", "接続したことなし")
                  : cloudBot.presence === "active"
                    ? t("연결됨", "CONNECTED", "已连接", "接続済み")
                    : t("최근 활동 없음", "IDLE", "近期无活动", "最近活動なし")}
            </b>
            <p>
              {!health
                ? t("로컬 제작 서비스를 먼저 실행하세요.", "Start Local Studio first.", "请先启动本地制作服务。", "先にローカル制作サービスを起動してください。")
                : !cloudBot
                  ? t(
                      "handoff_watcher.py를 아직 한 번도 실행하지 않았습니다. 실행 후 핸드오프 브랜치에 패키지를 push하면 여기 나타납니다.",
                      "handoff_watcher.py has never run yet. Start it and push a package to the handoff branch to see activity here.",
                      "尚未运行过 handoff_watcher.py。启动后向交接分支推送一个包,活动就会显示在这里。",
                      "handoff_watcher.py はまだ一度も実行されていません。起動して引き継ぎブランチにパッケージを push すると、ここに表示されます。",
                    )
                  : t(
                      `마지막 작업: ${cloudBot.last_action} · ${since(cloudBot.seconds_since_checkin, language)}`,
                      `Last action: ${cloudBot.last_action} · ${since(cloudBot.seconds_since_checkin, language)}`,
                      `最后操作:${cloudBot.last_action} · ${since(cloudBot.seconds_since_checkin, language)}`,
                      `最終アクション: ${cloudBot.last_action} · ${since(cloudBot.seconds_since_checkin, language)}`,
                    )}
            </p>
            <button onClick={() => void refresh()} disabled={checking}>
              {checking ? t("확인 중…", "Checking…", "确认中…", "確認中…") : t("지금 다시 확인", "Check now", "立即重新确认", "今すぐ確認")}
            </button>
            <label className="token-field">
              {t("로컬 보호 토큰", "Local protection token", "本地保护令牌", "ローカル保護トークン")}{" "}
              <input
                type="password"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder={t("설정된 경우에만 입력", "Enter only if one is configured", "仅在已设置时输入", "設定されている場合のみ入力")}
              />
            </label>
          </aside>
        </section>
        <section className="bot-answer-strip">
          <b>{t("현재 상태", "Current result", "当前状态", "現在の状態")}</b>
          <span>{message}</span>
          <em>{lastRefresh ? t(`마지막 확인 ${lastRefresh}`, `Last checked ${lastRefresh}`, `上次确认 ${lastRefresh}`, `最終確認 ${lastRefresh}`) : t("연결 대기", "Waiting for connection", "等待连接", "接続待ち")}</em>
        </section>
        <section className="bot-layout">
          <article className="bot-card bot-check-card">
            <div className="bot-card-head">
              <span>{t("인계된 프로젝트", "IMPORTED PROJECTS", "已交接的项目", "引き継ぎ済みプロジェクト")}</span>
              <em>{t(`최근 ${history.length}건`, `${history.length} recent`, `最近 ${history.length} 条`, `直近 ${history.length} 件`)}</em>
            </div>
            <h2>{t("원격 봇이 만든 편집 구조", "Editing structure the remote bot created", "远程机器人创建的编辑结构", "リモートボットが作成した編集構造")}</h2>
            {history.length ? (
              <div className="bot-presence-list">
                {history.map((item) => {
                  const clips = item.project.timeline_json?.clips ?? [];
                  const kept = clips.filter((clip) => clip.keep).length;
                  const render = jobBadge(item.jobs, "render", t);
                  const instagram = jobBadge(item.jobs, "instagram_publish", t);
                  return (
                    <article key={item.project.id}>
                      <div className={`presence-dot ${render.tone}`} />
                      <div>
                        <b>{displayTitle(item.project.title)}</b>
                        <span>{stamp(item.project.created_at, language)}</span>
                        <p>{captionPreview(item.project.caption, t)}</p>
                        <p>
                          {t("유지된 컷", "Kept clips", "保留的镜头", "残したカット")}: <strong>{kept}/{clips.length}</strong> · {renderSettingsSummary(item.project.timeline_json?.render_settings, t)}
                        </p>
                        <small>
                          {t("렌더", "Render", "渲染", "レンダー")}: {render.label} · {t("인스타그램", "Instagram", "Instagram", "Instagram")}: {instagram.label}
                        </small>
                      </div>
                      <em className={render.tone}>{render.label}</em>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="no-bot-state">
                <b>
                  {cloudBot
                    ? t("아직 인계된 패키지가 없습니다.", "No handoff package has been processed yet.", "还没有处理过任何交接包。", "まだ処理された引き継ぎパッケージはありません。")
                    : t("아직 연결된 적이 없습니다.", "Never connected yet.", "从未连接过。", "まだ接続されていません。")}
                </b>
                <p>
                  {t(
                    "오류가 아닙니다. 원격 봇이 핸드오프 브랜치에 패키지를 push하고 handoff_watcher.py가 그걸 처리하면, 실제로 임포트된 프로젝트만 여기 나타납니다.",
                    "This is not an error. Once a remote bot pushes a package to the handoff branch and handoff_watcher.py processes it, only real imported projects appear here.",
                    "这不是错误。远程机器人向交接分支推送包、handoff_watcher.py 处理之后,只有真正导入的项目才会显示在这里。",
                    "エラーではありません。リモートボットが引き継ぎブランチにパッケージを push し、handoff_watcher.py がそれを処理すると、実際に取り込まれたプロジェクトだけがここに表示されます。",
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
