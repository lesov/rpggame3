/**
 * Seedable dice with full breakdowns — every roll in combat is shown to the
 * player, so results carry the raw dice, modifiers, and comparison target.
 */
import { mulberry32, hash } from '../sim/rng';

export interface RollBreakdown {
  label: string;
  formula: string; // "1d20+5"
  rolls: number[]; // raw dice as rolled (both dice for adv/dis)
  kept?: number[]; // dice actually counted (differs under adv/dis)
  modifier: number;
  total: number;
  d20?: {
    natural: number;
    crit: boolean;
    fumble: boolean;
    advantage?: 'advantage' | 'disadvantage';
  };
  vs?: { label: string; value: number; success: boolean };
}

export interface DiceFormula {
  count: number;
  sides: number;
  modifier: number;
}

export function parseFormula(formula: string): DiceFormula {
  const m = /^(\d+)d(\d+)([+-]\d+)?$/.exec(formula.replaceAll(' ', ''));
  if (!m) throw new Error(`Bad dice formula: ${formula}`);
  return { count: Number(m[1]), sides: Number(m[2]), modifier: m[3] ? Number(m[3]) : 0 };
}

export function formatFormula(f: DiceFormula): string {
  const mod = f.modifier === 0 ? '' : f.modifier > 0 ? `+${f.modifier}` : `${f.modifier}`;
  return `${f.count}d${f.sides}${mod}`;
}

/** Deterministic per-battle dice stream: seed + call counter. */
export class DiceStream {
  constructor(
    private seed: number,
    public calls = 0,
  ) {}

  private next(): number {
    const value = mulberry32(hash(this.seed, this.calls, 0xd1ce))();
    this.calls += 1;
    return value;
  }

  die(sides: number): number {
    return 1 + Math.floor(this.next() * sides);
  }

  roll(formula: string, label: string): RollBreakdown {
    const f = parseFormula(formula);
    const rolls = Array.from({ length: f.count }, () => this.die(f.sides));
    const total = rolls.reduce((a, b) => a + b, 0) + f.modifier;
    return { label, formula: formatFormula(f), rolls, modifier: f.modifier, total };
  }

  d20(label: string, modifier: number, advantage?: 'advantage' | 'disadvantage'): RollBreakdown {
    const first = this.die(20);
    const rolls = [first];
    let natural = first;
    if (advantage) {
      const second = this.die(20);
      rolls.push(second);
      natural = advantage === 'advantage' ? Math.max(first, second) : Math.min(first, second);
    }
    return {
      label,
      formula: `1d20${modifier >= 0 ? '+' : ''}${modifier}`,
      rolls,
      kept: [natural],
      modifier,
      total: natural + modifier,
      d20: { natural, crit: natural === 20, fumble: natural === 1, advantage },
    };
  }
}

/** Attach the "vs AC 13 → hit" comparison to a breakdown. */
export function versus(roll: RollBreakdown, label: string, value: number, success: boolean): RollBreakdown {
  return { ...roll, vs: { label, value, success } };
}

/**
 * Exact probability that (d20 + a) > (d20 + b), ties going to the defender —
 * used to show the player their escape odds before they commit.
 */
export function opposedD20WinChance(a: number, b: number): number {
  let wins = 0;
  for (let x = 1; x <= 20; x++) {
    for (let y = 1; y <= 20; y++) {
      if (x + a > y + b) wins++;
    }
  }
  return wins / 400;
}

/** Human-readable calculation line: "d20(14) + 5 = 19 vs AC 13 → HIT". */
export function describeRoll(r: RollBreakdown): string {
  let dicePart: string;
  if (r.d20) {
    const advNote = r.d20.advantage
      ? ` [${r.d20.advantage === 'advantage' ? 'adv' : 'dis'}: ${r.rolls.join(', ')} → ${r.d20.natural}]`
      : '';
    dicePart = `d20(${r.d20.natural})${advNote}`;
  } else {
    dicePart = r.formula.split(/[+-]/)[0] + `(${r.rolls.join('+')})`;
  }
  const mod = r.modifier === 0 ? '' : r.modifier > 0 ? ` + ${r.modifier}` : ` − ${-r.modifier}`;
  let line = `${dicePart}${mod} = ${r.total}`;
  if (r.vs) line += ` vs ${r.vs.label} ${r.vs.value} → ${r.vs.success ? 'SUCCESS' : 'FAIL'}`;
  if (r.d20?.crit) line += ' — CRITICAL!';
  if (r.d20?.fumble) line += ' — fumble';
  return line;
}
