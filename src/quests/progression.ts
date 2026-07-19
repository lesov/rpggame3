import type { GameDate, GameTime } from '../sim/calendar';
import { addMinutes, toMinuteOrdinal } from '../sim/calendar';
import type { InventoryItem, PlayerCharacter, PlayerLocation } from '../player/types';
import type { Quest, QuestStep, QuestStepStatus } from './types';
import { GUILD_RESPONSE_LETTER_ID, SEALED_GUILD_LETTER_ID } from './startQuest';

export const COURIER_QUEST_ID = 'guild-sealed-letter';
export const STABILIZE_QUEST_ID = 'stabilize-guild-branch';
export const RESPONSE_WAIT_MINUTES = 2 * 60;

export function isAtQuestLocation(player: PlayerCharacter, location: PlayerLocation): boolean {
  return player.location.cellId === location.cellId;
}

export function courierObjective(quest: Quest): PlayerLocation {
  return quest.phase === 'deliver-letter' || quest.phase === 'wait-for-response' ? quest.destination : quest.origin;
}

export function questStepLabel(quest: Quest): string {
  if (quest.phase === 'ruins-inspected') return 'At the ruins';
  if (quest.phase === 'return-response') return 'Return objective';
  if (quest.phase === 'wait-for-response') return 'Response pending';
  if (quest.id === STABILIZE_QUEST_ID) return 'Branch';
  return 'Delivery objective';
}

function setStepStatuses(quest: Quest, statuses: Record<string, QuestStepStatus>): QuestStep[] {
  return quest.steps.map((step) => ({ ...step, status: statuses[step.id] ?? step.status }));
}

function withoutItem(inventory: InventoryItem[], itemId: string): InventoryItem[] {
  return inventory
    .map((item) => (item.id === itemId ? { ...item, quantity: item.quantity - 1 } : item))
    .filter((item) => item.quantity > 0);
}

function addQuestItem(inventory: InventoryItem[], item: InventoryItem): InventoryItem[] {
  const existing = inventory.find((i) => i.id === item.id);
  if (!existing) return [...inventory, item];
  return inventory.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + item.quantity, note: item.note ?? i.note } : i));
}

function isCourierQuest(quest: Quest): boolean {
  return quest.id === COURIER_QUEST_ID && quest.status === 'active';
}

export function canDeliverCourierLetter(player: PlayerCharacter, quest: Quest): boolean {
  return isCourierQuest(quest) && quest.phase === 'deliver-letter' && isAtQuestLocation(player, quest.destination);
}

export function canReceiveCourierResponse(player: PlayerCharacter, quest: Quest): boolean {
  return isCourierQuest(quest) && quest.phase === 'wait-for-response' && isAtQuestLocation(player, quest.destination);
}

export function responseWaitRemainingMinutes(quest: Quest, date: GameDate, time: GameTime): number {
  if (!quest.responseReadyAt) return RESPONSE_WAIT_MINUTES;
  const now = toMinuteOrdinal({ date, time });
  const ready = toMinuteOrdinal(quest.responseReadyAt);
  return Math.max(0, ready - now);
}

export function deliverCourierLetter(player: PlayerCharacter, questId: string, date: GameDate, time: GameTime): PlayerCharacter {
  const quest = player.quests.find((q) => q.id === questId);
  if (!quest || !canDeliverCourierLetter(player, quest)) return player;
  const responseReadyAt = addMinutes({ date, time }, RESPONSE_WAIT_MINUTES);
  return {
    ...player,
    inventory: withoutItem(player.inventory, SEALED_GUILD_LETTER_ID),
    quests: player.quests.map((q) =>
      q.id === questId
        ? {
            ...q,
            phase: 'wait-for-response',
            responseReadyAt,
            instructions:
              `The Firekeeper's representative took the sealed letter and told you to wait nearby. ` +
              `A response will be penned and sealed in about two hours.`,
            steps: setStepStatuses(q, {
              'deliver-sealed-letter': 'completed',
              'wait-for-response': 'active',
              'return-response': 'pending',
            }),
          }
        : q,
    ),
  };
}

// ---- The burned hall: final leg of the courier quest -----------------------

export function canInspectGuildRuins(player: PlayerCharacter, quest: Quest): boolean {
  return isCourierQuest(quest) && quest.phase === 'return-response' && isAtQuestLocation(player, quest.origin);
}

export function inspectGuildRuins(player: PlayerCharacter, questId: string): PlayerCharacter {
  const quest = player.quests.find((q) => q.id === questId);
  if (!quest || !canInspectGuildRuins(player, quest)) return player;
  return {
    ...player,
    quests: player.quests.map((q) =>
      q.id === questId
        ? {
            ...q,
            phase: 'ruins-inspected' as const,
            instructions:
              `You returned to ${q.origin.placeName} to find the guild hall gutted by fire. ` +
              `Among the cold ash there is nothing left of the dead but teeth — no fire you have ever seen burns a body to teeth. ` +
              `Only the sleeping quarters and a small kitchen still stand under sound roof. ` +
              `A woman is picking through the wreckage; she may know what happened.`,
            steps: [
              ...setStepStatuses(q, { 'return-response': 'completed' }),
              {
                id: 'learn-what-happened',
                title: 'Find out what happened',
                description: 'Speak to the woman searching the ruins of the hall.',
                status: 'active' as const,
              },
            ],
          }
        : q,
    ),
  };
}

export function canSpeakToSemina(player: PlayerCharacter, quest: Quest): boolean {
  return isCourierQuest(quest) && quest.phase === 'ruins-inspected' && isAtQuestLocation(player, quest.origin);
}

export function speakToSemina(player: PlayerCharacter, questId: string): PlayerCharacter {
  const quest = player.quests.find((q) => q.id === questId);
  if (!quest || !canSpeakToSemina(player, quest)) return player;
  return {
    ...player,
    quests: player.quests.map((q) =>
      q.id === questId
        ? {
            ...q,
            status: 'completed' as const,
            instructions:
              `Semina, the hall's maid, told you everything: yesterday in the night the hall went up all at once, ` +
              `and four guild members died in it — among them ${q.giverName}, the Flame-Commander who sent you to the capital. ` +
              `The response letter you carried home is addressed to a dead man. Your errand is over; what it was for died with him.`,
            steps: setStepStatuses(q, { 'learn-what-happened': 'completed' }),
          }
        : q,
    ),
  };
}

export function completedCourierQuest(player: PlayerCharacter): Quest | undefined {
  return player.quests.find((q) => q.id === COURIER_QUEST_ID && q.status === 'completed');
}

export function canMeetEmgerdas(player: PlayerCharacter): boolean {
  const courier = completedCourierQuest(player);
  if (!courier || !isAtQuestLocation(player, courier.origin)) return false;
  return !player.quests.some((q) => q.id === STABILIZE_QUEST_ID);
}

export function startStabilizeQuest(player: PlayerCharacter, startedAt: GameDate): PlayerCharacter {
  if (!canMeetEmgerdas(player)) return player;
  const origin = completedCourierQuest(player)!.origin;
  const quest: Quest = {
    id: STABILIZE_QUEST_ID,
    title: 'Ashes of the Hearth',
    status: 'active',
    phase: 'seminol-arriving',
    giverName: 'Emgerdas',
    giverRole: `guild alchemist and enchanter in ${origin.placeName}`,
    origin,
    destination: origin,
    targetName: `The ${origin.placeName} guild hall`,
    targetRole: 'what remains of it',
    instructions:
      `The ${origin.placeName} branch of the Adventurers' Guild is down to three: you, Emgerdas, and Seminol. ` +
      `You are living out of the two rooms the fire spared — the sleeping quarters and the small kitchen. ` +
      `Emgerdas needs his laboratory equipment replaced before he can work, and he insists the flame that took the hall ` +
      `was wrong: far too hot for burning timber. Hold the branch together.`,
    steps: [
      {
        id: 'hold-the-branch',
        title: 'Hold the branch together',
        description: 'Keep the guild branch alive with Emgerdas and Seminol.',
        status: 'active',
      },
    ],
    startedAt,
  };
  return { ...player, quests: [...player.quests, quest] };
}

export function canMeetSeminol(player: PlayerCharacter, quest: Quest): boolean {
  return (
    quest.id === STABILIZE_QUEST_ID &&
    quest.status === 'active' &&
    quest.phase === 'seminol-arriving' &&
    isAtQuestLocation(player, quest.origin)
  );
}

export function meetSeminol(player: PlayerCharacter, questId: string): PlayerCharacter {
  const quest = player.quests.find((q) => q.id === questId);
  if (!quest || !canMeetSeminol(player, quest)) return player;
  return {
    ...player,
    quests: player.quests.map((q) =>
      q.id === questId
        ? (() => {
            const { phase: _phase, ...rest } = q;
            return rest;
          })()
        : q,
    ),
  };
}

export function receiveCourierResponse(player: PlayerCharacter, questId: string): PlayerCharacter {
  const quest = player.quests.find((q) => q.id === questId);
  if (!quest || !canReceiveCourierResponse(player, quest)) return player;
  return {
    ...player,
    inventory: addQuestItem(player.inventory, {
      id: GUILD_RESPONSE_LETTER_ID,
      name: 'Guild response letter',
      quantity: 1,
      category: 'quest',
      note: `For ${quest.giverName} in ${quest.origin.placeName}.`,
    }),
    quests: player.quests.map((q) =>
      q.id === questId
        ? (() => {
            const { responseReadyAt: _ready, ...rest } = q;
            return {
              ...rest,
              phase: 'return-response',
              instructions:
                `The response letter is sealed and in your keeping. Return immediately to ${q.giverName}, ${q.giverRole.toLowerCase()}, in ${q.origin.placeName}.`,
              steps: setStepStatuses(q, {
                'deliver-sealed-letter': 'completed',
                'wait-for-response': 'completed',
                'return-response': 'active',
              }),
            };
          })()
        : q,
    ),
  };
}
