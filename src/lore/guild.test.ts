import { describe, expect, it, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { buildWorldData, type WorldData } from '../data/worldLoader';
import { FIREKEEPERS, GUILD_RANKS, firekeeperForState, guildBranchType, guildLeaderPeople } from './guild';
import type { Burg } from '../data/types';

let wd: WorldData;

beforeAll(() => {
  const dir = path.resolve(__dirname, '../../public/data');
  const read = (f: string) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  wd = buildWorldData(read('geometry.json'), read('world.json'), read('events.wars.json'));
});

describe('guild lore', () => {
  it('has all 32 Firekeepers and the rank ladder', () => {
    expect(Object.keys(FIREKEEPERS)).toHaveLength(32);
    expect(GUILD_RANKS).toEqual(['Spark', 'Ember', 'Flame', 'Hearth', 'Firekeeper']);
  });

  it('resolves a Firekeeper for every state in the world', () => {
    const states = wd.world.states.filter((s) => s.i > 0);
    expect(states).toHaveLength(32);
    for (const state of states) {
      const fk = firekeeperForState(state);
      expect(fk, state.fullName ?? state.name).toBeDefined();
      expect(fk!.name).toMatch(/^Firekeeper /);
    }
  });

  it('names the right Firekeeper for known nations', () => {
    const sio = wd.world.states.find((s) => (s.fullName ?? s.name) === 'Sio Empire')!;
    const shateria = wd.world.states.find((s) => (s.fullName ?? s.name) === 'Shaterian Theocracy')!;
    expect(firekeeperForState(sio)!.name).toBe('Firekeeper Talaran');
    expect(firekeeperForState(shateria)!.name).toBe('Firekeeper Timholt');
  });

  it('classifies a capital hall, a named city hall, and an ordinary burg', () => {
    const shateria = wd.world.states.find((s) => (s.fullName ?? s.name) === 'Shaterian Theocracy')!;
    const capital = wd.burgById.get(shateria.capital)!; // Smovere
    expect(guildBranchType(shateria, capital)).toBe('capital-hall');

    const knighbouria = wd.world.states.find((s) => (s.fullName ?? s.name) === 'Kingdom of Knighbouria')!;
    const contera = wd.world.burgs.find((b) => b.name === 'Contera')!;
    expect(guildBranchType(knighbouria, contera)).toBe('city-hall');

    const ordinary = { name: 'Nowhere-in-particular', capital: false, cell: -1 } as Burg;
    expect(guildBranchType(shateria, ordinary)).toBeUndefined();
  });

  it('exposes the Firekeeper as an Inspector person keyed to the capital state', () => {
    const sio = wd.world.states.find((s) => (s.fullName ?? s.name) === 'Sio Empire')!;
    const [fk] = guildLeaderPeople(sio);
    expect(fk.role).toBe('guild_firekeeper');
    expect(fk.title).toBe('Firekeeper');
    expect(fk.name).toBe('Talaran');
    expect(fk.stateId).toBe(sio.i);
  });
});
