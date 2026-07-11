import { useEffect, useState } from 'react';
import { loadWorld, type WorldData } from '../data/worldLoader';
import { GameProvider, useGame } from './store';
import { MapView } from './MapView';
import { TimeControls } from './TimeControls';
import { EventFeed } from './EventFeed';
import { Inspector } from './Inspector';
import { CharacterBuilder } from './CharacterBuilder';
import { InventoryPanel } from './InventoryPanel';
import { CombatScreen } from './CombatScreen';
import { TravelPanel } from './TravelPanel';
import { EncounterModal, ResumeBanner } from './EncounterModal';
import { CodexPanel } from './CodexPanel';
import { ShopScreen } from './ShopScreen';

function LayerToggles() {
  const { state, dispatch } = useGame();
  const o = state.options;
  return (
    <div className="layer-toggles">
      <button
        className={o.mode === 'biome' ? 'chip active' : 'chip'}
        onClick={() => dispatch({ type: 'setOptions', options: { mode: 'biome' } })}
      >
        Terrain
      </button>
      <button
        className={o.mode === 'political' ? 'chip active' : 'chip'}
        onClick={() => dispatch({ type: 'setOptions', options: { mode: 'political' } })}
      >
        Political
      </button>
      <button
        className={o.showRoutes ? 'chip active' : 'chip'}
        onClick={() => dispatch({ type: 'setOptions', options: { showRoutes: !o.showRoutes } })}
      >
        Roads
      </button>
      <button
        className={o.showMarkers ? 'chip active' : 'chip'}
        onClick={() => dispatch({ type: 'setOptions', options: { showMarkers: !o.showMarkers } })}
      >
        Markers
      </button>
      <button
        className={o.showLabels ? 'chip active' : 'chip'}
        onClick={() => dispatch({ type: 'setOptions', options: { showLabels: !o.showLabels } })}
      >
        Labels
      </button>
    </div>
  );
}

function SidePanel() {
  const { state, dispatch } = useGame();
  return (
    <aside className="side-panel">
      <div className="panel-tabs">
        <button
          className={state.panelTab === 'events' ? 'tab active' : 'tab'}
          onClick={() => dispatch({ type: 'setTab', tab: 'events' })}
        >
          World events
        </button>
        <button
          className={state.panelTab === 'inspector' ? 'tab active' : 'tab'}
          onClick={() => dispatch({ type: 'setTab', tab: 'inspector' })}
        >
          Inspector
        </button>
        <button
          className={state.panelTab === 'character' ? 'tab active' : 'tab'}
          onClick={() => dispatch({ type: 'setTab', tab: 'character' })}
        >
          Character
        </button>
        <button
          className={state.panelTab === 'inventory' ? 'tab active' : 'tab'}
          onClick={() => dispatch({ type: 'setTab', tab: 'inventory' })}
        >
          Inventory
        </button>
        <button
          className={state.panelTab === 'travel' ? 'tab active' : 'tab'}
          onClick={() => dispatch({ type: 'setTab', tab: 'travel' })}
        >
          Travel
        </button>
        <button
          className={state.panelTab === 'codex' ? 'tab active' : 'tab'}
          onClick={() => dispatch({ type: 'setTab', tab: 'codex' })}
        >
          Codex
        </button>
      </div>
      <div className="panel-body">
        {state.panelTab === 'events' && <EventFeed />}
        {state.panelTab === 'inspector' && <Inspector />}
        {state.panelTab === 'character' && <CharacterBuilder />}
        {state.panelTab === 'inventory' && <InventoryPanel />}
        {state.panelTab === 'travel' && <TravelPanel />}
        {state.panelTab === 'codex' && <CodexPanel />}
      </div>
    </aside>
  );
}

function Shell() {
  const { state } = useGame();
  if (state.screen === 'combat') return <CombatScreen />;
  if (state.screen === 'encounter') return <EncounterModal />;
  if (state.screen === 'shop') return <ShopScreen />;
  return (
    <div className="app">
      <header className="app-header">
        <h1>Lepasoul</h1>
        <TimeControls />
        <LayerToggles />
      </header>
      <main className="app-main">
        <MapView />
        <SidePanel />
      </main>
      <ResumeBanner />
    </div>
  );
}

function Game({ wd }: { wd: WorldData }) {
  return (
    <GameProvider wd={wd}>
      <Shell />
    </GameProvider>
  );
}

export function App() {
  const [wd, setWd] = useState<WorldData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWorld().then(setWd, (e) => setError(String(e)));
  }, []);

  if (error) {
    return (
      <div className="app-loading error">
        <div>
          <p>Failed to load world data.</p>
          <p className="error-detail">{error}</p>
        </div>
      </div>
    );
  }
  if (!wd) return <div className="app-loading">Loading Lepasoul… (first load fetches ~8 MB of world data)</div>;
  return <Game wd={wd} />;
}
