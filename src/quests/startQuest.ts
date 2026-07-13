import type { Burg } from '../data/types';
import type { WorldData } from '../data/worldLoader';
import type { GameDate } from '../sim/calendar';
import type { PlayerLocation } from '../player/types';
import { firekeeperForState } from '../lore/guild';
import type { Quest } from './types';

export const SEALED_GUILD_LETTER_ID = 'sealed-guild-letter';
export const GUILD_RESPONSE_LETTER_ID = 'guild-response-letter';

const GIVEN_NAMES = ['Marrek', 'Ilyra', 'Tovan', 'Sahra', 'Belisar', 'Nym', 'Odran', 'Veyra'];
const FAMILY_NAMES = ['Ashgate', 'Kerron', 'Duskvale', 'Mornfell', 'Sableford', 'Greywine', 'Cindermark', 'Harth'];

function hashText(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function guildHeadName(origin: PlayerLocation, characterName: string): string {
  const seed = hashText(`${origin.placeName}|${characterName}|guild-head`);
  return `${GIVEN_NAMES[seed % GIVEN_NAMES.length]} ${FAMILY_NAMES[Math.floor(seed / GIVEN_NAMES.length) % FAMILY_NAMES.length]}`;
}

/** The real national Firekeeper for the destination nation (from the lore). */
function firekeeperNameFor(wd: WorldData, stateId: number): string {
  const state = wd.stateById.get(stateId);
  return (state && firekeeperForState(state)?.name) ?? 'the Firekeeper';
}

function burgLocation(wd: WorldData, burg: Burg, reason: string): PlayerLocation {
  const state = wd.stateById.get(burg.state);
  return {
    cellId: burg.cell,
    x: burg.x,
    y: burg.y,
    stateId: state?.i ?? burg.state,
    stateName: state?.fullName ?? state?.name ?? 'Unclaimed lands',
    placeName: burg.name,
    reason,
  };
}

export function startingQuestDestination(wd: WorldData, origin: PlayerLocation, nationalityId: number): PlayerLocation {
  const state = wd.stateById.get(nationalityId);
  const capital = state ? wd.burgById.get(state.capital) : undefined;
  if (capital && capital.cell !== origin.cellId) {
    return burgLocation(wd, capital, `The nation's capital hall — the Firekeeper's seat.`);
  }

  const fallback = wd.world.burgs
    .filter((burg) => burg.state === nationalityId && burg.cell !== origin.cellId)
    .sort((a, b) => b.population - a.population)[0];
  if (fallback) return burgLocation(wd, fallback, `Nearest Adventurers' Guild hall holding the Firekeeper.`);

  return {
    ...origin,
    reason: `The local Adventurers' Guild hall; the Firekeeper is in the same city.`,
  };
}

export function createStartingQuest(wd: WorldData, origin: PlayerLocation, characterName: string, nationalityId: number, startedAt: GameDate): Quest {
  const destination = startingQuestDestination(wd, origin, nationalityId);
  const giverName = guildHeadName(origin, characterName);
  const targetName = firekeeperNameFor(wd, destination.stateId);
  const targetRole = `national head of the Adventurers' Guild`;
  const capitalRoute = destination.cellId === origin.cellId ? 'the local guildhall' : `${destination.placeName}, ${destination.stateName}`;

  return {
    id: 'guild-sealed-letter',
    title: 'Sealed Orders for the Capital',
    status: 'active',
    phase: 'deliver-letter',
    giverName,
    giverRole: `Head of the Adventurers' Guild in ${origin.placeName}`,
    origin,
    destination,
    targetName,
    targetRole,
    instructions:
      `${giverName} pressed a sealed letter into your hands and ordered you to carry it urgently to ${targetName}, ${targetRole.toLowerCase()} in ${capitalRoute}. ` +
      `You are to ask for a reply, wait while it is penned and sealed in front of you, and return immediately with the response letter.`,
    steps: [
      {
        id: 'deliver-sealed-letter',
        title: 'Deliver the sealed letter',
        description: `Take the sealed letter to ${targetName} at the Adventurers' Guild in ${destination.placeName}.`,
        status: 'active',
      },
      {
        id: 'wait-for-response',
        title: 'Wait for the response',
        description: 'Ask for the response and wait while it is written and sealed in front of you.',
        status: 'pending',
      },
      {
        id: 'return-response',
        title: 'Return immediately',
        description: `Ride back to ${giverName} in ${origin.placeName} with the response letter.`,
        status: 'pending',
      },
    ],
    startedAt,
  };
}
