import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Compass,
  Eye,
  EyeOff,
  Film,
  Lock,
  Maximize2,
  Minimize2,
  Play,
  Presentation,
  Unlock,
} from 'lucide-react';
import { GENERATED_ASSETS } from '../data/storyboard';
import { WorkspaceTab } from './TopBar';

interface PresenterDeckProps {
  onSelectTab: (tab: WorkspaceTab) => void;
  onStartDemo: () => void;
}

interface SlideDefinition {
  id: string;
  number: string;
  kicker: string;
  title: string;
  subtitle: string;
  speakerNotes: string;
}

const PRESENTER_PASSCODE = 'NASA26';
const SESSION_UNLOCK_KEY = 'first_contact_deck_unlocked';

const SLIDES: SlideDefinition[] = [
  {
    id: 'slide-1-title',
    number: '01',
    kicker: 'Rocket Academy · First Contact',
    title: 'Plan the mission. Explore the world. Learn from every run.',
    subtitle:
      'An interactive planetary robotics workbench connecting mission planning, deterministic simulation, Atlas episode traces, and Gemini-powered production tools.',
    speakerNotes:
      'Introduce the core idea: First Contact puts students, educators, and builders directly in the mission designer seat rather than watching passive demos.',
  },
  {
    id: 'slide-2-challenge',
    number: '02',
    kicker: 'The Challenge · Off-World Constraints',
    title: 'Before robots explore new worlds, they need a place to learn.',
    subtitle:
      'Every world enforces different gravity, traction, and power budgets across a two-rover Scout and Carrier team.',
    speakerNotes:
      'Highlight why a single policy cannot brute-force every surface: Earth (1.00g) taxes power, Moon (0.16g) amplifies momentum near shadowed craters, and Mars (0.38g) stalls careless runs in wind-sorted sand.',
  },
  {
    id: 'slide-3-mission-game',
    number: '03',
    kicker: 'Workspace 01 · Mission Game',
    title: 'Plain-English goals translated into inspectable rover commands.',
    subtitle:
      'Plot waypoints directly or describe objectives in natural language—then run them through a repeatable 0.1-second physics loop.',
    speakerNotes:
      'Walk through the 4 commands (DRIVE, SCAN, SAMPLE, RELAY). Explain how Gemini translates plain English into bounded JSON steps while keeping every waypoint editable by hand.',
  },
  {
    id: 'slide-4-atlas-replay',
    number: '04',
    kicker: 'Failure Diagnosis · Atlas & Telemetry',
    title: 'Stalled runs become structured, searchable learning evidence.',
    subtitle:
      'Frame-by-frame Mission Recordings and Atlas episode traces pinpoint the exact second wheel spin decouples from forward motion.',
    speakerNotes:
      'Point to Mars Episode 0142: rushing into the sandy rut spikes wheel velocity to 3.4 rad/s while forward progress drops to 0.09 m/s. Compare against approved recovery Episode 0118.',
  },
  {
    id: 'slide-5-scene-studio',
    number: '05',
    kicker: 'Workspace 03 · Scene Studio',
    title: 'Controlled scenario variation with locked rover continuity.',
    subtitle:
      'Test lighting, obstacle placement, and bypass routes while preserving the 4-wheel Scout and 6-wheel Carrier hardware identities.',
    speakerNotes:
      'Explain Scene Studio safeguards: negation-aware brief checks, 1K–4K scene generation, video animation, and multimodal continuity audits that verify wheel count and basalt landmarks.',
  },
  {
    id: 'slide-6-ecosystem',
    number: '06',
    kicker: 'Connected Suite · Research, Film & Audio',
    title: 'Five workspaces bridged by real AI grounding and audio cues.',
    subtitle:
      'Pair NASA terrain grounding and Policy progression with a 60-second Concept Film and voiceover pacing studio.',
    speakerNotes:
      'Show how the five tabs share one storyline: Concept Film plays the 24 fps cut with ambient Web Audio, Atlas & Terrain grounds queries in Search & Maps, and Director & Audio checks narration timing.',
  },
  {
    id: 'slide-7-impact',
    number: '07',
    kicker: 'Outcomes & Live Walkthrough',
    title: 'What people take away—and where to jump in next.',
    subtitle:
      'Built for learners exploring physics intuition, educators leading workshops, and builders studying grounded AI workflows.',
    speakerNotes:
      'Close by launching directly into the Mission Game or the 6-step Guided Demo right from this final slide to show the Mars failure-to-recovery arc live.',
  },
];

const SlideImage: React.FC<{ src: string; alt: string; className?: string }> = ({
  src,
  alt,
  className = '',
}) => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-slate-900 via-[#0B0F17] to-slate-950 p-6 text-center ${className}`}
      >
        <span className="font-mono text-xs text-slate-400">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};

export const PresenterDeck: React.FC<PresenterDeckProps> = ({
  onSelectTab,
  onStartDemo,
}) => {
  const [unlocked, setUnlocked] = useState<boolean>(() => {
    try {
      return window.sessionStorage.getItem(SESSION_UNLOCK_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [passcodeInput, setPasscodeInput] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showNotes, setShowNotes] = useState(true);
  const deckSectionRef = useRef<HTMLElement | null>(null);

  const currentSlide = SLIDES[activeSlideIndex] || SLIDES[0];

  const goNext = useCallback(() => {
    setActiveSlideIndex((prev) => Math.min(SLIDES.length - 1, prev + 1));
  }, []);

  const goPrev = useCallback(() => {
    setActiveSlideIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcodeInput.trim() === PRESENTER_PASSCODE) {
      setUnlocked(true);
      setAuthError(null);
      setPasscodeInput('');
      try {
        window.sessionStorage.setItem(SESSION_UNLOCK_KEY, '1');
      } catch {
        // Ignore storage restrictions
      }
      requestAnimationFrame(() => {
        deckSectionRef.current?.focus({ preventScroll: true });
      });
    } else {
      setAuthError('Incorrect password. Enter the presenter password to open the 7-slide deck.');
    }
  };

  const handleLock = () => {
    setUnlocked(false);
    setIsFullscreen(false);
    setActiveSlideIndex(0);
    setAuthError(null);
    try {
      window.sessionStorage.removeItem(SESSION_UNLOCK_KEY);
    } catch {
      // Ignore storage restrictions
    }
  };

  useEffect(() => {
    if (!unlocked) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable;
      if (isTyping) return;

      const deckFocused =
        isFullscreen ||
        (deckSectionRef.current && deckSectionRef.current.contains(document.activeElement));

      if (!deckFocused) return;

      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'Home') {
        e.preventDefault();
        setActiveSlideIndex(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setActiveSlideIndex(SLIDES.length - 1);
      } else if (e.key === 'Escape' && isFullscreen) {
        e.preventDefault();
        setIsFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [unlocked, isFullscreen, goNext, goPrev]);

  const renderSlideVisual = (slideIndex: number) => {
    switch (slideIndex) {
      case 0:
        return (
          <div className="relative h-full min-h-[280px] max-h-[380px] overflow-hidden rounded-lg border border-slate-800 bg-[#07090E]">
            <SlideImage
              src={GENERATED_ASSETS.earth}
              alt="Scout and Carrier rovers traversing Earth desert test valley"
              className="h-full w-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#07090E] via-[#07090E]/50 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 grid grid-cols-2 gap-4 border-t border-slate-800/80 bg-[#07090E]/90 p-5 sm:grid-cols-4">
              <div>
                <p className="font-mono text-xl font-semibold text-cyan-400 tabular-nums">3</p>
                <p className="mt-0.5 text-xs text-slate-300">Planetary Worlds</p>
              </div>
              <div>
                <p className="font-mono text-xl font-semibold text-slate-100 tabular-nums">2</p>
                <p className="mt-0.5 text-xs text-slate-300">Cooperating Rovers</p>
              </div>
              <div>
                <p className="font-mono text-xl font-semibold text-slate-100 tabular-nums">5</p>
                <p className="mt-0.5 text-xs text-slate-300">Interactive Workspaces</p>
              </div>
              <div>
                <p className="font-mono text-xl font-semibold text-emerald-400 tabular-nums">0.1 s</p>
                <p className="mt-0.5 text-xs text-slate-300">Telemetry Resolution</p>
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="relative min-h-[220px] overflow-hidden rounded-lg border border-slate-800 bg-[#07090E] lg:col-span-7">
              <SlideImage
                src={GENERATED_ASSETS.moon}
                alt="Lunar surface ridge with Scout and Carrier rovers"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#07090E]/90 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-slate-200">
                <span className="font-mono">Lunar Shackleton Rim · 0.16 g</span>
                <span className="font-mono text-cyan-400">Scout Relay Active</span>
              </div>
            </div>
            <div className="flex flex-col justify-between divide-y divide-slate-800 rounded-lg border border-slate-800 bg-[#07090E] p-4 lg:col-span-5">
              <div className="pb-3">
                <p className="font-mono text-xs text-emerald-400 tabular-nums">Earth · 1.00 g</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">
                  Mojave Test Valley baseline: steep grades tax drive battery budgets and require careful speed selection.
                </p>
              </div>
              <div className="py-3">
                <p className="font-mono text-xs text-cyan-400 tabular-nums">Moon · 0.16 g</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">
                  Low gravity amplifies fast-speed momentum beside shadowed craters that drain thermal heaters.
                </p>
              </div>
              <div className="pt-3">
                <p className="font-mono text-xs text-amber-400 tabular-nums">Mars · 0.38 g</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">
                  Basalt ridges border fine wind-sorted sand where unassisted FAST traversal triggers wheel slip stalls.
                </p>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="flex flex-col justify-between rounded-lg border border-slate-800 bg-[#07090E] p-5 lg:col-span-6">
              <p className="font-mono text-xs text-cyan-400">Four-Command Planning Loop</p>
              <dl className="mt-4 space-y-3 text-xs">
                <div className="flex items-start justify-between gap-4 border-b border-slate-800/80 pb-2.5">
                  <dt className="font-mono font-semibold text-slate-100">DRIVE</dt>
                  <dd className="text-right text-slate-300">
                    Move to grid waypoint at Cautious, Nominal, or Fast speed
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4 border-b border-slate-800/80 pb-2.5">
                  <dt className="font-mono font-semibold text-slate-100">SCAN</dt>
                  <dd className="text-right text-slate-300">
                    Survey ahead for sandy ruts and adjust hazard traction confidence
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4 border-b border-slate-800/80 pb-2.5">
                  <dt className="font-mono font-semibold text-slate-100">SAMPLE</dt>
                  <dd className="text-right text-slate-300">
                    Collect mineral or telemetry core at target scientific stations
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="font-mono font-semibold text-slate-100">RELAY</dt>
                  <dd className="text-right text-slate-300">
                    Scout emits pathfinder route cue before Carrier crosses rough ground
                  </dd>
                </div>
              </dl>
              <p className="mt-4 border-t border-slate-800 pt-3 text-xs text-slate-400">
                Natural-language missions compile into structured steps via gemini-4-hydrogen and save locally as replayable recordings.
              </p>
            </div>
            <div className="relative min-h-[220px] overflow-hidden rounded-lg border border-slate-800 bg-[#07090E] lg:col-span-6">
              <SlideImage
                src={GENERATED_ASSETS.continuitySheet}
                alt="Scout 4-wheel and Carrier 6-wheel rover hardware continuity reference"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#07090E]/90 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-slate-200">
                <span className="font-mono">Scout · 4 Wheels</span>
                <span className="font-mono text-slate-400">·</span>
                <span className="font-mono">Carrier · 6 Wheels</span>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="relative min-h-[220px] overflow-hidden rounded-lg border border-slate-800 bg-[#07090E] lg:col-span-6">
              <SlideImage
                src={GENERATED_ASSETS.marsBoulder}
                alt="Mars split basalt boulder and sandy slip rut anchor scene"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#07090E]/90 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs">
                <span className="font-mono text-amber-300">Mars · Episode 0142</span>
                <span className="font-mono text-slate-300">Safe Stall Recorded</span>
              </div>
            </div>
            <div className="flex flex-col justify-between rounded-lg border border-slate-800 bg-[#07090E] p-5 lg:col-span-6">
              <div>
                <p className="font-mono text-xs text-cyan-400">
                  Telemetry Comparison · Episode 0142 vs. Recovery 0118
                </p>
                <div className="mt-4 grid grid-cols-1 gap-4 border-t border-slate-800 pt-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-amber-300">Episode 0142 · Stall</p>
                    <p className="font-mono text-xl font-semibold text-slate-100 tabular-nums">
                      3.4 rad/s
                    </p>
                    <p className="text-[11px] text-slate-400">Peak wheel spin in loose rut</p>
                    <p className="font-mono text-sm text-amber-300 tabular-nums">
                      0.09 m/s · 0.78 slip
                    </p>
                  </div>
                  <div className="space-y-1.5 border-t border-slate-800 pt-3 sm:border-t-0 sm:border-l sm:pl-5 sm:pt-0">
                    <p className="text-xs font-medium text-emerald-300">Episode 0118 · Recovery</p>
                    <p className="font-mono text-xl font-semibold text-slate-100 tabular-nums">
                      0.95 rad/s
                    </p>
                    <p className="text-[11px] text-slate-400">Controlled bypass & relay</p>
                    <p className="font-mono text-sm text-emerald-300 tabular-nums">
                      0.41 m/s · 0.06 slip
                    </p>
                  </div>
                </div>
              </div>
              <p className="mt-5 border-t border-slate-800 pt-4 text-xs leading-relaxed text-slate-300">
                Atlas filters traces by world and tags, pairs stalled runs with approved recoveries, and runs deep provenance audits with gemini-4-carbon.
              </p>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="relative min-h-[220px] overflow-hidden rounded-lg border border-slate-800 bg-[#07090E] lg:col-span-7">
              <SlideImage
                src={GENERATED_ASSETS.marsVariants}
                alt="Elevated Mars scenario variants across lighting, obstacle, and route"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#07090E]/90 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-slate-200">
                <span className="font-mono">Locked Elevated Mars Mesh</span>
                <span className="font-mono text-cyan-400">Lighting · Obstacle · Route</span>
              </div>
            </div>
            <div className="flex flex-col justify-between divide-y divide-slate-800 rounded-lg border border-slate-800 bg-[#07090E] p-4 lg:col-span-5">
              <div className="pb-3">
                <p className="font-mono text-xs text-cyan-400">Image & Video Generation</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">
                  Generate 1K–4K frames (gemini-3-pro-image / gemini-nano-banana-2.1) and animate scene clips (gemini-omni-1.2-flash).
                </p>
              </div>
              <div className="py-3">
                <p className="font-mono text-xs text-emerald-400">Negation-Aware Prompt Audit</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">
                  Verifies scene briefs avoid unintended clutter while allowing explicit negative-constraint phrasing.
                </p>
              </div>
              <div className="pt-3">
                <p className="font-mono text-xs text-slate-200">Multimodal Continuity Check</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">
                  gemini-4-argon inspects uploaded frames for 4-wheel Scout vs. 6-wheel Carrier fidelity and landmark lock.
                </p>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="grid h-full grid-cols-1 gap-4 md:grid-cols-3">
            <div className="flex flex-col justify-between rounded-lg border border-slate-800 bg-[#07090E] p-5">
              <div>
                <p className="font-mono text-xs text-cyan-400">Concept Film</p>
                <h4 className="mt-2 font-display text-base font-semibold text-slate-100">
                  60-Second Narrative Cut
                </h4>
                <p className="mt-2 text-xs leading-relaxed text-slate-300">
                  Eight synchronized scenes (1,440 frames at 24 fps) with SMPTE timecode, editorial subtitles, and clickable frame-to-studio handoff.
                </p>
              </div>
              <p className="mt-4 border-t border-slate-800 pt-3 font-mono text-[11px] text-slate-400 tabular-nums">
                8 Scenes · Scene-Adaptive Web Audio
              </p>
            </div>
            <div className="flex flex-col justify-between rounded-lg border border-slate-800 bg-[#07090E] p-5">
              <div>
                <p className="font-mono text-xs text-emerald-400">Atlas & Terrain</p>
                <h4 className="mt-2 font-display text-base font-semibold text-slate-100">
                  Live NASA & Maps Grounding
                </h4>
                <p className="mt-2 text-xs leading-relaxed text-slate-300">
                  Combines policy learning progression charts and Atlas episode filters with real-time Google Search and Google Maps planetary queries.
                </p>
              </div>
              <p className="mt-4 border-t border-slate-800 pt-3 font-mono text-[11px] text-slate-400">
                Search + Maps Grounding · Policy v02
              </p>
            </div>
            <div className="flex flex-col justify-between rounded-lg border border-slate-800 bg-[#07090E] p-5">
              <div>
                <p className="font-mono text-xs text-amber-300">Director & Audio</p>
                <h4 className="mt-2 font-display text-base font-semibold text-slate-100">
                  Voiceover & Supervisor Studio
                </h4>
                <p className="mt-2 text-xs leading-relaxed text-slate-300">
                  Record or upload narration takes inside 8-second scene windows, transcribe with automatic Gemini fallback, and consult the Continuity Supervisor.
                </p>
              </div>
              <p className="mt-4 border-t border-slate-800 pt-3 font-mono text-[11px] text-slate-400">
                Pacing Audit · Audio Transcription
              </p>
            </div>
          </div>
        );

      case 6:
      default:
        return (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-stretch">
            <div className="flex flex-col justify-center divide-y divide-slate-800 rounded-lg border border-slate-800 bg-[#07090E] p-5 lg:col-span-7">
              <div className="pb-4">
                <p className="text-sm font-semibold text-slate-100">Students & Independent Learners</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">
                  Gain practical intuition for wheel slip, gravity trade-offs, and energy budgeting through immediate trial and replay.
                </p>
              </div>
              <div className="py-4">
                <p className="text-sm font-semibold text-slate-100">Educators & Workshop Hosts</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">
                  Demonstrate a complete failure-to-recovery arc in minutes with the 6-step Guided Demo, then assign custom routes.
                </p>
              </div>
              <div className="pt-4">
                <p className="text-sm font-semibold text-slate-100">AI & Robotics Builders</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">
                  Inspect bounded goal translation, deterministic simulation logging, Atlas retrieval, and multimodal asset verification.
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-center gap-5 rounded-lg border border-slate-800 bg-[#07090E] p-5 lg:col-span-5">
              <div className="space-y-2">
                <p className="font-mono text-xs text-cyan-400">Live Transition</p>
                <h4 className="font-display text-lg font-semibold text-slate-100">
                  Continue Directly Into the App
                </h4>
                <p className="text-xs leading-relaxed text-slate-300">
                  Close out the presentation by launching the interactive Mission Game or starting the guided 6-step walkthrough.
                </p>
              </div>

              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsFullscreen(false);
                    onSelectTab('game');
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-500 px-4 py-2.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-cyan-400 whitespace-nowrap"
                >
                  <Compass className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Open Mission Game</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsFullscreen(false);
                    onStartDemo();
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-700 bg-[#0B0F17] px-4 py-2.5 text-xs font-medium text-slate-200 transition-colors hover:border-cyan-400 hover:text-cyan-300 whitespace-nowrap"
                >
                  <Play className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
                  <span>Launch 6-Step Guided Demo</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsFullscreen(false);
                    onSelectTab('film');
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-800 bg-[#0B0F17] px-4 py-2.5 text-xs font-medium text-slate-300 transition-colors hover:border-slate-600 hover:text-white whitespace-nowrap"
                >
                  <Film className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  <span>Watch Concept Film</span>
                </button>
              </div>
            </div>
          </div>
        );
    }
  };

  if (!unlocked) {
    return (
      <section
        id="presenter-deck"
        aria-labelledby="presenter-deck-locked-heading"
        className="border-t border-slate-800/80 pt-10"
      >
        <div className="grid grid-cols-1 gap-6 rounded-lg border border-slate-800 bg-[#0B0F17] p-6 lg:grid-cols-12 lg:items-center">
          <div className="space-y-2.5 lg:col-span-7">
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
              <Presentation className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>7-Slide Presenter Deck</span>
            </div>
            <h2
              id="presenter-deck-locked-heading"
              className="font-display text-xl font-semibold text-slate-100 [text-wrap:balance]"
            >
              Present First Contact live on stage or in workshops
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
              Enter the presenter password to unlock the 7-slide presentation deck with speaker notes, keyboard controls, and full-screen presentation mode.
            </p>
          </div>

          <form
            onSubmit={handleUnlock}
            className="space-y-3 border-t border-slate-800 pt-5 lg:col-span-5 lg:border-t-0 lg:border-l lg:pl-6 lg:pt-0"
          >
            <label
              htmlFor="presenter-passcode-input"
              className="block font-mono text-xs text-slate-300"
            >
              Presenter Password
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <input
                  id="presenter-passcode-input"
                  type={showPasscode ? 'text' : 'password'}
                  value={passcodeInput}
                  onChange={(e) => {
                    setPasscodeInput(e.target.value);
                    if (authError) setAuthError(null);
                  }}
                  placeholder="Enter password"
                  autoComplete="off"
                  className="w-full rounded-md border border-slate-700 bg-[#07090E] py-2.5 pl-3.5 pr-10 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPasscode((prev) => !prev)}
                  aria-label={showPasscode ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-200"
                >
                  {showPasscode ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-500 px-4 py-2.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-cyan-400 whitespace-nowrap shrink-0"
              >
                <Unlock className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Unlock Slides</span>
              </button>
            </div>
            {authError && (
              <p role="alert" className="text-xs text-amber-300">
                {authError}
              </p>
            )}
          </form>
        </div>
      </section>
    );
  }

  const deckBody = (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 flex flex-col justify-between bg-[#07090E] p-4 sm:p-8 overflow-y-auto'
          : 'space-y-4 rounded-lg border border-slate-800 bg-[#0B0F17] p-5 sm:p-6'
      }
    >
      {/* Deck Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Presentation className="h-4 w-4 text-cyan-400 shrink-0" aria-hidden="true" />
          <div>
            <h2 className="font-display text-base font-semibold text-slate-100">
              First Contact · 7-Slide Presentation
            </h2>
            <p className="font-mono text-[11px] text-slate-400 tabular-nums">
              Slide {currentSlide.number} / 0{SLIDES.length} · Arrow keys to navigate
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowNotes((prev) => !prev)}
            className="rounded-md border border-slate-700 bg-[#07090E] px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-slate-500 hover:text-white whitespace-nowrap shrink-0"
          >
            {showNotes ? 'Hide Notes' : 'Show Notes'}
          </button>
          <button
            type="button"
            onClick={() => setIsFullscreen((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-md border border-cyan-500/40 bg-cyan-500/10 px-3.5 py-2 text-xs font-medium text-cyan-200 transition-colors hover:bg-cyan-500/20 whitespace-nowrap shrink-0"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Exit Present Mode</span>
              </>
            ) : (
              <>
                <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Present Fullscreen</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleLock}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-[#07090E] px-3 py-2 text-xs font-medium text-slate-400 transition-colors hover:border-slate-500 hover:text-slate-200 whitespace-nowrap shrink-0"
          >
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Lock</span>
          </button>
        </div>
      </div>

      {/* Main Slide Stage */}
      <div
        className={`flex flex-1 flex-col justify-between rounded-lg border border-slate-800 bg-[#080C13] p-5 sm:p-8 ${
          isFullscreen ? 'my-4 min-h-[480px]' : 'min-h-[440px]'
        }`}
      >
        <div className="space-y-2 border-b border-slate-800/80 pb-5">
          <div className="flex items-center justify-between gap-4">
            <p className="font-mono text-xs text-cyan-400">{currentSlide.kicker}</p>
            <span className="font-mono text-xs text-slate-500 tabular-nums">
              {currentSlide.number} / 0{SLIDES.length}
            </span>
          </div>
          <h3 className="max-w-4xl font-display text-2xl font-semibold tracking-tight text-slate-50 sm:text-3xl [text-wrap:balance]">
            {currentSlide.title}
          </h3>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-300">
            {currentSlide.subtitle}
          </p>
        </div>

        <div className="my-5 flex-1">{renderSlideVisual(activeSlideIndex)}</div>

        <div className="flex items-center justify-between gap-4 border-t border-slate-800/80 pt-3 text-[11px] font-mono text-slate-500">
          <span>Rocket Academy · First Contact</span>
          <span className="tabular-nums">
            Slide {activeSlideIndex + 1} of {SLIDES.length}
          </span>
        </div>
      </div>

      {/* Slide Controls & Stepper */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goPrev}
              disabled={activeSlideIndex === 0}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-[#07090E] px-3.5 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-slate-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Previous</span>
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={activeSlideIndex === SLIDES.length - 1}
              className="inline-flex items-center gap-1.5 rounded-md bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap shrink-0"
            >
              <span>Next Slide</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          <div
            role="tablist"
            aria-label="Presentation slide selector"
            className="flex flex-wrap items-center gap-1.5"
          >
            {SLIDES.map((slide, idx) => {
              const active = idx === activeSlideIndex;
              return (
                <button
                  key={slide.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveSlideIndex(idx)}
                  className={`rounded px-2.5 py-1.5 font-mono text-xs tabular-nums transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-cyan-500 font-semibold text-slate-950'
                      : 'border border-slate-800 bg-[#07090E] text-slate-400 hover:border-slate-600 hover:text-slate-200'
                  }`}
                >
                  {slide.number}
                </button>
              );
            })}
          </div>
        </div>

        {showNotes && (
          <div className="rounded-md border border-slate-800 bg-[#07090E] px-4 py-3">
            <p className="font-mono text-[11px] text-slate-400">Speaker Notes</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">
              {currentSlide.speakerNotes}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <section
      id="presenter-deck"
      ref={deckSectionRef}
      tabIndex={-1}
      aria-label="Presenter slide deck"
      className="border-t border-slate-800/80 pt-10 focus:outline-none"
    >
      {deckBody}
    </section>
  );
};
