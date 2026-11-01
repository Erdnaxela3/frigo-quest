import { describe, expect, it } from 'vitest';
import type { Question } from './types';
import { SKILL_BY_ID } from './skills';
import { GENERATORS, QUESTIONS } from './content';
import { EP1_DOSSIER, EP1_QUESTIONS } from './content/exam-ep1';
import { mulberry32 } from './quiz';
import {
  A1_FIXED_GROUPS, A1_RANDOM_GROUPS, A1_SIZE, buildA1Exam, ep3Bests, ep3Mark, groupsOf, isCO2, isEfficiency, isNH3, scoreExam,
} from './exam';

describe('buildA1Exam', () => {
  for (let seed = 1; seed <= 50; seed++) {
    it(`seed ${seed} follows the A1 rules`, () => {
      const { questions, group } = buildA1Exam(mulberry32(seed), QUESTIONS, GENERATORS);
      expect(A1_RANDOM_GROUPS).toContain(group);
      expect(questions.length).toBe(A1_SIZE);
      expect(new Set(questions.map((q) => q.id)).size).toBe(questions.length);
      const groups = new Set(questions.flatMap(groupsOf));
      for (const g of [...A1_FIXED_GROUPS, group]) expect(groups, `group ${g}`).toContain(g);
      expect(A1_RANDOM_GROUPS.filter((g) => groups.has(g))).toEqual([group]);
      expect([...groups].every((g) => /^\d+$/.test(g)), 'A1 groups only').toBe(true);
      expect(questions.some(isCO2), 'CO₂').toBe(true);
      expect(questions.some(isNH3), 'NH₃').toBe(true);
      expect(questions.some(isEfficiency), 'efficacité').toBe(true);
      expect(questions.filter((q) => q.id.startsWith('g-')).length).toBeGreaterThanOrEqual(2);
    });
  }

  it('topic detectors are not fooled by "t CO₂e"', () => {
    const q = QUESTIONS.find((x) => x.id === 'q1-2.02-tco2e');
    if (q) expect(isCO2(q)).toBe(false);
    expect(QUESTIONS.filter(isCO2).length).toBeGreaterThan(2);
  });
});

describe('scoreExam', () => {
  const qs: Question[] = [
    { id: 'a', skills: ['A1:1.01'], type: 'single', prompt: '', explain: '', confidence: 'ok', choices: ['x', 'y'], answer: 1 },
    { id: 'b', skills: ['A1:1.03', 'A1:4.04'], type: 'numeric', prompt: '', explain: '', confidence: 'ok', answer: { value: 8.1, tol: 0.3 }, unit: 'bar' },
    { id: 'c', skills: ['A1:3.04'], type: 'order', prompt: '', explain: '', confidence: 'ok', choices: ['1', '2', '3'] },
    { id: 'd', skills: ['A1:4.01'], type: 'multi', prompt: '', explain: '', confidence: 'ok', choices: ['1', '2', '3'], answer: [0, 2] },
  ];

  it('grades answers, counts unanswered as wrong and breaks down by group/skill', () => {
    const r = scoreExam(qs, { a: 1, b: '8,3', d: [2] });
    expect(r.results).toEqual([true, true, false, false]);
    expect(r.correct).toBe(2);
    expect(r.score).toBe(0.5);
    expect(r.byGroup['1']).toEqual({ ok: 2, n: 2 });
    expect(r.byGroup['4']).toEqual({ ok: 1, n: 2 });
    expect(r.byGroup['3']).toEqual({ ok: 0, n: 1 });
    expect(r.bySkill['A1:4.04']).toEqual({ ok: 1, n: 1 });
  });

  it('scores a perfect paper at 1 and an empty one at 0', () => {
    expect(scoreExam(qs, { a: 1, b: 8.1, c: [0, 1, 2], d: [0, 2] }).score).toBe(1);
    expect(scoreExam(qs, {}).score).toBe(0);
  });
});

describe('EP3 mark', () => {
  it('weights the barème and prefers exam-tier results', () => {
    expect(ep3Mark({ L04: { best: 100 }, L06: { best: 100 }, L07: { best: 100 } })).toBe(20);
    expect(ep3Mark({})).toBe(0);
    // L04 only: 15 pts + 20/3 relevés = 21.67/100 → 4.3/20
    expect(ep3Mark({ L04: { best: 100 } })).toBe(4.3);
    const bests = ep3Bests(
      [
        { kind: 'level', skills: [], score: 0.6, at: 1, detail: { level: 'L04', tier: 'examen' } },
        { kind: 'level', skills: [], score: 0.9, at: 2, detail: { level: 'L04', tier: 'guide' } },
      ],
      { L04: { best: 90, stars: 3, completed: true }, L06: { best: 70, stars: 2, completed: true } },
    );
    expect(bests.L04).toEqual({ best: 60, examTier: true });
    expect(bests.L06).toEqual({ best: 70, examTier: false });
    expect(bests.L07).toBeUndefined();
  });
});

describe('EP1 content', () => {
  it('has a dossier and 20–30 well-formed questions', () => {
    expect(EP1_DOSSIER.length).toBeGreaterThan(0);
    expect(EP1_QUESTIONS.length).toBeGreaterThanOrEqual(20);
    expect(EP1_QUESTIONS.length).toBeLessThanOrEqual(30);
    const ids = EP1_QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.filter((id) => QUESTIONS.some((q) => q.id === id))).toEqual([]);
    for (const q of EP1_QUESTIONS) {
      expect(q.prompt.trim() && q.explain.trim(), q.id).toBeTruthy();
      expect(q.skills.some((s) => s.startsWith('CAP:UP1.') || s.startsWith('CAP:UP2.') || s.startsWith('CAP:UP3.')), q.id).toBe(true);
      for (const s of q.skills) expect(SKILL_BY_ID[s], `${q.id}: ${s}`).toBeDefined();
      if (q.type === 'single') expect(q.answer >= 0 && q.answer < q.choices.length, q.id).toBe(true);
      if (q.type === 'multi') {
        expect(q.answer.length, q.id).toBeGreaterThan(0);
        expect(new Set(q.answer).size, q.id).toBe(q.answer.length);
        expect(q.answer.every((a) => Number.isInteger(a) && a >= 0 && a < q.choices.length), q.id).toBe(true);
      }
      if (q.type === 'numeric') expect(Number.isFinite(q.answer.value) && q.answer.tol >= 0, q.id).toBe(true);
      if (q.type === 'order') expect(q.choices.length, q.id).toBeGreaterThanOrEqual(3);
    }
    for (const s of ['CAP:UP1.dossier', 'CAP:UP1.quantitatif', 'CAP:UP1.securite']) {
      expect(EP1_QUESTIONS.some((q) => q.skills.includes(s)), s).toBe(true);
    }
  });
});
