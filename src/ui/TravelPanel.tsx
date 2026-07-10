import { useEffect, useMemo, useState } from 'react';
import { formatDate, formatTime24 } from '../sim/calendar';
import { nearbyTravelDestinations, planTravel, roadRouteFor, type TravelMode } from '../player/travel';
import { useGame } from './store';

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
    if (selected?.boatReachable && !selected.landReachable) {
      if (mode !== 'boat') setMode('boat');
      return;
    }
    if (selected?.landReachable && mode === 'boat') {
      setMode(roadAvailable ? 'road' : 'offroad');
      return;
    }
    if (!roadAvailable && mode === 'road') setMode('offroad');
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

  if (!player) return <div className="inspector-empty">Create or choose a character before traveling.</div>;

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
              onClick={() => setSelectedId(dest.id)}
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
