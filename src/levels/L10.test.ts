import { describe, expect, it } from 'vitest';
import { dispatch, play } from '../game/engine';
import { mulberry32 } from '../learn/quiz';
import type { Action, GameState, Tier } from '../game/types';
import L10, { variant } from './L10';

const start = (tier: Tier = 'guide', seed = 7) => L10.setup(tier, mulberry32(seed));
const run = (s: GameState, actions: Action[]) => actions.reduce((x, a) => dispatch(L10, x, a), s);
const ids = (s: GameState) => s.mistakes.map((m) => m.id);
const seedFor = (v: string) => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].find((n) => variant(start('examen', n)) === v)!;
// perfect run up to (excluding) the first step matching `stop`, evaluating conditional steps
const until = (tier: Tier, seed: number, stop: (a: Action) => boolean) => {
  let s = start(tier, seed);
  for (const x of L10.perfectRun(tier)) {
    const a = typeof x === 'function' ? x(s) : x;
    if (stop(a)) return s;
    s = dispatch(L10, s, a);
  }
  throw new Error('step not found');
};
const consign: Action[] = [{ type: 'lockout' }, { type: 'checkVoltage' }];

describe('L10', () => {
  const cases: [Tier, number, string][] = [
    ['guide', 7, 'dead'], ['standard', 7, 'burnt'], ['examen', seedFor('burnt'), 'burnt'], ['examen', seedFor('contactor'), 'contactor'],
  ];
  for (const [tier, seed, v] of cases) {
    it(`perfect run → completed with 3 stars (${tier}, ${v})`, () => {
      const s0 = start(tier, seed);
      expect(variant(s0)).toBe(v);
      const s = play(L10, s0, L10.perfectRun(tier));
      expect(ids(s)).toEqual([]);
      expect(s.finished?.completed).toBe(true);
      expect(s.finished?.stars).toBe(3);
      if (v !== 'contactor') expect(s.vars.acidNeg).toBe(true);
    });
  }

  it('measuring the windings before the lockout → no-lockout (ends an exam)', () => {
    const s = run(start('examen', seedFor('contactor')), [{ type: 'custom', id: 'ohm' }]);
    expect(ids(s)).toEqual(['no-lockout']);
    expect(s.finished?.completed).toBe(false);
  });

  it('starting the recovery when the fault is the contactor → no-electrical-check', () => {
    const s = run(start('examen', seedFor('contactor')), [...consign, { type: 'custom', id: 'ohm' }, { type: 'custom', id: 'insul' },
      { type: 'custom', id: 'cyl-clean' }, { type: 'device', device: 'recovery', on: true }]);
    expect(ids(s)).toEqual(['no-electrical-check']);
  });

  it('acid refrigerant recovered into the clean cylinder → contaminated-mix', () => {
    const s0 = until('standard', 7, (a) => a.type === 'custom' && a.id === 'cyl-dirty');
    const s = run(s0, [
      { type: 'custom', id: 'cyl-clean' },
      { type: 'toggleCap', target: 'port.liq' },
      { type: 'connectHose', hose: 'red', end: 'port', socket: 'port.liq' },
      { type: 'connectHose', hose: 'yellow', end: 'port', socket: 'rec.in' },
      { type: 'toggleHoseValve', hose: 'yellow' },
      { type: 'connectHose', hose: 'rec', end: 'manifold', socket: 'rec.out' },
      { type: 'connectHose', hose: 'rec', end: 'port', socket: 'cyl.gas' },
      { type: 'cylValve', valve: 'gas' },
      { type: 'toggleManifold', valve: 'hp' },
      { type: 'device', device: 'recovery', on: true },
      { type: 'wait', seconds: 30 },
    ]);
    expect(ids(s)).toEqual(['contaminated-mix']);
  });

  it('oil poured in the sink → oil-in-sink', () => {
    const s = dispatch(L10, until('guide', 7, (a) => a.type === 'custom' && a.id === 'drain-waste'), { type: 'custom', id: 'drain-sink' });
    expect(ids(s)).toEqual(['oil-in-sink']);
    expect(s.done).toContain('remove'); // penalised, but the level stays finishable
  });

  it('mounting the mineral-oil compressor delivered in the exam → wrong-oil', () => {
    const s = dispatch(L10, until('examen', seedFor('burnt'), (a) => a.type === 'custom' && a.id === 'swap-new'), { type: 'custom', id: 'mount' });
    expect(ids(s)).toEqual(['wrong-oil']);
  });

  it('restarting a burnt unit without burn-out filter → no-burnout-filter, acid still positive at 48 h', () => {
    let s = start('standard');
    for (const x of L10.perfectRun('standard')) {
      const a = typeof x === 'function' ? x(s) : x;
      if (a.type === 'custom' && a.id === 'burnout') continue;
      s = dispatch(L10, s, a);
      if (a.type === 'custom' && a.id === 'retest') break;
    }
    expect(ids(s)).toEqual(['no-burnout-filter']);
    expect(s.vars.acidNeg).toBe(false);
  });
});
