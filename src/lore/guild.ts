/**
 * Adventurer's Guild data drawn from the canonical lore file
 * (lepasoul_adventurers_guild_codex.md). The world's 32 states map one-to-one to
 * the file's 32 national guilds by `fullName`, so Firekeepers are keyed by that
 * string. Each nation's capital burg is the file's capital-hall city.
 */
import type { Burg, Person, State } from '../data/types';
import { withPersonalityTraits } from '../data/personality';

/** Rank ladder, marked by fire: from newly sworn to national head. */
export type GuildRank = 'Spark' | 'Ember' | 'Flame' | 'Hearth' | 'Firekeeper';
export const GUILD_RANKS: GuildRank[] = ['Spark', 'Ember', 'Flame', 'Hearth', 'Firekeeper'];

export interface Firekeeper {
  name: string;
  race: string; // e.g. "Gnome (Litbarow)"
  age: number;
  isSpeaker?: boolean; // Speaker of the Campfire
  bio: string;
}

/** The 32 national Firekeepers, keyed by state fullName (Appendix / roster). */
export const FIREKEEPERS: Record<string, Firekeeper> = {
  'Gizinese Empire': { name: 'Firekeeper Niyara', race: 'Human (Nipha)', age: 52, bio: 'Scarred from a dozen campaigns; made her name riding down the man-hunters of the Forma Taiga alone through a winter that killed her whole company. Keeps the widest-flung network in the East.' },
  'Bobadelian Khaganate': { name: 'Firekeeper Vomosh', race: 'Human (Rohand)', age: 66, bio: 'Ailing but iron-willed; won his coal fifty years ago hauling caravans over the Basheva passes when toll-lords still hanged Guild clerks for sport.' },
  'Kozeslelian Khaganate': { name: 'Firekeeper Deretslav', race: 'Human (Rohand)', age: 63, bio: 'A schemer who trusts no one; his realm holds no Way, so his coals live on the caravan roads between them. Keeps meticulous ledgers of which caravans the Khagan’s men have "inspected."' },
  'Kopuzkyurt Khaganate': { name: 'Firekeeper Mogizha', race: 'Human (Rohand)', age: 57, bio: 'Pragmatic and coldly efficient; rose from portal-clerk to the master’s chair without ever taking a contract more glorious than a ledger audit.' },
  'Khanate of Chandmalagia': { name: 'Firekeeper Barra', race: 'Orc (Ghiz)', age: 49, bio: 'Famed for reckless courage; holds the only recorded contract for slaying a mirage, and still refuses to say how. Keeps the Compact with a blade across her knees.' },
  'Duchy of Kharbhat': { name: 'Firekeeper Kigkan', race: 'Goliath (Gugukek)', age: 88, bio: 'Keeps the smallest hall in the world at Ukin under the Endless Skies; patient as stone, he walked out of the high wastes forty years ago with a dead companion and an undeciphered map.' },
  'Grand Duchy of Mathathremo': { name: 'Firekeeper Barazan', race: 'Dwarf (Khiz)', age: 219, bio: 'Shrewd and unsmiling; earned her Hearth-rank sealing a delve beneath the Basheva Mountains that had eaten three companies before hers.' },
  'Ghronese Theocracy': { name: 'Firekeeper Gandur', race: 'Dwarf (Khiz)', age: 264, isSpeaker: true, bio: 'Speaker of the whole Campfire; beloved by the common folk and the only living soul to have crossed the Gabaramunz Waste on foot in high summer. Governs the greatest fellowship in the world from the least realm in the East.' },
  'Iocizaran Theocracy': { name: 'Firekeeper Haethra', race: 'Wood Elf (Metheine)', age: 371, bio: 'Haunted by a pirate fleet she was hired to break and did not; has hunted corsairs from the Gondon coast to open water ever since.' },
  'Republic of Nelkug': { name: 'Firekeeper Brinollu', race: 'Wood Elf (Metheine)', age: 289, bio: 'The youngest elf ever raised to a Firekeeper’s chair; a schemer who made his fortune before his fame delving Basheva vaults for the republic’s merchant houses. The republic holds no Way of its own — a slight its merchant fleets repay by quietly carrying half the trade that moves between the eastern portals.' },
  'Duchy of Sahlumerin': { name: 'Firekeeper Maldrinos', race: 'Dragonborn (Naliolazar)', age: 58, bio: 'Quick to anger and slow to forgive; wears the scorch-scars of the Gondon fire-caves he cleared to win his Hearth.' },
  "Cer'uan Theocracy": { name: 'Firekeeper Srakash', race: 'Lizardfolk (Arak)', age: 47, bio: 'Devout to the point of zealotry; won his coal dragging drowning tax-collectors out of the Borodino Swamps, a service their inhabitants have never forgiven.' },
  'Kingdom of Enelelt': { name: 'Firekeeper Shaviph', race: 'Yuan-ti (Migis)', age: 60, bio: 'More scholar than warrior; holds the Guild’s only chair of monster-lore and wrote the bestiary of the Montechiano Forest every Spark is beaten with. Keeps the densest post-network in the world.' },
  'Kingdom of Knighbouria': { name: 'Firekeeper Civilla', race: 'Human (Anor)', age: 44, bio: 'Beloved by the common folk, who remember she was a miller’s daughter with a borrowed sword when she took the contract on the Pontenerolo man-wolf. Wardens of the First Hearth answer to her hall.' },
  'Snowsian Theocracy': { name: 'Firekeeper Carbotri', race: 'Human (Anor)', age: 49, bio: 'Famed for reckless courage; once rode alone into a Bedolaga sandstorm to cut loose a swallowed caravan, returning with the survivors and the manifest. Answers the Divine Vicar’s call for war-blessings with "ash needs no blessing."' },
  'Principality of Shun': { name: 'Firekeeper Thelhoneas', race: 'Wood Elf (Thyran)', age: 588, bio: 'Keeps the flagship hall of the world at Lin Arlor; patient as stone, he arbitrated the last Dousing and crowns still lower their voices around him.' },
  'Grand Duchy of Kin': { name: 'Firekeeper Irerius', race: 'Wood Elf (Thyran)', age: 601, bio: 'Shrewd and unsmiling; cleared the Guallana barrow-roads so long ago the ballads disagree on his name. Spends his centuries’ patience keeping nineteen restless blades out of Grand Duke Itheas’s four wars.' },
  'Grand Duchy of Khundush': { name: 'Firekeeper Nionnor', race: 'Wood Elf (Thyran)', age: 644, bio: 'Quick to anger and slow to forgive; still carries the spear she drove through the Slow Forest’s shepherd-of-wolves an age of men ago. Has let Khundush’s towns wait three human generations to ask their burned posts back.' },
  'Grand Duchy of Garakhur': { name: 'Firekeeper Aiqualas', race: 'Wood Elf (Thyran)', age: 590, bio: 'More scholar than warrior; his sixty-volume survey of the Slow Forest’s ruins is the reason half the delving contracts in the West exist at all.' },
  'Duchy of Shiz': { name: 'Firekeeper Faeri', race: 'Wood Elf (Thyran)', age: 402, bio: 'Young and untested by her people’s reckoning; won her chair when her predecessor walked into the Guallana Forest and declined to walk back out.' },
  'Principality of Guzah': { name: 'Firekeeper Sathlond', race: 'Wood Elf (Thyran)', age: 419, bio: 'Haunted by a Rhakorash fire-season his post could not outrun; has drilled evacuation-craft into the western halls ever since, to the great profit of towns that never learn whom to thank.' },
  'Grand Duchy of Nolon': { name: 'Firekeeper Yaeluthei', race: 'High Elf (Mythlerion)', age: 502, bio: 'Devout in the Schism’s quiet fashion; hunts the Yaelunor Taiga’s winter-things with a longbow older than most realms.' },
  'Nakinb Theocracy': { name: 'Firekeeper Sheorien', race: 'Wood Elf (Thyran)', age: 433, bio: 'Pragmatic and coldly efficient; made his name breaking the Zuran raider-princes with contracts rather than crusades, to Hierarch Hanlenor’s theological irritation.' },
  'Principality of Guzadzar': { name: 'Firekeeper Malian', race: 'Wood Elf (Thyran)', age: 356, bio: 'A schemer who trusts no one — a survival trait in a Schismatic realm ringed by orthodox spears. Her clerks move more quiet correspondence through the Ways than the Campfire officially knows.' },
  'Sio Empire': { name: 'Firekeeper Talaran', race: 'Leonin (Thakar)', age: 47, bio: 'Feared even by allies; took the Rhakorash death-pride’s contract alone after it broke two full companies. The pelt hangs in her hall, and she does not discuss it.' },
  'Kingdom of Kalaghryka': { name: 'Firekeeper Khashor', race: 'Leonin (Thakar)', age: 44, bio: 'An outlander in a kingdom at war with his birth-empire; the Compact made flesh. Scarred from a dozen campaigns — all against monsters, he notes, before anyone asks.' },
  'Kingdom of Amalan': { name: 'Firekeeper Clobrook', race: 'Halfling (Sprinfield)', age: 71, bio: 'Beloved by the common folk, who insist she talked the Montechiano hag out of a village’s children with patience and a spectacular picnic. Cultivates a harmless-grandmother reputation with care.' },
  'Kingdom of Tarlivah': { name: 'Firekeeper Anpasar', race: 'Human (Torah)', age: 58, bio: 'Shrewd and unsmiling; rose from a caravan-guard Spark on the very roads his sixty-one coals now patrol. Keeps the richest provincial network in the world. Kings court him; he refers them to the tithe schedule.' },
  "Kingdom of Z'phei'se": { name: 'Firekeeper Oshet', race: 'Human (Torah)', age: 55, bio: 'Patient as stone; spent twenty years a Kfaraly Forest post-warden before the capital learned his name. Keeps eleven town posts — the frontier kingdom’s true border-wardens.' },
  'Kingdom of Khizdum': { name: 'Firekeeper Ryammar', race: 'Wood Elf (Thyran)', age: 468, bio: 'Famed for reckless courage; his Hearth-contract, taken alone against everyone’s advice, emptied a Guallana deep-warren the duchy’s army had walled up and abandoned. Keeps the second-greatest hall of the West.' },
  'Khatharbh Theocracy': { name: 'Firekeeper Ellotys', race: 'Wood Elf (Thyran)', age: 512, bio: 'Ailing but iron-willed; keeps her hall in a realm at odds with six neighbors and organized for war to its roots — the hardest Compact-post in the world.' },
  'Shaterian Theocracy': { name: 'Firekeeper Timholt', race: 'Gnome (Litbarow)', age: 182, bio: 'More scholar than warrior; mapped the Slow Forest deeps with instruments of his own devising, several of which the Guild has since prudently banned. Has had his refusal of the crusader-tithe printed, and hands it out.' },
};

/** The named great city halls (Appendix B), for branch flavor. */
export const CITY_HALL_BURGS = new Set<string>([
  'Tlaunyuethel', 'Nanormel', 'Ramur', 'Iniyon', 'Harhayautada', 'Bozgar', 'Grotri',
  'Milov', 'Lurov', 'Ulunaranthil', 'Irta', 'Chuepemar', "Math'jar", 'Ymseloralon',
  'Uguall', 'Keboimrud', 'Umyeras', 'Chaulran', 'Yvesinerinlu', 'Hlihei', 'Contera',
]);

export type GuildBranch = 'capital-hall' | 'city-hall';

export const GUILD_BRANCH_LABEL: Record<GuildBranch, string> = {
  'capital-hall': "capital hall (the Firekeeper's seat)",
  'city-hall': 'city hall',
};

export function firekeeperForState(state: Pick<State, 'fullName' | 'name'>): Firekeeper | undefined {
  return (state.fullName ? FIREKEEPERS[state.fullName] : undefined) ?? FIREKEEPERS[state.name];
}

/** A named Guild branch at this burg (capital or great city hall), if any. */
export function guildBranchType(state: Pick<State, 'capital'>, burg: Burg): GuildBranch | undefined {
  if (burg.capital || burg.cell === state.capital) return 'capital-hall';
  if (CITY_HALL_BURGS.has(burg.name)) return 'city-hall';
  return undefined;
}

/** The Firekeeper as a Person record for the Inspector, keyed to the capital. */
export function guildLeaderPeople(state: State): Person[] {
  const fk = firekeeperForState(state);
  if (!fk) return [];
  const title = fk.isSpeaker ? 'Firekeeper, Speaker of the Campfire' : 'Firekeeper';
  return [
    withPersonalityTraits({
      id: `firekeeper-${state.i}`,
      role: 'guild_firekeeper',
      title,
      name: fk.name.replace(/^Firekeeper\s+/, ''),
      gender: '',
      race: fk.race,
      age: fk.age,
      stateId: state.i,
      stateName: state.fullName ?? state.name,
      bio: fk.bio,
    }),
  ];
}
