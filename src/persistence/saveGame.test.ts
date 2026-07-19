import { describe, expect, it, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { buildWorldData, type WorldData } from '../data/worldLoader';
import { initialState } from '../ui/store';
import {
  serializeGame,
  deserializeGame,
  isCompatible,
  writeSlot,
  readSlot,
  deleteSlot,
  listSlotMeta,
  SAVE_VERSION,
  SLOT_COUNT,
} from './saveGame';

let wd: WorldData;
beforeAll(() => {
  const dir = path.resolve(__dirname, '../../public/data');
  const read = (f: string) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  wd = buildWorldData(read('geometry.json'), read('world.json'), read('events.wars.json'));
});

/** An in-memory Storage stand-in (vitest runs in a node env, no localStorage). */
function fakeStorage() {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
  };
}

describe('save serialization', () => {
  it('round-trips date, feed, and economy prices faithfully', () => {
    const state = initialState(wd);
    const env = serializeGame(state, wd);
    const restored = deserializeGame(env, wd)!;

    expect(restored).not.toBeNull();
    expect(restored.date).toEqual(state.date);
    expect(restored.feed.length).toBe(state.feed.length);
    expect(restored.economy.week).toBe(state.economy.week);
    expect(restored.economy.markets.size).toBe(state.economy.markets.size);

    // Spot-check price fidelity for a market with goods (compact codec, 2dp).
    const [burgId, market] = [...state.economy.markets].find(([, m]) => Object.keys(m.price).length > 0)!;
    const back = restored.economy.markets.get(burgId)!;
    for (const good of Object.keys(market.price)) {
      expect(back.price[good]).toBeCloseTo(market.price[good], 2);
    }
    // prev is regenerated as a copy of price on load.
    expect(back.prev).toEqual(back.price);
  });

  it('round-trips the guild-hall fire and defaults it for pre-fire saves', () => {
    const state = {
      ...initialState(wd),
      guildHallFire: { cellId: 42, burgId: 7, placeName: 'Testholm', date: initialState(wd).date },
    };
    const env = serializeGame(state, wd);
    expect(deserializeGame(env, wd)!.guildHallFire).toEqual(state.guildHallFire);

    // A save written before the fire feature existed has no such field.
    const legacy = { ...env, state: { ...env.state } } as typeof env;
    delete (legacy.state as Partial<typeof legacy.state>).guildHallFire;
    expect(deserializeGame(legacy, wd)!.guildHallFire).toBeNull();
  });

  it('fills save metadata from the world/date', () => {
    const state = initialState(wd);
    const env = serializeGame(state, wd);
    expect(env.version).toBe(SAVE_VERSION);
    expect(env.worldSeed).toBe(wd.geometry.seed);
    expect(env.meta.inGameDate).toEqual(state.date);
    expect(env.meta.savedAt).toBeGreaterThan(0);
  });

  it('rejects incompatible saves (version or world seed mismatch)', () => {
    const env = serializeGame(initialState(wd), wd);
    expect(isCompatible(env, wd)).toBe(true);

    expect(deserializeGame({ ...env, version: SAVE_VERSION + 1 }, wd)).toBeNull();
    expect(deserializeGame({ ...env, worldSeed: 'a-different-world' }, wd)).toBeNull();
  });
});

describe('slot storage', () => {
  it('writes, reads, lists, and deletes slots', () => {
    const storage = fakeStorage();
    const env = serializeGame(initialState(wd), wd);

    expect(listSlotMeta(storage).every((m) => m === null)).toBe(true);
    expect(listSlotMeta(storage)).toHaveLength(SLOT_COUNT);

    const w = writeSlot(1, env, storage);
    expect(w.ok).toBe(true);

    const back = readSlot(1, storage)!;
    expect(back.meta.inGameDate).toEqual(env.meta.inGameDate);

    const metas = listSlotMeta(storage);
    expect(metas[0]).toBeNull();
    expect(metas[1]).not.toBeNull();

    deleteSlot(1, storage);
    expect(readSlot(1, storage)).toBeNull();
  });

  it('returns a corrupt slot as null instead of throwing', () => {
    const storage = fakeStorage();
    storage.setItem('lepasoul.save.0', '{not valid json');
    expect(readSlot(0, storage)).toBeNull();
  });
});
