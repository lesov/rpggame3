import { describe, it, expect } from 'vitest';
import { calcLinesForEvent } from './combatLog';
import type { CombatEvent } from '../combat/types';

describe('calcLinesForEvent', () => {
  it('renders an attack roll with its breakdown and hit/miss', () => {
    const e: CombatEvent = {
      kind: 'attack',
      seq: 1,
      attacker: 'Rook',
      defender: 'the wolf',
      attackName: 'Longsword',
      attackVerb: 'slashes',
      roll: {
        label: 'Longsword',
        formula: '1d20+5',
        rolls: [14],
        modifier: 5,
        total: 19,
        d20: { natural: 14, crit: false, fumble: false },
        vs: { label: 'AC', value: 13, success: true },
      },
      outcome: 'hit',
    };
    const [line] = calcLinesForEvent(e);
    expect(line.label).toContain('Longsword');
    expect(line.detail).toContain('d20(14)');
    expect(line.detail).toContain('19');
    expect(line.detail).toContain('SUCCESS');
  });

  it('renders damage with amount, injury and remaining HP', () => {
    const e: CombatEvent = {
      kind: 'damage',
      seq: 2,
      attacker: 'Rook',
      defender: 'the wolf',
      attackName: 'Longsword',
      attackVerb: 'slashes',
      roll: { label: 'dmg', formula: '1d8+3', rolls: [5], modifier: 3, total: 8 },
      amount: 8,
      injury: { location: 'flank', severity: 'deep wound', round: 1, source: 'Longsword', damageType: 'slashing' },
      hpAfter: 3,
      hpMax: 11,
      dropped: false,
    };
    const [line] = calcLinesForEvent(e);
    expect(line.detail).toContain('8 to the wolf');
    expect(line.detail).toContain('deep wound to the flank');
    expect(line.detail).toContain('3/11 HP');
  });

  it('renders an escape as an opposed check with the shown chance', () => {
    const e: CombatEvent = {
      kind: 'escape',
      seq: 3,
      actor: 'Rook',
      chancePct: 45,
      actorRoll: { label: 'a', formula: '1d20+2', rolls: [10], modifier: 2, total: 12, d20: { natural: 10, crit: false, fumble: false } },
      opponentRoll: { label: 'b', formula: '1d20+1', rolls: [16], modifier: 1, total: 17, d20: { natural: 16, crit: false, fumble: false } },
      success: false,
    };
    const [line] = calcLinesForEvent(e);
    expect(line.label).toContain('45%');
    expect(line.detail).toContain('CAUGHT');
  });

  it('emits nothing for bookkeeping events (round markers)', () => {
    expect(calcLinesForEvent({ kind: 'round', seq: 4, round: 2 })).toEqual([]);
  });
});
