import { CODEX_ENTRIES, getCodexEntry } from '../lore/codex';
import { useGame } from './store';

export function CodexPanel() {
  const { state, dispatch } = useGame();
  const selected = getCodexEntry(state.selectedCodexId) ?? CODEX_ENTRIES[0];

  return (
    <div className="codex-panel">
      <div className="section">
        <h3>Codex</h3>
        <div className="codex-list">
          {CODEX_ENTRIES.map((entry) => (
            <button
              key={entry.id}
              className={selected.id === entry.id ? 'codex-list-item active' : 'codex-list-item'}
              onClick={() => dispatch({ type: 'openCodex', entryId: entry.id })}
            >
              <strong>{entry.title}</strong>
              <span>{entry.subtitle}</span>
            </button>
          ))}
        </div>
      </div>

      <article className="section codex-entry">
        <h3>{selected.title}</h3>
        <div className="codex-subtitle">{selected.subtitle}</div>
        <div className="codex-tags">
          {selected.tags.map((tag) => <span key={tag}>{tag}</span>)}
        </div>
        {selected.body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </article>
    </div>
  );
}
