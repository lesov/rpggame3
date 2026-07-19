import { describe, expect, it } from 'vitest';
import { START_DATE, START_TIME } from '../sim/calendar';
import { makeTestCharacter } from '../combat/fixtures';
import type { PlayerCharacter } from '../player/types';
import {
  COURIER_QUEST_ID,
  STABILIZE_QUEST_ID,
  canInspectGuildRuins,
  canMeetEmgerdas,
  canMeetSeminol,
  canSpeakToSemina,
  deliverCourierLetter,
  inspectGuildRuins,
  meetSeminol,
  receiveCourierResponse,
  speakToSemina,
  startStabilizeQuest,
} from './progression';

/** Walk the courier quest to the return leg with the player back at the origin. */
function playerAtReturnLeg(): PlayerCharacter {
  const pc = makeTestCharacter('fighter');
  const quest = pc.quests[0];
  let player: PlayerCharacter = {
    ...pc,
    location: quest.destination,
    inventory: [
      ...pc.inventory,
      { id: 'sealed-guild-letter', name: 'Sealed guild letter', quantity: 1, category: 'quest' as const },
    ],
  };
  player = deliverCourierLetter(player, quest.id, START_DATE, START_TIME);
  player = receiveCourierResponse(player, quest.id);
  return { ...player, location: quest.origin };
}

describe('the burned hall (courier quest final leg)', () => {
  it('titles the giver Flame-Commander of the origin hall', () => {
    const quest = makeTestCharacter('fighter').quests[0];
    expect(quest.giverRole).toBe(`Flame-Commander of the Adventurers' Guild hall in ${quest.origin.placeName}`);
  });

  it('blocks inspecting the ruins away from the origin', () => {
    const pc = makeTestCharacter('fighter');
    const quest = pc.quests[0];
    let player: PlayerCharacter = {
      ...pc,
      location: quest.destination,
      inventory: [
        ...pc.inventory,
        { id: 'sealed-guild-letter', name: 'Sealed guild letter', quantity: 1, category: 'quest' as const },
      ],
    };
    player = deliverCourierLetter(player, quest.id, START_DATE, START_TIME);
    player = receiveCourierResponse(player, quest.id);
    // still at the capital
    expect(canInspectGuildRuins(player, player.quests[0])).toBe(false);
    expect(inspectGuildRuins(player, quest.id)).toBe(player);
  });

  it('inspecting the ruins reveals teeth, the two surviving rooms, and a new step', () => {
    let player = playerAtReturnLeg();
    expect(canInspectGuildRuins(player, player.quests[0])).toBe(true);
    player = inspectGuildRuins(player, COURIER_QUEST_ID);
    const quest = player.quests[0];
    expect(quest.phase).toBe('ruins-inspected');
    expect(quest.status).toBe('active');
    expect(quest.instructions).toContain('teeth');
    expect(quest.instructions).toContain('sleeping quarters');
    expect(quest.instructions).toContain('small kitchen');
    expect(quest.steps.map((s) => s.id)).toEqual([
      'deliver-sealed-letter',
      'wait-for-response',
      'return-response',
      'learn-what-happened',
    ]);
    expect(quest.steps.map((s) => s.status)).toEqual(['completed', 'completed', 'completed', 'active']);
  });

  it('speaking to Semina completes the quest with the four deaths on record', () => {
    let player = playerAtReturnLeg();
    player = inspectGuildRuins(player, COURIER_QUEST_ID);
    expect(canSpeakToSemina(player, player.quests[0])).toBe(true);
    player = speakToSemina(player, COURIER_QUEST_ID);
    const quest = player.quests[0];
    expect(quest.status).toBe('completed');
    expect(quest.steps.every((s) => s.status === 'completed')).toBe(true);
    expect(quest.instructions).toContain('four guild members died');
    expect(quest.instructions).toContain(quest.giverName);
    // The response letter stays: it is addressed to a dead man.
    expect(player.inventory.some((item) => item.id === 'guild-response-letter')).toBe(true);
  });

  it('meeting Emgerdas starts the stabilize quest with Seminol still arriving', () => {
    let player = playerAtReturnLeg();
    player = inspectGuildRuins(player, COURIER_QUEST_ID);
    expect(canMeetEmgerdas(player)).toBe(false); // courier quest not completed yet
    player = speakToSemina(player, COURIER_QUEST_ID);
    expect(canMeetEmgerdas(player)).toBe(true);
    player = startStabilizeQuest(player, START_DATE);
    expect(canMeetEmgerdas(player)).toBe(false); // only once
    const quest = player.quests.find((q) => q.id === STABILIZE_QUEST_ID)!;
    expect(quest.status).toBe('active');
    expect(quest.phase).toBe('seminol-arriving');
    expect(quest.giverName).toBe('Emgerdas');
    expect(quest.origin).toEqual(player.quests[0].origin);
    expect(quest.steps).toHaveLength(1);
    expect(quest.steps[0]).toMatchObject({ id: 'hold-the-branch', status: 'active' });
    expect(quest.instructions).toContain('sleeping quarters');
    expect(quest.instructions).toContain('too hot');
  });

  it('meeting Seminol clears the arrival phase and leaves the quest underway', () => {
    let player = playerAtReturnLeg();
    player = inspectGuildRuins(player, COURIER_QUEST_ID);
    player = speakToSemina(player, COURIER_QUEST_ID);
    player = startStabilizeQuest(player, START_DATE);
    expect(canMeetSeminol(player, player.quests.find((q) => q.id === STABILIZE_QUEST_ID)!)).toBe(true);
    player = meetSeminol(player, STABILIZE_QUEST_ID);
    const quest = player.quests.find((q) => q.id === STABILIZE_QUEST_ID)!;
    expect(quest.phase).toBeUndefined();
    expect(quest.status).toBe('active');
    expect(canMeetSeminol(player, quest)).toBe(false);
  });
});
