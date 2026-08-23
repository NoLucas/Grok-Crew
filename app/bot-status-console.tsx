'use client';
/* eslint-disable @next/next/no-html-link-for-pages */

import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from './language';
import { SiteHeader } from './site-header';

type Bot = { bot_id: string; display_name: string; last_action: string; last_detail_json: Record<string, unknown>; last_seen: string; presence: 'active' | 'idle'; seconds_since_checkin: number };
type Activity = { id: string; bot_id: string; action: string; detail_json: Record<string, unknown>; created_at: string };
type BotSummary = { total_known: number; active_now: number; activity_rule: string };
type Health = { status: string; bind: string; moviepy_installed: boolean; instagram_publish_enabled: boolean; bots?: BotSummary };

const studio = 'http://127.0.0.1:7214';
const capabilities = [
  ['편집 계획 작성', 'Cut Log의 자막·타임코드를 읽고, 남길 구간과 순서를 EDL로 준비합니다.', '자동 가능'],
  ['로컬 프로젝트 생성', '원본·결과 파일 경로, 캡션, EDL을 SQLite 프로젝트로 기록합니다.', '자동 가능'],
  ['작업 상태 읽기', '프로젝트·렌더·게시 작업의 대기, 실패, 완료 상태를 확인해 다음 행동을 정합니다.', '자동 가능'],
  ['품질 확인 제안', '빈 구간, 짧은 훅, 자막 길이, 릴 형식 문제를 찾아 수정안을 남깁니다.', '자동 가능'],
  ['렌더 작업 대기열', '사람이 편집안을 승인한 뒤에만 MoviePy 렌더 작업을 준비합니다.', '사람 승인 필요'],
  ['로컬 MP4 렌더 실행', '승인된 작업만 이 PC에서 9:16 H.264/AAC MP4로 만듭니다.', '사람 승인 필요'],
  ['Instagram 게시 준비', '캡션·공유 여부·완성 MP4를 게시 대기열로 넣습니다.', '사람 승인 필요'],
  ['Instagram 실제 게시', '서버 게시 허용 + 기록된 승인 + PUBLISH 확인이 모두 있을 때만 전송합니다.', '3중 승인 필요'],
  ['작업 이력 요약', '실패 원인·결과물 위치·마지막 작업을 짧은 운영 보고로 정리합니다.', '자동 가능'],
  ['자격증명 보호', 'Meta 토큰, 로컬 보호 토큰, .env 파일을 읽거나 노출할 수 없습니다.', '절대 금지'],
];

function dateTime(value: string) { return new Date(value).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
function since(seconds: number) { return seconds < 60 ? `${seconds}초 전` : seconds < 3600 ? `${Math.floor(seconds / 60)}분 전` : `${Math.floor(seconds / 3600)}시간 전`; }

export default function BotStatusConsole() {
  const { t } = useLanguage();
  const [health, setHealth] = useState<Health | null>(null);
  const [bots, setBots] = useState<Bot[]>([]);
  const [summary, setSummary] = useState<BotSummary | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [message, setMessage] = useState('로컬 봇 체크인을 읽는 중입니다.');
  const [lastRefresh, setLastRefresh] = useState('');
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const botRequest = `POST ${studio}/api/bots/heartbeat\nContent-Type: application/json\nAuthorization: Bearer <LOCAL_STUDIO_TOKEN if configured>\n\n{\n  "bot_id": "grok-editor-01",\n  "display_name": "Grok Editor",\n  "action": "cut_plan_ready",\n  "detail": { "project": "six-lines-reel", "next": "await human approval" }\n}`;

  const refresh = useCallback(async (quiet = false) => {
    setChecking(true);
    try {
      const [healthResponse, botResponse, activityResponse] = await Promise.all([fetch(`${studio}/health`), fetch(`${studio}/api/bots`), fetch(`${studio}/api/bot-activity`)]);
      const [nextHealth, nextBots, nextActivity] = await Promise.all([healthResponse.json(), botResponse.json(), activityResponse.json()]) as [Health, { bots?: Bot[]; summary?: BotSummary; error?: string }, { activity?: Activity[]; error?: string }];
      if (!healthResponse.ok || !botResponse.ok || !activityResponse.ok) throw new Error(nextBots.error ?? nextActivity.error ?? '로컬 서비스 응답 오류');
      setHealth(nextHealth); setBots(nextBots.bots ?? []); setSummary(nextBots.summary ?? null); setActivity(nextActivity.activity ?? []); setLastRefresh(new Date().toLocaleTimeString('ko-KR'));
      if (!quiet) setMessage((nextBots.summary?.active_now ?? 0) ? `${nextBots.summary?.active_now}개 봇이 최근 5분 안에 실제 체크인했습니다.` : '최근 5분 안에 체크인한 봇이 없습니다. 아직 실제 사용 중이라고 확인된 봇은 없습니다.');
    } catch (error) { setHealth(null); setBots([]); setSummary(null); setActivity([]); setMessage(error instanceof Error ? `${error.message} — Local Studio가 실행 중인지 확인하세요.` : 'Local Studio에 연결할 수 없습니다.'); } finally { setChecking(false); }
  }, []);
  useEffect(() => { const timeout = window.setTimeout(() => { void refresh(); }, 0); const interval = window.setInterval(() => { void refresh(true); }, 30000); return () => { window.clearTimeout(timeout); window.clearInterval(interval); }; }, [refresh]);
  const copyRequest = async () => { await navigator.clipboard?.writeText(botRequest); setCopied(true); window.setTimeout(() => setCopied(false), 1700); };

  return <>
    <SiteHeader current="bots" />
    <main className="bot-main">
      <section className="bot-hero"><div><p className="kicker">GROK CREW · BOT CHECK</p><h1>{t('내 봇들이', 'See what your bots')} <span>{t('무엇을 하고 있는지', 'are actually doing')}</span><br />{t('확인 가능한 곳.', 'on this computer.')}</h1><p>{t('이 화면은 추측으로 “봇이 접속했다”고 말하지 않습니다. 로컬 제작 서비스에 체크인을 남긴 봇만 표시하며, 최근 5분 이내의 기록만 활성 상태로 봅니다.', 'This screen never guesses that a bot is present. It only shows bots that checked in to Local Studio, and counts activity from the last five minutes.')}</p></div><aside className={`bot-live-card ${health ? 'ready' : ''}`}><span>LIVE ANSWER</span><b>{summary?.active_now ? 'YES · ACTIVE BOTS FOUND' : health ? 'NO · NO VERIFIED BOT YET' : 'SERVICE OFFLINE'}</b><p>{summary?.active_now ? t(`${summary.active_now}개 봇이 로컬 서비스에 최근 체크인을 기록했습니다.`, `${summary.active_now} bot(s) checked in to the local service recently.`) : health ? t('현재는 어떤 봇도 체크인하지 않았습니다. 브라우저를 열어 둔 것만으로는 사용 중으로 간주하지 않습니다.', 'No bot has checked in yet. Keeping a browser tab open is not treated as bot activity.') : t('로컬 제작 서비스를 시작한 뒤 다시 확인하세요.', 'Start Local Studio, then check again.')}</p><button onClick={() => void refresh()} disabled={checking}>{checking ? t('확인 중…', 'Checking…') : t('지금 다시 확인', 'Check now')}</button></aside></section>
      <section className="bot-answer-strip"><b>현재 확인 결과</b><span>{message}</span><em>{lastRefresh ? `마지막 확인 ${lastRefresh}` : '연결 대기'}</em></section>
      <section className="bot-summary-grid"><article><b>{summary?.total_known ?? 0}</b><span>등록된 로컬 봇</span><p>체크인을 한 적 있는 봇 수</p></article><article className={summary?.active_now ? 'active' : ''}><b>{summary?.active_now ?? 0}</b><span>현재 활성 봇</span><p>5분 이내 체크인 기준</p></article><article><b>{activity.length}</b><span>최근 작업 기록</span><p>로컬 SQLite의 bot activity</p></article><article className={health?.moviepy_installed ? 'active' : ''}><b>{health?.moviepy_installed ? 'READY' : 'CHECK'}</b><span>로컬 렌더</span><p>MoviePy 실행 가능 여부</p></article></section>
      <section className="bot-section bot-capability-section"><div className="bot-section-head"><div><p className="kicker">WHAT BOTS CAN DO</p><h2>봇에게 맡길 수 있는 일과<br /><span>사람이 반드시 결정할 일.</span></h2></div><p>로컬 제작 서비스의 실제 권한을 기준으로 표시합니다.</p></div><div className="capability-list">{capabilities.map(([name, detail, mode], index) => <article key={name}><i>{String(index + 1).padStart(2, '0')}</i><div><b>{name}</b><p>{detail}</p></div><span className={mode.includes('금지') ? 'never' : mode.includes('승인') ? 'review' : 'auto'}>{mode}</span></article>)}</div></section>
      <section className="bot-layout">
        <article className="bot-card bot-check-card"><div className="bot-card-head"><span>VERIFIED BOT PRESENCE</span><em>{summary?.activity_rule ?? 'local check-in only'}</em></div><h2>실제로 사용하는 봇 목록</h2>{bots.length ? <div className="bot-presence-list">{bots.map((bot) => <article key={bot.bot_id}><div className={`presence-dot ${bot.presence}`} /><div><b>{bot.display_name}</b><span>{bot.bot_id}</span><p>마지막 작업: <strong>{bot.last_action}</strong> · {since(bot.seconds_since_checkin)}</p><small>{JSON.stringify(bot.last_detail_json)}</small></div><em className={bot.presence}>{bot.presence === 'active' ? 'ACTIVE' : 'IDLE'}</em></article>)}</div> : <div className="no-bot-state"><b>아직 확인된 봇이 없습니다.</b><p>이것은 오류가 아니라, 봇이 아직 Local Studio에 체크인하지 않았다는 정확한 결과입니다. 아래 요청 형식을 봇 실행 환경에 넣으면 실제 활동이 기록됩니다.</p></div>}</article>
        <article className="bot-card bot-automation-card"><div className="bot-card-head"><span>AUTOMATION BOUNDARY</span><em>safe by default</em></div><h2>자동화는 어디까지 가능한가</h2><div className="automation-rows"><div><b>완전 자동</b><p>계획 작성, EDL 준비, 프로젝트 생성, 상태 확인, 실패 보고, 체크인 기록</p></div><div><b>승인 뒤 자동</b><p>렌더 대기열 생성·실행, 실패 작업 재시도, 게시 준비</p></div><div><b>자동 금지</b><p>비밀값 읽기, workspace 밖 파일 접근, Instagram 실제 게시, 서버 게시 허용 전환</p></div></div><p className="automation-note">실제 게시에는 사람 승인 기록 + 서버의 게시 허용 실행 + PUBLISH 확인이 모두 필요합니다.</p></article>
      </section>
      <section className="bot-layout bot-bottom-layout">
        <article className="bot-card bot-contract-card"><div className="bot-card-head"><span>BOT CHECK-IN CONTRACT</span><button onClick={() => void copyRequest()}>{copied ? '복사됨' : '요청 형식 복사'}</button></div><pre>{botRequest}</pre><p>봇은 작업을 시작·완료·대기 상태로 바꿀 때마다 이 체크인을 남깁니다. 보호 토큰을 켠 경우 토큰은 봇의 실행 환경에만 주입하고, 봇이 `.env`를 읽게 하면 안 됩니다.</p></article>
        <article className="bot-card bot-activity-card"><div className="bot-card-head"><span>RECENT CHECK-INS</span><em>{activity.length} entries</em></div>{activity.length ? <div className="bot-activity-list">{activity.map((item) => <article key={item.id}><b>{item.action}</b><span>{item.bot_id}</span><p>{dateTime(item.created_at)}</p><small>{JSON.stringify(item.detail_json)}</small></article>)}</div> : <div className="no-bot-state"><b>표시할 체크인이 없습니다.</b><p>첫 봇이 heartbeat를 보내면 이곳에 시간·작업·세부 내용이 남습니다.</p></div>}</article>
      </section>
    </main>
  </>;
}
