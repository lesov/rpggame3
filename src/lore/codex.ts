export interface CodexEntry {
  id: string;
  title: string;
  subtitle: string;
  tags: string[];
  aliases: string[];
  body: string[];
}

export interface CodexTextToken {
  kind: 'text' | 'link';
  text: string;
  entryId?: string;
}

export const CODEX_ENTRIES: CodexEntry[] = [
  {
    id: 'duhi-troupe',
    title: 'The Duhi Troupe',
    subtitle: 'Secret order · assassins · known the length of Lepasoul',
    tags: ['Secret order', 'Assassins', 'Performers', 'Lepasoul-wide'],
    aliases: ["Duhi Troupe's", 'Duhi Troupe', 'the Duhi', 'Duhi'],
    body: [
      'Centuries ago the Duhi were only what their name still claims: a troupe of acrobats, tumblers, and rope-dancers who drew crowds in every market square from Evagreg to Yuri. The performances have never stopped — that is the genius of it. Somewhere in those long years the troupe understood that a body trained to fly between the high poles could just as easily be trained to kill, and the acrobats quietly became the thing the whole world now whispers about and no one can ever quite find.',
      'They take their students impossibly young. Through adoptions, bought debts, "rescued" orphans, and arrangements best left unspoken, the Duhi gather children — most no older than four — into hidden compounds scattered across Lepasoul. There the young are watched more than they are taught. Each child is measured against their own nature and shaped only along the grain of the talent they were born with.',
      'Once a year the troupe judges its own. Those who show the gift are kept and pushed harder; those who do not are quietly resettled in the cities, handed a trade and a plausible past, never knowing what they were spared or denied. Thousands live this way at any given moment. Almost none reach the end of it — of all the children who enter, only a handful survive the winnowing to graduate at twenty, and those few belong to the Duhi for the rest of their lives.',
    ],
  },
  {
    id: 'adventurers-guild',
    title: "The Adventurer's Guild",
    subtitle: 'Independent order · warriors, mages, and thieves · thirty-two national halls',
    tags: ['Guild', 'Independent order', 'The Ways', 'Lepasoul-wide'],
    aliases: ["Adventurers' Guild", "Adventurer's Guild", "the Adventurer's Guild", 'the Guild', 'Campfire', 'Firekeeper'],
    body: [
      "Ask a farmer what the Guild is and she will say: the people you hire when the thing in the well starts answering back. Ask a king and he will say, through his teeth: the only army in my realm that I do not command. Both are correct. The Adventurer's Guild is the oldest institution in the world that belongs to no crown and no church — warriors' lodge, mages' circle, and thieves' den under one roof. It does not ask what you were, only what you can do and whether you will swear. Thirty-two national guilds keep halls in every realm, and each answers not to its sovereign but to its own Firekeeper, and through them to the Campfire.",
      "Every sworn adventurer carries a coal — a medallion of fired clay bound in iron, struck at the hall where the oath was taken. To carry the coal is to be Guild; to have it broken before the hearth is to be cast out, and no hall in the world will shelter a broken coal. Rank is marked by fire: a Spark is newly sworn, running messages and clearing cellars; an Ember is proven in the field, taking contracts alone; a Flame is a veteran who may open a town post and train Sparks; a Hearth is a master, rarely more than two or three in a nation; and a Firekeeper heads a national guild and holds one of the thirty-two seats at the Campfire. Fewer than a thousand coals burn in all the world.",
      "The Guild keeps three kinds of house — a capital hall in each realm's first city, city halls in every city of consequence, and humble town posts above tavern common-rooms in perhaps half the market towns of the world; 164 doors in all bear the coal-and-flame. Its true wealth, and the reason crowns tolerate its independence, is the Ways: fifteen ancient portals raised many centuries ago by the wandering company that would, in time, become the Guild itself. The founders built them in the greatest cities of that age — but thrones and trade have wandered since, and more than one Way now opens onto the quiet square of a village that was once a capital of the world. The fees still fund the halls, and buy the Guild the only thing it wants from any throne — to be left alone.",
      "None now living can build a Way — not the Guild, not the mage-colleges, not the crowns that have paid fortunes to try. The founders' art died with them. What the Guild keeps instead is a liturgy: in each of the fifteen portal-towns its wardens tend the Way by rite and rote, polishing what must be polished, reciting what must be recited, renewing seals whose purpose no warden alive can name — everything done exactly as it was taught, because it has always been done so, and because the Ways still answer. Whether the rites are maintenance or prayer, not even the wardens will say; they stopped distinguishing centuries ago.",
      "The Guild's charter with the crowns is the Ash Compact: we abide the law of the land we stand in, we pay the tithe of the tenth on all contract-gold, and we draw no blade in any war of crowns. That last clause is its living heart. When realms go to war the Guild goes neutral — its coals escort refugees and hunt the monsters that follow armies like gulls follow ships, but they do not take the field. A coal who soldiers is a coal broken; the coal serves the road, not the banner.",
      "Above the national guilds sits no palace, only a fire. The Campfire is the council of all Firekeepers, meeting where the Speaker keeps their hall. By unbroken custom the Speaker is chosen from a lesser hall, never from the guilds of the great powers, so that no crown may claim the fire burns in its colors. The Campfire fixes the tithe, keeps the Rite of the Ways, and — its gravest power — may declare the Dousing, the closure of all halls and Ways in a realm whose crown has broken the Compact. It has been declared four times; no realm has endured it longer than three years.",
    ],
  },
];

const ENTRY_BY_ID = new Map(CODEX_ENTRIES.map((entry) => [entry.id, entry]));

const ALIASES = CODEX_ENTRIES.flatMap((entry) =>
  entry.aliases.map((alias) => ({ alias, entryId: entry.id })),
).sort((a, b) => b.alias.length - a.alias.length);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const ALIAS_PATTERN = new RegExp(
  `(^|[^A-Za-z])(${ALIASES.map((a) => escapeRegExp(a.alias)).join('|')})(?=$|[^A-Za-z])`,
  'g',
);

export function getCodexEntry(id: string | null | undefined): CodexEntry | undefined {
  return id ? ENTRY_BY_ID.get(id) : undefined;
}

export function findCodexEntryByAlias(alias: string): CodexEntry | undefined {
  const match = ALIASES.find((candidate) => candidate.alias.toLowerCase() === alias.toLowerCase());
  return match ? getCodexEntry(match.entryId) : undefined;
}

export function tokenizeCodexLinks(text: string): CodexTextToken[] {
  const tokens: CodexTextToken[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(ALIAS_PATTERN)) {
    const prefix = match[1] ?? '';
    const alias = match[2] ?? '';
    const aliasStart = match.index + prefix.length;
    const aliasEnd = aliasStart + alias.length;
    const entry = findCodexEntryByAlias(alias);
    if (!entry) continue;

    if (aliasStart > lastIndex) tokens.push({ kind: 'text', text: text.slice(lastIndex, aliasStart) });
    tokens.push({ kind: 'link', text: alias, entryId: entry.id });
    lastIndex = aliasEnd;
  }

  if (lastIndex < text.length) tokens.push({ kind: 'text', text: text.slice(lastIndex) });
  return tokens.length > 0 ? tokens : [{ kind: 'text', text }];
}
