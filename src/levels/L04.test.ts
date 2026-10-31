import { describe, expect, it } from 'vitest';
import { dispatch } from '../game/engine';
import { mulberry32 } from '../learn/quiz';
import type { Action, GameState, Tier } from '../game/types';
import L04, { circ, variant } from './L04';

const start = (tier: Tier = 'guide', rng = mulberry32(7)) => L04.setup(tier, rng);
const run = (s: GameState, actions: Action[]) => actions.reduce((x, a) => dispatch(L04, x, a), s);
const ids = (s: GameState) => s.mistakes.map((m) => m.id);
// plays the perfect run, noting the circuit pressure (mbar) at each verdict
const perfect = (s: GameState) => {
  const at: number[] = [];
  let end = s;
  for (const st of L04.perfectRun(s.tier)) {
    const a = typeof st === 'function' ? st(end) : st;
    if (a.type === 'answer') at.push(circ(end) * 1000);
    end = dispatch(L04, end, a);
  }
  expect(ids(end)).toEqual([]);
  expect(end.finished?.completed).toBe(true);
  expect(end.finished?.stars).toBe(3);
  if (s.tier === 'examen') expect(end.t).toBeLessThan(L04.timeLimit!);
  return { end, at };
};

// board vented, both sides open, pump on mf.vac with the gauge on the circuit, pump off
const ready = (s0: GameState) => run(s0, [
  { type: 'toggleCap', target: 'port.lp' }, { type: 'toggleCap', target: 'port.hp' }, { type: 'toggleCap', target: 'valve.gas' },
  { type: 'connectHose', hose: 'blue', end: 'port', socket: 'port.lp' },
  { type: 'connectHose', hose: 'red', end: 'port', socket: 'port.hp' },
  { type: 'setServiceValve', valve: 'valve.gas', pos: 'mid' },
  { type: 'connectHose', hose: 'vac', end: 'manifold', socket: 'mf.vac' },
  { type: 'toggleManifold', valve: 'lp' }, { type: 'toggleManifold', valve: 'hp' }, { type: 'toggleManifold', valve: 'vac' },
  { type: 'wait', seconds: 400 },
  { type: 'connectHose', hose: 'vac', end: 'port', socket: 'pump' },
  { type: 'toggleSolenoid' },
  { type: 'custom', id: 'gauge-circuit' },
]);
let cache: GameState | undefined;
// examen, dry circuit pulled below 2 mbar, pump still running and linked
const pulled = () => (cache ??= run(ready(start('examen', () => 0.1)), [{ type: 'device', device: 'pump', on: true }, { type: 'wait', seconds: 600 }]));

describe('L04', () => {
  it('perfect run → completed with 3 stars (guide), holds below 2 mbar', () => {
    const { at } = perfect(start('guide'));
    expect(at).toHaveLength(1);
    expect(at[0]).toBeLessThan(2);
  });

  it('perfect run → completed with 3 stars (standard): plateau near pWater → humidité, then OK', () => {
    const { end, at } = perfect(start('standard'));
    expect(at[0]).toBeGreaterThan(18);
    expect(at[1]).toBeLessThan(2);
    expect(end.answers.verdict.value).toBe(0);
  }, 10000);

  ['dry', 'wet', 'leak', 'pump'].forEach((v, i) => {
    it(`perfect run → completed with 3 stars (examen, ${v})`, () => {
      const s = start('examen', () => (i + 0.5) / 4);
      expect(variant(s)).toBe(v);
      const { end } = perfect(s);
      expect(end.answers.verdict.value).toBe(v === 'leak' ? 2 : v === 'pump' ? 3 : 0);
    }, 10000);
  });

  it('switching the unit on under vacuum is critical and ends an exam', () => {
    const end = run(pulled(), [{ type: 'setUnit', on: true }]);
    expect(ids(end)).toContain('compressor-under-vacuum');
    expect(end.finished?.completed).toBe(false);
  }, 10000);

  it('stopping the pump before isolating it → stop-before-isolate', () => {
    expect(ids(run(pulled(), [{ type: 'device', device: 'pump', on: false }]))).toContain('stop-before-isolate');
  }, 10000);

  it('wrong hold verdict → wrong-verdict', () => {
    const s = run(pulled(), [
      { type: 'toggleManifold', valve: 'vac' }, { type: 'device', device: 'pump', on: false }, { type: 'wait', seconds: 600 },
      { type: 'answer', field: 'verdict', value: 2 },
    ]);
    expect(ids(s)).toEqual(['wrong-verdict']);
  }, 10000);

  it('verdict without a standing test → skip-hold; pump on 8 bar → pump-on-pressure', () => {
    expect(ids(run(pulled(), [{ type: 'answer', field: 'verdict', value: 0 }]))).toContain('skip-hold');
    const s = run(start(), [
      { type: 'toggleCap', target: 'port.lp' }, { type: 'toggleCap', target: 'valve.gas' },
      { type: 'connectHose', hose: 'blue', end: 'port', socket: 'port.lp' },
      { type: 'setServiceValve', valve: 'valve.gas', pos: 'mid' },
      { type: 'connectHose', hose: 'vac', end: 'manifold', socket: 'mf.vac' },
      { type: 'connectHose', hose: 'vac', end: 'port', socket: 'pump' },
      { type: 'toggleManifold', valve: 'lp' }, { type: 'toggleManifold', valve: 'vac' },
      { type: 'device', device: 'pump', on: true }, { type: 'wait', seconds: 5 },
    ]);
    expect(ids(s)).toEqual(expect.arrayContaining(['pump-on-pressure', 'one-side-only']));
  });
});
