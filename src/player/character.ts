import type { WorldData } from '../data/worldLoader';
import { START_DATE, type GameDate } from '../sim/calendar';
import { getBackstory } from './backgrounds';
import {
  abilityModifiers,
  getBackgroundRule,
  getClassRule,
  getSpeciesRule,
  startingInventoryForClimate,
  validateAbilityScores,
} from './rules2024';
import { chooseStartingLocation } from './spawn';
import type { CharacterBuildInput, CharacterClassId, PlayerCharacter, Skill } from './types';

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'player';
}

function uniqueSkills(skills: Skill[]): Skill[] {
  return skills.filter((skill, i) => skills.indexOf(skill) === i);
}

function classTrainingLine(classId: CharacterClassId): string {
  switch (classId) {
    case 'barbarian':
      return 'Your harsh physical training and battle-rage rituals are already part of your instincts.';
    case 'bard':
      return 'Years of performance, lore, and subtle magic taught you how to turn nerve and timing into power.';
    case 'cleric':
      return 'Temple discipline, sacred study, and battlefield rites prepared you to channel divine magic under strain.';
    case 'druid':
      return 'Circle training taught you primal rites, patient observation, and survival habits that hold even without equipment.';
    case 'fighter':
      return 'Weapon drills, guard work, and hard fights left you with the habits of a trained combatant.';
    case 'monk':
      return 'Monastic drills, breath control, and unarmed forms remain with you even after everything else was taken.';
    case 'paladin':
      return 'Oath lessons, martial practice, and sacred duty shaped you before exile or disaster stripped away your arms.';
    case 'ranger':
      return 'Trail work, hunting practice, and border service taught you how to read danger before it closes.';
    case 'rogue':
      return 'Street training, stealth practice, and quick judgment taught you to survive without relying on possessions.';
    case 'sorcerer':
      return 'Your innate magic has surfaced under stress often enough that you can call on it deliberately.';
    case 'warlock':
      return 'Your pact lessons left marks on your will and memory that no confiscated gear can remove.';
    case 'wizard':
      return 'Arcane study, notation drills, and practiced cantrips remain in your mind even without a spellbook in hand.';
    default:
      return 'Your training remains with you even after your gear is gone.';
  }
}

export function validateCharacterInput(input: CharacterBuildInput): string[] {
  const errors: string[] = [];
  if (!input.name.trim()) errors.push('Name is required.');
  errors.push(...validateAbilityScores(input.abilityScores));
  const cls = getClassRule(input.classId);
  const classSkills = input.skillProficiencies ?? [];
  const invalidSkill = classSkills.find((skill) => !cls.skillChoices.includes(skill));
  if (invalidSkill) errors.push(`${invalidSkill} is not available to ${cls.name}.`);
  if (uniqueSkills(classSkills).length < cls.skillCount) errors.push(`${cls.name} requires ${cls.skillCount} class skill choices.`);
  return errors;
}

export function buildPlayerCharacter(
  input: CharacterBuildInput,
  wd: WorldData,
  createdAt: GameDate = START_DATE,
): PlayerCharacter {
  const errors = validateCharacterInput(input);
  if (errors.length > 0) throw new Error(errors.join(' '));

  const cls = getClassRule(input.classId);
  const species = getSpeciesRule(input.speciesId);
  const background = getBackgroundRule(input.backgroundId);
  const backstory = getBackstory(input.backstoryId);
  const state = wd.stateById.get(input.nationalityId);
  const religion = wd.religionById.get(input.religionId);
  if (!state) throw new Error(`Unknown nationality: ${input.nationalityId}`);
  if (!religion) throw new Error(`Unknown religion: ${input.religionId}`);

  const culture = wd.cultureById.get(state.culture);
  const mods = abilityModifiers(input.abilityScores);
  const classSkillChoices = uniqueSkills(input.skillProficiencies ?? cls.skillChoices).slice(0, cls.skillCount);
  const skillProficiencies = uniqueSkills([...background.skillProficiencies, ...classSkillChoices]);
  const location = chooseStartingLocation(wd, state.i, religion.i, backstory.id, input.name);
  const startClimate = wd.climateOf(location.cellId);
  const trainingLine = classTrainingLine(cls.id);
  const conMod = mods.con;

  return {
    id: `pc-${slug(input.name)}-${state.i}-${input.classId}`,
    name: input.name.trim(),
    level: 1,
    xp: 0,
    classId: cls.id,
    className: cls.name,
    speciesId: species.id,
    speciesName: species.name,
    backgroundId: background.id,
    backgroundName: background.name,
    backstoryId: backstory.id,
    backstoryTitle: backstory.title,
    nationalityId: state.i,
    nationalityName: state.fullName ?? state.name,
    religionId: religion.i,
    religionName: religion.name,
    cultureName: culture?.name,
    abilityScores: input.abilityScores,
    abilityModifiers: mods,
    proficiencyBonus: 2,
    maxHp: Math.max(1, cls.hitDie + conMod),
    armorClass: 10 + mods.dex,
    speed: species.speed,
    savingThrows: cls.savingThrows,
    skillProficiencies,
    languages: buildPlayerLanguages(input, wd),
    originFeat: background.feat,
    levelOneFeatures: cls.levelOneFeatures,
    story: `${backstory.premise} ${trainingLine}`,
    powerExplanation: trainingLine,
    minorBonus: backstory.minorBonus,
    inventory: startingInventoryForClimate(startClimate.temp),
    location,
    createdAt,
  };
}

export function buildPlayerLanguages(input: CharacterBuildInput, wd: WorldData): string[] {
  const background = getBackgroundRule(input.backgroundId);
  const state = wd.stateById.get(input.nationalityId);
  const culture = state ? wd.cultureById.get(state.culture) : undefined;
  return ['Common', background.language, culture?.name ? `${culture.name} tongue` : undefined, 'Lepasoul trade cant'].filter(
    (language, i, arr): language is string => Boolean(language) && arr.indexOf(language) === i,
  );
}
