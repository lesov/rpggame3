import { useState } from 'react';
import { getStoredApiKey, setStoredApiKey } from '../combat/narrator/claude';

/**
 * Settings control for the Anthropic API key that powers the LLM narrator.
 * The key lives only in localStorage (never sent anywhere but Anthropic).
 * With no key, combat still runs with the plain factual narrator.
 */
export function ApiKeyBar() {
  const [stored, setStored] = useState<string | null>(() => getStoredApiKey());
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(false);

  const save = () => {
    setStoredApiKey(draft);
    setStored(draft.trim() || null);
    setDraft('');
    setEditing(false);
  };

  const clear = () => {
    setStoredApiKey(null);
    setStored(null);
    setDraft('');
    setEditing(false);
  };

  if (stored && !editing) {
    return (
      <div className="apikey-bar set">
        <span className="apikey-status">✓ Narrator key set — prose by Claude Haiku 4.5</span>
        <button className="chip" onClick={() => setEditing(true)}>Change</button>
        <button className="chip" onClick={clear}>Clear</button>
      </div>
    );
  }

  return (
    <div className="apikey-bar">
      <input
        type="password"
        placeholder="Anthropic API key (sk-ant-…) — optional, enables vivid narration"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && save()}
      />
      <button className="chip" disabled={!draft.trim()} onClick={save}>Save</button>
      {stored && <button className="chip" onClick={() => setEditing(false)}>Cancel</button>}
      <span className="apikey-hint">Stored locally only. Without it, combat uses a plain factual narrator.</span>
    </div>
  );
}
