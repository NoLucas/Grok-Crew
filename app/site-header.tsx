'use client';

import { LanguageSwitcher, useLanguage } from './language';
import Link from 'next/link';
import { useWorkspaceProfile } from './workspace-profile';

const sections = [
  { id: 'studio', href: '/', ko: '스튜디오', en: 'Studio' },
  { id: 'edit', href: '/edit', ko: '편집실', en: 'Edit lab' },
  { id: 'cut', href: '/cut', ko: '컷 로그', en: 'Cut log' },
  { id: 'production', href: '/production', ko: '제작', en: 'Production' },
  { id: 'operations', href: '/operations', ko: '운영 센터', en: 'Operations' },
  { id: 'bots', href: '/bots', ko: '봇 확인', en: 'Bot check' },
  { id: 'terminal', href: '/terminal', ko: '터미널', en: 'Terminal' },
  { id: 'bot-guide', href: '/bot-guide', ko: '봇 설명서', en: 'Bot guide' },
  { id: 'library', href: '/library', ko: '라이브러리', en: 'Library' },
  { id: 'agent', href: '/agent', ko: '에이전트', en: 'Agent desk' },
  { id: 'connect', href: '/connect', ko: '로컬 도구', en: 'Local desk' },
  { id: 'packet', href: '/packet', ko: '패킷', en: 'Packet' },
  { id: 'gates', href: '/gates', ko: '게이트', en: 'Gate board' },
  { id: 'export', href: '/export', ko: '내보내기', en: 'Export' },
  { id: 'privacy', href: '/privacy', ko: '개인정보·설정', en: 'Privacy & settings' },
];

const primarySections = sections.slice(0, 8);
const moreSections = sections.slice(8);

export function SiteHeader({ current }: { current: string }) {
  const { t } = useLanguage();
  const { profile } = useWorkspaceProfile();
  return <header className="site-header"><Link href="/" className="wordmark"><span>{profile.workspaceName}</span><i>{t('로컬 스튜디오', 'Local Studio')}</i></Link><nav aria-label={t('주요 메뉴', 'Primary navigation')}>{primarySections.map((section) => <Link className={section.id === current ? 'current' : ''} href={section.href} key={section.id}>{t(section.ko, section.en)}</Link>)}<details className={`header-more ${moreSections.some((section) => section.id === current) ? 'current' : ''}`}><summary>{t('더보기', 'More')}</summary><div>{moreSections.map((section) => <Link className={section.id === current ? 'current' : ''} href={section.href} key={section.id}>{t(section.ko, section.en)}</Link>)}</div></details></nav><LanguageSwitcher /><div className="header-meta"><span>{t('이 기기에서만 실행', 'This device only')}</span><b>LOCAL FIRST</b></div></header>;
}
