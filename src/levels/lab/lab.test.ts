import { describe, expect, it } from 'vitest';
import { psat, pWater } from '../../physics/refrigerants';
import { EXPERIMENTS, EXP, addN2, inject, makeBench, run, stateOf, tick, vol, type Bench, type Experiment, type Mem } from './experiments';

const valid = (b: Bench) => {
  for (const id of ['A', 'B'] as const) {
    const v = vol(b, id), s = stateOf(b, id);
    expect(Number.isFinite(s.P) && s.P >= 0).toBe(true);
    expect(v.mRef >= 0 && v.mN2 >= 0 && v.mAir >= 0 && v.mH2O >= 0).toBe(true);
  }
};

// Ticks until the experiment's condition holds, checking every simulated second like the UI does.
function play(e: Experiment, b: Bench, mem: Mem, seconds: number) {
  for (let t = 0; t < seconds; t++) {
    run(b, 1);
    valid(b);
    if (e.check(b, mem)) return t + 1;
  }
  return -1;
}

describe('lab experiments', () => {
  for (const e of EXPERIMENTS) {
    it(`${e.id} completes after the documented action`, () => {
      const b = e.setup(), mem: Mem = {};
      valid(b);
      expect(play(e, b, mem, 10)).toBe(-1);
      const { actions, seconds } = e.demo;
      actions.forEach((act, i) => {
        act(b);
        if (i < actions.length - 1) expect(play(e, b, mem, 1)).toBe(-1);
      });
      expect(play(e, b, mem, seconds)).toBeGreaterThan(0);
    });
  }

  it('E1: two masses give the same pressure at the same temperature', () => {
    const b = EXP.E1.setup();
    run(b, 5);
    const a = stateOf(b, 'A'), bb = stateOf(b, 'B');
    expect(vol(b, 'B').mRef / vol(b, 'A').mRef).toBeCloseTo(4);
    expect(Math.abs(a.P - bb.P)).toBeLessThan(0.05);
    expect(a.P).toBeCloseTo(psat('R32', 20), 1);
  });

  it('E7: nitrogen adds pressure above psat', () => {
    const b = makeBench({ A: { V: 5, mRef: 1 } });
    const p0 = stateOf(b, 'A').P;
    addN2(b, 'A', 0.005);
    tick(b);
    expect(stateOf(b, 'A').P - p0).toBeGreaterThan(0.8);
  });

  it('E8: vacuum with water plateaus near pWater(T)', () => {
    const b = EXP.E8.setup();
    EXP.E8.demo.actions[0](b);
    run(b, 60);
    const s = stateOf(b, 'A');
    expect(s.waterLiquid).toBeGreaterThan(0);
    expect(s.P * 1000).toBeCloseTo(pWater(20) * 1000, 0);
    run(b, 900);
    expect(stateOf(b, 'A').P).toBeLessThan(0.002);
  });

  it('E6: drawing liquid keeps the blend, drawing vapour shifts it', () => {
    const b = EXP.E6.setup(), x0 = b.blend;
    inject(b, 'A', -0.2, 'liquid');
    expect(b.blend).toBe(x0);
    inject(b, 'A', -0.2, 'gas');
    expect(b.blend).toBeLessThan(x0 - 0.02);
  });

  it('E4: overfill spikes far above psat', () => {
    const b = EXP.E4.setup();
    EXP.E4.demo.actions[0](b);
    run(b, 900);
    expect(stateOf(b, 'A').phase).toBe('liquidFull');
    expect(stateOf(b, 'A').P).toBeGreaterThan(psat('R32', vol(b, 'A').T) + 5);
  });
});
