'use client';

import Link from 'next/link';
import { useLanguage } from './language';
import { SiteHeader } from './site-header';

type ToolCard = {
  href: string;
  live?: boolean;
  ko: string;
  en: string;
  zh: string;
  ja: string;
  koDetail: string;
  enDetail: string;
  zhDetail: string;
  jaDetail: string;
};

const liveTools: ToolCard[] = [
  {
    href: '/production',
    live: true,
    ko: '제작',
    en: 'Production',
    zh: '制作',
    ja: '制作',
    koDetail: '로컬 프로젝트를 만들고 MoviePy 렌더와 Instagram 대기열을 돌립니다. 타임라인은 없습니다.',
    enDetail: 'Create a local project, then run MoviePy renders and the Instagram queue. There is no timeline here.',
    zhDetail: '创建本地项目，运行 MoviePy 渲染和 Instagram 队列。这里没有时间线。',
    jaDetail: 'ローカルプロジェクトを作り、MoviePy レンダーと Instagram キューを回します。タイムラインはありません。',
  },
  {
    href: '/bots',
    live: true,
    ko: '봇 확인',
    en: 'Bot check',
    zh: '机器人检查',
    ja: 'ボット確認',
    koDetail: '이 PC에 들어온 봇, 실행 정책, 최근 기록을 봅니다.',
    enDetail: 'See bots on this PC, their render policy, and recent activity.',
    zhDetail: '查看这台电脑上的机器人、执行策略和最近记录。',
    jaDetail: 'この PC に入ったボット、実行ポリシー、最近の記録を見ます。',
  },
];

const previewTools: ToolCard[] = [
  {
    href: '/edit',
    ko: '편집실',
    en: 'Edit lab',
    zh: '编辑室',
    ja: '編集ラボ',
    koDetail: '10초 연출 초안입니다. 실제 컷이 아닙니다.',
    enDetail: 'A 10-second motion draft. It is not a real cut.',
    zhDetail: '10 秒的演出草稿。不是真正的剪辑。',
    jaDetail: '10秒の演出草案です。実カットではありません。',
  },
  {
    href: '/cut',
    ko: '컷 로그',
    en: 'Cut log',
    zh: '剪辑记录',
    ja: 'カットログ',
    koDetail: '브라우저에만 남는 구간 메모입니다. 제작에서 새 프로젝트를 만들 때 읽습니다.',
    enDetail: 'Segment notes that stay in this browser. Production reads them when you create a project.',
    zhDetail: '只留在此浏览器的片段笔记。制作页新建项目时会读取。',
    jaDetail: 'このブラウザにだけ残る区間メモです。制作で新規プロジェクトを作るときに読みます。',
  },
  {
    href: '/operations',
    ko: '운영 센터',
    en: 'Operations',
    zh: '运营中心',
    ja: 'オペレーション',
    koDetail: '검사·작업 보드 초안입니다. 렌더를 시작하지 않습니다.',
    enDetail: 'A draft of inspections and the job board. It does not start a render.',
    zhDetail: '检查与任务看板的草稿。不会开始渲染。',
    jaDetail: '検査と作業ボードの草案です。レンダーは始めません。',
  },
  {
    href: '/terminal',
    ko: '터미널',
    en: 'Terminal',
    zh: '终端',
    ja: 'ターミナル',
    koDetail: '같은 PC 봇이 쓰는 CLI 안내입니다.',
    enDetail: 'CLI instructions for a bot on this same PC.',
    zhDetail: '给同一台电脑上的机器人用的 CLI 说明。',
    jaDetail: '同じ PC のボットが使う CLI 案内です。',
  },
  {
    href: '/bot-guide',
    ko: '봇 설명서',
    en: 'Bot guide',
    zh: '机器人指南',
    ja: 'ボットガイド',
    koDetail: '기계가 읽는 플레이북입니다.',
    enDetail: 'The machine-readable playbook.',
    zhDetail: '给机器读的操作手册。',
    jaDetail: '機械が読むプレイブックです。',
  },
  {
    href: '/library',
    ko: '라이브러리',
    en: 'Library',
    zh: '素材库',
    ja: 'ライブラリ',
    koDetail: '참고 메모입니다. 작업 공간 밖 파일을 열지 않습니다.',
    enDetail: 'Reference notes. It does not open files outside the workspace.',
    zhDetail: '参考笔记。不会打开工作区外的文件。',
    jaDetail: '参考メモです。作業空間の外のファイルは開きません。',
  },
  {
    href: '/agent',
    ko: '에이전트',
    en: 'Agent',
    zh: '智能体',
    ja: 'エージェント',
    koDetail: '프롬프트 계약 초안입니다. Cursor나 편집 Agent 연결이 아닙니다.',
    enDetail: 'A prompt-contract draft. It is not a Cursor or Editor Agent connection.',
    zhDetail: '提示词契约草稿。不是 Cursor 或剪辑 Agent 连接。',
    jaDetail: 'プロンプト契約の草案です。Cursor や編集 Agent の接続ではありません。',
  },
  {
    href: '/connect',
    ko: '로컬 도구',
    en: 'Local tools',
    zh: '本地工具',
    ja: 'ローカルツール',
    koDetail: '오프라인으로 넘길 JSON을 만듭니다.',
    enDetail: 'Build a JSON packet to hand off offline.',
    zhDetail: '生成离线交接用的 JSON。',
    jaDetail: 'オフラインで渡す JSON を作ります。',
  },
  {
    href: '/packet',
    ko: '패킷',
    en: 'Packet',
    zh: '数据包',
    ja: 'パケット',
    koDetail: '캡션 패키지 초안입니다.',
    enDetail: 'A caption-package draft.',
    zhDetail: '字幕包装草稿。',
    jaDetail: 'キャプション一式の草案です。',
  },
  {
    href: '/gates',
    ko: '게이트',
    en: 'Gates',
    zh: '关卡',
    ja: 'ゲート',
    koDetail: '게시 전 체크리스트 초안입니다.',
    enDetail: 'A pre-publish checklist draft.',
    zhDetail: '发布前检查清单草稿。',
    jaDetail: '公開前チェックリストの草案です。',
  },
  {
    href: '/export',
    ko: '내보내기',
    en: 'Export',
    zh: '导出',
    ja: 'エクスポート',
    koDetail: '출력 형식 초안입니다. 실제 MP4는 제작 또는 기본 화면에서 만듭니다.',
    enDetail: 'An output-format draft. Real MP4s come from Production or the main screen.',
    zhDetail: '输出格式草稿。真正的 MP4 在制作页或主画面生成。',
    jaDetail: '出力形式の草案です。実際の MP4 は制作または基本画面で作ります。',
  },
  {
    href: '/privacy',
    ko: '개인정보·설정',
    en: 'Privacy & settings',
    zh: '隐私与设置',
    ja: 'プライバシー・設定',
    koDetail: '이 기기 작업 공간 이름을 바꿉니다.',
    enDetail: 'Rename the workspace on this device.',
    zhDetail: '更改这台设备上的工作区名称。',
    jaDetail: 'この端末の作業空間名を変えます。',
  },
];

function ToolLink({
  tool,
  t,
}: {
  tool: ToolCard;
  t: (ko: string, en: string, zh: string, ja: string) => string;
}) {
  return (
    <Link href={tool.href} className={tool.live ? 'tools-card is-live' : 'tools-card'}>
      <div>
        <b>{t(tool.ko, tool.en, tool.zh, tool.ja)}</b>
        {tool.live ? <span>{t('실행', 'Live', '运行', '稼働')}</span> : <span>{t('초안', 'Draft', '草稿', '草案')}</span>}
      </div>
      <p>{t(tool.koDetail, tool.enDetail, tool.zhDetail, tool.jaDetail)}</p>
      <em>{t('열기', 'Open', '打开', '開く')} →</em>
    </Link>
  );
}

export default function LegacyTools() {
  const { t } = useLanguage();
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
              <span>{t('한곳에 모아 두었습니다.', 'kept in one place.', '集中放在这里。', 'ここにまとめています。')}</span>
            </h1>
            <p>
              {t(
                '컷과 쇼츠 게시는 기본 화면에서 합니다. 여기서 실제로 도는 것은 렌더 대기열과 봇 기록뿐입니다.',
                'Cuts and short-form publishing stay on the main screen. Only the render queue and bot log still run here.',
                '剪辑和短视频发布在主画面进行。这里真正运行的只有渲染队列和机器人记录。',
                'カットとショート公開は基本画面で行います。ここで実際に動くのはレンダーキューとボット記録だけです。',
              )}
            </p>
            <div className="tools-hero-actions">
              <Link href="/">{t('기본 화면으로', 'Back to the main screen', '回到主画面', '基本画面へ')}</Link>
              <Link href="/production" className="tools-secondary-action">{t('제작 콘솔 열기', 'Open Production', '打开制作台', '制作コンソールを開く')}</Link>
            </div>
          </div>
          <aside>
            <span>{t('이 기기에서만', 'THIS DEVICE ONLY', '仅限本设备', 'この端末のみ')}</span>
            <b>127.0.0.1</b>
            <p>{t('사이트를 긁지 않습니다. 문은 편집과 수집을 섞지 않습니다.', 'This app does not scrape sites. Editor and collector doors stay separate.', '不抓网站。剪辑门和收集门不混用。', 'サイトは掻きません。編集と収集のドアは混ぜません。')}</p>
          </aside>
        </section>

        <section className="tools-section">
          <div className="tools-section-head">
            <h2>{t('실행', 'Live', '运行', '稼働')}</h2>
            <p>{t('Local Studio가 켜져 있으면 여기서 실제 작업이 돌아갑니다.', 'These pages can start real jobs when Local Studio is on.', 'Local Studio 开启时，这些页面会启动真实任务。', 'Local Studio が起動していれば、ここで実ジョブが始まります。')}</p>
          </div>
          <div className="tools-grid tools-grid-live">
            {liveTools.map((tool) => <ToolLink key={tool.href} tool={tool} t={t} />)}
          </div>
        </section>

        <section className="tools-section">
          <div className="tools-section-head">
            <h2>{t('기획·미리보기', 'Planning & preview', '策划与预览', '企画・プレビュー')}</h2>
            <p>{t('초안과 안내입니다. 컷을 바꾸거나 렌더를 시작하지 않습니다.', 'Drafts and guides. They do not change a cut or start a render.', '草稿和说明。不会改剪辑，也不会开始渲染。', '草案と案内です。カットは変えず、レンダーも始めません。')}</p>
          </div>
          <div className="tools-grid">
            {previewTools.map((tool) => <ToolLink key={tool.href} tool={tool} t={t} />)}
          </div>
        </section>
      </main>
    </>
  );
}
