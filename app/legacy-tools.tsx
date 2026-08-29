'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ADVANCED_TOOLS_SCHEMA,
  assignedIdsFromCatalog,
  botToolsInstruction,
  defaultAssignedIds,
  draftAdvancedTools,
  featuredAdvancedTools,
  liveAdvancedTools,
  moreAdvancedTools,
  primaryToolApi,
  readStoredAssignedIds,
  toolCatalogPayload,
  writeStoredAssignedIds,
  type AdvancedTool,
  type ToolCatalogPayload,
} from './advanced-tools';
import { studioDownloadBase } from './desktop-auto-state';
import { useLanguage } from './language';
import { SiteHeader } from './site-header';

function studioBase() {
  return studioDownloadBase();
}

function ToolCard({
  tool,
  assigned,
  onAssign,
  t,
}: {
  tool: AdvancedTool;
  assigned: boolean;
  onAssign: (id: string, next: boolean) => void;
  t: (ko: string, en: string, zh: string, ja: string) => string;
}) {
  const apiLine = primaryToolApi(tool);
  return (
    <article className={`${tool.screenLive ? 'tools-card is-live' : 'tools-card'}${assigned && tool.apiLive ? ' is-assigned' : ''}`}>
      <div className="tools-card-head">
        <b>{t(...tool.name)}</b>
        <div className="tools-card-badges">
          <span className={tool.screenLive ? 'tools-badge live' : 'tools-badge draft'}>
            {tool.screenLive
              ? t('화면 실행', 'Screen live', '画面：运行', '画面 稼働')
              : t('화면 초안', 'Screen draft', '画面：草稿', '画面 草案')}
          </span>
          <span className={tool.apiLive ? 'tools-badge api-live' : 'tools-badge api-none'}>
            {tool.apiLive
              ? t('API 있음', 'API live', 'API：活着', 'API あり')
              : t('API 없음', 'No API', 'API：无', 'API なし')}
          </span>
        </div>
      </div>
      {apiLine ? (
        <code className="tools-card-api">{apiLine}</code>
      ) : (
        <code className="tools-card-api is-empty">
          {t('봇이 치는 API 없음', 'No bot API', '没有机器人可打的 API', 'ボットが叩く API なし')}
        </code>
      )}
      <div className="tools-card-actions">
        {tool.apiLive ? (
          <label className="tools-card-assign">
            <input
              type="checkbox"
              checked={assigned}
              onChange={(event) => onAssign(tool.id, event.target.checked)}
            />
            <span>{assigned ? t('봇이 씀', 'Bot uses this', '机器人用这个', 'ボットが使う') : t('지정 안 함', 'Not assigned', '未指定', '指定しない')}</span>
          </label>
        ) : (
          <span className="tools-card-assign is-human">
            {t('화면만 · 사람이 볼 수 있음', 'Screen only · a person may look', '仅画面 · 人可以看', '画面だけ · 人が見られる')}
          </span>
        )}
        <Link href={tool.url} className="tools-card-open">
          {t('화면 열기', 'Open screen', '打开画面', '画面を開く')}
        </Link>
      </div>
    </article>
  );
}

export default function LegacyTools() {
  const { t, language } = useLanguage();
  const [catalog, setCatalog] = useState<ToolCatalogPayload | null>(null);
  const [catalogState, setCatalogState] = useState<'loading' | 'ready' | 'fallback'>('loading');
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [assignState, setAssignState] = useState<'idle' | 'saving' | 'error'>('idle');
  const [assignedIds, setAssignedIds] = useState<string[]>(() => readStoredAssignedIds() ?? defaultAssignedIds());
  const liveTools = useMemo(() => liveAdvancedTools(), []);
  const previewTools = useMemo(() => draftAdvancedTools(), []);
  const extraTools = useMemo(() => moreAdvancedTools(), []);
  const featuredCount = useMemo(() => featuredAdvancedTools().length, []);
  const assignedLive = assignedIds.filter((id) => {
    const tool = [...liveTools, ...previewTools, ...extraTools].find((item) => item.id === id);
    return Boolean(tool?.apiLive);
  });
  const assignTitle = assignedLive.length
    ? t(`봇이 쓸 도구 ${assignedLive.length}개`, `${assignedLive.length} tools for the bot`, `机器人要用 ${assignedLive.length} 个工具`, `ボットが使うツール ${assignedLive.length}`)
    : t('지정된 도구 없음', 'Nothing assigned', '没有指定的工具', '指定なし');
  const moreLabel = moreOpen
    ? t('더보기 접기', 'Hide more', '收起更多', 'もっと見るを閉じる')
    : t(`더보기 · 편집실·에이전트·패킷 등 ${extraTools.length}개`, `More · ${extraTools.length} drafts`, `更多 · ${extraTools.length} 个草稿`, `もっと見る · 草案 ${extraTools.length}`);
  const moreHint = t(
    `허브에는 ${featuredCount}개만 둡니다. 편집실·터미널·에이전트·패킷은 여기 아래입니다.`,
    `The hub shows ${featuredCount} cards. Edit lab, terminal, agent, and packet sit here.`,
    `枢纽只放 ${featuredCount} 张。编辑室、终端、智能体、数据包在这里。`,
    `ハブには ${featuredCount} 枚だけ置きます。編集ラボ・ターミナル・エージェント・パケットはここにあります。`,
  );

  useEffect(() => {
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      void fetch(`${studioBase()}/api/v2/tools?lang=${language}`)
        .then(async (response) => {
          if (!response.ok) throw new Error(String(response.status));
          return response.json() as Promise<ToolCatalogPayload>;
        })
        .then((payload) => {
          if (cancelled) return;
          if (payload?.schema !== ADVANCED_TOOLS_SCHEMA || !Array.isArray(payload.tools)) throw new Error('bad catalog');
          setCatalog(payload);
          setCatalogState('ready');
          const next = assignedIdsFromCatalog(payload);
          setAssignedIds(next);
          writeStoredAssignedIds(next);
        })
        .catch(() => {
          if (cancelled) return;
          setCatalog(null);
          setCatalogState('fallback');
        });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [language]);

  const fallbackCatalog = useMemo(() => toolCatalogPayload(language, assignedIds), [language, assignedIds]);
  const shownCatalog = catalog
    ? { ...catalog, assigned: assignedIds, bot_instruction: catalog.bot_instruction || botToolsInstruction(language, assignedIds, studioBase()), tools: catalog.tools.map((tool) => ({ ...tool, assigned: assignedIds.includes(tool.id) })) }
    : fallbackCatalog;
  const catalogJson = JSON.stringify(shownCatalog, null, 2);
  const instruction = shownCatalog.bot_instruction || botToolsInstruction(language, assignedIds, studioBase());

  const persistAssignment = async (next: string[]) => {
    setAssignedIds(next);
    writeStoredAssignedIds(next);
    setAssignState('saving');
    try {
      const response = await fetch(`${studioBase()}/api/v2/tools`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: next, lang: language }),
      });
      if (!response.ok) throw new Error(String(response.status));
      const payload = (await response.json()) as ToolCatalogPayload;
      if (payload?.schema === ADVANCED_TOOLS_SCHEMA && Array.isArray(payload.tools)) {
        setCatalog(payload);
        setCatalogState('ready');
        setAssignedIds(assignedIdsFromCatalog(payload));
      }
      setAssignState('idle');
    } catch {
      setAssignState('error');
    }
  };

  const toggleAssign = (id: string, next: boolean) => {
    const updated = next ? [...assignedIds.filter((item) => item !== id), id] : assignedIds.filter((item) => item !== id);
    void persistAssignment(updated);
  };

  const copyForBot = async () => {
    await navigator.clipboard?.writeText(instruction);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const copyCatalog = async () => {
    await navigator.clipboard?.writeText(catalogJson);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <>
      <SiteHeader current="tools" />
      <main className="tools-main">
        <section className="tools-hero">
          <div>
            <p className="kicker">{t('고급 도구', 'ADVANCED TOOLS', '高级工具', '高度なツール')}</p>
            <h1>
              {t('지정은 사람이,', 'A person specifies.', '人来指定，', '指定は人、')}
              <br />
              <span>{t('실행은 봇이 합니다.', 'The bot runs them.', '由机器人执行。', '実行はボットです。')}</span>
            </h1>
            <p>
              {t(
                '카드에서 봇이 쓸 도구만 고르세요. 화면은 열어 볼 수 있지만, 웬만하면 아래 한 줄을 봇에게 붙입니다.',
                'Check the tools the bot should use. You can open a screen, but prefer pasting the line below to the bot.',
                '勾选机器人该用的工具。你可以打开画面，但尽量把下面一行贴给机器人。',
                'ボットが使うツールだけを選んでください。画面は開けますが、なるべく下の一文をボットに貼ります。',
              )}
            </p>
            <div className="tools-hero-actions">
              <button type="button" className="tools-copy-action" onClick={() => void copyForBot()}>
                {copied
                  ? t('복사됨. 봇 창에 붙여 넣으세요', 'Copied. Paste it in the bot.', '已复制。请贴到机器人。', 'コピー済み。ボットに貼ってください')
                  : t('봇에게 이 말 복사', 'Copy this for the bot', '复制给机器人', 'ボットにこの文をコピー')}
              </button>
              <Link href="/" target="_blank" rel="noopener noreferrer" className="tools-secondary-action">
                {t('기본 화면으로', 'Open main screen', '打开主画面', '基本画面を開く')}
              </Link>
            </div>
          </div>
          <aside>
            <span>{t('사람 지정 · 봇 실행', 'PERSON SPECIFIES · BOT RUNS', '人指定 · 机器人执行', '人が指定 · ボットが実行')}</span>
            <b>{t('웬만하면 봇', 'Prefer the bot', '尽量交给机器人', 'なるべくボット')}</b>
            <p>
              {t(
                '지정된 도구의 API만 봇이 칩니다. 운영 센터는 화면은 초안, API는 살아 있습니다. 테마는 기본 화면 설정을 따릅니다.',
                'The bot hits only assigned APIs. Operations is a draft screen with live APIs. Theme follows the main-screen setting.',
                '机器人只打已指定工具的 API。运营中心画面是草稿，API 是活的。主题跟主画面设置。',
                'ボットは指定されたツールの API だけを叩きます。運用センターは画面が草案で、API は生きています。テーマは基本画面の設定に従います。',
              )}
            </p>
          </aside>
        </section>

        <section className="tools-assign-bar" aria-live="polite">
          <div>
            <b>{assignTitle}</b>
            <p>
              {assignState === 'saving'
                ? t('지정을 저장하는 중입니다.', 'Saving the assignment.', '正在保存指定。', '指定を保存しています。')
                : assignState === 'error'
                  ? t('로컬 서비스에 저장하지 못했습니다. 이 브라우저에는 남겼습니다.', 'Could not save to Local Studio. Kept it in this browser.', '无法保存到本地服务。已留在此浏览器。', 'ローカルサービスに保存できませんでした。このブラウザには残しました。')
                  : assignedLive.length
                    ? t('한 줄을 복사하면 봇이 GET /api/v2/tools의 assigned만 씁니다.', 'Copy one line. The bot uses only assigned tools from GET /api/v2/tools.', '复制一行。机器人只用 GET /api/v2/tools 里 assigned 的工具。', '一文をコピーすると、ボットは GET /api/v2/tools の assigned だけを使います。')
                    : t('지정하기 전까지 봇은 고급 도구 write API를 치지 않습니다.', 'Until you assign something, the bot will not hit advanced-tool write APIs.', '在指定之前，机器人不会打高级工具的 write API。', '指定するまでボットは高度なツールの write API を叩きません。')}
            </p>
          </div>
          <button type="button" className="tools-copy-action" onClick={() => void copyForBot()}>
            {copied
              ? t('복사됨', 'Copied', '已复制', 'コピー済み')
              : t('봇에게 이 말 복사', 'Copy this for the bot', '复制给机器人', 'ボットにこの文をコピー')}
          </button>
        </section>

        <section className="tools-section">
          <div className="tools-section-head">
            <h2>{t('실행', 'Live', '运行', '稼働')}</h2>
            <p>{t('이 두 화면의 렌더와 봇 기록은 웬만하면 봇이 합니다. 사람은 지정만 하면 됩니다.', 'Renders and bot records on these two screens should be the bot. A person only specifies.', '这两个页面的渲染和机器人记录尽量交给机器人。人只需指定。', 'この 2 画面のレンダーとボット記録はなるべくボットがします。人は指定だけで十分です。')}</p>
          </div>
          <div className="tools-grid tools-grid-live">
            {liveTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} assigned={assignedIds.includes(tool.id)} onAssign={toggleAssign} t={t} />
            ))}
          </div>
        </section>

        <section className="tools-section">
          <div className="tools-section-head">
            <h2>{t('초안 · 살아 있는 API', 'Draft screens, live APIs', '草稿画面，活着的 API', '草案画面 · 生きている API')}</h2>
            <p>{t('화면은 기획이고, 지정된 API는 봇이 칩니다.', 'The screens are planning. The bot hits the assigned APIs.', '画面是策划，已指定的 API 由机器人打。', '画面は企画で、指定された API はボットが叩きます。')}</p>
          </div>
          <div className="tools-grid">
            {previewTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} assigned={assignedIds.includes(tool.id)} onAssign={toggleAssign} t={t} />
            ))}
          </div>
        </section>

        <section className="tools-more" id="tools-more">
          <button type="button" className="tools-more-toggle" onClick={() => setMoreOpen((value) => !value)}>
            {moreLabel}
          </button>
          {moreOpen ? (
            <div className="tools-grid">
              {extraTools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} assigned={assignedIds.includes(tool.id)} onAssign={toggleAssign} t={t} />
              ))}
            </div>
          ) : (
            <p className="tools-more-hint">{moreHint}</p>
          )}
        </section>

        <section className="tools-bot">
          <button type="button" className="tools-catalog-toggle" onClick={() => setCatalogOpen((value) => !value)}>
            {catalogOpen
              ? t('카탈로그 접기', 'Hide catalog', '收起目录', 'カタログを閉じる')
              : t('카탈로그 보기', 'Show catalog', '查看目录', 'カタログを見る')}
          </button>
          {catalogOpen ? (
            <div className="tools-bot-panel" aria-live="polite">
              <p>
                {catalogState === 'ready'
                  ? t(
                      '같은 local_studio/advanced-tools.json을 Local Studio가 방금 읽었습니다. 봇은 HTML이 아니라 이 JSON의 assigned를 칩니다.',
                      'Local Studio just read the same local_studio/advanced-tools.json. Bots hit assigned tools in this JSON, not the HTML.',
                      'Local Studio 刚读了同一份 local_studio/advanced-tools.json。机器人打这份 JSON 里 assigned 的工具，不打 HTML。',
                      'Local Studio が同じ local_studio/advanced-tools.json を今読みました。ボットは HTML ではなくこの JSON の assigned を叩きます。',
                    )
                  : catalogState === 'loading'
                    ? t('카탈로그를 불러오는 중입니다.', 'Loading the catalog.', '正在读取目录。', 'カタログを読み込んでいます。')
                    : t(
                        '로컬 서비스에 연결하지 못해 같은 파일의 화면 복사본을 표시합니다.',
                        'Local Studio is unavailable, so the same file’s in-page copy is shown.',
                        '无法连接本地服务，正在显示同一文件的页面副本。',
                        'ローカルサービスに接続できないため、同じファイルの画面コピーを表示しています。',
                      )}
              </p>
              <p>{shownCatalog.rule}</p>
              <ol>
                {shownCatalog.never.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
              <div className="tools-bot-actions">
                <code>{shownCatalog.cli}</code>
                <a href={`${studioBase()}/api/v2/tools?lang=${language}`} target="_blank" rel="noreferrer">
                  GET /api/v2/tools
                </a>
                <button type="button" onClick={() => void copyCatalog()}>
                  {t('카탈로그 JSON 복사', 'Copy catalog JSON', '复制目录 JSON', 'カタログ JSON をコピー')}
                </button>
              </div>
              <pre>{catalogJson}</pre>
            </div>
          ) : (
            <p className="tools-more-hint">
              {t(
                '규칙·금지·JSON은 봇 설명서와 이 버튼 뒤에만 있습니다.',
                'Rules, bans, and JSON stay behind this button and the bot guide.',
                '规则、禁令和 JSON 只在这个按钮和机器人说明书后面。',
                'ルール・禁止・JSON はこのボタンとボットガイドの後ろにだけあります。',
              )}
            </p>
          )}
        </section>
      </main>
    </>
  );
}
