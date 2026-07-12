import type { GameDate } from '../sim/calendar';
import type { PlayerLocation } from '../player/types';

export type QuestStatus = 'active' | 'completed' | 'failed';
export type QuestStepStatus = 'active' | 'pending' | 'completed';

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
  giverName: string;
  giverRole: string;
  origin: PlayerLocation;
  destination: PlayerLocation;
  targetName: string;
  targetRole: string;
  instructions: string;
  steps: QuestStep[];
  startedAt: GameDate;
}
