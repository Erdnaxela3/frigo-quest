import { describe, expect, it } from 'vitest';
import { importProgress, isProgress, mastery } from './store';

describe('progress store', () => {
  it('mastery is an EWMA per skill', () => {
    const m = mastery([
      { kind: 'quiz', skills: ['A1:1.03'], score: 1, at: 1 },
      { kind: 'quiz', skills: ['A1:1.03', 'A1:4.01'], score: 0, at: 2 },
    ]);
    expect(m['A1:1.03']).toBeCloseTo(0.7);
    expect(m['A1:4.01']).toBe(0);
  });

  it('rejects invalid imports', () => {
    expect(isProgress({ version: 2, events: [], cards: {}, levels: {} })).toBe(false);
    expect(() => importProgress('{"version":1}')).toThrow();
  });
});
