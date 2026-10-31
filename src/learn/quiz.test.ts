import { describe, expect, it } from 'vitest';
import type { Question, QuestionGenerator } from './types';
import { grade, mulberry32, parseNumber, pickTheme, pickWeakest } from './quiz';

const base = { prompt: 'p', explain: 'e', confidence: 'ok' as const };
const single: Question = { ...base, id: 's', skills: ['A1:1.03'], type: 'single', choices: ['a', 'b', 'c'], answer: 1 };
const multi: Question = { ...base, id: 'm', skills: ['A1:4.01'], type: 'multi', choices: ['a', 'b', 'c'], answer: [0, 2] };
const numeric: Question = { ...base, id: 'n', skills: ['A1:1.03'], type: 'numeric', answer: { value: 8, tol: 0.3 }, unit: 'bar' };
const order: Question = { ...base, id: 'o', skills: ['A1:3.03'], type: 'order', choices: ['x', 'y', 'z'] };
const pool = [single, multi, numeric, order];
const gen: QuestionGenerator = {
  id: 'g', skills: ['A1:4.05'], label: 'gen',
  make: (rng) => ({ ...base, id: `g-${rng()}`, skills: ['A1:4.05'], type: 'numeric', answer: { value: 1, tol: 0 }, unit: '' }),
};

describe('quiz', () => {
  it('parses French decimals', () => {
    expect(parseNumber('8,1')).toBe(8.1);
    expect(parseNumber('8.1')).toBe(8.1);
    expect(parseNumber(' -0,5 ')).toBe(-0.5);
    expect(parseNumber('−2,25')).toBe(-2.25);
    expect(parseNumber('12')).toBe(12);
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('abc')).toBeNull();
    expect(parseNumber('1,2,3')).toBeNull();
    expect(grade(numeric, '8,1')).toBe(true);
  });

  it('grades every question type', () => {
    expect(grade(single, 1)).toBe(true);
    expect(grade(single, 0)).toBe(false);
    expect(grade(multi, [2, 0])).toBe(true);
    expect(grade(multi, [0])).toBe(false);
    expect(grade(multi, [0, 1, 2])).toBe(false);
    expect(grade(numeric, 8.2)).toBe(true);
    expect(grade(numeric, 9)).toBe(false);
    expect(grade(numeric, 'n/a')).toBe(false);
    expect(grade(order, [0, 1, 2])).toBe(true);
    expect(grade(order, [1, 0, 2])).toBe(false);
    expect(grade(order, [0, 1])).toBe(false);
    expect(grade(single, 'garbage')).toBe(false);
  });

  it('numeric tolerance inclusive', () => {
    expect(grade(numeric, 8.3)).toBe(true);
    expect(grade(numeric, 7.7)).toBe(true);
    expect(grade(numeric, '8,3')).toBe(true);
    expect(grade(numeric, 8.31)).toBe(false);
  });

  it('pickTheme filters by group and tops up with generators', () => {
    const rng = mulberry32(1);
    expect(pickTheme('1', 10, rng, pool, [gen]).map((q) => q.id).sort()).toEqual(['n', 's']);
    const g4 = pickTheme('4', 5, rng, pool, [gen]);
    expect(g4).toHaveLength(5);
    expect(g4.filter((q) => q.id === 'm')).toHaveLength(1);
    expect(pickTheme('12', 10, rng, pool, [gen])).toEqual([]);
  });

  it('pickWeakest prefers weak seen skills, then falls back', () => {
    const rng = mulberry32(2);
    const picked = pickWeakest(1, { 'A1:4.01': 0.1, 'A1:1.03': 0.9, 'A1:3.03': 0.95, 'A1:4.05': 0.99 }, rng, pool, []);
    expect(picked.map((q) => q.id)).toEqual(['m']);
    expect(pickWeakest(4, {}, rng, pool, [])).toHaveLength(4);
  });

  it('mulberry32 is deterministic', () => {
    const a = mulberry32(42), b = mulberry32(42);
    const x = a();
    expect(x).toBe(b());
    expect(x).toBeGreaterThanOrEqual(0);
    expect(x).toBeLessThan(1);
  });
});
