import { describe, expect, it } from 'vitest';
import { boxStep, kpCutIn, kpCutOut, pressostatAllows, relax, standstillPressure, steadyState } from './cycle';
import { psat, toRel } from './refrigerants';
import { NO_FAULTS, type CycleInput, type Faults, type Pressostat } from './types';

const base: CycleInput = { fluid: 'R32', Tamb: 30, Troom: 25, txvSH: 5, faults: NO_FAULTS, dTevapNominal: 15, dTcondNominal: 12 };
const nom = steadyState(base);
const run = (f: Partial<Faults>) => steadyState({ ...base, faults: { ...NO_FAULTS, ...f } });

describe('steadyState', () => {
  it('nominal point plausible', () => {
    expect(nom.BP).toBeCloseTo(psat('R32', 10), 0);
    expect(Math.abs(nom.BP - 11)).toBeLessThan(1);
    expect(Math.abs(nom.HP - 26)).toBeLessThan(1);
    expect(Math.abs(nom.SH - 7)).toBeLessThan(2);
    expect(Math.abs(nom.SC - 5)).toBeLessThan(2);
    expect(nom.Tdischarge).toBeGreaterThan(65);
    expect(nom.Tdischarge).toBeLessThan(85);
    expect(Math.abs(nom.current - 4.5)).toBeLessThan(0.3);
    expect(nom.capacityKW).toBeGreaterThan(2.5);
    expect(nom.capacityKW).toBeLessThan(4.5);
    expect(nom.COP).toBeGreaterThan(2.5);
    expect(nom.sightGlass).toBe('clair');
    expect(nom.floodBack).toBe(false);
    expect(nom.filterDT).toBeLessThan(0.5);
  });

  it('cold room R449A plausible', () => {
    const c = steadyState({ fluid: 'R449A', Tamb: 30, Troom: 2, txvSH: 5, faults: NO_FAULTS });
    expect(c.BP).toBeGreaterThan(3);
    expect(c.BP).toBeLessThan(4.5);
    expect(c.HP).toBeGreaterThan(16);
    expect(c.HP).toBeLessThan(21);
    expect(c.Tdischarge).toBeGreaterThan(80);
    expect(c.Tdischarge).toBeLessThan(115);
    expect(c.COP).toBeGreaterThan(1.5);
    expect(c.COP).toBeLessThan(nom.COP);
  });

  it('undercharge', () => {
    const o = run({ chargeRatio: 0.6 });
    expect(o.BP).toBeLessThan(nom.BP);
    expect(o.HP).toBeLessThan(nom.HP);
    expect(o.SH).toBeGreaterThan(nom.SH + 5);
    expect(o.SC).toBeLessThan(1);
    expect(o.sightGlass).toBe('mousse');
    expect(run({ chargeRatio: 0.85 }).sightGlass).toBe('bulles');
  });

  it('overcharge', () => {
    const o = run({ chargeRatio: 1.3 });
    expect(o.BP).toBeGreaterThan(nom.BP);
    expect(o.HP).toBeGreaterThan(nom.HP + 2);
    expect(o.SH).toBeLessThan(nom.SH);
    expect(o.SC).toBeGreaterThan(nom.SC + 4);
    expect(o.current).toBeGreaterThan(nom.current);
  });

  it('non-condensables', () => {
    const o = run({ nonCondBar: 2 });
    expect(o.BP).toBeGreaterThanOrEqual(nom.BP - 0.05);
    expect(o.HP).toBeGreaterThan(nom.HP + 1.5);
    expect(Math.abs(o.SH - nom.SH)).toBeLessThan(1);
    expect(o.SC).toBeGreaterThanOrEqual(nom.SC - 0.1);
  });

  it('condenser fouled / fan off', () => {
    for (const o of [run({ condFouling: 1 }), run({ condFanOk: false })]) {
      expect(o.BP).toBeGreaterThan(nom.BP);
      expect(o.HP).toBeGreaterThan(nom.HP + 3);
      expect(Math.abs(o.SH - nom.SH)).toBeLessThan(1.5);
      expect(Math.abs(o.SC - nom.SC)).toBeLessThan(1.5);
      expect(o.Tdischarge).toBeGreaterThan(nom.Tdischarge + 5);
    }
  });

  it('evaporator iced / fan off', () => {
    for (const o of [run({ evapFrost: 1 }), run({ evapFanOk: false })]) {
      expect(o.BP).toBeLessThan(nom.BP - 2);
      expect(o.HP).toBeLessThan(nom.HP);
      expect(o.SH).toBeLessThan(nom.SH - 3);
      expect(Math.abs(o.SC - nom.SC)).toBeLessThan(1.5);
    }
    expect(run({ evapFrost: 1, evapFanOk: false }).floodBack).toBe(true);
  });

  it('filter drier clogged', () => {
    const o = run({ filterRestriction: 0.7 });
    expect(o.BP).toBeLessThan(nom.BP);
    expect(o.HP).toBeLessThanOrEqual(nom.HP + 0.1);
    expect(o.SH).toBeGreaterThan(nom.SH + 5);
    expect(o.SC).toBeGreaterThan(nom.SC);
    expect(o.filterDT).toBeGreaterThan(2);
    expect(run({ filterRestriction: 0.5 }).filterDT).toBeGreaterThan(2);
    expect(o.sightGlass).toBe('bulles');
  });

  it('txv too open', () => {
    const o = run({ txv: 'tooOpen' });
    expect(o.BP).toBeGreaterThan(nom.BP);
    expect(Math.abs(o.HP - nom.HP)).toBeLessThan(1.5);
    expect(o.SH).toBeLessThan(1);
    expect(o.floodBack).toBe(true);
    expect(o.SC).toBeLessThan(nom.SC);
  });

  it('txv too closed / bulb lost charge', () => {
    for (const o of [run({ txv: 'tooClosed' }), run({ txv: 'bulbLost' })]) {
      expect(o.BP).toBeLessThan(nom.BP - 1.5);
      expect(o.HP).toBeLessThan(nom.HP);
      expect(o.SH).toBeGreaterThan(nom.SH + 5);
      expect(o.SC).toBeGreaterThan(nom.SC);
    }
  });

  it('compressor inefficient', () => {
    const o = run({ compEff: 0.5 });
    expect(o.BP).toBeGreaterThan(nom.BP);
    expect(o.HP).toBeLessThan(nom.HP);
    expect(o.SH).toBeGreaterThan(nom.SH);
    expect(Math.abs(o.SC - nom.SC)).toBeLessThan(1.5);
    expect(o.current).toBeLessThan(nom.current);
    expect(o.HP - o.BP).toBeLessThan(nom.HP - nom.BP);
  });
});

describe('controls', () => {
  it('kp1 hysteresis', () => {
    const p: Pressostat = { kind: 'BP', range: 2, diff: 1.5 };
    expect(kpCutIn(p)).toBe(2);
    expect(kpCutOut(p)).toBe(0.5);
    expect(pressostatAllows(p, 1, true)).toBe(true);
    expect(pressostatAllows(p, 0.4, true)).toBe(false);
    expect(pressostatAllows(p, 1, false)).toBe(false);
    expect(pressostatAllows(p, 2.1, false)).toBe(true);
  });

  it('kp5 cutout', () => {
    const p: Pressostat = { kind: 'HP', range: 30, diff: 4 };
    expect(kpCutOut(p)).toBe(30);
    expect(kpCutIn(p)).toBe(26);
    expect(pressostatAllows(p, 29, true)).toBe(true);
    expect(pressostatAllows(p, 31, true)).toBe(false);
    expect(pressostatAllows(p, 28, false)).toBe(false);
    expect(pressostatAllows(p, 25, false)).toBe(true);
    const m = { ...p, manualReset: true };
    expect(pressostatAllows(m, 25, false)).toBe(false);
    expect(pressostatAllows(m, 25, true)).toBe(true);
  });

  it('relax converges', () => {
    const target = nom;
    let o = run({ evapFanOk: false });
    const half = relax(o, target, 30);
    expect(half.BP).toBeGreaterThan(o.BP);
    expect(half.BP).toBeLessThan(target.BP);
    for (let i = 0; i < 600; i++) o = relax(o, target, 1);
    expect(o.BP).toBeCloseTo(target.BP, 2);
    expect(o.SH).toBeCloseTo(target.SH, 2);
    expect(o.sightGlass).toBe(target.sightGlass);
  });

  it('standstill with air above psat', () => {
    expect(standstillPressure('R32', 25, 0)).toBeCloseTo(psat('R32', 25), 3);
    expect(standstillPressure('R32', 25, 0.8)).toBeGreaterThan(psat('R32', 25) + 0.5);
  });

  it('box pulls down when running and warms when off', () => {
    const opts = { Tamb: 30 };
    let T = 10;
    for (let i = 0; i < 3600; i++) T = boxStep(T, true, 2, 1, opts);
    expect(T).toBeLessThan(10);
    let W = 2;
    for (let i = 0; i < 3600; i++) W = boxStep(W, false, 2, 1, opts);
    expect(W).toBeGreaterThan(2);
    expect(W).toBeLessThan(30);
    expect(Number.isFinite(boxStep(5, true, 2, 1e6, opts))).toBe(true);
  });
});

describe('pressure regulators', () => {
  const cold: CycleInput = { fluid: 'R449A', Tamb: 30, Troom: 6, txvSH: 5, faults: NO_FAULTS };

  it('KVP holds the evaporator at its floor, capacity drops, suction stays lower', () => {
    const free = steadyState(cold), floor = psat('R449A', 0, 'dew');
    const o = steadyState({ ...cold, evapPressureFloor: floor });
    expect(free.BP).toBeLessThan(floor);
    expect(o.BP).toBeCloseTo(floor, 5);
    expect(o.Tevap).toBeCloseTo(0, 1);
    expect(o.BPsuction).toBeCloseTo(free.BP, 1);
    expect(o.capacityKW).toBeLessThan(free.capacityKW);
    expect(steadyState({ ...cold, evapPressureFloor: 1 }).BP).toBeCloseTo(free.BP, 5); // floor below: no effect
  });

  it('winter without KVR: low HP, TXV starves (high SH)', () => {
    const summer = steadyState({ ...cold, Troom: 2 }), w = steadyState({ ...cold, Troom: 2, Tamb: -5 });
    expect(w.HP).toBeLessThan(summer.HP - 8);
    expect(w.SH).toBeGreaterThan(summer.SH + 6);
    expect(w.BP).toBeLessThan(summer.BP);
  });

  it('winter with KVR at Psat(25 °C): HP held, SH normal; set too high costs COP', () => {
    const floor = psat('R449A', 25, 'bubble');
    const w = steadyState({ ...cold, Troom: 2, Tamb: -5, condPressureFloor: floor });
    const starved = steadyState({ ...cold, Troom: 2, Tamb: -5 });
    expect(w.HP).toBeGreaterThanOrEqual(floor - 1e-9);
    expect(Math.abs(w.SH - 7)).toBeLessThan(1);
    expect(w.capacityKW).toBeGreaterThan(starved.capacityKW);
    const high = steadyState({ ...cold, Troom: 2, Tamb: -5, condPressureFloor: psat('R449A', 38, 'bubble') });
    expect(high.COP).toBeLessThan(w.COP - 0.5);
    expect(high.current).toBeGreaterThan(w.current);
    // summer: the KVR is wide open
    expect(steadyState({ ...cold, Troom: 2, condPressureFloor: floor }).HP).toBeCloseTo(steadyState({ ...cold, Troom: 2 }).HP, 5);
  });

  it('R290 nominal point plausible', () => {
    const o = steadyState({ ...base, fluid: 'R290' });
    expect(toRel(o.BP)).toBeGreaterThan(4);
    expect(toRel(o.BP)).toBeLessThan(6.5);
    expect(toRel(o.HP)).toBeGreaterThan(11);
    expect(toRel(o.HP)).toBeLessThan(15);
    expect(Math.abs(o.SH - 7)).toBeLessThan(2);
  });
});
