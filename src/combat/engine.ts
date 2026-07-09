/**
 * Combat engine: a pure, deterministic state machine over CombatState.
 *
 * The UI drives it with three calls: `chooseAction` (player picks from the
 * action bar), `rollPending` (player clicks the dice for the pending roll),
 * and reads `availableActions`. Enemy rolls resolve automatically inside the
 * same transitions, but every roll — player or enemy — lands in the event
 * log with a full breakdown. Determinism: all randomness flows through a
 * DiceStream keyed by (seed, rngCalls), both stored on the state.
 */
import type { PlayerCharacter } from '../player/types';
import { DiceStream, opposedD20WinChance, versus, type RollBreakdown } from './dice';
import { buildPlayerCombatant, martialArtsAttack } from './kits';
import { buildEnemyCombatant, type Monster } from './monsters';
import type {
  AvailableAction,
  Combatant,
  CombatantAttack,
  CombatEvent,
  CombatScene,
  CombatState,
  ExhaustionTier,
  Injury,
  InjurySeverity,
  PlayerActionId,
} from './types';

const MORALE_DC = { craven: 12, wild: 10, steadfast: 6, fearless: Infinity } as const;
const RAGE_RESISTS = new Set(['slashing', 'piercing', 'bludgeoning']);

export function createCombat(pc: PlayerCharacter, monster: Monster, scene: CombatScene, seed: number): CombatState {
  const player = buildPlayerCombatant(pc);
  const enemy = buildEnemyCombatant(monster);
  return {
    seed,
    rngCalls: 0,
    scene,
    player,
    enemy,
    monsterId: monster.id,
    phase: 'initiative',
    round: 0,
    playerFirst: true,
    turn: { actionUsed: false, bonusUsed: false },
    events: [{ kind: 'intro', seq: 0 }],
    seq: 1,
    pendingRoll: null,
    outcome: null,
  };
}

/** The initiative roll is offered as the first clickable dice. */
export function initialPendingRoll(state: CombatState): CombatState {
  const s = clone(state);
  s.pendingRoll = {
    id: 'initiative',
    kind: 'initiative',
    label: 'Roll initiative',
    formula: `1d20${fmtMod(s.player.initiativeBonus)}`,
  };
  return s;
}

// ---------------------------------------------------------------------------

function clone(state: CombatState): CombatState {
  return structuredClone(state);
}

function fmtMod(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

function push(s: CombatState, e: DistributiveOmit<CombatEvent, 'seq'>): void {
  s.events.push({ ...e, seq: s.seq++ } as CombatEvent);
}

function combatant(s: CombatState, id: 'player' | 'enemy'): Combatant {
  return id === 'player' ? s.player : s.enemy;
}

export function exhaustionOf(c: Combatant, round: number): ExhaustionTier {
  const hpFrac = c.hp / c.maxHp;
  if (hpFrac <= 0.25) return 'desperate';
  if (hpFrac <= 0.5 || round >= 6) return 'exhausted';
  if (round >= 3) return 'winded';
  return 'fresh';
}

function severityFor(amount: number, maxHp: number): InjurySeverity {
  const frac = amount / maxHp;
  if (frac < 0.1) return 'graze';
  if (frac < 0.25) return 'wound';
  if (frac < 0.5) return 'deep wound';
  return 'grievous wound';
}

function pickBodyPart(dice: DiceStream, parts: [string, number][]): string {
  const total = parts.reduce((a, [, w]) => a + w, 0);
  let ticket = dice.die(total) - 1;
  for (const [name, weight] of parts) {
    ticket -= weight;
    if (ticket < 0) return name;
  }
  return parts[0][0];
}

// ---------------------------------------------------------------------------
// Action availability

export function escapeChance(s: CombatState): number {
  const speedAdj = s.player.speed > s.enemy.speed ? 2 : s.player.speed < s.enemy.speed ? -2 : 0;
  return opposedD20WinChance(s.player.escapeBonus + speedAdj, s.enemy.escapeBonus);
}

export function availableActions(s: CombatState): AvailableAction[] {
  if (s.phase !== 'player-turn' || s.pendingRoll || s.outcome) return [];
  const p = s.player;
  const { actionUsed, bonusUsed } = s.turn;
  const out: AvailableAction[] = [];

  const weapon = p.attacks[0];
  out.push({
    id: 'attack',
    label: weapon.name,
    detail: `${weapon.damageDice}${fmtMod(weapon.damageBonus)} ${weapon.damageType}${p.conditions.feintAdvantage ? ' · advantage' : ''}`,
    enabled: !actionUsed,
    disabledReason: actionUsed ? 'action already used' : undefined,
    isBonus: false,
  });

  const cantrip = p.attacks[1];
  if (cantrip) {
    out.push({
      id: 'cantrip',
      label: cantrip.name,
      detail: cantrip.save
        ? `${cantrip.damageDice} ${cantrip.damageType}, ${cantrip.save.ability.toUpperCase()} save DC ${cantrip.save.dc}`
        : `${cantrip.damageDice} ${cantrip.damageType}`,
      enabled: !actionUsed,
      disabledReason: actionUsed ? 'action already used' : undefined,
      isBonus: false,
    });
  }

  if (p.resources.healSpells !== undefined) {
    out.push({
      id: 'heal-spell',
      label: 'Cure Wounds',
      detail: `1d8${fmtMod(healSpellMod(p))}, ${p.resources.healSpells} left`,
      enabled: !actionUsed && p.resources.healSpells > 0 && p.hp < p.maxHp,
      disabledReason: actionUsed ? 'action already used' : p.resources.healSpells <= 0 ? 'no castings left' : p.hp >= p.maxHp ? 'unhurt' : undefined,
      isBonus: false,
    });
  }

  if (p.resources.layOnHands !== undefined) {
    out.push({
      id: 'lay-on-hands',
      label: 'Lay on Hands',
      detail: `${p.resources.layOnHands} HP pool`,
      enabled: !actionUsed && p.resources.layOnHands > 0 && p.hp < p.maxHp,
      disabledReason: actionUsed ? 'action already used' : p.resources.layOnHands <= 0 ? 'pool empty' : p.hp >= p.maxHp ? 'unhurt' : undefined,
      isBonus: false,
    });
  }

  out.push({
    id: 'dodge',
    label: 'Dodge',
    detail: 'attacks on you at disadvantage',
    enabled: !actionUsed,
    disabledReason: actionUsed ? 'action already used' : undefined,
    isBonus: false,
  });

  const chance = Math.round(escapeChance(s) * 100);
  out.push({
    id: 'escape',
    label: 'Escape',
    detail: `${chance}% — failure gives ${s.enemy.shortName} a free strike`,
    enabled: !actionUsed,
    disabledReason: actionUsed ? 'action already used' : undefined,
    isBonus: false,
  });

  // Bonus actions
  out.push({
    id: 'potion',
    label: 'Healing potion',
    detail: `2d4+2, ${p.resources.potions} left`,
    enabled: !bonusUsed && p.resources.potions > 0 && p.hp < p.maxHp,
    disabledReason: bonusUsed ? 'bonus action used' : p.resources.potions <= 0 ? 'none left' : p.hp >= p.maxHp ? 'unhurt' : undefined,
    isBonus: true,
  });

  if (p.resources.secondWind !== undefined) {
    out.push({
      id: 'second-wind',
      label: 'Second Wind',
      detail: '1d10+1',
      enabled: !bonusUsed && p.resources.secondWind > 0 && p.hp < p.maxHp,
      disabledReason: bonusUsed ? 'bonus action used' : p.resources.secondWind <= 0 ? 'spent' : p.hp >= p.maxHp ? 'unhurt' : undefined,
      isBonus: true,
    });
  }

  if (p.resources.rage !== undefined) {
    out.push({
      id: 'rage',
      label: 'Rage',
      detail: '+2 melee damage, resist weapon damage',
      enabled: !bonusUsed && p.resources.rage > 0 && !p.conditions.raging,
      disabledReason: bonusUsed ? 'bonus action used' : p.conditions.raging ? 'already raging' : 'spent',
      isBonus: true,
    });
  }

  if (p.resources.feintAvailable) {
    out.push({
      id: 'feint',
      label: 'Feint',
      detail: 'Deception vs Insight → advantage + Sneak Attack',
      enabled: !bonusUsed && !p.conditions.feintAdvantage,
      disabledReason: bonusUsed ? 'bonus action used' : p.conditions.feintAdvantage ? 'already set up' : undefined,
      isBonus: true,
    });
  }

  if (p.resources.martialArts) {
    out.push({
      id: 'martial-arts',
      label: 'Martial Arts strike',
      detail: '1d6 bonus unarmed strike',
      enabled: !bonusUsed && actionUsed, // follows the Attack action
      disabledReason: bonusUsed ? 'bonus action used' : !actionUsed ? 'attack first' : undefined,
      isBonus: true,
    });
  }

  out.push({
    id: 'end-turn',
    label: 'End turn',
    detail: '',
    enabled: actionUsed || bonusUsed,
    disabledReason: 'act first',
    isBonus: false,
  });

  return out;
}

function healSpellMod(p: Combatant): number {
  return Math.max(p.abilityMods.wis, p.abilityMods.cha);
}

// ---------------------------------------------------------------------------
// Player action selection

export function chooseAction(state: CombatState, action: PlayerActionId): CombatState {
  const s = clone(state);
  if (s.phase !== 'player-turn' || s.pendingRoll || s.outcome) return s;
  const p = s.player;
  const dice = new DiceStream(s.seed, s.rngCalls);

  switch (action) {
    case 'attack':
    case 'cantrip': {
      const atk = action === 'attack' ? p.attacks[0] : p.attacks[1];
      if (!atk || s.turn.actionUsed) return state;
      if (atk.save) {
        // Save-based cantrip: enemy saves now (auto); on failure the player rolls damage.
        s.turn.actionUsed = true;
        const saveMod = s.enemy.abilityMods[atk.save.ability];
        const roll = versus(
          dice.d20(`${s.enemy.name} — ${atk.save.ability.toUpperCase()} save`, saveMod),
          'DC',
          atk.save.dc,
          false,
        );
        roll.vs!.success = roll.total >= atk.save.dc;
        push(s, { kind: 'save', attacker: p.name, defender: s.enemy.name, attackName: atk.name, roll, dc: atk.save.dc, success: roll.vs!.success });
        if (!roll.vs!.success) {
          s.pendingRoll = pendingDamage(atk, false, false);
        } else {
          maybeAutoEndTurn(s);
        }
      } else {
        const advantage = p.conditions.feintAdvantage ? 'advantage' : undefined;
        s.pendingRoll = {
          id: `attack-${s.seq}`,
          kind: 'attack',
          label: `Attack roll — ${atk.name}`,
          formula: `1d20${fmtMod(atk.toHit ?? 0)}`,
          attackId: atk.id,
          advantage,
        };
      }
      break;
    }
    case 'martial-arts': {
      if (s.turn.bonusUsed || !s.turn.actionUsed) return state;
      const atk = martialArtsAttack(p);
      s.pendingRoll = {
        id: `attack-${s.seq}`,
        kind: 'attack',
        label: 'Bonus strike — Martial Arts',
        formula: `1d20${fmtMod(atk.toHit ?? 0)}`,
        attackId: 'martial-arts',
      };
      break;
    }
    case 'potion':
      if (s.turn.bonusUsed || p.resources.potions <= 0) return state;
      s.pendingRoll = { id: `potion-${s.seq}`, kind: 'potion', label: 'Healing potion', formula: '2d4+2' };
      break;
    case 'heal-spell':
      if (s.turn.actionUsed || !p.resources.healSpells) return state;
      s.pendingRoll = { id: `heal-${s.seq}`, kind: 'heal-spell', label: 'Cure Wounds', formula: `1d8${fmtMod(healSpellMod(p))}` };
      break;
    case 'second-wind':
      if (s.turn.bonusUsed || !p.resources.secondWind) return state;
      s.pendingRoll = { id: `sw-${s.seq}`, kind: 'second-wind', label: 'Second Wind', formula: '1d10+1' };
      break;
    case 'lay-on-hands': {
      if (s.turn.actionUsed || !p.resources.layOnHands) return state;
      s.turn.actionUsed = true;
      const amount = Math.min(p.resources.layOnHands, p.maxHp - p.hp);
      p.resources.layOnHands -= amount;
      p.hp += amount;
      push(s, {
        kind: 'heal',
        actor: p.name,
        source: 'Lay on Hands',
        amount,
        hpAfter: p.hp,
        hpMax: p.maxHp,
        woundsTended: tendWounds(p, 2),
      });
      maybeAutoEndTurn(s);
      break;
    }
    case 'rage':
      if (s.turn.bonusUsed || !p.resources.rage || p.conditions.raging) return state;
      s.turn.bonusUsed = true;
      p.resources.rage -= 1;
      p.conditions.raging = true;
      push(s, { kind: 'feature', actor: p.name, feature: 'Rage', detail: '+2 melee damage; resistance to weapon damage' });
      maybeAutoEndTurn(s);
      break;
    case 'feint': {
      if (s.turn.bonusUsed || p.conditions.feintAdvantage) return state;
      const decMod = p.abilityMods.cha + p.proficiency;
      s.pendingRoll = { id: `feint-${s.seq}`, kind: 'feint', label: 'Feint — Deception', formula: `1d20${fmtMod(decMod)}` };
      break;
    }
    case 'dodge':
      if (s.turn.actionUsed) return state;
      s.turn.actionUsed = true;
      p.conditions.dodging = true;
      push(s, { kind: 'dodge', actor: p.name });
      maybeAutoEndTurn(s);
      break;
    case 'escape': {
      if (s.turn.actionUsed) return state;
      const speedAdj = p.speed > s.enemy.speed ? 2 : p.speed < s.enemy.speed ? -2 : 0;
      s.pendingRoll = {
        id: `escape-${s.seq}`,
        kind: 'escape',
        label: 'Break away',
        formula: `1d20${fmtMod(p.escapeBonus + speedAdj)}`,
      };
      break;
    }
    case 'end-turn':
      endPlayerTurn(s);
      break;
  }

  s.rngCalls = dice.calls;
  return s;
}

function pendingDamage(atk: CombatantAttack, critical: boolean, isBonusStrike: boolean) {
  return {
    id: `damage-${atk.id}-${critical ? 'crit' : 'hit'}-${isBonusStrike ? 'b' : 'a'}`,
    kind: 'damage' as const,
    label: `Damage — ${atk.name}${critical ? ' (critical: dice doubled)' : ''}`,
    formula: `${critical ? doubledDice(atk.damageDice) : atk.damageDice}${atk.damageBonus ? fmtMod(atk.damageBonus) : ''}`,
    attackId: atk.id,
    critical,
  };
}

function doubledDice(dice: string): string {
  const m = /^(\d+)d(\d+)$/.exec(dice);
  return m ? `${Number(m[1]) * 2}d${m[2]}` : dice;
}

// ---------------------------------------------------------------------------
// Pending-roll resolution (the player clicked the dice)

export function rollPending(state: CombatState): CombatState {
  const s = clone(state);
  const pending = s.pendingRoll;
  if (!pending || s.outcome) return s;
  s.pendingRoll = null;
  const dice = new DiceStream(s.seed, s.rngCalls);
  const p = s.player;

  switch (pending.kind) {
    case 'initiative': {
      const pRoll = dice.d20(`${p.name} — initiative`, p.initiativeBonus);
      const eRoll = dice.d20(`${s.enemy.name} — initiative`, s.enemy.initiativeBonus);
      s.playerFirst = pRoll.total >= eRoll.total;
      s.round = 1;
      push(s, {
        kind: 'initiative',
        rolls: [
          { name: p.name, breakdown: pRoll },
          { name: s.enemy.name, breakdown: eRoll },
        ],
        firstName: s.playerFirst ? p.name : s.enemy.name,
      });
      push(s, { kind: 'round', round: 1 });
      s.phase = 'player-turn';
      s.turn = { actionUsed: false, bonusUsed: false };
      if (!s.playerFirst) {
        runEnemyTurn(s, dice);
        if (!s.outcome) startPlayerTurn(s);
      }
      break;
    }
    case 'attack': {
      const isBonusStrike = pending.attackId === 'martial-arts';
      const atk = isBonusStrike ? martialArtsAttack(p) : p.attacks.find((a) => a.id === pending.attackId)!;
      if (isBonusStrike) s.turn.bonusUsed = true;
      else s.turn.actionUsed = true;
      const roll = versus(
        dice.d20(`${p.name} — ${atk.name}`, atk.toHit ?? 0, pending.advantage),
        'AC',
        s.enemy.ac,
        false,
      );
      const hits = !roll.d20!.fumble && (roll.d20!.crit || roll.total >= s.enemy.ac);
      roll.vs!.success = hits;
      const outcome = roll.d20!.fumble ? 'fumble' : roll.d20!.crit ? 'crit' : hits ? 'hit' : 'miss';
      push(s, {
        kind: 'attack',
        attacker: p.name,
        defender: s.enemy.name,
        attackName: atk.name,
        attackVerb: atk.verb,
        roll,
        outcome,
      });
      if (p.conditions.feintAdvantage) p.conditions.feintAdvantage = false;
      if (hits) {
        s.pendingRoll = pendingDamage(atk, roll.d20!.crit, isBonusStrike);
      } else {
        maybeAutoEndTurn(s);
      }
      break;
    }
    case 'damage': {
      const isBonusStrike = pending.attackId === 'martial-arts';
      const atk = isBonusStrike
        ? martialArtsAttack(p)
        : p.attacks.find((a) => a.id === pending.attackId)!;
      const formula = pending.critical ? doubledDice(atk.damageDice) : atk.damageDice;
      let roll = dice.roll(`${formula}${atk.damageBonus ? fmtMod(atk.damageBonus) : '+0'}`, `Damage — ${atk.name}`);
      // Sneak Attack: a feinted weapon hit adds 1d6 (2d6 on a crit).
      const sneak = p.resources.feintAvailable && !isBonusStrike && wasFeintedAttack(s);
      if (sneak) {
        const extra = dice.roll(pending.critical ? '2d6' : '1d6', 'Sneak Attack');
        roll = {
          ...roll,
          label: `Damage — ${atk.name} + Sneak Attack`,
          formula: `${roll.formula} + ${extra.formula}`,
          rolls: [...roll.rolls, ...extra.rolls],
          total: roll.total + extra.total,
        };
      }
      let amount = roll.total;
      if (p.conditions.raging && atk.kind === 'melee') amount += 2;
      applyDamage(s, dice, 'player', 'enemy', atk, roll, Math.max(1, amount));
      if (!s.outcome) maybeAutoEndTurn(s);
      break;
    }
    case 'potion': {
      s.turn.bonusUsed = true;
      p.resources.potions -= 1;
      const roll = dice.roll('2d4+2', 'Healing potion');
      applyHealing(s, p, 'Healing potion', roll);
      maybeAutoEndTurn(s);
      break;
    }
    case 'heal-spell': {
      s.turn.actionUsed = true;
      p.resources.healSpells! -= 1;
      const roll = dice.roll(`1d8${fmtMod(healSpellMod(p))}`, 'Cure Wounds');
      applyHealing(s, p, 'Cure Wounds', roll);
      maybeAutoEndTurn(s);
      break;
    }
    case 'second-wind': {
      s.turn.bonusUsed = true;
      p.resources.secondWind! -= 1;
      const roll = dice.roll('1d10+1', 'Second Wind');
      applyHealing(s, p, 'Second Wind', roll);
      maybeAutoEndTurn(s);
      break;
    }
    case 'feint': {
      s.turn.bonusUsed = true;
      const decMod = p.abilityMods.cha + p.proficiency;
      const pRoll = dice.d20(`${p.name} — Deception`, decMod);
      const eRoll = dice.d20(`${s.enemy.name} — Insight`, s.enemy.abilityMods.wis);
      const success = pRoll.total > eRoll.total;
      if (success) p.conditions.feintAdvantage = true;
      push(s, {
        kind: 'feature',
        actor: p.name,
        feature: 'Feint',
        detail: success ? 'opening created — next attack has advantage and Sneak Attack' : 'seen through',
        roll: pRoll,
        opposedRoll: eRoll,
        success,
      });
      maybeAutoEndTurn(s);
      break;
    }
    case 'escape': {
      s.turn.actionUsed = true;
      const speedAdj = p.speed > s.enemy.speed ? 2 : p.speed < s.enemy.speed ? -2 : 0;
      const chance = escapeChance(s);
      const pRoll = dice.d20(`${p.name} — break away`, p.escapeBonus + speedAdj);
      const eRoll = dice.d20(`${s.enemy.name} — pursuit`, s.enemy.escapeBonus);
      const success = pRoll.total > eRoll.total;
      push(s, {
        kind: 'escape',
        actor: p.name,
        chancePct: Math.round(chance * 100),
        actorRoll: pRoll,
        opponentRoll: eRoll,
        success,
      });
      if (success) {
        finish(s, 'escaped');
      } else {
        // Free strike as you turn your back, then the enemy's turn proceeds.
        enemyAttack(s, dice, true);
        if (!s.outcome) endPlayerTurn(s, dice);
      }
      break;
    }
  }

  s.rngCalls = dice.calls;
  return s;
}

/** Whether the just-resolved weapon attack was made with feint advantage. */
function wasFeintedAttack(s: CombatState): boolean {
  for (let i = s.events.length - 1; i >= 0; i--) {
    const e = s.events[i];
    if (e.kind === 'attack' && e.attacker === s.player.name) {
      return e.roll.d20?.advantage === 'advantage';
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Damage / healing application

function applyDamage(
  s: CombatState,
  dice: DiceStream,
  attackerId: 'player' | 'enemy',
  defenderId: 'player' | 'enemy',
  atk: CombatantAttack,
  roll: RollBreakdown,
  amount: number,
  free = false,
): void {
  const defender = combatant(s, defenderId);
  const attacker = combatant(s, attackerId);
  let resisted = false;
  if (defender.conditions.raging && RAGE_RESISTS.has(atk.damageType)) {
    amount = Math.max(1, Math.floor(amount / 2));
    resisted = true;
  }
  defender.hp = Math.max(0, defender.hp - amount);
  const injury: Injury = {
    location: pickBodyPart(dice, defender.bodyParts),
    severity: severityFor(amount, defender.maxHp),
    round: s.round,
    source: atk.name,
    damageType: atk.damageType,
  };
  defender.injuries.push(injury);
  if (atk.rider === 'mockery-disadvantage') defender.conditions.mockeryDisadvantage = true;
  push(s, {
    kind: 'damage',
    attacker: attacker.name,
    defender: defender.name,
    attackName: atk.name,
    attackVerb: atk.verb,
    roll,
    amount,
    resisted,
    injury,
    hpAfter: defender.hp,
    hpMax: defender.maxHp,
    dropped: defender.hp <= 0,
  });
  if (defender.hp <= 0) {
    finish(s, defenderId === 'enemy' ? 'victory' : 'defeat');
  }
  void free;
}

function tendWounds(c: Combatant, max: number): string[] {
  const open = c.injuries.filter((i) => !i.healed);
  const tended = open.slice(-max);
  for (const i of tended) i.healed = true;
  return tended.map((i) => `${i.severity} to the ${i.location}`);
}

function applyHealing(s: CombatState, c: Combatant, source: string, roll: RollBreakdown): void {
  const amount = Math.min(Math.max(roll.total, 1), c.maxHp - c.hp);
  c.hp += amount;
  push(s, {
    kind: 'heal',
    actor: c.name,
    source,
    roll,
    amount,
    hpAfter: c.hp,
    hpMax: c.maxHp,
    woundsTended: tendWounds(c, 2),
  });
}

// ---------------------------------------------------------------------------
// Turn flow

function maybeAutoEndTurn(s: CombatState): void {
  if (s.outcome || s.pendingRoll) return;
  if (!s.turn.actionUsed) return;
  const bonusLeft = availableActions(s).some((a) => a.isBonus && a.enabled);
  if (!bonusLeft) endPlayerTurn(s);
}

function endPlayerTurn(s: CombatState, dice?: DiceStream): void {
  if (s.outcome) return;
  const d = dice ?? new DiceStream(s.seed, s.rngCalls);
  if (s.playerFirst) {
    runEnemyTurn(s, d);
    if (!s.outcome) {
      s.round += 1;
      push(s, { kind: 'round', round: s.round });
      startPlayerTurn(s);
    }
  } else {
    s.round += 1;
    push(s, { kind: 'round', round: s.round });
    runEnemyTurn(s, d);
    if (!s.outcome) startPlayerTurn(s);
  }
  if (!dice) s.rngCalls = d.calls;
}

function startPlayerTurn(s: CombatState): void {
  s.phase = 'player-turn';
  s.turn = { actionUsed: false, bonusUsed: false };
  s.player.conditions.dodging = false; // dodge lasts until your next turn starts
}

function runEnemyTurn(s: CombatState, dice: DiceStream): void {
  const e = s.enemy;
  if (s.outcome || e.hp <= 0) return;

  // Morale: a badly hurt foe may break and run.
  if (e.hp / e.maxHp <= 0.25 && e.morale !== 'fearless') {
    const dc = MORALE_DC[e.morale];
    const roll = versus(dice.d20(`${e.name} — nerve check`, e.abilityMods.wis), 'DC', dc, false);
    roll.vs!.success = roll.total >= dc;
    const fled = !roll.vs!.success;
    push(s, { kind: 'morale', actor: e.name, roll, dc, fled });
    if (fled) {
      finish(s, 'enemy-fled');
      return;
    }
  }

  enemyAttack(s, dice, false);
}

function enemyAttack(s: CombatState, dice: DiceStream, free: boolean): void {
  const e = s.enemy;
  const p = s.player;
  if (s.outcome || e.hp <= 0) return;
  const atk = e.attacks[e.attacks.length > 1 ? dice.die(e.attacks.length) - 1 : 0];

  let advantage: 'advantage' | 'disadvantage' | undefined;
  if (p.conditions.dodging && !free) advantage = 'disadvantage';
  if (e.conditions.mockeryDisadvantage) {
    advantage = 'disadvantage';
    e.conditions.mockeryDisadvantage = false;
  }

  const roll = versus(dice.d20(`${e.name} — ${atk.name}${free ? ' (free strike)' : ''}`, atk.toHit ?? 0, advantage), 'AC', p.ac, false);
  const hits = !roll.d20!.fumble && (roll.d20!.crit || roll.total >= p.ac);
  roll.vs!.success = hits;
  const outcome = roll.d20!.fumble ? 'fumble' : roll.d20!.crit ? 'crit' : hits ? 'hit' : 'miss';
  push(s, {
    kind: 'attack',
    attacker: e.name,
    defender: p.name,
    attackName: atk.name,
    attackVerb: atk.verb,
    roll,
    outcome,
    free,
  });
  if (!hits) return;

  const formula = `${roll.d20!.crit ? doubledDice(atk.damageDice) : atk.damageDice}${atk.damageBonus ? fmtMod(atk.damageBonus) : '+0'}`;
  const dmgRoll = dice.roll(formula, `Damage — ${atk.name}`);
  applyDamage(s, dice, 'enemy', 'player', atk, dmgRoll, Math.max(1, dmgRoll.total), free);
}

function finish(s: CombatState, outcome: CombatState['outcome']): void {
  s.outcome = outcome;
  s.phase = 'ended';
  s.pendingRoll = null;
  push(s, { kind: 'outcome', outcome: outcome! });
}

// ---------------------------------------------------------------------------

/** Inventory changes to persist after the battle (potions drunk). */
export function potionsRemaining(s: CombatState): number {
  return s.player.resources.potions;
}
