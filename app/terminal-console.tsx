'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from './language';
import { SiteHeader } from './site-header';

type Health = { status: string; bind: string; moviepy_installed: boolean; bots?: { active_now: number } };
const studio = 'http://127.0.0.1:7214';
const productionUrl = 'http://localhost:3000/production';
const cloneBootstrap = 'python local_studio/grok_crew.py contract';

const powershellDownload = 'Invoke-WebRequest http://127.0.0.1:7214/downloads/grok-crew.py -OutFile grok-crew.py; python grok-crew.py contract';
const shellDownload = 'curl -fsS http://127.0.0.1:7214/downloads/grok-crew.py -o grok-crew.py && python3 grok-crew.py contract';
const firstEntry = 'python grok-crew.py entry --bot-id grok-editor-01 --display-name "Grok Editor" --purpose edit_video --task "Prepare a transcript-first edit plan."';
const commands = [
  ['시작과 상태', 'health · contract · guide · site --page production · entry · heartbeat · bots list|activity|entries', '로컬 서비스 상태를 읽고, 브라우저 작업 주소·봇 입장·활동 기록을 남깁니다.'],
  ['프로젝트와 편집 방식', 'projects list|get|create · method get|set', '프로젝트·EDL을 만들고 공유 편집 방식을 설정합니다.'],
  ['P0–P2 운영', 'ops show|inspect|cut-map|quality|artifact|update · brand list|save', '대본 컷 맵, 검사, QA, 봇 작업, 메모, 오디오, 버전, 오버레이, 성과 기록을 사용합니다.'],
  ['승인된 전달', 'jobs list|render|instagram|run', '사람 승인이 이미 기록된 렌더·게시 작업만 대기열에 넣거나 실행합니다.'],
];

export default function TerminalConsole() {
  const { t } = useLanguage();
  const [health, setHealth] = useState<Health | null>(null);
  const [copied, setCopied] = useState('');
  const [message, setMessage] = useState('로컬 터미널 연결을 확인하는 중입니다.');
  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`${studio}/health`); const value = await response.json() as Health & { error?: string };
      if (!response.ok) throw new Error(value.error ?? 'local service unavailable');
      setHealth(value); setMessage('Grok bot 터미널은 이 PC의 Local Studio에만 연결됩니다.');
    } catch (error) { setHealth(null); setMessage(error instanceof Error ? `${error.message} — Local Studio를 먼저 실행하세요.` : 'Local Studio에 연결할 수 없습니다.'); }
  }, []);
  useEffect(() => { const timeout = window.setTimeout(() => { void refresh(); }, 0); return () => window.clearTimeout(timeout); }, [refresh]);
  const copy = async (name: string, value: string) => { await navigator.clipboard?.writeText(value); setCopied(name); window.setTimeout(() => setCopied(''), 1700); };

  return <><SiteHeader current="terminal" /><main className="terminal-main">
    <section className="terminal-hero"><div><p className="kicker">GROK CREW · TERMINAL CLI</p><h1>{t('각 bot의 터미널에서', 'Give every bot terminal')}<br /><span>{t('로컬 편집 도구를 실행하세요.', 'the complete local editor.')}</span></h1><p>{t('Grok bot은 이 PC의 각 터미널에서 작은 CLI 파일을 내려받아, 입장·편집·검사·운영·승인된 전달 작업을 브라우저 없이 실행할 수 있습니다.', 'A Grok bot can download one small CLI file in each terminal on this PC and run entry, editing, QA, operations, and approved delivery work without browser interaction.')}</p></div><aside className={`terminal-health ${health ? 'ready' : ''}`}><span>LOCAL CLI GATEWAY</span><b>{health ? 'READY TO DOWNLOAD' : 'SERVICE OFFLINE'}</b><p>{health ? `127.0.0.1 · ${health.moviepy_installed ? 'MoviePy ready' : 'render setup needed'} · ${health.bots?.active_now ?? 0} active bot(s)` : 'Local Studio를 실행하면 다운로드 주소가 열립니다.'}</p><button onClick={() => void refresh()}>연결 다시 확인</button></aside></section>
    <section className="terminal-rule"><b>같은 PC 전용</b><span>CLI는 <code>127.0.0.1</code> 또는 <code>localhost</code> 이외의 주소로 연결할 수 없습니다. 외부 Grok API·클라우드 서버·외부 데이터베이스는 사용하지 않습니다.</span></section>
    <section className="terminal-port-map"><article><span>BOT CLI · JSON API</span><b>127.0.0.1:7214</b><p>{t('다운로드·명령·데이터용 주소입니다. 이 주소에 /production 같은 화면 경로를 붙이지 마세요.', 'Use this for downloads, commands, and data. Do not append browser paths such as /production.')}</p></article><article><span>BROWSER WORKSPACE · SCREENSHOT</span><b>localhost:3000</b><p>{t('화면 열기·스크린샷은 이 주소입니다. CLI에서는 site --page production으로 정확한 주소를 받습니다.', 'Open pages and take screenshots here. In the CLI, use site --page production to print the exact URL.')}</p><div><code>{productionUrl}</code><button onClick={() => void copy('production-url', productionUrl)}>{copied === 'production-url' ? t('복사됨', 'Copied') : t('편집 화면 주소 복사', 'Copy editor URL')}</button></div></article></section>
    <section className="terminal-clone"><div><p className="kicker">GITHUB CLONE · BUILT-IN BOT CLI</p><h2>{t('복제본에는 봇 CLI가 이미 들어 있습니다.', 'Every clone already includes the bot CLI.')}</h2><p>{t('GitHub에서 내려받은 폴더의 최상위에서 실행하세요. 파일을 다시 내려받을 필요가 없으므로 구버전 CLI 혼동도 없습니다.', 'Run this from the top folder of a GitHub clone. No additional download means no stale-CLI confusion.')}</p></div><div><code>{cloneBootstrap}</code><button onClick={() => void copy('clone-bootstrap', cloneBootstrap)}>{copied === 'clone-bootstrap' ? t('복사됨', 'Copied') : t('복제본 CLI 명령 복사', 'Copy clone CLI command')}</button></div></section>
    <section className="terminal-download-grid"><article className="terminal-card"><div className="terminal-card-head"><span>01 · WINDOWS / POWERSHELL</span><button onClick={() => void copy('powershell', powershellDownload)}>{copied === 'powershell' ? '복사됨' : '명령 복사'}</button></div><pre>{powershellDownload}</pre><p>각 Grok bot 터미널에서 실행하면 현재 Local Studio가 제공하는 CLI를 내려받고 기능 계약을 확인합니다.</p></article><article className="terminal-card"><div className="terminal-card-head"><span>02 · MAC / LINUX SHELL</span><button onClick={() => void copy('shell', shellDownload)}>{copied === 'shell' ? '복사됨' : '명령 복사'}</button></div><pre>{shellDownload}</pre><p>같은 로컬 장치에서만 실행하세요. 원격 서버나 인터넷 주소로는 연결되지 않습니다.</p></article></section>
    <section className="terminal-flow"><div className="terminal-flow-head"><div><p className="kicker">BOT START SEQUENCE</p><h2>내려받고 · 입장하고 · <span>작업을 이어갑니다.</span></h2></div><button onClick={() => void copy('entry', firstEntry)}>{copied === 'entry' ? '입장 명령 복사됨' : '첫 입장 명령 복사'}</button></div><pre>{firstEntry}</pre><div className="terminal-flow-steps"><article><i>01</i><b>contract</b><p>CLI가 가진 모든 명령과 승인 규칙을 읽습니다.</p></article><article><i>02</i><b>entry</b><p>봇 이름·목적·작업을 기록하고 첫 체크인을 남깁니다.</p></article><article><i>03</i><b>guide / ops</b><p>편집 설명서를 읽고 대본·검사·작업 보드로 진행합니다.</p></article><article><i>04</i><b>heartbeat</b><p>의미 있는 상태가 바뀔 때 활동 기록을 갱신합니다.</p></article></div></section>
    <section className="terminal-capabilities"><div className="terminal-section-head"><div><p className="kicker">FULL LOCAL CAPABILITY MAP</p><h2>브라우저 화면의 운영 기능을<br /><span>터미널에서도 같은 계약으로.</span></h2></div><p>복잡한 JSON 입력은 파일로 전달합니다. 예: <code>--file project.json</code>. CLI는 별도 패키지를 설치하지 않습니다.</p></div><div className="terminal-command-list">{commands.map(([title, code, description], index) => <article key={title}><i>{String(index + 1).padStart(2, '0')}</i><div><b>{title}</b><code>{code}</code><p>{description}</p></div></article>)}</div></section>
    <section className="terminal-safety-grid"><article className="terminal-card token-card"><div className="terminal-card-head"><span>LOCAL TOKEN</span><em>optional protection</em></div><h3>토큰은 bot 터미널에만 둡니다.</h3><p>보호 토큰을 켠 경우에만 각 터미널 환경 변수 <code>LOCAL_STUDIO_TOKEN</code>으로 전달하세요. CLI와 웹사이트, SQLite는 토큰을 저장하거나 읽지 않습니다.</p><button onClick={() => void copy('contract', `${studio}/api/terminal-contract`)}>{copied === 'contract' ? '계약 주소 복사됨' : '터미널 계약 주소 복사'}</button></article><article className="terminal-card approval-card"><div className="terminal-card-head"><span>APPROVAL BOUNDARY</span><em>never bypassed</em></div><h3>모든 기능이 승인 권한을 뜻하지는 않습니다.</h3><p>CLI는 렌더·Instagram 대기열·작업 실행 시 <code>--human-approved</code>를 요구합니다. 실제 게시에는 서버 게시 허용과 <code>PUBLISH</code> 확인도 별도로 필요합니다.</p></article><article className="terminal-card"><div className="terminal-card-head"><span>LIVE STATUS</span><em>{health ? 'connected' : 'offline'}</em></div><h3>현재 로컬 실행 상태</h3><p>{message}</p><Link href="/bots">봇 활동 확인으로 이동 →</Link></article></section>
  </main></>;
}
