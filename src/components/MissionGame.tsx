import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Compass,
  Play,
  Pause,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  DESTINATIONS,
  DestinationConfig,
  DestinationId,
  getDestinationById,
} from '../data/missions';
import { missionAudio } from '../utils/missionAudio';
import {
  CommandAction,
  MissionRecording,
  RoverCommand,
  RoverSpeed,
  RoverUnit,
  clampCoord,
  createPresetCommands,
  simulateMission,
} from '../utils/missionSimulation';
import { MissionCanvas } from './MissionCanvas';
import { MissionDemoDirectiveKind } from './DemoWalkthrough';
import { SafeImage } from './SafeImage';
import { TelemetryTraceChart } from './TelemetryTraceChart';

export interface MissionDemoDirective {
  seq: number;
  kind: MissionDemoDirectiveKind;
}

interface MissionGameProps {
  demoDirective?: MissionDemoDirective | null;
  onStartDemo?: () => void;
  demoActive?: boolean;
}

const STORAGE_KEY = 'ra-mission-recordings-v1';

function buildSeedRecordings(): MissionRecording[] {
  const mars = getDestinationById('mars');
  const riskyPlan = createPresetCommands(mars, 'direct-risky');
  return [simulateMission(mars, riskyPlan, 'Baseline Attempt · Direct Fast Push')];
}

function deduplicateRecordingIds(items: MissionRecording[]): MissionRecording[] {
  const seen = new Set<string>();
  return items.map((item, idx) => {
    let uniqueId = item.id;
    if (seen.has(uniqueId)) {
      uniqueId = `${item.id}-dup-${idx}`;
    }
    seen.add(uniqueId);
    return uniqueId === item.id ? item : { ...item, id: uniqueId };
  });
}

function loadSavedRecordings(): MissionRecording[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildSeedRecordings();
    const parsed = JSON.parse(raw) as MissionRecording[];
    return Array.isArray(parsed) && parsed.length > 0
      ? deduplicateRecordingIds(parsed)
      : buildSeedRecordings();
  } catch {
    return buildSeedRecordings();
  }
}

export const MissionGame: React.FC<MissionGameProps> = ({
  demoDirective = null,
  onStartDemo,
  demoActive = false,
}) => {
  const [destinationId, setDestinationId] = useState<DestinationId>('mars');
  const destination: DestinationConfig = useMemo(
    () => getDestinationById(destinationId),
    [destinationId]
  );

  const [commands, setCommands] = useState<RoverCommand[]>(() =>
    createPresetCommands(getDestinationById('mars'), 'direct-risky')
  );
  const [planLabel, setPlanLabel] = useState<string>('Direct Fast Route');

  const [mode, setMode] = useState<'PLANNING' | 'RUNNING' | 'REPLAY'>('PLANNING');
  const [activeRecording, setActiveRecording] = useState<MissionRecording | null>(null);
  const [recordings, setRecordings] = useState<MissionRecording[]>(() => loadSavedRecordings());

  const [frameIndex, setFrameIndex] = useState<number>(0);
  const [replayPlaying, setReplayPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 4>(2);
  const [showMeshOverlay, setShowMeshOverlay] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);

  // AI-Assisted Planner State
  const [aiGoal, setAiGoal] = useState<string>(
    () => getDestinationById('mars').starterDirectGoal
  );
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiRationale, setAiRationale] = useState<string | null>(null);

  const lastTriggeredFrameRef = useRef<number>(-1);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(recordings.slice(0, 12)));
    } catch {
      // Ignore storage quota errors
    }
  }, [recordings]);

  // Simulation / Replay animation ticker
  useEffect(() => {
    if (!replayPlaying || !activeRecording) return;
    const totalFrames = activeRecording.frames.length;
    if (totalFrames <= 1) {
      setReplayPlaying(false);
      return;
    }

    const intervalMs = Math.max(20, Math.round(100 / playbackSpeed));
    const timer = window.setInterval(() => {
      setFrameIndex((prev) => {
        const next = prev + 1;
        if (next >= totalFrames - 1) {
          setReplayPlaying(false);
          if (mode === 'RUNNING') {
            setMode('REPLAY');
            const ok =
              activeRecording.outcome === 'SUCCESS' ||
              activeRecording.outcome === 'PARTIAL_SUCCESS';
            missionAudio.playOutcome(ok);
          }
          return totalFrames - 1;
        }
        return next;
      });
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [replayPlaying, activeRecording, playbackSpeed, mode]);

  // Trigger audio cues for frame events during live run
  useEffect(() => {
    if (mode !== 'RUNNING' || !replayPlaying || !activeRecording) return;
    if (frameIndex === lastTriggeredFrameRef.current) return;
    lastTriggeredFrameRef.current = frameIndex;

    const frame = activeRecording.frames[frameIndex];
    if (!frame) return;
    const prevFrame = frameIndex > 0 ? activeRecording.frames[frameIndex - 1] : null;

    if (frame.scanPulse && !prevFrame?.scanPulse) {
      missionAudio.playScan();
    }
    if (frame.sampledIds.length > (prevFrame?.sampledIds.length ?? 0)) {
      missionAudio.playSample();
    }
    if (frame.slipRatio >= 0.54 && (prevFrame?.slipRatio ?? 0) < 0.54) {
      missionAudio.playSlipWarning();
    }
  }, [frameIndex, mode, replayPlaying, activeRecording]);

  // Execute external guided-demo stage directives
  useEffect(() => {
    if (!demoDirective) return;
    const mars = getDestinationById('mars');

    if (demoDirective.kind === 'MARS_PLAN_RISKY') {
      setDestinationId('mars');
      setCommands(createPresetCommands(mars, 'direct-risky'));
      setPlanLabel('Direct Fast Route');
      setShowMeshOverlay(true);
      setAiRationale(null);
      setAiError(null);
      setMode('PLANNING');
      setActiveRecording(null);
      setReplayPlaying(false);
      setFrameIndex(0);
    } else if (demoDirective.kind === 'MARS_RUN_RISKY') {
      const risky = createPresetCommands(mars, 'direct-risky');
      const simulated = simulateMission(mars, risky, 'Demo Run 1 · Direct Fast Push');
      const rec: MissionRecording = {
        ...simulated,
        id: `${simulated.id}-${Date.now()}-demo1`,
      };
      setDestinationId('mars');
      setCommands(risky);
      setPlanLabel('Direct Fast Route');
      setShowMeshOverlay(true);
      setActiveRecording(rec);
      setRecordings((prev) => [rec, ...prev].slice(0, 12));
      setPlaybackSpeed(2);
      setFrameIndex(0);
      lastTriggeredFrameRef.current = -1;
      setMode('RUNNING');
      setReplayPlaying(true);
    } else if (demoDirective.kind === 'MARS_REPLAY_SLIP') {
      const risky = createPresetCommands(mars, 'direct-risky');
      const existingRisky =
        activeRecording && activeRecording.destinationId === 'mars' && activeRecording.outcome === 'STALLED_SLIP'
          ? activeRecording
          : {
              ...simulateMission(mars, risky, 'Demo Run 1 · Direct Fast Push'),
              id: `rec-demo-slip-${Date.now()}`,
            };
      setDestinationId('mars');
      setCommands(existingRisky.commands);
      setPlanLabel(existingRisky.planLabel);
      setActiveRecording(existingRisky);
      setMode('REPLAY');
      setReplayPlaying(false);
      const slipEv = existingRisky.events.find((e) => e.kind === 'SLIP') ?? existingRisky.events[existingRisky.events.length - 1];
      const targetIdx = slipEv
        ? existingRisky.frames.findIndex((f) => f.t >= slipEv.t)
        : Math.max(0, existingRisky.frames.length - 2);
      setFrameIndex(targetIdx >= 0 ? targetIdx : 0);
    } else if (demoDirective.kind === 'MARS_RUN_SAFE') {
      const safe = createPresetCommands(mars, 'safe-bypass');
      const simulated = simulateMission(mars, safe, 'Demo Run 2 · Safe Bypass Route');
      const rec: MissionRecording = {
        ...simulated,
        id: `${simulated.id}-${Date.now()}-demo2`,
      };
      setDestinationId('mars');
      setCommands(safe);
      setPlanLabel('Safe Bypass Route');
      setShowMeshOverlay(true);
      setActiveRecording(rec);
      setRecordings((prev) => [rec, ...prev].slice(0, 12));
      setPlaybackSpeed(4);
      setFrameIndex(0);
      lastTriggeredFrameRef.current = -1;
      setMode('RUNNING');
      setReplayPlaying(true);
    }
  }, [demoDirective]);

  const handleSelectDestination = (nextId: DestinationId) => {
    const nextDest = getDestinationById(nextId);
    setDestinationId(nextId);
    setCommands(createPresetCommands(nextDest, 'direct-risky'));
    setPlanLabel('Direct Fast Route');
    setAiGoal(nextDest.starterDirectGoal);
    setAiRationale(null);
    setAiError(null);
    setMode('PLANNING');
    setActiveRecording(null);
    setFrameIndex(0);
    setReplayPlaying(false);
  };

  const handleAddWaypoint = (x: number, y: number) => {
    missionAudio.playWaypointClick();
    setCommands((prev) => [
      ...prev,
      {
        id: `cmd-${Date.now()}-${prev.length + 1}`,
        action: 'DRIVE',
        x,
        y,
        speed: 'NOMINAL',
        unit: 'TEAM',
        note: `Waypoint (${x}, ${y})`,
      },
    ]);
    setPlanLabel('Custom Mission Plan');
  };

  const handleAppendAction = (action: CommandAction) => {
    missionAudio.playWaypointClick();
    const lastDrive = [...commands].reverse().find((c) => c.action === 'DRIVE');
    const x = lastDrive ? lastDrive.x : destination.start.x;
    const y = lastDrive ? lastDrive.y : destination.start.y;
    const defaultNote: Record<CommandAction, string> = {
      DRIVE: `Drive to (${destination.beacon.x}, ${destination.beacon.y})`,
      SCAN: 'Scout LiDAR terrain scan',
      SAMPLE: 'Carrier arm core sample',
      RELAY: 'Scout cyan safe-route handoff',
    };
    setCommands((prev) => [
      ...prev,
      {
        id: `cmd-${Date.now()}-${prev.length + 1}`,
        action,
        x: action === 'DRIVE' ? destination.beacon.x : x,
        y: action === 'DRIVE' ? destination.beacon.y : y,
        speed: action === 'DRIVE' ? 'CAUTIOUS' : 'CAUTIOUS',
        unit: action === 'RELAY' || action === 'SCAN' ? 'SCOUT' : action === 'SAMPLE' ? 'CARRIER' : 'TEAM',
        note: defaultNote[action],
      },
    ]);
    setPlanLabel('Custom Mission Plan');
  };

  const handleUpdateCommand = (id: string, patch: Partial<RoverCommand>) => {
    setCommands((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    setPlanLabel('Custom Mission Plan');
  };

  const handleMoveCommand = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= commands.length) return;
    setCommands((prev) => {
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      next.splice(target, 0, item);
      return next;
    });
  };

  const handleRemoveCommand = (id: string) => {
    setCommands((prev) => prev.filter((c) => c.id !== id));
  };

  const handleLaunchMission = () => {
    const simulated = simulateMission(destination, commands, planLabel);
    const rec: MissionRecording = {
      ...simulated,
      id: `${simulated.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    setActiveRecording(rec);
    setRecordings((prev) => [rec, ...prev].slice(0, 12));
    setFrameIndex(0);
    lastTriggeredFrameRef.current = -1;
    setMode('RUNNING');
    setReplayPlaying(true);
    missionAudio.playLaunch();
  };

  const handleDesignNextAttempt = (rec?: MissionRecording) => {
    const source = rec ?? activeRecording;
    if (source) {
      if (source.destinationId !== destinationId) {
        setDestinationId(source.destinationId);
      }
      setCommands(source.commands.map((c, idx) => ({ ...c, id: `cmd-iter-${idx + 1}-${Date.now()}` })));
      setPlanLabel(`Revised from ${source.planLabel}`);
      if (source.outcome !== 'SUCCESS') {
        setAiGoal(
          `Previous run outcome: ${source.outcomeTitle}. ${source.nextSuggestion} Reach the extraction beacon safely and collect science targets.`
        );
      }
    }
    setMode('PLANNING');
    setReplayPlaying(false);
    setFrameIndex(0);
  };

  const handleReplayFromArchive = (rec: MissionRecording) => {
    if (rec.destinationId !== destinationId) {
      setDestinationId(rec.destinationId);
    }
    setActiveRecording(rec);
    setMode('REPLAY');
    setFrameIndex(0);
    setReplayPlaying(true);
  };

  const handleAiPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setAiError(null);
    if (!aiGoal.trim()) {
      setAiError('Describe what you want the rover team to accomplish.');
      return;
    }

    setAiLoading(true);
    try {
      const res = await fetch('/api/gemini/plan-mission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: aiGoal,
          destinationName: destination.name,
          worldSummary: destination.briefing,
          start: destination.start,
          beacon: destination.beacon,
          sampleSites: destination.scienceTargets.map((s) => ({
            id: s.id,
            label: s.label,
            x: s.x,
            y: s.y,
          })),
          hazards: destination.hazards.map((h) => ({
            id: h.id,
            label: h.label,
            kind: h.kind,
            x: h.x,
            y: h.y,
            radius: h.radius,
          })),
          previousOutcomeSummary: activeRecording
            ? `${activeRecording.outcomeTitle}: ${activeRecording.outcomeLesson}`
            : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI mission planner request failed.');

      const rawCommands = Array.isArray(data.commands) ? data.commands : [];
      if (rawCommands.length === 0) {
        throw new Error('Planner returned an empty command list. Adjust your goal and try again.');
      }

      const validActions: CommandAction[] = ['DRIVE', 'SCAN', 'SAMPLE', 'RELAY'];
      const validSpeeds: RoverSpeed[] = ['CAUTIOUS', 'NOMINAL', 'FAST'];
      const validUnits: RoverUnit[] = ['SCOUT', 'CARRIER', 'TEAM'];

      const mapped: RoverCommand[] = rawCommands.map(
        (
          item: {
            action?: string;
            x?: number;
            y?: number;
            speed?: string;
            unit?: string;
            note?: string;
          },
          i: number
        ) => {
          const actionUpper = String(item.action || 'DRIVE').toUpperCase() as CommandAction;
          const speedUpper = String(item.speed || 'CAUTIOUS').toUpperCase() as RoverSpeed;
          const unitUpper = String(item.unit || 'TEAM').toUpperCase() as RoverUnit;
          return {
            id: `ai-cmd-${Date.now()}-${i + 1}`,
            action: validActions.includes(actionUpper) ? actionUpper : 'DRIVE',
            x: clampCoord(Number(item.x ?? destination.beacon.x), 36, 964),
            y: clampCoord(Number(item.y ?? destination.beacon.y), 36, 524),
            speed: validSpeeds.includes(speedUpper) ? speedUpper : 'CAUTIOUS',
            unit: validUnits.includes(unitUpper) ? unitUpper : 'TEAM',
            note: String(item.note || 'AI-planned maneuver').slice(0, 64),
          };
        }
      );

      setCommands(mapped);
      setPlanLabel(data.planTitle || 'AI-Assisted Plan');
      setAiRationale(data.rationale || null);
      setMode('PLANNING');
      setReplayPlaying(false);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI mission planner failed.');
    } finally {
      setAiLoading(false);
    }
  };

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      missionAudio.setEnabled(next);
      return next;
    });
  };

  const currentFrame = activeRecording
    ? activeRecording.frames[Math.min(frameIndex, activeRecording.frames.length - 1)]
    : null;

  const isSuccessOutcome =
    activeRecording?.outcome === 'SUCCESS' || activeRecording?.outcome === 'PARTIAL_SUCCESS';

  const statusTone =
    mode === 'PLANNING'
      ? 'text-cyan-400'
      : mode === 'RUNNING'
      ? 'text-amber-400'
      : isSuccessOutcome
      ? 'text-emerald-400'
      : 'text-rose-400';

  const statusLabel =
    mode === 'PLANNING'
      ? 'Planning Route'
      : mode === 'RUNNING'
      ? 'Simulation Active'
      : activeRecording?.outcomeTitle || 'Replay Ready';

  return (
    <div className="space-y-8" data-testid="mission-game">
      {/* Intro & Destination Selector */}
      <section aria-labelledby="mission-briefing-heading" className="space-y-5">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-800/80 pb-5 md:flex-row md:items-end">
          <div className="max-w-3xl">
            <p className="font-mono text-xs tracking-wider text-cyan-400">
              ROCKET ACADEMY · FIRST CONTACT
            </p>
            <h1
              id="mission-briefing-heading"
              className="mt-1 font-display text-2xl font-semibold tracking-tight text-slate-50 sm:text-3xl"
            >
              Plan the mission. Explore the world. Learn from the result.
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Choose a planetary destination, design a structured rover command sequence, launch the deterministic simulation, and replay mission recordings to refine your next attempt.
            </p>
            {onStartDemo && !demoActive && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onStartDemo}
                  className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-cyan-400 whitespace-nowrap shrink-0"
                >
                  <Play className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Start Guided Demo</span>
                </button>
                <span className="text-xs text-slate-400">
                  6-step interactive tour · Plan → Slip Failure → Replay → Atlas → Safe Bypass → Concept Film
                </span>
              </div>
            )}
          </div>
          <div className="shrink-0 font-mono text-xs text-slate-400 tabular-nums">
            Synthetic deterministic rover motion · Educational mission prototype
          </div>
        </div>

        {/* 3 Planetary Destination Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {DESTINATIONS.map((dest) => {
            const active = dest.id === destinationId;
            return (
              <button
                key={dest.id}
                type="button"
                onClick={() => handleSelectDestination(dest.id)}
                className={`group flex flex-col overflow-hidden rounded-lg border text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 ${
                  active
                    ? 'border-cyan-400 bg-[#0F172A]'
                    : 'border-slate-800 bg-[#0B0F17] hover:border-slate-700'
                }`}
              >
                <div className="relative aspect-video w-full overflow-hidden border-b border-slate-800">
                  <SafeImage
                    src={dest.imagePath}
                    alt={`${dest.name} terrain preview`}
                    className="transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3 py-2">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-display font-semibold text-slate-100">
                        {dest.name}
                      </span>
                      <span className="font-mono text-[11px] tabular-nums text-slate-300">
                        {dest.gravityG.toFixed(2)}g
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-1 flex-col justify-between p-3.5">
                  <p className="text-xs leading-relaxed text-slate-300">{dest.challengeSummary}</p>
                  <p className="mt-2 font-mono text-[11px] text-slate-500">
                    {dest.sector} · {dest.scienceTargets.length} science targets
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Main Split Workspace: Left Mission Planner + Center Terrain Simulator */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Left Control & Command Sequence Column */}
        <aside className="space-y-4 rounded-lg border border-slate-800 bg-[#0B0F17] p-4 lg:col-span-4">
          <div className="border-b border-slate-800 pb-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-sm font-semibold text-slate-100">
                Mission Command Planner
              </h2>
              <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                {commands.length} steps
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">{destination.briefing}</p>
          </div>

          {/* AI-Assisted Planner */}
          <form onSubmit={handleAiPlan} className="space-y-2.5 border-b border-slate-800 pb-4">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="ai-mission-goal"
                className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                <span>AI-Assisted Goal Translator</span>
              </label>
              <span className="font-mono text-[11px] text-slate-500">gemini-4-hydrogen</span>
            </div>
            <textarea
              id="ai-mission-goal"
              rows={2}
              value={aiGoal}
              onChange={(e) => setAiGoal(e.target.value)}
              placeholder="Describe your mission goal in plain language..."
              className="w-full rounded-md border border-slate-700 bg-[#07090E] px-3 py-2 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
            />
            <div className="flex items-center justify-between gap-2">
              <button
                type="submit"
                disabled={aiLoading}
                className="inline-flex items-center gap-1.5 rounded-md border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-300 transition-colors hover:bg-cyan-500/20 disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                {aiLoading ? 'Translating Goal...' : 'Generate Commands'}
              </button>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setCommands(createPresetCommands(destination, 'direct-risky'));
                    setPlanLabel('Direct Fast Route');
                    setAiRationale(null);
                    setMode('PLANNING');
                    setReplayPlaying(false);
                  }}
                  className="rounded border border-slate-700 bg-[#07090E] px-2.5 py-1.5 text-[11px] font-medium text-slate-300 hover:border-slate-500 whitespace-nowrap shrink-0"
                >
                  Direct Preset
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCommands(createPresetCommands(destination, 'safe-bypass'));
                    setPlanLabel('Safe Bypass Route');
                    setAiRationale(null);
                    setMode('PLANNING');
                    setReplayPlaying(false);
                  }}
                  className="rounded border border-slate-700 bg-[#07090E] px-2.5 py-1.5 text-[11px] font-medium text-emerald-300 hover:border-emerald-500/60 whitespace-nowrap shrink-0"
                >
                  Safe Preset
                </button>
              </div>
            </div>
            {aiError && (
              <p role="alert" className="rounded border border-rose-500/40 bg-rose-500/10 p-2 text-xs text-rose-200">
                {aiError}
              </p>
            )}
            {aiRationale && (
              <p className="rounded border border-cyan-500/30 bg-[#07090E] p-2.5 text-xs leading-relaxed text-slate-300">
                {aiRationale}
              </p>
            )}
          </form>

          {/* Quick Append Action Buttons */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200">
                Structured Rover Commands
              </span>
              {commands.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setCommands([]);
                    setMode('PLANNING');
                    setReplayPlaying(false);
                  }}
                  className="text-[11px] text-slate-400 hover:text-rose-300"
                >
                  Clear All
                </button>
              )}
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {(['DRIVE', 'SCAN', 'SAMPLE', 'RELAY'] as CommandAction[]).map((act) => (
                <button
                  key={act}
                  type="button"
                  onClick={() => handleAppendAction(act)}
                  disabled={mode !== 'PLANNING'}
                  className="inline-flex items-center justify-center gap-1 rounded border border-slate-700 bg-[#07090E] px-2 py-1.5 text-[11px] font-medium text-slate-200 transition-colors hover:border-cyan-400 disabled:opacity-40 whitespace-nowrap"
                >
                  <Plus className="h-3 w-3 text-cyan-400" aria-hidden="true" />
                  <span>{act}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Command List */}
          <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
            {commands.length === 0 ? (
              <div className="rounded border border-dashed border-slate-700 bg-[#07090E] p-4 text-center text-xs text-slate-400">
                Click on the terrain map or add a rover action above to build your mission sequence.
              </div>
            ) : (
              commands.map((cmd, idx) => {
                const isActiveStep =
                  mode !== 'PLANNING' && currentFrame?.activeCommandIndex === idx;
                return (
                  <div
                    key={cmd.id}
                    className={`rounded-md border p-2.5 transition-colors ${
                      isActiveStep
                        ? 'border-cyan-400 bg-[#0F172A]'
                        : 'border-slate-800 bg-[#07090E]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <span className="text-slate-500 tabular-nums">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <span className="font-semibold text-cyan-300">{cmd.action}</span>
                        {cmd.action === 'DRIVE' && (
                          <span className="text-slate-400 tabular-nums">
                            ({cmd.x}, {cmd.y})
                          </span>
                        )}
                      </div>
                      {mode === 'PLANNING' && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            aria-label={`Move step ${idx + 1} up`}
                            onClick={() => handleMoveCommand(idx, -1)}
                            disabled={idx === 0}
                            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100 disabled:opacity-30"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Move step ${idx + 1} down`}
                            onClick={() => handleMoveCommand(idx, 1)}
                            disabled={idx === commands.length - 1}
                            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100 disabled:opacity-30"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Remove step ${idx + 1}`}
                            onClick={() => handleRemoveCommand(cmd.id)}
                            className="rounded p-1 text-slate-400 hover:bg-rose-500/20 hover:text-rose-300"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    <p className="mt-1 truncate text-[11px] text-slate-400">{cmd.note}</p>

                    {cmd.action === 'DRIVE' && (
                      <div className="mt-2 flex items-center gap-1">
                        {(['CAUTIOUS', 'NOMINAL', 'FAST'] as RoverSpeed[]).map((sp) => (
                          <button
                            key={sp}
                            type="button"
                            disabled={mode !== 'PLANNING'}
                            onClick={() => handleUpdateCommand(cmd.id, { speed: sp })}
                            className={`rounded px-2 py-0.5 font-mono text-[10px] font-medium transition-colors disabled:opacity-60 ${
                              cmd.speed === sp
                                ? sp === 'FAST'
                                  ? 'bg-amber-400 text-slate-950'
                                  : sp === 'CAUTIOUS'
                                  ? 'bg-cyan-500 text-slate-950'
                                  : 'bg-slate-200 text-slate-950'
                                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {sp}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Primary Action Bar */}
          <div className="border-t border-slate-800 pt-3">
            {mode === 'PLANNING' ? (
              <button
                type="button"
                onClick={handleLaunchMission}
                disabled={commands.length === 0}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-400 disabled:opacity-40"
              >
                <Play className="h-4 w-4" aria-hidden="true" />
                <span>Run Mission</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleDesignNextAttempt()}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-cyan-500/60 bg-cyan-500/15 px-4 py-2.5 text-sm font-semibold text-cyan-200 transition-colors hover:bg-cyan-500/25"
              >
                <Compass className="h-4 w-4" aria-hidden="true" />
                <span>Design Next Attempt</span>
              </button>
            )}
          </div>
        </aside>

        {/* Right / Main Terrain Simulation & Replay Viewport */}
        <section className="space-y-4 lg:col-span-8">
          {/* Telemetry Ribbon */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-[#0B0F17] px-4 py-2.5">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
              <span className={`font-mono text-xs font-semibold ${statusTone}`}>
                ● {statusLabel}
              </span>
              <span className="font-mono text-xs text-slate-300 tabular-nums">
                T+{currentFrame ? currentFrame.t.toFixed(1) : '0.0'}s
              </span>
              <span className="font-mono text-xs text-slate-300 tabular-nums">
                Battery {currentFrame ? `${currentFrame.batteryPct.toFixed(0)}%` : '100%'}
              </span>
              <span className="font-mono text-xs text-amber-300 tabular-nums">
                Wheel {currentFrame ? `${currentFrame.wheelVelocity.toFixed(2)} rad/s` : '0.00 rad/s'}
              </span>
              <span className="font-mono text-xs text-cyan-300 tabular-nums">
                Progress {currentFrame ? `${currentFrame.forwardProgress.toFixed(2)} m/s` : '0.00 m/s'}
              </span>
              <span className="font-mono text-xs text-slate-400 tabular-nums">
                Slip {currentFrame ? `${Math.round(currentFrame.slipRatio * 100)}%` : '0%'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowMeshOverlay((v) => !v)}
                className={`rounded border px-2.5 py-1 text-xs font-medium whitespace-nowrap ${
                  showMeshOverlay
                    ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300'
                    : 'border-slate-700 bg-[#07090E] text-slate-400'
                }`}
              >
                Topo Mesh
              </button>
              <button
                type="button"
                onClick={toggleSound}
                aria-label={soundEnabled ? 'Mute mission audio cues' : 'Enable mission audio cues'}
                className="inline-flex items-center gap-1.5 rounded border border-slate-700 bg-[#07090E] px-2.5 py-1 text-xs text-slate-300 hover:border-slate-500"
              >
                {soundEnabled ? (
                  <Volume2 className="h-3.5 w-3.5 text-cyan-400" />
                ) : (
                  <VolumeX className="h-3.5 w-3.5 text-slate-500" />
                )}
                <span>{soundEnabled ? 'Audio On' : 'Muted'}</span>
              </button>
            </div>
          </div>

          {/* Interactive Tactical Terrain Canvas */}
          <MissionCanvas
            destination={destination}
            commands={mode === 'REPLAY' && activeRecording ? activeRecording.commands : commands}
            mode={mode}
            frames={activeRecording?.frames ?? []}
            frameIndex={frameIndex}
            showMeshOverlay={showMeshOverlay}
            onAddWaypoint={handleAddWaypoint}
          />

          {/* Replay Scrubber Controls */}
          {activeRecording && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-800 bg-[#0B0F17] px-4 py-3">
              <button
                type="button"
                onClick={() => {
                  if (frameIndex >= activeRecording.frames.length - 1) {
                    setFrameIndex(0);
                  }
                  setReplayPlaying((p) => !p);
                }}
                className="inline-flex items-center gap-1.5 rounded-md bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400 whitespace-nowrap shrink-0"
              >
                {replayPlaying ? (
                  <>
                    <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Play Replay</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setFrameIndex(0);
                  setReplayPlaying(true);
                }}
                className="inline-flex items-center gap-1 rounded border border-slate-700 bg-[#07090E] px-2.5 py-1.5 text-xs text-slate-200 hover:border-slate-500 whitespace-nowrap shrink-0"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Restart</span>
              </button>

              <div className="flex flex-1 items-center gap-3 min-w-[200px]">
                <label htmlFor="mission-replay-scrubber" className="sr-only">
                  Scrub mission recording timeline
                </label>
                <input
                  id="mission-replay-scrubber"
                  type="range"
                  min={0}
                  max={Math.max(0, activeRecording.frames.length - 1)}
                  value={frameIndex}
                  onChange={(e) => {
                    setReplayPlaying(false);
                    setFrameIndex(Number(e.target.value));
                  }}
                  className="w-full accent-cyan-400"
                />
                <span className="font-mono text-xs text-slate-300 tabular-nums shrink-0">
                  {currentFrame ? currentFrame.t.toFixed(1) : '0.0'}s / {activeRecording.durationSec.toFixed(1)}s
                </span>
              </div>

              <div className="flex items-center gap-1 rounded border border-slate-800 bg-[#07090E] p-0.5">
                {([1, 2, 4] as const).map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => setPlaybackSpeed(spd)}
                    className={`rounded px-2 py-1 font-mono text-[11px] ${
                      playbackSpeed === spd
                        ? 'bg-slate-800 text-cyan-300'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Post-Run Replay Inspection + Mission Recording Archive */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Outcome Lesson & Telemetry Inspection */}
        <section className="space-y-4 rounded-lg border border-slate-800 bg-[#0B0F17] p-5 lg:col-span-7">
          {activeRecording ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <p
                    className={`font-mono text-xs font-semibold ${
                      isSuccessOutcome ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {activeRecording.outcomeTitle}
                  </p>
                  <h2 className="mt-1 font-display text-base font-semibold text-slate-100">
                    {activeRecording.planLabel} · {activeRecording.destinationName}
                  </h2>
                </div>
                <div className="flex items-center gap-5 font-mono text-xs tabular-nums">
                  <div>
                    <span className="text-slate-500">Score </span>
                    <span className="font-semibold text-slate-100">{activeRecording.score}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Science </span>
                    <span className="font-semibold text-cyan-300">
                      {activeRecording.scienceCollected}/{activeRecording.scienceAvailable}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Battery </span>
                    <span className="font-semibold text-slate-100">
                      {activeRecording.finalBatteryPct.toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded border border-slate-800 bg-[#07090E] p-3">
                  <p className="text-[11px] font-semibold text-slate-400">What Happened</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-200">
                    {activeRecording.outcomeLesson}
                  </p>
                </div>
                <div className="rounded border border-slate-800 bg-[#07090E] p-3">
                  <p className="text-[11px] font-semibold text-cyan-400">Next Design Adjustment</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-200">
                    {activeRecording.nextSuggestion}
                  </p>
                </div>
              </div>

              <TelemetryTraceChart
                points={activeRecording.telemetry}
                label="Recorded Wheel Velocity vs. Forward Progress"
              />

              {/* Clickable Action & Outcome Log */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-300">
                  Mission Trace Events (click to jump replay)
                </p>
                <div className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
                  {activeRecording.events.map((ev) => (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => {
                        const targetIdx = activeRecording.frames.findIndex(
                          (f) => f.t >= ev.t
                        );
                        setReplayPlaying(false);
                        setMode('REPLAY');
                        setFrameIndex(targetIdx >= 0 ? targetIdx : 0);
                      }}
                      className="flex w-full items-start justify-between gap-3 rounded border border-slate-800 bg-[#07090E] px-3 py-2 text-left transition-colors hover:border-cyan-500/50"
                    >
                      <div className="min-w-0">
                        <span
                          className={`text-xs font-medium ${
                            ev.kind === 'FAIL'
                              ? 'text-rose-300'
                              : ev.kind === 'SLIP' || ev.kind === 'HAZARD'
                              ? 'text-amber-300'
                              : ev.kind === 'SUCCESS' || ev.kind === 'SAMPLE'
                              ? 'text-emerald-300'
                              : 'text-cyan-300'
                          }`}
                        >
                          {ev.title}
                        </span>
                        <p className="truncate text-[11px] text-slate-400">{ev.detail}</p>
                      </div>
                      <span className="shrink-0 font-mono text-[11px] text-slate-500 tabular-nums">
                        T+{ev.t.toFixed(1)}s
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full min-h-[240px] flex-col items-center justify-center text-center">
              <p className="font-display text-sm font-semibold text-slate-200">
                No Active Run Loaded
              </p>
              <p className="mt-1 max-w-md text-xs text-slate-400">
                Plot waypoints on the terrain map or click Run Mission to generate a deterministic mission recording, or replay an archived run on the right.
              </p>
            </div>
          )}
        </section>

        {/* Mission Recordings Archive */}
        <section className="space-y-4 rounded-lg border border-slate-800 bg-[#0B0F17] p-5 lg:col-span-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-100">
                Mission Recordings
              </h2>
              <p className="text-xs text-slate-400">
                Preserved traces from previous runs to inform your next mission design
              </p>
            </div>
            <span className="font-mono text-xs text-slate-400 tabular-nums">
              {recordings.length} saved
            </span>
          </div>

          <div className="max-h-[420px] space-y-2.5 overflow-y-auto pr-1">
            {recordings.map((rec) => {
              const ok = rec.outcome === 'SUCCESS' || rec.outcome === 'PARTIAL_SUCCESS';
              const isViewing = activeRecording?.id === rec.id;
              return (
                <div
                  key={rec.id}
                  className={`rounded-lg border p-3 transition-colors ${
                    isViewing
                      ? 'border-cyan-400 bg-[#0F172A]'
                      : 'border-slate-800 bg-[#07090E]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-slate-100 truncate">
                      {rec.planLabel}
                    </span>
                    <span
                      className={`shrink-0 text-[11px] font-medium ${
                        ok ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {rec.outcome === 'SUCCESS'
                        ? 'Success'
                        : rec.outcome === 'PARTIAL_SUCCESS'
                        ? 'Partial'
                        : 'Halted'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {rec.destinationName} · {rec.durationSec.toFixed(1)}s · Science {rec.scienceCollected}/{rec.scienceAvailable} · Score {rec.score}
                  </p>
                  <p className="mt-1.5 line-clamp-2 text-[11px] text-slate-300">
                    {rec.outcomeLesson}
                  </p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleReplayFromArchive(rec)}
                      className="rounded border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-medium text-cyan-300 hover:bg-cyan-500/20"
                    >
                      Replay Run
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDesignNextAttempt(rec)}
                      className="rounded border border-slate-700 bg-[#0B0F17] px-2.5 py-1 text-[11px] font-medium text-slate-200 hover:border-slate-500"
                    >
                      Load Commands
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};
