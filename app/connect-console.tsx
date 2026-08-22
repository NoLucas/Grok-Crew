'use client';
/* eslint-disable @next/next/no-html-link-for-pages */

import { useEffect, useState } from 'react';

type Json = Record<string, unknown>;
type Health = { status?: string; xaiBridge?: string; localTokenGuard?: string };

function readLocal(key: string): Json {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) as Json : {};
  } catch {
    return {};
  }
}

function download(name: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 700);
}

function createLocalManifest(): Json {
  const agent = readLocal('nohAgentDesk');
  const edit = readLocal('nohEditLab');
  const project = readLocal('currentProject');
  const captionPacket = readLocal('packet');
  return {
    schema: 'noh.reel-forge.local-agent/v1',
    generatedAt: new Date().toISOString(),
    project,
    agent: {
      role: agent.agentRole,
      memory: agent.memory,
      schedule: agent.schedule,
      labels: agent.labels,
    },
    source: {
      url: agent.sourceUrl,
      notes: agent.sourceNotes,
      trust: agent.trust,
      originalPostReupload: project.originalReupload,
    },
    edit: {
      transition: edit.hardCutLock === false ? 'review_required' : 'hard_cut',
      frameRate: edit.frameRate,
      renderProfile: edit.renderProfile,
      captions: edit.captions,
      audioPolicy: edit.audioPolicy,
      directorNotes: edit.directorNotes,
    },
    quality: {
      sourceChecked: agent.sourceChecked,
      altTextReady: agent.altTextReady,
      humanReviewRequired: agent.humanReview,
      shareReady: agent.shareReady,
    },
    captionPacket,
    botRules: {
      allowed: ['read_project_manifest', 'validate_quality_gates', 'create_edit_plan'],
      prohibited: ['publish_to_instagram', 'reuse_source_asset', 'remove_human_review'],
    },
  };
}

export default function ConnectConsole() {
  const [origin, setOrigin] = useState('http://localhost:3000');
  const [health, setHealth] = useState<Health>({});
  const [manifest, setManifest] = useState<Json>({});
  const [result, setResult] = useState('');
  const [instruction, setInstruction] = useState('Make the most useful 10-second edit plan without relaxing any gate.');
  const [copied, setCopied] = useState('');
  const [busy, setBusy] = useState(false);
  const refresh = async () => {
    setResult('');
    try {
      const response = await fetch('/api/health', { cache: 'no-store' });
      const payload = await response.json() as Health;
      setHealth(payload);
    } catch {
      setHealth({ status: 'offline' });
    }
  };

  useEffect(() => {
    let cancelled = false;
    const hydrate = window.setTimeout(() => {
      if (!cancelled) {
        setOrigin(window.location.origin);
        setManifest(createLocalManifest());
      }
    }, 0);
    void fetch('/api/health', { cache: 'no-store' })
      .then((response) => response.json() as Promise<Health>)
      .then((payload) => { if (!cancelled) setHealth(payload); })
      .catch(() => { if (!cancelled) setHealth({ status: 'offline' }); });
    return () => { cancelled = true; window.clearTimeout(hydrate); };
  }, []);

  const copy = async (name: string, value: string) => {
    await navigator.clipboard?.writeText(value);
    setCopied(name);
    window.setTimeout(() => setCopied(''), 1600);
  };

  const call = async (path: string, body?: Json) => {
    setBusy(true);
    setResult('');
    try {
      const response = await fetch(path, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : undefined);
      const payload = await response.json();
      setResult(JSON.stringify(payload, null, 2));
    } catch {
      setResult(JSON.stringify({ error: 'The local server is not responding. Start NOH Reel Forge, then try again.' }, null, 2));
    } finally {
      setBusy(false);
    }
  };

  const endpoints = [
    ['01', 'Health', 'GET', '/api/health', 'Local readiness. No secrets returned.'],
    ['02', 'Capability contract', 'GET', '/api/capabilities', 'Machine-readable actions and safety limits.'],
    ['03', 'Gate validator', 'POST', '/api/reel-jobs/validate', 'Checks copy, cut, timing, packet, and human review.'],
    ['04', 'Grok edit planner', 'POST', '/api/reel-jobs/plan', 'Uses the locally configured xAI key. Never auto-publishes.'],
  ];

  const sample = `POST ${origin}/api/reel-jobs/plan\nContent-Type: application/json\n\n{\n  "instruction": "Create a safe edit plan",\n  "manifest": { ...current NOH handoff... }\n}`;
  return <><header className="forge-header connect-header"><a href="/" className="wordmark"><span>NOH</span><i>Reel Forge</i></a><nav aria-label="Primary navigation"><a href="/">Studio</a><a href="/edit">Edit lab</a><a href="/library">Library</a><a href="/agent">Agent desk</a><a className="current" href="/connect">Bot bridge</a><a href="/packet">Packet</a><a href="/gates">Gate board</a><a href="/export">Export</a></nav><div className="header-meta"><span>Local API · private by default</span><b>Created with Grok</b></div></header>
    <main className="connect-main"><section className="connect-hero"><div><p className="kicker">LOCAL GROK BOT GATEWAY</p><h1>Let a bot enter<br /><span>with a real brief.</span></h1><p>Run Reel Forge on your computer, then give a Grok bot a clean local contract for validation and editorial planning.</p></div><aside className={`bridge-status ${health.status === 'ready' ? 'ready' : ''}`}><span>LOCAL BRIDGE</span><b>{health.status === 'ready' ? 'ONLINE' : 'CHECKING'}</b><p>xAI: {health.xaiBridge === 'configured' ? 'ready for planning' : 'add key for planning'}</p><button onClick={() => void refresh()}>Refresh status</button></aside></section>
      <section className="connect-safety"><b>LOCAL-FIRST BY DESIGN</b><span>The gateway can read a handoff, run Gate A/B/C, and ask Grok for an edit plan. It cannot publish, share, or reuse a source asset.</span><em>Human review stays required.</em></section>
      <section className="connect-grid bridge-overview"><article className="connect-card local-address"><div className="connect-card-head"><span>01 · LOCAL ADDRESS</span><em>Same computer</em></div><b>{origin}</b><p>A bot running on this computer can use this address. Keep it local unless you deliberately add a protected tunnel later.</p><div><button onClick={() => void copy('origin', origin)}>{copied === 'origin' ? 'Address copied' : 'Copy local address'}</button><button onClick={() => void copy('sample', sample)}>{copied === 'sample' ? 'Request copied' : 'Copy request shape'}</button></div></article><article className="connect-card setup-card"><div className="connect-card-head"><span>02 · AI BRIDGE SETUP</span><em>Key stays local</em></div><ol><li>Create <code>.env.local</code> beside this project.</li><li>Add <code>XAI_API_KEY=...</code>.</li><li>Optional: set <code>REEL_FORGE_LOCAL_TOKEN=...</code> for bearer protection.</li><li>Restart the local server, then ask for a plan below.</li></ol><p>No key is stored in your browser, JSON manifest, or site deployment.</p></article></section>
      <section className="connect-card endpoint-card"><div className="connect-card-head"><span>03 · BOT CAPABILITIES</span><em>{health.localTokenGuard === 'enabled' ? 'Bearer guard enabled' : 'Token guard optional'}</em></div><div className="endpoint-list">{endpoints.map(([number, name, method, path, detail]) => <article key={path}><span>{number}</span><div><b>{name}</b><p>{detail}</p></div><code>{method}</code><button onClick={() => void copy(path, `${origin}${path}`)}>{copied === path ? 'Copied' : path}</button></article>)}</div></section>
      <section className="connect-grid action-grid"><article className="connect-card manifest-card-local"><div className="connect-card-head"><span>04 · CURRENT BOT HANDOFF</span><em>Browser → JSON</em></div><p>Pulls your saved Studio, Agent Desk, Edit Lab, and caption packet into one portable local manifest.</p><div className="manifest-actions"><button onClick={() => setManifest(createLocalManifest())}>Refresh saved data</button><button onClick={() => void copy('manifest', JSON.stringify(manifest, null, 2))}>{copied === 'manifest' ? 'Manifest copied' : 'Copy current manifest'}</button><button onClick={() => download('noh-local-bot-handoff.json', manifest)}>Download JSON</button><button onClick={() => void call('/api/reel-jobs/validate', { manifest })} disabled={busy}>{busy ? 'Working…' : 'Run gate validation'}</button></div><pre>{JSON.stringify(manifest, null, 2)}</pre></article><article className="connect-card plan-card"><div className="connect-card-head"><span>05 · GROK EDIT PLAN</span><em>xAI required</em></div><label>Focused instruction<textarea rows={4} value={instruction} onChange={(event) => setInstruction(event.target.value)} /></label><button className="plan-button" onClick={() => void call('/api/reel-jobs/plan', { manifest, instruction })} disabled={busy}>{busy ? 'Asking Grok…' : 'Ask Grok for an edit plan'}</button><p>Without a local <code>XAI_API_KEY</code>, this safely returns a setup message instead of contacting a provider.</p></article></section>
      <section className="connect-card result-card"><div className="connect-card-head"><span>06 · LOCAL RESPONSE</span><em>Nothing auto-sent</em></div><pre>{result || 'Run a gate validation or an edit-plan request to inspect the bot response here.'}</pre></section>
      <section className="connect-rules"><p className="kicker">USAGE RULE</p><h2>Give Grok the manifest.<br />Keep the authority.</h2><div><span>✓ Read local contract</span><span>✓ Validate gates</span><span>✓ Draft edit plans</span><span>× Publish automatically</span><span>× Remove human review</span><span>× Expose keys</span></div></section>
    </main><footer className="forge-footer"><span>NOH | AI at work</span><span>Local bot gateway · validation + planning only</span><span>Created with Grok</span></footer></>;
}
