import { buildScene } from '../combat/scene';
import { findNearby, inspectPlace } from '../data/inspect';
import type { WorldData } from '../data/worldLoader';
import type { PlayerCharacter } from '../player/types';
import { COURIER_QUEST_ID, STABILIZE_QUEST_ID } from '../quests/progression';
import { EMGERDAS, SEMINA, SEMINOL } from '../quests/survivors';
import { formatDate, formatTime24 } from '../sim/calendar';
import type { GameState } from '../ui/store';
import type { Burg } from '../data/types';

export interface ScenePainterPerson {
  name: string;
  role: string;
  looks: string;
  state: string;
}

export interface ScenePainterDraft {
  title: string;
  contextLines: string[];
  people: ScenePainterPerson[];
  prompt: string;
}

type SceneState = Pick<
  GameState,
  'date' | 'time' | 'player' | 'screen' | 'combat' | 'pendingEncounter' | 'guildHallFire'
>;

export function buildScenePainterDraft(wd: WorldData, state: SceneState): ScenePainterDraft | null {
  const player = state.player;
  if (!player) return null;

  const loc = player.location;
  const place = inspectPlace(wd, loc.cellId);
  const scene = state.combat?.scene ?? buildScene(wd, loc.cellId, loc.x, loc.y, state.date, state.time);
  const burg = exactSettlementAtPlayerLocation(wd, player);
  const setting = settingLine(wd, state, player, burg?.name, scene.placeName);
  const people = peopleInScene(player);
  const nearby = findNearby(wd, loc.x, loc.y, 50, 5)
    .filter((n) => n.kind !== 'burg' || n.name !== burg?.name)
    .map((n) => `${n.name} (${n.detail}, ${Math.round(n.distanceMi)} mi away)`);
  const civic = burg ? civicDetails(burg) : [];
  const terrainDetails = [
    ...scene.terrainNotes,
    place.relief ? `${place.relief.name} ${place.relief.type.replaceAll('_', ' ')}` : '',
    place.region ? `${place.region.name} ${place.region.type.replaceAll('_', ' ')}` : '',
    place.river ? `${place.river.name} ${place.river.type} nearby` : '',
    place.coastal ? 'coastal air and horizon light' : '',
  ].filter(Boolean);

  const contextLines = [
    `Date and time: ${formatDate(state.date)} at ${formatTime24(state.time)} (${scene.timeOfDay}, ${scene.light} light).`,
    `Setting: ${setting}`,
    `Realm and culture: ${place.state?.fullName ?? place.state?.name ?? player.location.stateName}; ${place.cultureName ?? player.cultureName ?? 'local culture unknown'}; ${place.religionName ?? player.religionName ?? 'local faith unknown'}.`,
    `Biome and terrain: ${scene.biome}; ${terrainDetails.length ? terrainDetails.join('; ') : place.terrainKind}.`,
    `Weather: ${scene.weather.description}; ${scene.weather.tempF}F; wind ${scene.weather.windCompass} at ${scene.weather.windMph} mph; ${scene.season}.`,
    civic.length ? `Settlement details: ${civic.join('; ')}.` : '',
    nearby.length ? `Nearby world details: ${nearby.join('; ')}.` : '',
    state.pendingEncounter ? `Immediate situation: stopped on the road by ${state.pendingEncounter.encounter.actor.descriptor}.` : '',
    state.combat ? `Immediate situation: battle scene with ${state.combat.enemy.name}; show tension and danger without stat blocks.` : '',
  ].filter(Boolean);

  return {
    title: burg ? `${burg.name} Scene Painter` : `${scene.placeName} Scene Painter`,
    contextLines,
    people,
    prompt: localPainterPrompt(contextLines, people),
  };
}

export function buildClaudePainterMessage(draft: ScenePainterDraft): string {
  return [
    'Turn these structured facts into one vivid fantasy image prompt for a scene-painting feature.',
    'Make it detailed, sensory-rich, and painterly. Interpret sensual as tactile and atmospheric: light on skin, fabric, weather, scent, temperature, motion, and mood.',
    'Keep it non-explicit and non-nude. Do not mention game stats or UI. Do not add people who are not listed.',
    'Return only the image prompt, 180-260 words.',
    '',
    'SCENE FACTS',
    ...draft.contextLines.map((line) => `- ${line}`),
    '',
    'PEOPLE',
    ...draft.people.map((person) => `- ${person.name}, ${person.role}: ${person.looks} State: ${person.state}`),
  ].join('\n');
}

function localPainterPrompt(contextLines: string[], people: ScenePainterPerson[]): string {
  const peopleText = people.map((p) => `${p.name}, ${p.role}, ${p.looks} ${p.state}`).join(' ');
  return [
    'Paint a vivid, detailed fantasy scene of the party in their current surroundings.',
    ...contextLines,
    `Party: ${peopleText}`,
    'Style: richly textured, cinematic but natural, sensory and intimate without nudity or explicit sexuality; emphasize faces, posture, clothing, equipment, weather, light, terrain, and the lived-in details of the place.',
  ].join(' ');
}

function settingLine(
  wd: WorldData,
  state: SceneState,
  player: PlayerCharacter,
  burgName: string | undefined,
  scenePlaceName: string,
): string {
  const loc = player.location;
  if (state.combat) return `${scenePlaceName}, where combat has broken out near ${loc.placeName}.`;
  if (state.pendingEncounter) return `${loc.placeName}, interrupted on the road before the journey can continue.`;
  if (state.guildHallFire?.cellId === loc.cellId) {
    return `the burned Adventurers' Guild hall of ${state.guildHallFire.placeName}, with the sleeping quarters and small kitchen still usable behind the ruin.`;
  }
  if (burgName) {
    const stateName = wd.stateById.get(loc.stateId)?.fullName ?? loc.stateName;
    return `the main square of ${burgName}${stateName ? ` in ${stateName}` : ''}.`;
  }
  return `${scenePlaceName}, ${loc.reason || loc.placeName}.`;
}

function exactSettlementAtPlayerLocation(wd: WorldData, player: PlayerCharacter): Burg | undefined {
  const loc = player.location;
  const cell = wd.geometry.cells[loc.cellId];
  const candidate = cell?.burg ? wd.burgById.get(cell.burg) : wd.world.burgs.find((b) => b.cell === loc.cellId);
  if (!candidate) return undefined;
  if (loc.placeName === candidate.name) return candidate;
  return wd.distanceMi(loc.x, loc.y, candidate.x, candidate.y) <= 0.75 ? candidate : undefined;
}

function civicDetails(burg: Burg): string[] {
  const details: string[] = [];
  details.push(`${burg.tier ?? burg.type} with ${Math.round(burg.population).toLocaleString()} people`);
  if (burg.capital) details.push('capital city');
  if (burg.port) details.push('port traffic');
  if (burg.walls) details.push('walls and gates');
  if (burg.plaza) details.push('public plaza');
  if (burg.portal) details.push(`${burg.portal.name ?? 'an ancient Way'} portal`);
  const buildings = burg.buildings.slice(0, 4).map((b) => b.name ?? b.type.replaceAll('_', ' '));
  if (buildings.length) details.push(`near ${buildings.join(', ')}`);
  if (burg.landmarks.majorTemple) details.push(`${burg.landmarks.majorTemple.name} temple`);
  if (burg.landmarks.palace) details.push(`${burg.landmarks.palace.name} palace`);
  return details;
}

function peopleInScene(player: PlayerCharacter): ScenePainterPerson[] {
  const people: ScenePainterPerson[] = [playerAsPainterPerson(player)];
  const stabilize = player.quests.find((q) => q.id === STABILIZE_QUEST_ID && q.status === 'active');
  const courierCompletedHere = player.quests.some(
    (q) => q.id === COURIER_QUEST_ID && q.status === 'completed' && q.origin.cellId === player.location.cellId,
  );
  if (stabilize && stabilize.origin.cellId === player.location.cellId) {
    people.push(npcAsPainterPerson(EMGERDAS, 'guild alchemist and surviving party member'));
    if (stabilize.phase !== 'seminol-arriving') {
      people.push(npcAsPainterPerson(SEMINOL, 'newly sworn guild ranger and surviving party member'));
    }
    people.push(npcAsPainterPerson(SEMINA, 'hall maid nearby in the ruins'));
  } else if (courierCompletedHere) {
    people.push(npcAsPainterPerson(SEMINA, 'hall maid nearby in the ruins'));
  }
  return people;
}

function playerAsPainterPerson(player: PlayerCharacter): ScenePainterPerson {
  const equipped = player.inventory.filter((item) => item.equipped).map((item) => item.name);
  const carried = player.inventory
    .filter((item) => !item.equipped && item.category !== 'coin')
    .slice(0, 4)
    .map((item) => `${item.quantity > 1 ? `${item.quantity} ` : ''}${item.name}`);
  const gear = [
    equipped.length ? `equipped with ${equipped.join(', ')}` : '',
    carried.length ? `carrying ${carried.join(', ')}` : '',
  ].filter(Boolean);
  return {
    name: player.name,
    role: `${player.guildRank}-rank level ${player.level} ${player.speciesName} ${player.className}`,
    looks: player.appearance?.descriptor ?? `${player.speciesName} ${player.className}; no detailed looks recorded.`,
    state: gear.length ? gear.join('; ') : 'ready for travel.',
  };
}

function npcAsPainterPerson(npc: typeof EMGERDAS | typeof SEMINA | typeof SEMINOL, role: string): ScenePainterPerson {
  return {
    name: npc.name,
    role,
    looks: npc.sheet?.appearance.descriptor ?? `${npc.age}-year-old ${npc.race}; ${npc.bio}`,
    state: npc.sheet?.equipment.length ? `with ${npc.sheet.equipment.slice(0, 3).map((i) => i.name).join(', ')}.` : 'watchful and shaken.',
  };
}
