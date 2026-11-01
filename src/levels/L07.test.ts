import { describe, expect, it } from 'vitest';
import { dispatch, play } from '../game/engine';
import { startsWithin } from '../game/platineModel';
import { mulberry32 } from '../learn/quiz';
import type { Action, GameState, Tier } from '../game/types';
import L07, { jury } from './L07';

const start = (tier: Tier = 'guide', rng: () => number = mulberry32(7)) => L07.setup(tier, rng);
const run = (s: GameState, actions: Action[]) => actions.reduce((x, a) => dispatch(L07, x, a), s);
const ids = (s: GameState) => s.mistakes.map((m) => m.id);
const perfect = (s: GameState) => {
  const end = play(L07, s, L07.perfectRun(s.tier));
  expect(ids(end)).toEqual([]);
  expect(end.finished?.completed).toBe(true);
  expect(end.finished?.stars).toBe(3);
  expect(end.journal.some((j) => /Barème EP3 : remise en marche 15\/15, réglage pressostat BP 30\/30/.test(j.text))).toBe(true);
  return end;
};
const unlockAndStart = (s: GameState): GameState => run(s, [
  { type: 'checkVoltage' },
  { type: 'toggleCap', target: 'valve.liquid' }, { type: 'toggleCap', target: 'valve.receiver' },
  { type: 'setServiceValve', valve: 'valve.liquid', pos: 'open' }, { type: 'setServiceValve', valve: 'valve.receiver', pos: 'open' },
  { type: 'custom', id: 'call-jury' }, { type: 'unlock' },
  ...(s.tier === 'examen' ? [{ type: 'custom', id: 'heat' } as Action] : []),
  { type: 'setUnit', on: true },
]);

describe('L07', () => {
  it('perfect run → completed with 3 stars (guide)', () => { perfect(start('guide')); });

  it('perfect run → completed with 3 stars (standard): the off-scale KP1 needs a second measured round', () => {
    const end = perfect(start('standard'));
    expect(end.journal.filter((j) => /Relevé Coupure KP1/.test(j.text))).toHaveLength(2);
    expect(end.plant.kp1.range + end.plant.kp1.scaleError).toBeCloseTo(2.6, 6); // scale corrected by +0.3
  });

  [0.05, 0.3, 0.6, 0.95].forEach((x) => {
    it(`perfect run → completed with 3 stars (examen, rng ${x})`, () => {
      const s = start('examen', () => x);
      expect(s.vars.closed).toBe(x < 0.5 ? 'liquid' : 'receiver');
      const j = jury(s);
      expect(j.out).toBeGreaterThanOrEqual(0.3);
      expect(j.in).toBeLessThanOrEqual(3.5);
      expect(j.in - j.out).toBeGreaterThanOrEqual(1);
      const end = perfect(s);
      expect(end.t).toBeLessThan(L07.timeLimit!);
    });
  });

  it('unlock without the jury is refused', () => {
    const s = run(start(), [{ type: 'unlock' }]);
    expect(s.elec.locked).toBe(true);
    expect(s.toast?.text).toMatch(/jury/);
  });

  it('tightening terminals before the VAT → no-consignation-check', () => {
    expect(ids(run(start(), [{ type: 'custom', id: 'terminals' }]))).toEqual(['no-consignation-check']);
  });

  it('starting with the liquid valve still closed → start-valve-closed (critical)', () => {
    const s = run(start('standard'), [{ type: 'custom', id: 'call-jury' }, { type: 'unlock' }, { type: 'setUnit', on: true }]);
    expect(ids(s)).toEqual(['start-valve-closed']);
  });

  it('examen: cold compressor started without heating the crankcase → no-crankcase-wait', () => {
    const s = start('examen', () => 0.3);
    const cold = run(s, [
      { type: 'toggleCap', target: 'valve.liquid' }, { type: 'setServiceValve', valve: 'valve.liquid', pos: 'open' },
      { type: 'custom', id: 'call-jury' }, { type: 'unlock' }, { type: 'setUnit', on: true },
    ]);
    expect(ids(cold)).toEqual(['no-crankcase-wait']);
    expect(ids(unlockAndStart(s))).toEqual([]);
  });

  it('RANGE set to the cut-out value → kp-logic', () => {
    expect(ids(run(start(), [{ type: 'setPressostat', kp: 'kp1', range: 0.5, diff: 1.5 }]))).toEqual(['kp-logic']);
  });

  it('standard: differential left at 0.7 bar with the leaky solenoid → short-cycle', () => {
    let s = unlockAndStart(start('standard'));
    s = run(s, [{ type: 'setPressostat', kp: 'kp1', range: 2.6, diff: 0.7 }, { type: 'wait', seconds: 1200 }]);
    expect(ids(s)).toContain('short-cycle');
    let ok = unlockAndStart(start('standard'));
    ok = run(ok, [{ type: 'setPressostat', kp: 'kp1', range: 2.6, diff: 1.5 }, { type: 'wait', seconds: 1200 }]);
    expect(ok.starts.length).toBeGreaterThan(3); // it does cycle, but slowly
    expect(startsWithin(ok)).toBeLessThanOrEqual(6);
    expect(ids(ok)).toEqual([]);
  });

  it('finishing without measuring the real cut-out / cut-in → unverified', () => {
    const s = run(start(), [{ type: 'setPressostat', kp: 'kp1', range: 2, diff: 1.5 }, { type: 'finish' }]);
    expect(ids(s)).toContain('unverified');
    expect(s.journal.some((j) => /Barème EP3/.test(j.text))).toBe(true);
  });

  it('a measurement taken before re-adjusting the KP1 no longer counts', () => {
    const s = run(start(), [{ type: 'answer', field: 'cutOut', value: 0.5 }, { type: 'setPressostat', kp: 'kp1', diff: 1.5 }]);
    expect(s.answers.cutOut).toBeUndefined();
  });

  it('examen: KP5 cut-out above PS → hp-above-ps ends the exam', () => {
    const s = run(start('examen', () => 0.3), [{ type: 'setPressostat', kp: 'kp5', range: 43 }]);
    expect(ids(s)).toEqual(['hp-above-ps']);
    expect(s.finished?.completed).toBe(false);
  });
});
