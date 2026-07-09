/**
 * Plain narrator: factual, readable fallback lines used when no API key is
 * configured or a Claude request fails. No flourish — just what happened.
 */
import type { CombatEvent, CombatState } from '../types';
import { type NarrativeProvider, narratableEvents, once } from './types';

function hpNote(hpAfter: number, hpMax: number, name: string): string {
  if (hpAfter <= 0) return `${name} goes down.`;
  const frac = hpAfter / hpMax;
  if (frac <= 0.25) return `${name} is barely standing (${hpAfter}/${hpMax} HP).`;
  if (frac <= 0.5) return `${name} is badly hurt (${hpAfter}/${hpMax} HP).`;
  return `${name} has ${hpAfter}/${hpMax} HP left.`;
}

export function plainLine(e: CombatEvent, s: CombatState): string {
  switch (e.kind) {
    case 'attack': {
      if (e.outcome === 'miss' || e.outcome === 'fumble') {
        return `${e.attacker}'s ${e.attackName.toLowerCase()} misses ${e.defender}${e.outcome === 'fumble' ? ' badly' : ''}.`;
      }
      return `${e.attacker}'s ${e.attackName.toLowerCase()} connects${e.outcome === 'crit' ? ' — a critical hit' : ''}.`;
    }
    case 'damage': {
      const injury = e.injury ? ` — a ${e.injury.severity} to the ${e.injury.location}` : '';
      const resist = e.resisted ? ' (halved by rage)' : '';
      return `${e.attackName} ${e.attackVerb} ${e.defender} for ${e.amount} damage${resist}${injury}. ${hpNote(e.hpAfter, e.hpMax, e.defender)}`;
    }
    case 'save':
      return `${e.defender} ${e.success ? 'resists' : 'fails to resist'} ${e.attackName} (DC ${e.dc}).`;
    case 'heal': {
      const n = e.woundsTended.length;
      const wounds = n > 0 ? ` The ${e.woundsTended.join(' and the ')} ${n === 1 ? 'closes' : 'close'} over.` : '';
      return `${e.actor} recovers ${e.amount} HP from ${e.source} (${e.hpAfter}/${e.hpMax}).${wounds}`;
    }
    case 'feature': {
      if (e.success === false) return `${e.actor}'s ${e.feature.toLowerCase()} fails — ${e.detail ?? ''}`.trim();
      return `${e.actor} uses ${e.feature}${e.detail ? ` — ${e.detail}` : ''}.`;
    }
    case 'dodge':
      return `${e.actor} gives ground, weaving and covering — attacks against ${e.actor === s.player.name ? 'them' : 'it'} have disadvantage.`;
    case 'escape':
      return e.success
        ? `${e.actor} breaks away and runs — the fight is over.`
        : `${e.actor} tries to break away (${e.chancePct}% odds) and fails.`;
    case 'morale':
      return e.fled
        ? `${e.actor}'s nerve breaks — it flees the fight.`
        : `${e.actor} is badly hurt but holds its ground.`;
    case 'initiative':
      return `${e.firstName} moves first.`;
    default:
      return '';
  }
}

export class PlainNarrator implements NarrativeProvider {
  readonly id = 'plain' as const;

  intro(s: CombatState): AsyncIterable<string> {
    const w = s.scene.weather;
    const terrain = s.scene.terrainNotes.length > 0 ? ` ${s.scene.terrainNotes.join('; ')}.` : '';
    return once(
      `${s.scene.placeName}, ${s.scene.timeOfDay}, ${s.scene.season.toLowerCase()} — ${w.condition.toLowerCase()}, ` +
        `${w.tempF}°F, wind ${w.windCompass} ${w.windMph} mph.${terrain} ` +
        `${cap(s.enemy.descriptor)}. It means to fight.`,
    );
  }

  narrate(events: CombatEvent[], s: CombatState): AsyncIterable<string> {
    const lines = narratableEvents(events)
      .map((e) => plainLine(e, s))
      .filter(Boolean);
    return once(lines.join(' '));
  }

  outro(s: CombatState): AsyncIterable<string> {
    const injuries = s.player.injuries.filter((i) => !i.healed);
    const wounds =
      injuries.length > 0
        ? ` You carry ${injuries.length} untended ${injuries.length === 1 ? 'injury' : 'injuries'}: ${injuries
            .map((i) => `a ${i.severity} to the ${i.location}`)
            .join(', ')}.`
        : '';
    switch (s.outcome) {
      case 'victory':
        return once(`${cap(s.enemy.shortName)} is down and does not get up. The fight is over.${wounds}`);
      case 'defeat':
        return once(
          `Your legs give out and the ground comes up to meet you. Some time later you come to — robbed of dignity but alive, left for dead or not worth finishing.${wounds}`,
        );
      case 'escaped':
        return once(`You run until the sounds of pursuit die behind you.${wounds}`);
      case 'enemy-fled':
        return once(`${cap(s.enemy.shortName)} breaks and runs, crashing away until the sounds fade.${wounds}`);
      default:
        return once('The fight is over.');
    }
  }
}

function cap(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
