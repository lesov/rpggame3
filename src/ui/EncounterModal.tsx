import { useGame } from './store';
import type { ActorKind } from '../travel/encounter/types';

const KIND_TITLE: Record<ActorKind, string> = {
  beast: 'A beast on the road',
  undead: 'Something that should be dead',
  brigand: 'Brigands',
  goblinoid: 'Raiders',
  raider: 'Raiders',
  patrol: 'A patrol',
  merchant: 'A merchant caravan',
  pilgrim: 'Pilgrims',
  hunter: 'Hunters',
  refugee: 'Refugees',
  traveler: 'A traveller',
};

const KIND_HOOK: Partial<Record<ActorKind, string>> = {
  patrol: 'They want to know your business on this road, and where you are bound. Answer plainly and they will likely wave you on.',
  merchant: 'The caravan master calls a wary greeting — road news for road news, and perhaps a trade if you have coin.',
  pilgrim: 'They ask a blessing for the road and offer to share what little bread they carry.',
  hunter: 'They nod, wet to the knees, and warn you what they have seen moving further up the valley.',
  refugee: 'They flinch at the sight of an armed stranger, then ask, without much hope, whether the way behind you is clear.',
  traveler: 'They keep a careful distance, one hand never far from a knife, and give you a guarded nod.',
};

export function EncounterModal() {
  const { state, dispatch } = useGame();
  const pe = state.pendingEncounter;
  if (!pe) return null;
  const actor = pe.encounter.actor;

  return (
    <div className="encounter-screen" data-testid="encounter-modal">
      <div className="encounter-card">
        <h2>{KIND_TITLE[actor.kind]}</h2>
        <p className="encounter-desc">{actor.descriptor}.</p>
        {KIND_HOOK[actor.kind] && <p className="encounter-hook">{KIND_HOOK[actor.kind]}</p>}
        <div className="encounter-actions">
          <button className="primary-action" onClick={() => dispatch({ type: 'resumeTravel' })}>
            Continue on your way
          </button>
          <button className="secondary-action" onClick={() => dispatch({ type: 'attackEncounter' })}>
            Draw steel and attack
          </button>
          <button className="secondary-action" onClick={() => dispatch({ type: 'dismissEncounter' })}>
            Make camp here instead
          </button>
        </div>
      </div>
    </div>
  );
}

/** A small banner shown on the map after a road fight, offering to press on. */
export function ResumeBanner() {
  const { state, dispatch } = useGame();
  const pe = state.pendingEncounter;
  if (!pe || state.screen !== 'map') return null;
  return (
    <div className="resume-banner" data-testid="resume-banner">
      <span>The road to <strong>{pe.resume.destination.name}</strong> is still ahead of you.</span>
      <div className="resume-actions">
        <button className="chip active" onClick={() => dispatch({ type: 'resumeTravel' })}>Resume journey</button>
        <button className="chip" onClick={() => dispatch({ type: 'dismissEncounter' })}>Stop here</button>
      </div>
    </div>
  );
}
