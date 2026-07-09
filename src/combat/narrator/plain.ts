/**
 * Plain narrator: factual, readable fallback lines used when no API key is
 * configured or a Claude request fails. No flourish — just what happened.
 */
import type { Weather } from '../../sim/weather';
import type { CombatEvent, CombatState, CombatScene } from '../types';
import { type NarrativeProvider, narratableEvents, once } from './types';

/** Weather woven into felt experience rather than reported as numbers. */
function tempClause(f: number): string {
  if (f <= 5) return 'a killing cold that bites through every layer';
  if (f <= 22) return 'a bitter, breath-stealing cold';
  if (f <= 36) return 'a hard, raw chill';
  if (f <= 50) return 'a damp chill that gets into the joints';
  if (f <= 63) return 'cool, sharp air';
  if (f <= 76) return 'mild, easy air';
  if (f <= 85) return 'a close, clinging warmth';
  if (f <= 95) return 'a heavy, sweating heat';
  return 'a punishing, airless heat';
}

function windClause(mph: number, compass: string): string {
  if (mph < 2) return 'the air hangs dead still';
  if (mph < 8) return `a light breeze drifts out of the ${compass}`;
  if (mph < 15) return `a steady wind pushes from the ${compass}`;
  if (mph < 24) return `a hard ${compass} wind shoves at you`;
  return `a howling ${compass} gale tears across the open`;
}

function skyClause(w: Weather): string {
  if (w.precipitating) {
    if (w.tempF <= 34) return 'snow blows across the ground in stinging sheets';
    if (w.tempF <= 39) return 'sleet drives down cold and grey';
    return 'rain comes down in cold ropes';
  }
  switch (w.condition) {
    case 'Clear':
      return 'the sky is hard and clear';
    case 'Partly cloudy':
      return 'cloud drags overhead in ragged patches';
    case 'Overcast':
      return 'a low grey overcast presses down';
    case 'Fog':
      return 'fog gathers thick enough to swallow sound';
    default:
      return `the sky is ${w.condition.toLowerCase()}`;
  }
}

function locusOf(scene: CombatScene): string {
  return scene.placeName || `the open ${scene.biome.toLowerCase()}`;
}

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
    const scene = s.scene;
    const w = scene.weather;
    const nearby = scene.terrainNotes.find((n) => / mi from /.test(n));
    const footing = nearby ? ` ${cap(nearby)}, but no help is coming from there.` : '';
    return once(
      `${cap(scene.timeOfDay)} in ${locusOf(scene)}, deep in ${scene.season.toLowerCase()} — ${tempClause(w.tempF)}. ` +
        `Here ${windClause(w.windMph, w.windCompass)}, and ${skyClause(w)}.${footing} ` +
        `Across from you: ${s.enemy.descriptor}, and it means to fight.`,
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
        ? ` You carry ${injuries.length} untended ${injuries.length === 1 ? 'injury' : 'injuries'} away with you: ${injuries
            .map((i) => `a ${i.severity} to the ${i.location}`)
            .join(', ')}.`
        : ' By some grace you come through it unmarked.';
    // The world closes back in around whatever just happened.
    const tail = ` ${cap(skyClause(s.scene.weather))} still, indifferent to any of it, and ${locusOf(s.scene)} goes quiet again.`;
    switch (s.outcome) {
      case 'victory':
        return once(
          `${cap(s.enemy.shortName)} goes down and does not get up. You stand over it, chest heaving, the strength running out of your arms now that there is nothing left to swing at.${wounds}${tail}`,
        );
      case 'defeat':
        return once(
          `Your legs fold and the ground comes up to meet you. Some time later you come to — robbed and aching, sick with cold, but breathing; not worth the finishing, or simply left for dead.${wounds}${tail}`,
        );
      case 'escaped':
        return once(
          `You break contact and run, lungs burning, until the sounds of pursuit thin and fall away behind you and you can finally stop, bent double, hauling in air.${wounds}${tail}`,
        );
      case 'enemy-fled':
        return once(
          `${cap(s.enemy.shortName)} breaks and bolts, crashing away into the dark until the sound of it is gone. You are left standing — just barely, and not sure you could have taken much more.${wounds}${tail}`,
        );
      default:
        return once('The fight is over.');
    }
  }
}

function cap(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
