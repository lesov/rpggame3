import type { GameDate, GameTime } from '../sim/calendar';
import { addMinutes, toMinuteOrdinal } from '../sim/calendar';
import type { InventoryItem, PlayerCharacter, PlayerLocation } from '../player/types';
import type { Quest, QuestStep, QuestStepStatus } from './types';
import { GUILD_RESPONSE_LETTER_ID, SEALED_GUILD_LETTER_ID } from './startQuest';

export const COURIER_QUEST_ID = 'guild-sealed-letter';
export const RESPONSE_WAIT_MINUTES = 2 * 60;

export function isAtQuestLocation(player: PlayerCharacter, location: PlayerLocation): boolean {
  return player.location.cellId === location.cellId;
}

export function courierObjective(quest: Quest): PlayerLocation {
  return quest.phase === 'return-response' ? quest.origin : quest.destination;
}

export function questStepLabel(quest: Quest): string {
  if (quest.phase === 'return-response') return 'Return objective';
  if (quest.phase === 'wait-for-response') return 'Response pending';
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
