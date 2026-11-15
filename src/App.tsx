import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AtlasAndGrounding } from './components/AtlasAndGrounding';
import { ConceptFilmPlayer } from './components/ConceptFilmPlayer';
import { DEMO_STAGES, DemoWalkthrough } from './components/DemoWalkthrough';
import { DirectorAndAudio } from './components/DirectorAndAudio';
import { MediaStudio } from './components/MediaStudio';
import { MissionDemoDirective, MissionGame } from './components/MissionGame';
import { StoryboardRail } from './components/StoryboardRail';
import { TopBar, WorkspaceTab } from './components/TopBar';
import { FILM_DURATION_SEC, FilmScene } from './data/storyboard';
import { conceptScore } from './utils/ambientAudio';
import { getSceneAtTime } from './utils/filmTimeline';

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('game');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [studioSeedScene, setStudioSeedScene] = useState<FilmScene | null>(null);

  // End-to-End Guided Demo State
  const [demoStageIndex, setDemoStageIndex] = useState<number | null>(null);
  const [demoAutoPlay, setDemoAutoPlay] = useState<boolean>(false);
  const [demoDirective, setDemoDirective] = useState<MissionDemoDirective | null>(null);

  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      lastTsRef.current = null;
      return;
    }

    const tick = (now: number) => {
      if (lastTsRef.current === null) {
        lastTsRef.current = now;
      }
      const dt = (now - lastTsRef.current) / 1000;
      lastTsRef.current = now;

      setCurrentTime((prev) => {
        const next = prev + dt;
        if (next >= FILM_DURATION_SEC) {
          setIsPlaying(false);
          return FILM_DURATION_SEC;
        }
        return next;
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying]);

  const { scene } = getSceneAtTime(currentTime);

  useEffect(() => {
    conceptScore.updateForScene(scene.kind);
  }, [scene.kind]);

  useEffect(() => {
    return () => conceptScore.dispose();
  }, []);

  const applyDemoStage = useCallback((idx: number) => {
    const clamped = Math.max(0, Math.min(DEMO_STAGES.length - 1, idx));
    const stage = DEMO_STAGES[clamped];
    setDemoStageIndex(clamped);
    setActiveTab(stage.tab);

    if (stage.missionDirective) {
      setDemoDirective({
        seq: Date.now() + clamped,
        kind: stage.missionDirective,
      });
    }

    if (stage.tab === 'film') {
      setCurrentTime(stage.filmSeekSec ?? 0);
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  }, []);

  const handleStartDemo = () => {
    setDemoAutoPlay(false);
    applyDemoStage(0);
  };

  const handleExitDemo = () => {
    setDemoStageIndex(null);
    setDemoAutoPlay(false);
    setIsPlaying(false);
  };

  // Auto-advance demo timer when Auto-Play is active
  useEffect(() => {
    if (demoStageIndex === null || !demoAutoPlay) return;
    if (demoStageIndex >= DEMO_STAGES.length - 1) {
      setDemoAutoPlay(false);
      return;
    }
    const dwell = DEMO_STAGES[demoStageIndex].autoDurationMs;
    const timer = window.setTimeout(() => {
      applyDemoStage(demoStageIndex + 1);
    }, dwell);
    return () => window.clearTimeout(timer);
  }, [demoStageIndex, demoAutoPlay, applyDemoStage]);

  const handleTogglePlay = () => {
    setIsPlaying((prev) => {
      const next = !prev;
      if (next && currentTime >= FILM_DURATION_SEC) {
        setCurrentTime(0);
      }
      return next;
    });
  };

  const handlePlayFullCut = () => {
    setActiveTab('film');
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (currentTime >= FILM_DURATION_SEC) {
        setCurrentTime(0);
      }
      setIsPlaying(true);
    }
  };

  const handleToggleMute = () => {
    setIsMuted((prev) => {
      const nextMuted = !prev;
      conceptScore.setEnabled(!nextMuted);
      conceptScore.updateForScene(scene.kind);
      return nextMuted;
    });
  };

  const handleJumpToScene = (target: FilmScene) => {
    setCurrentTime(target.startSec);
    setActiveTab('film');
  };

  const handleOpenInStudio = (target: FilmScene) => {
    setStudioSeedScene(target);
    setActiveTab('media');
  };

  const handleSelectTab = (tab: WorkspaceTab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  return (
    <div id="top" className="min-h-screen bg-[#07090E] text-slate-100">
      <TopBar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onToggleDemo={() => {
          if (demoStageIndex !== null) {
            handleExitDemo();
          } else {
            handleStartDemo();
          }
        }}
        demoActive={demoStageIndex !== null}
      />

      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
        {demoStageIndex !== null && (
          <DemoWalkthrough
            activeStageIndex={demoStageIndex}
            autoPlay={demoAutoPlay}
            onPrev={() => applyDemoStage(demoStageIndex - 1)}
            onNext={() => applyDemoStage(demoStageIndex + 1)}
            onSelectStage={(idx) => applyDemoStage(idx)}
            onToggleAutoPlay={() => setDemoAutoPlay((v) => !v)}
            onExit={handleExitDemo}
          />
        )}

        {activeTab === 'film' && (
          <div className="space-y-10">
            <div className="flex flex-col justify-between gap-4 border-b border-slate-800/80 pb-5 md:flex-row md:items-end">
              <div>
                <p className="font-mono text-xs tracking-wider text-cyan-400">
                  ROCKET ACADEMY · FIRST CONTACT
                </p>
                <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-slate-50 sm:text-3xl">
                  Every mission becomes the next lesson.
                </h1>
              </div>
              <p className="font-mono text-xs text-slate-400 tabular-nums">
                60s Concept Cut · 16:9 · 24 fps · 1,440 frames
              </p>
            </div>

            <ConceptFilmPlayer
              currentTime={currentTime}
              isPlaying={isPlaying}
              isMuted={isMuted}
              onTogglePlay={handleTogglePlay}
              onSeek={(sec) => setCurrentTime(sec)}
              onRestart={() => {
                setCurrentTime(0);
                setIsPlaying(true);
              }}
              onToggleMute={handleToggleMute}
            />

            <StoryboardRail
              activeSceneId={scene.id}
              onJumpToScene={handleJumpToScene}
              onOpenInStudio={handleOpenInStudio}
            />
          </div>
        )}

        {activeTab === 'game' && (
          <MissionGame
            demoDirective={demoDirective}
            onStartDemo={handleStartDemo}
            demoActive={demoStageIndex !== null}
          />
        )}
        {activeTab === 'media' && <MediaStudio initialScene={studioSeedScene} />}
        {activeTab === 'grounding' && <AtlasAndGrounding />}
        {activeTab === 'director' && <DirectorAndAudio />}
      </main>

      <footer className="mt-16 border-t border-slate-800/80 bg-[#05070B]">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-4 py-5 text-xs text-slate-500 sm:px-6">
          <span>Rocket Academy: First Contact · Plan the mission. Explore the world. Learn from the result.</span>
          <span>Synthetic, deterministic rover motion · Not a physically validated mission simulator</span>
        </div>
      </footer>
    </div>
  );
}
