/**
 * Pacing governor — a mild pity timer. Pure Poisson produces streaks (three
 * ambushes in a night, then six quiet days): honest, but it feels broken. We
 * multiply λ by a factor that rises slowly with time since the last
 * encounter and resets to 1 when one fires. Smooths the experience without
 * making the math dishonest, and it is bounded so it can never dominate.
 */
export interface PacingState {
  hoursSinceEncounter: number;
}

export const PACING = {
  /** how fast the pity factor climbs, per idle hour */
  RISE_PER_HOUR: 0.03,
  /** ceiling of the bonus (factor tops out at 1 + CAP) */
  CAP: 1.5,
} as const;

export const initialPacing: PacingState = { hoursSinceEncounter: 0 };

export function pityFactor(state: PacingState): number {
  return 1 + Math.min(PACING.CAP, PACING.RISE_PER_HOUR * Math.max(0, state.hoursSinceEncounter));
}

export function advancePacing(state: PacingState, hours: number): PacingState {
  return { hoursSinceEncounter: Math.max(0, state.hoursSinceEncounter + hours) };
}

export function resetPacing(): PacingState {
  return { hoursSinceEncounter: 0 };
}
