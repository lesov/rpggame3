import type { GameDate, GameTime } from '../sim/calendar';
import type { PlayerLocation } from '../player/types';

export type QuestStatus = 'active' | 'completed' | 'failed';
export type QuestStepStatus = 'active' | 'pending' | 'completed';
export type CourierQuestPhase = 'deliver-letter' | 'wait-for-response' | 'return-response' | 'ruins-inspected';
export type StabilizeQuestPhase = 'seminol-arriving';
export type QuestPhase = CourierQuestPhase | StabilizeQuestPhase;

export interface QuestStep {
  id: string;
  title: string;
  description: string;
  status: QuestStepStatus;
}

export interface Quest {
  id: string;
  title: string;
  status: QuestStatus;
  phase?: QuestPhase;
  giverName: string;
  giverRole: string;
  origin: PlayerLocation;
  destination: PlayerLocation;
  targetName: string;
  targetRole: string;
  responseReadyAt?: {
    date: GameDate;
    time: GameTime;
  };
  instructions: string;
  steps: QuestStep[];
  startedAt: GameDate;
}
