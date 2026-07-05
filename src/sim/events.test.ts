import { describe, it, expect } from 'vitest';
import { buildScriptedEvents, fireBetween, ongoingWarsAt, type TimelineEntry, type WarEntry } from './events';
import { toOrdinal } from './calendar';

const timeline: TimelineEntry[] = [
  { id: 'hattin', year: 1187, month: 7, day: 4, title: 'Hattin analog', description: 'x', kind: 'anchor', burg: 32 },
  { id: 'crusade3', year: 1189, month: 5, day: 1, title: 'Third Crusade', description: 'x', kind: 'story' },
  { id: 'day-one', year: 1181, month: 1, day: 2, title: 'Opening', description: 'x', kind: 'story' },
];

const wars: WarEntry[] = [
  { id: 'war-0', name: 'Old War', start: 1150, end: 1153, attacker: 1, defender: 2 },
  { id: 'war-1', name: 'Ongoing War', start: 1178, end: null, attacker: 3, defender: 4 },
  { id: 'war-2', name: 'Future War', start: 1183, end: 1185, attacker: 5, defender: 6 },
];

const names = (id: number) => `State ${id}`;
const events = buildScriptedEvents(timeline, wars, names);

describe('scripted events', () => {
  it('sorts by date and builds war begin/end pairs', () => {
    for (let i = 1; i < events.length; i++) expect(events[i].ord).toBeGreaterThanOrEqual(events[i - 1].ord);
    const ids = events.map((e) => e.id);
    expect(ids).toContain('war-2-begins');
    expect(ids).toContain('war-2-ends');
    expect(ids).toContain('war-1-begins');
    expect(ids).not.toContain('war-1-ends');
  });

  it('war dates are deterministic and inside the given year', () => {
    const again = buildScriptedEvents(timeline, wars, names);
    expect(again).toEqual(events);
    const begin = events.find((e) => e.id === 'war-2-begins')!;
    expect(begin.date.year).toBe(1183);
  });

  it('fires each event exactly once when stepping day by day', () => {
    const start = toOrdinal({ year: 1181, month: 1, day: 1 });
    const end = toOrdinal({ year: 1190, month: 1, day: 1 });
    const fired: string[] = [];
    for (let ord = start; ord < end; ord++) {
      for (const e of fireBetween(events, ord, ord + 1)) fired.push(e.id);
    }
    expect(fired).toContain('hattin');
    expect(fired).toContain('day-one');
    expect(new Set(fired).size).toBe(fired.length); // no duplicates
  });

  it('fires the same set on one big jump as on daily steps', () => {
    const start = toOrdinal({ year: 1181, month: 1, day: 1 });
    const end = toOrdinal({ year: 1190, month: 1, day: 1 });
    const jump = fireBetween(events, start, end).map((e) => e.id);
    const daily: string[] = [];
    for (let ord = start; ord < end; ord++) daily.push(...fireBetween(events, ord, ord + 1).map((e) => e.id));
    expect(jump).toEqual(daily);
  });

  it('boundary is (prev, new]: event on prev does not refire', () => {
    const hattin = events.find((e) => e.id === 'hattin')!;
    expect(fireBetween(events, hattin.ord, hattin.ord + 1).map((e) => e.id)).not.toContain('hattin');
    expect(fireBetween(events, hattin.ord - 1, hattin.ord).map((e) => e.id)).toContain('hattin');
    expect(fireBetween(events, 5, 5)).toEqual([]);
  });

  it('lists ongoing wars at a given year', () => {
    const ongoing = ongoingWarsAt(wars, 1181);
    expect(ongoing.map((w) => w.id)).toEqual(['war-1']);
  });
});
