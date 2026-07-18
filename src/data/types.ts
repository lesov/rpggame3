/** Shapes of the artifacts written by tools/preprocess.mjs. */

export interface Cell {
  i: number;
  p: [number, number];
  poly: [number, number][];
  c: number[]; // neighbor cell ids
  h: number; // azgaar height 0..100 (>=20 is land)
  t: number; // signed coast-distance rank
  f: number; // azgaar feature id (ocean/island/lake)
  biome: number;
  state: number;
  province: number;
  culture: number;
  religion: number;
  pop: number; // rural population, in populationRate units
  burg: number; // 0 = none
  r: number; // river id, 0 = none
  temp: number; // °C annual mean
  prec: number; // 0..64
}

export interface Biome {
  i: number;
  name: string;
  color: string;
  habitability: number;
}

export interface AzgaarFeature {
  i: number;
  type: 'ocean' | 'island' | 'lake';
  land: boolean;
  group?: string;
  name?: string;
  cells: number;
}

export interface Geometry {
  mapName: string;
  width: number;
  height: number;
  seed: string;
  mapCoordinates: { latT: number; latN: number; latS: number; lonT: number; lonW: number; lonE: number };
  distanceScale: number;
  distanceUnit: string;
  heightUnit: string;
  heightExponent: number;
  temperatureScale: string;
  populationRate: number;
  urbanization: number;
  winds: number[];
  biomes: Biome[];
  azgaarFeatures: AzgaarFeature[];
  cells: Cell[];
}

export interface SettlementBuilding {
  type: string;
  name?: string;
  kind?: string;
  grade?: string;
  focus?: string;
  purpose?: string;
  capacity?: number;
  worshipType?: string;
  religion?: string;
  religionType?: string;
  hasMessageBoard?: boolean;
}

export interface Burg {
  i: number;
  name: string;
  cell: number;
  x: number;
  y: number;
  state: number;
  culture: number;
  type: string;
  group: string;
  capital: boolean;
  port: boolean;
  citadel: boolean;
  walls: boolean;
  temple: boolean;
  plaza: boolean;
  shanty: boolean;
  population: number;
  tier?: string;
  religion?: string;
  buildings: SettlementBuilding[];
  landmarks: {
    majorTemple?: { name: string; religion: string };
    palace?: { name: string; kind: string; seatOf: string };
  };
  /** One of the fifteen ancient portals ("the Ways"), named for the great city of the era that raised it. */
  portal?: { name?: string; feeGold: number };
}

export interface Campaign {
  name: string;
  start: number;
  end?: number;
  attacker: number;
  defender: number;
}

export interface State {
  i: number;
  name: string;
  fullName?: string;
  form?: string;
  formName?: string;
  type: string;
  color: string;
  capital: number;
  center: number;
  pole: [number, number];
  culture: number;
  expansionism: number;
  neighbors: number[];
  diplomacy: string[];
  campaigns: Campaign[];
  alert?: number;
  urban: number;
  rural: number;
  cellCount: number;
}

export interface Province {
  i: number;
  state: number;
  name: string;
  formName: string;
  fullName: string;
  color: string;
  burg: number;
  center: number;
}

export interface Culture {
  i: number;
  name: string;
  type: string;
  color: string;
}

export interface Religion {
  i: number;
  name: string;
  type: string;
  form: string;
  deity?: string;
  color: string;
  culture: number;
  center: number;
}

export interface River {
  i: number;
  name: string;
  type: string;
  discharge: number;
  length: number;
  width: number;
  points: [number, number][];
}

export interface Route {
  i: number;
  group: string;
  points: [number, number][];
}

export interface Marker {
  i: number;
  type: string;
  icon: string;
  x: number;
  y: number;
  cell: number;
  name?: string;
  legend?: string;
}

export interface Zone {
  i: number;
  name: string;
  type: string;
  cells: number[];
}

export type PersonalityTrait =
  | 'Ambitious'
  | 'Content'
  | 'Arbitrary'
  | 'Just'
  | 'Arrogant'
  | 'Humble'
  | 'Brave'
  | 'Craven'
  | 'Calm'
  | 'Wrathful'
  | 'Chaste'
  | 'Lustful'
  | 'Compassionate'
  | 'Callous'
  | 'Cynical'
  | 'Zealous'
  | 'Deceitful'
  | 'Honest'
  | 'Diligent'
  | 'Lazy'
  | 'Forgiving'
  | 'Vengeful'
  | 'Generous'
  | 'Greedy'
  | 'Gregarious'
  | 'Shy'
  | 'Impatient'
  | 'Patient'
  | 'Trusting'
  | 'Paranoid'
  | 'Reckless'
  | 'Cautious'
  | 'Cruel / Sadistic'
  | 'Stubborn'
  | 'Temperate'
  | 'Haunted / Anxious'
  | 'Drunkard'
  | 'Loyal'
  | 'Curious'
  | 'Superstitious'
  | 'Deformed / Badly Scarred'
  | 'Eccentric'
  | 'Fickle';

export interface Person {
  id: string;
  role: string;
  title: string;
  name: string;
  gender: string;
  race: string;
  age: number;
  stateId?: number;
  stateName?: string;
  religionName?: string;
  culture?: string;
  capital?: string;
  religion?: string;
  bio: string;
  personalityTraits?: [PersonalityTrait, PersonalityTrait, PersonalityTrait];
}

export interface Regiment {
  state: number;
  name: string;
  total: number;
  units: Record<string, number>;
  cell: number;
  x: number;
  y: number;
  legend?: string;
}

export interface NamedFeature {
  id: string;
  name: string;
  type: string;
  tier: string;
  anchor?: { latLon: [number, number] };
  seedCell?: number;
}

export interface Landmass {
  id: string;
  name: string;
  type: string;
  azgaarFeature: number;
  cellCount: number;
  centroid: [number, number];
  centroidLabel: string;
}

export interface WaterFeature {
  id: string;
  name: string;
  type: string;
  ocean?: number;
}

export interface World {
  states: State[];
  stateBorders: [number, number, number, number][];
  provinces: Province[];
  cultures: Culture[];
  religions: Religion[];
  burgs: Burg[];
  rivers: River[];
  routes: Route[];
  markers: Marker[];
  zones: Zone[];
  people: Person[];
  regiments: Regiment[];
  namedFeatures: NamedFeature[];
  landmasses: Landmass[];
  waterFeatures: WaterFeature[];
  indexes: {
    relief: Record<string, string>;
    biomeRegion: Record<string, string>;
    bay: Record<string, string>;
    sea: Record<string, string>;
    landByFeature: Record<string, string>;
  };
}

export interface WarsFile {
  wars: {
    id: string;
    name: string;
    start: number;
    end: number | null;
    attacker: number;
    defender: number;
  }[];
}
