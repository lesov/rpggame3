/**
 * Opponent roster: SRD-flavored level-1-appropriate stat blocks with the
 * narrative data the combat log and narrator need — weighted hit locations,
 * morale, spoken lines for humanoids, and biome affinities for the battle
 * test's default pick.
 */
import type { Ability } from '../player/types';
import type { Combatant, CombatantAttack, MoraleProfile } from './types';

export interface Monster {
  id: string;
  name: string; // "Wolf"
  shortName: string; // "the wolf"
  species: string;
  descriptor: string;
  difficulty: 'easy' | 'fair' | 'hard';
  ac: number;
  hp: number;
  speed: number;
  abilityMods: Record<Ability, number>;
  attacks: CombatantAttack[];
  escapeBonus: number;
  bodyParts: [string, number][];
  morale: MoraleProfile;
  barks?: { taunt: string[]; pain: string[]; panic: string[] };
  /** biome ids (Azgaar) where this foe is the natural battle-test pick */
  biomes: number[];
  nearRoads?: boolean;
  encounter?: MonsterEncounterProfile;
}

export type EncounterActorAffinity =
  | 'beast'
  | 'undead'
  | 'brigand'
  | 'goblinoid'
  | 'raider'
  | 'fiend'
  | 'elemental'
  | 'fey'
  | 'patrol'
  | 'merchant'
  | 'pilgrim'
  | 'hunter'
  | 'refugee'
  | 'traveler';

export type EncounterWilderness = 'settled' | 'frontier' | 'remote' | 'deepWild';
export type EncounterRoad = 'roads' | 'trails' | 'offroad';

export interface MonsterEncounterProfile {
  actorKinds: EncounterActorAffinity[];
  biomeWeights?: Record<number, number>;
  wilderness?: Partial<Record<EncounterWilderness, number>>;
  roads?: Partial<Record<EncounterRoad, number>>;
  markerTypes?: Record<string, number>;
  night?: number;
  winter?: number;
  excludeBiomes?: number[];
}

const QUADRUPED: [string, number][] = [
  ['muzzle', 2], ['ear', 1], ['throat', 2], ['shoulder', 3], ['foreleg', 3],
  ['ribs', 3], ['flank', 3], ['haunch', 2], ['hind leg', 2], ['spine', 1],
];

const HUMANOID: [string, number][] = [
  ['scalp', 1], ['jaw', 1], ['throat', 1], ['shoulder', 2], ['sword arm', 3],
  ['off hand', 2], ['ribs', 3], ['chest', 2], ['gut', 2], ['hip', 1],
  ['thigh', 3], ['knee', 1], ['shin', 2],
];

const SKELETAL: [string, number][] = [
  ['skull', 2], ['jaw', 1], ['neck bones', 1], ['shoulder blade', 2], ['arm bones', 3],
  ['rib cage', 4], ['spine', 2], ['pelvis', 2], ['leg bones', 3],
];

const ARACHNID: [string, number][] = [
  ['fangs', 2], ['eyes', 1], ['cephalothorax', 3], ['abdomen', 4], ['foreleg', 3],
  ['middle leg', 3], ['hind leg', 2], ['spinnerets', 1],
];

const WINGED: [string, number][] = [
  ['face', 1], ['throat', 1], ['wing', 4], ['shoulder', 2], ['claw hand', 2],
  ['ribs', 2], ['belly', 2], ['tail', 2], ['leg', 2],
];

const VERMIN: [string, number][] = [
  ['snout', 2], ['ear', 1], ['neck', 2], ['shoulder', 2], ['foreleg', 2],
  ['ribs', 3], ['belly', 2], ['haunch', 2], ['tail', 1],
];

// Azgaar biome ids: 1 hot desert, 2 cold desert, 3 savanna, 4 grassland,
// 5 tropical seasonal forest, 6 temperate deciduous forest, 7 tropical rainforest,
// 8 temperate rainforest, 9 taiga, 10 tundra, 11 glacier, 12 wetland

export const MONSTERS: Monster[] = [
  {
    id: 'feral-dog',
    name: 'Feral dog',
    shortName: 'the dog',
    species: 'dog',
    descriptor: 'a rangy village dog gone wild — ribs showing, one ear torn away, no fear of people left in it',
    difficulty: 'easy',
    ac: 12, hp: 5, speed: 40,
    abilityMods: { str: 1, dex: 2, con: 1, int: -4, wis: 1, cha: -2 },
    attacks: [{ id: 'bite', name: 'Bite', verb: 'bites', kind: 'melee', toHit: 3, damageDice: '1d4', damageBonus: 1, damageType: 'piercing' }],
    escapeBonus: 4,
    bodyParts: QUADRUPED,
    morale: 'craven',
    biomes: [3, 4],
    nearRoads: true,
    encounter: {
      actorKinds: ['beast'],
      biomeWeights: { 3: 1.2, 4: 1.2, 5: 0.7, 6: 0.5 },
      wilderness: { settled: 1.4, frontier: 1.1, remote: 0.45, deepWild: 0.15 },
      roads: { roads: 1.4, trails: 1.0, offroad: 0.45 },
    },
  },
  {
    id: 'wolf',
    name: 'Wolf',
    shortName: 'the wolf',
    species: 'wolf',
    descriptor: 'a lean grey wolf, winter-hungry, hackles up, circling with its head low',
    difficulty: 'fair',
    ac: 13, hp: 11, speed: 40,
    abilityMods: { str: 1, dex: 2, con: 1, int: -4, wis: 1, cha: -2 },
    attacks: [{ id: 'bite', name: 'Bite', verb: 'tears at', kind: 'melee', toHit: 4, damageDice: '2d4', damageBonus: 2, damageType: 'piercing' }],
    escapeBonus: 5,
    bodyParts: QUADRUPED,
    morale: 'wild',
    biomes: [6, 8, 9, 10],
    encounter: {
      actorKinds: ['beast'],
      biomeWeights: { 6: 1.0, 8: 1.0, 9: 1.35, 10: 1.4, 2: 0.7, 11: 0.45 },
      wilderness: { settled: 0.35, frontier: 1.0, remote: 1.4, deepWild: 1.6 },
      roads: { roads: 0.55, trails: 1.0, offroad: 1.25 },
      night: 1.3,
      winter: 1.35,
    },
  },
  {
    id: 'bandit',
    name: 'Bandit',
    shortName: 'the bandit',
    species: 'human',
    descriptor: 'a road-thin man in a patched gambeson, scimitar notched from old work, eyes doing arithmetic on your belongings',
    difficulty: 'fair',
    ac: 12, hp: 11, speed: 30,
    abilityMods: { str: 0, dex: 1, con: 1, int: 0, wis: 0, cha: 0 },
    attacks: [{ id: 'scimitar', name: 'Scimitar', verb: 'slashes', kind: 'melee', toHit: 3, damageDice: '1d6', damageBonus: 1, damageType: 'slashing' }],
    escapeBonus: 1,
    bodyParts: HUMANOID,
    morale: 'craven',
    barks: {
      taunt: ['"Coin and the pack. Then you walk."', '"Wrong road, friend."', '"Don\'t make this work."'],
      pain: ['"Bastard—!"', 'a wet grunt through clenched teeth', '"You\'ll bleed for that."'],
      panic: ['"Enough — enough!"', '"It ain\'t worth this."', '"Mercy — I yield, I yield!"'],
    },
    biomes: [3, 4, 5, 6],
    nearRoads: true,
    encounter: {
      actorKinds: ['brigand', 'raider', 'traveler', 'merchant'],
      biomeWeights: { 3: 1.0, 4: 1.2, 5: 0.9, 6: 1.0, 8: 0.65, 12: 0.5 },
      wilderness: { settled: 1.35, frontier: 1.15, remote: 0.45, deepWild: 0.12 },
      roads: { roads: 1.55, trails: 1.0, offroad: 0.25 },
      markerTypes: { brigands: 3.0, pirates: 1.8 },
    },
  },
  {
    id: 'cultist',
    name: 'Cultist',
    shortName: 'the cultist',
    species: 'human',
    descriptor: 'a hollow-cheeked believer in a rough travel robe, sickle-knife held like a liturgical object, murmuring as they advance',
    difficulty: 'easy',
    ac: 12, hp: 9, speed: 30,
    abilityMods: { str: 0, dex: 1, con: 0, int: 0, wis: 0, cha: 1 },
    attacks: [{ id: 'sickle', name: 'Sickle', verb: 'rips at', kind: 'melee', toHit: 3, damageDice: '1d4', damageBonus: 1, damageType: 'slashing' }],
    escapeBonus: 1,
    bodyParts: HUMANOID,
    morale: 'wild',
    barks: {
      taunt: ['"The Ruby Nature takes what it is owed."', '"You were sent to me. Do you see?"'],
      pain: ['a hymn broken mid-word', '"Pain is only a door—"'],
      panic: ['"This was not promised — this was not promised!"'],
    },
    biomes: [6, 8, 12],
    encounter: {
      actorKinds: ['brigand', 'fiend'],
      biomeWeights: { 5: 0.75, 6: 1.1, 8: 1.0, 12: 0.9, 4: 0.6 },
      wilderness: { settled: 1.0, frontier: 1.0, remote: 0.75, deepWild: 0.45 },
      roads: { roads: 0.9, trails: 1.1, offroad: 0.8 },
      markerTypes: { dungeons: 1.8, ruins: 1.6 },
      night: 1.3,
    },
  },
  {
    id: 'goblin',
    name: 'Goblin',
    shortName: 'the goblin',
    species: 'goblin',
    descriptor: 'a wiry goblin in scavenged leathers, all elbows and yellow teeth, its blade rust-brown and filthy',
    difficulty: 'fair',
    ac: 14, hp: 7, speed: 30,
    abilityMods: { str: -1, dex: 2, con: 0, int: 0, wis: -1, cha: 0 },
    attacks: [{ id: 'scimitar', name: 'Rusted scimitar', verb: 'hacks at', kind: 'melee', toHit: 4, damageDice: '1d6', damageBonus: 2, damageType: 'slashing' }],
    escapeBonus: 4,
    bodyParts: HUMANOID,
    morale: 'craven',
    barks: {
      taunt: ['"Softskin\'s far from its walls, yes?"', 'a wet cackle'],
      pain: ['a shriek like a kicked kettle', '"Bites back! It bites back!"'],
      panic: ['"Not worth it not worth it—"'],
    },
    biomes: [2, 9, 10],
    encounter: {
      actorKinds: ['goblinoid', 'raider'],
      biomeWeights: { 2: 1.0, 9: 1.25, 10: 1.25, 11: 0.45, 1: 0.65, 6: 0.6 },
      wilderness: { settled: 0.3, frontier: 1.0, remote: 1.25, deepWild: 1.1 },
      roads: { roads: 0.65, trails: 1.2, offroad: 1.1 },
      markerTypes: { dungeons: 1.5, ruins: 1.5 },
      night: 1.15,
      winter: 1.2,
    },
  },
  {
    id: 'skeleton',
    name: 'Skeleton',
    shortName: 'the skeleton',
    species: 'undead',
    descriptor: 'a soldier\'s bones still in the rags of a surcoat, sword-grip worn to its shape, moving with a horrible patience',
    difficulty: 'fair',
    ac: 13, hp: 13, speed: 30,
    abilityMods: { str: 0, dex: 2, con: 2, int: -2, wis: -1, cha: -3 },
    attacks: [{ id: 'shortsword', name: 'Ancient shortsword', verb: 'thrusts at', kind: 'melee', toHit: 4, damageDice: '1d6', damageBonus: 2, damageType: 'piercing' }],
    escapeBonus: 2,
    bodyParts: SKELETAL,
    morale: 'fearless',
    biomes: [1, 2],
    encounter: {
      actorKinds: ['undead'],
      biomeWeights: { 1: 1.4, 2: 1.3, 10: 0.8, 11: 0.7, 12: 0.5 },
      wilderness: { settled: 0.4, frontier: 0.9, remote: 1.2, deepWild: 1.3 },
      roads: { roads: 0.7, trails: 1.0, offroad: 1.2 },
      markerTypes: { dungeons: 2.4, ruins: 2.6 },
      night: 1.4,
    },
  },
  {
    id: 'zombie',
    name: 'Zombie',
    shortName: 'the zombie',
    species: 'undead',
    descriptor: 'a dead farmhand weeks gone, bloated and grey, dragging one ruined foot, jaw working at nothing',
    difficulty: 'easy',
    ac: 8, hp: 22, speed: 20,
    abilityMods: { str: 1, dex: -2, con: 3, int: -4, wis: -2, cha: -3 },
    attacks: [{ id: 'slam', name: 'Slam', verb: 'claws at', kind: 'melee', toHit: 3, damageDice: '1d6', damageBonus: 1, damageType: 'bludgeoning' }],
    escapeBonus: -2,
    bodyParts: HUMANOID,
    morale: 'fearless',
    biomes: [12],
    encounter: {
      actorKinds: ['undead'],
      biomeWeights: { 12: 1.5, 6: 0.65, 8: 0.8, 5: 0.6 },
      wilderness: { settled: 0.55, frontier: 1.0, remote: 1.05, deepWild: 0.85 },
      roads: { roads: 0.7, trails: 1.0, offroad: 1.05 },
      markerTypes: { dungeons: 2.0, ruins: 2.0 },
      night: 1.25,
    },
  },
  {
    id: 'thug',
    name: 'Thug',
    shortName: 'the thug',
    species: 'human',
    descriptor: 'a slab-shouldered enforcer with a dented mace and the flat eyes of someone who hurts people on schedule',
    difficulty: 'hard',
    ac: 11, hp: 32, speed: 30,
    abilityMods: { str: 2, dex: 0, con: 2, int: 0, wis: 0, cha: 0 },
    attacks: [{ id: 'mace', name: 'Mace', verb: 'clubs', kind: 'melee', toHit: 4, damageDice: '1d6', damageBonus: 2, damageType: 'bludgeoning' }],
    escapeBonus: 2,
    bodyParts: HUMANOID,
    morale: 'steadfast',
    barks: {
      taunt: ['"Nothing personal. Somebody paid."', '"Stay down when you fall. Easier."'],
      pain: ['a grunt, no more', '"Hnh. Good arm."'],
      panic: ['"...this job don\'t pay enough."'],
    },
    biomes: [4, 6],
    nearRoads: true,
    encounter: {
      actorKinds: ['brigand', 'raider', 'patrol', 'merchant'],
      biomeWeights: { 3: 0.8, 4: 1.2, 5: 0.7, 6: 1.0, 8: 0.55 },
      wilderness: { settled: 1.45, frontier: 1.1, remote: 0.35, deepWild: 0.08 },
      roads: { roads: 1.6, trails: 0.9, offroad: 0.18 },
      markerTypes: { brigands: 3.0, pirates: 1.8 },
    },
  },
  {
    id: 'black-bear',
    name: 'Black bear',
    shortName: 'the bear',
    species: 'bear',
    descriptor: 'a black bear up on its hind legs, huffing steam, jaw popping in warning — something has made it decide about you',
    difficulty: 'hard',
    ac: 11, hp: 19, speed: 40,
    abilityMods: { str: 2, dex: 0, con: 2, int: -4, wis: 1, cha: -2 },
    attacks: [
      { id: 'bite', name: 'Bite', verb: 'bites into', kind: 'melee', toHit: 4, damageDice: '1d6', damageBonus: 2, damageType: 'piercing' },
      { id: 'claws', name: 'Claws', verb: 'rakes', kind: 'melee', toHit: 4, damageDice: '2d4', damageBonus: 2, damageType: 'slashing' },
    ],
    escapeBonus: 3,
    bodyParts: QUADRUPED,
    morale: 'wild',
    biomes: [6, 8, 9],
    encounter: {
      actorKinds: ['beast'],
      biomeWeights: { 5: 0.55, 6: 1.2, 8: 1.25, 9: 1.0, 10: 0.45 },
      wilderness: { settled: 0.25, frontier: 0.9, remote: 1.45, deepWild: 1.7 },
      roads: { roads: 0.4, trails: 1.0, offroad: 1.35 },
      winter: 1.15,
    },
  },
  {
    id: 'orc-soldier',
    name: 'Orc soldier',
    shortName: 'the orc',
    species: 'orc',
    descriptor: 'a scar-mapped orc deserter in half-rotted regimental leathers, greataxe held in an economical low guard',
    difficulty: 'hard',
    ac: 13, hp: 15, speed: 30,
    abilityMods: { str: 3, dex: 1, con: 3, int: -1, wis: 0, cha: 0 },
    attacks: [{ id: 'greataxe', name: 'Greataxe', verb: 'cleaves at', kind: 'melee', toHit: 5, damageDice: '1d12', damageBonus: 3, damageType: 'slashing' }],
    escapeBonus: 3,
    bodyParts: HUMANOID,
    morale: 'steadfast',
    barks: {
      taunt: ['"You hold that thing like a farmer."', '"Come, then. Let\'s be honest with each other."'],
      pain: ['a bark of laughter with blood in it', '"Good. GOOD."'],
      panic: ['"...the regiment never paid me for dying."'],
    },
    biomes: [1, 2, 3, 10],
    encounter: {
      actorKinds: ['goblinoid', 'raider', 'patrol'],
      biomeWeights: { 1: 1.0, 2: 0.9, 3: 1.2, 4: 0.8, 10: 1.0 },
      wilderness: { settled: 0.45, frontier: 1.05, remote: 1.2, deepWild: 0.95 },
      roads: { roads: 0.85, trails: 1.1, offroad: 1.05 },
      markerTypes: { brigands: 1.7, dungeons: 1.4, ruins: 1.4 },
    },
  },
  {
    id: 'kobold-scout',
    name: 'Kobold scout',
    shortName: 'the kobold',
    species: 'kobold',
    descriptor: 'a small rust-scaled kobold with a miner\'s pick, bead charms, and quick eyes searching for the nearest escape hole',
    difficulty: 'easy',
    ac: 12, hp: 5, speed: 30,
    abilityMods: { str: -2, dex: 2, con: 0, int: 0, wis: -1, cha: -1 },
    attacks: [{ id: 'pick', name: 'Mining pick', verb: 'jabs', kind: 'melee', toHit: 4, damageDice: '1d4', damageBonus: 2, damageType: 'piercing' }],
    escapeBonus: 4,
    bodyParts: HUMANOID,
    morale: 'craven',
    barks: {
      taunt: ['"Big thing lost, yes?"', '"Trap-place is ours."'],
      pain: ['a high yelp', '"No no no!"'],
      panic: ['"Run-run!"', '"Take shiny, not me!"'],
    },
    biomes: [1, 2, 3, 10],
    encounter: {
      actorKinds: ['goblinoid'],
      biomeWeights: { 1: 1.2, 2: 1.0, 3: 0.9, 4: 0.5, 10: 0.8, 11: 0.35 },
      wilderness: { settled: 0.25, frontier: 0.95, remote: 1.25, deepWild: 1.15 },
      roads: { roads: 0.55, trails: 1.15, offroad: 1.2 },
      markerTypes: { dungeons: 2.5, ruins: 2.3 },
      night: 1.15,
    },
  },
  {
    id: 'gnoll-marauder',
    name: 'Gnoll marauder',
    shortName: 'the gnoll',
    species: 'gnoll',
    descriptor: 'a hyena-headed marauder in stitched hides, spear haft gnawed smooth, laughing softly through a mouthful of old blood',
    difficulty: 'hard',
    ac: 12, hp: 16, speed: 30,
    abilityMods: { str: 2, dex: 1, con: 1, int: -2, wis: 0, cha: -1 },
    attacks: [{ id: 'spear', name: 'Spear', verb: 'drives at', kind: 'melee', toHit: 4, damageDice: '1d6', damageBonus: 2, damageType: 'piercing' }],
    escapeBonus: 3,
    bodyParts: HUMANOID,
    morale: 'wild',
    barks: {
      taunt: ['a cackling bark', '"Run. Running seasons the meat."'],
      pain: ['a yelp that turns into laughter', '"More!"'],
      panic: ['a snarled prayer to something hungry'],
    },
    biomes: [1, 3, 4],
    encounter: {
      actorKinds: ['raider', 'goblinoid'],
      biomeWeights: { 1: 1.15, 3: 1.45, 4: 1.0, 5: 0.5 },
      wilderness: { settled: 0.35, frontier: 1.0, remote: 1.35, deepWild: 1.15 },
      roads: { roads: 0.75, trails: 1.0, offroad: 1.25 },
      markerTypes: { brigands: 1.6, ruins: 1.2 },
      night: 1.25,
    },
  },
  {
    id: 'hobgoblin-soldier',
    name: 'Hobgoblin soldier',
    shortName: 'the hobgoblin',
    species: 'hobgoblin',
    descriptor: 'a disciplined hobgoblin in lacquered scraps of mail, shield high, eyes measuring distance like a drill-yard instructor',
    difficulty: 'hard',
    ac: 14, hp: 13, speed: 30,
    abilityMods: { str: 1, dex: 1, con: 1, int: 0, wis: 0, cha: 0 },
    attacks: [{ id: 'longsword', name: 'Longsword', verb: 'cuts', kind: 'melee', toHit: 3, damageDice: '1d8', damageBonus: 1, damageType: 'slashing' }],
    escapeBonus: 2,
    bodyParts: HUMANOID,
    morale: 'steadfast',
    barks: {
      taunt: ['"Advance and be counted."', '"Your guard is open."'],
      pain: ['"Acceptable."', 'a clipped grunt'],
      panic: ['"Withdraw in order!"'],
    },
    biomes: [4, 6, 9, 10],
    nearRoads: true,
    encounter: {
      actorKinds: ['goblinoid', 'patrol', 'raider'],
      biomeWeights: { 4: 1.0, 6: 0.9, 9: 1.0, 10: 0.9, 2: 0.7 },
      wilderness: { settled: 0.75, frontier: 1.2, remote: 1.1, deepWild: 0.7 },
      roads: { roads: 1.15, trails: 1.15, offroad: 0.85 },
      markerTypes: { brigands: 1.3, dungeons: 1.5, ruins: 1.5 },
    },
  },
  {
    id: 'bugbear-ambusher',
    name: 'Bugbear ambusher',
    shortName: 'the bugbear',
    species: 'bugbear',
    descriptor: 'a long-armed bugbear peeling out of the brush, matted fur hung with leaf litter and a morningstar in both hands',
    difficulty: 'hard',
    ac: 13, hp: 18, speed: 30,
    abilityMods: { str: 2, dex: 1, con: 1, int: -1, wis: 0, cha: -1 },
    attacks: [{ id: 'morningstar', name: 'Morningstar', verb: 'crashes into', kind: 'melee', toHit: 4, damageDice: '1d8', damageBonus: 2, damageType: 'piercing' }],
    escapeBonus: 3,
    bodyParts: HUMANOID,
    morale: 'wild',
    barks: {
      taunt: ['"Should have watched the trees."', 'a low pleased growl'],
      pain: ['a furious cough', '"Little blade. Big mistake."'],
      panic: ['"No meal here!"'],
    },
    biomes: [5, 6, 7, 8, 9],
    encounter: {
      actorKinds: ['goblinoid', 'raider'],
      biomeWeights: { 5: 1.1, 6: 1.2, 7: 1.15, 8: 1.3, 9: 0.9 },
      wilderness: { settled: 0.25, frontier: 0.9, remote: 1.35, deepWild: 1.4 },
      roads: { roads: 0.35, trails: 1.2, offroad: 1.35 },
      markerTypes: { dungeons: 1.7, ruins: 1.5 },
      night: 1.5,
    },
  },
  {
    id: 'giant-rat',
    name: 'Giant rat',
    shortName: 'the rat',
    species: 'rat',
    descriptor: 'a dog-sized rat with patchy fur and wet black eyes, its whiskers twitching over teeth too large for its skull',
    difficulty: 'easy',
    ac: 12, hp: 7, speed: 30,
    abilityMods: { str: -2, dex: 2, con: 0, int: -4, wis: 0, cha: -3 },
    attacks: [{ id: 'bite', name: 'Bite', verb: 'gnaws', kind: 'melee', toHit: 4, damageDice: '1d4', damageBonus: 2, damageType: 'piercing' }],
    escapeBonus: 3,
    bodyParts: VERMIN,
    morale: 'wild',
    biomes: [5, 6, 8, 12],
    encounter: {
      actorKinds: ['beast'],
      biomeWeights: { 5: 0.8, 6: 0.75, 8: 0.9, 12: 1.25, 4: 0.55 },
      wilderness: { settled: 1.35, frontier: 1.0, remote: 0.45, deepWild: 0.2 },
      roads: { roads: 1.1, trails: 0.9, offroad: 0.55 },
      markerTypes: { dungeons: 1.8, ruins: 1.6 },
      night: 1.2,
      excludeBiomes: [10, 11],
    },
  },
  {
    id: 'giant-spider',
    name: 'Giant spider',
    shortName: 'the spider',
    species: 'spider',
    descriptor: 'a waist-high spider easing down from a skein of pale web, legs touching the ground one after another without sound',
    difficulty: 'fair',
    ac: 13, hp: 11, speed: 30,
    abilityMods: { str: 1, dex: 3, con: 1, int: -4, wis: 0, cha: -3 },
    attacks: [{ id: 'bite', name: 'Venomous bite', verb: 'sinks its fangs into', kind: 'melee', toHit: 5, damageDice: '1d6', damageBonus: 2, damageType: 'piercing' }],
    escapeBonus: 5,
    bodyParts: ARACHNID,
    morale: 'wild',
    biomes: [5, 6, 7, 8, 12],
    encounter: {
      actorKinds: ['beast'],
      biomeWeights: { 5: 1.15, 6: 0.9, 7: 1.35, 8: 1.25, 12: 1.35 },
      wilderness: { settled: 0.35, frontier: 0.95, remote: 1.3, deepWild: 1.55 },
      roads: { roads: 0.35, trails: 1.05, offroad: 1.45 },
      markerTypes: { dungeons: 1.6, ruins: 1.5, 'lake-monsters': 1.3 },
      night: 1.25,
      excludeBiomes: [10, 11],
    },
  },
  {
    id: 'stirge-swarm',
    name: 'Stirge swarm',
    shortName: 'the stirges',
    species: 'stirge',
    descriptor: 'a whining knot of bat-winged bloodsuckers, needle beaks clicking as the swarm jitters through the damp air',
    difficulty: 'easy',
    ac: 14, hp: 8, speed: 10,
    abilityMods: { str: -3, dex: 3, con: 0, int: -4, wis: -1, cha: -3 },
    attacks: [{ id: 'blood-drain', name: 'Blood drain', verb: 'latches onto', kind: 'melee', toHit: 5, damageDice: '1d4', damageBonus: 3, damageType: 'piercing' }],
    escapeBonus: 4,
    bodyParts: WINGED,
    morale: 'wild',
    biomes: [5, 7, 8, 12],
    encounter: {
      actorKinds: ['beast'],
      biomeWeights: { 5: 0.9, 7: 1.25, 8: 1.15, 12: 1.6, 6: 0.7 },
      wilderness: { settled: 0.45, frontier: 1.0, remote: 1.25, deepWild: 1.3 },
      roads: { roads: 0.45, trails: 1.0, offroad: 1.25 },
      markerTypes: { 'lake-monsters': 1.8, dungeons: 1.4, ruins: 1.3 },
      night: 1.55,
      excludeBiomes: [2, 10, 11],
    },
  },
  {
    id: 'ice-mephit',
    name: 'Ice mephit',
    shortName: 'the ice mephit',
    species: 'elemental',
    descriptor: 'a winged shard-thing of dirty blue ice, giggling through needle teeth while frost feathers the ground beneath it',
    difficulty: 'fair',
    ac: 11, hp: 12, speed: 30,
    abilityMods: { str: -2, dex: 1, con: 1, int: -1, wis: 0, cha: 0 },
    attacks: [
      { id: 'claws', name: 'Ice claws', verb: 'rakes', kind: 'melee', toHit: 3, damageDice: '1d4', damageBonus: 1, damageType: 'slashing' },
      { id: 'frost-breath', name: 'Frost breath', verb: 'blasts', kind: 'spell', save: { ability: 'dex', dc: 11 }, damageDice: '1d6', damageBonus: 0, damageType: 'cold' },
    ],
    escapeBonus: 3,
    bodyParts: WINGED,
    morale: 'wild',
    biomes: [2, 10, 11],
    encounter: {
      actorKinds: ['elemental'],
      biomeWeights: { 2: 1.25, 9: 0.75, 10: 1.45, 11: 1.7 },
      wilderness: { settled: 0.3, frontier: 0.9, remote: 1.3, deepWild: 1.45 },
      roads: { roads: 0.45, trails: 1.0, offroad: 1.35 },
      markerTypes: { dungeons: 1.4, ruins: 1.4 },
      winter: 1.7,
    },
  },
  {
    id: 'dust-mephit',
    name: 'Dust mephit',
    shortName: 'the dust mephit',
    species: 'elemental',
    descriptor: 'a spiteful little figure made of grit and ragged wings, shedding dust from every joint as it whispers insults',
    difficulty: 'easy',
    ac: 12, hp: 12, speed: 30,
    abilityMods: { str: -2, dex: 2, con: 0, int: -1, wis: 0, cha: 0 },
    attacks: [{ id: 'grit-claws', name: 'Grit claws', verb: 'scrapes', kind: 'melee', toHit: 4, damageDice: '1d4', damageBonus: 2, damageType: 'slashing' }],
    escapeBonus: 4,
    bodyParts: WINGED,
    morale: 'wild',
    biomes: [1, 2],
    encounter: {
      actorKinds: ['elemental'],
      biomeWeights: { 1: 1.65, 2: 1.15, 3: 0.55 },
      wilderness: { settled: 0.25, frontier: 0.9, remote: 1.35, deepWild: 1.45 },
      roads: { roads: 0.45, trails: 1.0, offroad: 1.35 },
      markerTypes: { dungeons: 1.6, ruins: 1.8 },
      night: 1.15,
      excludeBiomes: [7, 8, 10, 11, 12],
    },
  },
  {
    id: 'imp',
    name: 'Imp',
    shortName: 'the imp',
    species: 'fiend',
    descriptor: 'a red-black imp perched at shoulder height on buzzing wings, tail curling under it like a hooked question',
    difficulty: 'fair',
    ac: 13, hp: 10, speed: 20,
    abilityMods: { str: -2, dex: 3, con: 1, int: 0, wis: 1, cha: 2 },
    attacks: [{ id: 'sting', name: 'Sting', verb: 'stings', kind: 'melee', toHit: 5, damageDice: '1d4', damageBonus: 3, damageType: 'poison' }],
    escapeBonus: 5,
    bodyParts: WINGED,
    morale: 'steadfast',
    barks: {
      taunt: ['"Oh good. A hero."', '"Bleed bravely; it reads better."'],
      pain: ['"Mind the wings!"', '"Rude mortal!"'],
      panic: ['"Contractual withdrawal!"'],
    },
    biomes: [1, 3, 4, 5, 6],
    encounter: {
      actorKinds: ['fiend'],
      biomeWeights: { 1: 1.0, 3: 0.9, 4: 0.8, 5: 0.9, 6: 0.8, 8: 0.65, 12: 0.45 },
      wilderness: { settled: 0.95, frontier: 1.0, remote: 0.75, deepWild: 0.45 },
      roads: { roads: 0.8, trails: 1.0, offroad: 0.75 },
      markerTypes: { dungeons: 2.4, ruins: 2.0, brigands: 1.2 },
      night: 1.25,
      excludeBiomes: [2, 10, 11],
    },
  },
  {
    id: 'ghoul',
    name: 'Ghoul',
    shortName: 'the ghoul',
    species: 'undead',
    descriptor: 'a corpse-pale ghoul with grave dirt under its nails, crouched low as if listening to the blood move inside you',
    difficulty: 'hard',
    ac: 12, hp: 16, speed: 30,
    abilityMods: { str: 1, dex: 2, con: 0, int: -2, wis: 0, cha: -2 },
    attacks: [{ id: 'claws', name: 'Claws', verb: 'claws', kind: 'melee', toHit: 4, damageDice: '1d6', damageBonus: 2, damageType: 'slashing' }],
    escapeBonus: 3,
    bodyParts: HUMANOID,
    morale: 'fearless',
    biomes: [6, 8, 12],
    encounter: {
      actorKinds: ['undead'],
      biomeWeights: { 5: 0.6, 6: 0.9, 8: 1.0, 12: 1.3, 1: 0.55, 2: 0.65 },
      wilderness: { settled: 0.35, frontier: 0.9, remote: 1.25, deepWild: 1.2 },
      roads: { roads: 0.45, trails: 1.0, offroad: 1.25 },
      markerTypes: { dungeons: 2.6, ruins: 2.5 },
      night: 1.6,
    },
  },
  {
    id: 'sprite-archer',
    name: 'Sprite archer',
    shortName: 'the sprite',
    species: 'fey',
    descriptor: 'a hand-sized fey archer glimmering between leaves, dragonfly wings stilling as a needle-arrow finds its mark',
    difficulty: 'easy',
    ac: 15, hp: 4, speed: 10,
    abilityMods: { str: -4, dex: 4, con: -1, int: 2, wis: 1, cha: 1 },
    attacks: [{ id: 'needle-bow', name: 'Needle bow', verb: 'shoots', kind: 'ranged', toHit: 6, damageDice: '1d4', damageBonus: 2, damageType: 'piercing' }],
    escapeBonus: 6,
    bodyParts: WINGED,
    morale: 'craven',
    barks: {
      taunt: ['"Too loud."', '"Iron-stepper."'],
      pain: ['a chime-like cry', '"Cruel!"'],
      panic: ['"Bramble hide me!"'],
    },
    biomes: [5, 6, 7, 8],
    encounter: {
      actorKinds: ['fey'],
      biomeWeights: { 5: 1.1, 6: 1.2, 7: 1.25, 8: 1.35, 9: 0.5 },
      wilderness: { settled: 0.2, frontier: 0.85, remote: 1.35, deepWild: 1.55 },
      roads: { roads: 0.25, trails: 0.95, offroad: 1.45 },
      markerTypes: { ruins: 1.3 },
      night: 0.8,
      excludeBiomes: [1, 2, 10, 11, 12],
    },
  },
];

export function getMonster(id: string): Monster {
  const m = MONSTERS.find((x) => x.id === id);
  if (!m) throw new Error(`Unknown monster: ${id}`);
  return m;
}

/** Biome-appropriate default opponent for the battle test. */
export function defaultOpponentFor(biomeId: number, nearRoad: boolean): Monster {
  if (nearRoad) {
    const roadFoe = MONSTERS.find((m) => m.nearRoads && m.difficulty === 'fair' && m.biomes.includes(biomeId));
    if (roadFoe) return roadFoe;
  }
  const local = MONSTERS.filter((m) => m.biomes.includes(biomeId));
  const fair = local.find((m) => m.difficulty === 'fair') ?? local.find((m) => m.difficulty === 'easy');
  return fair ?? local[0] ?? getMonster('bandit');
}

export function buildEnemyCombatant(monster: Monster): Combatant {
  return {
    id: 'enemy',
    name: monster.name,
    shortName: monster.shortName,
    isPlayer: false,
    species: monster.species,
    descriptor: monster.descriptor,
    maxHp: monster.hp,
    hp: monster.hp,
    ac: monster.ac,
    speed: monster.speed,
    initiativeBonus: monster.abilityMods.dex,
    proficiency: 2,
    abilityMods: monster.abilityMods,
    attacks: monster.attacks,
    escapeBonus: monster.escapeBonus,
    bodyParts: monster.bodyParts,
    morale: monster.morale,
    barks: monster.barks,
    injuries: [],
    conditions: {},
    resources: { potions: 0 },
  };
}
