import { describe, it, expect } from 'vitest';
import { buildPlayerCombatant, martialArtsAttack } from './kits';
import { makeTestCharacter } from './fixtures';
import { MONSTERS, buildEnemyCombatant, defaultOpponentFor, getMonster } from './monsters';
import type { CharacterClassId } from '../player/types';

const ALL_CLASSES: CharacterClassId[] = [
  'barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk',
  'paladin', 'ranger', 'rogue', 'sorcerer', 'warlock', 'wizard',
];

describe('class combat kits', () => {
  it('every class gets a usable weapon attack', () => {
    for (const classId of ALL_CLASSES) {
      const c = buildPlayerCombatant(makeTestCharacter(classId));
      expect(c.attacks.length, classId).toBeGreaterThanOrEqual(1);
      const weapon = c.attacks[0];
      expect(weapon.toHit, classId).toBeGreaterThanOrEqual(2); // proficient + positive mod
      expect(weapon.damageDice, classId).toMatch(/^\d+d\d+$/);
      expect(c.resources.potions, classId).toBe(2);
    }
  });

  it('casters get their signature cantrip', () => {
    expect(buildPlayerCombatant(makeTestCharacter('wizard')).attacks[1].name).toBe('Fire Bolt');
    expect(buildPlayerCombatant(makeTestCharacter('warlock')).attacks[1].name).toBe('Eldritch Blast');
    expect(buildPlayerCombatant(makeTestCharacter('cleric')).attacks[1].name).toBe('Sacred Flame');
    expect(buildPlayerCombatant(makeTestCharacter('bard')).attacks[1].name).toBe('Vicious Mockery');
    expect(buildPlayerCombatant(makeTestCharacter('druid')).attacks[1].name).toBe('Produce Flame');
    expect(buildPlayerCombatant(makeTestCharacter('fighter')).attacks[1]).toBeUndefined();
  });

  it('save-based cantrips carry a DC, attack cantrips a to-hit', () => {
    const cleric = buildPlayerCombatant(makeTestCharacter('cleric'));
    expect(cleric.attacks[1].save).toBeDefined();
    expect(cleric.attacks[1].toHit).toBeUndefined();
    const wizard = buildPlayerCombatant(makeTestCharacter('wizard'));
    expect(wizard.attacks[1].toHit).toBeDefined();
    expect(wizard.attacks[1].save).toBeUndefined();
  });

  it('assigns class features as resources', () => {
    expect(buildPlayerCombatant(makeTestCharacter('fighter')).resources.secondWind).toBe(1);
    expect(buildPlayerCombatant(makeTestCharacter('barbarian')).resources.rage).toBe(1);
    expect(buildPlayerCombatant(makeTestCharacter('rogue')).resources.feintAvailable).toBe(true);
    expect(buildPlayerCombatant(makeTestCharacter('monk')).resources.martialArts).toBe(true);
    expect(buildPlayerCombatant(makeTestCharacter('cleric')).resources.healSpells).toBe(2);
    expect(buildPlayerCombatant(makeTestCharacter('paladin')).resources.layOnHands).toBe(5);
  });

  it('martial arts strike uses the better of STR/DEX', () => {
    const monk = buildPlayerCombatant(makeTestCharacter('monk'));
    const strike = martialArtsAttack(monk);
    expect(strike.damageBonus).toBe(Math.max(monk.abilityMods.str, monk.abilityMods.dex));
  });
});

describe('monsters', () => {
  it('roster has 10 well-formed foes across difficulties', () => {
    expect(MONSTERS.length).toBe(10);
    const difficulties = new Set(MONSTERS.map((m) => m.difficulty));
    expect(difficulties).toEqual(new Set(['easy', 'fair', 'hard']));
    for (const m of MONSTERS) {
      expect(m.hp, m.id).toBeGreaterThan(0);
      expect(m.attacks.length, m.id).toBeGreaterThanOrEqual(1);
      expect(m.bodyParts.length, m.id).toBeGreaterThan(4);
      expect(m.descriptor.length, m.id).toBeGreaterThan(20);
      if (m.species === 'undead') expect(m.morale, m.id).toBe('fearless');
    }
  });

  it('humanoids carry spoken lines; beasts do not', () => {
    expect(getMonster('bandit').barks?.panic.length).toBeGreaterThan(0);
    expect(getMonster('wolf').barks).toBeUndefined();
  });

  it('picks biome-appropriate default opponents', () => {
    expect(defaultOpponentFor(9, false).id).toBe('wolf'); // taiga
    expect(defaultOpponentFor(4, true).id).toBe('bandit'); // grassland near a road
    expect(defaultOpponentFor(999, false).id).toBe('bandit'); // fallback
  });

  it('builds a Combatant from a stat block', () => {
    const wolf = buildEnemyCombatant(getMonster('wolf'));
    expect(wolf.hp).toBe(11);
    expect(wolf.id).toBe('enemy');
    expect(wolf.isPlayer).toBe(false);
    expect(wolf.injuries).toEqual([]);
  });
});
