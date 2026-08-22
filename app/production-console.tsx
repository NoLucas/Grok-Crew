'use client';
/* eslint-disable @next/next/no-html-link-for-pages */

import { useCallback, useEffect, useState } from 'react';
import { LanguageSwitcher, useLanguage } from './language';

type TimelineClip = { in: number; out: number; keep: boolean; caption: string; speaker?: string };
type RenderSettings = { fps: 24 | 30 | 60; quality: 'compact' | 'balanced' | 'high'; crop_anchor: 'left' | 'center' | 'right'; speed: number; volume: number; normalize_audio: boolean; mute_audio: boolean; fade_in: number; fade_out: number; look: 'natural' | 'punchy' | 'mono' | 'night'; brightness: number; contrast: number; gamma: number; mirror: boolean; captions_enabled: boolean; caption_color: string; caption_size: number; caption_y: number; caption_stroke: number };
type StudioProject = { id: string; title: string; source_path: string; output_path: string; caption: string; timeline_json: { clips: TimelineClip[] }; created_at: string };
type StudioJob = { id: string; project_id: string; kind: 'render' | 'instagram_publish'; status: string; approved: number; error_text?: string | null; created_at: string; result_json?: Record<string, unknown> | null };
type StudioHealth = { status: string; bind: string; workspace: string; database: string; moviepy_installed: boolean; instagram_publish_enabled: boolean; credentials_configured: boolean };

const studio = 'http://127.0.0.1:7214';
const fallbackTimeline: TimelineClip[] = [
  { in: 1.8, out: 3.65, keep: true, caption: 'SIX LINES', speaker: 'S0' },
  { in: 4.1, out: 6.2, keep: true, caption: 'ONE RULE', speaker: 'S0' },
  { in: 6.45, out: 9.8, keep: true, caption: 'NO GREETING', speaker: 'S0' },
];
const defaultRenderSettings: RenderSettings = { fps: 30, quality: 'balanced', crop_anchor: 'center', speed: 1, volume: 100, normalize_audio: false, mute_audio: false, fade_in: .08, fade_out: .08, look: 'natural', brightness: 0, contrast: 0, gamma: 1, mirror: false, captions_enabled: true, caption_color: '#FFFFFF', caption_size: 78, caption_y: 74, caption_stroke: 3 };

function cutLogTimeline(): TimelineClip[] {
  try {
    const saved = JSON.parse(window.localStorage.getItem('nohCutLog') ?? '{}') as { clips?: { start: number; end: number; keep: boolean; text: string; speaker?: string }[] };
    const clips = (saved.clips ?? []).filter((clip) => clip.keep && clip.end > clip.start).map((clip) => ({ in: clip.start, out: clip.end, keep: true, caption: (clip.text.match(/[A-Za-z0-9']+/g) ?? ['NOH']).slice(0, 2).join(' ').toUpperCase(), speaker: clip.speaker }));
    return clips.length ? clips : fallbackTimeline;
  } catch { return fallbackTimeline; }
}

function stamp(value: string) { return value ? new Date(value).toLocaleString('ko-KR', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }) : '—'; }

export default function ProductionConsole() {
  const { t } = useLanguage();
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
  const [renderSettings, setRenderSettings] = useState<RenderSettings>(defaultRenderSettings);
  const [finishLoaded, setFinishLoaded] = useState(false);
  const [message, setMessage] = useState('Local Studio를 확인하는 중입니다.');
  const [busy, setBusy] = useState(false);

  const patchSettings = <K extends keyof RenderSettings>(key: K, value: RenderSettings[K]) => setRenderSettings((current) => ({ ...current, [key]: value }));

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
  useEffect(() => { const timeout = window.setTimeout(() => { try { const saved = window.localStorage.getItem('nohFinishRack'); if (saved) setRenderSettings({ ...defaultRenderSettings, ...JSON.parse(saved) as Partial<RenderSettings> }); } catch { /* Use the local default if a previous draft cannot be read. */ } finally { setFinishLoaded(true); } }, 0); return () => window.clearTimeout(timeout); }, []);
  useEffect(() => { if (finishLoaded) window.localStorage.setItem('nohFinishRack', JSON.stringify(renderSettings)); }, [renderSettings, finishLoaded]);

  const createProject = async () => {
    setBusy(true);
    try {
      const response = await api('/api/projects', { method: 'POST', body: JSON.stringify({ title, source_path: sourcePath, output_path: outputPath, caption, timeline: { schema: 'noh.reel-forge.edl/v1', clips: cutLogTimeline(), render_settings: renderSettings } }) });
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
    <header className="production-topbar"><a className="wordmark" href="/"><span>NOH</span><i>Reel Forge</i></a><nav aria-label={t('제작 메뉴', 'Production navigation')}><a href="/">{t('스튜디오', 'Studio')}</a><a href="/edit">{t('편집실', 'Edit lab')}</a><a href="/cut">{t('컷 로그', 'Cut log')}</a><a className="current" href="/production">{t('제작', 'Production')}</a><a href="/bots">{t('봇 확인', 'Bot check')}</a><a href="/bot-guide">{t('봇 설명서', 'Bot guide')}</a><a href="/connect">{t('로컬 도구', 'Local desk')}</a><a href="/export">{t('내보내기', 'Export')}</a></nav><LanguageSwitcher /><div><span>LOOPBACK ONLY</span><b>127.0.0.1:7214</b></div></header>
    <main className="production-main">
      <section className="production-hero"><div><p className="kicker">LOCAL PRODUCTION NODE</p><h1>{t('컷 로그부터', 'From cut log to')}<br /><span>{t('실제 MP4와 게시 대기열까지.', 'a real MP4 and publish queue.')}</span></h1><p>{t('Grok bot은 편집 계획과 대기열을 만들 수 있습니다. 파일·SQLite·자격증명은 모두 이 PC에 남고, Instagram에는 사람이 승인한 게시만 전송됩니다.', 'Grok bots can plan edits and prepare queues. Files, SQLite, and credentials stay on this PC; only a human-approved Instagram post can be sent.')}</p></div><aside className={`production-health ${health ? 'ready' : ''}`}><span>LOCAL STUDIO</span><b>{health ? 'CONNECTED' : 'OFFLINE'}</b><p>{health ? `SQLite · ${health.moviepy_installed ? 'MoviePy ready' : 'MoviePy install needed'} · publish switch ${health.instagram_publish_enabled ? 'on' : 'off'}` : t('local_studio/studio_server.py를 실행하면 연결됩니다.', 'Start local_studio/studio_server.py to connect.')}</p><button onClick={() => void refresh()} disabled={busy}>{t('연결 다시 확인', 'Check connection')}</button></aside></section>
      <div className="production-note"><b>LOCAL FIRST</b><span>소스는 <code>local_studio/workspace/inputs</code>, 결과물은 <code>workspace/outputs</code>, 프로젝트·작업 이력은 SQLite에 저장됩니다. 외부 데이터베이스는 사용하지 않습니다.</span></div>
      <section className="production-grid production-setup-grid">
        <article className="production-card blueprint-card"><div className="production-card-head"><span>01 · PROJECT BLUEPRINT</span><em>Cut Log EDL 자동 사용</em></div><label>프로젝트 이름<input value={title} onChange={(event) => setTitle(event.target.value)} /></label><div className="path-grid"><label>원본 파일 (workspace 내부)<input value={sourcePath} onChange={(event) => setSourcePath(event.target.value)} placeholder="inputs/source.mp4" /></label><label>MP4 결과 위치<input value={outputPath} onChange={(event) => setOutputPath(event.target.value)} placeholder="outputs/noh-final.mp4" /></label></div><label>Instagram 캡션<textarea value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={2200} /></label><p>Cut Log에서 저장한 남길 구간·자막을 읽어 EDL로 넣습니다. 아직 없으면 기본 3개 컷을 사용합니다.</p><button className="production-primary" onClick={() => void createProject()} disabled={busy}>로컬 프로젝트 만들기</button></article>
        <article className="production-card local-status-card"><div className="production-card-head"><span>LOCAL SERVICE STATUS</span><em>{health?.status ?? 'not connected'}</em></div><dl><div><dt>바인딩</dt><dd>{health?.bind ?? '—'} <small>외부 공개 없음</small></dd></div><div><dt>데이터베이스</dt><dd>{health ? 'SQLite · local only' : '—'}</dd></div><div><dt>MoviePy 렌더</dt><dd className={health?.moviepy_installed ? 'good' : ''}>{health?.moviepy_installed ? '준비됨' : '설치 필요'}</dd></div><div><dt>Instagram 자격증명</dt><dd className={health?.credentials_configured ? 'good' : ''}>{health?.credentials_configured ? '로컬 .env에서 확인됨' : '아직 설정 안 됨'}</dd></div></dl><label className="token-field">로컬 보호 토큰 <input type="password" value={token} onChange={(event) => setToken(event.target.value)} placeholder="필요한 경우 이 브라우저 탭에서만 입력" /></label><p>토큰은 이 화면이나 SQLite에 저장되지 않습니다.</p></article>
      </section>
      <section className="finish-rack">
        <div className="finish-rack-head"><div><p className="kicker">04 · FINISH RACK</p><h2>보이는 편집값을 <span>실제 로컬 렌더</span>에도 적용.</h2></div><p>이 설정은 다음에 만드는 프로젝트의 EDL 안에 저장됩니다. 미리보기용 버튼이 아니라 MoviePy 렌더에서 직접 사용됩니다.</p></div>
        <div className="finish-grid">
          <article><span>VERTICAL REFRAME</span><h3>9:16 프레이밍</h3><label>피사체 기준 위치<select value={renderSettings.crop_anchor} onChange={(event) => patchSettings('crop_anchor', event.target.value as RenderSettings['crop_anchor'])}><option value="left">왼쪽 우선</option><option value="center">가운데</option><option value="right">오른쪽 우선</option></select></label><label className="finish-toggle"><input type="checkbox" checked={renderSettings.mirror} onChange={(event) => patchSettings('mirror', event.target.checked)} /> 좌우 반전</label><p>가로 영상을 세로 1080×1920으로 채울 때 어느 쪽을 유지할지 정합니다.</p></article>
          <article><span>MOTION + AUDIO</span><h3>속도와 음량</h3><label>전체 속도 <output>{renderSettings.speed.toFixed(2)}×</output><input type="range" min="0.5" max="2" step="0.05" value={renderSettings.speed} onChange={(event) => patchSettings('speed', Number(event.target.value))} /></label><label>원본 음량 <output>{renderSettings.mute_audio ? 'mute' : `${renderSettings.volume}%`}</output><input type="range" min="0" max="200" value={renderSettings.volume} disabled={renderSettings.mute_audio} onChange={(event) => patchSettings('volume', Number(event.target.value))} /></label><div className="finish-pair"><label>시작 페이드<input type="number" min="0" max="2" step=".02" value={renderSettings.fade_in} onChange={(event) => patchSettings('fade_in', Number(event.target.value))} /></label><label>끝 페이드<input type="number" min="0" max="2" step=".02" value={renderSettings.fade_out} onChange={(event) => patchSettings('fade_out', Number(event.target.value))} /></label></div><label className="finish-toggle"><input type="checkbox" checked={renderSettings.normalize_audio} onChange={(event) => patchSettings('normalize_audio', event.target.checked)} /> 음량 정규화</label><label className="finish-toggle"><input type="checkbox" checked={renderSettings.mute_audio} onChange={(event) => patchSettings('mute_audio', event.target.checked)} /> 원본 오디오 제거</label></article>
          <article><span>COLOR + LOOK</span><h3>색감 보정</h3><label>룩 프리셋<select value={renderSettings.look} onChange={(event) => patchSettings('look', event.target.value as RenderSettings['look'])}><option value="natural">Natural</option><option value="punchy">Punchy contrast</option><option value="mono">Black & white</option><option value="night">Night lift</option></select></label><div className="finish-pair"><label>밝기 <output>{renderSettings.brightness > 0 ? '+' : ''}{renderSettings.brightness}</output><input type="range" min="-40" max="40" value={renderSettings.brightness} onChange={(event) => patchSettings('brightness', Number(event.target.value))} /></label><label>대비 <output>{renderSettings.contrast > 0 ? '+' : ''}{renderSettings.contrast}</output><input type="range" min="-40" max="55" value={renderSettings.contrast} onChange={(event) => patchSettings('contrast', Number(event.target.value))} /></label></div><label>감마 <output>{renderSettings.gamma.toFixed(2)}</output><input type="range" min="0.65" max="1.55" step=".05" value={renderSettings.gamma} onChange={(event) => patchSettings('gamma', Number(event.target.value))} /></label></article>
          <article><span>CAPTION + DELIVERY</span><h3>읽히는 최종본</h3><label className="finish-toggle"><input type="checkbox" checked={renderSettings.captions_enabled} onChange={(event) => patchSettings('captions_enabled', event.target.checked)} /> 선택 구간 자막 번인</label><div className="finish-pair"><label>자막 색상<input type="color" value={renderSettings.caption_color} onChange={(event) => patchSettings('caption_color', event.target.value)} /></label><label>테두리 <output>{renderSettings.caption_stroke}px</output><input type="range" min="0" max="8" value={renderSettings.caption_stroke} onChange={(event) => patchSettings('caption_stroke', Number(event.target.value))} /></label></div><label>자막 크기 <output>{renderSettings.caption_size}px</output><input type="range" min="38" max="110" value={renderSettings.caption_size} onChange={(event) => patchSettings('caption_size', Number(event.target.value))} /></label><label>자막 세로 위치 <output>{renderSettings.caption_y}%</output><input type="range" min="48" max="84" value={renderSettings.caption_y} onChange={(event) => patchSettings('caption_y', Number(event.target.value))} /></label><label>출력 품질<select value={renderSettings.quality} onChange={(event) => patchSettings('quality', event.target.value as RenderSettings['quality'])}><option value="compact">Compact · 빠른 검토</option><option value="balanced">Balanced · 일반 게시</option><option value="high">High · 보관/게시</option></select></label><label>프레임레이트<select value={renderSettings.fps} onChange={(event) => patchSettings('fps', Number(event.target.value) as RenderSettings['fps'])}><option value="24">24 fps · 시네마틱</option><option value="30">30 fps · 릴 기본</option><option value="60">60 fps · 빠른 동작</option></select></label></article>
        </div>
        <div className="finish-readout"><b>다음 렌더</b><span>{renderSettings.crop_anchor} crop · {renderSettings.speed.toFixed(2)}× · {renderSettings.look} · {renderSettings.mute_audio ? 'original audio off' : `${renderSettings.volume}% audio`} · {renderSettings.captions_enabled ? 'burn-in captions' : 'no captions'} · {renderSettings.fps}fps · {renderSettings.quality}</span></div>
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
