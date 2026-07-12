import { describe, expect, it } from 'vitest';
import type { WorldData } from '../data/worldLoader';
import { START_DATE } from '../sim/calendar';
import { buildPlayerCharacter, validateCharacterInput } from './character';
import { PREGENERATED_CHARACTERS } from './pregens';
import { reputationLabel } from './reputation';
import { CLASS_RULES, isWeaponProficientForClass, startingWeaponForClass, suggestAbilityScores } from './rules2024';
import { chooseStartingLocation } from './spawn';
import type { CharacterBuildInput, CharacterClassId, OriginBackgroundId, Skill } from './types';

function makeWorld(tempC = 10): WorldData {
  const cells = [
    { i: 0, p: [0, 0], poly: [], c: [1], h: 10, t: -2, f: 1, biome: 0, state: 0, province: 0, culture: 0, religion: 0, pop: 0, burg: 0, r: 0, temp: 10, prec: 20 },
    { i: 1, p: [10, 10], poly: [], c: [2, 3], h: 35, t: 1, f: 2, biome: 1, state: 1, province: 1, culture: 1, religion: 1, pop: 1, burg: 1, r: 0, temp: 10, prec: 20 },
    { i: 2, p: [14, 12], poly: [], c: [1, 4], h: 36, t: 2, f: 2, biome: 1, state: 1, province: 1, culture: 1, religion: 1, pop: 0.5, burg: 0, r: 0, temp: 10, prec: 20 },
    { i: 3, p: [80, 80], poly: [], c: [1, 4], h: 38, t: 5, f: 2, biome: 2, state: 1, province: 1, culture: 1, religion: 1, pop: 0, burg: 0, r: 0, temp: 10, prec: 20 },
    { i: 4, p: [90, 82], poly: [], c: [2, 3], h: 37, t: 5, f: 2, biome: 2, state: 2, province: 2, culture: 2, religion: 2, pop: 0, burg: 0, r: 0, temp: 10, prec: 20 },
  ];
  const states = [
    { i: 1, name: 'Testland', fullName: 'Kingdom of Testland', form: 'Monarchy', formName: 'Kingdom', type: 'Generic', color: '#f00', capital: 1, center: 1, pole: [10, 10] as [number, number], culture: 1, expansionism: 1, neighbors: [2], diplomacy: [], campaigns: [], urban: 1, rural: 1, cellCount: 3 },
    { i: 2, name: 'Otherland', fullName: 'Duchy of Otherland', form: 'Duchy', formName: 'Duchy', type: 'Generic', color: '#0f0', capital: 0, center: 4, pole: [90, 82] as [number, number], culture: 2, expansionism: 1, neighbors: [1], diplomacy: [], campaigns: [], urban: 0, rural: 1, cellCount: 1 },
  ];
  const religions = [
    { i: 1, name: 'Test Faith', type: 'Organized', form: 'Church', deity: 'Test Saint', color: '#fff', culture: 1, center: 1 },
    { i: 2, name: 'Other Faith', type: 'Folk', form: 'Pantheon', color: '#ccc', culture: 2, center: 4 },
  ];
  const cultures = [
    { i: 1, name: 'Testish', type: 'Human', color: '#fff' },
    { i: 2, name: 'Otherish', type: 'Human', color: '#ccc' },
  ];
  const burgs = [
    {
      i: 1,
      name: 'Testburg',
      cell: 1,
      x: 10,
      y: 10,
      state: 1,
      culture: 1,
      type: 'Town',
      group: 'town',
      capital: true,
      port: false,
      citadel: false,
      walls: true,
      temple: true,
      plaza: true,
      shanty: false,
      population: 12000,
      buildings: [],
      landmarks: {},
    },
    {
      i: 2,
      name: 'Marketvale',
      cell: 2,
      x: 14,
      y: 12,
      state: 1,
      culture: 1,
      type: 'Town',
      group: 'town',
      capital: false,
      port: false,
      citadel: false,
      walls: false,
      temple: false,
      plaza: true,
      shanty: false,
      population: 4000,
      buildings: [],
      landmarks: {},
    },
  ];
  return {
    geometry: {
      mapName: 'Test',
      width: 100,
      height: 100,
      seed: '1',
      mapCoordinates: { latT: 1, latN: 1, latS: 0, lonT: 1, lonW: 0, lonE: 1 },
      distanceScale: 2,
      distanceUnit: 'mi',
      heightUnit: 'ft',
      heightExponent: 1,
      temperatureScale: '°C',
      populationRate: 1000,
      urbanization: 1,
      winds: [],
      biomes: [
        { i: 0, name: 'Ocean', color: '#00f', habitability: 0 },
        { i: 1, name: 'Coast', color: '#0ff', habitability: 80 },
        { i: 2, name: 'Forest', color: '#0f0', habitability: 70 },
      ],
      azgaarFeatures: [],
      cells,
    },
    world: {
      states,
      stateBorders: [],
      provinces: [],
      cultures,
      religions,
      burgs,
      rivers: [],
      routes: [],
      markers: [],
      zones: [],
      people: [],
      regiments: [],
      namedFeatures: [],
      landmasses: [],
      waterFeatures: [],
      indexes: { relief: {}, biomeRegion: {}, bay: {}, sea: {}, landByFeature: {} },
    },
    wars: [],
    cellIndex: null,
    burgById: new Map(burgs.map((b) => [b.i, b])),
    stateById: new Map(states.map((s) => [s.i, s])),
    provinceById: new Map(),
    cultureById: new Map(cultures.map((c) => [c.i, c])),
    religionById: new Map(religions.map((r) => [r.i, r])),
    scriptedEvents: [],
    ambientCtx: null,
    latOf: () => 0,
    lonOf: () => 0,
    climateOf: () => ({ id: 1, temp: tempC, prec: 20, lat: 0, coastRank: 1, isWater: false }),
    distanceMi: (x1: number, y1: number, x2: number, y2: number) => Math.hypot(x2 - x1, y2 - y1) * 2,
  } as unknown as WorldData;
}

function validInput(): CharacterBuildInput {
  return {
    name: 'Test Hero',
    gender: 'male',
    classId: 'fighter',
    speciesId: 'human',
    backgroundId: 'soldier',
    nationalityId: 1,
    religionId: 1,
    abilityScores: suggestAbilityScores('fighter', 'soldier'),
    skillProficiencies: ['athletics', 'perception'],
  };
}

function inputForClass(classId: CharacterClassId): CharacterBuildInput {
  const classRule = CLASS_RULES.find((rule) => rule.id === classId)!;
  const backgroundId: OriginBackgroundId = classId === 'wizard' ? 'sage' : 'soldier';
  return {
    ...validInput(),
    classId,
    backgroundId,
    abilityScores: suggestAbilityScores(classId, backgroundId),
    skillProficiencies: classRule.skillChoices.slice(0, classRule.skillCount) as Skill[],
  };
}

function inventoryIds(input: CharacterBuildInput, tempC = 10): string[] {
  return buildPlayerCharacter(input, makeWorld(tempC), START_DATE).inventory.map((item) => item.id);
}

function expectTravelKit(ids: string[]) {
  expect(ids).toContain('healing-potion');
  expect(ids).toContain('provisions');
  expect(ids).toContain('vosels');
}

describe('player character creation', () => {
  it('maps reputation score bands to labels', () => {
    expect(reputationLabel(-90)).toBe('Hated');
    expect(reputationLabel(-50)).toBe('Hostile');
    expect(reputationLabel(-10)).toBe('Wary');
    expect(reputationLabel(0)).toBe('Neutral');
    expect(reputationLabel(40)).toBe('Favored');
    expect(reputationLabel(80)).toBe('Revered');
  });

  it('builds a valid warm-start level 1 character with clothing, weapon, supplies, and coins', () => {
    const pc = buildPlayerCharacter(validInput(), makeWorld(), START_DATE);
    const ids = pc.inventory.map((item) => item.id);
    expect(pc.level).toBe(1);
    expect(pc.xp).toBe(0);
    expect(pc.proficiencyBonus).toBe(2);
    expect(pc.maxHp).toBeGreaterThan(1);
    expect(ids).toEqual(['robe', 'sandals', 'longsword', 'healing-potion', 'provisions', 'vosels', 'sealed-guild-letter']);
    expect(pc.inventory.find((item) => item.id === 'healing-potion')?.quantity).toBe(2);
    expect(pc.inventory.find((item) => item.id === 'provisions')?.quantity).toBe(5);
    expect(pc.inventory.find((item) => item.id === 'vosels')?.quantity).toBe(118);
    expect(pc.inventory.find((item) => item.id === 'sealed-guild-letter')?.category).toBe('quest');
    expect(pc.inventory.find((item) => item.id === 'sealed-guild-letter')?.note).toContain('Testburg');
    expect(pc.quests).toHaveLength(1);
    expect(pc.quests[0].status).toBe('active');
    expect(pc.quests[0].destination.placeName).toBe('Testburg');
    expect(pc.quests[0].instructions).toContain('wait while it is penned and sealed');
    expect(pc.quests[0].steps.map((step) => step.status)).toEqual(['active', 'pending', 'pending']);
    expect(pc.cultureId).toBe(1);
    expect(pc.location.stateId).toBe(1);
  });

  it('starts neutral with every loaded culture and religion', () => {
    const wd = makeWorld();
    const pc = buildPlayerCharacter(validInput(), wd, START_DATE);
    expect(pc.reputations.cultures.map((entry) => entry.id)).toEqual([1, 2]);
    expect(pc.reputations.religions.map((entry) => entry.id)).toEqual([1, 2]);
    for (const entry of [...pc.reputations.cultures, ...pc.reputations.religions]) {
      expect(entry.score).toBe(0);
      expect(entry.label).toBe('Neutral');
    }
  });

  it('uses shoes and coat instead when the start climate is cold', () => {
    const pc = buildPlayerCharacter(validInput(), makeWorld(0), START_DATE);
    expect(pc.inventory.map((item) => item.id)).toEqual(['shoes', 'coat', 'longsword', 'healing-potion', 'provisions', 'vosels', 'sealed-guild-letter']);
  });

  it('gives each class one weapon covered by class proficiency', () => {
    for (const cls of CLASS_RULES) {
      const weapon = startingWeaponForClass(cls.id);
      const ids = inventoryIds(inputForClass(cls.id));
      expect(isWeaponProficientForClass(cls.id, weapon), cls.id).toBe(true);
      expect(ids, cls.id).toContain(weapon.id);
      expectTravelKit(ids);
    }
  });

  it('adds a spellbook for wizards only', () => {
    expect(inventoryIds(inputForClass('wizard'))).toContain('spellbook');
    expect(inventoryIds(inputForClass('fighter'))).not.toContain('spellbook');
  });

  it('rejects missing class skill choices', () => {
    const errors = validateCharacterInput({ ...validInput(), skillProficiencies: ['athletics'] });
    expect(errors.join(' ')).toContain('requires 2 class skill choices');
  });

  it('starts the player in a non-capital city of the selected nation', () => {
    const wd = makeWorld();
    const loc = chooseStartingLocation(wd, 1, 1, 'Test Hero');
    const burg = wd.world.burgs.find((b) => b.cell === loc.cellId);
    expect(burg).toBeDefined();
    expect(burg!.capital).toBe(false);
    expect(burg!.state).toBe(1);
    expect(loc.placeName).toBe(burg!.name);
    expect(loc.stateId).toBe(1);
  });

  it('references the assigned city and correct pronouns in the biography', () => {
    const wd = makeWorld();
    const he = buildPlayerCharacter({ ...validInput(), gender: 'male' }, wd, START_DATE);
    const she = buildPlayerCharacter({ ...validInput(), gender: 'female' }, wd, START_DATE);
    expect(he.story).toContain(he.name);
    expect(he.story).toContain(he.location.placeName);
    expect(he.story).toMatch(/\bhe\b/);
    expect(she.story).toMatch(/\bshe\b/);
    expect(he.story).not.toMatch(/\bthey\b/);
  });

  it('keeps pregenerated characters buildable', () => {
    const wd = makeWorld();
    const remapped = PREGENERATED_CHARACTERS.map((pregen) => ({
      ...pregen.input,
      nationalityId: 1,
      religionId: 1,
    }));
    for (const input of remapped) {
      const pc = buildPlayerCharacter(input, wd);
      const ids = pc.inventory.map((item) => item.id);
      expect(pc.name.length).toBeGreaterThan(2);
      expect(ids).toContain(startingWeaponForClass(input.classId).id);
      expectTravelKit(ids);
      expect(ids).toContain('sealed-guild-letter');
      expect(pc.quests).toHaveLength(1);
      expect(pc.quests[0].status).toBe('active');
      expect(pc.reputations.cultures).toHaveLength(wd.world.cultures.length);
      expect(pc.reputations.religions).toHaveLength(wd.world.religions.filter((religion) => religion.i > 0).length);
      expect([...pc.reputations.cultures, ...pc.reputations.religions].every((entry) => entry.label === 'Neutral')).toBe(true);
      if (input.classId === 'wizard') expect(ids).toContain('spellbook');
      else expect(ids).not.toContain('spellbook');
      expect(pc.minorBonus.name.length).toBeGreaterThan(3);
    }
  });
});
