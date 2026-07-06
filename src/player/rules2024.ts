import {
  ABILITIES,
  type Ability,
  type AbilityScores,
  type BackgroundRule,
  type CharacterClassId,
  type ClassRule,
  type OriginBackgroundId,
  type Skill,
  type SpeciesId,
  type SpeciesRule,
} from './types';

export const SKILL_LABELS: Record<Skill, string> = {
  acrobatics: 'Acrobatics',
  animalHandling: 'Animal Handling',
  arcana: 'Arcana',
  athletics: 'Athletics',
  deception: 'Deception',
  history: 'History',
  insight: 'Insight',
  intimidation: 'Intimidation',
  investigation: 'Investigation',
  medicine: 'Medicine',
  nature: 'Nature',
  perception: 'Perception',
  performance: 'Performance',
  persuasion: 'Persuasion',
  religion: 'Religion',
  sleightOfHand: 'Sleight of Hand',
  stealth: 'Stealth',
  survival: 'Survival',
};

export const ABILITY_LABELS: Record<Ability, string> = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
};

export const CLASS_RULES: ClassRule[] = [
  {
    id: 'barbarian',
    name: 'Barbarian',
    hitDie: 12,
    primaryAbilities: ['str', 'con'],
    savingThrows: ['str', 'con'],
    skillChoices: ['animalHandling', 'athletics', 'intimidation', 'nature', 'perception', 'survival'],
    skillCount: 2,
    armorTraining: ['Light armor', 'Medium armor', 'Shields'],
    weaponTraining: ['Simple weapons', 'Martial weapons'],
    levelOneFeatures: ['Rage', 'Unarmored Defense', 'Weapon Mastery'],
  },
  {
    id: 'bard',
    name: 'Bard',
    hitDie: 8,
    primaryAbilities: ['cha', 'dex'],
    savingThrows: ['dex', 'cha'],
    skillChoices: Object.keys(SKILL_LABELS) as Skill[],
    skillCount: 3,
    armorTraining: ['Light armor'],
    weaponTraining: ['Simple weapons'],
    levelOneFeatures: ['Bardic Inspiration', 'Spellcasting'],
  },
  {
    id: 'cleric',
    name: 'Cleric',
    hitDie: 8,
    primaryAbilities: ['wis', 'con'],
    savingThrows: ['wis', 'cha'],
    skillChoices: ['history', 'insight', 'medicine', 'persuasion', 'religion'],
    skillCount: 2,
    armorTraining: ['Light armor', 'Medium armor', 'Shields'],
    weaponTraining: ['Simple weapons'],
    levelOneFeatures: ['Divine Order', 'Spellcasting'],
  },
  {
    id: 'druid',
    name: 'Druid',
    hitDie: 8,
    primaryAbilities: ['wis', 'con'],
    savingThrows: ['int', 'wis'],
    skillChoices: ['animalHandling', 'arcana', 'insight', 'medicine', 'nature', 'perception', 'religion', 'survival'],
    skillCount: 2,
    armorTraining: ['Light armor', 'Medium armor', 'Shields'],
    weaponTraining: ['Simple weapons'],
    levelOneFeatures: ['Druidic', 'Primal Order', 'Spellcasting'],
  },
  {
    id: 'fighter',
    name: 'Fighter',
    hitDie: 10,
    primaryAbilities: ['str', 'dex', 'con'],
    savingThrows: ['str', 'con'],
    skillChoices: ['acrobatics', 'animalHandling', 'athletics', 'history', 'insight', 'intimidation', 'perception', 'survival'],
    skillCount: 2,
    armorTraining: ['Light armor', 'Medium armor', 'Heavy armor', 'Shields'],
    weaponTraining: ['Simple weapons', 'Martial weapons'],
    levelOneFeatures: ['Fighting Style', 'Second Wind', 'Weapon Mastery'],
  },
  {
    id: 'monk',
    name: 'Monk',
    hitDie: 8,
    primaryAbilities: ['dex', 'wis'],
    savingThrows: ['str', 'dex'],
    skillChoices: ['acrobatics', 'athletics', 'history', 'insight', 'religion', 'stealth'],
    skillCount: 2,
    armorTraining: [],
    weaponTraining: ['Simple weapons', 'Martial weapons with light property'],
    levelOneFeatures: ['Martial Arts', 'Unarmored Defense'],
  },
  {
    id: 'paladin',
    name: 'Paladin',
    hitDie: 10,
    primaryAbilities: ['str', 'cha'],
    savingThrows: ['wis', 'cha'],
    skillChoices: ['athletics', 'insight', 'intimidation', 'medicine', 'persuasion', 'religion'],
    skillCount: 2,
    armorTraining: ['Light armor', 'Medium armor', 'Heavy armor', 'Shields'],
    weaponTraining: ['Simple weapons', 'Martial weapons'],
    levelOneFeatures: ['Lay on Hands', 'Spellcasting', 'Weapon Mastery'],
  },
  {
    id: 'ranger',
    name: 'Ranger',
    hitDie: 10,
    primaryAbilities: ['dex', 'wis'],
    savingThrows: ['str', 'dex'],
    skillChoices: ['animalHandling', 'athletics', 'insight', 'investigation', 'nature', 'perception', 'stealth', 'survival'],
    skillCount: 3,
    armorTraining: ['Light armor', 'Medium armor', 'Shields'],
    weaponTraining: ['Simple weapons', 'Martial weapons'],
    levelOneFeatures: ['Favored Enemy', 'Spellcasting', 'Weapon Mastery'],
  },
  {
    id: 'rogue',
    name: 'Rogue',
    hitDie: 8,
    primaryAbilities: ['dex', 'int'],
    savingThrows: ['dex', 'int'],
    skillChoices: ['acrobatics', 'athletics', 'deception', 'insight', 'intimidation', 'investigation', 'perception', 'persuasion', 'sleightOfHand', 'stealth'],
    skillCount: 4,
    armorTraining: ['Light armor'],
    weaponTraining: ['Simple weapons', 'Martial weapons with finesse or light property'],
    levelOneFeatures: ['Expertise', 'Sneak Attack', 'Thieves\' Cant', 'Weapon Mastery'],
  },
  {
    id: 'sorcerer',
    name: 'Sorcerer',
    hitDie: 6,
    primaryAbilities: ['cha', 'con'],
    savingThrows: ['con', 'cha'],
    skillChoices: ['arcana', 'deception', 'insight', 'intimidation', 'persuasion', 'religion'],
    skillCount: 2,
    armorTraining: [],
    weaponTraining: ['Simple weapons'],
    levelOneFeatures: ['Innate Sorcery', 'Spellcasting'],
  },
  {
    id: 'warlock',
    name: 'Warlock',
    hitDie: 8,
    primaryAbilities: ['cha', 'con'],
    savingThrows: ['wis', 'cha'],
    skillChoices: ['arcana', 'deception', 'history', 'intimidation', 'investigation', 'nature', 'religion'],
    skillCount: 2,
    armorTraining: ['Light armor'],
    weaponTraining: ['Simple weapons'],
    levelOneFeatures: ['Eldritch Invocations', 'Pact Magic'],
  },
  {
    id: 'wizard',
    name: 'Wizard',
    hitDie: 6,
    primaryAbilities: ['int', 'con'],
    savingThrows: ['int', 'wis'],
    skillChoices: ['arcana', 'history', 'insight', 'investigation', 'medicine', 'religion'],
    skillCount: 2,
    armorTraining: [],
    weaponTraining: ['Simple weapons'],
    levelOneFeatures: ['Ritual Adept', 'Spellcasting'],
  },
];

export const SPECIES_RULES: SpeciesRule[] = [
  { id: 'aasimar', name: 'Aasimar', speed: 30, size: 'Small or Medium', traits: ['Celestial Resistance', 'Darkvision', 'Healing Hands', 'Light Bearer'] },
  { id: 'dragonborn', name: 'Dragonborn', speed: 30, size: 'Medium', traits: ['Breath Weapon', 'Damage Resistance', 'Darkvision'] },
  { id: 'dwarf', name: 'Dwarf', speed: 30, size: 'Medium', traits: ['Darkvision', 'Dwarven Resilience', 'Dwarven Toughness', 'Stonecunning'] },
  { id: 'elf', name: 'Elf', speed: 30, size: 'Medium', traits: ['Darkvision', 'Elven Lineage', 'Fey Ancestry', 'Keen Senses', 'Trance'] },
  { id: 'gnome', name: 'Gnome', speed: 30, size: 'Small or Medium', traits: ['Darkvision', 'Gnomish Cunning', 'Gnomish Lineage'] },
  { id: 'goliath', name: 'Goliath', speed: 35, size: 'Medium', traits: ['Giant Ancestry', 'Large Form', 'Powerful Build'] },
  { id: 'halfling', name: 'Halfling', speed: 30, size: 'Small or Medium', traits: ['Brave', 'Halfling Nimbleness', 'Luck', 'Naturally Stealthy'] },
  { id: 'human', name: 'Human', speed: 30, size: 'Small or Medium', traits: ['Resourceful', 'Skillful', 'Versatile'] },
  { id: 'orc', name: 'Orc', speed: 30, size: 'Medium', traits: ['Adrenaline Rush', 'Darkvision', 'Relentless Endurance'] },
  { id: 'tiefling', name: 'Tiefling', speed: 30, size: 'Small or Medium', traits: ['Darkvision', 'Fiendish Legacy', 'Otherworldly Presence'] },
];

export const BACKGROUND_RULES: BackgroundRule[] = [
  { id: 'acolyte', name: 'Acolyte', abilities: ['int', 'wis', 'cha'], feat: 'Magic Initiate (Cleric)', skillProficiencies: ['insight', 'religion'], toolProficiency: 'Calligrapher\'s Supplies', language: 'Celestial' },
  { id: 'artisan', name: 'Artisan', abilities: ['str', 'dex', 'int'], feat: 'Crafter', skillProficiencies: ['investigation', 'persuasion'], toolProficiency: 'Artisan\'s Tools', language: 'Gnomish' },
  { id: 'charlatan', name: 'Charlatan', abilities: ['dex', 'con', 'cha'], feat: 'Skilled', skillProficiencies: ['deception', 'sleightOfHand'], toolProficiency: 'Forgery Kit', language: 'Infernal' },
  { id: 'criminal', name: 'Criminal', abilities: ['dex', 'con', 'int'], feat: 'Alert', skillProficiencies: ['sleightOfHand', 'stealth'], toolProficiency: 'Thieves\' Tools', language: 'Thieves\' Cant' },
  { id: 'entertainer', name: 'Entertainer', abilities: ['str', 'dex', 'cha'], feat: 'Musician', skillProficiencies: ['acrobatics', 'performance'], toolProficiency: 'Musical Instrument', language: 'Elvish' },
  { id: 'farmer', name: 'Farmer', abilities: ['str', 'con', 'wis'], feat: 'Tough', skillProficiencies: ['animalHandling', 'nature'], toolProficiency: 'Carpenter\'s Tools', language: 'Halfling' },
  { id: 'guard', name: 'Guard', abilities: ['str', 'int', 'wis'], feat: 'Alert', skillProficiencies: ['athletics', 'perception'], toolProficiency: 'Gaming Set', language: 'Orc' },
  { id: 'guide', name: 'Guide', abilities: ['dex', 'con', 'wis'], feat: 'Magic Initiate (Druid)', skillProficiencies: ['stealth', 'survival'], toolProficiency: 'Cartographer\'s Tools', language: 'Giant' },
  { id: 'hermit', name: 'Hermit', abilities: ['con', 'wis', 'cha'], feat: 'Healer', skillProficiencies: ['medicine', 'religion'], toolProficiency: 'Herbalism Kit', language: 'Sylvan' },
  { id: 'merchant', name: 'Merchant', abilities: ['con', 'int', 'cha'], feat: 'Lucky', skillProficiencies: ['animalHandling', 'persuasion'], toolProficiency: 'Navigator\'s Tools', language: 'Dwarvish' },
  { id: 'noble', name: 'Noble', abilities: ['str', 'int', 'cha'], feat: 'Skilled', skillProficiencies: ['history', 'persuasion'], toolProficiency: 'Gaming Set', language: 'Draconic' },
  { id: 'sage', name: 'Sage', abilities: ['con', 'int', 'wis'], feat: 'Magic Initiate (Wizard)', skillProficiencies: ['arcana', 'history'], toolProficiency: 'Calligrapher\'s Supplies', language: 'Primordial' },
  { id: 'sailor', name: 'Sailor', abilities: ['str', 'dex', 'wis'], feat: 'Tavern Brawler', skillProficiencies: ['acrobatics', 'perception'], toolProficiency: 'Navigator\'s Tools', language: 'Auran' },
  { id: 'scribe', name: 'Scribe', abilities: ['dex', 'int', 'wis'], feat: 'Skilled', skillProficiencies: ['investigation', 'perception'], toolProficiency: 'Calligrapher\'s Supplies', language: 'Draconic' },
  { id: 'soldier', name: 'Soldier', abilities: ['str', 'dex', 'con'], feat: 'Savage Attacker', skillProficiencies: ['athletics', 'intimidation'], toolProficiency: 'Gaming Set', language: 'Goblin' },
  { id: 'wayfarer', name: 'Wayfarer', abilities: ['dex', 'wis', 'cha'], feat: 'Lucky', skillProficiencies: ['insight', 'stealth'], toolProficiency: 'Thieves\' Tools', language: 'Halfling' },
];

export const LIGHT_STARTING_INVENTORY = [
  { id: 'robe', name: 'Plain robe', quantity: 1, category: 'clothing' as const, equipped: true, note: 'Coarse, travel-stained, and intentionally unmarked.' },
  { id: 'sandals', name: 'Worn sandals', quantity: 1, category: 'clothing' as const, equipped: true, note: 'Enough for the road, barely.' },
];

export const COLD_STARTING_INVENTORY = [
  { id: 'shoes', name: 'Worn shoes', quantity: 1, category: 'clothing' as const, equipped: true, note: 'Scuffed, serviceable, and not worth stealing.' },
  { id: 'coat', name: 'Plain coat', quantity: 1, category: 'clothing' as const, equipped: true, note: 'Heavy enough for cold roads, but plain and unmarked.' },
];

export function isColdStartingClimate(tempC: number): boolean {
  return tempC <= 5;
}

export function startingInventoryForClimate(tempC: number) {
  const inventory = isColdStartingClimate(tempC) ? COLD_STARTING_INVENTORY : LIGHT_STARTING_INVENTORY;
  return inventory.map((item) => ({ ...item }));
}

export function getClassRule(id: CharacterClassId): ClassRule {
  const rule = CLASS_RULES.find((c) => c.id === id);
  if (!rule) throw new Error(`Unknown class: ${id}`);
  return rule;
}

export function getSpeciesRule(id: SpeciesId): SpeciesRule {
  const rule = SPECIES_RULES.find((s) => s.id === id);
  if (!rule) throw new Error(`Unknown species: ${id}`);
  return rule;
}

export function getBackgroundRule(id: OriginBackgroundId): BackgroundRule {
  const rule = BACKGROUND_RULES.find((b) => b.id === id);
  if (!rule) throw new Error(`Unknown background: ${id}`);
  return rule;
}

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function abilityModifiers(scores: AbilityScores): AbilityScores {
  return Object.fromEntries(ABILITIES.map((a) => [a, abilityModifier(scores[a])])) as AbilityScores;
}

export function proficiencyBonusForLevel(level: number): number {
  return 2 + Math.floor((Math.max(1, level) - 1) / 4);
}

export function suggestAbilityScores(classId: CharacterClassId, backgroundId: OriginBackgroundId): AbilityScores {
  const cls = getClassRule(classId);
  const bg = getBackgroundRule(backgroundId);
  const scores = Object.fromEntries(ABILITIES.map((a) => [a, 8])) as AbilityScores;
  const order = [...cls.primaryAbilities, ...bg.abilities, ...ABILITIES].filter(
    (a, i, arr) => arr.indexOf(a) === i,
  );
  const standard = [15, 14, 13, 12, 10, 8];
  order.slice(0, 6).forEach((ability, i) => {
    scores[ability] = standard[i];
  });

  const boosted = [...bg.abilities].sort((a, b) => {
    const classA = cls.primaryAbilities.includes(a) ? 0 : 1;
    const classB = cls.primaryAbilities.includes(b) ? 0 : 1;
    return classA - classB || scores[b] - scores[a];
  });
  if (boosted[0]) scores[boosted[0]] = Math.min(17, scores[boosted[0]] + 2);
  if (boosted[1]) scores[boosted[1]] = Math.min(17, scores[boosted[1]] + 1);
  return scores;
}

export function validateAbilityScores(scores: AbilityScores): string[] {
  const errors: string[] = [];
  for (const ability of ABILITIES) {
    const score = scores[ability];
    if (!Number.isInteger(score)) errors.push(`${ABILITY_LABELS[ability]} must be a whole number.`);
    if (score < 3 || score > 20) errors.push(`${ABILITY_LABELS[ability]} must be between 3 and 20.`);
  }
  return errors;
}
