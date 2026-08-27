'use client';

import { LanguageSwitcher, useLanguage } from './language';
import Link from 'next/link';
import { PlanningBanner } from './planning-banner';
import { useWorkspaceProfile } from './workspace-profile';

const sections = [
  { id: 'desktop', href: '/', ko: '화면', en: 'Screen', zh: '画面', ja: '画面', live: true },
  { id: 'tools', href: '/tools', ko: '도구', en: 'Tools', zh: '工具', ja: 'ツール' },
  { id: 'production', href: '/production', ko: '제작', en: 'Production', zh: '制作', ja: '制作', live: true },
  { id: 'bots', href: '/bots', ko: '봇 확인', en: 'Bot check', zh: '机器人检查', ja: 'ボット確認', live: true },
  { id: 'edit', href: '/edit', ko: '편집실', en: 'Edit lab', zh: '编辑室', ja: '編集ラボ' },
  { id: 'cut', href: '/cut', ko: '컷 로그', en: 'Cut log', zh: '剪辑记录', ja: 'カットログ' },
  { id: 'operations', href: '/operations', ko: '운영 센터', en: 'Operations', zh: '运营中心', ja: 'オペレーション' },
  { id: 'terminal', href: '/terminal', ko: '터미널', en: 'Terminal', zh: '终端', ja: 'ターミナル' },
  { id: 'bot-guide', href: '/bot-guide', ko: '봇 설명서', en: 'Bot guide', zh: '机器人指南', ja: 'ボットガイド' },
  { id: 'library', href: '/library', ko: '라이브러리', en: 'Library', zh: '素材库', ja: 'ライブラリ' },
  { id: 'agent', href: '/agent', ko: '에이전트', en: 'Agent', zh: '智能体', ja: 'エージェント' },
  { id: 'connect', href: '/connect', ko: '로컬 도구', en: 'Local tools', zh: '本地工具', ja: 'ローカルツール' },
  { id: 'packet', href: '/packet', ko: '패킷', en: 'Packet', zh: '数据包', ja: 'パケット' },
  { id: 'gates', href: '/gates', ko: '게이트', en: 'Gates', zh: '关卡', ja: 'ゲート' },
  { id: 'export', href: '/export', ko: '내보내기', en: 'Export', zh: '导出', ja: 'エクスポート' },
  { id: 'privacy', href: '/privacy', ko: '개인정보·설정', en: 'Privacy & settings', zh: '隐私与设置', ja: 'プライバシー・設定' },
];

const primarySections = sections.slice(0, 4);
const moreSections = sections.slice(4);

function NavLabel({ section, t }: { section: (typeof sections)[number]; t: (ko: string, en: string, zh: string, ja: string) => string }) {
  return <>{t(section.ko, section.en, section.zh, section.ja)}{section.live ? <span className="nav-live-dot" title={t('이 페이지에서 실제 렌더·게시·봇 기록이 일어납니다', 'Real render, publish, or bot activity happens on this page', '这个页面会发生真实的渲染、发布或机器人记录', 'このページでは実際にレンダー・公開・ボット記録が発生します')}>{t('실행', 'LIVE', '运行中', '稼働中')}</span> : null}</>;
}

export function SiteHeader({ current }: { current: string }) {
  const { t } = useLanguage();
  const { profile } = useWorkspaceProfile();
  return (
    <>
      <header className="site-header">
        <Link href="/tools" className="wordmark">
          <span>{profile.workspaceName}</span>
          <i>{t('고급 도구', 'Advanced tools', '高级工具', '高度なツール')}</i>
        </Link>
        <nav aria-label={t('고급 도구 메뉴', 'Advanced tools navigation', '高级工具导航', '高度なツールのナビ')}>
          {primarySections.map((section) => (
            <Link className={section.id === current ? 'current' : ''} href={section.href} key={section.id}>
              <NavLabel section={section} t={t} />
            </Link>
          ))}
          <details className={`header-more ${moreSections.some((section) => section.id === current) ? 'current' : ''}`}>
            <summary>{t('더보기', 'More', '更多', 'もっと見る')}</summary>
            <div>
              {moreSections.map((section) => (
                <Link className={section.id === current ? 'current' : ''} href={section.href} key={section.id}>
                  <NavLabel section={section} t={t} />
                </Link>
              ))}
            </div>
          </details>
        </nav>
        <LanguageSwitcher />
        <div className="header-meta">
          <span>{t('이 기기에서만 실행', 'This device only', '仅在本设备运行', 'この端末でのみ動作')}</span>
          <b>LOCAL FIRST</b>
        </div>
      </header>
      <PlanningBanner current={current} />
    </>
  );
}
