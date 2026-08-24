"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "./language";
import { SiteHeader } from "./site-header";
import {
  GateStrip,
  UiText,
  presets,
  sceneScale,
  SceneCanvas,
  todayLocal,
  useForge,
  type Preset,
  type Project,
  type View,
} from "./forge-shared";
import { ExportRoom } from "./forge-export-room";

function Topbar({ view }: { view: View }) {
  return <SiteHeader current={view} />;
}

function Timeline({
  project,
  setProject,
  playing,
  playhead,
  onPlay,
  onScrub,
}: {
  project: Project;
  setProject: (project: Project) => void;
  playing: boolean;
  playhead: number;
  onPlay: () => void;
  onScrub: (time: number) => void;
}) {
  const total = project.durationA + project.durationB;
  return (
    <section className="timeline-card">
      <div className="timeline-head">
        <div>
          <span>SEQUENCE</span>
          <b>
            A block <i>| CUT |</i> B block
          </b>
        </div>
        <button className="play-button" onClick={onPlay}>
          {playing ? "Playing" : `Play ${total}s`}{" "}
          <span>{playing ? "■" : "▶"}</span>
        </button>
      </div>
      <div className="timeline-track">
        <div
          className="clip clip-a"
          style={{ width: `${(project.durationA / total) * 100}%` }}
        >
          <span>SCENE A</span>
          <small>zoom {project.sceneA.motion}</small>
        </div>
        <div className="cut">
          <i />
          CUT
        </div>
        <div
          className="clip clip-b"
          style={{ width: `${(project.durationB / total) * 100}%` }}
        >
          <span>SCENE B</span>
          <small>{project.sceneB.motion} move</small>
        </div>
        <div
          className="playhead"
          style={{ left: `${(playhead / total) * 100}%` }}
        />
      </div>
      <input
        aria-label="Scrub reel preview"
        className="scrubber"
        type="range"
        min="0"
        max={total}
        step="0.05"
        value={playhead}
        onChange={(event) => onScrub(Number(event.target.value))}
      />
      <div className="timing-controls">
        <label>
          A duration{" "}
          <input
            type="number"
            min="4"
            max="8"
            step=".5"
            value={project.durationA}
            onChange={(event) =>
              setProject({ ...project, durationA: Number(event.target.value) })
            }
          />{" "}
          sec
        </label>
        <label>
          B duration{" "}
          <input
            type="number"
            min="4"
            max="8"
            step=".5"
            value={project.durationB}
            onChange={(event) =>
              setProject({ ...project, durationB: Number(event.target.value) })
            }
          />{" "}
          sec
        </label>
        <span>30 fps · hard cut only</span>
      </div>
    </section>
  );
}

function Studio({ forge }: { forge: ReturnType<typeof useForge> }) {
  const { t } = useLanguage();
  const { project, setProject, gates, allGreen, slots } = forge;
  const [playing, setPlaying] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const raf = useRef<number | null>(null);
  // Read via a ref (not the `playhead` dependency) so toggling `playing` resumes
  // from wherever the playhead was, without the effect restarting every frame --
  // the tick loop below updates `playhead` on every frame, so depending on it
  // directly would cancel and restart the rAF loop constantly.
  const playheadRef = useRef(playhead);
  useEffect(() => {
    playheadRef.current = playhead;
  }, [playhead]);
  useEffect(() => {
    if (!playing) return;
    const start = performance.now() - playheadRef.current * 1000;
    const total = (project.durationA + project.durationB) * 1000;
    const tick = (now: number) => {
      setPlayhead(((now - start) % total) / 1000);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [playing, project.durationA, project.durationB]);
  const progressA = Math.min(1, playhead / project.durationA);
  const progressB = Math.min(
    1,
    Math.max(0, playhead - project.durationA) / project.durationB,
  );
  const showingA = playhead < project.durationA;
  return (
    <main className="forge-main studio-main">
      <section className="studio-title">
        <div>
          <p className="kicker">LOCAL VIDEO WORKSPACE</p>
          <h1>
            {t("감정을 재현하세요.", "Emotional recreate.")}
            <br />
            <span>
              {t(
                "PNG 두 장을 붙이는 것이 아닙니다.",
                "Not two PNGs taped together.",
              )}
            </span>
          </h1>
        </div>
        <div className="studio-actions">
          <label className="audio-select">
            {t("오디오", "Audio")}
            <select
              value={project.audio}
              onChange={(event) =>
                setProject({
                  ...project,
                  audio: event.target.value as Project["audio"],
                })
              }
            >
              <option value="none">{t("없음", "none")}</option>
              <option value="ig_safe">
                {t("Instagram 안전 음원", "ig_safe")}
              </option>
              <option value="original">{t("원본", "original")}</option>
            </select>
          </label>
          <button
            className={`test-switch ${project.abTest ? "on" : ""}`}
            onClick={() => setProject({ ...project, abTest: !project.abTest })}
          >
            <i />{" "}
            {project.abTest
              ? t("A/B 테스트 — 공유 금지", "A/B TEST — DO NOT SHARE")
              : t("실제 릴", "REAL MEME")}
          </button>
        </div>
      </section>
      <GateStrip gates={gates} />
      <p className="empty-copy">
        {t(
          "상황을 고르고, 서로 다른 두 장면을 한 번의 컷으로 연결하세요.",
          "Pick a situation. Two different worlds. One cut.",
        )}
      </p>
      <section className="scene-grid">
        <SceneCanvas
          label="A"
          scene={project.sceneA}
          active={showingA}
          progress={progressA}
          onChange={(sceneA) =>
            setProject({ ...project, sceneA, hook: sceneA.headline })
          }
        />
        <SceneCanvas
          label="B"
          scene={project.sceneB}
          active={!showingA}
          progress={progressB}
          onChange={(sceneB) => setProject({ ...project, sceneB })}
        />
      </section>
      <div className="live-preview">
        <span>
          {t("실시간 미리보기", "LIVE PREVIEW")} ·{" "}
          {showingA ? t("장면 A", "SCENE A") : t("장면 B", "SCENE B")}
        </span>
        <div
          className={`preview-stage mood-${showingA ? project.sceneA.mood : project.sceneB.mood}`}
        >
          <div
            style={{
              transform: `scale(${sceneScale(showingA ? project.sceneA : project.sceneB, showingA ? progressA : progressB)})`,
            }}
          >
            <small>LOCAL</small>
            <b>
              {showingA ? project.sceneA.headline : project.sceneB.headline}
            </b>
            <p>{showingA ? project.sceneA.accent : project.sceneB.accent}</p>
          </div>
        </div>
      </div>
      <Timeline
        project={project}
        setProject={setProject}
        playing={playing}
        playhead={playhead}
        onPlay={() => setPlaying((value) => !value)}
        onScrub={(time) => {
          setPlaying(false);
          setPlayhead(time);
        }}
      />
      <section className="studio-bottom">
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={project.originalReupload}
            onChange={(event) =>
              setProject({ ...project, originalReupload: event.target.checked })
            }
          />{" "}
          {t("원본 게시물 재업로드", "Original post re-upload")}
        </label>
        <a className={`export-link ${allGreen ? "" : "locked"}`} href="/export">
          {allGreen
            ? t(
                "내보내기 (모든 게이트 통과 필요) ↗",
                "Export (gates green only) ↗",
              )
            : t(
                "내보내기 잠김 — 먼저 게이트를 해결하세요",
                "Export locked — fix gates first",
              )}
        </a>
        <span>
          {t("오늘", "Today")}: {slots[todayLocal()] ?? 0} / 2{" "}
          {t("릴 슬롯", "Reel slots")}
        </span>
      </section>
    </main>
  );
}

function Library({ forge }: { forge: ReturnType<typeof useForge> }) {
  const { project, setProject, lastTemplates } = forge;
  const select = (preset: Preset) =>
    setProject({
      ...project,
      presetId: preset.id,
      hook: preset.sceneA.headline,
      sceneA: preset.sceneA,
      sceneB: preset.sceneB,
      durationA: 5,
      durationB: 5,
    });
  return (
    <main className="forge-main subpage">
      <section className="page-intro">
        <p className="kicker">
          <UiText ko="상황 밈" en="SITUATION MEMES" />
        </p>
        <h1>
          <UiText ko="라이브러리" en="Library" />
        </h1>
        <p>
          <UiText
            ko="직장 속 감정을 고르고, 두 번째 장면은 확실히 다르게 만드세요."
            en="Choose a workplace feeling. Then make the second world genuinely different."
          />
        </p>
      </section>
      <section className="preset-grid">
        {presets.map((preset, index) => {
          const used = lastTemplates.includes(preset.id);
          return (
            <article
              className={`preset-card ${project.presetId === preset.id ? "selected" : ""}`}
              key={preset.id}
            >
              <span>0{index + 1}</span>
              <h2>{preset.title}</h2>
              <p>A: {preset.sceneA.headline}</p>
              <p>B: {preset.sceneB.headline}</p>
              <small>{preset.motionHint}</small>
              <button onClick={() => select(preset)}>
                {used ? (
                  <UiText
                    ko="다시 사용 — 게이트 B가 차단됩니다"
                    en="Use again — Gate B will block"
                  />
                ) : project.presetId === preset.id ? (
                  <UiText ko="불러옴" en="Loaded" />
                ) : (
                  <UiText ko="프리셋 불러오기" en="Load preset" />
                )}{" "}
                <i>↗</i>
              </button>
            </article>
          );
        })}
      </section>
      <section className="recent-panel">
        <div>
          <p className="kicker">
            <UiText ko="최근 7개" en="RECENT 7" />
          </p>
          <h2>
            <UiText ko="템플릿 보호" en="Template guard" />
          </h2>
        </div>
        <p>
          {lastTemplates.length ? (
            lastTemplates
              .map(
                (id) => presets.find((preset) => preset.id === id)?.title ?? id,
              )
              .join(" · ")
          ) : (
            <UiText
              ko="아직 내보낸 템플릿이 없습니다. 첫 릴은 바로 만들 수 있습니다."
              en="No template has been exported yet. Your first reel is clear."
            />
          )}
        </p>
      </section>
    </main>
  );
}

function PacketEditor({ forge }: { forge: ReturnType<typeof useForge> }) {
  const { packet, setPacket, gates } = forge;
  const [tagInput, setTagInput] = useState(packet.tags.join(" "));
  const updateTags = (value: string) => {
    setTagInput(value);
    setPacket({
      ...packet,
      tags: value
        .split(/[\s,]+/)
        .filter(Boolean)
        .slice(0, 5),
    });
  };
  return (
    <main className="forge-main subpage">
      <section className="page-intro">
        <p className="kicker">
          <UiText ko="캡션 패킷" en="CAPTION PACKET" />
        </p>
        <h1>
          <UiText
            ko="웃음 뒤에도 게시물은 유용해야 합니다."
            en="Make the post useful after the laugh."
          />
        </h1>
        <p>
          <UiText
            ko="대화창에만 있는 캡션은 게이트 C 실패입니다. 아래에 실제 캡션 패킷을 저장하세요."
            en="Chat-only caption = Gate C fail. Save the real packet below."
          />
        </p>
      </section>
      <div className="packet-layout">
        <form
          className="packet-form"
          onSubmit={(event) => event.preventDefault()}
        >
          <label>
            <UiText ko="훅" en="Hook" />
            <input
              value={packet.hook}
              onChange={(event) =>
                setPacket({ ...packet, hook: event.target.value })
              }
            />
          </label>
          <label>
            <UiText ko="본문" en="Body" />{" "}
            <small>
              <UiText ko="유용한 문장 3–5개" en="3–5 useful lines" />
            </small>
            <textarea
              rows={5}
              value={packet.body}
              onChange={(event) =>
                setPacket({ ...packet, body: event.target.value })
              }
            />
          </label>
          <label>
            <UiText ko="태그" en="Tags" />{" "}
            <small>
              <UiText ko="최대 5개" en="up to 5" />
            </small>
            <input
              value={tagInput}
              onChange={(event) => updateTags(event.target.value)}
              placeholder="#aiatwork #email #prompts"
            />
          </label>
          <label>
            <UiText ko="댓글 프롬프트" en="Comment PROMPT" />
            <textarea
              rows={6}
              value={packet.commentPrompt}
              onChange={(event) =>
                setPacket({ ...packet, commentPrompt: event.target.value })
              }
            />
          </label>
        </form>
        <aside className="packet-preview">
          <span>
            <UiText ko="게시물 미리보기" en="POST PREVIEW" />
          </span>
          <h2>
            {packet.hook || (
              <UiText
                ko="여기에 강한 훅을 넣으세요."
                en="A sharp hook goes here."
              />
            )}
          </h2>
          <p>
            {packet.body || (
              <UiText
                ko="유용한 캡션이 여기에 표시됩니다."
                en="The useful caption lives here."
              />
            )}
          </p>
          <b>{packet.tags.join(" ")}</b>
          <hr />
          <small>
            <UiText ko="댓글 프롬프트" en="COMMENT PROMPT" />
          </small>
          <pre>
            {packet.commentPrompt || (
              <UiText
                ko="복사 가능한 프롬프트가 여기에 표시됩니다."
                en="A copyable prompt belongs here."
              />
            )}
          </pre>
        </aside>
      </div>
      <GateStrip gates={gates} />
    </main>
  );
}

function GateBoard({ forge }: { forge: ReturnType<typeof useForge> }) {
  const { gates, project } = forge;
  return (
    <main className="forge-main subpage">
      <section className="page-intro gate-intro">
        <p className="kicker">
          <UiText ko="품질 관리" en="QUALITY CONTROL" />
        </p>
        <h1>
          <UiText ko="게이트 보드" en="Gate board" />
        </h1>
        <p>
          <UiText
            ko="실제 계정에서 통할 수 있는지 확인합니다."
            en="This would die on the real account."
          />
        </p>
      </section>
      <GateStrip gates={gates} />
      <section className="gate-board">
        {gates.map((gate) => (
          <article
            key={gate.id}
            className={`gate-board-card ${gate.pass ? "pass" : "fail"}`}
          >
            <div>
              <span>GATE {gate.id}</span>
              <b>
                {gate.pass ? (
                  <UiText ko="통과" en="PASS" />
                ) : (
                  <UiText ko="실패" en="FAIL" />
                )}
              </b>
            </div>
            <h2>
              {gate.id === "A" ? (
                <UiText ko="카피" en="Copy" />
              ) : gate.id === "B" ? (
                <UiText ko="장면과 형식" en="Scene and format" />
              ) : (
                <UiText ko="캡션 패킷" en="Caption packet" />
              )}
            </h2>
            <p>{gate.pass ? gate.passText : gate.failText}</p>
            <ul>
              {gate.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>
      <section className="rule-panel">
        <div>
          <span>
            <UiText ko="반드시 지킬 원칙" en="NON-NEGOTIABLE" />
          </span>
          <h2>
            <UiText
              ko="크로스페이드가 아닌 하드 컷."
              en="Hard cut, not a crossfade."
            />
          </h2>
        </div>
        <div>
          <p>
            <UiText ko="총 길이" en="Total duration" />
          </p>
          <b>{project.durationA + project.durationB}s / 8–12s</b>
        </div>
        <div>
          <p>
            <UiText ko="오디오" en="Audio" />
          </p>
          <b>{project.audio}</b>
        </div>
        <div>
          <p>
            <UiText ko="템플릿" en="Template" />
          </p>
          <b>{project.presetId}</b>
        </div>
      </section>
    </main>
  );
}

export default function ReelForge({ view }: { view: View }) {
  const forge = useForge();
  return (
    <>
      <Topbar view={view} />
      {view === "studio" && <Studio forge={forge} />}
      {view === "library" && <Library forge={forge} />}
      {view === "packet" && <PacketEditor forge={forge} />}
      {view === "gates" && <GateBoard forge={forge} />}
      {view === "export" && <ExportRoom forge={forge} />}
      <footer className="forge-footer">
        <span>LOCAL VIDEO WORKSPACE</span>
        <span>Build, review, and export on this device.</span>
        <span>Private by default</span>
      </footer>
    </>
  );
}
