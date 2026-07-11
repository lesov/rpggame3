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
