import { describe, expect, it } from 'vitest';
import { dispatch, play } from '../game/engine';
import { mulberry32 } from '../learn/quiz';
import type { Action, GameState, Tier } from '../game/types';
import L05, { recoveredRatio } from './L05';

const start = (tier: Tier = 'guide') => L05.setup(tier, mulberry32(7));
const run = (s: GameState, actions: Action[]) => actions.reduce((x, a) => dispatch(L05, x, a), s);
const ids = (s: GameState) => s.mistakes.map((m) => m.id);
const cylIndex = (s: GameState, test: (c: { V: number; bad?: string }) => boolean) =>
  (JSON.parse(s.vars.cyls as string) as { V: number; bad?: string }[]).findIndex(test) + 1;

// connect everything, open the cylinder and run the station on the liquid side
const plumb = (n: number): Action[] => [
  { type: 'custom', id: 'pick', value: n },
  { type: 'toggleCap', target: 'port.liq' },
  { type: 'connectHose', hose: 'red', end: 'port', socket: 'port.liq' },
  { type: 'connectHose', hose: 'yellow', end: 'port', socket: 'rec.in' },
  { type: 'toggleHoseValve', hose: 'yellow' },
  { type: 'connectHose', hose: 'rec', end: 'manifold', socket: 'rec.out' },
  { type: 'connectHose', hose: 'rec', end: 'port', socket: 'cyl.gas' },
  { type: 'cylValve', valve: 'gas' },
  { type: 'toggleManifold', valve: 'hp' },
  { type: 'device', device: 'recovery', on: true },
];

describe('L05', () => {
  for (const tier of ['guide', 'standard', 'examen'] as Tier[]) {
    it(`perfect run → completed with 3 stars, ≥ 98 % recovered (${tier})`, () => {
      const s = play(L05, start(tier), L05.perfectRun(tier));
      expect(ids(s)).toEqual([]);
      expect(s.finished?.completed).toBe(true);
      expect(s.finished?.stars).toBe(3);
      expect(recoveredRatio(s)).toBeGreaterThanOrEqual(0.98);
    });
  }

  it('recovering into the R410A cylinder → mixed-fluids', () => {
    const s0 = start();
    const s = run(s0, [...plumb(cylIndex(s0, (c) => c.bad === 'mixed-fluids')), { type: 'wait', seconds: 30 }]);
    expect(ids(s)).toContain('mixed-fluids');
  });

  it('recovering 1.2 kg into the part-full 2.5 L cylinder → overfill', () => {
    const s0 = start('examen');
    const s = run(s0, [...plumb(cylIndex(s0, (c) => c.V === 2.5)), { type: 'wait', seconds: 120 },
      { type: 'toggleCap', target: 'port.lp' }, { type: 'toggleCap', target: 'valve.gas' },
      { type: 'connectHose', hose: 'blue', end: 'port', socket: 'port.lp' },
      { type: 'setServiceValve', valve: 'valve.gas', pos: 'mid' }, { type: 'toggleManifold', valve: 'lp' },
      { type: 'wait', seconds: 600 }]);
    expect(ids(s)).toContain('overfill');
    expect(s.finished?.completed).toBe(false);
  });

  it('disconnecting right after the cut-off, without checking the pressure rise → stop-too-early', () => {
    const steps = L05.perfectRun('guide');
    const firstStop = steps.findIndex((x) => typeof x !== 'function' && x.type === 'device' && !x.on);
    const s = run(play(L05, start(), steps.slice(0, firstStop + 1)), [{ type: 'disconnectHose', hose: 'red', end: 'port' }]);
    expect(ids(s)).toEqual(['stop-too-early']);
  });
});
