import { useEffect } from 'react';
import { formatDate, season } from '../sim/calendar';
import { useGame, SPEED_DAYS, type Speed } from './store';

export function TimeControls() {
  const { state, dispatch, wd } = useGame();

  // Auto-advance while playing: one tick per second at the selected speed.
  useEffect(() => {
    if (!state.playing) return;
    const id = setInterval(() => dispatch({ type: 'advance', days: SPEED_DAYS[state.speed] }), 1000);
    return () => clearInterval(id);
  }, [state.playing, state.speed, dispatch]);

  const lat = state.selection ? wd.latOf(state.selection.y) : 45;
  const seasonName = season(state.date, lat);

  return (
    <div className="time-controls">
      <div className="time-display">
        <span className="time-date">{formatDate(state.date)}</span>
        <span className="time-season">{seasonName}{state.selection && lat < 0 ? ' (southern)' : ''}</span>
      </div>
      <div className="time-buttons">
        <button onClick={() => dispatch({ type: 'advance', days: 1 })}>+1d</button>
        <button onClick={() => dispatch({ type: 'advance', days: 7 })}>+1w</button>
        <button onClick={() => dispatch({ type: 'advance', days: 30 })}>+1mo</button>
        <button onClick={() => dispatch({ type: 'advance', days: 365 })}>+1y</button>
        <button
          className={state.playing ? 'active' : ''}
          onClick={() => dispatch({ type: 'setPlaying', playing: !state.playing })}
        >
          {state.playing ? '⏸ Pause' : '▶ Play'}
        </button>
        <select
          value={state.speed}
          onChange={(e) => dispatch({ type: 'setSpeed', speed: e.target.value as Speed })}
          title="Time advanced per second while playing"
        >
          <option value="day">1 day/s</option>
          <option value="week">1 week/s</option>
          <option value="month">1 month/s</option>
        </select>
      </div>
    </div>
  );
}
