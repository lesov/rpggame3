import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import pool from '../../data/encounters.pool.json';
import assignments from '../../data/encounters.assignments.json';
import { applyCuratedEncounters, stripHtml, type EncounterAssignment, type EncounterPoolEntry } from './worldLoader';
import type { Marker } from './types';

const POOL = pool as EncounterPoolEntry[];
const ASSIGNMENTS = assignments as Record<string, EncounterAssignment>;

// Marker culture -> race the real map data requires, per marker id (from the
// raw Azgaar export; see AGENT_CHANGELOG.md for the full table).
const EXPECTED_RACE: Record<string, string> = {
  '181': 'Dwarf', '182': 'Wood Elf', '183': 'Leonin', '184': 'Leonin', '185': 'Leonin',
  '186': 'Wood Elf', '188': 'Human', '189': 'High Elf', '191': 'High Elf', '192': 'Wood Elf',
  '193': 'Human', '194': 'Human', '196': 'Human', '197': 'Human', '198': 'Human', '199': 'Human',
  '200': 'Dragonborn', '201': 'Human', '202': 'Human', '203': 'Human', '204': 'Wood Elf',
  '205': 'Human', '206': 'Human', '207': 'Human', '208': 'Leonin',
};

function makeMarker(over: Partial<Marker> = {}): Marker {
  return { i: 1, type: 'encounters', icon: '❗', x: 0, y: 0, cell: 1, ...over };
}

describe('stripHtml', () => {
  it('removes tags and decodes common entities', () => {
    expect(stripHtml('<div>You have encountered a character.</div><iframe src="x"></iframe>')).toBe(
      'You have encountered a character.',
    );
    expect(stripHtml('a &amp; b &#39;c&#39; &quot;d&quot;')).toBe(`a & b 'c' "d"`);
  });
});

describe('applyCuratedEncounters', () => {
  it('overlays a curated assignment onto its marker', () => {
    const testPool: EncounterPoolEntry[] = [
      { id: 'p1', name: 'Test Name', race: 'Human', sourceRace: 'human', gender: 'male', age: 30, archetype: 'sage', background: 'scholar', bio: 'A long biography.', portrait: '/assets/encounters/p1.webp', sourceUrl: 'https://example.com/p1' },
    ];
    const testAssignments: Record<string, EncounterAssignment> = { '5': { poolId: 'p1' } };
    const out = applyCuratedEncounters([makeMarker({ i: 5 })], testAssignments, testPool);
    expect(out[0].name).toBe('Test Name (Human)');
    expect(out[0].legend).toBe('A long biography.');
    expect(out[0].portrait).toBe('/assets/encounters/p1.webp');
  });

  it('applies name/race/bio overrides from the assignment over the pool defaults', () => {
    const testPool: EncounterPoolEntry[] = [
      { id: 'p1', name: 'Original', race: 'Elf', sourceRace: 'elf', gender: 'male', age: 30, archetype: 'sage', background: 'scholar', bio: 'Original bio.', portrait: '/assets/encounters/p1.webp', sourceUrl: 'https://example.com/p1' },
    ];
    const testAssignments: Record<string, EncounterAssignment> = {
      '5': { poolId: 'p1', race: 'Wood Elf', bio: 'Edited bio.' },
    };
    const out = applyCuratedEncounters([makeMarker({ i: 5 })], testAssignments, testPool);
    expect(out[0].name).toBe('Original (Wood Elf)');
    expect(out[0].legend).toBe('Edited bio.');
  });

  it('strips HTML from unassigned encounter markers instead of leaving raw markup', () => {
    const out = applyCuratedEncounters(
      [makeMarker({ i: 999, legend: '<div>You have encountered a character.</div><iframe src="https://deorum.vercel.app/encounter/1"></iframe>' })],
      {},
      [],
    );
    expect(out[0].legend).toBe('You have encountered a character.');
    expect(out[0].legend).not.toContain('<');
  });

  it('leaves non-encounters markers untouched', () => {
    const marker = makeMarker({ i: 1, type: 'portals', legend: '<b>keep me</b>' });
    const out = applyCuratedEncounters([marker], {}, []);
    expect(out[0]).toEqual(marker);
  });
});

describe('data/encounters.pool.json and data/encounters.assignments.json', () => {
  it('every assignment resolves to a pool entry', () => {
    for (const [markerId, a] of Object.entries(ASSIGNMENTS)) {
      expect(POOL.some((p) => p.id === a.poolId), `marker ${markerId} -> missing pool id ${a.poolId}`).toBe(true);
    }
  });

  it('has 29 curated encounter markers, none with leftover HTML', () => {
    expect(Object.keys(ASSIGNMENTS).length).toBe(29);
    const byId = new Map(POOL.map((p) => [p.id, p]));
    for (const [markerId, a] of Object.entries(ASSIGNMENTS)) {
      const entry = byId.get(a.poolId)!;
      const bio = a.bio ?? entry.bio;
      expect(bio, markerId).not.toMatch(/<[a-z]/i);
      expect(bio, markerId).not.toContain('deorum');
    }
  });

  it('every curated marker gets the race its map culture requires', () => {
    const byId = new Map(POOL.map((p) => [p.id, p]));
    for (const [markerId, expectedRace] of Object.entries(EXPECTED_RACE)) {
      const a = ASSIGNMENTS[markerId];
      expect(a, `marker ${markerId} should be assigned`).toBeDefined();
      const race = a.race ?? byId.get(a.poolId)!.race;
      expect(race, `marker ${markerId}`).toBe(expectedRace);
    }
  });

  it('fills every one of the 29 encounters markers — race need not match local culture', () => {
    // 187 (Yuan-ti) and 190/195/209 (Leonin) had no race-matched bio in the
    // first batch; per the human, these NPCs travel, so any bio works.
    for (const markerId of ['187', '190', '195', '209']) {
      expect(ASSIGNMENTS[markerId]).toBeDefined();
    }
  });

  it('every pool portrait file exists on disk', () => {
    const assetsDir = path.resolve(__dirname, '../../public/assets/encounters');
    for (const p of POOL) {
      const file = path.join(assetsDir, path.basename(p.portrait));
      expect(fs.existsSync(file), p.portrait).toBe(true);
    }
  });

  it('has no duplicate pool ids and every entry has a non-empty bio', () => {
    const ids = POOL.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of POOL) expect(p.bio.length).toBeGreaterThan(50);
  });
});
