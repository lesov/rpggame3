/**
 * Market derivation from settlement data (framework §4.1). Every burg is a
 * market of one of three classes, and each class stocks a tier-gated subset of
 * the 24 goods — this keeps village markets small (staples only) and the 35
 * city grand markets full.
 */
import type { Burg } from '../data/types';
import { GOODS, type Good } from './goods';

export type MarketClass = 'grand' | 'town' | 'village';

/** City → grand market; large_town/town → town market; village/hamlet → post. */
export function marketClass(burg: Burg): MarketClass {
  const tier = burg.tier;
  if (tier === 'city') return 'grand';
  if (tier === 'large_town' || tier === 'town') return 'town';
  return 'village';
}

/** Does this good's demand exist at a market of the given class/burg? (§3.5) */
function stocks(good: Good, cls: MarketClass, burg: Burg): boolean {
  switch (good.tier) {
    case 'staple':
      return true; // demanded everywhere ∝ pop
    case 'commodity':
      return cls === 'grand' || cls === 'town';
    case 'luxury':
      // luxuries need a large market, or a capital/port town of consequence
      return cls === 'grand' || (cls === 'town' && (burg.capital || burg.port || burg.plaza));
    case 'special':
      // specials are guild/temple/healer-mediated — grand markets and capitals
      return cls === 'grand' || burg.capital;
  }
}

/** The goods a given burg's market carries. */
export function goodsStockedByBurg(burg: Burg): Good[] {
  const cls = marketClass(burg);
  return GOODS.filter((g) => stocks(g, cls, burg));
}

export function goodIdsStockedByBurg(burg: Burg): string[] {
  return goodsStockedByBurg(burg).map((g) => g.id);
}
