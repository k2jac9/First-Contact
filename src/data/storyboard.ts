export type SceneKind =
  | 'earth'
  | 'moon'
  | 'mars-failure'
  | 'atlas'
  | 'generative'
  | 'training'
  | 'mars-retry'
  | 'title';

export interface FilmScene {
  id: string;
  index: number;
  kind: SceneKind;
  title: string;
  locationLabel: string;
  startSec: number;
  endSec: number;
  startFrame: number;
  endFrame: number;
  overlayText: string;
  overlaySecondary?: string;
  overlayDirection: string;
  narration: string;
  visualDirection: string;
  cameraMove: string;
  audioCue: string;
  imagePath?: string;
  generationPrompt: string;
}

export interface TelemetryPoint {
  t: number; // seconds within interval
  wheelAngularVelocity: number; // rad/s
  forwardProgress: number; // m/s
  slipRatio: number; // 0..1
}

export interface AtlasEpisode {
  id: string;
  episodeCode: string;
  world: 'Mars' | 'Moon' | 'Earth';
  site: string;
  summary: string;
  tags: string[];
  durationSec: number;
  reviewApproved: boolean;
  sourceRecorded: string;
  purpose: string;
  statusLabel: string;
  thumbnailPath: string;
  telemetry: TelemetryPoint[];
}

export interface ScenarioVariant {
  id: string;
  label: string;
  axis: 'Base' | 'Lighting' | 'Obstacle' | 'Route';
  sunElevationDeg: number;
  obstacleNote: string;
  routeNote: string;
  meshOverlayOpacity: number;
}

export interface ContinuitySpec {
  id: 'scout' | 'carrier' | 'mars-site';
  name: string;
  role: string;
  wheelCount: number | null;
  specs: string[];
}

export const FILM_FPS = 24;
export const FILM_DURATION_SEC = 60;
export const FILM_TOTAL_FRAMES = FILM_FPS * FILM_DURATION_SEC; // 1,440 frames

export const GENERATED_ASSETS = {
  earth: '/src/assets/images/earth_desert_valley_1794689352726.jpg',
  moon: '/src/assets/images/lunar_ridge_rovers_1794689353680.jpg',
  marsBoulder: '/src/assets/images/mars_split_boulder_rut_1794689354383.jpg',
  marsVariants: '/src/assets/images/mars_scenario_variants_1794689355492.jpg',
  continuitySheet: '/src/assets/images/rover_continuity_sheet_1794689355273.jpg',
} as const;

export const FILM_SCENES: FilmScene[] = [
  {
    id: 'scene-1-earth',
    index: 1,
    kind: 'earth',
    title: 'EARTH: A WORLD TO LEARN IN',
    locationLabel: 'Earth Desert Test Valley',
    startSec: 0,
    endSec: 8,
    startFrame: 0,
    endFrame: 192,
    overlayText: 'NASA-derived terrain • simulated environment',
    overlayDirection: 'Reserve clean corner alongside mesh-to-terrain transition.',
    narration: 'Before robots explore new worlds, they need a place to learn.',
    visualDirection:
      'Begin at wheel height with Scout rolling over rocky ground. Carrier follows several meters behind. Topographic mesh aligns with landscape before resolving into textured simulation.',
    cameraMove: 'Track alongside at wheel height, then crane gently upward to reveal valley.',
    audioCue: 'Low atmospheric tones with subtle chassis-mounted ground-contact vibration.',
    imagePath: GENERATED_ASSETS.earth,
    generationPrompt:
      'Photorealistic 16:9 shot at wheel height in an Earth desert test valley. Compact four-wheel ceramic-white Scout rover with graphite chassis, narrow amber markings, and short sensor mast leads a larger six-wheel Carrier rover with articulated suspension and white cargo enclosure. Topographic cyan elevation mesh aligns cleanly across the ridge before resolving into natural terrain.',
  },
  {
    id: 'scene-2-moon',
    index: 2,
    kind: 'moon',
    title: 'MOON: TWO ROBOTS, ONE MISSION',
    locationLabel: 'Lunar Surface Ridge',
    startSec: 8,
    endSec: 16,
    startFrame: 192,
    endFrame: 384,
    overlayText: 'LUNAR SURFACE • COOPERATIVE MISSION',
    overlayDirection: 'Keep small and unobtrusive against pitch-black sky.',
    narration: 'From Earth to the Moon and Mars, real terrain becomes a training ground.',
    visualDirection:
      'Match-cut Earth ridge to lunar ridge. Scout stops near shallow depression, surveys safer route, sends subtle cyan route cue to Carrier. Crisp hard light, black sky, ballistic dust grains.',
    cameraMove: 'Slow lateral tracking shot matching Earth horizon composition.',
    audioCue: 'Restrained harmonic pulse and subtle telemetry cue; zero airborne wind or engine sound.',
    imagePath: GENERATED_ASSETS.moon,
    generationPrompt:
      'Match-cut lunar ridge under crisp hard sunlight and pure pitch-black airless sky without atmospheric haze. Four-wheel ceramic-white Scout rover pauses beside a shallow crater depression and projects a subtle cyan route arc. Six-wheel articulated Carrier rover turns onto the safer path, kicking tiny dust grains in clean ballistic arcs.',
  },
  {
    id: 'scene-3-mars-failure',
    index: 3,
    kind: 'mars-failure',
    title: 'MARS: THE FAILURE',
    locationLabel: 'Mars Basalt Boulder & Rut',
    startSec: 16,
    endSec: 24,
    startFrame: 384,
    endFrame: 576,
    overlayText: 'MARS • EPISODE 0142 • REVIEW REQUIRED',
    overlayDirection: 'Hold final composition long enough to register boulder, rut, and rover position.',
    narration: 'Autonomous teams navigate, cooperate, and discover where their policies fall short.',
    visualDirection:
      'Split basalt boulder beside shallow sandy rut. Carrier wheel rotates faster than forward progress, loses momentum, and stops safely. Scout waits ahead on firmer ground.',
    cameraMove: 'Low tracking angle beside Carrier wheel, holding on safe stop.',
    audioCue: 'Moment of tonal tension as wheel slip spikes and Carrier halts safely.',
    imagePath: GENERATED_ASSETS.marsBoulder,
    generationPrompt:
      'Muted ochre Mars terrain with restrained haze. Low tracking camera beside a six-wheel Carrier rover with white cargo enclosure and amber stripes stopped in a shallow sandy rut next to a distinct split dark basalt boulder. Four-wheel Scout waits ahead on firmer rock. Exact camera position locked for retry.',
  },
  {
    id: 'scene-4-atlas',
    index: 4,
    kind: 'atlas',
    title: 'ATLAS: FIND THE USEFUL EXPERIENCE',
    locationLabel: 'MongoDB Atlas Episode Review',
    startSec: 24,
    endSec: 32,
    startFrame: 576,
    endFrame: 768,
    overlayText: 'MongoDB Atlas | Find Mars rover recoveries after wheel slip',
    overlaySecondary: 'Source recorded • Review approved • Purpose: control training',
    overlayDirection: 'Pin stalled run 0142 beside one approved recovery example with synchronized traces.',
    narration: 'MongoDB Atlas makes each mission searchable, traceable, and ready for review.',
    visualDirection:
      'Transition stopped rover frame into dark episode-review interface. Semantic query retrieves recovery intervals; show synchronized imagery, wheel-speed vs. forward-progress traces, and provenance.',
    cameraMove: 'Slow deliberate push into dark review console.',
    audioCue: 'Clean precision interface cue over restrained low synth bed.',
    imagePath: GENERATED_ASSETS.marsBoulder,
    generationPrompt:
      'Restrained dark aerospace episode review workstation showing Mars rover recovery thumbnail, wheel-speed and forward-progress telemetry graphs, and provenance metadata without decorative hologram clutter.',
  },
  {
    id: 'scene-5-generative',
    index: 5,
    kind: 'generative',
    title: 'GENERATIVE AI: CREATE THE NEXT CHALLENGES',
    locationLabel: 'Elevated Mars Scenario Variants',
    startSec: 32,
    endSec: 40,
    startFrame: 768,
    endFrame: 960,
    overlayText: 'SCENARIO VARIANTS • LIGHTING / OBSTACLE / ROUTE',
    overlaySecondary: 'Generative-world research: Google Genie • Simulation-conditioned visuals • Physics simulation',
    overlayDirection: 'Three deliberate match cuts on fixed elevated camera; keep generated obstacles visually distinguishable.',
    narration: 'Generative AI creates new challenges. Physics shapes the consequences.',
    visualDirection:
      'Fixed elevated camera over Mars boulder terrain. Three match cuts showing controlled sun angle shift, one generated obstacle, and planned bypass route over shared terrain mesh.',
    cameraMove: 'Locked elevated tripod view across three crisp match cuts.',
    audioCue: 'Measured rhythmic synth arpeggio distinguishing each variant cut.',
    imagePath: GENERATED_ASSETS.marsVariants,
    generationPrompt:
      'Fixed elevated camera over the split basalt boulder Mars site. Shared cyan terrain wireframe mesh reveals under controlled sun-angle shift, one distinguishable generated rock obstacle, and a curved bypass trajectory with Scout and Carrier on separate paths.',
  },
  {
    id: 'scene-6-training',
    index: 6,
    kind: 'training',
    title: 'TRAINING: TURN EXPERIENCE INTO A POLICY',
    locationLabel: 'Dataset & Policy Pipeline',
    startSec: 40,
    endSec: 48,
    startFrame: 960,
    endFrame: 1152,
    overlayText: 'DATASET v02 → TRAINING → EVALUATION → POLICY v02',
    overlayDirection: 'Communicate elapsed processing with a time-lapse transition, not an instant click.',
    narration: 'Select the evidence. Build the dataset. Train and evaluate the next policy.',
    visualDirection:
      'Clean training workspace. Reviewed intervals assemble into versioned Dataset v02, time-lapse transition communicates training, then separate evaluation stage before Policy v02 checkpoint.',
    cameraMove: 'Match-cut into composed horizontal pipeline progression.',
    audioCue: 'Steady evolving harmonic pulse signaling elapsed training and evaluation.',
    imagePath: GENERATED_ASSETS.continuitySheet,
    generationPrompt:
      'Clean aerospace engineering workspace visualizing selected rover episodes assembling into Dataset v02, elapsed training pass, independent evaluation stage, and Policy v02 checkpoint.',
  },
  {
    id: 'scene-7-mars-retry',
    index: 7,
    kind: 'mars-retry',
    title: 'MARS: A BETTER STRATEGY',
    locationLabel: 'Mars Basalt Boulder • Retry',
    startSec: 48,
    endSec: 56,
    startFrame: 1152,
    endFrame: 1344,
    overlayText: 'NEW ROLLOUT • POLICY v02',
    overlayDirection: 'Same split boulder, rut, and camera start as Scene 3; visible wider route onto firm ground.',
    narration: 'Every mission teaches the next. Every new world opens another possibility.',
    visualDirection:
      'Return to exact split boulder, rut, and start angle. Scout identifies firmer ground; Carrier takes wider route, reduces speed, maintains controlled wheel motion, and clears the obstacle.',
    cameraMove: 'Hold low start angle matching Scene 3, then crane upward into wide Martian valley.',
    audioCue: 'Warm orchestral-synth resolution opening as the rover team clears the boulder.',
    imagePath: GENERATED_ASSETS.marsBoulder,
    generationPrompt:
      'Exact same Martian split basalt boulder and shallow sandy rut camera angle as the failure scene, now showing the six-wheel Carrier taking a wider firmer bypass track at reduced speed while four-wheel Scout leads ahead into the wide Martian valley.',
  },
  {
    id: 'scene-8-title',
    index: 8,
    kind: 'title',
    title: 'TITLE CARD',
    locationLabel: 'End Card',
    startSec: 56,
    endSec: 60,
    startFrame: 1344,
    endFrame: 1440,
    overlayText: 'ROCKET ACADEMY / FIRST CONTACT',
    overlaySecondary: 'Create worlds. Train robots. Learn from every mission.',
    overlayDirection: 'Hold clean near-black end card legibly for all 4 seconds (96 frames).',
    narration: 'Rocket Academy. First Contact.',
    visualDirection:
      'Clean, nearly black end card held for 4 seconds with crisp typography and small Concept visualization footer.',
    cameraMove: 'Static hold (96 frames).',
    audioCue: 'Sustained warm chord decay into quiet silence.',
    generationPrompt:
      'Clean near-black #05070B end card with centered white ROCKET ACADEMY / FIRST CONTACT typography and tagline.',
  },
];

export const CONTINUITY_SPECS: ContinuitySpec[] = [
  {
    id: 'scout',
    name: 'Scout Rover',
    role: 'Pathfinder & Route Lead',
    wheelCount: 4,
    specs: [
      '4 wheels (compact footprint)',
      'Ceramic-white sculpted body, exposed graphite chassis',
      'Narrow amber markings & short vertical sensor mast',
      'Independent autonomy controller; emits subtle cyan route cue',
    ],
  },
  {
    id: 'carrier',
    name: 'Carrier Rover',
    role: 'Heavy Payload Transport',
    wheelCount: 6,
    specs: [
      '6 wheels with articulated rocker-bogie suspension',
      'Graphite chassis with white modular cargo enclosure',
      'Matching narrow amber stripes',
      'Responds to Scout handoff; regulates torque & speed over loose regolith',
    ],
  },
  {
    id: 'mars-site',
    name: 'Mars Anchor Site',
    role: 'Failure & Retry Reference',
    wheelCount: null,
    specs: [
      'Split dark basalt boulder next to shallow sandy rut',
      'Firm rocky shoulder to the right of the rut',
      'Locked low-angle camera start between Scene 3 (00:16) and Scene 7 (00:48)',
      'Visible behavioral delta: narrow rut stall vs. wider firm-ground bypass',
    ],
  },
];

export const ATLAS_EPISODES: AtlasEpisode[] = [
  {
    id: 'ep-0142',
    episodeCode: 'EPISODE 0142',
    world: 'Mars',
    site: 'Basalt Split Ridge · Sector 4B',
    summary: 'Carrier encountered high slip in loose sand beside split basalt boulder and halted safely.',
    tags: ['wheel slip', 'mars', 'carrier', 'sandy rut', 'stall', 'review required'],
    durationSec: 8.0,
    reviewApproved: false,
    sourceRecorded: 'Telemetry + MastCam Sync · 24 Hz',
    purpose: 'Needs review & recovery pairing',
    statusLabel: 'Pinned Failure · Review Required',
    thumbnailPath: GENERATED_ASSETS.marsBoulder,
    telemetry: [
      { t: 0, wheelAngularVelocity: 1.8, forwardProgress: 0.42, slipRatio: 0.08 },
      { t: 1.5, wheelAngularVelocity: 1.9, forwardProgress: 0.40, slipRatio: 0.14 },
      { t: 3.0, wheelAngularVelocity: 2.6, forwardProgress: 0.24, slipRatio: 0.48 },
      { t: 4.5, wheelAngularVelocity: 3.4, forwardProgress: 0.09, slipRatio: 0.78 },
      { t: 6.0, wheelAngularVelocity: 1.2, forwardProgress: 0.03, slipRatio: 0.84 },
      { t: 8.0, wheelAngularVelocity: 0.0, forwardProgress: 0.0, slipRatio: 0.0 },
    ],
  },
  {
    id: 'ep-0118',
    episodeCode: 'EPISODE 0118',
    world: 'Mars',
    site: 'Jezero Margin · Aeolian Drift',
    summary: 'Scout flagged compacted bedrock shoulder; Carrier throttled wheel speed to 0.9 rad/s and cleared sandy trough.',
    tags: ['wheel slip', 'recovery', 'mars', 'firmer ground', 'wider route', 'control training'],
    durationSec: 8.0,
    reviewApproved: true,
    sourceRecorded: 'Source recorded',
    purpose: 'Purpose: control training',
    statusLabel: 'Review approved',
    thumbnailPath: GENERATED_ASSETS.marsVariants,
    telemetry: [
      { t: 0, wheelAngularVelocity: 1.7, forwardProgress: 0.40, slipRatio: 0.10 },
      { t: 1.5, wheelAngularVelocity: 1.3, forwardProgress: 0.31, slipRatio: 0.21 },
      { t: 3.0, wheelAngularVelocity: 0.95, forwardProgress: 0.24, slipRatio: 0.15 },
      { t: 4.5, wheelAngularVelocity: 1.0, forwardProgress: 0.27, slipRatio: 0.11 },
      { t: 6.0, wheelAngularVelocity: 1.35, forwardProgress: 0.35, slipRatio: 0.08 },
      { t: 8.0, wheelAngularVelocity: 1.65, forwardProgress: 0.41, slipRatio: 0.06 },
    ],
  },
  {
    id: 'ep-0129',
    episodeCode: 'EPISODE 0129',
    world: 'Moon',
    site: 'Shackleton Rim · Regolith Slope',
    summary: 'Ballistic slip detected on 14° slope; Scout issued lateral bypass waypoint with torque-limited traction.',
    tags: ['recovery', 'wheel slip', 'moon', 'route handoff', 'control training'],
    durationSec: 8.0,
    reviewApproved: true,
    sourceRecorded: 'Source recorded',
    purpose: 'Purpose: control training',
    statusLabel: 'Review approved',
    thumbnailPath: GENERATED_ASSETS.moon,
    telemetry: [
      { t: 0, wheelAngularVelocity: 1.5, forwardProgress: 0.35, slipRatio: 0.12 },
      { t: 1.5, wheelAngularVelocity: 2.1, forwardProgress: 0.22, slipRatio: 0.41 },
      { t: 3.0, wheelAngularVelocity: 1.1, forwardProgress: 0.25, slipRatio: 0.18 },
      { t: 4.5, wheelAngularVelocity: 1.2, forwardProgress: 0.29, slipRatio: 0.12 },
      { t: 6.0, wheelAngularVelocity: 1.4, forwardProgress: 0.34, slipRatio: 0.09 },
      { t: 8.0, wheelAngularVelocity: 1.5, forwardProgress: 0.37, slipRatio: 0.07 },
    ],
  },
  {
    id: 'ep-0104',
    episodeCode: 'EPISODE 0104',
    world: 'Earth',
    site: 'Mojave Analog Wash · Gravel Bed',
    summary: 'Baseline cooperative convoy test on loose alluvial gravel; operator intervention triggered mid-run.',
    tags: ['earth', 'wheel slip', 'baseline', 'operator override'],
    durationSec: 8.0,
    reviewApproved: false,
    sourceRecorded: 'Source recorded',
    purpose: 'Excluded · Manual override present',
    statusLabel: 'Not eligible for autonomous training',
    thumbnailPath: GENERATED_ASSETS.earth,
    telemetry: [
      { t: 0, wheelAngularVelocity: 1.9, forwardProgress: 0.44, slipRatio: 0.09 },
      { t: 1.5, wheelAngularVelocity: 2.4, forwardProgress: 0.31, slipRatio: 0.36 },
      { t: 3.0, wheelAngularVelocity: 2.8, forwardProgress: 0.19, slipRatio: 0.56 },
      { t: 4.5, wheelAngularVelocity: 1.1, forwardProgress: 0.21, slipRatio: 0.24 },
      { t: 6.0, wheelAngularVelocity: 1.4, forwardProgress: 0.32, slipRatio: 0.14 },
      { t: 8.0, wheelAngularVelocity: 1.6, forwardProgress: 0.38, slipRatio: 0.10 },
    ],
  },
];

export const SCENARIO_VARIANTS: ScenarioVariant[] = [
  {
    id: 'var-base',
    label: '01. Shared NASA-Derived Base Mesh',
    axis: 'Base',
    sunElevationDeg: 28,
    obstacleNote: 'Original split basalt boulder and shallow sandy rut locked from Episode 0142.',
    routeNote: 'Failed direct rut trajectory shown in muted amber.',
    meshOverlayOpacity: 0.55,
  },
  {
    id: 'var-lighting',
    label: '02. Variant A · Low Sun Angle',
    axis: 'Lighting',
    sunElevationDeg: 11,
    obstacleNote: 'Identical rock geometry under oblique afternoon shadows to test vision perception.',
    routeNote: 'High-contrast crater and rut rim shadows challenge stereo depth.',
    meshOverlayOpacity: 0.25,
  },
  {
    id: 'var-obstacle',
    label: '03. Variant B · Generated Basalt Fragment',
    axis: 'Obstacle',
    sunElevationDeg: 24,
    obstacleNote: 'One generated obstacle placed at rut shoulder, visually distinct from base terrain.',
    routeNote: 'Carrier clearance envelope recalculated around added boulder.',
    meshOverlayOpacity: 0.35,
  },
  {
    id: 'var-route',
    label: '04. Variant C · Planned Firm-Ground Bypass',
    axis: 'Route',
    sunElevationDeg: 32,
    obstacleNote: 'Physics-checked traction map over exposed bedrock corridor.',
    routeNote: 'Scout projects wider cyan bypass arc for Carrier Policy v02 rollout.',
    meshOverlayOpacity: 0.15,
  },
];

export const PRODUCTION_WORKFLOW_STEPS: string[] = [
  'Lock Scout (4-wheel) and Carrier (6-wheel) reference designs plus the Mars split-boulder location before motion generation.',
  'Supply global visual direction, robot continuity rules, and only the single target scene description per footage request.',
  'Generate Mars failure (00:16) and retry (00:48) from matching camera references so only the route and wheel motion change.',
  'Composite exact titles, Atlas query UI, and wheel-slip graphs in editing rather than trusting visual generation for text.',
  'Record warm, measured narration leaving deliberate breathing room around the failure stall and final title card.',
  'Assemble seven 8-second scenes and one 4-second title card into 1,440 frames at 24 fps (16:9, target 4K).',
  'Distinguish reviewed experience, elapsed training/evaluation, and new rollout without fabricated benchmark claims.',
  'Review final cut for wheel-count continuity, legible text, physical ground contact, runtime accuracy, and learning loop clarity.',
];
