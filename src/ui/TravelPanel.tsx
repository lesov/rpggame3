import { useEffect, useMemo, useState } from 'react';
import { formatDate, formatTime24 } from '../sim/calendar';
import { defaultTravelModeFor, nearbyTravelDestinations, planTravel, roadRouteFor, type TravelMode } from '../player/travel';
import { legDangerBreakdown } from '../travel/encounter/run';
import { useGame } from './store';

function dangerLabel(chance: number): { text: string; cls: string } {
  if (chance < 0.15) return { text: 'Quiet', cls: 'safe' };
  if (chance < 0.4) return { text: 'Uneasy', cls: 'uneasy' };
  if (chance < 0.7) return { text: 'Dangerous', cls: 'dangerous' };
  return { text: 'Deadly', cls: 'deadly' };
}

function formatDuration(minutes: number): string {
  const hours = Math.ceil(minutes / 60);
  if (hours < 24) return `${hours} hr`;
  const days = Math.floor(hours / 24);
  const rem = hours % 24;
  return rem ? `${days} d ${rem} hr` : `${days} d`;
}

function distanceSummary(plan: ReturnType<typeof planTravel>): string {
  if (plan.mode === 'boat') return `${plan.distanceMi} mi by sea route`;
  if (plan.routeGroup === 'roads') return `${plan.distanceMi} mi by road`;
  if (plan.routeGroup === 'trails') return `${plan.distanceMi} mi by trail`;
  return `${plan.distanceMi} mi off road`;
}

export function TravelPanel() {
  const { state, dispatch, wd } = useGame();
  const player = state.player;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<TravelMode>('road');
  const [dayOnly, setDayOnly] = useState(true);

  const destinations = useMemo(
    () => (player ? nearbyTravelDestinations(wd, player) : []),
    [wd, player],
  );

  useEffect(() => {
    if (!selectedId && destinations[0]) setSelectedId(destinations[0].id);
    else if (selectedId && !destinations.some((d) => d.id === selectedId)) setSelectedId(destinations[0]?.id ?? null);
  }, [destinations, selectedId]);

  const selected = destinations.find((d) => d.id === selectedId) ?? destinations[0];
  const roadAvailable = useMemo(() => {
    if (!player || !selected) return false;
    return Boolean(roadRouteFor(wd, player.location, selected));
  }, [wd, player, selected]);

  useEffect(() => {
    if (!selected) {
      dispatch({ type: 'setTravelTarget', target: null });
      return;
    }
    dispatch({
      type: 'setTravelTarget',
      target: {
        id: selected.id,
        name: selected.name,
        kind: selected.kind,
        x: selected.x,
        y: selected.y,
        cellId: selected.cellId,
      },
    });
  }, [dispatch, selected?.id, selected?.name, selected?.kind, selected?.x, selected?.y, selected?.cellId]);

  useEffect(() => {
    if (!selected) return;
    setMode(defaultTravelModeFor(selected, roadAvailable));
  }, [selected?.id, roadAvailable]);

  useEffect(() => {
    if (!selected) return;
    const valid =
      (mode === 'road' && roadAvailable && selected.landReachable) ||
      (mode === 'offroad' && selected.landReachable) ||
      (mode === 'boat' && selected.boatReachable);
    if (!valid) setMode(defaultTravelModeFor(selected, roadAvailable));
  }, [roadAvailable, mode, selected]);

  const plan = useMemo(() => {
    if (!player || !selected) return null;
    const selectedMode = selected.boatReachable && !selected.landReachable
      ? 'boat'
      : mode === 'road' && roadAvailable
        ? 'road'
        : mode === 'boat' && selected.boatReachable
          ? 'boat'
          : 'offroad';
    return planTravel(wd, player, selected, selectedMode, dayOnly, state.time);
  }, [wd, player, selected, mode, roadAvailable, dayOnly, state.time]);

  const danger = useMemo(() => {
    if (!player || !plan) return null;
    return legDangerBreakdown({ wd, player, plan, start: { date: state.date, time: state.time }, pacing: state.pacing, seed: 0 });
  }, [wd, player, plan, state.date, state.time, state.pacing]);
  const [showCalc, setShowCalc] = useState(false);

  if (!player) return <div className="inspector-empty">Create or choose a character before traveling.</div>;

  const chooseDestination = (dest: typeof destinations[number]) => {
    setSelectedId(dest.id);
    const hasRoad = Boolean(roadRouteFor(wd, player.location, dest));
    setMode(defaultTravelModeFor(dest, hasRoad));
  };

  return (
    <div className="travel-panel">
      <div className="section">
        <h3>Travel</h3>
        <div className="kv"><span>From</span><span>{player.location.placeName}</span></div>
        <div className="kv"><span>Time</span><span>{formatDate(state.date)} · {formatTime24(state.time)}</span></div>
        <div className="kv"><span>Provisions</span><span>{plan?.provisionsAvailable ?? 0} days carried</span></div>
      </div>

      <div className="section">
        <h3>Destinations</h3>
        {destinations.length === 0 && <div className="small-note">No nearby land destinations found.</div>}
        <div className="travel-destination-list">
          {destinations.map((dest) => (
            <button
              key={dest.id}
              className={selected?.id === dest.id ? 'travel-destination active' : 'travel-destination'}
              onClick={() => chooseDestination(dest)}
            >
              <span>{dest.icon ?? '•'}</span>
              <strong>{dest.name}</strong>
              <em>{Math.round(dest.distanceMi)} mi · {dest.detail}</em>
            </button>
          ))}
        </div>
      </div>

      {selected && plan && (
        <>
          <div className="section">
            <h3>Route</h3>
            <div className="travel-options">
              <button
                className={mode === 'road' ? 'chip active' : 'chip'}
                disabled={!roadAvailable || !selected.landReachable}
                onClick={() => setMode('road')}
              >
                Roads/trails
              </button>
              <button
                className={mode === 'offroad' ? 'chip active' : 'chip'}
                disabled={!selected.landReachable}
                onClick={() => setMode('offroad')}
              >
                Off road
              </button>
              {selected.boatReachable && (
                <button
                  className={mode === 'boat' ? 'chip active' : 'chip'}
                  onClick={() => setMode('boat')}
                >
                  Boat
                </button>
              )}
              {plan.mode !== 'boat' && (
                <label className="travel-check">
                  <input type="checkbox" checked={dayOnly} onChange={(e) => setDayOnly(e.target.checked)} />
                  <span>Daylight travel only</span>
                </label>
              )}
            </div>
            {!roadAvailable && <div className="small-note">No road or trail connects close enough to this destination.</div>}
            {!selected.landReachable && selected.boatReachable && <div className="small-note">No land route is available; travel starts by boat from a nearby port.</div>}
            <div className="kv"><span>Distance</span><span>{distanceSummary(plan)}</span></div>
            <div className="kv"><span>Travel time</span><span>{formatDuration(plan.elapsedMinutes)} elapsed · {plan.travelHours.toFixed(1)} {plan.activeTravelLabel}</span></div>
            <div className="kv"><span>Pace</span><span>{plan.paceDetail}</span></div>
            {danger && (
              <>
                <div className="kv" data-testid="danger-read">
                  <span>Road danger</span>
                  <span>
                    <span className={`danger-badge ${dangerLabel(danger.chance).cls}`}>{dangerLabel(danger.chance).text}</span>
                    {' '}
                    {Math.round(danger.chance * 100)}% chance — {danger.dominant}
                    {' '}
                    <button className="calc-link" onClick={() => setShowCalc((v) => !v)}>{showCalc ? 'hide' : 'show'} math</button>
                  </span>
                </div>
                {showCalc && (
                  <div className="danger-calc" data-testid="danger-calc">
                    <div className="danger-calc-summary">
                      Route sampled in {danger.steps} legs of {danger.hoursPerStep.toFixed(1)} h ({danger.activeHours.toFixed(1)} h active).
                    </div>
                    <div className="danger-calc-rows">
                      {danger.factors.map((f) => (
                        <div className="danger-calc-row" key={f.label}>
                          <span>{f.label}</span>
                          <span>{f.isRate ? `${f.value.toFixed(3)}/hr` : `×${f.value.toFixed(2)}`}</span>
                        </div>
                      ))}
                      <div className="danger-calc-row total">
                        <span>λ (mean per hour)</span>
                        <span>{danger.meanLambda.toFixed(3)}/hr</span>
                      </div>
                      <div className="danger-calc-row total">
                        <span>Expected encounters E[N] = λ·t</span>
                        <span>{danger.expectedEncounters.toFixed(2)}</span>
                      </div>
                      <div className="danger-calc-row total">
                        <span>P(≥1) = 1 − e^(−E[N])</span>
                        <span>{Math.round(danger.chance * 100)}%</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            <div className={plan.insufficientProvisions ? 'kv warn' : 'kv'}>
              <span>Food</span>
              <span>{plan.provisionsNeeded} days required; {plan.provisionsAvailable} carried</span>
            </div>
            {plan.insufficientProvisions && (
              <div className="travel-warning">Not enough provisions for the full trip. Travel is allowed, but provisions will be exhausted.</div>
            )}
          </div>

          <button className="primary-action" onClick={() => dispatch({ type: 'travel', plan })}>
            Travel to {selected.name}
          </button>
        </>
      )}
    </div>
  );
}
