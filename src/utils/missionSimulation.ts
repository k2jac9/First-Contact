import {
  DestinationConfig,
  DestinationId,
  MAP_HEIGHT,
  MAP_WIDTH,
  TerrainHazard,
} from '../data/missions';
import { TelemetryPoint } from '../data/storyboard';

export type CommandAction = 'DRIVE' | 'SCAN' | 'SAMPLE' | 'RELAY';
export type RoverSpeed = 'CAUTIOUS' | 'NOMINAL' | 'FAST';
export type RoverUnit = 'SCOUT' | 'CARRIER' | 'TEAM';

export interface RoverCommand {
  id: string;
  action: CommandAction;
  x: number;
  y: number;
  speed: RoverSpeed;
  unit: RoverUnit;
  note: string;
}

export type MissionOutcome =
  | 'SUCCESS'
  | 'PARTIAL_SUCCESS'
  | 'STALLED_SLIP'
  | 'COLLISION_HALT'
  | 'POWER_DEPLETED'
  | 'INCOMPLETE_ROUTE';

export interface SimEvent {
  id: string;
  t: number;
  kind: 'INFO' | 'SCAN' | 'SAMPLE' | 'RELAY' | 'SLIP' | 'HAZARD' | 'SUCCESS' | 'FAIL';
  title: string;
  detail: string;
  x: number;
  y: number;
}

export interface SimFrame {
  t: number;
  scoutX: number;
  scoutY: number;
  carrierX: number;
  carrierY: number;
  headingRad: number;
  activeCommandIndex: number;
  activeAction: CommandAction | 'COMPLETE' | 'HALTED';
  batteryPct: number;
  wheelVelocity: number;
  forwardProgress: number;
  slipRatio: number; // 0..1
  inHazardId: string | null;
  relayActive: boolean;
  scanPulse: boolean;
  sampledIds: string[];
  scannedIds: string[];
}

export interface MissionRecording {
  id: string;
  createdAtIso: string;
  destinationId: DestinationId;
  destinationName: string;
  planLabel: string;
  commands: RoverCommand[];
  outcome: MissionOutcome;
  outcomeTitle: string;
  outcomeLesson: string;
  nextSuggestion: string;
  durationSec: number;
  distanceMeters: number;
  finalBatteryPct: number;
  peakSlipRatio: number;
  scienceCollected: number;
  scienceAvailable: number;
  score: number;
  frames: SimFrame[];
  events: SimEvent[];
  telemetry: TelemetryPoint[];
}

const SPEED_M_PER_SEC: Record<RoverSpeed, number> = {
  CAUTIOUS: 46, // px/sec (~0.45 m/s scaled)
  NOMINAL: 76,  // px/sec (~0.75 m/s scaled)
  FAST: 112,    // px/sec (~1.10 m/s scaled)
};

const SPEED_DISPLAY_MPS: Record<RoverSpeed, number> = {
  CAUTIOUS: 0.44,
  NOMINAL: 0.72,
  FAST: 1.05,
};

const SPEED_WHEEL_RADS: Record<RoverSpeed, number> = {
  CAUTIOUS: 1.4,
  NOMINAL: 2.3,
  FAST: 3.6,
};

const STEP_DT = 0.1; // 10 Hz deterministic fixed tick
const MAX_SIM_SECONDS = 48;
const BEACON_CAPTURE_RADIUS = 38;
const SAMPLE_CAPTURE_RADIUS = 56;
const SCAN_REVEAL_RADIUS = 145;

export function distanceBetween(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(bx - ax, by - ay);
}

export function clampCoord(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(val)));
}

function getActiveHazard(
  x: number,
  y: number,
  hazards: TerrainHazard[]
): { hazard: TerrainHazard; depthRatio: number } | null {
  for (const h of hazards) {
    const dist = distanceBetween(x, y, h.x, h.y);
    if (dist <= h.radius) {
      const depthRatio = Math.max(0, Math.min(1, 1 - dist / h.radius));
      return { hazard: h, depthRatio };
    }
  }
  return null;
}

export function createPresetCommands(
  destination: DestinationConfig,
  preset: 'direct-risky' | 'safe-bypass'
): RoverCommand[] {
  if (preset === 'direct-risky') {
    const midX = Math.round((destination.start.x + destination.beacon.x) / 2);
    const midY = Math.round((destination.start.y + destination.beacon.y) / 2);
    return [
      {
        id: 'cmd-1',
        action: 'DRIVE',
        x: midX,
        y: midY,
        speed: 'FAST',
        unit: 'TEAM',
        note: 'Direct high-speed push across center',
      },
      {
        id: 'cmd-2',
        action: 'DRIVE',
        x: destination.beacon.x,
        y: destination.beacon.y,
        speed: 'FAST',
        unit: 'TEAM',
        note: 'Continue straight to beacon',
      },
    ];
  }

  // Safe deterministic bypass tailored per destination
  if (destination.id === 'mars') {
    return [
      {
        id: 'cmd-1',
        action: 'RELAY',
        x: destination.start.x,
        y: destination.start.y,
        speed: 'CAUTIOUS',
        unit: 'SCOUT',
        note: 'Scout establishes firm-ground corridor',
      },
      {
        id: 'cmd-2',
        action: 'DRIVE',
        x: 345,
        y: 425,
        speed: 'NOMINAL',
        unit: 'TEAM',
        note: 'Approach Basalt Core Alpha south',
      },
      {
        id: 'cmd-3',
        action: 'SAMPLE',
        x: 345,
        y: 425,
        speed: 'CAUTIOUS',
        unit: 'CARRIER',
        note: 'Sample carbonate bench',
      },
      {
        id: 'cmd-4',
        action: 'DRIVE',
        x: 565,
        y: 120,
        speed: 'CAUTIOUS',
        unit: 'TEAM',
        note: 'Bypass boulder & rut via north ridge',
      },
      {
        id: 'cmd-5',
        action: 'SCAN',
        x: 665,
        y: 160,
        speed: 'CAUTIOUS',
        unit: 'SCOUT',
        note: 'Scan Firm Ridge Vein',
      },
      {
        id: 'cmd-6',
        action: 'DRIVE',
        x: 665,
        y: 160,
        speed: 'CAUTIOUS',
        unit: 'TEAM',
        note: 'Move to Firm Ridge Vein',
      },
      {
        id: 'cmd-7',
        action: 'SAMPLE',
        x: 665,
        y: 160,
        speed: 'CAUTIOUS',
        unit: 'CARRIER',
        note: 'Collect ridge bedrock vein',
      },
      {
        id: 'cmd-8',
        action: 'DRIVE',
        x: destination.beacon.x,
        y: destination.beacon.y,
        speed: 'NOMINAL',
        unit: 'TEAM',
        note: 'Proceed to extraction beacon',
      },
    ];
  }

  if (destination.id === 'moon') {
    return [
      {
        id: 'cmd-1',
        action: 'RELAY',
        x: destination.start.x,
        y: destination.start.y,
        speed: 'CAUTIOUS',
        unit: 'SCOUT',
        note: 'Scout maps crater shadow rim',
      },
      {
        id: 'cmd-2',
        action: 'DRIVE',
        x: 270,
        y: 410,
        speed: 'NOMINAL',
        unit: 'TEAM',
        note: 'Descend south past ejecta',
      },
      {
        id: 'cmd-3',
        action: 'DRIVE',
        x: 615,
        y: 430,
        speed: 'CAUTIOUS',
        unit: 'TEAM',
        note: 'Reach Volatile Trench Core',
      },
      {
        id: 'cmd-4',
        action: 'SAMPLE',
        x: 615,
        y: 430,
        speed: 'CAUTIOUS',
        unit: 'CARRIER',
        note: 'Collect shadow-border sample',
      },
      {
        id: 'cmd-5',
        action: 'SCAN',
        x: 615,
        y: 430,
        speed: 'CAUTIOUS',
        unit: 'SCOUT',
        note: 'Survey east ejecta apron',
      },
      {
        id: 'cmd-6',
        action: 'DRIVE',
        x: 820,
        y: 350,
        speed: 'CAUTIOUS',
        unit: 'TEAM',
        note: 'Skirt loose apron slowly',
      },
      {
        id: 'cmd-7',
        action: 'DRIVE',
        x: destination.beacon.x,
        y: destination.beacon.y,
        speed: 'NOMINAL',
        unit: 'TEAM',
        note: 'Arrive at Shackleton beacon',
      },
    ];
  }

  return [
    {
      id: 'cmd-1',
      action: 'SCAN',
      x: destination.start.x,
      y: destination.start.y,
      speed: 'CAUTIOUS',
      unit: 'SCOUT',
      note: 'Calibrate LiDAR baseline',
    },
    {
      id: 'cmd-2',
      action: 'DRIVE',
      x: 365,
      y: 175,
      speed: 'NOMINAL',
      unit: 'TEAM',
      note: 'Climb to Alluvial Sensor Stake',
    },
    {
      id: 'cmd-3',
      action: 'SAMPLE',
      x: 365,
      y: 175,
      speed: 'CAUTIOUS',
      unit: 'CARRIER',
      note: 'Log alluvial calibration stake',
    },
    {
      id: 'cmd-4',
      action: 'DRIVE',
      x: 560,
      y: 390,
      speed: 'CAUTIOUS',
      unit: 'TEAM',
      note: 'Route south of Escarpment Outcrop',
    },
    {
      id: 'cmd-5',
      action: 'DRIVE',
      x: 735,
      y: 370,
      speed: 'NOMINAL',
      unit: 'TEAM',
      note: 'Approach Mesa Telemetry Node',
    },
    {
      id: 'cmd-6',
      action: 'SAMPLE',
      x: 735,
      y: 370,
      speed: 'CAUTIOUS',
      unit: 'CARRIER',
      note: 'Collect mesa calibration data',
    },
    {
      id: 'cmd-7',
      action: 'DRIVE',
      x: destination.beacon.x,
      y: destination.beacon.y,
      speed: 'NOMINAL',
      unit: 'TEAM',
      note: 'Reach East Ridge Beacon',
    },
  ];
}

export function simulateMission(
  destination: DestinationConfig,
  commands: RoverCommand[],
  planLabel = 'Custom Mission Plan'
): MissionRecording {
  const safeCommands = commands.length > 0 ? commands : [];
  let t = 0;
  let carrierX = destination.start.x;
  let carrierY = destination.start.y;
  let scoutX = destination.start.x + 26;
  let scoutY = destination.start.y - 6;
  let headingRad = 0;
  let batteryPct = 100;
  let distanceMeters = 0;
  let peakSlipRatio = 0;
  let relayBoostStepsLeft = 0;
  let slipStallAccumSec = 0;

  const sampledIds = new Set<string>();
  const scannedIds = new Set<string>();
  const frames: SimFrame[] = [];
  const events: SimEvent[] = [];

  const pushEvent = (
    kind: SimEvent['kind'],
    title: string,
    detail: string,
    ex = carrierX,
    ey = carrierY
  ) => {
    events.push({
      id: `ev-${events.length + 1}`,
      t: Number(t.toFixed(1)),
      kind,
      title,
      detail,
      x: Math.round(ex),
      y: Math.round(ey),
    });
  };

  pushEvent(
    'INFO',
    'Mission Rollout Started',
    `Scout (4w) and Carrier (6w) initialized on ${destination.name}.`,
    carrierX,
    carrierY
  );

  let cmdIndex = 0;
  let actionTimerSec = 0;
  let outcome: MissionOutcome = 'INCOMPLETE_ROUTE';
  let outcomeTitle = 'Route Ended Before Beacon';
  let outcomeLesson =
    'The rover team completed the planned commands without reaching the extraction beacon.';
  let nextSuggestion =
    'Add a final DRIVE waypoint targeting the Extraction Beacon coordinates.';

  let halted = safeCommands.length === 0;
  if (halted) {
    outcome = 'INCOMPLETE_ROUTE';
    outcomeTitle = 'No Rover Commands Planned';
    outcomeLesson = 'At least one DRIVE waypoint is needed to move the rover team.';
    nextSuggestion = 'Click the map to plot waypoints or load a preset route.';
  }

  let loggedHazardIds = new Set<string>();

  // Record initial t = 0 frame
  frames.push({
    t: 0,
    scoutX,
    scoutY,
    carrierX,
    carrierY,
    headingRad,
    activeCommandIndex: 0,
    activeAction: safeCommands[0]?.action ?? 'HALTED',
    batteryPct: 100,
    wheelVelocity: 0,
    forwardProgress: 0,
    slipRatio: 0,
    inHazardId: null,
    relayActive: false,
    scanPulse: false,
    sampledIds: [],
    scannedIds: [],
  });

  while (!halted && cmdIndex < safeCommands.length && t < MAX_SIM_SECONDS) {
    const cmd = safeCommands[cmdIndex];
    t = Number((t + STEP_DT).toFixed(2));

    let wheelVelocity = 0;
    let forwardProgress = 0;
    let slipRatio = 0;
    let inHazardId: string | null = null;
    let relayActive = relayBoostStepsLeft > 0;
    let scanPulse = false;

    if (cmd.action === 'RELAY') {
      if (actionTimerSec === 0) {
        pushEvent(
          'RELAY',
          'Scout Route Handoff',
          'Scout probes ahead and transmits a cyan safe-traction corridor to Carrier.'
        );
      }
      actionTimerSec += STEP_DT;
      relayActive = true;
      // Scout moves slightly ahead visually during relay
      scoutX = Math.min(MAP_WIDTH - 24, carrierX + Math.cos(headingRad) * 44);
      scoutY = Math.max(24, Math.min(MAP_HEIGHT - 24, carrierY + Math.sin(headingRad) * 44));
      batteryPct = Math.max(0, batteryPct - 0.18);
      if (actionTimerSec >= 1.2) {
        relayBoostStepsLeft = 2; // Protects next 2 command segments
        cmdIndex += 1;
        actionTimerSec = 0;
      }
    } else if (cmd.action === 'SCAN') {
      if (actionTimerSec === 0) {
        pushEvent(
          'SCAN',
          'Terrain LiDAR Scan',
          'Scout scans surrounding regolith density and maps nearby science targets.'
        );
      }
      actionTimerSec += STEP_DT;
      scanPulse = true;
      batteryPct = Math.max(0, batteryPct - 0.25);
      for (const h of destination.hazards) {
        if (distanceBetween(carrierX, carrierY, h.x, h.y) <= SCAN_REVEAL_RADIUS + h.radius) {
          scannedIds.add(h.id);
        }
      }
      if (actionTimerSec >= 1.3) {
        cmdIndex += 1;
        actionTimerSec = 0;
      }
    } else if (cmd.action === 'SAMPLE') {
      if (actionTimerSec === 0) {
        const nearbyTarget = destination.scienceTargets.find(
          (s) => distanceBetween(carrierX, carrierY, s.x, s.y) <= SAMPLE_CAPTURE_RADIUS
        );
        if (nearbyTarget && !sampledIds.has(nearbyTarget.id)) {
          sampledIds.add(nearbyTarget.id);
          pushEvent(
            'SAMPLE',
            `Sampled ${nearbyTarget.label}`,
            `Carrier secured ${nearbyTarget.points} science pts at (${nearbyTarget.x}, ${nearbyTarget.y}).`
          );
        } else if (nearbyTarget) {
          pushEvent(
            'INFO',
            `${nearbyTarget.label} Already Logged`,
            'Carrier verified previously secured core canister.'
          );
        } else {
          pushEvent(
            'INFO',
            'Sample Arm Empty',
            'No science target within 56m sample reach at current stop.'
          );
        }
      }
      actionTimerSec += STEP_DT;
      batteryPct = Math.max(0, batteryPct - 0.28);
      if (actionTimerSec >= 1.4) {
        cmdIndex += 1;
        actionTimerSec = 0;
      }
    } else if (cmd.action === 'DRIVE') {
      const targetX = clampCoord(cmd.x, 24, MAP_WIDTH - 24);
      const targetY = clampCoord(cmd.y, 24, MAP_HEIGHT - 24);
      const dx = targetX - carrierX;
      const dy = targetY - carrierY;
      const dist = Math.hypot(dx, dy);

      if (dist <= 6) {
        carrierX = targetX;
        carrierY = targetY;
        if (relayBoostStepsLeft > 0) relayBoostStepsLeft -= 1;
        cmdIndex += 1;
        actionTimerSec = 0;
        continue;
      }

      headingRad = Math.atan2(dy, dx);
      const ux = dx / dist;
      const uy = dy / dist;

      // Check hazard at Carrier's position
      const hazardHit = getActiveHazard(carrierX, carrierY, destination.hazards);
      const baseSpeedPx = SPEED_M_PER_SEC[cmd.speed];
      const baseWheel = SPEED_WHEEL_RADS[cmd.speed];
      const baseMps = SPEED_DISPLAY_MPS[cmd.speed];

      let progressFactor = 1.0;
      let wheelFactor = 1.0;
      let powerDrain = cmd.speed === 'FAST' ? 0.44 : cmd.speed === 'NOMINAL' ? 0.28 : 0.19;
      if (destination.id === 'earth') powerDrain *= 1.15; // 1.0g gravity draw

      if (hazardHit) {
        const { hazard, depthRatio } = hazardHit;
        inHazardId = hazard.id;

        if (!loggedHazardIds.has(hazard.id)) {
          loggedHazardIds.add(hazard.id);
          pushEvent(
            'HAZARD',
            `Entered ${hazard.label}`,
            hazard.description
          );
        }

        // Direct collision with solid boulders / steep escarpments / deep crater core
        if (hazard.lethalOnDirectHit && depthRatio > 0.28) {
          outcome = 'COLLISION_HALT';
          outcomeTitle = `Suspension Fault at ${hazard.label}`;
          outcomeLesson = `Carrier entered the core of ${hazard.label} without sufficient lateral clearance.`;
          nextSuggestion = `Plot an intermediate waypoint 40–60px clear of ${hazard.label}.`;
          pushEvent(
            'FAIL',
            'Mobility Halt · Obstacle Contact',
            `Articulated suspension safe-stopped inside ${hazard.label}.`
          );
          halted = true;
          wheelVelocity = 0;
          forwardProgress = 0;
          slipRatio = 0;
        } else {
          // Soft regolith / crater rim slip physics
          const speedPenalty = cmd.speed === 'FAST' ? 1.0 : cmd.speed === 'NOMINAL' ? 0.65 : 0.26;
          const relayMitigation = relayActive ? 0.48 : 1.0;
          slipRatio = Math.min(
            0.96,
            hazard.slipPenalty * (0.55 + depthRatio * 0.45) * speedPenalty * relayMitigation
          );
          peakSlipRatio = Math.max(peakSlipRatio, slipRatio);
          wheelFactor = 1 + slipRatio * 0.85;
          progressFactor = Math.max(0.05, 1 - slipRatio * 1.15);
          powerDrain *= 1 + slipRatio * 0.85;

          if (slipRatio >= 0.54) {
            slipStallAccumSec += STEP_DT;
            if (Math.abs(slipStallAccumSec - 0.4) < 0.06) {
              pushEvent(
                'SLIP',
                'High Wheel Slip Detected',
                `Wheel speed elevated (${(baseWheel * wheelFactor).toFixed(2)} rad/s) while forward progress dropped.`
              );
            }
            if (slipStallAccumSec >= 1.1) {
              outcome = 'STALLED_SLIP';
              outcomeTitle = `Wheel-Slip Stall in ${hazard.label}`;
              outcomeLesson = `Driving at ${cmd.speed} speed through ${hazard.label} caused wheel spin to outpace forward progress—mirroring Episode 0142.`;
              nextSuggestion =
                'Route around the hazard on firmer ground, or trigger a Scout Relay + CAUTIOUS speed.';
              pushEvent(
                'FAIL',
                'Safe-Stop Triggered (Slip Threshold)',
                'Carrier halted autonomously to avoid burying wheels in loose regolith.'
              );
              halted = true;
            }
          } else {
            slipStallAccumSec = Math.max(0, slipStallAccumSec - STEP_DT * 0.5);
          }
        }
      } else {
        slipStallAccumSec = Math.max(0, slipStallAccumSec - STEP_DT);
      }

      if (!halted) {
        const movePx = Math.min(dist, baseSpeedPx * progressFactor * STEP_DT);
        carrierX += ux * movePx;
        carrierY += uy * movePx;
        distanceMeters += movePx * 0.18;
        wheelVelocity = Number((baseWheel * wheelFactor).toFixed(2));
        forwardProgress = Number((baseMps * progressFactor).toFixed(2));
      }

      // Scout leads Carrier by ~34px along heading
      scoutX = Math.max(20, Math.min(MAP_WIDTH - 20, carrierX + Math.cos(headingRad) * 34));
      scoutY = Math.max(20, Math.min(MAP_HEIGHT - 20, carrierY + Math.sin(headingRad) * 34));
      batteryPct = Math.max(0, batteryPct - powerDrain);
    }

    if (batteryPct <= 0 && !halted) {
      batteryPct = 0;
      halted = true;
      outcome = 'POWER_DEPLETED';
      outcomeTitle = 'Battery Reserve Depleted';
      outcomeLesson =
        'High-speed driving and repeated hazard drag exhausted battery before reaching the beacon.';
      nextSuggestion =
        'Shorten detours and use CAUTIOUS or NOMINAL speed to conserve propulsion power.';
      pushEvent('FAIL', 'Power Depleted', 'Rover entered low-power hibernation mode.');
    }

    // Check Beacon capture if not halted
    if (
      !halted &&
      distanceBetween(carrierX, carrierY, destination.beacon.x, destination.beacon.y) <=
        BEACON_CAPTURE_RADIUS
    ) {
      const allSampled = sampledIds.size >= destination.scienceTargets.length;
      outcome = allSampled ? 'SUCCESS' : 'PARTIAL_SUCCESS';
      outcomeTitle = allSampled
        ? 'Mission Accomplished · All Targets Secured'
        : 'Beacon Reached · Partial Science Return';
      outcomeLesson = allSampled
        ? 'Controlled speed and safe routing carried the team past terrain hazards with full science.'
        : 'Team reached the extraction beacon safely; additional science sites remain available for a follow-up run.';
      nextSuggestion = allSampled
        ? 'Try another planetary destination or refine the path for higher battery margin.'
        : 'Add a DRIVE + SAMPLE detour to remaining science targets before heading to the beacon.';
      pushEvent(
        'SUCCESS',
        'Extraction Beacon Reached',
        `Team arrived with ${Math.round(batteryPct)}% battery and ${sampledIds.size}/${destination.scienceTargets.length} samples.`
      );
      halted = true;
    }

    frames.push({
      t,
      scoutX: Number(scoutX.toFixed(1)),
      scoutY: Number(scoutY.toFixed(1)),
      carrierX: Number(carrierX.toFixed(1)),
      carrierY: Number(carrierY.toFixed(1)),
      headingRad: Number(headingRad.toFixed(3)),
      activeCommandIndex: Math.min(cmdIndex, Math.max(0, safeCommands.length - 1)),
      activeAction: halted
        ? outcome === 'SUCCESS' || outcome === 'PARTIAL_SUCCESS'
          ? 'COMPLETE'
          : 'HALTED'
        : cmd.action,
      batteryPct: Number(batteryPct.toFixed(1)),
      wheelVelocity,
      forwardProgress,
      slipRatio: Number(slipRatio.toFixed(2)),
      inHazardId,
      relayActive,
      scanPulse,
      sampledIds: Array.from(sampledIds),
      scannedIds: Array.from(scannedIds),
    });
  }

  // If loop ended cleanly after all commands without reaching beacon or failing
  if (!halted && outcome === 'INCOMPLETE_ROUTE') {
    if (
      distanceBetween(carrierX, carrierY, destination.beacon.x, destination.beacon.y) <=
      BEACON_CAPTURE_RADIUS
    ) {
      const allSampled = sampledIds.size >= destination.scienceTargets.length;
      outcome = allSampled ? 'SUCCESS' : 'PARTIAL_SUCCESS';
      outcomeTitle = allSampled
        ? 'Mission Accomplished · All Targets Secured'
        : 'Beacon Reached · Partial Science Return';
      outcomeLesson =
        'The rover team navigated the terrain and arrived at the extraction beacon.';
      nextSuggestion = allSampled
        ? 'Deploy to a harder planetary world or optimize battery margin.'
        : 'Route by remaining science targets for a full science score.';
      pushEvent('SUCCESS', 'Extraction Beacon Reached', 'Final waypoint reached safely.');
    } else {
      pushEvent(
        'INFO',
        'Command Queue Completed',
        'Rover stopped at last planned waypoint before reaching the extraction beacon.'
      );
    }
  }

  const scienceCollected = destination.scienceTargets
    .filter((s) => sampledIds.has(s.id))
    .reduce((acc, s) => acc + s.points, 0);
  const scienceAvailable = destination.scienceTargets.reduce((acc, s) => acc + s.points, 0);

  const beaconBonus =
    outcome === 'SUCCESS' ? 500 : outcome === 'PARTIAL_SUCCESS' ? 350 : 0;
  const batteryBonus =
    outcome === 'SUCCESS' || outcome === 'PARTIAL_SUCCESS' ? Math.round(batteryPct * 3) : 0;
  const scanBonus = scannedIds.size * 50;
  const score = beaconBonus + scienceCollected + batteryBonus + scanBonus;

  // Downsample frames to ~8–10 points for TelemetryTraceChart compatibility
  const telemetryStep = Math.max(1, Math.floor(frames.length / 9));
  const telemetry: TelemetryPoint[] = [];
  for (let i = 0; i < frames.length; i += telemetryStep) {
    const f = frames[i];
    telemetry.push({
      t: Number(f.t.toFixed(1)),
      wheelAngularVelocity: f.wheelVelocity,
      forwardProgress: f.forwardProgress,
      slipRatio: f.slipRatio,
    });
  }
  const lastFrame = frames[frames.length - 1];
  if (lastFrame && telemetry[telemetry.length - 1]?.t !== Number(lastFrame.t.toFixed(1))) {
    telemetry.push({
      t: Number(lastFrame.t.toFixed(1)),
      wheelAngularVelocity: lastFrame.wheelVelocity,
      forwardProgress: lastFrame.forwardProgress,
      slipRatio: lastFrame.slipRatio,
    });
  }

  return {
    id: `rec-${destination.id}-${Math.round(t * 10)}-${score}`,
    createdAtIso: new Date().toISOString(),
    destinationId: destination.id,
    destinationName: destination.name,
    planLabel,
    commands: safeCommands,
    outcome,
    outcomeTitle,
    outcomeLesson,
    nextSuggestion,
    durationSec: Number(t.toFixed(1)),
    distanceMeters: Number(distanceMeters.toFixed(1)),
    finalBatteryPct: Number(batteryPct.toFixed(1)),
    peakSlipRatio: Number(peakSlipRatio.toFixed(2)),
    scienceCollected,
    scienceAvailable,
    score,
    frames,
    events,
    telemetry,
  };
}
