import { useGame } from './store';

export function InventoryPanel() {
  const { state } = useGame();
  const player = state.player;

  if (!player) {
    return <div className="inspector-empty">Create or choose a character to see inventory.</div>;
  }

  return (
    <div className="inventory-panel">
      <div className="section">
        <h3>{player.name}</h3>
        <div className="kv"><span>Class</span><span>Level 1 {player.className}</span></div>
        <div className="kv"><span>Location</span><span>{player.location.placeName}, {player.location.stateName}</span></div>
        <div className="kv"><span>Bonus</span><span>{player.minorBonus.name}</span></div>
      </div>
      <div className="section">
        <h3>Inventory</h3>
        {player.inventory.map((item) => (
          <div className="inventory-row" key={item.id}>
            <span>{item.name}</span>
            <span>{item.quantity}</span>
            <em>{item.equipped ? 'equipped' : item.category}</em>
          </div>
        ))}
        <div className="small-note">Starting kit includes one class-proficient weapon, 2 healing potions, 5 days of provisions, and 118 vosels.</div>
      </div>
      <div className="section">
        <h3>Story</h3>
        <p className="story-text">{player.story}</p>
        <p className="story-text">{player.powerExplanation}</p>
      </div>
    </div>
  );
}
