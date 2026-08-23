'use client';

import Link from 'next/link';
import { useLanguage } from './language';
import { SiteHeader } from './site-header';

const workspaces = [
  { href: '/production', index: '01', ko: '프로젝트 만들기', en: 'Create a project', koDetail: '원본 경로와 편집 구간을 넣고, 브라우저 승인 또는 봇의 자동 로컬 렌더를 준비합니다.', enDetail: 'Add source paths and edit segments, then prepare browser-approved or bot-automatic local rendering.' },
  { href: '/operations', index: '02', ko: '편집안 검사하기', en: 'Inspect the edit', koDetail: '대본 컷 맵, 미디어 검사, QA, 브랜드 키트와 작업 보드를 한곳에서 관리합니다.', enDetail: 'Manage cut maps, media inspection, QA, brand kits, and the task board in one place.' },
  { href: '/terminal', index: '03', ko: '봇 연결하기', en: 'Connect a bot', koDetail: '복제본에 포함된 CLI로 봇을 입장시키고 로컬 작업을 시작합니다.', enDetail: 'Use the included CLI to enter a bot and begin local work.' },
];

const steps = [
  { ko: '로컬 작업 공간 시작', en: 'Start the local workspace', detailKo: 'GitHub 복제본의 최상위 폴더에서 npm run local을 실행합니다.', detailEn: 'Run npm run local from the top folder of the GitHub clone.' },
  { ko: '프로젝트와 편집 방식 정하기', en: 'Set the project and edit method', detailKo: 'Production에서 프로젝트를 만들고, 필요하면 봇이 편집 방식을 제안하게 합니다.', detailEn: 'Create a project in Production, then let a bot propose an edit method if needed.' },
  { ko: '봇의 실행 정책 선택', en: 'Choose a bot execution policy', detailKo: '입장한 봇은 기본 자동 로컬 렌더를 사용하거나 렌더마다 사람 승인을 받도록 바꿀 수 있습니다. Instagram 게시은 항상 사람이 결정합니다.', detailEn: 'An entered bot defaults to automatic local rendering or can require a person for every render. Instagram publishing is always decided by a person.' },
];

export default function HomeConsole() {
  const { t } = useLanguage();
  return <><SiteHeader current="studio" /><main className="home-main">
    <section className="home-hero"><div><p className="kicker">LOCAL VIDEO WORKSPACE · BOT READY</p><h1>{t('봇과 함께 만드는', 'Make videos with')}<br /><span>{t('내 컴퓨터의 영상 제작실.', 'bots on your own computer.')}</span></h1><p>{t('FrameCrew Reel Forge는 영상 편집 계획·검사·렌더 대기열을 한 곳에서 다루는 로컬 작업 공간입니다. 파일과 기록은 이 기기에만 남고, 봇은 승인 범위 안에서만 작업합니다.', 'FrameCrew Reel Forge is a local workspace for video edit planning, checks, and render queues. Files and records stay on this device, and bots work only within approved boundaries.')}</p><div className="home-hero-actions"><Link href="/production">{t('첫 프로젝트 만들기', 'Create your first project')} →</Link><Link href="/terminal" className="home-secondary-action">{t('봇 터미널 열기', 'Open bot terminal')}</Link></div></div><aside><span>LOCAL ONLY</span><b>127.0.0.1</b><p>{t('외부 서버나 데이터베이스 없이 이 컴퓨터에서 실행됩니다.', 'Runs on this computer without an external server or database.')}</p><div><i>01</i><strong>{t('파일', 'Files')}</strong><em>{t('이 기기', 'This device')}</em></div><div><i>02</i><strong>{t('봇 기록', 'Bot records')}</strong><em>SQLite</em></div><div><i>03</i><strong>{t('최종 승인', 'Final approval')}</strong><em>{t('사람', 'Human')}</em></div></aside></section>
    <section className="home-start"><div className="home-section-head"><div><p className="kicker">START HERE</p><h2>{t('처음이라면 이 순서로 시작하세요.', 'Start here if this is your first time.')}</h2></div><p>{t('각 화면은 다음 작업으로 자연스럽게 이어집니다. 모든 단계는 나중에 다시 열어 이어서 할 수 있습니다.', 'Each workspace leads naturally to the next step. You can return and continue any step later.')}</p></div><div className="home-step-grid">{steps.map((step, index) => <article key={step.en}><i>{String(index + 1).padStart(2, '0')}</i><div><b>{t(step.ko, step.en)}</b><p>{t(step.detailKo, step.detailEn)}</p></div></article>)}</div></section>
    <section className="home-workspaces"><div className="home-section-head"><div><p className="kicker">WORKSPACES</p><h2>{t('무엇을 하려는지에 맞춰 들어가세요.', 'Open the workspace that matches your next job.')}</h2></div><p>{t('복잡한 메뉴를 모두 알 필요가 없습니다. 아래 세 곳에서 대부분의 작업을 시작할 수 있습니다.', 'You do not need to learn every menu. Most work begins in one of these three places.')}</p></div><div className="home-workspace-grid">{workspaces.map((space) => <Link href={space.href} key={space.href}><i>{space.index}</i><b>{t(space.ko, space.en)}</b><p>{t(space.koDetail, space.enDetail)}</p><span>{t('열기', 'Open')} →</span></Link>)}</div></section>
    <section className="home-safety"><b>{t('봇이 할 수 있는 일', 'What bots can do')}</b><p>{t('입장한 봇은 프로젝트·컷 맵·검사·작업 보드·편집 방식과 로컬 렌더를 사용합니다. 렌더는 봇별로 자동 또는 사람 승인 모드를 선택하고, Instagram 실제 게시은 항상 사람 승인이 필요합니다.', 'Entered bots use projects, cut maps, checks, task boards, edit methods, and local rendering. Each bot chooses automatic or human-approved rendering; Instagram publishing always requires a person.')}</p><Link href="/bot-guide">{t('봇 작업 설명서 보기', 'Read the bot guide')} →</Link></section>
  </main></>;
}
