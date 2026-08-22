'use client';
/* eslint-disable @next/next/no-html-link-for-pages */

import { useCallback, useEffect, useState } from 'react';

type TimelineClip = { in: number; out: number; keep: boolean; caption: string; speaker?: string };
type StudioProject = { id: string; title: string; source_path: string; output_path: string; caption: string; timeline_json: { clips: TimelineClip[] }; created_at: string };
type StudioJob = { id: string; project_id: string; kind: 'render' | 'instagram_publish'; status: string; approved: number; error_text?: string | null; created_at: string; result_json?: Record<string, unknown> | null };
type StudioHealth = { status: string; bind: string; workspace: string; database: string; moviepy_installed: boolean; instagram_publish_enabled: boolean; credentials_configured: boolean };

const studio = 'http://127.0.0.1:7214';
const fallbackTimeline: TimelineClip[] = [
  { in: 1.8, out: 3.65, keep: true, caption: 'SIX LINES', speaker: 'S0' },
  { in: 4.1, out: 6.2, keep: true, caption: 'ONE RULE', speaker: 'S0' },
  { in: 6.45, out: 9.8, keep: true, caption: 'NO GREETING', speaker: 'S0' },
];

function cutLogTimeline(): TimelineClip[] {
  try {
    const saved = JSON.parse(window.localStorage.getItem('nohCutLog') ?? '{}') as { clips?: { start: number; end: number; keep: boolean; text: string; speaker?: string }[] };
    const clips = (saved.clips ?? []).filter((clip) => clip.keep && clip.end > clip.start).map((clip) => ({ in: clip.start, out: clip.end, keep: true, caption: (clip.text.match(/[A-Za-z0-9']+/g) ?? ['NOH']).slice(0, 2).join(' ').toUpperCase(), speaker: clip.speaker }));
    return clips.length ? clips : fallbackTimeline;
  } catch { return fallbackTimeline; }
}

function stamp(value: string) { return value ? new Date(value).toLocaleString('ko-KR', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }) : '—'; }

export default function ProductionConsole() {
  const [health, setHealth] = useState<StudioHealth | null>(null);
  const [projects, setProjects] = useState<StudioProject[]>([]);
  const [jobs, setJobs] = useState<StudioJob[]>([]);
  const [title, setTitle] = useState('NOH · six lines, one ask');
  const [sourcePath, setSourcePath] = useState('inputs/source.mp4');
  const [outputPath, setOutputPath] = useState('outputs/noh-final.mp4');
  const [caption, setCaption] = useState('One ask. Six lines. No greeting essay.\n\n#aiatwork #prompts');
  const [selected, setSelected] = useState('');
  const [token, setToken] = useState('');
  const [approved, setApproved] = useState(false);
  const [shareToFeed, setShareToFeed] = useState(true);
  const [publishConfirm, setPublishConfirm] = useState('');
  const [message, setMessage] = useState('Local Studio를 확인하는 중입니다.');
  const [busy, setBusy] = useState(false);

  const api = useCallback(async (path: string, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    if (init?.body) headers.set('Content-Type', 'application/json');
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(`${studio}${path}`, { ...init, headers });
    const data = await response.json() as Record<string, unknown>;
    if (!response.ok) throw new Error(String(data.error ?? `Local Studio error ${response.status}`));
    return data;
  }, [token]);
  const refresh = useCallback(async (quiet = false) => {
    try {
      const [nextHealth, nextProjects, nextJobs] = await Promise.all([api('/health'), api('/api/projects'), api('/api/jobs')]);
      setHealth(nextHealth as unknown as StudioHealth); setProjects((nextProjects.projects ?? []) as StudioProject[]); setJobs((nextJobs.jobs ?? []) as StudioJob[]);
      if (!quiet) setMessage('로컬 제작 서비스가 연결되었습니다. 모든 작업 데이터는 이 PC의 SQLite에 저장됩니다.');
    } catch (error) { setHealth(null); if (!quiet) setMessage(error instanceof Error ? `${error.message} — local_studio를 먼저 실행하세요.` : 'Local Studio에 연결할 수 없습니다.'); }
  }, [api]);
  useEffect(() => { const timeout = window.setTimeout(() => { void refresh(); }, 0); return () => window.clearTimeout(timeout); }, [refresh]);

  const createProject = async () => {
    setBusy(true);
    try {
      const response = await api('/api/projects', { method: 'POST', body: JSON.stringify({ title, source_path: sourcePath, output_path: outputPath, caption, timeline: { schema: 'noh.reel-forge.edl/v1', clips: cutLogTimeline() } }) });
      const project = response.project as StudioProject; setSelected(project.id); setApproved(false); setMessage('프로젝트와 Cut Log EDL을 로컬 SQLite에 저장했습니다. 이제 렌더 승인을 기록할 수 있습니다.'); await refresh(true);
    } catch (error) { setMessage(error instanceof Error ? error.message : '프로젝트를 만들지 못했습니다.'); } finally { setBusy(false); }
  };
  const queueRender = async () => {
    if (!selected) { setMessage('먼저 로컬 프로젝트를 만드세요.'); return; }
    if (!approved) { setMessage('렌더 전에 사람 승인을 체크하세요.'); return; }
    setBusy(true);
    try { await api(`/api/projects/${selected}/render`, { method: 'POST', body: JSON.stringify({ approved: true, requested_by: 'Grok Crew / local browser' }) }); setMessage('렌더 작업을 대기열에 넣었습니다. 아래에서 “승인된 작업 실행”을 누르면 이 PC에서 MoviePy가 렌더합니다.'); await refresh(true); } catch (error) { setMessage(error instanceof Error ? error.message : '렌더 작업을 만들지 못했습니다.'); } finally { setBusy(false); }
  };
  const queueInstagram = async () => {
    if (!selected || !approved) { setMessage('프로젝트와 사람 승인이 모두 필요합니다.'); return; }
    setBusy(true);
    try { await api(`/api/projects/${selected}/instagram`, { method: 'POST', body: JSON.stringify({ approved: true, render_path: outputPath, caption, share_to_feed: shareToFeed, requested_by: 'Grok Crew / local browser' }) }); setMessage('Instagram 게시 작업은 대기열에만 넣었습니다. 실제 전송은 별도 실행 승인과 PUBLISH 확인이 있어야 합니다.'); await refresh(true); } catch (error) { setMessage(error instanceof Error ? error.message : '게시 작업을 만들지 못했습니다.'); } finally { setBusy(false); }
  };
  const runJob = async (job: StudioJob) => {
    if (job.kind === 'instagram_publish' && publishConfirm !== 'PUBLISH') { setMessage('게시 작업은 아래 입력칸에 PUBLISH를 정확히 입력해야 실행됩니다.'); return; }
    setBusy(true);
    try { const response = await api(`/api/jobs/${job.id}/run`, { method: 'POST', body: JSON.stringify(job.kind === 'instagram_publish' ? { confirmation: 'PUBLISH' } : {}) }); const final = response.job as StudioJob; setMessage(final.status === 'succeeded' ? `${job.kind === 'render' ? '로컬 MP4 렌더' : 'Instagram 게시'}가 완료되었습니다.` : `작업 결과: ${final.status}${final.error_text ? ` — ${final.error_text}` : ''}`); await refresh(true); } catch (error) { setMessage(error instanceof Error ? error.message : '작업을 실행하지 못했습니다.'); } finally { setBusy(false); }
  };
  const selectedProject = projects.find((project) => project.id === selected);
  const selectedJobs = jobs.filter((job) => job.project_id === selected);
  const contract = JSON.stringify({ scope: '127.0.0.1 only', actor: 'Grok bot', allowed: ['create project', 'queue approved render', 'queue approved Instagram job'], never: ['read Meta credentials', 'access outside workspace', 'publish without approval'] }, null, 2);

  return <>
    <header className="production-topbar"><a className="wordmark" href="/"><span>NOH</span><i>Reel Forge</i></a><nav aria-label="Production navigation"><a href="/">Studio</a><a href="/edit">Edit lab</a><a href="/cut">Cut log</a><a className="current" href="/production">Production</a><a href="/connect">Local desk</a><a href="/export">Export</a></nav><div><span>LOOPBACK ONLY</span><b>127.0.0.1:7214</b></div></header>
    <main className="production-main">
      <section className="production-hero"><div><p className="kicker">LOCAL PRODUCTION NODE</p><h1>Cut log에서<br /><span>실제 MP4와 게시 대기열까지.</span></h1><p>Grok bot은 편집 계획과 대기열을 만들 수 있습니다. 파일·SQLite·자격증명은 모두 이 PC에 남고, Instagram에는 사람이 승인한 게시만 전송됩니다.</p></div><aside className={`production-health ${health ? 'ready' : ''}`}><span>LOCAL STUDIO</span><b>{health ? 'CONNECTED' : 'OFFLINE'}</b><p>{health ? `SQLite · ${health.moviepy_installed ? 'MoviePy ready' : 'MoviePy install needed'} · publish switch ${health.instagram_publish_enabled ? 'on' : 'off'}` : 'local_studio/studio_server.py를 실행하면 연결됩니다.'}</p><button onClick={() => void refresh()} disabled={busy}>연결 다시 확인</button></aside></section>
      <div className="production-note"><b>LOCAL FIRST</b><span>소스는 <code>local_studio/workspace/inputs</code>, 결과물은 <code>workspace/outputs</code>, 프로젝트·작업 이력은 SQLite에 저장됩니다. 외부 데이터베이스는 사용하지 않습니다.</span></div>
      <section className="production-grid production-setup-grid">
        <article className="production-card blueprint-card"><div className="production-card-head"><span>01 · PROJECT BLUEPRINT</span><em>Cut Log EDL 자동 사용</em></div><label>프로젝트 이름<input value={title} onChange={(event) => setTitle(event.target.value)} /></label><div className="path-grid"><label>원본 파일 (workspace 내부)<input value={sourcePath} onChange={(event) => setSourcePath(event.target.value)} placeholder="inputs/source.mp4" /></label><label>MP4 결과 위치<input value={outputPath} onChange={(event) => setOutputPath(event.target.value)} placeholder="outputs/noh-final.mp4" /></label></div><label>Instagram 캡션<textarea value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={2200} /></label><p>Cut Log에서 저장한 남길 구간·자막을 읽어 EDL로 넣습니다. 아직 없으면 기본 3개 컷을 사용합니다.</p><button className="production-primary" onClick={() => void createProject()} disabled={busy}>로컬 프로젝트 만들기</button></article>
        <article className="production-card local-status-card"><div className="production-card-head"><span>LOCAL SERVICE STATUS</span><em>{health?.status ?? 'not connected'}</em></div><dl><div><dt>바인딩</dt><dd>{health?.bind ?? '—'} <small>외부 공개 없음</small></dd></div><div><dt>데이터베이스</dt><dd>{health ? 'SQLite · local only' : '—'}</dd></div><div><dt>MoviePy 렌더</dt><dd className={health?.moviepy_installed ? 'good' : ''}>{health?.moviepy_installed ? '준비됨' : '설치 필요'}</dd></div><div><dt>Instagram 자격증명</dt><dd className={health?.credentials_configured ? 'good' : ''}>{health?.credentials_configured ? '로컬 .env에서 확인됨' : '아직 설정 안 됨'}</dd></div></dl><label className="token-field">로컬 보호 토큰 <input type="password" value={token} onChange={(event) => setToken(event.target.value)} placeholder="필요한 경우 이 브라우저 탭에서만 입력" /></label><p>토큰은 이 화면이나 SQLite에 저장되지 않습니다.</p></article>
      </section>
      <section className="production-grid production-action-grid">
        <article className="production-card lane-card"><div className="production-card-head"><span>02 · RENDER LANE</span><em>MoviePy · H.264/AAC · 1080×1920</em></div><h2>승인된 EDL을 로컬 MP4로 렌더</h2><p>작업 생성만으로 렌더는 시작되지 않습니다. 실행 버튼을 한 번 더 눌러야 하며, 실패·완료 결과도 로컬 이력에 남습니다.</p><label className="approval-check"><input type="checkbox" checked={approved} onChange={(event) => setApproved(event.target.checked)} /> 이 편집 결정을 사람이 검토·승인했습니다.</label><button className="production-primary" onClick={() => void queueRender()} disabled={busy || !selected}>승인된 렌더 작업 대기열에 넣기</button><small>{selectedProject ? `현재 프로젝트: ${selectedProject.title}` : '프로젝트를 만든 뒤 활성화됩니다.'}</small></article>
        <article className="production-card lane-card instagram-card"><div className="production-card-head"><span>03 · INSTAGRAM LANE</span><em>Professional account only</em></div><h2>자동 게시가 아닌, 승인된 게시 실행</h2><p>작업을 먼저 대기열에 넣고, 서버를 게시 허용 모드로 시작한 뒤, <b>PUBLISH</b>라는 정확한 확인까지 있어야 실제 전송됩니다.</p><label className="approval-check"><input type="checkbox" checked={shareToFeed} onChange={(event) => setShareToFeed(event.target.checked)} /> 릴을 프로필 피드에도 공유</label><button className="production-outline" onClick={() => void queueInstagram()} disabled={busy || !selected || !approved}>Instagram 게시 작업 대기열에 넣기</button><label className="publish-field">실제 게시 실행 확인 <input value={publishConfirm} onChange={(event) => setPublishConfirm(event.target.value)} placeholder="PUBLISH 입력" /></label></article>
      </section>
      <section className="production-jobs"><div className="production-section-head"><div><p className="kicker">LOCAL JOB BOARD</p><h2>작업은 사람이 <span>실행을 허용</span>할 때만 움직입니다.</h2></div><span>{jobs.length} total jobs</span></div><div className="job-layout"><div className="project-list">{projects.length ? projects.map((project) => <button key={project.id} onClick={() => setSelected(project.id)} className={selected === project.id ? 'chosen' : ''}><b>{project.title}</b><span>{project.timeline_json.clips.length} clips · {stamp(project.created_at)}</span><i>{project.id.slice(0, 8)}</i></button>) : <div className="empty-job">아직 로컬 프로젝트가 없습니다.<br />위에서 첫 프로젝트를 만드세요.</div>}</div><div className="job-list">{selected ? (selectedJobs.length ? selectedJobs.map((job) => <article key={job.id} className={`job-row ${job.status}`}><div><span>{job.kind === 'render' ? 'RENDER' : 'INSTAGRAM'}</span><b>{job.status.toUpperCase()}</b><p>{stamp(job.created_at)} · human approval {job.approved ? 'recorded' : 'missing'}</p>{job.error_text && <small>{job.error_text}</small>}</div><button onClick={() => void runJob(job)} disabled={busy || !job.approved || !['queued', 'failed'].includes(job.status)}>{job.kind === 'instagram_publish' ? 'PUBLISH 실행' : '렌더 실행'}</button></article>) : <div className="empty-job">선택한 프로젝트에는 아직 작업이 없습니다.<br />Render 또는 Instagram lane에서 대기열을 만드세요.</div>) : <div className="empty-job">왼쪽에서 프로젝트를 선택하세요.</div>}</div></div></section>
      <section className="production-grid production-footer-grid"><article className="production-card bot-card"><div className="production-card-head"><span>GROK BOT BOUNDARY</span><em>narrow local contract</em></div><pre>{contract}</pre><p>봇은 프로젝트를 준비하고 승인된 작업을 대기열에 넣을 수 있습니다. Meta 토큰이나 workspace 밖 파일에는 접근할 수 없고, 승인 없이 게시할 수 없습니다.</p></article><article className="production-card idea-card"><div className="production-card-head"><span>ADOPTED PRODUCTION IDEAS</span><em>research → implementation</em></div><ul><li><b>Transcript → EDL → render</b><span>영상 전체를 덤프하지 않고 선택한 말 구간만 렌더합니다.</span></li><li><b>Approval gates</b><span>렌더와 게시 모두 기록된 사람 승인이 선행됩니다.</span></li><li><b>Persistent job memory</b><span>SQLite에 작업·실패·결과를 남겨 봇이 재시도와 상태 확인을 할 수 있습니다.</span></li><li><b>Resumable publishing</b><span>승인된 로컬 MP4를 컨테이너 업로드·처리 확인 뒤 게시합니다.</span></li></ul></article></section>
      <p className="production-message" aria-live="polite">{message}</p>
    </main>
  </>;
}
