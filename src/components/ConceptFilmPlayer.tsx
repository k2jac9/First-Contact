import React, { useEffect, useState } from 'react';
import {
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  ATLAS_EPISODES,
  FILM_DURATION_SEC,
  FILM_FPS,
  FILM_SCENES,
  FILM_TOTAL_FRAMES,
  SCENARIO_VARIANTS,
} from '../data/storyboard';
import {
  formatSmpte,
  formatTimecode,
  getSceneAtTime,
  timeToFrame,
} from '../utils/filmTimeline';
import { SafeImage } from './SafeImage';
import { TelemetryTraceChart } from './TelemetryTraceChart';

interface ConceptFilmPlayerProps {
  currentTime: number;
  isPlaying: boolean;
  isMuted: boolean;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onRestart: () => void;
  onToggleMute: () => void;
}

export const ConceptFilmPlayer: React.FC<ConceptFilmPlayerProps> = ({
  currentTime,
  isPlaying,
  isMuted,
  onTogglePlay,
  onSeek,
  onRestart,
  onToggleMute,
}) => {
  const [showGenieCaption, setShowGenieCaption] = useState(true);
  const [manualVariantIdx, setManualVariantIdx] = useState<number | null>(null);

  const { scene, progress } = getSceneAtTime(currentTime);
  const currentFrame = timeToFrame(currentTime, FILM_FPS);

  useEffect(() => {
    setManualVariantIdx(null);
  }, [scene.id]);

  const goPrevScene = () => {
    const idx = Math.max(0, scene.index - 2);
    onSeek(FILM_SCENES[idx].startSec);
  };

  const goNextScene = () => {
    const idx = Math.min(FILM_SCENES.length - 1, scene.index);
    onSeek(FILM_SCENES[idx].startSec);
  };

  const autoVariantIdx = Math.min(
    SCENARIO_VARIANTS.length - 1,
    Math.floor(progress * SCENARIO_VARIANTS.length)
  );
  const activeVariantIdx = manualVariantIdx ?? autoVariantIdx;
  const activeVariant = SCENARIO_VARIANTS[activeVariantIdx];

  const trainingStages = [
    { key: 'dataset', label: 'DATASET v02', note: 'Reviewed recovery intervals locked' },
    { key: 'training', label: 'TRAINING', note: 'Elapsed offline policy update' },
    { key: 'evaluation', label: 'EVALUATION', note: 'Independent terrain rollout checks' },
    { key: 'policy', label: 'POLICY v02', note: 'Checkpoint ready for retry' },
  ];
  const activeStageIdx = Math.min(3, Math.floor(progress * 4));

  return (
    <section aria-label="60-second concept film player" className="mx-auto max-w-[1040px] space-y-3.5">
      {/* 16:9 Widescreen Cinema Stage */}
      <div
        data-testid="film-viewport"
        data-scene-id={scene.id}
        className={`relative mx-auto w-full max-w-[960px] overflow-hidden rounded-lg border border-slate-800 bg-[#05070B] ${
          scene.kind === 'atlas' || scene.kind === 'training'
            ? 'min-h-[380px] sm:min-h-0 sm:aspect-video'
            : 'aspect-video'
        }`}
      >
        {/* Scene Visual Layer */}
        {scene.kind === 'title' ? (
          <div className="flex h-full w-full flex-col items-center justify-center bg-[#05070B] px-8 text-center">
            <p className="font-display text-3xl font-bold tracking-[0.18em] text-slate-50 sm:text-5xl">
              ROCKET ACADEMY
            </p>
            <p className="mt-2 font-mono text-sm tracking-[0.34em] text-cyan-400 sm:text-base">
              FIRST CONTACT
            </p>
            <p className="mt-6 max-w-xl text-sm text-slate-300 sm:text-base">
              Create worlds. Train robots. Learn from every mission.
            </p>
            <p className="mt-10 text-xs tracking-wide text-slate-500">
              Concept visualization
            </p>
          </div>
        ) : scene.kind === 'atlas' ? (
          <div className="flex h-full w-full flex-col justify-between overflow-hidden bg-[#080B12] p-3.5 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <span className="font-semibold text-emerald-400">MongoDB Atlas</span>
                <span className="text-slate-600" aria-hidden="true">|</span>
                <span className="font-mono text-slate-200">
                  Find Mars rover recoveries after wheel slip
                </span>
              </div>
              <span className="font-mono text-xs text-slate-400 tabular-nums">
                2 matched intervals
              </span>
            </div>

            <div className="my-2.5 grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-12">
              <div className="flex min-h-0 flex-col justify-between rounded border border-slate-800 bg-[#0D111A] p-3 lg:col-span-5">
                <div className="flex items-start gap-2.5">
                  <div className="h-14 w-24 shrink-0 overflow-hidden rounded border border-slate-700">
                    <SafeImage
                      src={ATLAS_EPISODES[0].thumbnailPath}
                      alt="Episode 0142 stopped Carrier rover thumbnail"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] font-semibold text-amber-400">
                      EPISODE 0142 · PINNED FAILURE
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-300">
                      {ATLAS_EPISODES[0].summary}
                    </p>
                  </div>
                </div>
                <div className="mt-2">
                  <TelemetryTraceChart
                    points={ATLAS_EPISODES[0].telemetry}
                    compact
                    label="Pinned Stall · Peak Slip 0.84"
                  />
                </div>
              </div>

              <div className="flex min-h-0 flex-col justify-between rounded border border-cyan-500/40 bg-[#0D131F] p-3 lg:col-span-7">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-mono text-[11px] font-semibold text-cyan-300">
                    EPISODE 0118 · SELECTED RECOVERY
                  </p>
                  <p className="text-[11px] text-slate-300">
                    Source recorded · Review approved · Purpose: control training
                  </p>
                </div>
                <div className="my-1.5">
                  <TelemetryTraceChart
                    points={ATLAS_EPISODES[1].telemetry}
                    compact
                    label="Approved Recovery · Controlled Torque Bypass"
                  />
                </div>
                <p className="text-[11px] leading-snug text-slate-400">
                  {ATLAS_EPISODES[1].summary}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Concept UI · Synchronized MastCam + 24 Hz telemetry</span>
              <span className="font-mono tabular-nums">Query match · Evidence locked</span>
            </div>
          </div>
        ) : scene.kind === 'training' ? (
          <div className="flex h-full w-full flex-col justify-between bg-[#080B12] p-5 sm:p-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <p className="font-mono text-xs text-cyan-400">OFFLINE POLICY WORKSPACE</p>
                <h3 className="mt-1 font-display text-lg font-semibold text-slate-100 sm:text-xl">
                  Turn Reviewed Experience Into Policy v02
                </h3>
              </div>
              <span className="font-mono text-xs text-slate-400 tabular-nums">
                Elapsed pass · {Math.round(progress * 100)}%
              </span>
            </div>

            <div className="my-auto grid grid-cols-1 gap-3 sm:grid-cols-4">
              {trainingStages.map((stage, idx) => {
                const reached = idx <= activeStageIdx;
                const current = idx === activeStageIdx;
                return (
                  <div
                    key={stage.key}
                    className={`rounded border p-4 transition-colors duration-200 ${
                      current
                        ? 'border-cyan-400 bg-[#0F172A]'
                        : reached
                          ? 'border-slate-700 bg-[#0D111A]'
                          : 'border-slate-800/80 bg-[#090C13] opacity-60'
                    }`}
                  >
                    <p className="font-mono text-xs font-semibold text-cyan-300">
                      0{idx + 1}. {stage.label}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-slate-300">
                      {stage.note}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="space-y-2">
              <div className="h-1.5 w-full overflow-hidden rounded bg-slate-800">
                <div
                  className="h-full bg-cyan-400 transition-transform duration-150 origin-left"
                  style={{ transform: `scaleX(${Math.max(0.04, progress)})` }}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                <span>DATASET v02 → TRAINING → EVALUATION → POLICY v02</span>
                <span>No instant-learning effect · Evaluation precedes rollout</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative h-full w-full">
            <SafeImage
              src={scene.imagePath}
              alt={scene.title}
              className="h-full w-full object-cover transition-transform duration-700"
            />

            {/* Scene-specific engineering overlays */}
            {scene.kind === 'earth' && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-transparent to-transparent transition-opacity duration-500"
                style={{ opacity: Math.max(0.15, 1 - progress * 0.8) }}
              />
            )}

            {scene.kind === 'generative' && (
              <>
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-amber-500/10 transition-opacity duration-300"
                  style={{ opacity: activeVariant.axis === 'Lighting' ? 0.45 : 0 }}
                />
                <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 rounded border border-slate-700/80 bg-[#07090E]/85 px-3 py-2 backdrop-blur-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {SCENARIO_VARIANTS.map((variant, idx) => (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => setManualVariantIdx(idx)}
                        className={`rounded px-2.5 py-1 text-[11px] font-medium whitespace-nowrap shrink-0 transition-colors ${
                          idx === activeVariantIdx
                            ? 'bg-cyan-500 text-slate-950'
                            : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {variant.axis}
                      </button>
                    ))}
                  </div>
                  <span className="font-mono text-[11px] text-slate-300 tabular-nums">
                    Sun {activeVariant.sunElevationDeg}° · {activeVariant.obstacleNote}
                  </span>
                </div>
              </>
            )}

            {scene.kind === 'mars-retry' && (
              <svg
                viewBox="0 0 1600 900"
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 h-full w-full"
              >
                <path
                  d="M 520 790 C 760 720, 990 610, 1270 490"
                  fill="none"
                  stroke="#06B6D4"
                  strokeWidth="5"
                  strokeDasharray="14 10"
                  strokeOpacity="0.85"
                />
                <circle cx="1270" cy="490" r="10" fill="#06B6D4" />
              </svg>
            )}

            {/* Contrast Scrim for Lower Third Overlays */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/85 via-black/40 to-transparent"
            />

            {/* Editorial Text Overlay */}
            <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-end justify-between gap-4">
              <div className="space-y-1">
                <p className="font-mono text-xs font-medium tracking-wide text-slate-100 sm:text-sm">
                  {scene.overlayText}
                </p>
                {scene.kind === 'generative' && showGenieCaption && scene.overlaySecondary && (
                  <p className="font-mono text-[11px] text-cyan-300">
                    {scene.overlaySecondary}
                  </p>
                )}
              </div>
              <span className="font-mono text-[11px] text-slate-300/90">
                Concept visualization
              </span>
            </div>
          </div>
        )}

        {/* Top-Right Scene Identifier (Photographic Scenes Only) */}
        {scene.kind !== 'title' && scene.kind !== 'atlas' && scene.kind !== 'training' && (
          <div className="pointer-events-none absolute top-3 right-3 rounded bg-black/65 px-2.5 py-1 font-mono text-[11px] text-slate-200 tabular-nums">
            S0{scene.index} · {formatTimecode(scene.startSec)}–{formatTimecode(scene.endSec)}
          </div>
        )}
      </div>

      {/* Voiceover Subtitle & Timing Strip */}
      <div className="flex flex-col justify-between gap-3 rounded-lg border border-slate-800 bg-[#0D111A] px-4 py-3 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <p className="text-xs font-medium text-cyan-400">
            Voiceover · {scene.title}
          </p>
          <p className="mt-0.5 text-sm text-slate-100">
            “{scene.narration}”
          </p>
        </div>
        <div className="flex items-center gap-4 font-mono text-xs text-slate-400 tabular-nums shrink-0">
          <span>{formatSmpte(currentTime, FILM_FPS)}</span>
          <span aria-hidden="true">/</span>
          <span>01:00:00</span>
          <span aria-hidden="true">·</span>
          <span>Frame {String(currentFrame).padStart(4, '0')} / {FILM_TOTAL_FRAMES}</span>
        </div>
      </div>

      {/* 8-Scene Interactive Editorial Timeline Scrubber */}
      <div className="space-y-2 rounded-lg border border-slate-800 bg-[#0B0F17] p-4">
        <div className="grid grid-cols-8 gap-1.5" role="group" aria-label="Scene timeline segments">
          {FILM_SCENES.map((s) => {
            const isActive = s.id === scene.id;
            const spanClass = s.kind === 'title' ? 'col-span-1' : 'col-span-1';
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onSeek(s.startSec)}
                className={`${spanClass} group flex flex-col items-start rounded border px-2 py-2 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                  isActive
                    ? 'border-cyan-400 bg-cyan-500/15 text-slate-100'
                    : 'border-slate-800 bg-[#0F1420] text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
                aria-label={`Jump to Scene ${s.index}: ${s.title} (${formatTimecode(s.startSec)})`}
              >
                <span className="font-mono text-[10px] tabular-nums text-cyan-400">
                  {formatTimecode(s.startSec)}
                </span>
                <span className="mt-0.5 w-full truncate text-[11px] font-medium">
                  {s.kind === 'title' ? 'Title' : s.title.split(':')[0]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onTogglePlay}
              className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-3.5 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-cyan-400 whitespace-nowrap shrink-0"
            >
              {isPlaying ? (
                <>
                  <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" aria-hidden="true" />
                  Play Cut
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onRestart}
              aria-label="Restart concept film"
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Restart
            </button>

            <button
              type="button"
              onClick={goPrevScene}
              aria-label="Previous scene"
              className="inline-flex items-center justify-center rounded-md border border-slate-700 bg-slate-900 p-2 text-slate-300 transition-colors hover:bg-slate-800"
            >
              <SkipBack className="h-3.5 w-3.5" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={goNextScene}
              aria-label="Next scene"
              className="inline-flex items-center justify-center rounded-md border border-slate-700 bg-slate-900 p-2 text-slate-300 transition-colors hover:bg-slate-800"
            >
              <SkipForward className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={showGenieCaption}
                onChange={(e) => setShowGenieCaption(e.target.checked)}
                className="h-3.5 w-3.5 accent-cyan-400"
              />
              <span>Show technical caption in Scene 5</span>
            </label>

            <button
              type="button"
              onClick={onToggleMute}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              {isMuted ? (
                <>
                  <VolumeX className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  Score Muted
                </>
              ) : (
                <>
                  <Volume2 className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
                  Score Active
                </>
              )}
            </button>
          </div>
        </div>

        {/* Continuous Scrubber Input */}
        <div className="pt-1">
          <label htmlFor="film-scrubber" className="sr-only">
            Timeline position in seconds
          </label>
          <input
            id="film-scrubber"
            type="range"
            min={0}
            max={FILM_DURATION_SEC}
            step={0.1}
            value={currentTime}
            onChange={(e) => onSeek(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer accent-cyan-400"
          />
        </div>
      </div>
    </section>
  );
};
