import Anthropic from '@anthropic-ai/sdk';
import { getStoredApiKey, NARRATOR_MODEL } from '../combat/narrator/claude';
import { buildClaudePainterMessage, type ScenePainterDraft } from './prompt';

const SCENE_PAINTER_SYSTEM =
  'You write polished fantasy image-generation prompts from structured game scene facts. ' +
  'You are concrete, visual, atmospheric, and faithful to the provided characters and setting.';

type TextTurn = { role: 'user'; content: string };

export interface TextClient {
  messages: {
    create(args: {
      model: string;
      max_tokens: number;
      system: string;
      messages: TextTurn[];
    }): Promise<{ content: unknown[] }>;
  };
}

export class ClaudeScenePainter {
  constructor(private readonly client: TextClient) {}

  static fromEnv(): ClaudeScenePainter | null {
    const apiKey = getStoredApiKey();
    if (!apiKey) return null;
    const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
    return new ClaudeScenePainter(client as unknown as TextClient);
  }

  async paint(draft: ScenePainterDraft): Promise<string> {
    const response = await this.client.messages.create({
      model: NARRATOR_MODEL,
      max_tokens: 700,
      system: SCENE_PAINTER_SYSTEM,
      messages: [{ role: 'user', content: buildClaudePainterMessage(draft) }],
    });
    const text = textFromContent(response.content).trim();
    if (!text) throw new Error('Scene painter returned an empty response.');
    return text;
  }
}

export function textFromContent(content: unknown[]): string {
  return content
    .map((block) => {
      if (!block || typeof block !== 'object' || !('text' in block)) return '';
      return String((block as { text: unknown }).text ?? '');
    })
    .join('');
}
