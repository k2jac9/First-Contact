export type WorldFilter = 'All' | 'Earth' | 'Moon' | 'Mars';

export interface MissionCyclePoint {
  cycleId: string;
  cycleLabel: string;
  policyVersion: string;
  datasetVersion: string;
  world: Exclude<WorldFilter, 'All'>;
  successRatePct: number;
  recoveryRatePct: number;
  reviewedEpisodes: number;
  lessonTitle: string;
  lessonSummary: string;
  atlasAnchorCode?: string;
}

export const MISSION_LEARNING_SERIES: MissionCyclePoint[] = [
  {
    cycleId: 'c1',
    cycleLabel: 'M01 · Earth Baseline',
    policyVersion: 'Policy v01',
    datasetVersion: 'Dataset v01',
    world: 'Earth',
    successRatePct: 54,
    recoveryRatePct: 42,
    reviewedEpisodes: 18,
    lessonTitle: 'Baseline convoy traversal on Mojave alluvial gravel',
    lessonSummary:
      'Initial Policy v01 completed open desert segments but triggered manual intervention on loose gravel washes.',
    atlasAnchorCode: 'EPISODE 0104',
  },
  {
    cycleId: 'c2',
    cycleLabel: 'M02 · Lunar Handoff',
    policyVersion: 'Policy v01.2',
    datasetVersion: 'Dataset v01.2',
    world: 'Moon',
    successRatePct: 61,
    recoveryRatePct: 53,
    reviewedEpisodes: 31,
    lessonTitle: 'Scout route cue prevents crater-rim entrapment',
    lessonSummary:
      'Hard lunar shadows obscured shallow depressions; Scout cyan waypoint handoff cut Carrier sinkage events.',
    atlasAnchorCode: 'EPISODE 0129',
  },
  {
    cycleId: 'c3',
    cycleLabel: 'M03 · Mars Rut Stall',
    policyVersion: 'Policy v01.4',
    datasetVersion: 'Dataset v01.4',
    world: 'Mars',
    successRatePct: 48,
    recoveryRatePct: 39,
    reviewedEpisodes: 44,
    lessonTitle: 'Episode 0142 wheel-slip stall beside split basalt boulder',
    lessonSummary:
      'Carrier angular velocity spiked to 3.4 rad/s while forward progress fell to 0.03 m/s. Safe halt preserved hardware and flagged interval for Atlas review.',
    atlasAnchorCode: 'EPISODE 0142',
  },
  {
    cycleId: 'c4',
    cycleLabel: 'M04 · Atlas Curation',
    policyVersion: 'Policy v01.5',
    datasetVersion: 'Dataset v02',
    world: 'Mars',
    successRatePct: 67,
    recoveryRatePct: 64,
    reviewedEpisodes: 62,
    lessonTitle: 'Semantic Atlas query pairs Episode 0142 with approved recovery',
    lessonSummary:
      'Retrieving Episode 0118 (compact bedrock shoulder + 0.95 rad/s torque cap) assembled curated training intervals into Dataset v02.',
    atlasAnchorCode: 'EPISODE 0118',
  },
  {
    cycleId: 'c5',
    cycleLabel: 'M05 · Policy v02 Retry',
    policyVersion: 'Policy v02',
    datasetVersion: 'Dataset v02',
    world: 'Mars',
    successRatePct: 79,
    recoveryRatePct: 76,
    reviewedEpisodes: 78,
    lessonTitle: 'Wider firm-ground bypass clears split basalt boulder',
    lessonSummary:
      'Returning to the exact Episode 0142 camera anchor, Scout routed around the sandy rut and Carrier reduced speed to clear the boulder.',
  },
  {
    cycleId: 'c6',
    cycleLabel: 'M06 · Genie Variants',
    policyVersion: 'Policy v02.4',
    datasetVersion: 'Dataset v03',
    world: 'Mars',
    successRatePct: 84,
    recoveryRatePct: 81,
    reviewedEpisodes: 104,
    lessonTitle: 'Oblique sun angles and generated boulder obstacles stress-test vision',
    lessonSummary:
      'Controlled lighting, added obstacle, and route variations prevented overfitting to a single sun elevation.',
  },
  {
    cycleId: 'c7',
    cycleLabel: 'M07 · Lunar Slope',
    policyVersion: 'Policy v03',
    datasetVersion: 'Dataset v03.2',
    world: 'Moon',
    successRatePct: 89,
    recoveryRatePct: 86,
    reviewedEpisodes: 126,
    lessonTitle: 'Cross-world slip transfer stabilizes 14° regolith climbs',
    lessonSummary:
      'Traction control heuristics learned on Martian drift transferred cleanly to airless lunar regolith slopes.',
  },
  {
    cycleId: 'c8',
    cycleLabel: 'M08 · Multi-World v04',
    policyVersion: 'Policy v04',
    datasetVersion: 'Dataset v04',
    world: 'Earth',
    successRatePct: 93,
    recoveryRatePct: 91,
    reviewedEpisodes: 152,
    lessonTitle: 'Closed-loop Earth, Moon, and Mars cooperative policy',
    lessonSummary:
      'Every logged slip interval feeds the next dataset release, turning field anomalies into verified team behaviors.',
  },
];

export interface LearningSummary {
  latestSuccessPct: number;
  latestRecoveryPct: number;
  successDeltaPts: number;
  totalReviewedEpisodes: number;
  latestPolicy: string;
}

export function getMissionSeriesByWorld(world: WorldFilter): MissionCyclePoint[] {
  if (world === 'All') return MISSION_LEARNING_SERIES;
  return MISSION_LEARNING_SERIES.filter((pt) => pt.world === world);
}

export function summarizeLearningProgress(points: MissionCyclePoint[]): LearningSummary {
  if (points.length === 0) {
    return {
      latestSuccessPct: 0,
      latestRecoveryPct: 0,
      successDeltaPts: 0,
      totalReviewedEpisodes: 0,
      latestPolicy: '—',
    };
  }
  const first = points[0];
  const last = points[points.length - 1];
  return {
    latestSuccessPct: last.successRatePct,
    latestRecoveryPct: last.recoveryRatePct,
    successDeltaPts: last.successRatePct - first.successRatePct,
    totalReviewedEpisodes: last.reviewedEpisodes,
    latestPolicy: last.policyVersion,
  };
}
