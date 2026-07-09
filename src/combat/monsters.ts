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
    const roadFoe = MONSTERS.find((m) => m.nearRoads && m.difficulty === 'fair');
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
