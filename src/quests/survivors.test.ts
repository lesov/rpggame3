import { describe, expect, it } from 'vitest';
import { OPPOSING_PERSONALITY_TRAIT_PAIRS } from '../data/personality';
import { abilityModifier, getClassRule, proficiencyBonusForLevel } from '../player/rules2024';
import { EMGERDAS, HALL_SURVIVORS, SEMINA, SEMINOL } from './survivors';

describe('hall survivors', () => {
  it('every survivor has three distinct, non-opposing personality traits', () => {
    for (const person of HALL_SURVIVORS) {
      const traits = person.personalityTraits!;
      expect(traits).toHaveLength(3);
      expect(new Set(traits).size).toBe(3);
      for (const [a, b] of OPPOSING_PERSONALITY_TRAIT_PAIRS) {
        expect(traits.includes(a) && traits.includes(b)).toBe(false);
      }
    }
  });

  it('matches the cast: maid, autistic wizard, illiterate wood elf ranger', () => {
    expect(SEMINA.race).toBe('Human');
    expect(SEMINA.sheet).toBeUndefined();
    expect(EMGERDAS.race).toBe('Human');
    expect(EMGERDAS.sheet?.classId).toBe('wizard');
    expect(EMGERDAS.sheet?.level).toBe(5);
    expect(EMGERDAS.personalityTraits).toContain('Eccentric');
    expect(SEMINOL.race).toContain('Wood Elf');
    expect(SEMINOL.sheet?.classId).toBe('ranger');
    expect(SEMINOL.sheet?.level).toBe(1);
    expect(SEMINOL.bio).toContain('cannot read');
  });

  it('sheets are internally consistent with the 2024 class rules', () => {
    for (const person of [EMGERDAS, SEMINOL]) {
      const sheet = person.sheet!;
      const rule = getClassRule(sheet.classId);
      expect(sheet.proficiencyBonus).toBe(proficiencyBonusForLevel(sheet.level));
      expect(sheet.savingThrows).toEqual(rule.savingThrows);
      for (const feature of rule.levelOneFeatures) expect(sheet.features).toContain(feature);
      for (const skill of sheet.skillProficiencies) expect(rule.skillChoices).toContain(skill);
      // Fixed-average HP: max die at level 1, die/2+1 per level after, CON each level.
      const conMod = abilityModifier(sheet.abilityScores.con);
      const expectedHp = rule.hitDie + conMod + (sheet.level - 1) * (rule.hitDie / 2 + 1 + conMod);
      expect(sheet.maxHp).toBe(expectedHp);
      expect(sheet.appearance.descriptor.length).toBeGreaterThan(20);
      expect(sheet.equipment.length).toBeGreaterThan(2);
    }
  });

  it('derives the looks descriptor from the appearance inputs like the character builder', () => {
    expect(EMGERDAS.sheet!.appearance.descriptor).toContain('tall human');
    expect(EMGERDAS.sheet!.appearance.descriptor).toContain('stooped');
    expect(SEMINOL.sheet!.appearance.descriptor).toContain('wood elf');
    expect(SEMINOL.sheet!.appearance.descriptor).toContain('braided');
  });
});
