import React, { useRef, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';
import { GENERATED_ASSETS } from '../data/storyboard';

interface PitchBeat {
  id: string;
  timecode: string;
  seekSec: number;
  endSec: number;
  label: string;
  cue: string;
}

const PITCH_BEATS: PitchBeat[] = [
  {
    id: 'beat-intro',
    timecode: '0:00',
    seekSec: 0,
    endSec: 1.85,
    label: 'Introduce Yourself',
    cue: 'Hi, I am Alejandro Castellanos from Team Rocket Academy.',
  },
  {
    id: 'beat-challenge',
    timecode: '0:02',
    seekSec: 1.9,
    endSec: 4.7,
    label: 'Challenge & Inspiration',
    cue: 'Real planetary rovers stall on unseen sand and steep craters—we wanted teams to test autonomy policies safely before launch.',
  },
  {
    id: 'beat-title',
    timecode: '0:05',
    seekSec: 4.75,
    endSec: 9.55,
    label: 'Project Title & Tagline',
    cue: 'Rocket Academy: First Contact — Plan the mission. Explore the world. Learn from every run.',
  },
  {
    id: 'beat-idea',
    timecode: '0:10',
    seekSec: 9.6,
    endSec: 19.25,
    label: 'How It Works & NASA Partner Data',
    cue: 'Using NASA and Space Agency Partner free open terrain for Earth, the Moon, and Mars, learners turn plain-English goals into 0.1s rover runs and diagnose wheel slip in Atlas.',
  },
  {
    id: 'beat-future',
    timecode: '0:20',
    seekSec: 19.3,
    endSec: 30,
    label: 'Look Into the Future with Genie 4',
    cue: 'With Genie 4 world generation, teams everywhere will spin up living planetary sandboxes—turning every failed run into the next breakthrough.',
  },
];

function formatClock(sec: number): string {
  const clamped = Math.max(0, Math.floor(sec));
  const mins = Math.floor(clamped / 60);
  const rem = clamped % 60;
  return `${mins}:${String(rem).padStart(2, '0')}`;
}

export const OverviewPitchVideo: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(29.1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const activeBeat =
    PITCH_BEATS.find(
      (b) => currentTime >= b.seekSec && currentTime < b.endSec
    ) ?? PITCH_BEATS[0];

  const handleTogglePlay = async () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      try {
        await el.play();
      } catch {
        setIsPlaying(false);
      }
    } else {
      el.pause();
    }
  };

  const handleRestart = async () => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = 0;
    setCurrentTime(0);
    try {
      await el.play();
    } catch {
      setIsPlaying(false);
    }
  };

  const handleJumpBeat = async (beat: PitchBeat) => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = beat.seekSec;
    setCurrentTime(beat.seekSec);
    try {
      await el.play();
    } catch {
      setIsPlaying(false);
    }
  };

  const handleCopyScript = async () => {
    const fullText = PITCH_BEATS.map(
      (b) => `[${b.timecode}] ${b.label}: ${b.cue}`
    ).join('\n');
    try {
      await navigator.clipboard.writeText(fullText);
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    } catch {
      setCopiedScript(false);
    }
  };

  return (
    <section
      aria-labelledby="pitch-video-heading"
      className="border-b border-slate-800/80 pb-10"
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-cyan-400">
            30-Second Video Pitch · Alejandro Castellanos · Team Rocket Academy
          </p>
          <h2
            id="pitch-video-heading"
            className="mt-1 font-display text-2xl font-semibold tracking-tight text-slate-50 [text-wrap:balance]"
          >
            Watch the First Contact Project Pitch
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleTogglePlay}
            className="inline-flex items-center gap-1.5 rounded-md bg-cyan-500 px-3.5 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-cyan-400 whitespace-nowrap shrink-0"
          >
            {isPlaying ? (
              <>
                <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Pause Pitch</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Play 30s Pitch</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleRestart}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-[#0B0F17] px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-slate-500 hover:text-white whitespace-nowrap shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Restart</span>
          </button>
          <a
            href="/first-contact-pitch-30s.mp4"
            download="rocket-academy-first-contact-30s-pitch.mp4"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-[#0B0F17] px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-cyan-400 hover:text-cyan-300 whitespace-nowrap shrink-0"
          >
            <Download className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
            <span>Download MP4</span>
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-stretch">
        {/* Left: 16:9 HTML5 MP4 Video Stage */}
        <div className="flex flex-col justify-between overflow-hidden rounded-lg border border-slate-800 bg-[#05070B] lg:col-span-7">
          {videoError ? (
            <div className="flex aspect-video w-full flex-col items-center justify-center bg-[#07090E] p-6 text-center">
              <p className="font-mono text-xs text-amber-300">
                Video asset unavailable
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Use the Download MP4 button or review the timed pitch beats on the right.
              </p>
            </div>
          ) : (
            <div className="relative aspect-video w-full bg-black">
              <video
                ref={videoRef}
                src="/first-contact-pitch-30s.mp4"
                poster={GENERATED_ASSETS.earth}
                controls
                playsInline
                preload="auto"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
                onError={() => setVideoError(true)}
                onLoadedMetadata={(e) => {
                  const d = e.currentTarget.duration;
                  if (Number.isFinite(d) && d > 0) setDuration(d);
                }}
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                className="h-full w-full object-contain"
              />
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 bg-[#0B0F17] px-4 py-2.5 text-xs">
            <span className="font-mono text-slate-300 tabular-nums">
              {formatClock(currentTime)} / {formatClock(duration)} ·{' '}
              <span className="text-cyan-400">{activeBeat.label}</span>
            </span>
            <span className="font-mono text-[11px] text-slate-400">
              1280 × 720 · 24 fps · H.264 + Ambient Score
            </span>
          </div>
        </div>

        {/* Right: Synced Timed Pitch Beats (0:00 -> 0:30) */}
        <div className="flex flex-col justify-between rounded-lg border border-slate-800 bg-[#0B0F17] p-4 lg:col-span-5">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-display text-sm font-semibold text-slate-100">
                Timed Pitch Chapters & Script
              </h3>
              <p className="text-xs text-slate-400">
                Click any beat to jump directly in the video
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopyScript}
              className="inline-flex items-center gap-1.5 rounded border border-slate-700 bg-[#07090E] px-2.5 py-1.5 text-[11px] font-medium text-slate-300 transition-colors hover:border-slate-500 hover:text-white whitespace-nowrap shrink-0"
            >
              {copiedScript ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" aria-hidden="true" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" aria-hidden="true" />
                  <span>Copy Script</span>
                </>
              )}
            </button>
          </div>

          <div className="my-2 divide-y divide-slate-800/80">
            {PITCH_BEATS.map((beat) => {
              const isActive = beat.id === activeBeat.id;
              return (
                <button
                  key={beat.id}
                  type="button"
                  onClick={() => handleJumpBeat(beat)}
                  className={`block w-full px-2.5 py-2.5 text-left transition-colors rounded ${
                    isActive
                      ? 'bg-cyan-500/10 text-slate-100'
                      : 'text-slate-300 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-xs font-semibold ${
                        isActive ? 'text-cyan-300' : 'text-slate-200'
                      }`}
                    >
                      {beat.label}
                    </span>
                    <span className="font-mono text-[11px] text-cyan-400 tabular-nums shrink-0">
                      {beat.id === 'beat-future' ? '0:20–0:30' : beat.timecode}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    {beat.cue}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
