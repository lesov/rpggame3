import { useGame } from './store';
import { planTravel } from '../player/travel';
import type { ActorKind } from '../travel/encounter/types';
import { describeRoll } from '../combat/dice';
import { voselsOf } from '../economy/money';
import { banditTollDc, isBanditTollActor } from './store';

function formatRemaining(minutes: number): string {
  const hours = Math.ceil(minutes / 60);
  if (hours < 24) return `${hours} hr`;
  const days = Math.floor(hours / 24);
  const rem = hours % 24;
  return rem ? `${days} d ${rem} hr` : `${days} d`;
}

const KIND_TITLE: Record<ActorKind, string> = {
  beast: 'A beast on the road',
  undead: 'Something that should be dead',
  brigand: 'Brigands',
  goblinoid: 'Raiders',
  raider: 'Raiders',
  fiend: 'A fiendish presence',
  elemental: 'An elemental hazard',
  fey: 'A fey encounter',
  patrol: 'A patrol',
  merchant: 'A merchant caravan',
  pilgrim: 'Pilgrims',
  hunter: 'Hunters',
  refugee: 'Refugees',
  traveler: 'A traveller',
};

const KIND_HOOK: Partial<Record<ActorKind, string>> = {
  brigand: 'They block the road and name their price: every vosel you carry, or steel.',
  patrol: 'They want to know your business on this road, and where you are bound. Answer plainly and they will likely wave you on.',
  merchant: 'The caravan master calls a wary greeting — road news for road news, and perhaps a trade if you have coin.',
  pilgrim: 'They ask a blessing for the road and offer to share what little bread they carry.',
  hunter: 'They nod, wet to the knees, and warn you what they have seen moving further up the valley.',
  refugee: 'They flinch at the sight of an armed stranger, then ask, without much hope, whether the way behind you is clear.',
  traveler: 'They keep a careful distance, one hand never far from a knife, and give you a guarded nod.',
};

export function EncounterModal() {
  const { state, dispatch, wd } = useGame();
  const pe = state.pendingEncounter;
  if (!pe) return null;
  const actor = pe.encounter.actor;
  const isBanditToll = isBanditTollActor(actor);
  const toll = state.encounterToll;
  const tollPending = toll?.pending;
  const tollFailed = toll && !toll.pending && !toll.success && toll.roll;
  const purse = state.player ? voselsOf(state.player) : 0;
  const half = Math.ceil(purse / 2);
  const dc = banditTollDc(state);
  const pendingRollLabel =
    toll?.method === 'persuasion'
      ? 'Persuasion (Charisma)'
      : toll?.method === 'sleightOfHand'
        ? 'Sleight of Hand (Dexterity)'
        : '';
  const remaining = state.player
    ? planTravel(wd, state.player, pe.resume.destination, pe.resume.mode, pe.resume.dayOnly, state.time)
    : null;

  return (
    <div className="encounter-screen" data-testid="encounter-modal">
      <div className="encounter-card">
        <h2>{KIND_TITLE[actor.kind]}</h2>
        <p className="encounter-desc">{actor.descriptor}.</p>
        {KIND_HOOK[actor.kind] && <p className="encounter-hook">{KIND_HOOK[actor.kind]}</p>}
        {isBanditToll && (
          <div className="bandit-toll" data-testid="bandit-toll">
            {toll?.success ? (
              <>
                <h3>Road price paid</h3>
                <p>
                  You hand over {toll.paidVosels} of {toll.demandedVosels} vosels. The brigands count the coin and let the road open.
                </p>
                {toll.roll && <p className="roll-line">{describeRoll(toll.roll)}</p>}
              </>
            ) : tollFailed ? (
              <>
                <h3>The trick fails</h3>
                <p>The brigands see through it. Hands tighten on weapons.</p>
                <p className="roll-line">{describeRoll(toll.roll!)}</p>
              </>
            ) : tollPending ? (
              <>
                <h3>{pendingRollLabel}</h3>
                <p>Roll against DC {dc}. Success means you keep half the purse hidden and pay {Math.ceil(toll.demandedVosels / 2)} vosels.</p>
              </>
            ) : purse > 0 ? (
              <>
                <h3>They want your purse</h3>
                <p>
                  Pay {purse} vosels to avoid bloodshed, or risk a DC {dc} check to keep half ({half} vosels) hidden.
                </p>
              </>
            ) : (
              <>
                <h3>No coin to surrender</h3>
                <p>The brigands search your empty purse and reach for their weapons.</p>
              </>
            )}
          </div>
        )}
        {remaining && (
          <p className="encounter-journey" data-testid="encounter-journey">
            <strong>{formatRemaining(remaining.elapsedMinutes)}</strong> and {Math.round(remaining.distanceMi)} mi still to reach{' '}
            <strong>{pe.resume.destination.name}</strong>.
          </p>
        )}
        <div className="encounter-actions">
          {isBanditToll && toll?.success ? (
            <>
              <button className="primary-action" onClick={() => dispatch({ type: 'resumeTravel' })}>
                Continue your journey
              </button>
              <button className="secondary-action" onClick={() => dispatch({ type: 'dismissEncounter' })}>
                Stop here
              </button>
            </>
          ) : isBanditToll && tollFailed ? (
            <>
              <button className="primary-action" onClick={() => dispatch({ type: 'attackEncounter' })}>
                Draw steel
              </button>
            </>
          ) : isBanditToll && tollPending ? (
            <>
              <button className="primary-action" onClick={() => dispatch({ type: 'rollBanditTollSkill' })}>
                Roll {pendingRollLabel}
              </button>
              <button className="secondary-action" onClick={() => dispatch({ type: 'cancelBanditTollSkill' })}>
                Choose another response
              </button>
            </>
          ) : isBanditToll ? (
            <>
              <button className="primary-action" onClick={() => dispatch({ type: 'payBanditToll' })} disabled={purse <= 0}>
                Pay all {purse} vosels
              </button>
              <button className="secondary-action" onClick={() => dispatch({ type: 'attemptBanditTollSkill', method: 'persuasion' })} disabled={purse <= 0}>
                Persuade them down to {half} (Charisma)
              </button>
              <button className="secondary-action" onClick={() => dispatch({ type: 'attemptBanditTollSkill', method: 'sleightOfHand' })} disabled={purse <= 0}>
                Hide half with Sleight of Hand (Dexterity)
              </button>
              <button className="secondary-action" onClick={() => dispatch({ type: 'attackEncounter' })}>
                Draw steel and attack
              </button>
            </>
          ) : (
            <>
              {(actor.kind === 'merchant' || actor.kind === 'traveler') && (
                <button className="primary-action" onClick={() => dispatch({ type: 'openTravelShop' })}>
                  Trade with them
                </button>
              )}
              <button className="primary-action" onClick={() => dispatch({ type: 'resumeTravel' })}>
                Continue on your way
              </button>
              <button className="secondary-action" onClick={() => dispatch({ type: 'attackEncounter' })}>
                Draw steel and attack
              </button>
              <button className="secondary-action" onClick={() => dispatch({ type: 'dismissEncounter' })}>
                Make camp here instead
              </button>
            </>
          )}
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
