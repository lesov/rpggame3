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
  {
    id: 'the-gates',
    title: 'The Gates',
    subtitle: 'Fifteen ancient arches · the Ways · kept by the Guild, understood by no one',
    tags: ['The Ways', 'Gatewrights', 'Travel', 'Lepasoul-wide'],
    aliases: ['the Gates', 'the gates', 'Gatewrights', 'Gatewright', 'the Ways', 'the arches', 'gate-wan', 'hearth-credit'],
    body: [
      "Fifteen arches of seamless stone stand in fifteen towns, raised by the Gatewrights — the wandering company whose heirs became the Adventurer's Guild — in cities that were great when the arches were young. Step through one, if the arch consents, and you step out of another, across a continent, between two beats of your heart. The Guild keeps them by inheritance and liturgy; the tolls are the Guild's; the mystery is everyone's. How the gates work, nobody knows. How you must work to use one fills every toll-book in the world, because the arch's price is not paid in gold. The gold is the cheap part.",
      "The arch carries flesh, and only flesh, and only clean flesh, and only flesh that thinks. Nothing you carry crosses — no blade, no ring, no coin, no thread; travelers pass naked as their name-day. The body must be empty: the arch refuses a meal, a splinter, a swallowed pearl, and — mark this well — ink. A single tattoo bars you from every gate in the world for life, which is why great houses forbid the needle to their children, why certain courts sentence criminals to it, and why the quiet assassins called inkers, who ground a fleeing lord forever with one scratch, exist at all. And the body must think: drive a pig at the arch and the pig trots through it, because to the arch nothing arrived. The impure and the unthinking do not fail loudly — they simply walk through, as through any doorway, and the wardens mark another line in the refusal-book. Scars pass; they are you. The child in your belly passes. Your grandmother's ashes never will.",
      "The true toll is two days. Because the body must be empty, the body must be emptied — fasting, clean waters, bitter draughts, endured in the gatehouse's purge-cells under guild physicians whose discretion is part of the fee — two days in a known building, weakening by the hour, while anyone who wishes you ill knows precisely where you are. And the ballads omit the far side: the untrained traveler steps out of the arch half-ruined — hollow-legged, dizzy, cold to the bone. The condition is called gate-wan, and it is why every arrival hall keeps a bench at the sill, why the professions that live by the gates are ascetic professions, and why the most valuable phrase a traveling master can advertise is the plain 'crosses well.'",
      "Every arch stands inside a gatehouse — part fortress, part hospital, part bank, part inn — with a departure face (the toll-office, the deposit hall where everything you own is consigned to caravans or vaults, the purge-cells) and an arrival face (the sill-bench, the robing chambers with their plain grey gate-robes, the proving-room where the naked arrival establishes who they are by cipher-phrase or the Guild's mark-books of sketched scars, and the broth-kitchen, because the first meal after the purge must be a gentle one). Coin does not gate; value does. The Guild's hearth-credit is the device: deposit gold at one gatehouse, memorize a cipher, cross naked, speak it in the credit-office at the far end, and draw your gold there, less the Guild's percentage. The Guild is thereby the world's bank, and the collateral of the entire system is its neutrality — the Ash Compact is not merely the Guild's honor; it is its solvency.",
      "Count the true toll — the arch-fee, the purge-house, the credit percentage, a full re-outfitting on the exit street, and two days more before your legs are honestly yours — call it five days and thrice the arch-fee, all told, for one person, carrying nothing. So the road wins within a realm and between neighbors; the arch wins across a continent; across the sea there is no contest at all; and in flight the arithmetic changes again, for no horse and no ship arrives somewhere else today. The village gates — Eralinde, Zmur, Aethan, Altilarontyr — live entirely by their arches, every cottage a shopfront, every harvest priced for people who arrive owning nothing. And every traveler, beggar or sovereign, is handed the same grey robe and reminded of the one thing the fifteen gates have said for a thousand years: what you are passes; what you have does not.",
    ],
  },
  {
    id: 'carried-word',
    title: 'The Order of the Carried Word',
    subtitle: 'Monastic couriers · some two hundred Bearers · no crown, no church, no Guild',
    tags: ['Monastic order', 'Couriers', "The Bearer's Peace", 'Lepasoul-wide'],
    aliases: ['Order of the Carried Word', 'the Carried Word', 'Carried Word', 'Bearers', 'Bearer', "Bearer's Peace"],
    body: [
      "You have seen them, even if you did not know it: the lean traveler in undyed wool at the edge of the arrival hall, eating nothing, saying nothing, waiting with a patience that unsettles soldiers. Then the recipient arrives, proves their name, and the traveler opens their mouth — and out comes a voice not their own: your father's exact words, in your father's cadence, spoken across four hundred leagues and six weeks after his death. That is a Bearer of the Carried Word. The gates carry flesh alone — no letter, no seal, no scrap of paper survives the crossing — so the fastest message in the world is a memorized one, and the fastest messenger is a person always ready to step through an arch. The Order is some two hundred souls bent entirely to that readiness: the world's post, its diplomatic pouch, its deathbed echo — belonging to no crown, no church, and, they are at pains to remind everyone, no Guild.",
      "The Fast of the Road keeps a Bearer perpetually within reach of the arch's approval — clean water, white broths, certain breads, certain hours; an ordinary traveler needs two days of purging, a Bearer needs hours, because a Bearer is never far from empty. And every Bearer builds a House of Memory: an interior architecture of rooms and lamplit corridors in which carried words are laid down verbatim — wording, cadence, pause, and breath — each behind its own door, sealed to the named recipient alone. Bearers have stood silent before kings and before racks, and the door has stayed shut; a Bearer under torment withdraws into the House and bars the gate. The word touches no page, ever: a written word can be stolen by anyone, and a remembered word only by killing the rememberer, which the world has agreed not to do. And no Bearer may be inked — a single tattoo is expulsion from the roads forever, which is why the inker assassins hold the Order in a particular professional loathing.",
      "A Bearer steps out of the arch naked, and the message must live until the door opens, so the Order teaches the Second Tongue: the body as the only weapon that gates. Its first principle is that the head is the cargo — veterans of the style fight like someone carrying an invisible child on their shoulders. Its second is arrival, not victory: disengage, break the hold, reach open road, for a Bearer at a run is simply gone. Its third is the strangest: the art is fought hollow, trained and used in the purged state in which a Bearer actually arrives. The teaching-halls name its techniques like punctuation — the Comma, a throw that pauses a charge; the Hyphen, a lock binding wrist to elbow; the Parenthesis, the two-handed guard that brackets the skull; and the Full Stop, which is discussed outside the Order only by people who have woken up on arrival-hall floors.",
      "The Order ranks its members by what they can carry: a Letter is the novice, building the House; a Verse is the sworn courier; a Chapter is the master, who alone may teach the Second Tongue; a Canon keeps a chapterhouse; and the Index — presently Index Sela, forty-one years in office — is the one soul who knows, at any hour, every word the Order carries. At the Verse oath a Bearer surrenders their birth name for a word drawn by lot from the founding litany: Bearer Sparrow, Bearer Anvil, Bearer Hush. By unbreakable custom, every journey carries one word free for the poor — the Pauper's Line — which is why two hundred unarmed, fasting monks walk the world's worst roads unrobbed. And sometimes the door never opens: the Widowed carry their sealed word for life, passing it at the last from deathbed to deathbed. Bearer Ash of the western roads has carried one such word for sixty-one years, and answers every question about it with the Order's whole theology in six words: 'The word is not done speaking.'",
      "The Bearer's Peace is the oldest treaty in the world that no one signed: a Bearer may not be harmed, hindered, searched, or questioned, and a Bearer carries for all sides of every quarrel without judgment. Crowns, churches, the Campfire, and most bandit companies keep the Peace, each for the same reason — everyone, someday, has a message that must arrive. To break it is to earn the Silence: the Order withdraws from the offending realm, no words carried in, none out, no exceptions, no ransom. It has been pronounced three times, and a realm without messages begins to die in weeks; each Silence ended with a sovereign's formal apology, read aloud in the offender's own square, to a Bearer who stood and listened and did not write it down. One thing more: a handful of words in the Order's founding litany are in no tongue any scholar reads, pronounced perfectly, generation after generation, meaning unknown, because it is done. A careful man once copied three of them and carried the page to the fourteen silent statues that stand at the corners of the world. Asked what he found there, he said: 'A match.'",
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
