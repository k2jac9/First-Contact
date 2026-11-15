export type DestinationId = 'earth' | 'moon' | 'mars';

export type HazardKind = 'sandy-rut' | 'boulder' | 'crater-shadow' | 'steep-ridge';

export interface TerrainHazard {
  id: string;
  label: string;
  kind: HazardKind;
  x: number;
  y: number;
  radius: number;
  slipPenalty: number; // 0..1 extra slip risk
  lethalOnDirectHit: boolean;
  description: string;
}

export interface ScienceTarget {
  id: string;
  label: string;
  x: number;
  y: number;
  points: number;
  description: string;
}

export interface DestinationConfig {
  id: DestinationId;
  name: string;
  sector: string;
  worldLabel: string;
  imagePath: string;
  gravityG: number;
  ambientNote: string;
  briefing: string;
  challengeSummary: string;
  start: { x: number; y: number };
  beacon: { x: number; y: number };
  hazards: TerrainHazard[];
  scienceTargets: ScienceTarget[];
  starterDirectGoal: string;
  starterSafeNote: string;
  accentHex: string;
}

export const MAP_WIDTH = 1000;
export const MAP_HEIGHT = 560;

export const DESTINATIONS: DestinationConfig[] = [
  {
    id: 'mars',
    name: 'Mars · Jezero Split Boulder',
    sector: 'Sector M-04 · Basalt Rut',
    worldLabel: 'Mars',
    imagePath: '/src/assets/images/mars_split_boulder_rut_1794689354383.jpg',
    gravityG: 0.38,
    ambientNote: 'Muted ochre regolith · Thin dust atmosphere · High slip risk in windblown sand',
    briefing:
      'Navigate the Scout and Carrier from the west landing shelf to the east ridge beacon. A split basalt boulder borders a deep sandy rut—charging straight across at speed will spin the wheels and stall the Carrier.',
    challengeSummary: 'Avoid the basalt boulder and route around or cautiously relay across the sandy slip rut.',
    start: { x: 110, y: 310 },
    beacon: { x: 880, y: 250 },
    hazards: [
      {
        id: 'mars-rut',
        label: 'Sandy Slip Rut',
        kind: 'sandy-rut',
        x: 470,
        y: 300,
        radius: 82,
        slipPenalty: 0.78,
        lethalOnDirectHit: false,
        description: 'Fine wind-sorted sand; FAST or NOMINAL speed without Scout relay causes severe wheel slip.',
      },
      {
        id: 'mars-boulder',
        label: 'Split Basalt Boulder',
        kind: 'boulder',
        x: 445,
        y: 185,
        radius: 52,
        slipPenalty: 0.9,
        lethalOnDirectHit: true,
        description: 'Sharp fractured basalt outcrop; direct contact halts suspension.',
      },
      {
        id: 'mars-drift',
        label: 'South Aeolian Drift',
        kind: 'sandy-rut',
        x: 685,
        y: 390,
        radius: 66,
        slipPenalty: 0.65,
        lethalOnDirectHit: false,
        description: 'Loose regolith basin along the southern floor.',
      },
    ],
    scienceTargets: [
      {
        id: 'mars-sample-basalt',
        label: 'Basalt Core Alpha',
        x: 345,
        y: 425,
        points: 250,
        description: 'Exposed carbonate-bearing bench south of the main rut.',
      },
      {
        id: 'mars-sample-ridge',
        label: 'Firm Ridge Vein',
        x: 665,
        y: 160,
        points: 250,
        description: 'Compacted bedrock seam on the northern bypass corridor.',
      },
    ],
    starterDirectGoal:
      'Take the northern firm-ground bypass around the split basalt boulder and sandy rut, scan for traction, sample the Firm Ridge Vein, and reach the extraction beacon.',
    starterSafeNote: 'Bypass north at (460, 105) or south via Basalt Core Alpha at Cautious speed.',
    accentHex: '#F59E0B',
  },
  {
    id: 'moon',
    name: 'Moon · Shackleton Rim',
    sector: 'Sector L-02 · South Pole',
    worldLabel: 'Moon',
    imagePath: '/src/assets/images/lunar_ridge_rovers_1794689353680.jpg',
    gravityG: 0.16,
    ambientNote: 'Hard directional sunlight · Airless vacuum · Deep thermal shadow craters',
    briefing:
      'Traverse a sun-drenched lunar ridge toward the communications beacon. Low gravity amplifies momentum at high speed, while permanently shadowed depressions conceal loose ejecta and drain battery heaters.',
    challengeSummary: 'Use Scout Relay cues before cresting the shadowed crater rim and preserve battery.',
    start: { x: 105, y: 280 },
    beacon: { x: 890, y: 290 },
    hazards: [
      {
        id: 'moon-crater-center',
        label: 'Shadowed Crater',
        kind: 'crater-shadow',
        x: 495,
        y: 285,
        radius: 92,
        slipPenalty: 0.72,
        lethalOnDirectHit: true,
        description: 'Steep rim & ultra-cold permanently shadowed floor.',
      },
      {
        id: 'moon-ejecta-north',
        label: 'Ejecta Boulder Field',
        kind: 'boulder',
        x: 350,
        y: 135,
        radius: 50,
        slipPenalty: 0.85,
        lethalOnDirectHit: true,
        description: 'Angular impact blocks requiring clean lateral clearance.',
      },
      {
        id: 'moon-regolith-east',
        label: 'Loose Ejecta Apron',
        kind: 'sandy-rut',
        x: 720,
        y: 225,
        radius: 62,
        slipPenalty: 0.62,
        lethalOnDirectHit: false,
        description: 'Low-cohesion lunar dust apron; slow down or relay before crossing.',
      },
    ],
    scienceTargets: [
      {
        id: 'moon-sample-rim',
        label: 'Ilmenite Rim Sample',
        x: 505,
        y: 135,
        points: 250,
        description: 'High-titanium basalt fragment along the sunlit northern ridge.',
      },
      {
        id: 'moon-sample-south',
        label: 'Volatile Trench Core',
        x: 615,
        y: 430,
        points: 250,
        description: 'Shadow-border regolith sample rich in micro-glass beads.',
      },
    ],
    starterDirectGoal:
      'Route south around the Shadowed Crater, sample the Volatile Trench Core, use Scout Relay before the east ridge, and finish at the beacon.',
    starterSafeNote: 'Keep wide clearance around the central Shadowed Crater rim.',
    accentHex: '#06B6D4',
  },
  {
    id: 'earth',
    name: 'Earth · Mojave Test Valley',
    sector: 'Sector E-01 · Analog Proving Ground',
    worldLabel: 'Earth',
    imagePath: '/src/assets/images/earth_desert_valley_1794689352726.jpg',
    gravityG: 1.0,
    ambientNote: '1.0g full gravity · Graded desert wash & rocky ridge · Calibration baseline',
    briefing:
      'Calibrate your rover team across an Earth desert test valley before deploying off-world. Higher gravity increases drive power draw on steep ridges and amplifies obstacle impact risk.',
    challengeSummary: 'Balance battery budget across steep terrain grades while scanning both test benchmarks.',
    start: { x: 100, y: 340 },
    beacon: { x: 890, y: 215 },
    hazards: [
      {
        id: 'earth-wash',
        label: 'Silty Arroyo Wash',
        kind: 'sandy-rut',
        x: 410,
        y: 330,
        radius: 72,
        slipPenalty: 0.58,
        lethalOnDirectHit: false,
        description: 'Soft dry streambed; reduces traction at high speed.',
      },
      {
        id: 'earth-ridge',
        label: 'Escarpment Outcrop',
        kind: 'steep-ridge',
        x: 605,
        y: 230,
        radius: 64,
        slipPenalty: 0.85,
        lethalOnDirectHit: true,
        description: '28-degree rock shelf; Carrier must steer north or south around it.',
      },
    ],
    scienceTargets: [
      {
        id: 'earth-sample-wash',
        label: 'Alluvial Sensor Stake',
        x: 365,
        y: 175,
        points: 200,
        description: 'Calibration LiDAR marker on firm desert pavement.',
      },
      {
        id: 'earth-sample-mesa',
        label: 'Mesa Telemetry Node',
        x: 735,
        y: 370,
        points: 200,
        description: 'Southern ridge calibration target.',
      },
    ],
    starterDirectGoal:
      'Drive north to calibrate at the Alluvial Sensor Stake, bypass the Escarpment Outcrop via the southern corridor, sample the Mesa Telemetry Node, and climb to the beacon.',
    starterSafeNote: 'Use Nominal speed on firm ground and Cautious speed near soft washes.',
    accentHex: '#10B981',
  },
];

export function getDestinationById(id: DestinationId): DestinationConfig {
  return DESTINATIONS.find((d) => d.id === id) ?? DESTINATIONS[0];
}
