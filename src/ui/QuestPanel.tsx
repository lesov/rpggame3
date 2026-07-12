import type { QuestStepStatus } from '../quests/types';
import { useGame } from './store';

const STEP_LABEL: Record<QuestStepStatus, string> = {
  active: 'Current',
  pending: 'Pending',
  completed: 'Done',
};

export function QuestPanel() {
  const { state, dispatch } = useGame();
  const player = state.player;

  if (!player) return <div className="inspector-empty">Create or choose a character to see quests.</div>;

  const active = player.quests.filter((quest) => quest.status === 'active');
  if (active.length === 0) return <div className="inspector-empty">No active quests.</div>;

  return (
    <div className="quest-panel">
      {active.map((quest) => (
        <article className="section quest-card" key={quest.id}>
          <h3>{quest.title}</h3>
          <div className="kv"><span>Giver</span><span>{quest.giverName}, {quest.giverRole}</span></div>
          <div className="kv"><span>Target</span><span>{quest.targetName}, {quest.targetRole}</span></div>
          <div className="kv"><span>Origin</span><span>{quest.origin.placeName}, {quest.origin.stateName}</span></div>
          <div className="kv"><span>Destination</span><span>{quest.destination.placeName}, {quest.destination.stateName}</span></div>
          <p className="quest-instructions">{quest.instructions}</p>
          <div className="quest-steps">
            {quest.steps.map((step) => (
              <div className={`quest-step ${step.status}`} key={step.id}>
                <span>{STEP_LABEL[step.status]}</span>
                <strong>{step.title}</strong>
                <em>{step.description}</em>
              </div>
            ))}
          </div>
          <button
            className="primary-action"
            onClick={() =>
              dispatch({
                type: 'jumpTo',
                x: quest.destination.x,
                y: quest.destination.y,
                minZoom: 6,
                selectCell: quest.destination.cellId,
              })
            }
          >
            Show destination
          </button>
        </article>
      ))}
    </div>
  );
}
