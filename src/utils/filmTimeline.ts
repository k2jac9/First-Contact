import {
  AtlasEpisode,
  FILM_DURATION_SEC,
  FILM_FPS,
  FILM_SCENES,
  FilmScene,
} from '../data/storyboard';

export const ALLOWED_ASPECT_RATIOS = [
  '1:1',
  '2:3',
  '3:2',
  '3:4',
  '4:3',
  '9:16',
  '16:9',
  '21:9',
] as const;

export type AllowedAspectRatio = (typeof ALLOWED_ASPECT_RATIOS)[number];

export const ALLOWED_IMAGE_SIZES = ['1K', '2K', '4K'] as const;
export type AllowedImageSize = (typeof ALLOWED_IMAGE_SIZES)[number];

export const ALLOWED_VIDEO_ASPECT_RATIOS = ['16:9', '9:16'] as const;
export type AllowedVideoAspectRatio = (typeof ALLOWED_VIDEO_ASPECT_RATIOS)[number];

export function clampTime(seconds: number): number {
  if (!Number.isFinite(seconds)) return 0;
  return Math.max(0, Math.min(FILM_DURATION_SEC, seconds));
}

export function timeToFrame(seconds: number, fps: number = FILM_FPS): number {
  const clamped = clampTime(seconds);
  return Math.min(FILM_DURATION_SEC * fps, Math.round(clamped * fps));
}

export function formatTimecode(seconds: number): string {
  const clamped = Math.floor(clampTime(seconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatSmpte(seconds: number, fps: number = FILM_FPS): string {
  const clamped = clampTime(seconds);
  const wholeSec = Math.floor(clamped);
  const mins = Math.floor(wholeSec / 60);
  const secs = wholeSec % 60;
  const frame = Math.min(fps - 1, Math.floor((clamped - wholeSec) * fps));
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(frame).padStart(2, '0')}`;
}

export function getSceneAtTime(seconds: number): {
  scene: FilmScene;
  progress: number;
} {
  const t = clampTime(seconds);
  for (let i = 0; i < FILM_SCENES.length; i++) {
    const s = FILM_SCENES[i];
    const isLast = i === FILM_SCENES.length - 1;
    if (t >= s.startSec && (isLast ? t <= s.endSec : t < s.endSec)) {
      const span = Math.max(0.001, s.endSec - s.startSec);
      const progress = Math.max(0, Math.min(1, (t - s.startSec) / span));
      return { scene: s, progress };
    }
  }
  return { scene: FILM_SCENES[0], progress: 0 };
}

export interface PacingEvaluation {
  wordCount: number;
  estimatedSec: number;
  windowSec: number;
  pauseHeadroomSec: number;
  status: 'fits' | 'tight' | 'over';
}

export function evaluateNarrationPacing(
  transcript: string,
  windowSec: number = 8,
  wordsPerSec: number = 2.25
): PacingEvaluation {
  const trimmed = transcript.trim();
  const words = trimmed ? trimmed.split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;
  const estimatedSec = Number((wordCount / wordsPerSec).toFixed(1));
  const pauseHeadroomSec = Number((windowSec - estimatedSec).toFixed(1));

  let status: PacingEvaluation['status'] = 'fits';
  if (pauseHeadroomSec < 0) {
    status = 'over';
  } else if (pauseHeadroomSec < 1.2) {
    status = 'tight';
  }

  return {
    wordCount,
    estimatedSec,
    windowSec,
    pauseHeadroomSec,
    status,
  };
}

export function filterAtlasEpisodes(
  episodes: AtlasEpisode[],
  query: string,
  onlyApproved: boolean
): AtlasEpisode[] {
  const normalized = query.trim().toLowerCase();
  const tokens = normalized
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9]/g, ''))
    .filter((t) => t.length > 2);

  const filtered = episodes.filter((ep) => {
    if (onlyApproved && !ep.reviewApproved) return false;
    if (tokens.length === 0) return true;
    const haystack = [
      ep.episodeCode,
      ep.world,
      ep.site,
      ep.summary,
      ep.purpose,
      ...ep.tags,
    ]
      .join(' ')
      .toLowerCase();

    return tokens.some((tok) => haystack.includes(tok));
  });

  if (tokens.length === 0) return filtered;

  return [...filtered].sort((a, b) => {
    const score = (ep: AtlasEpisode) => {
      const haystack = [ep.summary, ep.world, ep.site, ...ep.tags].join(' ').toLowerCase();
      let s = ep.reviewApproved ? 2 : 0;
      for (const tok of tokens) {
        if (haystack.includes(tok)) s += 3;
      }
      return s;
    };
    return score(b) - score(a);
  });
}

export interface AvoidAuditFinding {
  rule: string;
  matchedTerm: string;
}

const AVOID_RULES: Array<{ pattern: RegExp; rule: string }> = [
  { pattern: /\b(8-wheel|eight-wheel|ten-wheel|extra wheels?)\b/i, rule: 'Preserve Scout (4 wheels) and Carrier (6 wheels); no extra wheels.' },
  { pattern: /\b(floating wheels?|hovering)\b/i, rule: 'Require firm wheel-to-regolith ground contact; no floating wheels.' },
  { pattern: /\b(lunar haze|lunar fog|lunar wind|moon wind)\b/i, rule: 'Avoid lunar atmospheric haze or wind-blown dust.' },
  { pattern: /\b(giant planet|huge planet|massive moon in sky)\b/i, rule: 'Avoid giant nearby planets in background skies.' },
  { pattern: /\b(rocket launch|missile|weapon|laser gun|combat)\b/i, rule: 'No combat or rocket launches in this concept film.' },
  { pattern: /\b(hologram|floating code|hud clutter)\b/i, rule: 'Avoid floating code and decorative hologram clutter.' },
  { pattern: /\b(morphing terrain|melting terrain)\b/i, rule: 'Do not morph or melt terrain during physical rollouts.' },
];

export function auditAvoidRules(promptText: string): AvoidAuditFinding[] {
  const findings: AvoidAuditFinding[] = [];
  for (const item of AVOID_RULES) {
    const match = promptText.match(item.pattern);
    if (match) {
      findings.push({
        rule: item.rule,
        matchedTerm: match[0],
      });
    }
  }
  return findings;
}

export function validateImageConfig(
  aspectRatio: string,
  imageSize: string
): { valid: boolean; error?: string } {
  if (!ALLOWED_ASPECT_RATIOS.includes(aspectRatio as AllowedAspectRatio)) {
    return {
      valid: false,
      error: `Unsupported aspect ratio "${aspectRatio}". Allowed: ${ALLOWED_ASPECT_RATIOS.join(', ')}.`,
    };
  }
  if (!ALLOWED_IMAGE_SIZES.includes(imageSize as AllowedImageSize)) {
    return {
      valid: false,
      error: `Unsupported image size "${imageSize}". Allowed: ${ALLOWED_IMAGE_SIZES.join(', ')}.`,
    };
  }
  return { valid: true };
}
