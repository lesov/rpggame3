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

// ---------------------------------------------------------------------------
// Second-person references. The player is "you"; the foe keeps its shortName
// ("the wolf"). Raw numbers live in the calculation block, not the prose.

function isYou(name: string, s: CombatState): boolean {
  return name === s.player.name;
}
function subj(name: string, s: CombatState): string {
  return isYou(name, s) ? 'you' : s.enemy.shortName;
}
function poss(name: string, s: CombatState): string {
  return isYou(name, s) ? 'your' : `${s.enemy.shortName}'s`;
}

const SEVERITY_WEIGHT: Record<string, string> = {
  graze: 'a shallow, stinging graze',
  wound: 'a solid, honest wound',
  'deep wound': 'a deep, ugly wound',
  'grievous wound': 'a savage, crippling wound',
};

/** How the struck combatant is left, qualitatively — no numbers. */
function condClause(e: Extract<CombatEvent, { kind: 'damage' }>, s: CombatState): string {
  const you = isYou(e.defender, s);
  if (e.dropped) return you ? ' Your legs go, and you fall.' : ` ${cap(s.enemy.shortName)} folds and goes down.`;
  const frac = e.hpAfter / e.hpMax;
  if (frac <= 0.25) return you ? ' You can barely keep your feet.' : ` ${cap(s.enemy.shortName)} can barely stay standing.`;
  if (frac <= 0.5) return you ? ' You reel, badly hurt.' : ` ${cap(s.enemy.shortName)} staggers, badly hurt.`;
  if (frac <= 0.75) return you ? ' It bites deep, and it stays with you.' : ` ${cap(s.enemy.shortName)} feels that one.`;
  return '';
}

export function plainLine(e: CombatEvent, s: CombatState): string {
  switch (e.kind) {
    case 'attack': {
      // A connecting hit is narrated by the damage event that follows it.
      if (e.outcome === 'hit' || e.outcome === 'crit') return '';
      const atk = `${cap(poss(e.attacker, s))} ${e.attackName.toLowerCase()}`;
      if (e.outcome === 'fumble') return `${atk} goes wild and finds nothing but air.`;
      const defYou = isYou(e.defender, s);
      const dodges = defYou
        ? ['you turn it aside at the last moment', 'you throw yourself clear', 'you catch it on your guard and shove it off', 'you give ground and it finds only air']
        : [`${s.enemy.shortName} twists away from it`, `${s.enemy.shortName} rolls with it and comes up unhurt`, `it skitters back out of reach`, `it ducks under the swing`];
      return `${atk} comes in hard, but ${dodges[e.roll.total % dodges.length]}.`;
    }
    case 'damage': {
      const weight = e.injury ? SEVERITY_WEIGHT[e.injury.severity] ?? 'a wound' : 'a wound';
      const loc = e.injury ? `${poss(e.defender, s)} ${e.injury.location}` : subj(e.defender, s);
      const resist = e.resisted ? ' — the rage soaks the worst of it, but' : ' —';
      return `${cap(poss(e.attacker, s))} ${e.attackName.toLowerCase()} ${e.attackVerb} ${loc}${resist} ${weight}.${condClause(e, s)}`;
    }
    case 'save':
      return isYou(e.defender, s)
        ? `You brace and ${e.success ? 'ride out' : 'are caught full by'} ${e.attackName.toLowerCase()}.`
        : `${cap(s.enemy.shortName)} ${e.success ? 'shrugs off' : 'is caught full by'} ${e.attackName.toLowerCase()}.`;
    case 'heal': {
      const n = e.woundsTended.length;
      const opening =
        {
          'Healing potion': 'You tip back the potion and warmth spreads through you',
          'Second Wind': 'You drag in a breath and find a second wind',
          'Cure Wounds': 'You call up the light and the pain recedes',
          'Lay on Hands': 'You lay a hand to the hurt and will it closed',
        }[e.source] ?? 'You gather yourself and recover';
      const wounds = n > 0 ? `; the ${e.woundsTended.join(' and the ')} ${n === 1 ? 'closes' : 'close'} over` : '';
      return `${opening}${wounds}.`;
    }
    case 'feature': {
      if (e.feature === 'Rage') return 'You let the rage take you — the cold, the fear, all of it narrowing down to red.';
      if (e.feature === 'Feint')
        return e.success
          ? 'You sell the opening and it buys — an unguarded line opens up.'
          : 'You feint, but it reads you and does not bite.';
      if (e.success === false) return `Your ${e.feature.toLowerCase()} comes to nothing.`;
      return `You bring ${e.feature} to bear.`;
    }
    case 'dodge':
      return 'You stop pressing and cover up, weaving, giving ground — anything that comes at you now has to earn it.';
    case 'escape':
      return e.success
        ? 'You break contact and run, and this time nothing follows.'
        : 'You try to tear yourself free — and cannot; it stays right on you.';
    case 'morale':
      return e.fled
        ? `${cap(s.enemy.shortName)} has had enough — its nerve breaks and it bolts.`
        : `${cap(s.enemy.shortName)} is badly hurt, but it steadies and holds.`;
    case 'initiative':
      return isYou(e.firstName, s) ? 'You move first.' : `${cap(s.enemy.shortName)} is quicker off the mark.`;
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
