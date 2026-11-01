import { describe, expect, it } from 'vitest';
import { dispatch, emittedG, play } from '../game/engine';
import { mulberry32 } from '../learn/quiz';
import type { Action, Tier } from '../game/types';
import L02 from './L02';

const start = (tier: Tier = 'guide', seed = 7) => L02.setup(tier, mulberry32(seed));
const run = (s: ReturnType<typeof start>, actions: Action[]) => actions.reduce((x, a) => dispatch(L02, x, a), s);
const ids = (s: ReturnType<typeof start>) => s.mistakes.map((m) => m.id);
const perfect = (tier: Tier, seed = 7) => {
  const s = play(L02, start(tier, seed), L02.perfectRun(tier));
  expect(ids(s)).toEqual([]);
  expect(s.finished?.completed).toBe(true);
  expect(s.finished?.stars).toBe(3);
  expect(emittedG(s)).toBeLessThan(5);
  return s;
};

describe('L02', () => {
  for (const tier of ['guide', 'standard', 'examen'] as Tier[]) {
    it(`perfect run → completed with 3 stars (${tier})`, () => { perfect(tier); });
  }

  it('exam perfect run covers 0, 1 and 2 leaks', () => {
    const counts = new Set<number>();
    for (let seed = 1; seed <= 12; seed++) counts.add(perfect('examen', seed).leaks.length);
    expect([...counts].sort()).toEqual([0, 1, 2]);
  });

  it('leak drains the charge slowly', () => {
    const s0 = start();
    const s = run(s0, [{ type: 'wait', seconds: 600 }]);
    expect(s.cycle!.sightGlass).toBe('bulles');
    expect(s.circuit.emitted.ref).toBeGreaterThan(0);
    expect(emittedG(s)).toBe(0); // the diagnosed leak is not billed to the player
  });

  it('wrong answer to the frequency question → wrong-frequency', () => {
    const s = run(start(), [{ type: 'custom', id: 'registre' }, { type: 'answer', field: 'freq', value: 2 }]);
    expect(ids(s)).toEqual(['wrong-frequency']);
  });

  it('detector before the reference-leak check → detector-uncalibrated', () => {
    const s = run(start(), [{ type: 'custom', id: 'registre' }, { type: 'measure', tool: 'detector', target: 'joint.txvIn' }]);
    expect(ids(s)).toEqual(['detector-uncalibrated']);
  });

  it('fast sweep → sweep-too-fast', () => {
    const s = run(start(), [
      { type: 'custom', id: 'registre' }, { type: 'custom', id: 'calib' },
      { type: 'measure', tool: 'detector', target: 'joint.txvIn' },
      { type: 'wait', seconds: 1 },
      { type: 'measure', tool: 'detector', target: 'joint.txvOut' },
    ]);
    expect(ids(s)).toEqual(['sweep-too-fast']);
  });

  it('declaring the detector false positive without soap → unconfirmed only', () => {
    const s = run(start('standard'), [{ type: 'answer', field: 'leak1', value: 1 /* joint.compSuction */ }]);
    expect(ids(s)).toEqual(['unconfirmed']);
  });

  it('declaring the soaped false positive → false-declaration', () => {
    const s = run(start('standard'), [
      { type: 'measure', tool: 'soap', target: 'joint.compSuction' },
      { type: 'answer', field: 'leak1', value: 1 /* joint.compSuction */ },
    ]);
    expect(ids(s)).toContain('false-declaration');
    expect(ids(s)).not.toContain('unconfirmed');
  });

  it('R1234yf equipment: thresholds in kg (2024/573), not in t CO₂e', () => {
    const s = start('examen');
    Object.assign(s.vars, { eqFluid: 'R1234yf', eqKg: 25, eqLDS: false, eqHerm: false });
    expect(run(s, [{ type: 'answer', field: 'freq', value: 2 /* 6 mois */ }]).answers.freq.ok).toBe(true);
  });

  it('false positive: detector alarms, soap shows no bubbles', () => {
    const s = run(start('standard'), [
      { type: 'custom', id: 'registre' }, { type: 'custom', id: 'calib' },
      { type: 'measure', tool: 'detector', target: 'joint.compSuction' }, { type: 'wait', seconds: 6 },
    ]);
    expect(L02.measure!(s, { tool: 'detector', target: 'joint.compSuction' })!.value).toBeGreaterThan(3);
    expect(L02.measure!(s, { tool: 'soap', target: 'joint.compSuction' })!.value).toBe(0);
  });

  it('finish without the record → no-record', () => {
    const steps = L02.perfectRun('guide').filter((st) => typeof st === 'function' || !(st.type === 'custom' && st.id === 'record'));
    const s = play(L02, start(), steps);
    expect(ids(s)).toEqual(['no-record']);
    expect(s.finished?.completed).toBe(false);
  });

  it('connecting a hose → needless-connect', () => {
    const s = run(start(), [{ type: 'toggleCap', target: 'port.lp' }, { type: 'connectHose', hose: 'blue', end: 'port', socket: 'port.lp' }]);
    expect(ids(s)).toEqual(['needless-connect']);
  });
});
