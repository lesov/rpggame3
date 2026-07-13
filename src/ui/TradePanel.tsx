/**
 * Read-only view of the world trade economy: prices at a chosen market, the
 * week's biggest movers there, and the widest regional spreads. The player
 * cannot trade yet — caravans unlock later — so nothing here is actionable.
 */
import { Fragment, useMemo, useState } from 'react';
import { useGame } from './store';
import { GOODS, getGood, type GoodTier } from '../trade/goods';
import { marketOf, moversAt, spreadsAcross } from '../trade/economy';

const TIER_LABEL: Record<GoodTier, string> = {
  staple: 'Staples',
  commodity: 'Commodities',
  luxury: 'Luxuries',
  special: 'Special',
};

function gp(n: number): string {
  return `${n.toFixed(n < 10 ? 1 : 0)} gp`;
}

function Delta({ frac }: { frac: number }) {
  const pct = frac * 100;
  const cls = pct > 0.5 ? 'delta up' : pct < -0.5 ? 'delta down' : 'delta flat';
  const arrow = pct > 0.5 ? '▲' : pct < -0.5 ? '▼' : '—';
  return (
    <span className={cls}>
      {arrow} {Math.abs(pct).toFixed(0)}%
    </span>
  );
}

export function TradePanel() {
  const { state, wd } = useGame();
  const econ = state.economy;

  // The market in focus: an explicit pick, else the player's/selection's burg.
  const contextBurgId = useMemo(() => {
    const selCell = state.selection?.cellId;
    const selBurg = selCell != null ? wd.geometry.cells[selCell]?.burg : 0;
    if (selBurg && econ.markets.has(selBurg)) return selBurg;
    const playerCell = state.player?.location.cellId;
    const playerBurg = playerCell != null ? wd.geometry.cells[playerCell]?.burg : 0;
    if (playerBurg && econ.markets.has(playerBurg)) return playerBurg;
    return econ.markets.keys().next().value as number;
  }, [state.selection, state.player, econ, wd]);

  const [picked, setPicked] = useState<number | null>(null);
  const burgId = picked != null && econ.markets.has(picked) ? picked : contextBurgId;
  const market = marketOf(econ, burgId);

  // Selectable markets: the cities (grand markets), plus the current one.
  const options = useMemo(() => {
    const ids = new Set<number>([burgId]);
    for (const [id, m] of econ.markets) if (m.cls === 'grand') ids.add(id);
    return [...ids]
      .map((id) => ({ id, name: wd.burgById.get(id)?.name ?? `Burg ${id}` }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [econ, wd, burgId]);

  const movers = useMemo(() => moversAt(econ, burgId, 5), [econ, burgId]);
  const spreads = useMemo(() => spreadsAcross(econ, 6), [econ]);
  const burgName = wd.burgById.get(burgId)?.name ?? `Burg ${burgId}`;

  if (!market) return <div className="trade-panel">No market data.</div>;

  return (
    <div className="trade-panel">
      <div className="section">
        <h3>Trade — markets &amp; prices</h3>
        <p className="trade-locked">
          You cannot trade yet — caravans unlock later, once you can buy them. For now the world's
          markets move on their own; watch the prices shift as the weeks pass.
        </p>
        <label className="trade-market-pick">
          Market:{' '}
          <select value={burgId} onChange={(e) => setPicked(Number(e.target.value))}>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="section">
        <h3>Prices at {burgName}</h3>
        <table className="trade-table">
          <thead>
            <tr>
              <th>Good</th>
              <th>Price</th>
              <th>vs base</th>
              <th>vs last wk</th>
            </tr>
          </thead>
          <tbody>
            {(['staple', 'commodity', 'luxury', 'special'] as GoodTier[]).map((tier) => {
              const rows = GOODS.filter((g) => g.tier === tier && market.price[g.id] != null);
              if (rows.length === 0) return null;
              return (
                <Fragment key={tier}>
                  <tr className="trade-tier-row">
                    <td colSpan={4}>{TIER_LABEL[tier]}</td>
                  </tr>
                  {rows.map((g) => {
                    const price = market.price[g.id];
                    const prev = market.prev[g.id] ?? price;
                    return (
                      <tr key={g.id}>
                        <td>{g.name}</td>
                        <td className="num">{gp(price)}</td>
                        <td className="num">
                          <Delta frac={price / g.basePrice - 1} />
                        </td>
                        <td className="num">
                          <Delta frac={prev > 0 ? price / prev - 1 : 0} />
                        </td>
                      </tr>
                    );
                  })}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="section">
        <h3>This week's movers here</h3>
        {movers.length === 0 ? (
          <p className="muted">Prices are steady.</p>
        ) : (
          <ul className="trade-movers">
            {movers.map((m) => (
              <li key={m.goodId}>
                <span>{getGood(m.goodId)?.name}</span>
                <span className="num">{gp(m.price)}</span>
                <Delta frac={m.vsPrev} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="section">
        <h3>Widest regional spreads</h3>
        <p className="muted">Where the same good is cheapest vs dearest across the world.</p>
        <ul className="trade-spreads">
          {spreads.map((s) => (
            <li key={s.goodId}>
              <span className="spread-good">{getGood(s.goodId)?.name}</span>
              <span className="spread-detail">
                {gp(s.minPrice)} @ {wd.burgById.get(s.minBurg)?.name ?? '?'} →{' '}
                {gp(s.maxPrice)} @ {wd.burgById.get(s.maxBurg)?.name ?? '?'}
              </span>
              <span className="spread-ratio">×{s.ratio.toFixed(1)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
