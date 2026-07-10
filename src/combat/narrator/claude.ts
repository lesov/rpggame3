/**
 * Claude narrator: streams visceral prose from Claude Haiku 4.5, one
 * conversation per battle so the model stays consistent with what it has
 * already described (named wounds, the enemy's face, the weather).
 *
 * The mechanical breakdown is always rendered by the UI from the events; this
 * layer only produces prose. Any failure (no key, network, API error) falls
 * back to the PlainNarrator line for that beat, so a battle never blocks on the
 * network.
 */
import Anthropic from '@anthropic-ai/sdk';
import type { CombatEvent, CombatState } from '../types';
import { type NarrativeProvider, narratableEvents } from './types';
import { PlainNarrator } from './plain';
import {
  SYSTEM_STYLE,
  buildIntroMessage,
  buildEventMessage,
  buildOutroMessage,
} from './prompt';

export const NARRATOR_MODEL = 'claude-haiku-4-5';
const API_KEY_STORAGE = 'lepasoul.anthropicKey';

export function getStoredApiKey(): string | null {
  try {
    return localStorage.getItem(API_KEY_STORAGE);
  } catch {
    return null;
  }
}

export function setStoredApiKey(key: string | null): void {
  try {
    if (key && key.trim()) localStorage.setItem(API_KEY_STORAGE, key.trim());
    else localStorage.removeItem(API_KEY_STORAGE);
  } catch {
    /* localStorage unavailable (e.g. SSR/tests) — narrator falls back to plain */
  }
}

type Turn = { role: 'user' | 'assistant'; content: string };

/** Minimal shape of the SDK surface we use — lets tests inject a fake client. */
export interface StreamingClient {
  messages: {
    stream(args: {
      model: string;
      max_tokens: number;
      system: string;
      messages: Turn[];
    }): AsyncIterable<unknown> & { finalMessage(): Promise<{ content: unknown[] }> };
  };
}

export class ClaudeNarrator implements NarrativeProvider {
  readonly id = 'claude' as const;
  private readonly plain = new PlainNarrator();
  private readonly transcript: Turn[] = [];

  constructor(private readonly client: StreamingClient) {}

  /**
   * Build a narrator for the current environment, or `null` if no API key is
   * configured (the caller then uses PlainNarrator).
   */
  static fromEnv(): ClaudeNarrator | null {
    const apiKey = getStoredApiKey();
    if (!apiKey) return null;
    const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
    return new ClaudeNarrator(client as unknown as StreamingClient);
  }

  intro(state: CombatState): AsyncIterable<string> {
    return this.run(buildIntroMessage(state), 600, () => this.plain.intro(state));
  }

  narrate(events: CombatEvent[], state: CombatState): AsyncIterable<string> {
    const worth = narratableEvents(events);
    if (worth.length === 0) return empty();
    return this.run(buildEventMessage(worth, state), 320, () =>
      this.plain.narrate(events, state),
    );
  }

  outro(state: CombatState): AsyncIterable<string> {
    return this.run(buildOutroMessage(state), 600, () => this.plain.outro(state));
  }

  /**
   * Stream one turn. Appends the user message and the assistant's full reply to
   * the transcript for continuity. On any error, yields the plain fallback and
   * records a neutral placeholder so the transcript stays well-formed.
   */
  private async *run(
    userText: string,
    maxTokens: number,
    fallback: () => AsyncIterable<string>,
  ): AsyncIterable<string> {
    const messages: Turn[] = [...this.transcript, { role: 'user', content: userText }];
    let full = '';
    try {
      const stream = this.client.messages.stream({
        model: NARRATOR_MODEL,
        max_tokens: maxTokens,
        system: SYSTEM_STYLE,
        messages,
      });
      for await (const event of stream) {
        const delta = textDelta(event);
        if (delta) {
          full += delta;
          yield delta;
        }
      }
      if (!full) full = await finalText(stream);
    } catch {
      // Network / key / API failure — degrade to the factual line for this beat.
      let fb = '';
      for await (const chunk of fallback()) {
        fb += chunk;
        yield chunk;
      }
      this.transcript.push({ role: 'user', content: userText });
      this.transcript.push({ role: 'assistant', content: fb || '…' });
      return;
    }
    this.transcript.push({ role: 'user', content: userText });
    this.transcript.push({ role: 'assistant', content: full || '…' });
  }
}

async function* empty(): AsyncIterable<string> {}

/** Extract text from a streaming event, tolerant of SDK event shape. */
function textDelta(event: unknown): string {
  if (!event || typeof event !== 'object') return '';
  const e = event as { type?: string; delta?: { type?: string; text?: string } };
  if (e.type === 'content_block_delta' && e.delta?.type === 'text_delta') {
    return e.delta.text ?? '';
  }
  return '';
}

async function finalText(stream: { finalMessage(): Promise<{ content: unknown[] }> }): Promise<string> {
  const msg = await stream.finalMessage();
  return msg.content
    .map((b) => (b && typeof b === 'object' && 'text' in b ? String((b as { text: unknown }).text) : ''))
    .join('');
}
