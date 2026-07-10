import { describe, it, expect } from 'vitest';
import { createCombat } from '../engine';
import { getMonster } from '../monsters';
import { makeTestCharacter, makeTestScene } from '../fixtures';
import type { CombatEvent, CombatState, Injury } from '../types';
import { PlainNarrator } from './plain';
import { ClaudeNarrator, type StreamingClient } from './claude';
import { collect } from './types';
import {
  buildIntroMessage,
  buildEventMessage,
  buildOutroMessage,
} from './prompt';

function baseState(): CombatState {
  return createCombat(makeTestCharacter('fighter'), getMonster('wolf'), makeTestScene(), 12345);
}

function withInjury(): CombatState {
  const s = baseState();
  const injury: Injury = {
    location: 'left forearm',
    severity: 'deep wound',
    round: 1,
    source: 'Bite',
    damageType: 'piercing',
  };
  return { ...s, player: { ...s.player, hp: 6, injuries: [injury] } };
}

const damageEvent: CombatEvent = {
  kind: 'damage',
  seq: 1,
  attacker: 'Wolf',
  defender: 'Testovar',
  attackName: 'Bite',
  attackVerb: 'tears into',
  roll: { label: 'Bite damage', formula: '1d4+2', rolls: [3], modifier: 2, total: 5 },
  amount: 5,
  injury: { location: 'left forearm', severity: 'deep wound', round: 1, source: 'Bite', damageType: 'piercing' },
  hpAfter: 6,
  hpMax: 12,
  dropped: false,
};

describe('prompt assembly', () => {
  it('intro carries scene, weather, time and both combatants', () => {
    const msg = buildIntroMessage(baseState());
    expect(msg).toContain('Rhakorash Savanna');
    expect(msg).toContain('Savanna');
    expect(msg).toContain('mid-afternoon');
    expect(msg).toContain('Partly cloudy');
    expect(msg).toContain('75°F');
    expect(msg).toContain('PLAYER');
    expect(msg).toContain('ENEMY');
  });

  it('event message carries the injury ledger and location', () => {
    const s = withInjury();
    const msg = buildEventMessage([damageEvent], s);
    expect(msg).toContain('left forearm');
    expect(msg).toContain('deep wound');
    // current-state summary reflects the open wound
    expect(msg.toLowerCase()).toContain('injuries');
  });

  it('outro states the outcome and untended injuries', () => {
    const s = { ...withInjury(), outcome: 'victory' as const };
    const msg = buildOutroMessage(s);
    expect(msg).toContain('won');
    expect(msg).toContain('left forearm');
  });

  it('defeat outro forbids narrating death', () => {
    const s = { ...baseState(), outcome: 'defeat' as const };
    const msg = buildOutroMessage(s);
    expect(msg.toLowerCase()).toContain('not kill');
  });
});

describe('PlainNarrator', () => {
  it('produces a factual intro and a damage line with the wound', async () => {
    const n = new PlainNarrator();
    const intro = await collect(n.intro(baseState()));
    expect(intro).toContain('Rhakorash Savanna');
    const line = await collect(n.narrate([damageEvent], withInjury()));
    // Prose, not a stat dump: the wound location is named, raw numbers are not.
    expect(line).toContain('left forearm');
    expect(line).not.toMatch(/\d+ damage/);
    expect(line.toLowerCase()).toContain('wound');
  });

  it('outro mentions untended injuries on defeat', async () => {
    const n = new PlainNarrator();
    const out = await collect(n.outro({ ...withInjury(), outcome: 'defeat' }));
    expect(out.toLowerCase()).toContain('untended');
    expect(out).toContain('left forearm');
  });
});

/** Fake streaming client that records prompts and emits scripted text deltas. */
function fakeClient(script: string): { client: StreamingClient; calls: { system: string; messages: { role: string; content: string }[] }[] } {
  const calls: { system: string; messages: { role: string; content: string }[] }[] = [];
  const client: StreamingClient = {
    messages: {
      stream(args) {
        calls.push({ system: args.system, messages: args.messages });
        async function* gen() {
          for (const ch of script.split(' ')) {
            yield { type: 'content_block_delta', delta: { type: 'text_delta', text: ch + ' ' } };
          }
        }
        const it = gen() as unknown as AsyncIterable<unknown> & { finalMessage(): Promise<{ content: unknown[] }> };
        it.finalMessage = async () => ({ content: [{ type: 'text', text: script }] });
        return it;
      },
    },
  };
  return { client, calls };
}

describe('ClaudeNarrator', () => {
  it('streams model prose and passes the scene + injuries in the prompt', async () => {
    const { client, calls } = fakeClient('Blood on the dry grass.');
    const n = new ClaudeNarrator(client);
    const out = await collect(n.narrate([damageEvent], withInjury()));
    expect(out.trim()).toBe('Blood on the dry grass.');
    expect(calls).toHaveLength(1);
    expect(calls[0].system).toContain('visceral');
    const userMsg = calls[0].messages.at(-1)!.content;
    expect(userMsg).toContain('left forearm');
    expect(userMsg).toContain('deep wound');
  });

  it('keeps a running transcript across beats for continuity', async () => {
    const { client, calls } = fakeClient('Line.');
    const n = new ClaudeNarrator(client);
    await collect(n.intro(baseState()));
    await collect(n.narrate([damageEvent], withInjury()));
    // second call should include the first user+assistant turns before the new user turn
    expect(calls[1].messages.length).toBe(3);
    expect(calls[1].messages[0].role).toBe('user');
    expect(calls[1].messages[1].role).toBe('assistant');
    expect(calls[1].messages[1].content).toContain('Line.');
    expect(calls[1].messages[2].role).toBe('user');
  });

  it('falls back to the plain line when the API throws', async () => {
    const client: StreamingClient = {
      messages: {
        stream() {
          throw new Error('network down');
        },
      },
    };
    const n = new ClaudeNarrator(client);
    const out = await collect(n.narrate([damageEvent], withInjury()));
    // Degrades to the plain prose line (which names the wound).
    expect(out).toContain('left forearm');
    expect(out.toLowerCase()).toContain('wound');
  });
});
