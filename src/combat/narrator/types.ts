import type { CombatEvent, CombatState } from '../types';

/**
 * A narrative provider turns resolved combat events into prose. Output is an
 * async chunk stream so LLM narration can render as it generates; the plain
 * provider yields a single chunk.
 */
export interface NarrativeProvider {
  readonly id: 'plain' | 'claude';
  /** Opening scene — "draw the scene including all information available". */
  intro(state: CombatState): AsyncIterable<string>;
  /** Narrate a batch of events that resolved together (one dice click / enemy turn). */
  narrate(events: CombatEvent[], state: CombatState): AsyncIterable<string>;
  /** Closing scene for the battle's outcome. */
  outro(state: CombatState): AsyncIterable<string>;
}

/** Event kinds that deserve prose (the rest are bookkeeping shown as calc lines). */
export function narratableEvents(events: CombatEvent[]): CombatEvent[] {
  return events.filter((e) => e.kind !== 'round' && e.kind !== 'intro' && e.kind !== 'outcome' && e.kind !== 'initiative');
}

export async function* once(text: string): AsyncIterable<string> {
  yield text;
}

export async function collect(stream: AsyncIterable<string>): Promise<string> {
  let out = '';
  for await (const chunk of stream) out += chunk;
  return out;
}
