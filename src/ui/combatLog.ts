/**
 * Maps resolved combat events to the "show all calculations" lines rendered
 * beneath each narrative beat. Pure — shared by the UI and its tests.
 */
import { describeRoll } from '../combat/dice';
import type { CombatEvent } from '../combat/types';

export interface CalcLine {
  label: string;
  detail: string;
}

export function calcLinesForEvent(e: CombatEvent): CalcLine[] {
  switch (e.kind) {
    case 'initiative':
      return [
        ...e.rolls.map((r) => ({ label: `${r.name} initiative`, detail: describeRoll(r.breakdown) })),
        { label: 'Order', detail: `${e.firstName} acts first` },
      ];
    case 'attack':
      return [{ label: `${e.attacker} — ${e.attackName}`, detail: describeRoll(e.roll) }];
    case 'save':
      return [{ label: `${e.defender} — save vs ${e.attackName}`, detail: describeRoll(e.roll) }];
    case 'damage': {
      const inj = e.injury ? ` — ${e.injury.severity} to the ${e.injury.location}` : '';
      const resist = e.resisted ? ' (rage: halved)' : '';
      return [
        {
          label: `Damage — ${e.attackName}`,
          detail: `${describeRoll(e.roll)}${resist} → ${e.amount} to ${e.defender}${inj}. ${e.hpAfter}/${e.hpMax} HP`,
        },
      ];
    }
    case 'heal':
      return [
        {
          label: `${e.actor} — ${e.source}`,
          detail: `${e.roll ? describeRoll(e.roll) + ' → ' : ''}+${e.amount} HP → ${e.hpAfter}/${e.hpMax}`,
        },
      ];
    case 'feature': {
      const lines: CalcLine[] = [];
      if (e.roll && e.opposedRoll) {
        lines.push({ label: `${e.actor} — ${e.feature}`, detail: `${describeRoll(e.roll)} vs ${describeRoll(e.opposedRoll)} → ${e.success ? 'SUCCESS' : 'FAIL'}` });
      } else {
        lines.push({ label: `${e.actor} — ${e.feature}`, detail: e.detail ?? '' });
      }
      return lines;
    }
    case 'escape':
      return [
        {
          label: `${e.actor} — break away (${e.chancePct}% chance)`,
          detail: `${describeRoll(e.actorRoll)} vs ${describeRoll(e.opponentRoll)} → ${e.success ? 'ESCAPED' : 'CAUGHT'}`,
        },
      ];
    case 'morale':
      return [{ label: `${e.actor} — nerve check`, detail: `${describeRoll(e.roll)} vs DC ${e.dc} → ${e.fled ? 'BREAKS' : 'holds'}` }];
    default:
      return [];
  }
}

export function calcLinesForEvents(events: CombatEvent[]): CalcLine[] {
  return events.flatMap(calcLinesForEvent);
}
