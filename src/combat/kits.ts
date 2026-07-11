/**
 * Class combat kits: builds the player's Combatant from a PlayerCharacter —
 * weapon attack, signature cantrip for casters, and level-1 features
 * (Second Wind, Rage, Feint, Martial Arts, heals).
 */
import type { PlayerCharacter, CharacterClassId, Ability } from '../player/types';
import { STARTING_WEAPON_BY_CLASS, getClassRule } from '../player/rules2024';
import { getCatalogItem, qualityRank } from '../economy/catalog';
import { weaponStats } from './weapons';
import type { Combatant, CombatantAttack, CombatantResources, PotionCharge } from './types';

/** Which base weapons are martial (the rest are simple). */
const MARTIAL_BASE = new Set(['battleaxe', 'longsword', 'rapier', 'shortsword']);

function proficientWithBase(pc: PlayerCharacter, baseId: string): boolean {
  const training = getClassRule(pc.classId).weaponTraining;
  return MARTIAL_BASE.has(baseId)
    ? training.some((t) => t.includes('Martial weapons'))
    : training.some((t) => t.includes('Simple weapons'));
}

/** The weapon the player fights with: the equipped one, else the class default. */
function equippedWeapon(pc: PlayerCharacter): { baseId: string; bonus: number } {
  const equipped = pc.inventory.find((i) => i.category === 'weapon' && i.equipped);
  const spec = equipped ? getCatalogItem(equipped.id)?.weapon : undefined;
  if (spec) return spec;
  return { baseId: STARTING_WEAPON_BY_CLASS[pc.classId].id, bonus: 0 };
}

/** Carried healing potions expanded to charges, strongest grade first. */
function buildPotionStack(pc: PlayerCharacter): PotionCharge[] {
  const charges: { charge: PotionCharge; rank: number }[] = [];
  for (const item of pc.inventory) {
    const cat = getCatalogItem(item.id);
    if (!cat?.heal) continue;
    for (let n = 0; n < item.quantity; n++) charges.push({ charge: { id: item.id, heal: cat.heal }, rank: qualityRank(cat.quality) });
  }
  charges.sort((a, b) => b.rank - a.rank);
  return charges.map((c) => c.charge);
}

interface CasterKit {
  cantrip?: CombatantAttack; // toHit/dc filled in at build time
  healSpells?: number;
  layOnHands?: number;
}

function cantripFor(classId: CharacterClassId, spellMod: number, prof: number): CombatantAttack | undefined {
  const dc = 8 + prof + spellMod;
  switch (classId) {
    case 'wizard':
    case 'sorcerer':
      return { id: 'fire-bolt', name: 'Fire Bolt', verb: 'scorches', kind: 'spell', toHit: prof + spellMod, damageDice: '1d10', damageBonus: 0, damageType: 'fire' };
    case 'warlock':
      return { id: 'eldritch-blast', name: 'Eldritch Blast', verb: 'blasts', kind: 'spell', toHit: prof + spellMod, damageDice: '1d10', damageBonus: 0, damageType: 'force' };
    case 'cleric':
      return { id: 'sacred-flame', name: 'Sacred Flame', verb: 'sears', kind: 'spell', save: { ability: 'dex', dc }, damageDice: '1d8', damageBonus: 0, damageType: 'radiant' };
    case 'druid':
      return { id: 'produce-flame', name: 'Produce Flame', verb: 'burns', kind: 'spell', toHit: prof + spellMod, damageDice: '1d8', damageBonus: 0, damageType: 'fire' };
    case 'bard':
      return { id: 'vicious-mockery', name: 'Vicious Mockery', verb: 'lacerates', kind: 'spell', save: { ability: 'wis', dc }, damageDice: '1d6', damageBonus: 0, damageType: 'psychic', rider: 'mockery-disadvantage' };
    default:
      return undefined;
  }
}

const SPELL_ABILITY: Partial<Record<CharacterClassId, Ability>> = {
  wizard: 'int',
  sorcerer: 'cha',
  warlock: 'cha',
  cleric: 'wis',
  druid: 'wis',
  bard: 'cha',
  paladin: 'cha',
  ranger: 'wis',
};

function casterKit(classId: CharacterClassId, pc: PlayerCharacter): CasterKit {
  const spellAbility = SPELL_ABILITY[classId];
  const spellMod = spellAbility ? pc.abilityModifiers[spellAbility] : 0;
  const kit: CasterKit = { cantrip: cantripFor(classId, spellMod, pc.proficiencyBonus) };
  if (classId === 'cleric' || classId === 'druid' || classId === 'bard') kit.healSpells = 2;
  if (classId === 'paladin') kit.layOnHands = 5;
  return kit;
}

export const PLAYER_BODY_PARTS: [string, number][] = [
  ['scalp', 1], ['brow', 1], ['jaw', 1], ['throat', 1],
  ['shoulder', 2], ['upper arm', 2], ['forearm', 3], ['hand', 2],
  ['ribs', 3], ['chest', 2], ['gut', 2], ['flank', 2], ['hip', 1],
  ['thigh', 3], ['knee', 1], ['shin', 2], ['calf', 1],
];

/** Best of Athletics(STR)/Acrobatics(DEX), proficiency counted when trained. */
export function escapeBonusFor(pc: PlayerCharacter): number {
  const athletics = pc.abilityModifiers.str + (pc.skillProficiencies.includes('athletics') ? pc.proficiencyBonus : 0);
  const acrobatics = pc.abilityModifiers.dex + (pc.skillProficiencies.includes('acrobatics') ? pc.proficiencyBonus : 0);
  return Math.max(athletics, acrobatics);
}

export function buildPlayerCombatant(pc: PlayerCharacter): Combatant {
  const weapon = equippedWeapon(pc);
  const stats = weaponStats(weapon.baseId);
  const proficient = proficientWithBase(pc, weapon.baseId);
  const abilityMod = stats.finesse
    ? Math.max(pc.abilityModifiers.str, pc.abilityModifiers.dex)
    : pc.abilityModifiers.str;

  const attacks: CombatantAttack[] = [
    {
      id: stats.id,
      name: weapon.bonus > 0 ? `${stats.name} +${weapon.bonus}` : stats.name,
      verb: stats.verb,
      kind: 'melee',
      toHit: abilityMod + (proficient ? pc.proficiencyBonus : 0) + weapon.bonus,
      damageDice: stats.damageDice,
      damageBonus: abilityMod + weapon.bonus,
      damageType: stats.damageType,
    },
  ];

  const kit = casterKit(pc.classId, pc);
  if (kit.cantrip) attacks.push(kit.cantrip);

  const potionStack = buildPotionStack(pc);
  const resources: CombatantResources = { potions: potionStack.length, potionStack };
  if (pc.classId === 'fighter') resources.secondWind = 1;
  if (pc.classId === 'barbarian') resources.rage = 1;
  if (pc.classId === 'rogue') resources.feintAvailable = true;
  if (pc.classId === 'monk') resources.martialArts = true;
  if (kit.healSpells) resources.healSpells = kit.healSpells;
  if (kit.layOnHands) resources.layOnHands = kit.layOnHands;

  return {
    id: 'player',
    name: pc.name,
    shortName: 'you',
    isPlayer: true,
    species: pc.speciesName,
    descriptor: `${pc.speciesName} ${pc.className.toLowerCase()}, ${pc.backgroundName.toLowerCase()} by trade — ${pc.backstoryTitle.toLowerCase()}`,
    maxHp: pc.maxHp,
    hp: pc.maxHp,
    ac: pc.armorClass,
    speed: pc.speed,
    initiativeBonus: pc.abilityModifiers.dex,
    proficiency: pc.proficiencyBonus,
    abilityMods: pc.abilityModifiers,
    attacks,
    escapeBonus: escapeBonusFor(pc),
    bodyParts: PLAYER_BODY_PARTS,
    morale: 'steadfast',
    injuries: [],
    conditions: {},
    resources,
  };
}

/** Monk bonus unarmed strike, built against the player's stats. */
export function martialArtsAttack(pc: Combatant): CombatantAttack {
  const mod = Math.max(pc.abilityMods.str, pc.abilityMods.dex);
  return {
    id: 'martial-arts',
    name: 'Unarmed strike',
    verb: 'hammers',
    kind: 'melee',
    toHit: mod + pc.proficiency,
    damageDice: '1d6',
    damageBonus: mod,
    damageType: 'bludgeoning',
  };
}
