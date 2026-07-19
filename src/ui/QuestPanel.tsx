import type { QuestStepStatus } from '../quests/types';
import {
  canDeliverCourierLetter,
  canInspectGuildRuins,
  canMeetEmgerdas,
  canMeetSeminol,
  canReceiveCourierResponse,
  canSpeakToSemina,
  completedCourierQuest,
  courierObjective,
  questStepLabel,
  responseWaitRemainingMinutes,
} from '../quests/progression';
import { EMGERDAS_SCENE, RUINS_SCENE, SEMINA_SCENE, SEMINOL_SCENE } from '../quests/survivors';
import { formatDateTime, formatTime24 } from '../sim/calendar';
import { useGame, type GameAction } from './store';

const STEP_LABEL: Record<QuestStepStatus, string> = {
  active: 'Current',
  pending: 'Pending',
  completed: 'Done',
};

function waitButtonLabel(minutes: number): string {
  if (minutes <= 0) return 'Collect response letter';
  const hours = Math.ceil(minutes / 60);
  return `Wait ${hours} ${hours === 1 ? 'hour' : 'hours'} for response`;
}

function SceneBlock({
  scene,
  action,
  dispatch,
}: {
  scene: { heading: string; paragraphs: string[]; action: string };
  action: GameAction;
  dispatch: (action: GameAction) => void;
}) {
  return (
    <div className="quest-dialogue">
      <strong>{scene.heading}</strong>
      {scene.paragraphs.map((text, i) => (
        <p key={i}>{text}</p>
      ))}
      <button className="primary-action" onClick={() => dispatch(action)}>
        {scene.action}
      </button>
    </div>
  );
}

export function QuestPanel() {
  const { state, dispatch } = useGame();
  const player = state.player;

  if (!player) return <div className="inspector-empty">Create or choose a character to see quests.</div>;

  const active = player.quests.filter((quest) => quest.status === 'active');
  const showEmgerdas = canMeetEmgerdas(player);
  const courierDone = completedCourierQuest(player);
  if (active.length === 0 && !showEmgerdas) return <div className="inspector-empty">No active quests.</div>;

  return (
    <div className="quest-panel">
      {active.map((quest) => {
        const objective = courierObjective(quest);
        const canDeliver = canDeliverCourierLetter(player, quest);
        const canReceive = canReceiveCourierResponse(player, quest);
        const waitMinutes = responseWaitRemainingMinutes(quest, state.date, state.time);
        return (
          <article className="section quest-card" key={quest.id}>
            <h3>{quest.title}</h3>
            <div className="kv"><span>Giver</span><span>{quest.giverName}, {quest.giverRole}</span></div>
            <div className="kv"><span>Target</span><span>{quest.targetName}, {quest.targetRole}</span></div>
            <div className="kv"><span>Origin</span><span>{quest.origin.placeName}, {quest.origin.stateName}</span></div>
            <div className="kv"><span>{questStepLabel(quest)}</span><span>{objective.placeName}, {objective.stateName}</span></div>
            {quest.responseReadyAt && (
              <div className="kv"><span>Ready</span><span>{formatDateTime(quest.responseReadyAt)}</span></div>
            )}
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

            {canDeliver && (
              <div className="quest-dialogue">
                <strong>Representative of the Firekeeper</strong>
                <p>
                  You present the sealed letter and mention that you know it must matter: errands like this are usually
                  trusted to Sparks, not Embers. The representative understands at once and tells you to wait nearby
                  while the response is penned.
                </p>
                <button className="primary-action" onClick={() => dispatch({ type: 'deliverQuestLetter', questId: quest.id })}>
                  Deliver sealed letter
                </button>
              </div>
            )}

            {canReceive && (
              <div className="quest-dialogue">
                <strong>The response is being sealed</strong>
                <p>
                  The hall has taken your message seriously. Wait until {quest.responseReadyAt ? formatTime24(quest.responseReadyAt.time) : 'the appointed time'} and collect the response letter.
                </p>
                <button className="primary-action" onClick={() => dispatch({ type: 'waitForQuestResponse', questId: quest.id })}>
                  {waitButtonLabel(waitMinutes)}
                </button>
              </div>
            )}

            {canInspectGuildRuins(player, quest) && (
              <SceneBlock scene={RUINS_SCENE} action={{ type: 'inspectGuildRuins', questId: quest.id }} dispatch={dispatch} />
            )}

            {canSpeakToSemina(player, quest) && (
              <SceneBlock scene={SEMINA_SCENE} action={{ type: 'speakToSemina', questId: quest.id }} dispatch={dispatch} />
            )}

            {canMeetSeminol(player, quest) && (
              <SceneBlock scene={SEMINOL_SCENE} action={{ type: 'meetSeminol', questId: quest.id }} dispatch={dispatch} />
            )}

            <button
              className="primary-action"
              onClick={() =>
                dispatch({
                  type: 'jumpTo',
                  x: objective.x,
                  y: objective.y,
                  minZoom: 6,
                  selectCell: objective.cellId,
                })
              }
            >
              Show current objective
            </button>
          </article>
        );
      })}

      {showEmgerdas && courierDone && (
        <article className="section quest-card">
          <h3>{courierDone.title} — completed</h3>
          <p className="quest-instructions">{courierDone.instructions}</p>
          <SceneBlock scene={EMGERDAS_SCENE} action={{ type: 'meetEmgerdas' }} dispatch={dispatch} />
        </article>
      )}
    </div>
  );
}
