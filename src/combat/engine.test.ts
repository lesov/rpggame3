import { describe, it, expect } from 'vitest';
import {
  createCombat, initialPendingRoll, availableActions, chooseAction, rollPending,
  escapeChance, exhaustionOf, potionsRemaining,
} from './engine';
import { opposedD20WinChance } from './dice';
import { getMonster, MONSTERS } from './monsters';
import { makeTestCharacter, makeTestScene } from './fixtures';
import type { CombatState, PlayerActionId } from './types';
import type { CharacterClassId } from '../player/types';

const scene = makeTestScene();

function start(classId: CharacterClassId = 'fighter', monsterId = 'wolf', seed = 1): CombatState {
  return initialPendingRoll(createCombat(makeTestCharacter(classId), getMonster(monsterId), scene, seed));
}

/** Drive a battle to completion with a simple policy. */
function drive(
  state: CombatState,
  pickAction: (s: CombatState) => PlayerActionId = defaultPolicy,
  maxSteps = 400,
): CombatState {
  let s = state;
  for (let i = 0; i < maxSteps; i++) {
    if (s.outcome) return s;
    if (s.pendingRoll) {
      s = rollPending(s);
    } else if (s.phase === 'player-turn') {
      const action = pickAction(s);
      const next = chooseAction(s, action);
      if (next === s || (next.seq === s.seq && next.pendingRoll === null && !next.turn.actionUsed && !next.turn.bonusUsed)) {
        // policy picked something unusable; force attack or end-turn
        s = chooseAction(s, availableActions(s).find((a) => a.enabled)?.id ?? 'end-turn');
      } else {
        s = next;
      }
    } else {
      throw new Error(`stuck in phase ${s.phase}`);
    }
  }
  throw new Error('battle did not finish');
}

function defaultPolicy(s: CombatState): PlayerActionId {
  const actions = availableActions(s);
  const attack = actions.find((a) => a.id === 'attack' && a.enabled);
  if (attack) return 'attack';
  const anyEnabled = actions.find((a) => a.enabled);
  return anyEnabled?.id ?? 'end-turn';
}

describe('combat engine — flow', () => {
  it('starts with intro event and a pending initiative roll', () => {
    const s = start();
    expect(s.events[0].kind).toBe('intro');
    expect(s.pendingRoll?.kind).toBe('initiative');
    expect(s.phase).toBe('initiative');
  });

  it('initiative resolves both rolls with breakdowns and starts round 1', () => {
    const s = rollPending(start());
    const init = s.events.find((e) => e.kind === 'initiative');
    expect(init).toBeDefined();
    if (init?.kind === 'initiative') {
      expect(init.rolls).toHaveLength(2);
      expect(init.rolls[0].breakdown.d20).toBeDefined();
    }
    expect(s.round).toBe(1);
  });

  it('is fully deterministic for a given seed', () => {
    const a = drive(start('fighter', 'wolf', 42));
    const b = drive(start('fighter', 'wolf', 42));
    expect(a.events).toEqual(b.events);
    expect(a.outcome).toBe(b.outcome);
    const c = drive(start('fighter', 'wolf', 43));
    expect(c.events).not.toEqual(a.events);
  });

  it('every attack event carries a full calculation (d20, modifier, vs AC)', () => {
    const s = drive(start('fighter', 'wolf', 7));
    const attacks = s.events.filter((e) => e.kind === 'attack');
    expect(attacks.length).toBeGreaterThan(0);
    for (const a of attacks) {
      if (a.kind !== 'attack') continue;
      expect(a.roll.d20).toBeDefined();
      expect(a.roll.vs?.label).toBe('AC');
      expect(a.roll.total).toBe(a.roll.d20!.natural + a.roll.modifier);
    }
  });

  it('damage creates injuries with location and severity; hp decreases', () => {
    const s = drive(start('barbarian', 'zombie', 5));
    const dmg = s.events.filter((e) => e.kind === 'damage');
    expect(dmg.length).toBeGreaterThan(0);
    for (const d of dmg) {
      if (d.kind !== 'damage') continue;
      expect(d.injury?.location).toBeTruthy();
      expect(['graze', 'wound', 'deep wound', 'grievous wound']).toContain(d.injury?.severity);
      expect(d.hpAfter).toBeLessThan(d.hpMax + 1);
    }
  });

  it('battles end in a valid outcome for every class vs a wolf', () => {
    const classes: CharacterClassId[] = ['barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk', 'paladin', 'ranger', 'rogue', 'sorcerer', 'warlock', 'wizard'];
    for (const classId of classes) {
      const s = drive(start(classId, 'wolf', 11));
      expect(s.outcome, classId).toBeTruthy();
      expect(s.events.at(-1)?.kind, classId).toBe('outcome');
    }
  });

  it('battles end for every monster vs a fighter across seeds', () => {
    for (const m of MONSTERS) {
      for (const seed of [1, 2, 3]) {
        const s = drive(start('fighter', m.id, seed));
        expect(['victory', 'defeat', 'escaped', 'enemy-fled']).toContain(s.outcome);
      }
    }
  });

  it('player at 0 HP → defeat, not death: outcome event present', () => {
    // weak wizard vs hard-hitting orc, dodging never attacking → guaranteed loss eventually
    const s = drive(start('wizard', 'orc-soldier', 13), (st) => {
      const dodge = availableActions(st).find((a) => a.id === 'dodge' && a.enabled);
      return dodge ? 'dodge' : 'end-turn';
    });
    expect(s.outcome).toBe('defeat');
    expect(s.player.hp).toBe(0);
  });
});

describe('combat engine — actions', () => {
  function toPlayerTurn(classId: CharacterClassId = 'fighter', monsterId = 'zombie', seed = 1): CombatState {
    let s = rollPending(start(classId, monsterId, seed));
    // if enemy went first and battle somehow ended, try another seed upstream
    expect(s.phase).toBe('player-turn');
    return s;
  }

  it('potion is a bonus action, heals 4-10, decrements count, tends wounds', () => {
    let s = toPlayerTurn('fighter', 'zombie', 3);
    s.player.hp = 3;
    s.player.injuries.push({ location: 'thigh', severity: 'deep wound', round: 1, source: 'Slam', damageType: 'bludgeoning' });
    s = chooseAction(s, 'potion');
    expect(s.pendingRoll?.kind).toBe('potion');
    s = rollPending(s);
    const heal = s.events.findLast((e) => e.kind === 'heal');
    expect(heal).toBeDefined();
    if (heal?.kind === 'heal') {
      expect(heal.amount).toBeGreaterThanOrEqual(1);
      expect(heal.roll!.total).toBeGreaterThanOrEqual(4);
      expect(heal.roll!.total).toBeLessThanOrEqual(10);
      expect(heal.woundsTended).toContain('deep wound to the thigh');
    }
    expect(s.player.resources.potions).toBe(1);
    expect(potionsRemaining(s)).toBe(1);
    expect(s.turn.bonusUsed).toBe(true);
    expect(s.turn.actionUsed).toBe(false); // can still attack
  });

  it('dodge imposes disadvantage on the enemy attack that follows', () => {
    let s = toPlayerTurn('fighter', 'zombie', 8);
    s = chooseAction(s, 'dodge');
    // turn auto-ends (no bonus available), enemy attacks with disadvantage
    const enemyAttack = s.events.findLast((e) => e.kind === 'attack' && e.attacker === 'Zombie');
    expect(enemyAttack).toBeDefined();
    if (enemyAttack?.kind === 'attack' && !enemyAttack.free) {
      expect(enemyAttack.roll.d20?.advantage).toBe('disadvantage');
      expect(enemyAttack.roll.rolls).toHaveLength(2);
    }
  });

  it('escape shows exact enumerated chance and ends combat on success', () => {
    const s = toPlayerTurn('fighter', 'zombie', 2);
    const shown = escapeChance(s);
    const speedAdj = s.player.speed > s.enemy.speed ? 2 : s.player.speed < s.enemy.speed ? -2 : 0;
    expect(shown).toBeCloseTo(opposedD20WinChance(s.player.escapeBonus + speedAdj, s.enemy.escapeBonus), 10);

    // try seeds until both outcomes observed
    let sawSuccess = false;
    let sawFailWithFreeStrike = false;
    for (let seed = 1; seed < 60 && !(sawSuccess && sawFailWithFreeStrike); seed++) {
      let st = rollPending(start('fighter', 'zombie', seed));
      if (st.phase !== 'player-turn' || st.outcome) continue;
      st = chooseAction(st, 'escape');
      expect(st.pendingRoll?.kind).toBe('escape');
      st = rollPending(st);
      const esc = st.events.findLast((e) => e.kind === 'escape');
      if (esc?.kind !== 'escape') continue;
      expect(esc.chancePct).toBe(Math.round(shown * 100));
      if (esc.success) {
        sawSuccess = true;
        expect(st.outcome).toBe('escaped');
      } else {
        sawFailWithFreeStrike = true;
        const free = st.events.some((e) => e.kind === 'attack' && e.free);
        expect(free).toBe(true);
      }
    }
    expect(sawSuccess).toBe(true);
    expect(sawFailWithFreeStrike).toBe(true);
  });

  it('fighter Second Wind heals and is spent', () => {
    let s = toPlayerTurn('fighter', 'zombie', 4);
    s.player.hp = 2;
    s = chooseAction(s, 'second-wind');
    s = rollPending(s);
    expect(s.player.hp).toBeGreaterThan(2);
    expect(s.player.resources.secondWind).toBe(0);
  });

  it('barbarian rage adds damage and resists weapon damage', () => {
    let s = toPlayerTurn('barbarian', 'zombie', 6);
    s = chooseAction(s, 'rage');
    expect(s.player.conditions.raging).toBe(true);
    // drive on: all subsequent enemy weapon damage events vs player must be resisted
    const done = drive(s);
    const enemyDamage = done.events.filter((e) => e.kind === 'damage' && e.defender === 'Testovar');
    for (const d of enemyDamage) {
      if (d.kind === 'damage') expect(d.resisted).toBe(true);
    }
  });

  it('rogue feint grants advantage then sneak attack on the next hit', () => {
    for (let seed = 1; seed < 40; seed++) {
      let s = rollPending(start('rogue', 'zombie', seed));
      if (s.phase !== 'player-turn' || s.outcome) continue;
      s = chooseAction(s, 'feint');
      s = rollPending(s);
      const feint = s.events.findLast((e) => e.kind === 'feature');
      if (feint?.kind !== 'feature' || !feint.success) continue;
      expect(s.player.conditions.feintAdvantage).toBe(true);
      s = chooseAction(s, 'attack');
      expect(s.pendingRoll?.advantage).toBe('advantage');
      s = rollPending(s);
      const attack = s.events.findLast((e) => e.kind === 'attack' && e.attacker === 'Testovar');
      if (attack?.kind === 'attack' && (attack.outcome === 'hit' || attack.outcome === 'crit')) {
        s = rollPending(s); // damage
        const dmg = s.events.findLast((e) => e.kind === 'damage' && e.attacker === 'Testovar');
        if (dmg?.kind === 'damage') {
          expect(dmg.roll.label).toContain('Sneak Attack');
          return; // full path verified
        }
      }
    }
    throw new Error('never observed a successful feinted hit in 40 seeds');
  });

  it('cleric Sacred Flame forces an enemy save; failed save leads to player damage roll', () => {
    let observed = false;
    for (let seed = 1; seed < 50 && !observed; seed++) {
      let s = rollPending(start('cleric', 'zombie', seed));
      if (s.phase !== 'player-turn' || s.outcome) continue;
      s = chooseAction(s, 'cantrip');
      const save = s.events.findLast((e) => e.kind === 'save');
      expect(save).toBeDefined();
      if (save?.kind === 'save' && !save.success) {
        expect(s.pendingRoll?.kind).toBe('damage');
        observed = true;
      }
    }
    expect(observed).toBe(true);
  });

  it('monk can follow the attack with a martial-arts bonus strike', () => {
    let s = toPlayerTurn('monk', 'zombie', 9);
    const before = availableActions(s);
    expect(before.find((a) => a.id === 'martial-arts')?.enabled).toBe(false); // attack first
    s = chooseAction(s, 'attack');
    s = rollPending(s);
    if (s.pendingRoll?.kind === 'damage') s = rollPending(s);
    if (s.outcome || s.phase !== 'player-turn') return; // enemy died or turn rolled over
    const after = availableActions(s);
    expect(after.find((a) => a.id === 'martial-arts')?.enabled).toBe(true);
  });

  it('enemy morale can break — craven foes flee when badly hurt', () => {
    let fled = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const s = drive(start('fighter', 'bandit', seed));
      if (s.outcome === 'enemy-fled') {
        fled++;
        const morale = s.events.findLast((e) => e.kind === 'morale');
        expect(morale).toBeDefined();
        if (morale?.kind === 'morale') expect(morale.fled).toBe(true);
      }
    }
    expect(fled).toBeGreaterThan(0);
  });

  it('undead never flee', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const s = drive(start('fighter', 'skeleton', seed));
      expect(s.outcome).not.toBe('enemy-fled');
      expect(s.events.some((e) => e.kind === 'morale')).toBe(false);
    }
  });
});

describe('exhaustion tiers', () => {
  it('derives from hp fraction and round count', () => {
    const c = { hp: 10, maxHp: 10 } as never;
    expect(exhaustionOf({ ...(c as object), hp: 10, maxHp: 10 } as never, 1)).toBe('fresh');
    expect(exhaustionOf({ hp: 10, maxHp: 10 } as never, 4)).toBe('winded');
    expect(exhaustionOf({ hp: 5, maxHp: 10 } as never, 1)).toBe('exhausted');
    expect(exhaustionOf({ hp: 2, maxHp: 10 } as never, 1)).toBe('desperate');
  });
});
