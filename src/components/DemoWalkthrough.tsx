import React from 'react';
import { ChevronLeft, ChevronRight, Play, Pause, X } from 'lucide-react';
import { WorkspaceTab } from './TopBar';

export type MissionDemoDirectiveKind =
  | 'MARS_PLAN_RISKY'
  | 'MARS_RUN_RISKY'
  | 'MARS_REPLAY_SLIP'
  | 'MARS_RUN_SAFE';

export interface DemoStage {
  id: string;
  stepLabel: string;
  title: string;
  narration: string;
  tab: WorkspaceTab;
  missionDirective?: MissionDemoDirectiveKind;
  filmSeekSec?: number;
  autoDurationMs: number;
}

export const DEMO_STAGES: DemoStage[] = [
  {
    id: 'stage-plan',
    stepLabel: '01 / 06',
    title: 'Choose World & Inspect Terrain',
    narration:
      'Start on Mars (Jezero Split Boulder). A direct fast path cuts across the Sandy Slip Rut between Start and Beacon.',
    tab: 'game',
    missionDirective: 'MARS_PLAN_RISKY',
    autoDurationMs: 5000,
  },
  {
    id: 'stage-fail',
    stepLabel: '02 / 06',
    title: 'Launch Attempt 1 · Wheel-Slip Stall',
    narration:
      'Watch synthetic deterministic motion play out: charging the rut at FAST speed spins the wheels until Carrier safe-stops.',
    tab: 'game',
    missionDirective: 'MARS_RUN_RISKY',
    autoDurationMs: 5500,
  },
  {
    id: 'stage-replay',
    stepLabel: '03 / 06',
    title: 'Replay & Diagnose the Failure Trace',
    narration:
      'Scrubbed to T+3.5s: wheel velocity spikes while forward progress drops. Recorded traces pinpoint why the mission stalled.',
    tab: 'game',
    missionDirective: 'MARS_REPLAY_SLIP',
    autoDurationMs: 6500,
  },
  {
    id: 'stage-atlas',
    stepLabel: '04 / 06',
    title: 'Atlas Provenance & Mission Learning Curve',
    narration:
      'Mission recordings link failure intervals to approved recoveries, demonstrating how each mission informs the next policy.',
    tab: 'grounding',
    autoDurationMs: 6500,
  },
  {
    id: 'stage-succeed',
    stepLabel: '05 / 06',
    title: 'Revise Plan & Execute Safe Bypass',
    narration:
      'Scout establishes a cyan relay corridor, Carrier samples both targets, bypasses the rut at Cautious speed, and reaches the Beacon.',
    tab: 'game',
    missionDirective: 'MARS_RUN_SAFE',
    autoDurationMs: 8000,
  },
  {
    id: 'stage-film',
    stepLabel: '06 / 06',
    title: 'Concept Film & Gemini Production Studio',
    narration:
      'See the full Rocket Academy vision in the 60-second Concept Film, or explore Scene Studio and Director & Audio tools.',
    tab: 'film',
    filmSeekSec: 48,
    autoDurationMs: 8000,
  },
];

interface DemoWalkthroughProps {
  activeStageIndex: number;
  autoPlay: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSelectStage: (index: number) => void;
  onToggleAutoPlay: () => void;
  onExit: () => void;
}

export const DemoWalkthrough: React.FC<DemoWalkthroughProps> = ({
  activeStageIndex,
  autoPlay,
  onPrev,
  onNext,
  onSelectStage,
  onToggleAutoPlay,
  onExit,
}) => {
  const stage = DEMO_STAGES[activeStageIndex] ?? DEMO_STAGES[0];
  const isFirst = activeStageIndex === 0;
  const isLast = activeStageIndex >= DEMO_STAGES.length - 1;

  return (
    <section
      aria-label="End-to-end guided product demo"
      data-testid="demo-walkthrough"
      className="mb-6 rounded-lg border border-cyan-500/40 bg-[#0B121F] px-4 py-3.5"
    >
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
            <span className="font-mono font-semibold text-cyan-400 tabular-nums">
              Guided Demo · {stage.stepLabel}
            </span>
            <span className="text-slate-600" aria-hidden="true">
              /
            </span>
            <span className="font-display font-semibold text-slate-100">{stage.title}</span>
          </div>
          <p className="text-xs leading-relaxed text-slate-300">{stage.narration}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="hidden items-center gap-1 sm:flex" role="tablist" aria-label="Demo steps">
            {DEMO_STAGES.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={idx === activeStageIndex}
                aria-label={`Jump to step ${idx + 1}: ${s.title}`}
                onClick={() => onSelectStage(idx)}
                className={`h-2 rounded-sm transition-all ${
                  idx === activeStageIndex
                    ? 'w-6 bg-cyan-400'
                    : idx < activeStageIndex
                    ? 'w-3 bg-cyan-700 hover:bg-cyan-500'
                    : 'w-3 bg-slate-700 hover:bg-slate-500'
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={onToggleAutoPlay}
            className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
              autoPlay
                ? 'border-amber-400/60 bg-amber-400/15 text-amber-200'
                : 'border-slate-700 bg-[#07090E] text-slate-200 hover:border-slate-500'
            }`}
          >
            {autoPlay ? (
              <>
                <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Pause Tour</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Auto-Play</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onPrev}
            disabled={isFirst}
            className="inline-flex items-center gap-1 rounded border border-slate-700 bg-[#07090E] px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-500 disabled:opacity-40 whitespace-nowrap shrink-0"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Prev</span>
          </button>

          {!isLast ? (
            <button
              type="button"
              onClick={onNext}
              className="inline-flex items-center gap-1 rounded bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400 whitespace-nowrap shrink-0"
            >
              <span>Next Step</span>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onExit}
              className="inline-flex items-center gap-1 rounded bg-emerald-400 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-300 whitespace-nowrap shrink-0"
            >
              <span>Finish Demo</span>
            </button>
          )}

          <button
            type="button"
            onClick={onExit}
            aria-label="Exit guided demo"
            className="rounded border border-slate-700 bg-[#07090E] p-1.5 text-slate-400 hover:border-slate-500 hover:text-slate-100 shrink-0"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
};
