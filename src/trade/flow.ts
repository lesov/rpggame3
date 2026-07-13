/**
 * NPC merchant diffusion (framework §4.3, §7.2). Each week goods drift along the
 * route graph from cheaper markets (surplus) toward dearer ones (deficit),
 * shrinking price gaps without ever fully closing them — friction (higher on
 * trails) leaves a standing margin that arbitrage-by-caravan will later exploit.
 */
import type { TradeGraph, EdgeType } from './graph';
import type { Good } from './goods';
import type { MarketState } from './economy';

const FLOW_K = 0.15; // fraction of the source's stock moved per unit of price gap
const MAX_MOVE_FRAC = 0.5; // never ship more than half a market's stock in a week
const FRICTION: Record<EdgeType, number> = { road: 0.02, trail: 0.06, sea: 0.02 };

/**
 * One diffusion pass over every edge, mutating market stocks in place. Prices
 * are read from the pre-diffusion snapshot; the caller recomputes them after.
 */
export function diffuse(markets: Map<number, MarketState>, graph: TradeGraph, goods: readonly Good[]): void {
  for (const good of goods) {
    for (const edge of graph.edges) {
      const A = markets.get(edge.a);
      const B = markets.get(edge.b);
      if (!A || !B) continue;
      const pa = A.price[good.id];
      const pb = B.price[good.id];
      if (pa == null || pb == null || pa === pb) continue; // both must trade it

      const src = pa < pb ? A : B; // cheaper side is the surplus/source
      const dst = pa < pb ? B : A;
      const gap = Math.abs(pa - pb) / good.basePrice;
      const frac = FLOW_K * gap * edge.capacity - FRICTION[edge.type];
      if (frac <= 0) continue;

      const move = Math.min(frac, MAX_MOVE_FRAC) * (src.stock[good.id] ?? 0);
      if (move <= 0) continue;
      src.stock[good.id] = (src.stock[good.id] ?? 0) - move;
      dst.stock[good.id] = (dst.stock[good.id] ?? 0) + move;
    }
  }
}
