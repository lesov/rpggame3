import { describe, it, expect } from 'vitest';
import timeline from '../../data/events.timeline.json';
import { MONTH_LENGTHS } from '../sim/calendar';

const events = timeline.events;

describe('events.timeline.json', () => {
  it('has unique ids', () => {
    const ids = events.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('covers the century 1181-1281', () => {
    const years = events.map((e) => e.year);
    expect(Math.min(...years)).toBe(1181);
    expect(Math.max(...years)).toBe(1281);
    expect(events.length).toBeGreaterThanOrEqual(40);
  });

  it('has valid dates, kinds, and locations', () => {
    for (const e of events) {
      expect(e.month, e.id).toBeGreaterThanOrEqual(1);
      expect(e.month, e.id).toBeLessThanOrEqual(12);
      expect(e.day, e.id).toBeGreaterThanOrEqual(1);
      expect(e.day, e.id).toBeLessThanOrEqual(MONTH_LENGTHS[e.month - 1]);
      expect(['anchor', 'story'], e.id).toContain(e.kind);
      expect(e.title.length, e.id).toBeGreaterThan(3);
      expect(e.description.length, e.id).toBeGreaterThan(30);
      if ('burg' in e && e.burg !== undefined) {
        expect(e.burg, e.id).toBeGreaterThanOrEqual(1);
        expect(e.burg, e.id).toBeLessThanOrEqual(32); // capitals only in the timeline
      }
    }
  });

  it('keeps the load-bearing anchors', () => {
    const anchorIds = events.filter((e) => e.kind === 'anchor').map((e) => e.id);
    for (const required of [
      'hattin', 'diverted-crusade', 'kurultai', 'kozesleli-erased', 'kalka',
      'lubrolaralom-sacked', 'legnica', 'mohi', 'the-miracle', 'zinulb-sack',
      'ain-jalut', 'partition', 'pax-begins', 'shemsemyhe-falls', 'second-divine-storm',
    ]) {
      expect(anchorIds).toContain(required);
    }
  });
});
