import { describe, expect, it } from 'vitest';
import { dispatch, play } from '../game/engine';
import { mulberry32 } from '../learn/quiz';
import type { Action, GameState, Tier } from '../game/types';
import L14, { EXAM_REPORTS } from './L14';

const start = (tier: Tier = 'guide', seed = 7) => L14.setup(tier, mulberry32(seed));
const run = (s: GameState, actions: Action[]) => actions.reduce((x, a) => dispatch(L14, x, a), s);
const ids = (s: GameState) => s.mistakes.map((m) => m.id);
const seedFor = (report: string) => {
  for (let seed = 1; seed < 200; seed++) if (start('examen', seed).vars.report === report) return seed;
  throw new Error(report);
};
const expected = (s: GameState, field: string) => L14.answers.find((f) => f.id === field)!.expected(s);
const read: Action = { type: 'custom', id: 'read' };

describe('L14', () => {
  for (const tier of ['guide', 'standard'] as Tier[]) {
    it(`perfect run → completed with 3 stars (${tier})`, () => {
      const s = play(L14, start(tier), L14.perfectRun(tier));
      expect(ids(s)).toEqual([]);
      expect(s.finished?.completed).toBe(true);
      expect(s.finished?.stars).toBe(3);
    });
  }

  for (const report of EXAM_REPORTS) {
    it(`perfect run → completed with 3 stars (examen, ${report})`, () => {
      const s = play(L14, start('examen', seedFor(report)), L14.perfectRun('examen'));
      expect(s.vars.report).toBe(report);
      expect(ids(s)).toEqual([]);
      expect(s.finished?.stars).toBe(3);
    });
  }

  it('masses come from the scale readings and t CO₂e from the nameplate', () => {
    const s = start('standard');
    expect(expected(s, 'recovered')).toBeCloseTo(12.01 - 10.85);
    expect(expected(s, 'charged')).toBeCloseTo(9.10 - 7.90);
    expect(expected(s, 'tco2e')).toBeCloseTo(0.81);
  });

  it('answering before reading the report is refused', () => {
    const s = run(start(), [{ type: 'answer', field: 'fluid', value: 1 }]);
    expect(s.answers.fluid).toBeUndefined();
  });

  it('signing with empty fields is refused', () => {
    const s = run(start(), [read, { type: 'custom', id: 'sign' }]);
    expect(s.vars.signed).toBeUndefined();
  });

  it('unexplained loss declared consistent → missing-leak-declaration', () => {
    const s = run(start('examen', seedFor('ecart')), [read, { type: 'answer', field: 'balance', value: 0 }]);
    expect(ids(s)).toEqual(['missing-leak-declaration']);
  });

  it('false alarm on a consistent balance → wrong-balance (minor)', () => {
    const s = run(start('standard'), [read, { type: 'answer', field: 'balance', value: 1 }]);
    expect(ids(s)).toEqual(['wrong-balance']);
  });

  it('wrong t CO₂e, quantities and frequency are major', () => {
    const s = run(start(), [read,
      { type: 'answer', field: 'tco2e', value: 1.2 },
      { type: 'answer', field: 'recovered', value: 12.02 },
      { type: 'answer', field: 'charged', value: 8.45 },
      { type: 'answer', field: 'nextCheck', value: 3 },
    ]);
    expect(ids(s)).toEqual(['wrong-tco2e', 'wrong-recovered', 'wrong-charged', 'wrong-frequency']);
    expect(s.mistakes.every((m) => m.severity === 'major')).toBe(true);
  });

  it('a wrong minor field is recorded once, others stay clean', () => {
    const s = run(start(), [read, { type: 'answer', field: 'attestation', value: 0 }, { type: 'answer', field: 'attestation', value: 2 }]);
    expect(ids(s)).toEqual(['wrong-attestation']);
  });

  it('two wrong fields of 17 (< 90 %) → signed but not completed', () => {
    const steps = L14.perfectRun('guide').map((st) => (s: GameState) => {
      const a = typeof st === 'function' ? st(s) : st;
      return a.type === 'answer' && (a.field === 'archive' || a.field === 'oilPath') ? { ...a, value: 0 } : a;
    });
    const s = play(L14, start(), steps);
    expect(s.vars.signed).toBe(true);
    expect(s.finished?.completed).toBe(false);
  });

  it('unrepaired leak → red sticker, nothing charged', () => {
    const s = start('examen', seedFor('fuite'));
    expect(expected(s, 'sticker')).toBe(0);
    expect(expected(s, 'charged')).toBe(0);
    expect(expected(s, 'chargedType')).toBe(3);
  });

  it('answers are locked after signing', () => {
    const signed = play(L14, start(), L14.perfectRun('guide').slice(0, -1));
    const s = run(signed, [{ type: 'answer', field: 'fluid', value: 0 }]);
    expect(s.answers.fluid.ok).toBe(true);
  });
});
