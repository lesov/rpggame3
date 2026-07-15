import { describe, expect, it, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { buildWorldData, type WorldData } from './worldLoader';
import { peopleFor } from './inspect';
import { OPPOSING_PERSONALITY_TRAIT_PAIRS, assignPersonalityTraits } from './personality';

let wd: WorldData;

beforeAll(() => {
  const dir = path.resolve(__dirname, '../../public/data');
  const read = (f: string) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  wd = buildWorldData(read('geometry.json'), read('world.json'), read('events.wars.json'));
});

function expectValidTraitSet(traits: readonly string[] | undefined) {
  expect(traits).toHaveLength(3);
  expect(new Set(traits).size).toBe(3);
  for (const [a, b] of OPPOSING_PERSONALITY_TRAIT_PAIRS) {
    expect(traits?.includes(a) && traits.includes(b)).toBe(false);
  }
}

describe('NPC personality traits', () => {
  it('assigns exactly three deterministic traits without opposites', () => {
    const first = assignPersonalityTraits('same-person');
    const second = assignPersonalityTraits('same-person');
    expect(second).toEqual(first);
    expectValidTraitSet(first);
  });

  it('adds trait sets to all loaded people', () => {
    expect(wd.world.people.length).toBeGreaterThan(0);
    for (const person of wd.world.people) {
      expectValidTraitSet(person.personalityTraits);
    }
  });

  it('adds trait sets to generated Firekeeper NPCs shown in the inspector', () => {
    const state = wd.world.states.find((s) => s.i > 0)!;
    const people = peopleFor(wd, state.i);
    const firekeeper = people.find((p) => p.role === 'guild_firekeeper');
    expect(firekeeper).toBeDefined();
    expectValidTraitSet(firekeeper?.personalityTraits);
  });
});
