'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ADVANCED_TOOLS,
  ADVANCED_TOOLS_NEVER,
  ADVANCED_TOOLS_RULE,
  ADVANCED_TOOLS_SCHEMA,
  draftAdvancedTools,
  formatToolApi,
  liveAdvancedTools,
  localizeQuad,
  type AdvancedTool,
} from './advanced-tools';
import { useLanguage } from './language';
import { SiteHeader } from './site-header';

type CatalogPayload = {
  schema: string;
  rule: string;
  cli: string;
  never: string[];
  tools: Array<{
    id: string;
    url: string;
    live: boolean;
    name: string;
    use_when: string;
    never: string;
    bot_api: { read: string[]; write: string[] };
    cli: string[];
  }>;
};

function studioBase() {
  return typeof window !== 'undefined' && window.grokCrew?.apiBase ? window.grokCrew.apiBase : 'http://127.0.0.1:7214';
}

function ToolLink({
  tool,
  t,
}: {
  tool: AdvancedTool;
  t: (ko: string, en: string, zh: string, ja: string) => string;
}) {
  const apiLine = formatToolApi(tool);
  return (
    <Link href={tool.url} className={tool.live ? 'tools-card is-live' : 'tools-card'}>
      <div>
        <b>{t(...tool.name)}</b>
        {tool.live ? <span>{t('실행', 'Live', '运行', '稼働')}</span> : <span>{t('초안', 'Draft', '草稿', '草案')}</span>}
      </div>
      <p>{t(...tool.detail)}</p>
      {apiLine ? <code className="tools-card-api">{apiLine}</code> : <code className="tools-card-api is-empty">{t('봇 API 없음 · 사람용 초안', 'No bot API · human draft', '无机器人 API · 给人看的草稿', 'ボット API なし · 人用の草案')}</code>}
      <small>{t(...tool.never)}</small>
      <em>{t('열기', 'Open', '打开', '開く')} →</em>
    </Link>
  );
}

export default function LegacyTools() {
  const { t, language } = useLanguage();
  const [catalog, setCatalog] = useState<CatalogPayload | null>(null);
  const [catalogState, setCatalogState] = useState<'loading' | 'ready' | 'fallback'>('loading');
  const [copied, setCopied] = useState(false);
  const liveTools = useMemo(() => liveAdvancedTools(), []);
  const previewTools = useMemo(() => draftAdvancedTools(), []);

  useEffect(() => {
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      void fetch(`${studioBase()}/api/v2/tools?lang=${language}`)
        .then(async (response) => {
          if (!response.ok) throw new Error(String(response.status));
          return response.json() as Promise<CatalogPayload>;
        })
        .then((payload) => {
          if (cancelled) return;
          if (payload?.schema !== ADVANCED_TOOLS_SCHEMA || !Array.isArray(payload.tools)) throw new Error('bad catalog');
          setCatalog(payload);
          setCatalogState('ready');
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

  const fallbackCatalog = useMemo<CatalogPayload>(
    () => ({
      schema: ADVANCED_TOOLS_SCHEMA,
      rule: localizeQuad(ADVANCED_TOOLS_RULE, language),
      cli: 'python local_studio/grok_crew.py tools [--lang ko]',
      never: ADVANCED_TOOLS_NEVER.map((item) => localizeQuad(item, language)),
      tools: ADVANCED_TOOLS.map((tool) => ({
        id: tool.id,
        url: tool.url,
        live: tool.live,
        name: localizeQuad(tool.name, language),
        use_when: localizeQuad(tool.useWhen, language),
        never: localizeQuad(tool.never, language),
        bot_api: { read: tool.botApi.read, write: tool.botApi.write },
        cli: tool.cli,
      })),
    }),
    [language],
  );
  const shownCatalog = catalog ?? fallbackCatalog;
  const catalogJson = JSON.stringify(shownCatalog, null, 2);

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
              {t('예전 콘솔을', 'Older consoles,', '旧控制台', '以前のコンソールを')}
              <br />
              <span>{t('부드러운 낮으로 모아 두었습니다.', 'kept in a soft-day desk.', '用柔昼收在这里。', 'やわらかい昼にまとめています。')}</span>
            </h1>
            <p>
              {t(
                '컷과 쇼츠 게시는 기본 화면에 그대로 있습니다. 여기서 실제로 도는 것은 렌더 대기열과 봇 기록뿐입니다. 봇은 이 화면을 긁지 않고 GET /api/v2/tools를 읽습니다.',
                'Cuts and short-form publishing stay on the main screen. Only the render queue and bot log still run here. Bots read GET /api/v2/tools instead of scraping this page.',
                '剪辑和短视频发布仍在主画面。这里真正运行的只有渲染队列和机器人记录。机器人读 GET /api/v2/tools，不抓这个页面。',
                'カットとショート公開は基本画面のままです。ここで実際に動くのはレンダーキューとボット記録だけです。ボットはこの画面を掻かず GET /api/v2/tools を読みます。',
              )}
            </p>
            <div className="tools-hero-actions">
              <Link href="/">{t('기본 화면으로', 'Back to the main screen', '回到主画面', '基本画面へ')}</Link>
              <Link href="/production" className="tools-secondary-action">{t('제작 콘솔 열기', 'Open Production', '打开制作台', '制作コンソールを開く')}</Link>
            </div>
          </div>
          <aside>
            <span>{t('이 기기에서만', 'THIS DEVICE ONLY', '仅限本设备', 'この端末のみ')}</span>
            <b>GET /api/v2/tools</b>
            <p>{t('사이트를 긁지 않습니다. 문은 편집과 수집을 섞지 않습니다.', 'This app does not scrape sites. Editor and collector doors stay separate.', '不抓网站。剪辑门和收集门不混用。', 'サイトは掻きません。編集と収集のドアは混ぜません。')}</p>
          </aside>
        </section>

        <section className="tools-bot" aria-live="polite">
          <div className="tools-section-head">
            <h2>{t('봇이 쓰는 목록', 'Catalog for bots', '给机器人的目录', 'ボット用カタログ')}</h2>
            <p>
              {catalogState === 'ready'
                ? t('Local Studio에서 방금 받은 카탈로그입니다.', 'This catalog just came from Local Studio.', '这份目录刚从 Local Studio 取得。', 'Local Studio から今受け取ったカタログです。')
                : catalogState === 'loading'
                  ? t('카탈로그를 불러오는 중입니다.', 'Loading the catalog.', '正在读取目录。', 'カタログを読み込んでいます。')
                  : t('로컬 서비스에 연결하지 못해 내장 목록을 표시합니다.', 'Local Studio is unavailable, so the built-in catalog is shown.', '无法连接本地服务，正在显示内置目录。', 'ローカルサービスに接続できないため、内蔵カタログを表示しています。')}
            </p>
          </div>
          <div className="tools-bot-panel">
            <p>{shownCatalog.rule}</p>
            <ol>
              {shownCatalog.never.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
            <div className="tools-bot-actions">
              <code>{shownCatalog.cli}</code>
              <button type="button" onClick={() => void copyCatalog()}>
                {copied
                  ? t('JSON 복사됨', 'JSON copied', '已复制 JSON', 'JSON をコピーしました')
                  : t('카탈로그 JSON 복사', 'Copy catalog JSON', '复制目录 JSON', 'カタログ JSON をコピー')}
              </button>
            </div>
            <pre>{catalogJson}</pre>
          </div>
        </section>

        <section className="tools-section">
          <div className="tools-section-head">
            <h2>{t('실행', 'Live', '运行', '稼働')}</h2>
            <p>{t('Local Studio가 켜져 있으면 여기서 실제 작업이 돌아갑니다.', 'These pages can start real jobs when Local Studio is on.', 'Local Studio 开启时，这些页面会启动真实任务。', 'Local Studio が起動していれば、ここで実ジョブが始まります。')}</p>
          </div>
          <div className="tools-grid tools-grid-live">
            {liveTools.map((tool) => <ToolLink key={tool.url} tool={tool} t={t} />)}
          </div>
        </section>

        <section className="tools-section">
          <div className="tools-section-head">
            <h2>{t('기획·미리보기', 'Planning & preview', '策划与预览', '企画・プレビュー')}</h2>
            <p>{t('초안과 안내입니다. 컷을 바꾸거나 렌더를 시작하지 않습니다. 적힌 API만 호출하세요.', 'Drafts and guides. They do not change a cut or start a render. Call only the listed APIs.', '草稿和说明。不会改剪辑，也不会开始渲染。只调用列出的 API。', '草案と案内です。カットは変えず、レンダーも始めません。書かれた API だけを呼んでください。')}</p>
          </div>
          <div className="tools-grid">
            {previewTools.map((tool) => <ToolLink key={tool.url} tool={tool} t={t} />)}
          </div>
        </section>
      </main>
    </>
  );
}
