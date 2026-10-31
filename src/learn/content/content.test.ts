import { describe, expect, it } from 'vitest';
import { SKILL_BY_ID, SKILLS } from '../skills';
import type { Question } from '../types';
import { CARDS, GENERATORS, LESSONS, QUESTIONS } from './index';
import { QUESTIONS_A1_BASE } from './questions-a1-base';

function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function checkQuestion(q: Question) {
  expect(q.id, 'id').toBeTruthy();
  expect(q.prompt.trim(), `${q.id} prompt`).not.toBe('');
  expect(q.explain.trim(), `${q.id} explain`).not.toBe('');
  expect(q.skills.length, `${q.id} skills`).toBeGreaterThan(0);
  for (const s of q.skills) expect(SKILL_BY_ID[s], `${q.id}: unknown skill ${s}`).toBeDefined();
  switch (q.type) {
    case 'single':
      expect(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.choices.length, `${q.id} answer`).toBe(true);
      break;
    case 'multi':
      expect(q.answer.length, `${q.id} answer`).toBeGreaterThan(0);
      expect(new Set(q.answer).size, `${q.id} duplicate answers`).toBe(q.answer.length);
      for (const a of q.answer) expect(Number.isInteger(a) && a >= 0 && a < q.choices.length, `${q.id} answer ${a}`).toBe(true);
      break;
    case 'numeric':
      expect(Number.isFinite(q.answer.value), `${q.id} value`).toBe(true);
      expect(q.answer.tol >= 0, `${q.id} tol`).toBe(true);
      break;
    case 'order':
      expect(q.choices.length, `${q.id} order choices`).toBeGreaterThanOrEqual(3);
      break;
  }
}

describe('learning content', () => {
  it('ids are unique across questions, cards and lessons', () => {
    const ids = [...QUESTIONS.map((q) => q.id), ...CARDS.map((c) => c.id), ...LESSONS.map((l) => l.id)];
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dupes).toEqual([]);
  });

  it('every skill id exists', () => {
    const all = [...QUESTIONS, ...CARDS, ...LESSONS, ...GENERATORS].flatMap((x) => x.skills.map((s) => [x.id, s]));
    expect(all.filter(([, s]) => !SKILL_BY_ID[s])).toEqual([]);
  });

  it('questions are well formed', () => {
    QUESTIONS.forEach(checkQuestion);
  });

  it('each generator yields 20 valid, varied questions', () => {
    const rng = mulberry32(42);
    for (const g of GENERATORS) {
      for (const s of g.skills) expect(SKILL_BY_ID[s], `${g.id}: unknown skill ${s}`).toBeDefined();
      const qs = Array.from({ length: 20 }, () => g.make(rng));
      qs.forEach(checkQuestion);
      // same id = same parameters, so an occasional repeat is fine; only guard against a degenerate generator
      expect(new Set(qs.map((q) => q.id)).size, g.id).toBeGreaterThanOrEqual(12);
    }
  });

  it('A1 items 1.00–5.09 are each covered by at least 2 base questions', () => {
    const items = SKILLS.filter((s) => s.id.startsWith('A1:') && Number(s.group) <= 5).map((s) => s.id);
    const thin = items.filter((id) => QUESTIONS_A1_BASE.filter((q) => q.skills.includes(id)).length < 2);
    expect(thin).toEqual([]);
  });
});
