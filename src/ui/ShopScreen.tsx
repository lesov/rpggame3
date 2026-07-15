import { useGame } from './store';
import { getCatalogItem, type ItemQuality } from '../economy/catalog';
import { formatItemDisplay } from '../economy/itemDisplay';
import { voselsOf } from '../economy/money';
import { sellPrice, isSellable } from '../economy/transaction';
import { carriedWeight, carryCapacity, wouldExceedCapacity } from '../economy/encumbrance';
import type { InventoryItem, PlayerCharacter } from '../player/types';

const QUALITY_LABEL: Record<ItemQuality, string> = {
  common: 'Common',
  fine: 'Fine',
  masterwork: 'Masterwork',
};

function QualityBadge({ quality }: { quality: ItemQuality }) {
  return <span className={`quality-badge quality-${quality}`}>{QUALITY_LABEL[quality]}</span>;
}

function ShopItemDetails({ item, player }: { item: InventoryItem; player: PlayerCharacter }) {
  const display = formatItemDisplay(item, player);
  const detailLines = display.detailLines.filter((line) => line && line !== display.statSummary);

  return (
    <>
      <span className="shop-item-stat">{display.statSummary}</span>
      <div className="shop-item-meta">
        <span>{display.typeLabel}</span>
        <span>{display.weightLabel}</span>
        <span>Base {display.valueLabel}</span>
      </div>
      {(display.compareLabel || detailLines.length > 0) && (
        <div className="shop-item-detail">
          {display.compareLabel && <span className="compare-line">{display.compareLabel}</span>}
          {detailLines.map((line) => <span key={line}>{line}</span>)}
        </div>
      )}
    </>
  );
}

export function ShopScreen() {
  const { state, dispatch } = useGame();
  const session = state.shop;
  const player = state.player;
  if (!session || !player) return null;

  const vendor = session.vendors[session.index];
  const vosels = voselsOf(player);
  const carried = carriedWeight(player);
  const capacity = carryCapacity(player);

  const sellable = player.inventory.filter((i) => isSellable(player, i.id));

  return (
    <div className="shop-screen" data-testid="shop-screen">
      <div className="shop-frame">
        <header className="shop-header">
          <div className="shop-title">
            <h2>{vendor.title}</h2>
            <span className="shop-tier">
              best goods here: <QualityBadge quality={vendor.qualityCeiling} />
            </span>
          </div>
          <div className="shop-purse" data-testid="shop-purse">
            <strong>{vosels}</strong> vosels
            <span className="shop-load"> · {carried}/{capacity} lb</span>
          </div>
          <button className="secondary-action" onClick={() => dispatch({ type: 'closeShop' })}>
            Leave
          </button>
        </header>

        {session.vendors.length > 1 && (
          <div className="shop-vendor-tabs">
            {session.vendors.map((v, i) => (
              <button
                key={v.id}
                className={i === session.index ? 'chip active' : 'chip'}
                onClick={() => dispatch({ type: 'switchVendor', index: i })}
              >
                {v.title}
              </button>
            ))}
          </div>
        )}

        <div className="shop-columns">
          <section className="shop-col">
            <h3>Buy</h3>
            <div className="shop-list">
              {vendor.stock.filter((e) => e.qty > 0).length === 0 && <p className="small-note">Sold out.</p>}
              {vendor.stock.map((entry, index) => {
                if (entry.qty <= 0) return null;
                const cat = getCatalogItem(entry.itemId);
                const afford = vosels >= entry.price;
                const tooHeavy = wouldExceedCapacity(player, entry.itemId, 1);
                const reason = !afford ? 'Not enough vosels' : tooHeavy ? 'Too heavy to carry' : undefined;
                const item: InventoryItem = {
                  id: entry.itemId,
                  name: cat?.name ?? entry.itemId,
                  quantity: entry.qty,
                  category: cat?.category ?? 'gear',
                };
                return (
                  <div className="shop-row" key={`${entry.itemId}-${index}`}>
                    <div className="shop-item">
                      <div className="shop-item-heading">
                        <span className="shop-item-name">{item.name}</span>
                        {cat && <QualityBadge quality={cat.quality} />}
                      </div>
                      <ShopItemDetails item={item} player={player} />
                    </div>
                    <span className="shop-qty">×{entry.qty}</span>
                    <span className="shop-price">{entry.price}</span>
                    <button
                      className="primary-action buy"
                      disabled={!afford || tooHeavy}
                      title={reason}
                      onClick={() => dispatch({ type: 'buyItem', entryIndex: index, qty: 1 })}
                    >
                      Buy
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="shop-col">
            <h3>Sell — your pack</h3>
            <div className="shop-list">
              {sellable.length === 0 && <p className="small-note">Nothing here the vendor will buy.</p>}
              {sellable.map((item) => {
                const cat = getCatalogItem(item.id);
                return (
                  <div className="shop-row" key={item.id}>
                    <div className="shop-item">
                      <div className="shop-item-heading">
                        <span className="shop-item-name">{item.name}</span>
                        {cat && <QualityBadge quality={cat.quality} />}
                      </div>
                      <ShopItemDetails item={item} player={player} />
                    </div>
                    <span className="shop-qty">×{item.quantity}</span>
                    <span className="shop-price">{sellPrice(vendor, item.id)}</span>
                    <button className="secondary-action sell" onClick={() => dispatch({ type: 'sellItem', itemId: item.id, qty: 1 })}>
                      Sell
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <p className="shop-foot small-note">
          The vendor pays {Math.round(vendor.sellRate * 100)}% of an item's worth. Equipped gear must be unequipped in your pack before it
          can be sold.
        </p>
      </div>
    </div>
  );
}
