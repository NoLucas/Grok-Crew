"use client";

type RenderSettings = {
  fps: 24 | 30 | 60;
  quality: "compact" | "balanced" | "high";
  crop_anchor: "left" | "center" | "right";
  speed: number;
  volume: number;
  normalize_audio: boolean;
  mute_audio: boolean;
  fade_in: number;
  fade_out: number;
  look: "natural" | "punchy" | "mono" | "night";
  brightness: number;
  contrast: number;
  gamma: number;
  mirror: boolean;
  captions_enabled: boolean;
  caption_color: string;
  caption_size: number;
  caption_y: number;
  caption_stroke: number;
  caption_bg: boolean;
  caption_bg_color: string;
  platform: string;
  music_track: string;
  music_volume: number;
  music_loop: boolean;
};
type PlatformPreset = { width: number; height: number; label: string };
type Presets = {
  quality_presets: Record<string, Partial<RenderSettings>>;
  caption_layout_presets: Record<string, Partial<RenderSettings>>;
  platform_presets: Record<string, PlatformPreset>;
};

export type { PlatformPreset, Presets, RenderSettings };

export function FinishRack({
  renderSettings,
  patchSettings,
  applyPreset,
  presets,
  t,
}: {
  renderSettings: RenderSettings;
  patchSettings: <K extends keyof RenderSettings>(
    key: K,
    value: RenderSettings[K],
  ) => void;
  applyPreset: (patch: Partial<RenderSettings>) => void;
  presets: Presets | null;
  t: (ko: string, en: string) => string;
}) {
  return (
    <section className="finish-rack">
      <div className="finish-rack-head">
        <div>
          <p className="kicker">{t("04 · 마무리 설정", "04 · FINISH RACK")}</p>
          <h2>
            {t("보이는 편집값을", "Apply visible edit values to the")} <span>{t("실제 로컬 렌더", "real local render")}</span>{t("에도 적용.", ".")}
          </h2>
        </div>
        <p>
          {t("이 설정은 다음에 만드는 프로젝트의 EDL 안에 저장됩니다. 미리보기용 버튼이 아니라 MoviePy 렌더에서 직접 사용됩니다.", "These settings are saved in the EDL for the next project and used directly by MoviePy rendering, not just for preview.")}
        </p>
      </div>
      <div className="finish-grid">
        <article>
          <span>{t("세로 리프레임", "VERTICAL REFRAME")}</span>
          <h3>{t("9:16 프레이밍", "9:16 framing")}</h3>
          <label>
            {t("출력 플랫폼", "Output platform")}
            <select
              value={renderSettings.platform}
              onChange={(event) =>
                patchSettings("platform", event.target.value)
              }
            >
              {presets
                ? Object.entries(presets.platform_presets).map(
                    ([key, preset]) => (
                      <option key={key} value={key}>
                        {preset.label} · {preset.width}×{preset.height}
                      </option>
                    ),
                  )
                : (
                    <option value="reels_tiktok_shorts">
                      Reels / TikTok / Shorts (9:16) · 1080×1920
                    </option>
                  )}
            </select>
          </label>
          <label>
            {t("피사체 기준 위치", "Subject anchor")}
            <select
              value={renderSettings.crop_anchor}
              onChange={(event) =>
                patchSettings(
                  "crop_anchor",
                  event.target.value as RenderSettings["crop_anchor"],
                )
              }
            >
              <option value="left">{t("왼쪽 우선", "Left")}</option>
              <option value="center">{t("가운데", "Center")}</option>
              <option value="right">{t("오른쪽 우선", "Right")}</option>
            </select>
          </label>
          <label className="finish-toggle">
            <input
              type="checkbox"
              checked={renderSettings.mirror}
              onChange={(event) =>
                patchSettings("mirror", event.target.checked)
              }
            />{" "}
            {t("좌우 반전", "Mirror horizontally")}
          </label>
          <p>
            {t("가로 영상을 세로 1080×1920으로 채울 때 어느 쪽을 유지할지 정합니다.", "Choose which side to preserve when filling a vertical 1080×1920 frame from horizontal footage.")}
          </p>
        </article>
        <article>
          <span>{t("움직임 + 오디오", "MOTION + AUDIO")}</span>
          <h3>{t("속도와 음량", "Speed and volume")}</h3>
          <label>
            {t("전체 속도", "Overall speed")} <output>{renderSettings.speed.toFixed(2)}×</output>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.05"
              value={renderSettings.speed}
              onChange={(event) =>
                patchSettings("speed", Number(event.target.value))
              }
            />
          </label>
          <label>
            {t("원본 음량", "Source volume")} {" "}
            <output>
              {renderSettings.mute_audio
                ? t("음소거", "mute")
                : `${renderSettings.volume}%`}
            </output>
            <input
              type="range"
              min="0"
              max="200"
              value={renderSettings.volume}
              disabled={renderSettings.mute_audio}
              onChange={(event) =>
                patchSettings("volume", Number(event.target.value))
              }
            />
          </label>
          <div className="finish-pair">
            <label>
              {t("시작 페이드", "Fade in")}
              <input
                type="number"
                min="0"
                max="2"
                step=".02"
                value={renderSettings.fade_in}
                onChange={(event) =>
                  patchSettings("fade_in", Number(event.target.value))
                }
              />
            </label>
            <label>
              {t("끝 페이드", "Fade out")}
              <input
                type="number"
                min="0"
                max="2"
                step=".02"
                value={renderSettings.fade_out}
                onChange={(event) =>
                  patchSettings("fade_out", Number(event.target.value))
                }
              />
            </label>
          </div>
          <label className="finish-toggle">
            <input
              type="checkbox"
              checked={renderSettings.normalize_audio}
              onChange={(event) =>
                patchSettings("normalize_audio", event.target.checked)
              }
            />{" "}
            {t("음량 정규화", "Normalize volume")}
          </label>
          <label className="finish-toggle">
            <input
              type="checkbox"
              checked={renderSettings.mute_audio}
              onChange={(event) =>
                patchSettings("mute_audio", event.target.checked)
              }
            />{" "}
            {t("원본 오디오 제거", "Mute source audio")}
          </label>
          <label>
            {t("배경 음악 (작업 공간 내부 경로)", "Background music (path inside workspace)")}
            <input
              value={renderSettings.music_track}
              onChange={(event) =>
                patchSettings("music_track", event.target.value)
              }
              placeholder="inputs/music-bed.mp3"
            />
          </label>
          <label>
            {t("음악 음량", "Music volume")} <output>{renderSettings.music_volume}%</output>
            <input
              type="range"
              min="0"
              max="100"
              disabled={!renderSettings.music_track}
              value={renderSettings.music_volume}
              onChange={(event) =>
                patchSettings("music_volume", Number(event.target.value))
              }
            />
          </label>
          <label className="finish-toggle">
            <input
              type="checkbox"
              checked={renderSettings.music_loop}
              disabled={!renderSettings.music_track}
              onChange={(event) =>
                patchSettings("music_loop", event.target.checked)
              }
            />{" "}
            {t("영상 길이에 맞춰 반복 재생", "Loop to match the video length")}
          </label>
        </article>
        <article>
          <span>{t("색상 + 룩", "COLOR + LOOK")}</span>
          <h3>{t("색감 보정", "Color correction")}</h3>
          <label>
            {t("룩 프리셋", "Look preset")}
            <select
              value={renderSettings.look}
              onChange={(event) =>
                patchSettings(
                  "look",
                  event.target.value as RenderSettings["look"],
                )
              }
            >
              <option value="natural">{t("자연스러움", "Natural")}</option>
              <option value="punchy">{t("강한 대비", "Punchy contrast")}</option>
              <option value="mono">{t("흑백", "Black & white")}</option>
              <option value="night">{t("야간 보정", "Night lift")}</option>
            </select>
          </label>
          <div className="finish-pair">
            <label>
              {t("밝기", "Brightness")} {" "}
              <output>
                {renderSettings.brightness > 0 ? "+" : ""}
                {renderSettings.brightness}
              </output>
              <input
                type="range"
                min="-40"
                max="40"
                value={renderSettings.brightness}
                onChange={(event) =>
                  patchSettings("brightness", Number(event.target.value))
                }
              />
            </label>
            <label>
              {t("대비", "Contrast")} {" "}
              <output>
                {renderSettings.contrast > 0 ? "+" : ""}
                {renderSettings.contrast}
              </output>
              <input
                type="range"
                min="-40"
                max="55"
                value={renderSettings.contrast}
                onChange={(event) =>
                  patchSettings("contrast", Number(event.target.value))
                }
              />
            </label>
          </div>
          <label>
            {t("감마", "Gamma")} <output>{renderSettings.gamma.toFixed(2)}</output>
            <input
              type="range"
              min="0.65"
              max="1.55"
              step=".05"
              value={renderSettings.gamma}
              onChange={(event) =>
                patchSettings("gamma", Number(event.target.value))
              }
            />
          </label>
        </article>
        <article>
          <span>{t("자막 + 전달", "CAPTION + DELIVERY")}</span>
          <h3>{t("읽히는 최종본", "A readable final")}</h3>
          <label className="finish-toggle">
            <input
              type="checkbox"
              checked={renderSettings.captions_enabled}
              onChange={(event) =>
                patchSettings("captions_enabled", event.target.checked)
              }
            />{" "}
            {t("선택 구간 자막 번인", "Burn captions into kept clips")}
          </label>
          <div className="finish-pair">
            <label>
              {t("자막 색상", "Caption color")}
              <input
                type="color"
                value={renderSettings.caption_color}
                onChange={(event) =>
                  patchSettings("caption_color", event.target.value)
                }
              />
            </label>
            <label>
              {t("테두리", "Outline")} <output>{renderSettings.caption_stroke}px</output>
              <input
                type="range"
                min="0"
                max="8"
                value={renderSettings.caption_stroke}
                onChange={(event) =>
                  patchSettings(
                    "caption_stroke",
                    Number(event.target.value),
                  )
                }
              />
            </label>
          </div>
          <div className="finish-pair">
            <label className="finish-toggle">
              <input
                type="checkbox"
                checked={renderSettings.caption_bg}
                onChange={(event) =>
                  patchSettings("caption_bg", event.target.checked)
                }
              />{" "}
              {t("자막 배경 패널", "Caption background panel")}
            </label>
            <label>
              {t("배경 색상", "Background color")}
              <input
                type="color"
                value={renderSettings.caption_bg_color.slice(0, 7)}
                disabled={!renderSettings.caption_bg}
                onChange={(event) =>
                  patchSettings("caption_bg_color", event.target.value)
                }
              />
            </label>
          </div>
          <label>
            {t("자막 크기", "Caption size")} <output>{renderSettings.caption_size}px</output>
            <input
              type="range"
              min="38"
              max="110"
              value={renderSettings.caption_size}
              onChange={(event) =>
                patchSettings("caption_size", Number(event.target.value))
              }
            />
          </label>
          <label>
            {t("자막 세로 위치", "Caption vertical position")} <output>{renderSettings.caption_y}%</output>
            <input
              type="range"
              min="48"
              max="84"
              value={renderSettings.caption_y}
              onChange={(event) =>
                patchSettings("caption_y", Number(event.target.value))
              }
            />
          </label>
          <label>
            {t("출력 품질", "Output quality")}
            <select
              value={renderSettings.quality}
              onChange={(event) =>
                patchSettings(
                  "quality",
                  event.target.value as RenderSettings["quality"],
                )
              }
            >
              <option value="compact">{t("간단 · 빠른 검토", "Compact · quick review")}</option>
              <option value="balanced">{t("균형 · 일반 게시", "Balanced · normal publishing")}</option>
              <option value="high">{t("고품질 · 보관/게시", "High · archive/publish")}</option>
            </select>
          </label>
          <label>
            {t("프레임레이트", "Frame rate")}
            <select
              value={renderSettings.fps}
              onChange={(event) =>
                patchSettings(
                  "fps",
                  Number(event.target.value) as RenderSettings["fps"],
                )
              }
            >
              <option value="24">{t("24 fps · 시네마틱", "24 fps · cinematic")}</option>
              <option value="30">{t("30 fps · 릴 기본", "30 fps · reel standard")}</option>
              <option value="60">{t("60 fps · 빠른 동작", "60 fps · fast action")}</option>
            </select>
          </label>
          {presets && (
            <label>
              {t("품질 프리셋", "Quality preset")}
              <select
                defaultValue=""
                onChange={(event) => {
                  const patch = presets.quality_presets[event.target.value];
                  if (patch) applyPreset(patch);
                  event.target.value = "";
                }}
              >
                <option value="" disabled>
                  {t("프리셋 선택…", "Choose a preset…")}
                </option>
                {Object.keys(presets.quality_presets).map((key) => (
                  <option key={key} value={key}>
                    {key.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
          )}
          {presets && (
            <label>
              {t("자막 레이아웃 프리셋", "Caption layout preset")}
              <select
                defaultValue=""
                onChange={(event) => {
                  const patch = presets.caption_layout_presets[event.target.value];
                  if (patch) applyPreset(patch);
                  event.target.value = "";
                }}
              >
                <option value="" disabled>
                  {t("프리셋 선택…", "Choose a preset…")}
                </option>
                {Object.keys(presets.caption_layout_presets).map((key) => (
                  <option key={key} value={key}>
                    {key.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
          )}
        </article>
      </div>
      <div className="finish-readout">
        <b>{t("다음 렌더", "Next render")}</b>
        <span>
          {renderSettings.crop_anchor} crop ·{" "}
          {renderSettings.speed.toFixed(2)}× · {renderSettings.look} ·{" "}
          {renderSettings.mute_audio
            ? t("원본 오디오 끔", "source audio off")
            : t(`${renderSettings.volume}% 음량`, `${renderSettings.volume}% audio`)}{" "}
          ·{" "}
          {renderSettings.captions_enabled
            ? t("자막 번인", "burn-in captions")
            : t("자막 없음", "no captions")}{" "}
          · {renderSettings.fps}fps · {renderSettings.quality}
        </span>
      </div>
    </section>
  );
}
