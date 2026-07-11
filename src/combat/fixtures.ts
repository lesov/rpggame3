/** Test fixtures: hand-built PlayerCharacter and CombatScene (no WorldData needed). */
import type { CharacterClassId, PlayerCharacter } from '../player/types';
import { getClassRule, abilityModifiers, startingInventoryForCharacter } from '../player/rules2024';
import type { CombatScene } from './types';

export function makeTestCharacter(classId: CharacterClassId = 'fighter'): PlayerCharacter {
  const cls = getClassRule(classId);
  const scores = { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 };
  const mods = abilityModifiers(scores);
  return {
    id: `pc-test-${classId}`,
    name: 'Testovar',
    gender: 'male',
    level: 1,
    xp: 0,
    classId,
    className: cls.name,
    speciesId: 'human',
    speciesName: 'Human',
    backgroundId: 'soldier',
    backgroundName: 'Soldier',
    backstoryId: 'duhi_washout',
    backstoryTitle: 'Duhi Troupe Washout',
    nationalityId: 1,
    nationalityName: 'Shaterian Theocracy',
    religionId: 2,
    religionName: 'Pudrockan Church',
    cultureName: 'Litbarow (Gnome)',
    abilityScores: scores,
    abilityModifiers: mods,
    proficiencyBonus: 2,
    maxHp: Math.max(1, cls.hitDie + mods.con),
    armorClass: 10 + mods.dex,
    speed: 30,
    savingThrows: cls.savingThrows,
    skillProficiencies: ['athletics', 'intimidation'],
    languages: ['Common'],
    originFeat: 'Savage Attacker',
    levelOneFeatures: cls.levelOneFeatures,
    story: 'A test subject.',
    powerExplanation: 'Training.',
    minorBonus: { name: 'Test bonus', description: 'None.' },
    inventory: startingInventoryForCharacter(classId, 10),
    reputations: {
      cultures: [{ kind: 'culture', id: 1, name: 'Litbarow (Gnome)', score: 0, label: 'Neutral' }],
      religions: [{ kind: 'religion', id: 2, name: 'Pudrockan Church', score: 0, label: 'Neutral' }],
    },
    location: {
      cellId: 5000,
      x: 761,
      y: 427,
      stateId: 32,
      stateName: 'Sio Empire',
      placeName: 'Rhakorash Savanna',
      reason: 'test',
    },
    createdAt: { year: 1181, month: 1, day: 1 },
  };
}

export function makeTestScene(): CombatScene {
  return {
    placeName: 'Rhakorash Savanna',
    biome: 'Savanna',
    terrainNotes: ['tall dry grass', '12 mi from Rharakar'],
    stateName: 'Sio Empire',
    weather: {
      tempC: 24,
      tempF: 75,
      condition: 'Partly cloudy',
      precipitating: false,
      windDirDeg: 220,
      windCompass: 'SW',
      windMph: 9,
      description: 'Partly cloudy, mild.',
    },
    season: 'Winter',
    timeOfDay: 'mid-afternoon',
    light: 'bright',
    date: { year: 1181, month: 1, day: 1 },
    isWinter: true,
  };
}
