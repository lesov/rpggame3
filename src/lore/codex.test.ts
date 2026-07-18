import { describe, expect, it } from 'vitest';
import { CODEX_ENTRIES, findCodexEntryByAlias, getCodexEntry, tokenizeCodexLinks } from './codex';

describe('codex registry', () => {
  it('looks up the Duhi Troupe by id and alias', () => {
    expect(getCodexEntry('duhi-troupe')?.title).toBe('The Duhi Troupe');
    expect(findCodexEntryByAlias('Duhi Troupe')?.id).toBe('duhi-troupe');
    expect(findCodexEntryByAlias('the duhi')?.id).toBe('duhi-troupe');
  });

  it('tokenizes biography references as codex links', () => {
    const tokens = tokenizeCodexLinks("The Duhi Troupe's secret facility trained the Duhi washout.");
    expect(tokens).toEqual([
      { kind: 'text', text: 'The ' },
      { kind: 'link', text: "Duhi Troupe's", entryId: 'duhi-troupe' },
      { kind: 'text', text: ' secret facility trained ' },
      { kind: 'link', text: 'the Duhi', entryId: 'duhi-troupe' },
      { kind: 'text', text: ' washout.' },
    ]);
  });

  it('looks up the Adventurer\'s Guild and links it from biography text', () => {
    expect(getCodexEntry('adventurers-guild')?.title).toBe("The Adventurer's Guild");
    expect(findCodexEntryByAlias("Adventurers' Guild")?.id).toBe('adventurers-guild');
    const tokens = tokenizeCodexLinks("he enlisted in the local Adventurers' Guild.");
    const link = tokens.find((t) => t.kind === 'link');
    expect(link?.entryId).toBe('adventurers-guild');
    expect(link?.text).toBe("Adventurers' Guild");
  });

  it('leaves unrelated words untouched', () => {
    expect(tokenizeCodexLinks('Duhilar is not the order.')).toEqual([
      { kind: 'text', text: 'Duhilar is not the order.' },
    ]);
  });

  it('looks up the Gates by id and aliases', () => {
    expect(getCodexEntry('the-gates')?.title).toBe('The Gates');
    expect(findCodexEntryByAlias('Gatewrights')?.id).toBe('the-gates');
    expect(findCodexEntryByAlias('the Ways')?.id).toBe('the-gates');
    expect(findCodexEntryByAlias('gate-wan')?.id).toBe('the-gates');
  });

  it('looks up the Order of the Carried Word by id and aliases', () => {
    expect(getCodexEntry('carried-word')?.title).toBe('The Order of the Carried Word');
    expect(findCodexEntryByAlias('Bearer')?.id).toBe('carried-word');
    expect(findCodexEntryByAlias("Bearer's Peace")?.id).toBe('carried-word');
  });

  it('links Bearers, the Carried Word, and the gates from prose', () => {
    const tokens = tokenizeCodexLinks('A Bearer of the Carried Word waited by the gates.');
    const links = tokens.filter((t) => t.kind === 'link');
    expect(links.map((l) => l.entryId)).toEqual(['carried-word', 'carried-word', 'the-gates']);
    expect(links.map((l) => l.text)).toEqual(['Bearer', 'the Carried Word', 'the gates']);
  });

  it('has no alias collisions across entries', () => {
    const seen = new Map<string, string>();
    for (const entry of CODEX_ENTRIES) {
      for (const alias of entry.aliases) {
        const owner = seen.get(alias.toLowerCase()) ?? entry.id;
        expect(`${alias}: ${owner}`).toBe(`${alias}: ${entry.id}`);
        seen.set(alias.toLowerCase(), entry.id);
      }
    }
  });
});
