import { describe, expect, it } from 'vitest';
import type { WorldData } from '../data/worldLoader';
import type { PlayerLocation } from '../player/types';
import { START_DATE } from '../sim/calendar';
import { createStartingQuest, startingQuestDestination } from './startQuest';

function makeQuestWorld(): WorldData {
  const states = [
    { i: 1, name: 'Testland', fullName: 'Kingdom of Testland', capital: 1 },
  ];
  const burgs = [
    { i: 1, name: 'Crownport', cell: 10, x: 50, y: 50, state: 1, population: 15000 },
    { i: 2, name: 'Marketvale', cell: 20, x: 12, y: 10, state: 1, population: 4000 },
    { i: 3, name: 'Southwatch', cell: 30, x: 70, y: 72, state: 1, population: 9000 },
  ];
  return {
    world: { burgs },
    stateById: new Map(states.map((state) => [state.i, state])),
    burgById: new Map(burgs.map((burg) => [burg.i, burg])),
  } as unknown as WorldData;
}

const origin: PlayerLocation = {
  cellId: 20,
  x: 12,
  y: 10,
  stateId: 1,
  stateName: 'Kingdom of Testland',
  placeName: 'Marketvale',
  reason: 'Starting city.',
};

describe('starting quest generation', () => {
  it('sends a non-capital start to the national capital guild leader', () => {
    const wd = makeQuestWorld();
    const destination = startingQuestDestination(wd, origin, 1);
    expect(destination.placeName).toBe('Crownport');

    const quest = createStartingQuest(wd, origin, 'Test Hero', 1, START_DATE);
    expect(quest.status).toBe('active');
    expect(quest.destination.placeName).toBe('Crownport');
    expect(quest.instructions).toContain('sealed letter');
    expect(quest.instructions).toContain('return immediately');
    expect(quest.steps.map((step) => step.status)).toEqual(['active', 'pending', 'pending']);
  });

  it('uses the largest non-origin city if the character starts in the capital', () => {
    const wd = makeQuestWorld();
    const capitalOrigin = { ...origin, cellId: 10, x: 50, y: 50, placeName: 'Crownport' };
    expect(startingQuestDestination(wd, capitalOrigin, 1).placeName).toBe('Southwatch');
  });
});
