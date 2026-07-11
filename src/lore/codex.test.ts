import { describe, expect, it } from 'vitest';
import { findCodexEntryByAlias, getCodexEntry, tokenizeCodexLinks } from './codex';

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

  it('leaves unrelated words untouched', () => {
    expect(tokenizeCodexLinks('Duhilar is not the order.')).toEqual([
      { kind: 'text', text: 'Duhilar is not the order.' },
    ]);
  });
});
