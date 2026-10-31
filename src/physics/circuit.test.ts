import { describe, expect, it } from 'vitest';
import { ATM, type Circuit, type Link } from './types';
import { psat, R } from './refrigerants';
import { flow, makeCircuit, makeVolume, step, totals, volumeState } from './circuit';

const run = (c: Circuit, seconds: number) => {
  for (let i = 0; i < Math.round(seconds / 0.1); i++) step(c, 0.1);
};
const gasMass = (Pbar: number, VL: number, M: number, T = 20) => (Pbar * 1e5 * VL * 1e-3 * M) / (R * (T + 273.15));
const link = (id: string, a: string, b: string, k: number, open = 1, liquidSide?: 'a' | 'b'): Link => ({ id, a, b, k, open, liquidSide });

export function platineLikeCircuit(): Circuit {
  return makeCircuit(
    'R32',
    [
      makeVolume('hp', 1.5, { mRef: 0.7 }),
      makeVolume('lp', 2, { mRef: 0.5 }),
      makeVolume('hoseHP', 0.1),
      makeVolume('hoseLP', 0.1),
      makeVolume('hoseY', 0.1),
      makeVolume('manifold', 0.05),
      makeVolume('bottle', 12, { mRef: 2 }),
    ],
    [
      link('system', 'hp', 'lp', 2e-5),
      link('schraderHP', 'hp', 'hoseHP', 4e-4, 1, 'a'),
      link('schraderLP', 'lp', 'hoseLP', 4e-4),
      link('vHP', 'hoseHP', 'manifold', 4e-4, 0),
      link('vLP', 'hoseLP', 'manifold', 4e-4, 0),
      link('vY', 'manifold', 'hoseY', 4e-4, 0),
      link('bottleValve', 'bottle', 'hoseY', 4e-4, 0, 'a'),
      link('leak', 'lp', ATM, 1e-7),
    ],
    [
      { kind: 'transfer', id: 'recovery', from: 'hoseY', to: 'bottle', on: false, speed: 0.5, cutoff: 0.3 },
      { kind: 'vacuumPump', id: 'pump', at: 'hoseY', on: false, speed: 3.4, ultimate: 5e-5 },
    ],
  );
}

describe('circuit', () => {
  it('two-phase pressure equals psat', () => {
    const c = makeCircuit('R32', [makeVolume('v', 1, { mRef: 0.5 })]);
    const s = volumeState(c, 'v');
    expect(s.phase).toBe('twoPhase');
    expect(Math.abs(s.P - psat('R32', 20))).toBeLessThan(0.05);
  });

  it('superheated below saturation mass', () => {
    const c = makeCircuit('R32', [makeVolume('v', 10, { mRef: 0.05 })]);
    const s = volumeState(c, 'v');
    expect(s.phase).toBe('vapour');
    expect(s.P).toBeLessThan(psat('R32', 20));
    expect(s.P).toBeGreaterThan(1);
  });

  it('liquid full spikes pressure', () => {
    const c = makeCircuit('R32', [makeVolume('v', 1, { mRef: 0.95, Tdrive: 45 })]);
    run(c, 600);
    const s = volumeState(c, 'v');
    expect(s.phase).toBe('liquidFull');
    expect(s.P).toBeGreaterThan(psat('R32', 45) + 5);
  });

  it('dalton adds nitrogen', () => {
    const c = makeCircuit('R32', [makeVolume('v', 1, { mRef: 0.5, mN2: 0.01 })]);
    const s = volumeState(c, 'v');
    expect(s.P).toBeGreaterThan(psat('R32', 20) + 0.5);
    expect(s.PN2).toBeGreaterThan(0.5);
  });

  it('conserves mass', () => {
    const c = makeCircuit(
      'R32',
      [makeVolume('a', 1, { mRef: 0.6, mN2: 0.002, mAir: 0.001, mH2O: 0.0005, T: 30 }), makeVolume('b', 3, { mRef: 0.01 })],
      [link('l', 'a', 'b', 3e-4, 1, 'a')],
    );
    const before = totals(c);
    expect(flow(c, c.links[0]).ref).toBeGreaterThan(0);
    run(c, 600);
    const after = totals(c);
    for (const k of ['ref', 'n2', 'air', 'h2o'] as const) expect(Math.abs(after[k] - before[k])).toBeLessThan(1e-9);
    expect(c.volumes.b.mRef).toBeGreaterThan(0.1);
  });

  it('equalises pressure', () => {
    const c = makeCircuit(
      'R32',
      [makeVolume('a', 1, { mN2: gasMass(8, 1, 0.028013) }), makeVolume('b', 1)],
      [link('l', 'a', 'b', 1e-4)],
    );
    expect(volumeState(c, 'a').P).toBeCloseTo(8, 2);
    run(c, 300);
    expect(Math.abs(volumeState(c, 'a').P - volumeState(c, 'b').P)).toBeLessThan(0.01);
  });

  it('vacuum pump plateaus on moisture', () => {
    const c = makeCircuit(
      'R32',
      [makeVolume('v', 5, { mAir: gasMass(1, 5, 0.02896), mH2O: 0.005 })],
      [],
      [{ kind: 'vacuumPump', id: 'p', at: 'v', on: true, speed: 3.4, ultimate: 5e-5 }],
    );
    run(c, 120);
    let s = volumeState(c, 'v');
    expect(s.waterLiquid).toBeGreaterThan(0);
    expect(s.P).toBeGreaterThanOrEqual(0.015);
    expect(s.P).toBeLessThanOrEqual(0.03);
    for (let t = 0; t < 3600 && volumeState(c, 'v').waterLiquid > 0; t += 10) run(c, 10);
    run(c, 120);
    s = volumeState(c, 'v');
    expect(s.waterLiquid).toBe(0);
    expect(s.P).toBeLessThan(0.002);
    expect(c.emitted.h2o).toBeCloseTo(0.005, 4);
  });

  it('leak to ATM counts emission', () => {
    const c = makeCircuit('R32', [makeVolume('v', 1, { mRef: 0.5 })], [link('leak', 'v', ATM, 1e-5)]);
    run(c, 60);
    expect(c.emitted.ref).toBeGreaterThan(0);
    expect(totals(c).ref + c.emitted.ref).toBeCloseTo(0.5, 9);
  });

  it('transfer stops at cutoff', () => {
    const c = makeCircuit(
      'R32',
      [makeVolume('src', 2, { mRef: 1.2 }), makeVolume('cyl', 12, { mRef: 1 })],
      [],
      [{ kind: 'transfer', id: 'rec', from: 'src', to: 'cyl', on: true, speed: 0.4, cutoff: 0.3 }],
    );
    run(c, 1800);
    expect(volumeState(c, 'src').P).toBeLessThanOrEqual(0.35);
    expect(totals(c).ref).toBeCloseTo(2.2, 9);
    expect(c.emitted.ref).toBe(0);
  });

  it('n2 source pushes to setpoint', () => {
    const c = makeCircuit('R32', [makeVolume('v', 2)], [], [{ kind: 'n2', id: 'n', at: 'v', open: true, setpoint: 11, k: 1e-4 }]);
    run(c, 120);
    const P = volumeState(c, 'v').P;
    expect(P).toBeGreaterThan(10.9);
    expect(P).toBeLessThanOrEqual(11 + 1e-9);
  });

  it('stays finite at x60 for 1 h', () => {
    const c = platineLikeCircuit();
    const L = (id: string) => c.links.find((l) => l.id === id)!;
    const D = (id: string) => c.devices.find((d) => d.id === id)!;
    const check = () => {
      for (const v of Object.values(c.volumes)) {
        for (const x of [v.T, v.mRef, v.mN2, v.mAir, v.mH2O]) expect(Number.isFinite(x)).toBe(true);
        expect(Math.min(v.mRef, v.mN2, v.mAir, v.mH2O)).toBeGreaterThanOrEqual(0);
        const s = volumeState(c, v.id);
        expect(Number.isFinite(s.P) && s.P >= 0).toBe(true);
      }
    };
    for (let i = 0; i < 36000; i++) {
      const t = i / 10;
      if (t === 300) (L('vHP').open = 1), (L('vLP').open = 1);
      if (t === 900) (L('vY').open = 1), ((D('recovery') as { on: boolean }).on = true);
      if (t === 2000) ((D('recovery') as { on: boolean }).on = false), ((D('pump') as { on: boolean }).on = true);
      if (t === 2800) ((D('pump') as { on: boolean }).on = false), (L('vY').open = 0.5), (L('bottleValve').open = 1);
      step(c, 0.1);
      if (i % 600 === 0) check();
    }
    check();
  }, 30_000);
});
