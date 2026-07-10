import { describe, it, expect } from 'vitest';
import { DiceStream, parseFormula, opposedD20WinChance, describeRoll, versus } from './dice';

describe('dice', () => {
  it('parses formulas', () => {
    expect(parseFormula('1d20+5')).toEqual({ count: 1, sides: 20, modifier: 5 });
    expect(parseFormula('2d4+2')).toEqual({ count: 2, sides: 4, modifier: 2 });
    expect(parseFormula('1d8')).toEqual({ count: 1, sides: 8, modifier: 0 });
    expect(parseFormula('1d20-1')).toEqual({ count: 1, sides: 20, modifier: -1 });
    expect(() => parseFormula('d20')).toThrow();
  });

  it('is deterministic per (seed, calls) and advances the stream', () => {
    const a = new DiceStream(42);
    const b = new DiceStream(42);
    expect(a.roll('2d6+1', 'x')).toEqual(b.roll('2d6+1', 'x'));
    expect(a.calls).toBe(b.calls);
    // resuming from a stored cursor continues the same stream
    const c = new DiceStream(42, a.calls);
    expect(a.die(20)).toBe(c.die(20));
  });

  it('rolls within bounds', () => {
    const d = new DiceStream(7);
    for (let i = 0; i < 200; i++) {
      const r = d.roll('2d4+2', 'potion');
      expect(r.total).toBeGreaterThanOrEqual(4);
      expect(r.total).toBeLessThanOrEqual(10);
      expect(r.rolls).toHaveLength(2);
    }
  });

  it('handles advantage and disadvantage', () => {
    const d = new DiceStream(1);
    for (let i = 0; i < 100; i++) {
      const adv = d.d20('a', 0, 'advantage');
      expect(adv.rolls).toHaveLength(2);
      expect(adv.d20!.natural).toBe(Math.max(...adv.rolls));
      const dis = d.d20('d', 0, 'disadvantage');
      expect(dis.d20!.natural).toBe(Math.min(...dis.rolls));
    }
  });

  it('flags crits and fumbles', () => {
    const d = new DiceStream(3);
    let sawCrit = false;
    let sawFumble = false;
    for (let i = 0; i < 500; i++) {
      const r = d.d20('x', 5);
      if (r.d20!.natural === 20) {
        expect(r.d20!.crit).toBe(true);
        sawCrit = true;
      }
      if (r.d20!.natural === 1) {
        expect(r.d20!.fumble).toBe(true);
        sawFumble = true;
      }
    }
    expect(sawCrit).toBe(true);
    expect(sawFumble).toBe(true);
  });

  it('computes exact opposed-d20 win chances', () => {
    expect(opposedD20WinChance(0, 0)).toBeCloseTo(190 / 400, 10); // ties lose
    expect(opposedD20WinChance(20, 0)).toBeCloseTo(1, 1); // nearly certain
    expect(opposedD20WinChance(5, 0)).toBeGreaterThan(opposedD20WinChance(0, 0));
    expect(opposedD20WinChance(0, 5)).toBeLessThan(opposedD20WinChance(0, 0));
  });

  it('describes rolls with full math', () => {
    const d = new DiceStream(9);
    const r = versus(d.d20('Attack', 5), 'AC', 13, false);
    r.vs!.success = r.total >= 13;
    const text = describeRoll(r);
    expect(text).toContain(`d20(${r.d20!.natural})`);
    expect(text).toContain('= ' + r.total);
    expect(text).toContain('vs AC 13');
  });
});
