/**
 * Prompt assembly for the Claude narrator — kept separate from the network
 * client so it can be unit-tested without an API key.
 */
import type { Combatant, CombatEvent, CombatState } from '../types';

export const SYSTEM_STYLE = `You are the combat narrator for a mature, grim fantasy RPG. You render the mechanical results of a Dungeons & Dragons fight into short, visceral, grounded prose for an adult player.

Voice and rules:
- Address the player as "you". Refer to the enemy as given (e.g. "the wolf").
- 2-4 sentences per action beat. No headers, no lists, no dice numbers — the interface already shows the math beside your prose. Never restate hit points, modifiers, or "damage".
- Combat is ugly, frightening, and physical: breath, weight, mud, cold iron, the specific wrongness of being hurt. Show exhaustion, fear, and the sheer animal work of survival. Skill reads as economy of motion, not glory. Do not glorify violence or make it heroic; do not make it comedic.
- A miss is never nothing — it is a parry, a turned shoulder, a boot skidding in the mud, a blade caught on mail. Vary it.
- A hit's weight must match its severity (graze / wound / deep wound / grievous wound are given to you). Place it on the exact body part you are told. Track it: a slashed forearm keeps bleeding and weakening that hand; when a wound is tended, say which one closes.
- Use the environment — weather, cold, light, footing, time of day — sparingly and concretely, a detail or two per beat, never a weather report.
- For humanoid foes you may give a short spoken line when it fits (pain, a taunt, a plea). Beasts and undead do not speak. Suggested lines may be provided; use, adapt, or ignore them.
- Stay consistent with what you have already described in this fight.`;

function combatantSheet(c: Combatant, isPlayer: boolean): string {
  const label = isPlayer ? 'PLAYER' : 'ENEMY';
  const who = isPlayer ? `${c.name}, ${c.descriptor}` : c.descriptor;
  const armed = c.attacks.map((a) => a.name).join(', ');
  const barks = c.barks
    ? `\n  Optional spoken lines — taunts: ${c.barks.taunt.join(' | ')}; pain: ${c.barks.pain.join(' | ')}; panic: ${c.barks.panic.join(' | ')}`
    : '';
  return `${label}: ${who}. Armed with: ${armed}. Fights with a ${c.morale} disposition.${barks}`;
}

export function buildIntroMessage(s: CombatState): string {
  const w = s.scene.weather;
  return [
    `Draw the opening scene of this fight in 3-5 sentences. Establish where we are, the weather and light and time, the footing underfoot, and the enemy squaring off. End on the edge of violence — do not resolve any blows yet.`,
    ``,
    `SCENE:`,
    `- Place: ${s.scene.placeName}${s.scene.stateName ? `, in ${s.scene.stateName}` : ''}`,
    `- Terrain: ${s.scene.biome}${s.scene.terrainNotes.length ? '; ' + s.scene.terrainNotes.join('; ') : ''}`,
    `- Time & light: ${s.scene.timeOfDay}, ${s.scene.light} light`,
    `- Weather: ${w.condition}, ${w.tempF}°F, wind ${w.windCompass} ${w.windMph} mph — ${w.description}`,
    `- Season: ${s.scene.season}`,
    ``,
    combatantSheet(s.player, true),
    combatantSheet(s.enemy, false),
  ].join('\n');
}

function injuryLedger(c: Combatant): string {
  const open = c.injuries.filter((i) => !i.healed);
  if (open.length === 0) return 'unmarked so far';
  return open.map((i) => `${i.severity} to the ${i.location}`).join(', ');
}

function hpBand(c: Combatant): string {
  const f = c.hp / c.maxHp;
  if (c.hp <= 0) return 'down';
  if (f <= 0.25) return 'near collapse';
  if (f <= 0.5) return 'badly hurt';
  if (f <= 0.75) return 'bloodied';
  return 'fresh';
}

/** Compact factual description of what just happened, for the narrator to render. */
export function buildEventMessage(events: CombatEvent[], s: CombatState): string {
  const facts: string[] = [];
  for (const e of events) {
    switch (e.kind) {
      case 'attack':
        facts.push(
          e.outcome === 'hit' || e.outcome === 'crit'
            ? `${e.attacker}'s ${e.attackName} lands on ${e.defender}${e.outcome === 'crit' ? ' (a critical, exceptionally hard hit)' : ''}.`
            : `${e.attacker}'s ${e.attackName} fails to land on ${e.defender} (${e.outcome === 'fumble' ? 'a clumsy fumble' : 'evaded or turned aside'}).`,
        );
        break;
      case 'save':
        facts.push(`${e.defender} ${e.success ? 'shrugs off' : 'is caught by'} ${e.attackName}.`);
        break;
      case 'damage':
        facts.push(
          `${e.attackName} strikes ${e.defender} — a ${e.injury?.severity ?? 'wound'} to the ${e.injury?.location ?? 'body'}${e.injury ? ` (${e.injury.damageType})` : ''}${e.resisted ? ', though rage blunts it' : ''}. ${e.defender} is now ${e.dropped ? 'down' : hpBandFromEvent(e)}.`,
        );
        break;
      case 'heal':
        facts.push(
          `${e.actor} is restored by ${e.source}${e.woundsTended.length ? ` — the ${e.woundsTended.join(' and ')} close` : ''}. ${e.actor} is now ${bandFromFraction(e.hpAfter / e.hpMax)}.`,
        );
        break;
      case 'feature':
        facts.push(`${e.actor}: ${e.feature}${e.detail ? ` (${e.detail})` : ''}.`);
        break;
      case 'dodge':
        facts.push(`${e.actor} shifts to a full defensive weave, giving ground.`);
        break;
      case 'escape':
        facts.push(e.success ? `${e.actor} breaks contact and flees successfully.` : `${e.actor} tries to flee but is caught and cannot break away.`);
        break;
      case 'morale':
        facts.push(e.fled ? `${e.actor}'s nerve fails — it turns to flee.` : `${e.actor}, badly hurt, steadies itself and fights on.`);
        break;
    }
  }
  const state = `\n\nCurrent state — you: ${hpBand(s.player)}, injuries: ${injuryLedger(s.player)}. ${s.enemy.name}: ${hpBand(s.enemy)}, injuries: ${injuryLedger(s.enemy)}.`;
  return `Narrate this beat (2-4 sentences, prose only):\n${facts.map((f) => `- ${f}`).join('\n')}${state}`;
}

function hpBandFromEvent(e: Extract<CombatEvent, { kind: 'damage' }>): string {
  return bandFromFraction(e.hpAfter / e.hpMax);
}

function bandFromFraction(f: number): string {
  if (f <= 0) return 'down';
  if (f <= 0.25) return 'near collapse';
  if (f <= 0.5) return 'badly hurt';
  if (f <= 0.75) return 'bloodied';
  return 'largely unhurt';
}

export function buildOutroMessage(s: CombatState): string {
  const outcomeText = {
    victory: 'The player has won — the enemy is down and will not rise.',
    defeat: 'The player has lost — dropped to the ground, beaten, but NOT killed. They will come to later, alive. Do not narrate the player dying.',
    escaped: 'The player successfully fled the fight.',
    'enemy-fled': 'The enemy broke and fled the fight.',
  }[s.outcome ?? 'victory'];
  return [
    `Draw the closing scene in 3-5 sentences. ${outcomeText}`,
    `Reflect the accumulated toll: the player's untended injuries are: ${injuryLedger(s.player)}.`,
    `Show the aftermath honestly — the cost, the quiet, the body, the weather closing back in. No triumph unless earned; no comfort that isn't real.`,
  ].join('\n');
}
