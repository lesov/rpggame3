import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { buildWorldData, type WorldData } from '../data/worldLoader';
import { makeTestCharacter } from '../combat/fixtures';
import { buildAppearance } from '../player/appearance';
import { STABILIZE_QUEST_ID } from '../quests/progression';
import { buildClaudePainterMessage, buildScenePainterDraft } from './prompt';

let wd: WorldData;

beforeAll(() => {
  const dir = path.resolve(__dirname, '../../public/data');
  const read = (f: string) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  wd = buildWorldData(read('geometry.json'), read('world.json'), read('events.wars.json'));
});

function baseState(player = makeTestCharacter()) {
  return {
    date: { year: 1181, month: 1, day: 1 },
    time: { hour: 12, minute: 0 },
    player,
    screen: 'map' as const,
    combat: null,
    pendingEncounter: null,
    guildHallFire: null,
  };
}

describe('scene painter prompt', () => {
  it('places town scenes on the main square by default', () => {
    const burg = wd.world.burgs.find((b) => b.population > 0)!;
    const stateName = wd.stateById.get(burg.state)?.fullName ?? wd.stateById.get(burg.state)?.name ?? 'the realm';
    const player = {
      ...makeTestCharacter(),
      location: {
        cellId: burg.cell,
        x: burg.x,
        y: burg.y,
        stateId: burg.state,
        stateName,
        placeName: burg.name,
        reason: 'standing in town',
      },
    };
    const draft = buildScenePainterDraft(wd, baseState(player));
    expect(draft?.contextLines.join('\n')).toContain(`the main square of ${burg.name}`);
  });

  it('does not treat road or camp positions near a burg as the town square', () => {
    const burg = wd.world.burgs.find((b) => b.population > 0)!;
    const stateName = wd.stateById.get(burg.state)?.fullName ?? wd.stateById.get(burg.state)?.name ?? 'the realm';
    const player = {
      ...makeTestCharacter(),
      location: {
        cellId: burg.cell,
        x: burg.x + 100,
        y: burg.y + 100,
        stateId: burg.state,
        stateName,
        placeName: 'the road to Farburg',
        reason: 'camped beside the road after an interrupted journey',
      },
    };
    const draft = buildScenePainterDraft(wd, baseState(player))!;
    const context = draft.contextLines.join('\n');
    expect(context).not.toContain(`the main square of ${burg.name}`);
    expect(context).toContain('camped beside the road');
  });

  it('includes wilderness biome, weather, time, and player appearance', () => {
    const cell = wd.geometry.cells.find((c) => c.h >= 20 && c.burg === 0 && c.state > 0)!;
    const stateName = wd.stateById.get(cell.state)?.fullName ?? wd.stateById.get(cell.state)?.name ?? 'the open country';
    const appearance = buildAppearance(
      {
        skinColor: 'deep-brown',
        hairColor: 'white',
        hairLength: 'long',
        facialHair: 'trimmed-beard',
        eyeColor: 'gold',
        relativeHeight: 'very-tall',
        posture: 'forward-leaning',
      },
      'human',
      'Human',
      { str: 18, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
    );
    const player = {
      ...makeTestCharacter(),
      appearance,
      location: {
        cellId: cell.i,
        x: cell.p[0],
        y: cell.p[1],
        stateId: cell.state,
        stateName,
        placeName: 'the open country',
        reason: 'travelling far from town',
      },
    };
    const draft = buildScenePainterDraft(wd, baseState(player))!;
    const allText = `${draft.contextLines.join('\n')}\n${draft.prompt}`;
    expect(allText).toContain('midday');
    expect(allText).toContain('Weather:');
    expect(allText).toContain(appearance.descriptor);
  });

  it('uses the burned guild hall as specific context when that event is current', () => {
    const player = makeTestCharacter();
    const draft = buildScenePainterDraft(wd, {
      ...baseState(player),
      guildHallFire: {
        cellId: player.location.cellId,
        placeName: player.location.placeName,
        date: { year: 1181, month: 1, day: 1 },
      },
    })!;
    expect(draft.contextLines.join('\n')).toContain("burned Adventurers' Guild hall");
  });

  it('adds guild branch survivors when the stabilize quest has gathered them', () => {
    const player = makeTestCharacter();
    const quest = {
      ...player.quests[0],
      id: STABILIZE_QUEST_ID,
      status: 'active' as const,
      phase: undefined,
      origin: player.location,
      destination: player.location,
    };
    const draft = buildScenePainterDraft(wd, baseState({ ...player, quests: [quest] }))!;
    expect(draft.people.map((p) => p.name)).toEqual(['Testovar', 'Emgerdas', 'Seminol', 'Semina']);
  });

  it('formats a Claude request with scene facts and non-explicit sensual guidance', () => {
    const draft = buildScenePainterDraft(wd, baseState())!;
    const msg = buildClaudePainterMessage(draft);
    expect(msg).toContain('SCENE FACTS');
    expect(msg).toContain('PEOPLE');
    expect(msg).toContain('sensory-rich');
    expect(msg).toContain('non-explicit');
  });
});
