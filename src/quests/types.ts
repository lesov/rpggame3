import type { GameDate, GameTime } from '../sim/calendar';
import type { PlayerLocation } from '../player/types';

export type QuestStatus = 'active' | 'completed' | 'failed';
export type QuestStepStatus = 'active' | 'pending' | 'completed';
export type CourierQuestPhase = 'deliver-letter' | 'wait-for-response' | 'return-response';

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
  phase?: CourierQuestPhase;
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
