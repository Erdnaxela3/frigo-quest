import { describe, expect, it } from 'vitest';
import { dispatch, emittedG, play } from '../game/engine';
import { mulberry32 } from '../learn/quiz';
import { liquidIntoSuction, systemRef } from '../game/platineModel';
import type { Action, GameState, Step, Tier } from '../game/types';
import L06, { charged, target } from './L06';

const start = (tier: Tier = 'guide', seed = 7) => L06.setup(tier, mulberry32(seed));
const run = (s: GameState, actions: Action[]) => actions.reduce((x, a) => dispatch(L06, x, a), s);
const ids = (s: GameState) => s.mistakes.map((m) => m.id);
const steps = L06.perfectRun('guide');
const throttled = (xs: Step[]) => xs.slice(0, xs.findIndex((st) => typeof st !== 'function' && st.type === 'setManifoldOpening') + 1);
const without = (type: Action['type'], id?: string) => steps.filter((st) => typeof st === 'function' || st.type !== type || (id && (st as { id?: string }).id !== id));
/** Guide run up to the start of the throttled BP charge (unit running, ≈ 0.6 kg in). */
const charging = () => play(L06, start(), throttled(steps));
const waitWhile = (s: GameState, p: (s: GameState) => boolean) => {
  for (let i = 0; i < 100 && p(s); i++) s = run(s, [{ type: 'wait', seconds: 10 }]);
  return s;
};

describe('L06', () => {
  const cases: [Tier, number][] = [['guide', 7], ['standard', 7], ['examen', 4], ['examen', 8]];
  for (const [tier, seed] of cases) {
    it(`perfect run → completed with 3 stars (${tier}, seed ${seed})`, () => {
      let s = start(tier, seed), maxSlug = 0;
      for (const st of L06.perfectRun(tier)) {
        s = dispatch(L06, s, typeof st === 'function' ? st(s) : st);
        maxSlug = Math.max(maxSlug, liquidIntoSuction(s));
      }
      expect(ids(s)).toEqual([]);
      expect(s.finished?.completed).toBe(true);
      expect(s.finished?.stars).toBe(3);
      expect(Math.abs(systemRef(s) - target(s))).toBeLessThan(0.02 * target(s));
      expect(maxSlug).toBeLessThan(6);
      expect(emittedG(s)).toBeLessThan(10);
    });
  }

  it('examen variants: random line length and cylinder dip tube', () => {
    expect([start('examen', 4).vars.dipTube, start('examen', 8).vars.dipTube]).toEqual([true, false]);
    expect(target(start('examen', 4))).toBeCloseTo(1.45, 3);
    expect(target(start('standard'))).toBeCloseTo(1.29, 3);
  });

  it('manifold BP wide open while charging liquid → liquid-slug (critical, fails an exam)', () => {
    const s = run(charging(), [{ type: 'setManifoldOpening', valve: 'lp', opening: 1 }, { type: 'wait', seconds: 20 }]);
    expect(ids(s)).toContain('liquid-slug');
    const ex = play(L06, start('examen', 4), throttled(L06.perfectRun('examen')));
    expect(ex.running).toBe(true);
    const f = run(ex, [{ type: 'setManifoldOpening', valve: 'lp', opening: 1 }, { type: 'wait', seconds: 20 }]);
    expect(f.finished?.completed).toBe(false);
  });

  it('R410A cylinder put on the scale and charged → wrong-fluid', () => {
    const s = run(start(), [
      { type: 'custom', id: 'pick', value: 2 },
      { type: 'connectHose', hose: 'yellow', end: 'port', socket: 'cyl.liq' }, { type: 'toggleHoseValve', hose: 'yellow' },
      { type: 'cylValve', valve: 'liq' }, { type: 'custom', id: 'purge' }, { type: 'tareScale' },
      { type: 'toggleManifold', valve: 'hp' }, { type: 'wait', seconds: 5 },
    ]);
    expect(ids(s)).toEqual(['wrong-fluid']);
  });

  it('charging past the target → overcharge', () => {
    const s = run(waitWhile(charging(), (x) => charged(x) < 1.4), [{ type: 'custom', id: 'record', value: 1.4 }, { type: 'finish' }]);
    expect(ids(s)).toContain('overcharge');
  });

  it('stopping early without weighing → undercharge and charge-by-pressure', () => {
    const s = run(charging(), [{ type: 'wait', seconds: 30 }, { type: 'finish' }]);
    expect(ids(s)).toEqual(expect.arrayContaining(['undercharge', 'charge-by-pressure']));
  });

  it('no tare before charging → no-tare', () => {
    const s = play(L06, start(), without('tareScale'));
    expect(ids(s)).toEqual(['no-tare']);
  });

  it('opening the manifold before purging the yellow hose → no-purge', () => {
    const s = play(L06, start(), without('custom', 'purge'));
    expect(ids(s)).toContain('no-purge');
  });

  it('red hose disconnected full of liquid → vent-hose', () => {
    const s = run(charging(), [{ type: 'disconnectHose', hose: 'red', end: 'port' }]);
    expect(ids(s)).toContain('vent-hose');
  });

  it('R407C after a leak: topping up → topping-blend, in vapour → also vapour-charge-blend', () => {
    expect(ids(run(start('examen'), [{ type: 'answer', field: 'r407c', value: 3 }]))).toEqual(['topping-blend']);
    expect(ids(run(start('examen'), [{ type: 'answer', field: 'r407c', value: 0 }]))).toEqual(['topping-blend', 'vapour-charge-blend']);
  });
});
