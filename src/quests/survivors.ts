/**
 * The survivors of the guild-hall fire: the three people left of the player's
 * home branch. Semina is staff; Emgerdas and Seminol are sworn guild members
 * with full character sheets. Personality traits are hand-authored to match
 * their stories (withPersonalityTraits leaves existing trait sets untouched).
 */
import type { Person } from '../data/types';
import type { Ability, AbilityScores, CharacterAppearance, CharacterClassId, Skill } from '../player/types';
import { buildAppearance } from '../player/appearance';
import { abilityModifier, getClassRule, proficiencyBonusForLevel } from '../player/rules2024';

export interface NpcEquipmentItem {
  name: string;
  note?: string;
}

export interface NpcSheet {
  classId: CharacterClassId;
  className: string;
  level: number;
  proficiencyBonus: number;
  abilityScores: AbilityScores;
  maxHp: number;
  armorClass: number;
  speed: number;
  savingThrows: Ability[];
  skillProficiencies: Skill[];
  features: string[];
  equipment: NpcEquipmentItem[];
  appearance: CharacterAppearance;
}

export interface GuildSurvivor extends Person {
  sheet?: NpcSheet;
}

/** Fixed-average hit points: max die at level 1, average (rounded up) after. */
function npcMaxHp(classId: CharacterClassId, level: number, conScore: number): number {
  const die = getClassRule(classId).hitDie;
  const conMod = abilityModifier(conScore);
  const perLevel = die / 2 + 1;
  return Math.max(1, die + conMod + (level - 1) * (perLevel + conMod));
}

const EMGERDAS_SCORES: AbilityScores = { str: 8, dex: 12, con: 13, int: 17, wis: 14, cha: 10 };
const SEMINOL_SCORES: AbilityScores = { str: 12, dex: 17, con: 13, int: 8, wis: 14, cha: 10 };

const EMGERDAS_SHEET: NpcSheet = {
  classId: 'wizard',
  className: 'Wizard',
  level: 5,
  proficiencyBonus: proficiencyBonusForLevel(5),
  abilityScores: EMGERDAS_SCORES,
  maxHp: npcMaxHp('wizard', 5, EMGERDAS_SCORES.con),
  armorClass: 10 + abilityModifier(EMGERDAS_SCORES.dex),
  speed: 30,
  savingThrows: getClassRule('wizard').savingThrows,
  skillProficiencies: ['arcana', 'medicine'],
  features: [...getClassRule('wizard').levelOneFeatures, 'Guild potion-craft', 'Guild enchanting'],
  equipment: [
    { name: 'Spellbook', note: 'Never leaves his person; the only guild book that survived the fire.' },
    { name: "Herbalist's satchel", note: 'What he carried into the hills that night.' },
    { name: 'Moon-cut herbs', note: 'Gathered under the full moon, when their virtue is highest.' },
    { name: 'Component pouch' },
    { name: 'Walking staff' },
  ],
  appearance: buildAppearance(
    {
      skinColor: 'fair',
      hairColor: 'white',
      hairLength: 'long',
      facialHair: 'clean-shaven',
      eyeColor: 'grey',
      relativeHeight: 'tall',
      posture: 'stooped',
    },
    'human',
    'Human',
    EMGERDAS_SCORES,
  ),
};

const SEMINOL_SHEET: NpcSheet = {
  classId: 'ranger',
  className: 'Ranger',
  level: 1,
  proficiencyBonus: proficiencyBonusForLevel(1),
  abilityScores: SEMINOL_SCORES,
  maxHp: npcMaxHp('ranger', 1, SEMINOL_SCORES.con),
  armorClass: 11 + abilityModifier(SEMINOL_SCORES.dex), // leather armor
  speed: 30,
  savingThrows: getClassRule('ranger').savingThrows,
  skillProficiencies: ['survival', 'perception', 'stealth'],
  features: [...getClassRule('ranger').levelOneFeatures],
  equipment: [
    { name: 'Longbow', note: 'Caravan-guard issue; the string kept dry through two rainy seasons.' },
    { name: 'Quiver of arrows' },
    { name: 'Shortsword' },
    { name: 'Leather armor' },
    { name: "Traveler's kit", note: 'Bedroll, flint, waterskin — everything he owns is on his back.' },
  ],
  appearance: buildAppearance(
    {
      skinColor: 'olive',
      hairColor: 'auburn',
      hairLength: 'braided',
      facialHair: 'clean-shaven',
      eyeColor: 'green',
      relativeHeight: 'average',
      posture: 'guarded',
    },
    'elf',
    'Wood elf',
    SEMINOL_SCORES,
  ),
};

export const SEMINA: GuildSurvivor = {
  id: 'survivor-semina',
  role: 'guild_staff',
  title: "Maid of the Adventurers' Guild hall",
  name: 'Semina',
  gender: 'female',
  race: 'Human',
  age: 34,
  bio:
    'Kept the hall fed, swept, and honest for eleven years, and lived because she sleeps at her sister\'s house across town. ' +
    'She was first through the wreckage at dawn, and has not stopped searching it since — not for valuables, but for anything ' +
    'the families of the dead might bury. She counts the survivors out loud sometimes, as if the number might change.',
  personalityTraits: ['Haunted / Anxious', 'Compassionate', 'Diligent'],
};

export const EMGERDAS: GuildSurvivor = {
  id: 'survivor-emgerdas',
  role: 'guild_survivor',
  title: 'Guild alchemist and enchanter',
  name: 'Emgerdas',
  gender: 'male',
  race: 'Human',
  age: 61,
  bio:
    'The branch\'s master of potions and enchantment, and the reason coin kept coming in between contracts. Emgerdas says ' +
    'exactly what he means and nothing else, does not meet the eye, and keeps to routines as exact as his measures — the same ' +
    'path to the herb-slopes, the same hours, the same words. Conversation with him is work: he answers the question asked, ' +
    'not the one meant, and silence does not trouble him. None of it has ever mattered to the Guild, because his work is ' +
    'flawless. He was in the hills cutting herbs under the full moon when the hall burned, and he has already said, three ' +
    'times, in the same words: the flame was too hot. Wood does not burn like that.',
  personalityTraits: ['Eccentric', 'Honest', 'Patient'],
  sheet: EMGERDAS_SHEET,
};

export const SEMINOL: GuildSurvivor = {
  id: 'survivor-seminol',
  role: 'guild_survivor',
  title: 'Guild ranger, newly sworn',
  name: 'Seminol',
  gender: 'male',
  race: 'Wood Elf (Thyran)',
  age: 118,
  bio:
    'Sworn to the branch barely a season ago — young as his people count it, and the first of his family to carry a coal. ' +
    'He cannot read; contracts are read to him and he keeps every word. The Guild put him on caravan work, where a keen eye ' +
    'and a long bow matter more than letters, and he was two weeks on the road guarding a grain train when the hall burned. ' +
    'He came home to ashes and his sworn-kin\'s teeth. He follows whoever seems to know what to do, and means it.',
  personalityTraits: ['Loyal', 'Trusting', 'Brave'],
  sheet: SEMINOL_SHEET,
};

export const HALL_SURVIVORS: GuildSurvivor[] = [SEMINA, EMGERDAS, SEMINOL];

// ---- Scene text for the QuestPanel dialogue blocks -------------------------

export const RUINS_SCENE = {
  heading: 'Smoke over the hall',
  paragraphs: [
    'You smell it before you see it. Above the rooftops where the guild hall should stand there is only a thin grey column, ' +
      'leaning in the wind. The hall is a shell: the roof fallen in, the beams charred through, the coal-and-flame above the ' +
      'door scorched past reading. The stone itself is fire-glazed, and where the common room was, the ash lies fine and ' +
      'white as flour. In it you find what is left of the dead — teeth. Only teeth. No fire you have ever seen does that.',
    'Two rooms survived under sound roof at the back: the sleeping quarters and the small kitchen. Someone has swept the ' +
      'kitchen step. A woman in a maid\'s apron is picking through the wreckage, laying small things in a basket.',
  ],
  action: 'Inspect the remains',
};

export const SEMINA_SCENE = {
  heading: 'Semina, the hall\'s maid',
  paragraphs: [
    '"You\'re the Ember they sent to the capital." She does not stop sorting. "Last night — no, night before last now — it all ' +
      'went up at once. Not room to room the way a fire walks. At once. By the time the water-line formed there was nothing ' +
      'to wet but stone."',
    '"Four of ours are dead. Both the Harrel brothers. Old Vasha, who kept the ledgers. And the Flame-Commander." Now she ' +
      'stops. "He was standing his own night-watch. He always stood the short moon watch himself, so the young ones could ' +
      'sleep. There wasn\'t —" she looks at the basket, and closes it. "There wasn\'t anything left to lay out. You should ' +
      'know that whatever your letter says, the man it answers is gone."',
  ],
  action: 'Hear her out',
};

export const EMGERDAS_SCENE = {
  heading: 'Emgerdas, by the kitchen step',
  paragraphs: [
    'A tall, stooped man stands at the kitchen step with an herbalist\'s satchel still on his shoulder, looking at the ' +
      'ruin the way other men look at a ledger that does not balance. He does not greet you and does not meet your eye.',
    '"I was on the west slope. Full moon. Whitebell and marrowroot are best cut under a full moon; their virtue is a third ' +
      'again higher. I saw the light from the ridge at the second hour. I have said this already to the maid and to the ' +
      'watch, and now to you, which makes three times." A pause, precisely as long as it needs to be. "The flame was white ' +
      'at the base. Timber burns orange, at need yellow. Stone does not glaze at any heat a wood fire reaches. The flame ' +
      'was wrong. That is an observation, not a guess."',
    '"My laboratory was in the east wing. Alembic, retorts, the graduated measures, the binding-stylus, four hundredweight ' +
      'of glass and copper. All of it is slag. I require replacements before I can work, and the work pays for this hall, ' +
      'so the replacements are not optional." He adjusts the satchel strap and looks, briefly, somewhere near your collar. ' +
      '"You will arrange it. The Flame-Commander is dead, and you are what the Guild has sent back. I have a list. I will ' +
      'recite it when you are ready to write."',
  ],
  action: 'Take charge of what\'s left',
};

export const SEMINOL_SCENE = {
  heading: 'Seminol comes home',
  paragraphs: [
    'Boots on the cobbles, fast. A wood elf in road-dust rounds the corner with a longbow still strung across his back — ' +
      'and stops as if he has walked into a wall. His eyes go from the fallen roof to the scorched coal-and-flame over the ' +
      'door and back, twice, three times, as though the order of it might change.',
    '"I was with the grain train. Two weeks. They paid off the guard at the gate and I came straight —" He swallows. ' +
      '"I sleep there. Slept. My coal was struck at that hearth, seven months ago. My name is on the roll by the door, ' +
      'someone read it to me with their finger under the letters." The bow comes off his shoulder; he holds it like he ' +
      'does not remember what it is for. He looks at Emgerdas, then at you, and asks the only question he has: ' +
      '"What do I do now?"',
  ],
  action: 'Tell him he stays',
};
