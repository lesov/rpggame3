/**
 * Save / load menu: four browser-storage slots. Save is only allowed with a
 * character on the map screen (transient combat/shop states never enter a save);
 * Load is available any time, including before creating a character. The player
 * cannot corrupt a slot from a different world/version — those loads are refused.
 */
import { useState } from 'react';
import { useGame } from './store';
import { formatDate } from '../sim/calendar';
import {
  serializeGame,
  deserializeGame,
  isCompatible,
  readSlot,
  writeSlot,
  deleteSlot,
  SLOT_COUNT,
  type SaveEnvelope,
} from '../persistence/saveGame';

function readAll(): (SaveEnvelope | null)[] {
  return Array.from({ length: SLOT_COUNT }, (_, i) => readSlot(i));
}

function savedAgo(ms: number): string {
  return new Date(ms).toLocaleString();
}

export function SaveLoadModal({ onClose }: { onClose: () => void }) {
  const { state, dispatch, wd } = useGame();
  const [slots, setSlots] = useState<(SaveEnvelope | null)[]>(readAll);
  const [error, setError] = useState<string | null>(null);

  const canSave = state.player != null && state.screen === 'map';
  const refresh = () => setSlots(readAll());

  const handleSave = (i: number) => {
    const res = writeSlot(i, serializeGame(state, wd));
    if (!res.ok) {
      setError(res.error ?? 'Save failed.');
      return;
    }
    setError(null);
    refresh();
  };

  const handleLoad = (i: number) => {
    const env = slots[i];
    if (!env) return;
    const loaded = deserializeGame(env, wd);
    if (!loaded) {
      setError('That save is from a different world or an older version — it cannot be loaded.');
      return;
    }
    dispatch({ type: 'loadGame', state: loaded });
    onClose();
  };

  const handleDelete = (i: number) => {
    if (!window.confirm('Delete this save? This cannot be undone.')) return;
    deleteSlot(i);
    setError(null);
    refresh();
  };

  return (
    <div className="save-overlay" data-testid="save-modal" onClick={onClose}>
      <div className="save-modal" onClick={(e) => e.stopPropagation()}>
        <div className="save-modal-head">
          <h2>Save &amp; Load</h2>
          <button className="save-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {!canSave && (
          <p className="save-hint">
            {state.player == null
              ? 'Create a character before saving. You can still load an existing save.'
              : 'Finish what you are doing and return to the map to save.'}
          </p>
        )}
        {error && <p className="save-error">{error}</p>}

        <ul className="save-slots">
          {slots.map((env, i) => {
            const compatible = env != null && isCompatible(env, wd);
            return (
              <li key={i} className={env ? 'save-slot filled' : 'save-slot'}>
                <div className="save-slot-info">
                  <span className="save-slot-title">Slot {i + 1}</span>
                  {env ? (
                    <>
                      <span className="save-slot-name">
                        {env.meta.playerName}
                        {env.meta.className ? ` — ${env.meta.className}` : ''}
                      </span>
                      <span className="save-slot-detail">
                        {formatDate(env.meta.inGameDate)} · {env.meta.locationName}
                      </span>
                      <span className="save-slot-meta">
                        Saved {savedAgo(env.meta.savedAt)}
                        {!compatible ? ' · incompatible' : ''}
                      </span>
                    </>
                  ) : (
                    <span className="save-slot-empty">Empty</span>
                  )}
                </div>
                <div className="save-slot-actions">
                  <button onClick={() => handleSave(i)} disabled={!canSave}>
                    {env ? 'Overwrite' : 'Save'}
                  </button>
                  <button onClick={() => handleLoad(i)} disabled={!env || !compatible}>
                    Load
                  </button>
                  <button className="save-delete" onClick={() => handleDelete(i)} disabled={!env}>
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
