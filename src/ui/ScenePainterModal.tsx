import { useMemo, useState } from 'react';
import { ClaudeScenePainter } from '../scenePainter/claude';
import { buildScenePainterDraft } from '../scenePainter/prompt';
import { getStoredApiKey } from '../combat/narrator/claude';
import { useGame } from './store';

export function ScenePainterModal({ onClose }: { onClose: () => void }) {
  const { state, wd } = useGame();
  const draft = useMemo(() => buildScenePainterDraft(wd, state), [wd, state]);
  const [text, setText] = useState(() => draft?.prompt ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const hasKey = getStoredApiKey() != null;

  const handleGenerate = async () => {
    if (!draft || loading) return;
    const painter = ClaudeScenePainter.fromEnv();
    if (!painter) {
      setText(draft.prompt);
      setError('No stored narrator key was found. Showing the locally assembled painter prompt.');
      return;
    }
    setLoading(true);
    setError(null);
    setCopied(false);
    try {
      setText(await painter.paint(draft));
    } catch (e) {
      setText(draft.prompt);
      setError(`Claude scene painter failed; showing the local prompt instead. ${e instanceof Error ? e.message : ''}`.trim());
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
      setError('Copy failed; select the text manually from the prompt box.');
    }
  };

  return (
    <div className="save-overlay" data-testid="scene-painter-modal" onClick={onClose}>
      <div className="save-modal scene-painter-modal" onClick={(e) => e.stopPropagation()}>
        <div className="save-modal-head">
          <h2>Scene Painter</h2>
          <button className="save-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {!draft ? (
          <p className="save-hint">Create a character before painting a party scene.</p>
        ) : (
          <>
            <p className="save-hint">
              {hasKey
                ? 'Uses the stored narrator key to polish the current scene into an image prompt.'
                : 'No stored narrator key found. The local prompt below is ready to use.'}
            </p>
            {error && <p className="save-error">{error}</p>}

            <section className="scene-painter-context" aria-label="Current scene context">
              <h3>{draft.title}</h3>
              <ul>
                {draft.contextLines.slice(0, 5).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <div className="scene-painter-people">
                {draft.people.map((person) => (
                  <div key={person.name} className="scene-painter-person">
                    <strong>{person.name}</strong>
                    <span>{person.role}</span>
                  </div>
                ))}
              </div>
            </section>

            <div className="scene-painter-actions">
              <button onClick={handleGenerate} disabled={loading}>
                {loading ? 'Painting…' : hasKey ? 'Paint with Claude' : 'Use local prompt'}
              </button>
              <button onClick={handleCopy} disabled={!text || loading}>
                {copied ? 'Copied' : 'Copy prompt'}
              </button>
            </div>

            <textarea
              className="scene-painter-output"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setCopied(false);
              }}
              aria-label="Scene painter prompt"
            />
          </>
        )}
      </div>
    </div>
  );
}
