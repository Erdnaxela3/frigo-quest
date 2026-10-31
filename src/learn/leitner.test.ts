import { describe, expect, it } from 'vitest';
import type { Flashcard } from './types';
import { dueCards, nextState } from './leitner';

const at = (y: number, mo: number, d: number, h = 0, mi = 0) => new Date(y, mo - 1, d, h, mi).getTime();

describe('leitner', () => {
  it('leitner promotes and demotes', () => {
    const now = at(2026, 10, 31, 12);
    expect(nextState(undefined, true, now).box).toBe(2);
    expect(nextState(undefined, false, now)).toEqual({ box: 1, due: at(2026, 10, 31) });
    expect(nextState({ box: 3, due: 0 }, true, now)).toEqual({ box: 4, due: at(2026, 11, 7) });
    expect(nextState({ box: 5, due: 0 }, true, now)).toEqual({ box: 5, due: at(2026, 11, 21) });
    expect(nextState({ box: 4, due: 0 }, false, now).box).toBe(1);
  });

  it('leitner intervals by calendar day', () => {
    const late = at(2026, 10, 31, 23, 59);
    const s = nextState({ box: 1, due: 0 }, true, late);
    expect(s).toEqual({ box: 2, due: at(2026, 11, 1) });
    expect(s.due - late).toBe(60_000);
  });

  it('dueCards caps at max', () => {
    const now = at(2026, 10, 31, 12);
    const cards: Flashcard[] = Array.from({ length: 40 }, (_, i) => ({
      id: `c${i}`, skills: [], front: 'f', back: 'b', deck: 'fluides', confidence: 'ok',
    }));
    const states = { c0: { box: 2 as const, due: at(2026, 11, 2) }, c1: { box: 1 as const, due: at(2026, 10, 30) } };
    const due = dueCards(cards, states, now);
    expect(due).toHaveLength(30);
    expect(due[0].id).toBe('c1');
    expect(due.some((c) => c.id === 'c0')).toBe(false);
    expect(dueCards(cards, states, now, 5)).toHaveLength(5);
  });
});
