'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ADVANCED_TOOLS_SCHEMA,
  draftAdvancedTools,
  featuredAdvancedTools,
  liveAdvancedTools,
  moreAdvancedTools,
  primaryToolApi,
  toolCatalogPayload,
  type AdvancedTool,
  type ToolCatalogPayload,
} from './advanced-tools';
import { useLanguage } from './language';
import { SiteHeader } from './site-header';

function studioBase() {
  return typeof window !== 'undefined' && window.grokCrew?.apiBase ? window.grokCrew.apiBase : 'http://127.0.0.1:7214';
}

function ToolCard({
  tool,
  t,
}: {
  tool: AdvancedTool;
  t: (ko: string, en: string, zh: string, ja: string) => string;
}) {
  const apiLine = primaryToolApi(tool);
  return (
    <Link href={tool.url} className={tool.screenLive ? 'tools-card is-live' : 'tools-card'}>
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
      <em>{t('열기', 'Open', '打开', '開く')} →</em>
    </Link>
  );
}

export default function LegacyTools() {
  const { t, language } = useLanguage();
  const [catalog, setCatalog] = useState<ToolCatalogPayload | null>(null);
  const [catalogState, setCatalogState] = useState<'loading' | 'ready' | 'fallback'>('loading');
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const liveTools = useMemo(() => liveAdvancedTools(), []);
  const previewTools = useMemo(() => draftAdvancedTools(), []);
  const extraTools = useMemo(() => moreAdvancedTools(), []);
  const featuredCount = useMemo(() => featuredAdvancedTools().length, []);

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

  const fallbackCatalog = useMemo(() => toolCatalogPayload(language), [language]);
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
              {t('실행 두 개와', 'Two live consoles', '两个运行台', '稼働コンソール 2 つと')}
              <br />
              <span>{t('봇이 치는 API만 둡니다.', 'and the APIs a bot actually hits.', '和机器人会打的 API。', 'ボットが叩く API だけ置きます。')}</span>
            </h1>
            <p>
              {t(
                '기본 화면은 그대로 둡니다. 에이전트·패킷처럼 API가 없는 초안은 아래 더보기에서 엽니다.',
                'The main screen stays put. Agent, packet, and other API-less drafts open under More below.',
                '主画面不动。智能体、数据包这类没有 API 的草稿在下面的“更多”里打开。',
                '基本画面はそのままです。エージェントやパケットなど API のない草案は下の「もっと見る」から開きます。',
              )}
            </p>
            <div className="tools-hero-actions">
              <Link href="/" target="_blank" rel="noopener noreferrer">
                {t('기본 화면으로', 'Open main screen', '打开主画面', '基本画面を開く')}
              </Link>
              <Link href="/production" className="tools-secondary-action">
                {t('제작 콘솔 열기', 'Open Production', '打开制作台', '制作コンソールを開く')}
              </Link>
            </div>
          </div>
          <aside>
            <span>{t('사람 화면 · 봇 API', 'HUMAN SCREEN · BOT API', '人看的画面 · 机器人 API', '人の画面 · ボット API')}</span>
            <b>{t('배지를 둘로', 'Two badges', '两枚徽章', 'バッジは二つ')}</b>
            <p>
              {t(
                '화면: 실행|초안. API: 있음|없음. 운영 센터는 화면은 초안, API는 살아 있습니다. 테마는 기본 화면 설정을 따릅니다.',
                'Screen: live or draft. API: live or none. Operations is a draft screen with live APIs. Theme follows the main-screen setting.',
                '画面：运行或草稿。API：有或无。运营中心画面是草稿，API 是活的。主题跟主画面设置。',
                '画面：稼働か草案。API：ありかなしか。運用センターは画面が草案で、API は生きています。テーマは基本画面の設定に従います。',
              )}
            </p>
          </aside>
        </section>

        <section className="tools-section">
          <div className="tools-section-head">
            <h2>{t('실행', 'Live', '运行', '稼働')}</h2>
            <p>{t('이 두 화면에서 렌더와 봇 기록이 됩니다.', 'These two screens still render and record bots.', '这两个页面仍会渲染并记录机器人。', 'この 2 画面ではレンダーとボット記録が残ります。')}</p>
          </div>
          <div className="tools-grid tools-grid-live">
            {liveTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} t={t} />
            ))}
          </div>
        </section>

        <section className="tools-section">
          <div className="tools-section-head">
            <h2>{t('초안 · 살아 있는 API', 'Draft screens, live APIs', '草稿画面，活着的 API', '草案画面 · 生きている API')}</h2>
            <p>{t('화면은 기획이고, 적힌 API는 실제입니다. 렌더는 시작하지 않습니다.', 'The screens are planning. The listed APIs are real. They do not start a render.', '画面是策划，列出的 API 是真的。不会开始渲染。', '画面は企画で、書かれた API は本物です。レンダーは始めません。')}</p>
          </div>
          <div className="tools-grid">
            {previewTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} t={t} />
            ))}
          </div>
        </section>

        <section className="tools-more" id="tools-more">
          <button type="button" className="tools-more-toggle" onClick={() => setMoreOpen((value) => !value)}>
            {moreOpen
              ? t('더보기 접기', 'Hide more', '收起更多', 'もっと見るを閉じる')
              : t(`더보기 · 편집실·에이전트·패킷 등 ${extraTools.length}개`, `More · ${extraTools.length} drafts`, `更多 · ${extraTools.length} 个草稿`, `もっと見る · 草案 ${extraTools.length}`)}
          </button>
          {moreOpen ? (
            <div className="tools-grid">
              {extraTools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} t={t} />
              ))}
            </div>
          ) : (
            <p className="tools-more-hint">
              {t(
                `허브에는 ${featuredCount}개만 둡니다. 편집실·터미널·에이전트·패킷은 여기 아래입니다.`,
                `The hub shows ${featuredCount} cards. Edit lab, terminal, agent, and packet sit here.`,
                `枢纽只放 ${featuredCount} 张。编辑室、终端、智能体、数据包在这里。`,
                `ハブには ${featuredCount} 枚だけ置きます。編集ラボ・ターミナル・エージェント・パケットはここにあります。`,
              )}
            </p>
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
                      '같은 local_studio/advanced-tools.json을 Local Studio가 방금 읽었습니다. 봇은 HTML이 아니라 이 JSON을 칩니다.',
                      'Local Studio just read the same local_studio/advanced-tools.json. Bots hit this JSON, not the HTML.',
                      'Local Studio 刚读了同一份 local_studio/advanced-tools.json。机器人打这份 JSON，不打 HTML。',
                      'Local Studio が同じ local_studio/advanced-tools.json を今読みました。ボットは HTML ではなくこの JSON を叩きます。',
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
                  {copied
                    ? t('JSON 복사됨', 'JSON copied', '已复制 JSON', 'JSON をコピーしました')
                    : t('카탈로그 JSON 복사', 'Copy catalog JSON', '复制目录 JSON', 'カタログ JSON をコピー')}
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
