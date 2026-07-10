import type { WorldData } from '../data/worldLoader';
import type { PlayerReputations, ReputationEntry, ReputationKind, ReputationLabel } from './types';

export function reputationLabel(score: number): ReputationLabel {
  if (score <= -80) return 'Hated';
  if (score <= -40) return 'Hostile';
  if (score <= -10) return 'Wary';
  if (score >= 80) return 'Revered';
  if (score >= 40) return 'Favored';
  return 'Neutral';
}

function neutralEntry(kind: ReputationKind, id: number, name: string): ReputationEntry {
  return { kind, id, name, score: 0, label: reputationLabel(0) };
}

export function buildNeutralReputations(wd: WorldData): PlayerReputations {
  return {
    cultures: wd.world.cultures
      .filter((culture) => culture.i > 0)
      .map((culture) => neutralEntry('culture', culture.i, culture.name)),
    religions: wd.world.religions
      .filter((religion) => religion.i > 0)
      .map((religion) => neutralEntry('religion', religion.i, religion.name)),
  };
}

export function findReputation(entries: ReputationEntry[], id: number): ReputationEntry | undefined {
  return entries.find((entry) => entry.id === id);
}
