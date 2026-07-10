import type { GameDate } from '../sim/calendar';

export const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
export type Ability = (typeof ABILITIES)[number];

export type AbilityScores = Record<Ability, number>;
export type Skill =
  | 'acrobatics'
  | 'animalHandling'
  | 'arcana'
  | 'athletics'
  | 'deception'
  | 'history'
  | 'insight'
  | 'intimidation'
  | 'investigation'
  | 'medicine'
  | 'nature'
  | 'perception'
  | 'performance'
  | 'persuasion'
  | 'religion'
  | 'sleightOfHand'
  | 'stealth'
  | 'survival';

export type CharacterClassId =
  | 'barbarian'
  | 'bard'
  | 'cleric'
  | 'druid'
  | 'fighter'
  | 'monk'
  | 'paladin'
  | 'ranger'
  | 'rogue'
  | 'sorcerer'
  | 'warlock'
  | 'wizard';

export type SpeciesId =
  | 'aasimar'
  | 'dragonborn'
  | 'dwarf'
  | 'elf'
  | 'gnome'
  | 'goliath'
  | 'halfling'
  | 'human'
  | 'orc'
  | 'tiefling';

export type OriginBackgroundId =
  | 'acolyte'
  | 'artisan'
  | 'charlatan'
  | 'criminal'
  | 'entertainer'
  | 'farmer'
  | 'guard'
  | 'guide'
  | 'hermit'
  | 'merchant'
  | 'noble'
  | 'sage'
  | 'sailor'
  | 'scribe'
  | 'soldier'
  | 'wayfarer';

export type BackstoryId =
  | 'escaped_prisoner'
  | 'failed_initiate'
  | 'battlefield_witness'
  | 'shipwrecked_pilgrim'
  | 'exiled_heir'
  | 'wild_omen';

export type SpawnPreference = 'wilderness' | 'settlement-edge' | 'coast' | 'border' | 'faith-center' | 'remote';

export interface ClassRule {
  id: CharacterClassId;
  name: string;
  hitDie: number;
  primaryAbilities: Ability[];
  savingThrows: Ability[];
  skillChoices: Skill[];
  skillCount: number;
  armorTraining: string[];
  weaponTraining: string[];
  levelOneFeatures: string[];
}

export interface SpeciesRule {
  id: SpeciesId;
  name: string;
  speed: number;
  size: 'Small or Medium' | 'Medium';
  traits: string[];
}

export interface BackgroundRule {
  id: OriginBackgroundId;
  name: string;
  abilities: Ability[];
  feat: string;
  skillProficiencies: Skill[];
  toolProficiency: string;
  language: string;
}

export interface BackstoryRule {
  id: BackstoryId;
  title: string;
  premise: string;
  powerExplanation: string;
  minorBonus: {
    name: string;
    description: string;
  };
  suggestedBackgrounds: OriginBackgroundId[];
  spawnPreference: SpawnPreference;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  category: 'clothing' | 'weapon' | 'armor' | 'tool' | 'gear' | 'consumable' | 'coin';
  equipped?: boolean;
  note?: string;
}

export interface PlayerLocation {
  cellId: number;
  x: number;
  y: number;
  stateId: number;
  stateName: string;
  placeName: string;
  reason: string;
}

export type ReputationKind = 'culture' | 'religion';
export type ReputationLabel = 'Hated' | 'Hostile' | 'Wary' | 'Neutral' | 'Favored' | 'Revered';

export interface ReputationEntry {
  kind: ReputationKind;
  id: number;
  name: string;
  score: number;
  label: ReputationLabel;
}

export interface PlayerReputations {
  cultures: ReputationEntry[];
  religions: ReputationEntry[];
}

export interface PlayerCharacter {
  id: string;
  name: string;
  level: 1;
  xp: 0;
  classId: CharacterClassId;
  className: string;
  speciesId: SpeciesId;
  speciesName: string;
  backgroundId: OriginBackgroundId;
  backgroundName: string;
  backstoryId: BackstoryId;
  backstoryTitle: string;
  nationalityId: number;
  nationalityName: string;
  religionId: number;
  religionName: string;
  cultureId?: number;
  cultureName?: string;
  abilityScores: AbilityScores;
  abilityModifiers: AbilityScores;
  proficiencyBonus: 2;
  maxHp: number;
  armorClass: number;
  speed: number;
  savingThrows: Ability[];
  skillProficiencies: Skill[];
  languages: string[];
  originFeat: string;
  levelOneFeatures: string[];
  story: string;
  powerExplanation: string;
  minorBonus: BackstoryRule['minorBonus'];
  inventory: InventoryItem[];
  reputations: PlayerReputations;
  location: PlayerLocation;
  createdAt: GameDate;
}

export interface CharacterBuildInput {
  name: string;
  classId: CharacterClassId;
  speciesId: SpeciesId;
  backgroundId: OriginBackgroundId;
  backstoryId: BackstoryId;
  nationalityId: number;
  religionId: number;
  abilityScores: AbilityScores;
  skillProficiencies?: Skill[];
}

export interface PregenCharacter {
  id: string;
  name: string;
  summary: string;
  input: Omit<CharacterBuildInput, 'nationalityId' | 'religionId'> & {
    nationalityId: number;
    religionId: number;
  };
}
