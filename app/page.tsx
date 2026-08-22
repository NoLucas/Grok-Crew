'use client';

import { useMemo, useState } from 'react';

type Bot = {
  id: string;
  mark: string;
  name: string;
  role: string;
  description: string;
  color: string;
  starter: string;
};

const bots: Bot[] = [
  {
    id: 'scout',
    mark: 'S',
    name: 'Scout',
    role: '리서치 스카우트',
    description: '흩어진 정보를 빠르게 훑고, 확인이 필요한 포인트를 짚습니다.',
    color: 'violet',
    starter: '시장과 맥락을 조사하고, 신뢰할 수 있는 근거와 함께 핵심만 정리해줘.',
  },
  {
    id: 'atlas',
    mark: 'A',
    name: 'Atlas',
    role: '전략 설계자',
    description: '복잡한 문제를 결정 가능한 옵션과 다음 행동으로 바꿉니다.',
    color: 'lime',
    starter: '목표를 달성하기 위한 선택지와 실행 순서를 설계해줘.',
  },
  {
    id: 'forge',
    mark: 'F',
    name: 'Forge',
    role: '프로덕트 메이커',
    description: '아이디어를 문서, 화면, 체크리스트처럼 쓸 수 있는 결과물로 만듭니다.',
    color: 'orange',
    starter: '바로 실행할 수 있는 결과물로 만들고, 검증 방법까지 제안해줘.',
  },
];

const quickTasks = [
  '이번 주 경쟁사 움직임 요약',
  '신규 캠페인 실행안 만들기',
  '고객 인터뷰 질문 다듬기',
];

export default function Home() {
  const [selectedId, setSelectedId] = useState('scout');
  const [goal, setGoal] = useState('');
  const [prepared, setPrepared] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showRunbook, setShowRunbook] = useState(false);
  const [missions, setMissions] = useState([
    { title: '봇 운영 공간 설계', bot: 'Atlas', status: '준비됨', time: '방금 전' },
    { title: 'Grok 프롬프트 점검', bot: 'Scout', status: '완료', time: '12분 전' },
  ]);

  const selectedBot = bots.find((bot) => bot.id === selectedId) ?? bots[0];
  const mission = useMemo(() => {
    const objective = goal.trim() || '여기에 목표를 입력해줘';
    return `당신은 ${selectedBot.role} ${selectedBot.name}입니다.\n\n목표: ${objective}\n\n작업 방식: ${selectedBot.starter}\n\n응답 형식:\n1. 핵심 결론\n2. 근거와 가정\n3. 다음 행동 3가지\n4. 확인이 필요한 질문`;
  }, [goal, selectedBot]);

  async function copyMission() {
    await navigator.clipboard?.writeText(mission);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function prepareMission() {
    const title = goal.trim() || '새 Grok 미션';
    setPrepared(true);
    setMissions((current) => [
      { title, bot: selectedBot.name, status: '준비됨', time: '방금 전' },
      ...current.slice(0, 3),
    ]);
  }

  async function sendToGrok() {
    await copyMission();
    window.open(`https://grok.com/?q=${encodeURIComponent(mission)}`, '_blank', 'noopener,noreferrer');
  }

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Grok Crew 홈">
          <span className="brand-mark">G</span>
          <span>Grok <em>Crew</em></span>
        </a>
        <nav aria-label="주요 메뉴">
          <a href="#crew">크루</a>
          <a href="#mission">미션 데스크</a>
          <a href="#activity">활동</a>
        </nav>
        <button className="ghost-button" onClick={() => setShowRunbook((value) => !value)}>
          {showRunbook ? '런북 닫기' : '운영 런북'}
        </button>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span className="live-dot" /> GROK BOT WORKSPACE</p>
          <h1>봇이 찾아오고,<br /><i>일이 앞으로 갑니다.</i></h1>
          <p className="hero-description">
            내 Grok 봇을 역할별로 불러 미션을 조율하고, 즉시 실행 가능한 지시문으로 보냅니다.
          </p>
          <div className="hero-actions">
            <a className="primary-button" href="#mission">미션 시작 <span>↘</span></a>
            <button className="text-button" onClick={() => setShowRunbook(true)}>어떻게 쓰나요? <span>→</span></button>
          </div>
          <div className="signal-row" aria-label="현재 상태">
            <div><strong>03</strong><span>활성 봇</span></div>
            <div><strong>24/7</strong><span>미션 준비</span></div>
            <div><strong>01</strong><span>공용 워크스페이스</span></div>
          </div>
        </div>

        <div className="hero-orbit" aria-label="Grok 봇 크루 현황">
          <div className="orbit-line" />
          <div className="orbit-center"><span>G</span><small>CREW<br />ONLINE</small></div>
          {bots.map((bot, index) => (
            <button
              key={bot.id}
              className={`orbit-bot orbit-${index + 1} ${selectedId === bot.id ? 'selected' : ''}`}
              onClick={() => {
                setSelectedId(bot.id);
                document.getElementById('mission')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              aria-label={`${bot.name} 선택`}
            >
              <span className={`bot-avatar ${bot.color}`}>{bot.mark}</span>
              <b>{bot.name}</b>
              <small>{bot.role}</small>
            </button>
          ))}
        </div>
      </section>

      {showRunbook && (
        <section className="runbook" aria-label="운영 런북">
          <p className="eyebrow">THE 3-MINUTE RUNBOOK</p>
          <div className="runbook-steps">
            <div><span>01</span><b>봇을 고릅니다</b><p>조사, 전략, 제작 중 이번 미션에 맞는 역할을 선택합니다.</p></div>
            <div><span>02</span><b>목표를 적습니다</b><p>한 문장 목표만 입력하면 봇의 역할이 반영된 지시문이 완성됩니다.</p></div>
            <div><span>03</span><b>Grok으로 보냅니다</b><p>완성된 지시문을 복사하거나 Grok에서 바로 열어 실행합니다.</p></div>
          </div>
        </section>
      )}

      <section className="crew-section" id="crew">
        <div className="section-heading">
          <p className="eyebrow">YOUR CREW</p>
          <h2>각자 잘하는 일에<br />집중하는 봇들</h2>
        </div>
        <div className="bot-list">
          {bots.map((bot, index) => (
            <button
              key={bot.id}
              className={`bot-card ${selectedId === bot.id ? 'active' : ''}`}
              onClick={() => setSelectedId(bot.id)}
            >
              <span className="card-index">0{index + 1}</span>
              <span className={`bot-avatar large ${bot.color}`}>{bot.mark}</span>
              <span className="bot-card-copy"><b>{bot.name}</b><small>{bot.role}</small><p>{bot.description}</p></span>
              <span className="card-arrow">↗</span>
            </button>
          ))}
        </div>
      </section>

      <section className="mission-section" id="mission">
        <div className="mission-sidebar">
          <p className="eyebrow">MISSION DESK</p>
          <h2>오늘,<br /><i>무엇을<br />움직일까요?</i></h2>
          <p>목표 하나로 크루가 이해할 수 있는 미션을 만드세요.</p>
          <div className="quick-tasks">
            <span>바로 시작하기</span>
            {quickTasks.map((task) => <button key={task} onClick={() => setGoal(task)}>{task}<b>+</b></button>)}
          </div>
        </div>

        <div className="mission-console">
          <div className="console-topline"><span>현재 담당</span><span className="online-label"><i /> ONLINE</span></div>
          <div className="selected-bot">
            <span className={`bot-avatar large ${selectedBot.color}`}>{selectedBot.mark}</span>
            <div><b>{selectedBot.name}</b><small>{selectedBot.role}</small></div>
            <button onClick={() => document.getElementById('crew')?.scrollIntoView({ behavior: 'smooth' })}>바꾸기</button>
          </div>

          <label className="goal-label" htmlFor="goal">이번 미션의 목표</label>
          <textarea
            id="goal"
            value={goal}
            onChange={(event) => { setGoal(event.target.value); setPrepared(false); }}
            placeholder="예: 다음 분기 신규 고객을 위한 캠페인 방향을 정리해줘"
            rows={3}
          />
          <div className="console-actions">
            <button className="prepare-button" onClick={prepareMission}>미션 준비하기 <span>↗</span></button>
            <button className="copy-button" onClick={copyMission}>{copied ? '복사됐어요' : '지시문 복사'}</button>
          </div>

          {prepared && (
            <div className="mission-ready" role="status">
              <span>✓</span><div><b>미션이 준비됐어요.</b><p>아래에서 지시문을 Grok에 바로 보낼 수 있습니다.</p></div>
            </div>
          )}

          <details className="prompt-preview">
            <summary>봇에게 전달될 지시문 <span>⌄</span></summary>
            <pre>{mission}</pre>
          </details>
          <button className="grok-button" onClick={sendToGrok}>Grok에서 이 미션 열기 <span>↗</span></button>
          <p className="console-note">지시문이 클립보드에 복사된 뒤 Grok을 새 창에서 엽니다.</p>
        </div>
      </section>

      <section className="activity-section" id="activity">
        <div className="activity-heading"><div><p className="eyebrow">MISSION LOG</p><h2>크루 활동</h2></div><span>이 기기에서 준비한 미션</span></div>
        <div className="mission-log">
          {missions.map((item, index) => (
            <article key={`${item.title}-${index}`}>
              <span className="log-number">{String(index + 1).padStart(2, '0')}</span>
              <div><b>{item.title}</b><p>{item.bot} · {item.time}</p></div>
              <span className={`status ${item.status === '완료' ? 'done' : ''}`}>{item.status}</span>
            </article>
          ))}
        </div>
      </section>

      <footer>
        <a className="brand" href="#top"><span className="brand-mark">G</span><span>Grok <em>Crew</em></span></a>
        <p>Mission control for curious bots and the humans who lead them.</p>
        <a href="#top">위로 가기 ↑</a>
      </footer>
    </main>
  );
}
