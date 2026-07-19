import { describe, expect, it } from 'vitest';
import { ClaudeScenePainter, textFromContent, type TextClient } from './claude';
import type { ScenePainterDraft } from './prompt';

function draft(): ScenePainterDraft {
  return {
    title: 'Test Scene',
    contextLines: ['Setting: the main square of Testburg.', 'Weather: cold rain, 41F.'],
    people: [{ name: 'Testovar', role: 'fighter', looks: 'a tall human with white hair.', state: 'muddy cloak.' }],
    prompt: 'Local fallback.',
  };
}

describe('ClaudeScenePainter', () => {
  it('sends the painter facts to Claude and returns text content', async () => {
    const calls: unknown[] = [];
    const client: TextClient = {
      messages: {
        async create(args) {
          calls.push(args);
          return { content: [{ type: 'text', text: 'Painted prompt.' }] };
        },
      },
    };
    const painter = new ClaudeScenePainter(client);
    await expect(painter.paint(draft())).resolves.toBe('Painted prompt.');
    expect(calls).toHaveLength(1);
    expect(JSON.stringify(calls[0])).toContain('the main square of Testburg');
    expect(JSON.stringify(calls[0])).toContain('Testovar');
  });

  it('extracts only text blocks from API content', () => {
    expect(textFromContent([{ type: 'text', text: 'A' }, { nope: true }, { type: 'text', text: 'B' }])).toBe('AB');
  });
});
