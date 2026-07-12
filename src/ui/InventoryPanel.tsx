import { useGame, settlementVendorsAt } from './store';
import { weightOf } from '../economy/catalog';
import { carriedWeight, carryCapacity } from '../economy/encumbrance';

export function InventoryPanel() {
  const { state, dispatch, wd } = useGame();
  const player = state.player;

  if (!player) {
    return <div className="inspector-empty">Create or choose a character to see inventory.</div>;
  }

  const vendors = settlementVendorsAt(wd, player);
  const equippedWeapon = player.inventory.find((i) => i.category === 'weapon' && i.equipped);
  const carried = carriedWeight(player);
  const capacity = carryCapacity(player);
  const loadPct = Math.min(100, Math.round((carried / capacity) * 100));

  return (
    <div className="inventory-panel">
      <div className="section">
        <h3>{player.name}</h3>
        <div className="kv"><span>Class</span><span>Level 1 {player.className}</span></div>
        <div className="kv"><span>Location</span><span>{player.location.placeName}, {player.location.stateName}</span></div>
        <div className="kv"><span>Armor Class</span><span>{player.armorClass}</span></div>
        <div className="kv"><span>Weapon</span><span>{equippedWeapon?.name ?? 'unarmed'}</span></div>
        <div className="kv"><span>Load</span><span>{carried} / {capacity} lb</span></div>
        <div className="load-bar" title={`${loadPct}% of carry capacity`}>
          <div className={`load-fill${loadPct >= 90 ? ' heavy' : loadPct >= 60 ? ' mid' : ''}`} style={{ width: `${loadPct}%` }} />
        </div>
        <div className="kv"><span>Bonus</span><span>{player.minorBonus.name}</span></div>
        {vendors.length > 0 && (
          <button className="primary-action market-button" onClick={() => dispatch({ type: 'openShop', vendors })}>
            🛒 Visit market ({vendors.map((v) => v.title).join(', ')})
          </button>
        )}
      </div>
      <div className="section">
        <h3>Inventory</h3>
        {player.inventory.map((item) => {
          const equippable = item.category === 'weapon' || item.category === 'armor';
          const unit = weightOf(item.id);
          const label = item.equipped ? 'equipped' : unit > 0 ? `${item.category} · ${unit}lb` : item.category;
          return (
            <div className="inventory-row" key={item.id} title={unit > 0 ? `${unit} lb each` : 'weightless'}>
              <span>{item.name}</span>
              <span>{item.quantity}</span>
              <em>{label}</em>
              {equippable && (
                <button
                  className="chip equip-chip"
                  onClick={() => dispatch(item.equipped ? { type: 'unequipItem', itemId: item.id } : { type: 'equipItem', itemId: item.id })}
                >
                  {item.equipped ? 'Unequip' : 'Equip'}
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="section">
        <h3>Story</h3>
        <p className="story-text">{player.story}</p>
        <p className="story-text">{player.powerExplanation}</p>
      </div>
    </div>
  );
}
