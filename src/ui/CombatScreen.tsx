import { useEffect, useRef, useState } from 'react';
import { useGame } from './store';
import {
  availableActions,
  chooseAction,
  exhaustionOf,
  rollPending,
} from '../combat/engine';
import type { Combatant, CombatState, PlayerActionId } from '../combat/types';
import { MONSTERS } from '../combat/monsters';
import { ClaudeNarrator } from '../combat/narrator/claude';
import { PlainNarrator } from '../combat/narrator/plain';
import { narratableEvents, type NarrativeProvider } from '../combat/narrator/types';
import { calcLinesForEvents, type CalcLine } from './combatLog';
import { ApiKeyBar } from './ApiKeyBar';

interface Beat {
  id: number;
  kind: 'intro' | 'beat' | 'outro';
  prose: string;
  streaming: boolean;
  calc: CalcLine[];
}

export function CombatScreen() {
  const { state } = useGame();
  if (!state.combat) return null;
  // Remount cleanly for each fresh battle so all narration state resets.
  return <Battle key={state.combat.seed} combat={state.combat} />;
}

function Battle({ combat }: { combat: CombatState }) {
  const { dispatch } = useGame();
  const [beats, setBeats] = useState<Beat[]>([]);
  const [showCalc, setShowCalc] = useState(true);

  const narratorRef = useRef<NarrativeProvider | null>(null);
  if (!narratorRef.current) narratorRef.current = ClaudeNarrator.fromEnv() ?? new PlainNarrator();
  const narrator = narratorRef.current;

  const processedRef = useRef(0);
  const introRef = useRef(false);
  const outroRef = useRef(false);
  const beatIdRef = useRef(0);
  const logEndRef = useRef<HTMLDivElement>(null);

  const stream = (iter: AsyncIterable<string>, id: number) => {
    void (async () => {
      try {
        for await (const chunk of iter) {
          setBeats((bs) => bs.map((b) => (b.id === id ? { ...b, prose: b.prose + chunk } : b)));
        }
      } finally {
        setBeats((bs) => bs.map((b) => (b.id === id ? { ...b, streaming: false } : b)));
      }
    })();
  };

  // Opening scene.
  useEffect(() => {
    if (introRef.current) return;
    introRef.current = true;
    const id = ++beatIdRef.current;
    setBeats((bs) => [...bs, { id, kind: 'intro', prose: '', streaming: true, calc: [] }]);
    stream(narrator.intro(combat), id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Each new batch of resolved events → one narrated beat with its calc lines.
  useEffect(() => {
    const evs = combat.events;
    if (evs.length <= processedRef.current) return;
    const fresh = evs.slice(processedRef.current);
    processedRef.current = evs.length;
    const calc = calcLinesForEvents(fresh);
    const narratable = narratableEvents(fresh);
    if (calc.length === 0 && narratable.length === 0) return;
    const id = ++beatIdRef.current;
    setBeats((bs) => [...bs, { id, kind: 'beat', prose: '', streaming: narratable.length > 0, calc }]);
    if (narratable.length > 0) stream(narrator.narrate(fresh, combat), id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combat.events.length]);

  // Closing scene.
  useEffect(() => {
    if (!combat.outcome || outroRef.current) return;
    outroRef.current = true;
    const id = ++beatIdRef.current;
    setBeats((bs) => [...bs, { id, kind: 'outro', prose: '', streaming: true, calc: [] }]);
    stream(narrator.outro(combat), id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combat.outcome]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [beats]);

  const act = (id: PlayerActionId) => dispatch({ type: 'setCombat', combat: chooseAction(combat, id) });
  const roll = () => dispatch({ type: 'setCombat', combat: rollPending(combat) });

  const scene = combat.scene;
  const actions = availableActions(combat);
  const pending = combat.pendingRoll;

  return (
    <div className="combat-screen" data-testid="combat-screen">
      <header className="combat-header">
        <div className="combat-scene-line">
          <strong>{scene.placeName}</strong>
          <span>{scene.biome}</span>
          <span>{scene.timeOfDay}</span>
          <span>{scene.season}</span>
          <span>
            {scene.weather.condition}, {scene.weather.tempF}°F, wind {scene.weather.windCompass}{' '}
            {scene.weather.windMph} mph
          </span>
        </div>
        <div className="combat-round">
          {combat.phase === 'initiative' ? 'Rolling for initiative' : combat.outcome ? outcomeLabel(combat) : `Round ${combat.round}`}
        </div>
      </header>

      <div className="combat-body">
        <CombatantCard c={combat.player} round={combat.round} side="player" />

        <section className="combat-log" data-testid="combat-log">
          {beats.map((b) => (
            <div className={`beat ${b.kind}`} key={b.id}>
              {(b.prose || b.streaming) && (
                <p className={`prose${b.streaming && !b.prose ? ' shimmer' : ''}`}>
                  {b.prose || (b.kind === 'intro' ? 'Setting the scene…' : '…')}
                </p>
              )}
              {showCalc && b.calc.length > 0 && (
                <div className="calc-block">
                  {b.calc.map((line, i) => (
                    <div className="calc-line" key={i}>
                      <span className="calc-label">{line.label}</span>
                      <span className="calc-detail">{line.detail}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div ref={logEndRef} />
        </section>

        <CombatantCard c={combat.enemy} round={combat.round} side="enemy" />
      </div>

      <footer className="combat-footer">
        <div className="combat-controls-left">
          <label className="calc-toggle">
            <input type="checkbox" checked={showCalc} onChange={(e) => setShowCalc(e.target.checked)} />
            Show all calculations
          </label>
          <ApiKeyBar />
        </div>

        {!combat.outcome && pending && (
          <button className="dice-button" data-testid="dice-button" onClick={roll}>
            🎲 {pending.label}
            <span className="dice-formula">{pending.formula}</span>
          </button>
        )}

        {!combat.outcome && !pending && combat.phase === 'player-turn' && (
          <div className="action-bar" data-testid="action-bar">
            {actions.map((a) => (
              <button
                key={a.id}
                className={`action-btn${a.isBonus ? ' bonus' : ''}`}
                disabled={!a.enabled}
                title={a.enabled ? a.detail : a.disabledReason}
                onClick={() => act(a.id)}
              >
                <span className="action-label">{a.label}</span>
                {a.detail && <span className="action-detail">{a.detail}</span>}
              </button>
            ))}
          </div>
        )}
      </footer>

      {combat.outcome && <EndOverlay combat={combat} />}
    </div>
  );
}

function CombatantCard({ c, round, side }: { c: Combatant; round: number; side: 'player' | 'enemy' }) {
  const frac = Math.max(0, c.hp / c.maxHp);
  const tier = exhaustionOf(c, round);
  const open = c.injuries.filter((i) => !i.healed);
  return (
    <aside className={`combatant-card ${side}`} data-testid={`card-${side}`}>
      <div className="combatant-name">{c.isPlayer ? c.name : c.descriptor}</div>
      <div className="hp-bar">
        <div className={`hp-fill ${frac <= 0.25 ? 'low' : frac <= 0.5 ? 'mid' : ''}`} style={{ width: `${frac * 100}%` }} />
        <span className="hp-text">
          {c.hp}/{c.maxHp} HP
        </span>
      </div>
      <div className="combatant-stats">
        <span>AC {c.ac}</span>
        <span className={`tier ${tier}`}>{tier}</span>
        {c.conditions.raging && <span className="cond">raging</span>}
        {c.conditions.dodging && <span className="cond">dodging</span>}
      </div>
      {open.length > 0 && (
        <ul className="injury-list">
          {open.map((i, n) => (
            <li key={n}>
              {i.severity} — {i.location}
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

function EndOverlay({ combat }: { combat: CombatState }) {
  const { dispatch } = useGame();
  const [picking, setPicking] = useState(false);
  const groups: Record<string, typeof MONSTERS> = { easy: [], fair: [], hard: [] };
  for (const m of MONSTERS) groups[m.difficulty].push(m);

  return (
    <div className="combat-overlay" data-testid="combat-overlay">
      <div className="overlay-card">
        <h2>{outcomeLabel(combat)}</h2>
        {!picking ? (
          <div className="overlay-actions">
            <button
              className="primary-action"
              onClick={() => dispatch({ type: 'startCombat', monsterId: combat.monsterId })}
            >
              Replay this battle
            </button>
            <button className="secondary-action" onClick={() => setPicking(true)}>
              Fight a different opponent
            </button>
            <button className="secondary-action" onClick={() => dispatch({ type: 'endCombat' })}>
              Return to the map
            </button>
          </div>
        ) : (
          <div className="opponent-picker">
            {(['easy', 'fair', 'hard'] as const).map((diff) => (
              <div className="opponent-group" key={diff}>
                <h4>{diff}</h4>
                <div className="opponent-list">
                  {groups[diff].map((m) => (
                    <button key={m.id} className="opponent-card" onClick={() => dispatch({ type: 'startCombat', monsterId: m.id })}>
                      <strong>{m.name}</strong>
                      <span>AC {m.ac} · {m.hp} HP</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <button className="secondary-action" onClick={() => setPicking(false)}>
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function outcomeLabel(combat: CombatState): string {
  switch (combat.outcome) {
    case 'victory':
      return 'Victory';
    case 'defeat':
      return 'You have fallen';
    case 'escaped':
      return 'You escaped';
    case 'enemy-fled':
      return `${cap(combat.enemy.shortName)} fled`;
    default:
      return '';
  }
}

function cap(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
