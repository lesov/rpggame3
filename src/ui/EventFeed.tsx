import { useState } from 'react';
import { formatDateShort } from '../sim/calendar';
import type { WorldEvent, EventKind } from '../sim/events';
import { useGame } from './store';

type Filter = 'all' | 'anchor' | 'war' | 'world' | 'local';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'anchor', label: 'Era events' },
  { id: 'war', label: 'Wars' },
  { id: 'world', label: 'Chronicle' },
  { id: 'local', label: 'Local' },
];

const LOCAL_KINDS: EventKind[] = ['weather', 'festival', 'rumor', 'sighting'];

function matches(e: WorldEvent, f: Filter): boolean {
  switch (f) {
    case 'all': return true;
    case 'anchor': return e.kind === 'anchor';
    case 'war': return e.kind === 'war';
    case 'world': return e.kind === 'story' || e.kind === 'anchor';
    case 'local': return LOCAL_KINDS.includes(e.kind);
  }
}

const KIND_ICON: Record<EventKind, string> = {
  anchor: '⚑',
  story: '📜',
  war: '⚔️',
  weather: '🌩️',
  festival: '🎉',
  rumor: '🐎',
  sighting: '👁️',
};

export function EventFeed() {
  const { state, dispatch } = useGame();
  const [filter, setFilter] = useState<Filter>('all');
  const events = state.feed.filter((e) => matches(e, filter));

  const onEventClick = (e: WorldEvent) => {
    dispatch({ type: 'showEventOnMap', event: e });
  };

  return (
    <div className="event-feed">
      <div className="feed-filters">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className={filter === f.id ? 'chip active' : 'chip'}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="feed-list">
        {events.length === 0 && <div className="feed-empty">No events yet — advance time.</div>}
        {events.map((e) => {
          const hasMapTarget = Boolean(e.location || e.states?.length);
          return (
            <div
              key={e.id}
              className={`feed-item kind-${e.kind}${e.anchor ? ' anchor' : ''}${hasMapTarget ? ' clickable' : ''}`}
              onClick={hasMapTarget ? () => onEventClick(e) : undefined}
              title={hasMapTarget ? 'Show on map' : undefined}
            >
              <div className="feed-item-head">
                <span className="feed-icon">{KIND_ICON[e.kind]}</span>
                <span className="feed-title">{e.title}</span>
                <span className="feed-date">{formatDateShort(e.date)}</span>
              </div>
              {e.description && <div className="feed-desc">{e.description}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
