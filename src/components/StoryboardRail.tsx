import React, { useState } from 'react';
import { CheckSquare, Square, ArrowUpRight } from 'lucide-react';
import {
  CONTINUITY_SPECS,
  FILM_SCENES,
  GENERATED_ASSETS,
  PRODUCTION_WORKFLOW_STEPS,
  FilmScene,
} from '../data/storyboard';
import { formatTimecode } from '../utils/filmTimeline';
import { SafeImage } from './SafeImage';

interface StoryboardRailProps {
  activeSceneId: string;
  onJumpToScene: (scene: FilmScene) => void;
  onOpenInStudio: (scene: FilmScene) => void;
}

export const StoryboardRail: React.FC<StoryboardRailProps> = ({
  activeSceneId,
  onJumpToScene,
  onOpenInStudio,
}) => {
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({
    0: true,
    1: true,
  });

  const toggleStep = (idx: number) => {
    setCheckedSteps((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div className="space-y-10">
      {/* 1. Eight-Scene Editorial Breakdown */}
      <section aria-labelledby="storyboard-heading" className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h2 id="storyboard-heading" className="font-display text-lg font-semibold text-slate-100">
              Editorial Cut & Shot Breakdown
            </h2>
            <p className="text-xs text-slate-400">
              Seven 8-second scenes + 4-second title card · 16:9 · 24 fps · 1,440 frames
            </p>
          </div>
          <span className="font-mono text-xs text-slate-400 tabular-nums">
            Narrative: Every mission becomes the next lesson
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {FILM_SCENES.map((scene) => {
            const active = scene.id === activeSceneId;
            return (
              <article
                key={scene.id}
                className={`flex flex-col justify-between rounded-lg border p-4 transition-colors ${
                  active
                    ? 'border-cyan-400/70 bg-[#0F1623]'
                    : 'border-slate-800 bg-[#0B0F17]'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs text-cyan-400 tabular-nums">
                        {formatTimecode(scene.startSec)}–{formatTimecode(scene.endSec)} · Frames {scene.startFrame}–{scene.endFrame}
                      </p>
                      <h3 className="mt-0.5 font-display text-sm font-semibold text-slate-100">
                        {scene.title}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => onJumpToScene(scene)}
                      className="rounded border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-slate-800 whitespace-nowrap shrink-0"
                    >
                      View Scene
                    </button>
                  </div>

                  <p className="text-xs leading-relaxed text-slate-300">
                    {scene.visualDirection}
                  </p>

                  <div className="border-t border-slate-800/80 pt-2 text-xs text-slate-400">
                    <span className="font-medium text-slate-300">Overlay: </span>
                    <span className="font-mono text-slate-200">{scene.overlayText}</span>
                  </div>

                  <div className="text-xs text-slate-400">
                    <span className="font-medium text-slate-300">Narration: </span>
                    “{scene.narration}”
                  </div>
                </div>

                {scene.kind !== 'title' && (
                  <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-2.5 text-xs">
                    <span className="truncate text-slate-400">{scene.cameraMove}</span>
                    <button
                      type="button"
                      onClick={() => onOpenInStudio(scene)}
                      className="inline-flex items-center gap-1 font-medium text-cyan-400 hover:text-cyan-300 whitespace-nowrap shrink-0"
                    >
                      Generate Variant
                      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {/* 2. Robot & Location Continuity Lock */}
      <section aria-labelledby="continuity-heading" className="space-y-4">
        <div className="border-b border-slate-800 pb-3">
          <h2 id="continuity-heading" className="font-display text-lg font-semibold text-slate-100">
            Locked Robot & Location Continuity
          </h2>
          <p className="text-xs text-slate-400">
            Reused across Earth, Moon, and Mars footage requests to preserve wheel counts, geometry, and markings
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-stretch">
          <div className="overflow-hidden rounded-lg border border-slate-800 bg-[#0B0F17] lg:col-span-5">
            <div className="aspect-video w-full overflow-hidden">
              <SafeImage
                src={GENERATED_ASSETS.continuitySheet}
                alt="Scout 4-wheel rover and Carrier 6-wheel rover continuity reference"
              />
            </div>
            <div className="border-t border-slate-800 px-4 py-3 text-xs text-slate-400">
              Locked Reference Sheet · Left: Scout (4 wheels) · Right: Carrier (6 wheels)
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:col-span-7">
            {CONTINUITY_SPECS.map((spec) => (
              <div
                key={spec.id}
                className="flex flex-col justify-between rounded-lg border border-slate-800 bg-[#0B0F17] p-4"
              >
                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-display text-sm font-semibold text-slate-100">
                      {spec.name}
                    </h3>
                    {spec.wheelCount !== null && (
                      <span className="font-mono text-xs text-amber-400 tabular-nums">
                        {spec.wheelCount}W
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-cyan-400">{spec.role}</p>
                  <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-300">
                    {spec.specs.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Production Workflow Checklist */}
      <section aria-labelledby="workflow-heading" className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-800 pb-3">
          <h2 id="workflow-heading" className="font-display text-lg font-semibold text-slate-100">
            Production Workflow & Review Gates
          </h2>
          <span className="font-mono text-xs text-slate-400 tabular-nums">
            {Object.values(checkedSteps).filter(Boolean).length} / {PRODUCTION_WORKFLOW_STEPS.length} verified
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
          {PRODUCTION_WORKFLOW_STEPS.map((step, idx) => {
            const done = !!checkedSteps[idx];
            return (
              <button
                key={step}
                type="button"
                onClick={() => toggleStep(idx)}
                className={`flex items-start gap-3 rounded-lg border p-3.5 text-left transition-colors ${
                  done
                    ? 'border-cyan-500/40 bg-[#0D1422] text-slate-200'
                    : 'border-slate-800 bg-[#0B0F17] text-slate-300 hover:border-slate-700'
                }`}
              >
                {done ? (
                  <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" aria-hidden="true" />
                ) : (
                  <Square className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                )}
                <span className="text-xs leading-relaxed">
                  <span className="font-mono text-cyan-400">0{idx + 1}. </span>
                  {step}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};
