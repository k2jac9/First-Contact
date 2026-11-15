import React, { useState } from 'react';
import {
  ArrowRight,
  Compass,
  Database,
  Film,
  Image as ImageIcon,
  Mic,
  Play,
} from 'lucide-react';
import { WorkspaceTab } from './TopBar';
import { OverviewPitchVideo } from './OverviewPitchVideo';
import { PresenterDeck } from './PresenterDeck';

interface OverviewPageProps {
  onSelectTab: (tab: WorkspaceTab) => void;
  onStartDemo: () => void;
}

interface LoopStep {
  id: string;
  index: string;
  title: string;
  summary: string;
  outcome: string;
  targetTab: WorkspaceTab;
  actionLabel: string;
}

const MISSION_LOOP_STEPS: LoopStep[] = [
  {
    id: 'plan',
    index: '01',
    title: 'Plan & Translate Goals',
    summary:
      'Pick Mars, the Moon, or Earth, plot rover waypoints directly on the terrain grid, or describe a goal in plain English so Gemini translates it into structured DRIVE, SCAN, SAMPLE, and RELAY commands.',
    outcome:
      'Learners see immediately how open-ended mission intent maps onto ordered, inspectable robotics commands.',
    targetTab: 'game',
    actionLabel: 'Open Mission Game',
  },
  {
    id: 'simulate',
    index: '02',
    title: 'Test Against Terrain Hazards',
    summary:
      'Launch the synthetic deterministic simulation and watch Scout and Carrier execute your queue step by step. Aggressive FAST routing across loose sand spikes wheel spin and stalls the rover safely.',
    outcome:
      'Makes planetary constraints tangible: speed, gravity (0.16g to 1.00g), battery drain, and surface slip require real trade-offs.',
    targetTab: 'game',
    actionLabel: 'Try Mars Failure & Bypass',
  },
  {
    id: 'replay',
    index: '03',
    title: 'Replay & Diagnose Traces',
    summary:
      'Scrub through saved Mission Recordings frame by frame alongside synchronized wheel angular velocity vs. forward progress charts to pinpoint the exact second traction was lost.',
    outcome:
      'Turns failed runs into concrete evidence rather than dead ends—every recording explains what happened and suggests the next adjustment.',
    targetTab: 'grounding',
    actionLabel: 'Inspect Atlas & Learning Curve',
  },
  {
    id: 'produce',
    index: '04',
    title: 'Ground, Storyboard & Narrate',
    summary:
      'Connect gameplay to the 60-second Concept Film, generate continuity-locked frames in Scene Studio, query real NASA datasets with Google Search & Maps grounding, and verify narration pacing.',
    outcome:
      'Equips educators, teams, and storytellers with a single workbench bridging simulation evidence and visual storytelling.',
    targetTab: 'film',
    actionLabel: 'Watch Concept Film',
  },
];

interface WorkspaceGuideItem {
  id: WorkspaceTab;
  title: string;
  subtitle: string;
  description: string;
  highlights: string[];
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
}

const WORKSPACE_GUIDE: WorkspaceGuideItem[] = [
  {
    id: 'game',
    title: 'Mission Game',
    subtitle: 'Interactive Planner · Simulator · Replay Archive',
    description:
      'The primary interactive experience. Choose Mars (Jezero Split Boulder), Moon (Shackleton Rim), or Earth (Mojave Test Valley), assemble command sequences, and analyze saved runs.',
    highlights: [
      'AI Goal Translator maps plain English to structured rover steps via gemini-4-hydrogen',
      'Deterministic 0.1s motion engine modeling Scout Relay cues, battery draw, and slip stalls',
      'Persistent browser Mission Recordings with replay scrubber, audio cues, and Load Commands',
    ],
    icon: Compass,
  },
  {
    id: 'film',
    title: 'Concept Film',
    subtitle: '60s Cut · 8 Scenes · 24 fps / 1,440 Frames',
    description:
      'Synchronized 8-scene narrative presentation with SMPTE timecode, editorial subtitles, scene-adaptive ambient Web Audio score, and a clickable storyboard rail.',
    highlights: [
      'Connects Earth training terrain, Moon cooperative handoff, Mars slip stall, and Policy v02 retry',
      'Direct "Open in Scene Studio" handoff from any storyboard frame',
    ],
    icon: Film,
  },
  {
    id: 'media',
    title: 'Scene Studio',
    subtitle: 'Image Studio · Video & Animate · Continuity Audit',
    description:
      'Production studio for generating resolution-controlled scene frames, animating frames into clips, and auditing rover continuity against Scout (4-wheel) and Carrier (6-wheel) specs.',
    highlights: [
      'Image generation via gemini-3-pro-image and gemini-nano-banana-2.1 (1:1–21:9, 1K–4K)',
      'Negation-aware prompt checker and multimodal continuity inspection via gemini-4-argon',
      'Image-to-video and text-to-video animation via gemini-omni-1.2-flash',
    ],
    icon: ImageIcon,
  },
  {
    id: 'grounding',
    title: 'Atlas & Terrain',
    subtitle: 'Policy Progression · Atlas Retrieval · Search & Maps Grounding',
    description:
      'Inspect how reviewed failure and recovery intervals advance policy performance, filter Atlas concept episodes, and run live planetary terrain research.',
    highlights: [
      'Interactive world-filtered learning chart linking Episode 0142 failure to Policy v02+ recovery',
      'Deep provenance audit with gemini-4-carbon plus live Google Search and Google Maps grounding',
    ],
    icon: Database,
  },
  {
    id: 'director',
    title: 'Director & Audio',
    subtitle: 'Voiceover Pacing · Audio Transcription · Continuity Supervisor',
    description:
      'Editorial audio workbench to record or upload narration takes, measure word pacing inside 8-second scene windows, and chat with the multi-turn continuity supervisor.',
    highlights: [
      'Microphone capture or audio file upload transcribed with automatic Gemini model fallback',
      'Sub-second continuity checks (gemini-3.1-flash-lite) and selectable-model Director chat',
    ],
    icon: Mic,
  },
];

export const OverviewPage: React.FC<OverviewPageProps> = ({
  onSelectTab,
  onStartDemo,
}) => {
  const [activeLoopId, setActiveLoopId] = useState<string>(MISSION_LOOP_STEPS[0].id);
  const activeStep =
    MISSION_LOOP_STEPS.find((s) => s.id === activeLoopId) || MISSION_LOOP_STEPS[0];

  return (
    <div className="space-y-12">
      {/* 0. 30-Second Project Pitch Video */}
      <OverviewPitchVideo />

      {/* 1. Hero & Core Thesis */}
      <section className="border-b border-slate-800/80 pb-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-end">
          <div className="space-y-4 lg:col-span-8">
            <p className="font-mono text-xs tracking-wider text-cyan-400">
              ROCKET ACADEMY · FIRST CONTACT · HOW IT WORKS
            </p>
            <h1 className="max-w-3xl font-display text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl [text-wrap:balance]">
              Plan the mission. Explore the world. Learn from the result.
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-slate-300">
              First Contact puts you in the mission designer seat—combining planetary terrain, structured rover command planning, synthetic rover simulation, and Atlas episode traces so every run informs the next.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => onSelectTab('game')}
                className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-5 py-2.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-cyan-400 whitespace-nowrap shrink-0"
              >
                <span>Open Mission Game</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onStartDemo}
                className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-[#0B0F17] px-4 py-2.5 text-xs font-medium text-slate-200 transition-colors hover:border-slate-500 hover:text-white whitespace-nowrap shrink-0"
              >
                <Play className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
                <span>Launch 6-Step Guided Demo</span>
              </button>
            </div>
          </div>

          {/* Grounded Reference Figures */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-slate-800/80 pt-5 lg:col-span-4 lg:border-t-0 lg:border-l lg:pl-8 lg:pt-0">
            <div>
              <p className="font-mono text-2xl font-semibold text-slate-100 tabular-nums">3</p>
              <p className="mt-0.5 text-xs text-slate-400">Worlds · Mars, Moon, Earth</p>
            </div>
            <div>
              <p className="font-mono text-2xl font-semibold text-cyan-400 tabular-nums">4</p>
              <p className="mt-0.5 text-xs text-slate-400">Commands · Drive, Scan, Sample, Relay</p>
            </div>
            <div>
              <p className="font-mono text-2xl font-semibold text-slate-100 tabular-nums">0.1 s</p>
              <p className="mt-0.5 text-xs text-slate-400">Deterministic telemetry step</p>
            </div>
            <div>
              <p className="font-mono text-2xl font-semibold text-slate-100 tabular-nums">5</p>
              <p className="mt-0.5 text-xs text-slate-400">Connected interactive workspaces</p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Interactive 4-Step Mission Loop ("What People Get Out of It") */}
      <section aria-labelledby="loop-heading" className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="loop-heading" className="font-display text-xl font-semibold text-slate-100">
              What People Get Out of First Contact
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Select a stage in the mission loop to see how planning, simulation, replay, and AI tools work together.
            </p>
          </div>
        </div>

        <div
          role="tablist"
          aria-label="Mission learning loop stages"
          className="grid grid-cols-1 gap-2 rounded-lg border border-slate-800 bg-[#0B0F17] p-1.5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {MISSION_LOOP_STEPS.map((step) => {
            const active = step.id === activeStep.id;
            return (
              <button
                key={step.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveLoopId(step.id)}
                className={`rounded-md px-3.5 py-2.5 text-left transition-colors ${
                  active
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <span
                  className={`block font-mono text-[11px] tabular-nums ${
                    active ? 'text-slate-900 font-semibold' : 'text-cyan-400'
                  }`}
                >
                  {step.index}
                </span>
                <span className="mt-0.5 block text-xs font-semibold whitespace-nowrap truncate">
                  {step.title}
                </span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-6 rounded-lg border border-slate-800 bg-[#0B0F17] p-6 lg:grid-cols-12 lg:items-center">
          <div className="space-y-3 lg:col-span-7">
            <p className="font-mono text-xs text-cyan-400 tabular-nums">
              STAGE {activeStep.index} · HOW IT WORKS
            </p>
            <h3 className="font-display text-lg font-semibold text-slate-100">
              {activeStep.title}
            </h3>
            <p className="text-sm leading-relaxed text-slate-300">
              {activeStep.summary}
            </p>
          </div>

          <div className="space-y-4 border-t border-slate-800 pt-4 lg:col-span-5 lg:border-t-0 lg:border-l lg:pl-6 lg:pt-0">
            <div>
              <p className="font-mono text-[11px] font-semibold text-emerald-400">
                VALUE FOR LEARNERS & TEAMS
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                {activeStep.outcome}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onSelectTab(activeStep.targetTab)}
              className="inline-flex items-center gap-1.5 rounded border border-cyan-500/40 bg-cyan-500/10 px-3.5 py-2 text-xs font-medium text-cyan-200 transition-colors hover:bg-cyan-500/20 whitespace-nowrap shrink-0"
            >
              <span>{activeStep.actionLabel}</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      {/* 3. Workspace Capabilities Directory */}
      <section aria-labelledby="workspaces-heading" className="space-y-5">
        <div>
          <h2 id="workspaces-heading" className="font-display text-xl font-semibold text-slate-100">
            Inside the Five Workspaces
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Jump directly into any module from the top bar or the shortcuts below.
          </p>
        </div>

        <div className="divide-y divide-slate-800 rounded-lg border border-slate-800 bg-[#0B0F17]">
          {WORKSPACE_GUIDE.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="grid grid-cols-1 gap-5 p-5 lg:grid-cols-12 lg:items-start"
              >
                <div className="space-y-1.5 lg:col-span-4">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-cyan-400 shrink-0" aria-hidden={true} />
                    <h3 className="font-display text-base font-semibold text-slate-100">
                      {item.title}
                    </h3>
                  </div>
                  <p className="font-mono text-[11px] text-slate-400">{item.subtitle}</p>
                  <p className="pt-1 text-xs leading-relaxed text-slate-300">
                    {item.description}
                  </p>
                </div>

                <ul className="space-y-1.5 text-xs text-slate-300 lg:col-span-6">
                  {item.highlights.map((h) => (
                    <li key={h} className="leading-relaxed text-slate-300">
                      <span className="mr-2 font-mono text-cyan-400" aria-hidden="true">
                        —
                      </span>
                      {h}
                    </li>
                  ))}
                </ul>

                <div className="flex lg:col-span-2 lg:justify-end">
                  <button
                    type="button"
                    onClick={() => onSelectTab(item.id)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-[#07090E] px-3.5 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-cyan-400 hover:text-cyan-300 whitespace-nowrap shrink-0"
                  >
                    <span>Open Tab</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Audience Outcomes & Prototype Disclosure */}
      <section className="grid grid-cols-1 gap-8 border-t border-slate-800/80 pt-8 lg:grid-cols-2">
        <div className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-slate-100">
            Who Uses It & What They Gain
          </h2>
          <dl className="space-y-3 text-xs leading-relaxed">
            <div>
              <dt className="font-semibold text-slate-200">Students & Independent Learners</dt>
              <dd className="mt-0.5 text-slate-400">
                Build intuition for wheel slip, cooperative scouting, and energy budgeting by testing hypotheses and inspecting telemetry replays immediately.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-200">Educators & Workshop Hosts</dt>
              <dd className="mt-0.5 text-slate-400">
                Use the 6-step Guided Demo to walk a room through a real failure-to-recovery arc, then hand over custom mission challenges.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-200">AI & Robotics Builders</dt>
              <dd className="mt-0.5 text-slate-400">
                Examine how natural-language planning translates into bounded command schemas and how saved mission traces feed iterative policy design.
              </dd>
            </div>
          </dl>
        </div>

        <div className="space-y-3 border-t border-slate-800/80 pt-6 lg:border-t-0 lg:border-l lg:pl-8 lg:pt-0">
          <h2 className="font-display text-lg font-semibold text-slate-100">
            Simulation Scope & Notes
          </h2>
          <ul className="space-y-2.5 text-xs leading-relaxed text-slate-400">
            <li>
              <strong className="font-medium text-slate-200">Synthetic Deterministic Motion:</strong> Rover physics, slip ratios, and battery budgets use a repeatable 0.1-second step model designed for exploration and learning—not a physically validated flight dynamics simulator.
            </li>
            <li>
              <strong className="font-medium text-slate-200">Local Recording Persistence:</strong> Mission Recordings created during gameplay are stored in your browser&apos;s localStorage alongside preloaded baseline examples.
            </li>
            <li>
              <strong className="font-medium text-slate-200">AI Capabilities:</strong> Server-side Gemini routes power goal translation, provenance auditing, NASA Search & Maps terrain research, voiceover transcription, image generation, and video animation.
            </li>
          </ul>
        </div>
      </section>

      {/* 5. Password-Gated 7-Slide Presenter Deck */}
      <PresenterDeck onSelectTab={onSelectTab} onStartDemo={onStartDemo} />
    </div>
  );
};
