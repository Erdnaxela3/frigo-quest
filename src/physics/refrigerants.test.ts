import { describe, expect, it } from 'vitest';
import { FLUID_IDS, leakCheckFor, leakCheckMonths, psat, pWater, rhoLiq, rhoVapSat, tco2e, toRel, tsat } from './refrigerants';

describe('refrigerants', () => {
  it('psat matches table points', () => {
    expect(psat('R32', 0)).toBeCloseTo(8.13, 2);
    expect(psat('R134a', 40)).toBeCloseTo(10.17, 2);
    expect(psat('R290', 20)).toBeCloseTo(8.36, 2);
  });

  it('psat interpolates between points', () => {
    const p = psat('R32', 5);
    expect(p).toBeGreaterThan(8.13);
    expect(p).toBeLessThan(11.07);
  });

  it('tsat inverts psat for every fluid', () => {
    for (const id of FLUID_IDS) {
      for (const T of [-25, -5, 12, 27]) {
        expect(tsat(id, psat(id, T, 'dew'), 'dew')).toBeCloseTo(T, 1);
        expect(tsat(id, psat(id, T, 'bubble'), 'bubble')).toBeCloseTo(T, 1);
      }
    }
  });

  it('zeotropic blends: bubble pressure above dew, temperature glide ≈ nominal', () => {
    expect(psat('R407C', 0, 'bubble')).toBeGreaterThan(psat('R407C', 0, 'dew'));
    const P = psat('R407C', 0, 'bubble');
    const glide = tsat('R407C', P, 'dew') - 0;
    expect(glide).toBeGreaterThan(4);
    expect(glide).toBeLessThan(9);
  });

  it('CO2 clamps at critical point', () => {
    expect(psat('R744', 40)).toBeCloseTo(73.8, 1);
  });

  it('densities are plausible', () => {
    expect(rhoLiq('R32', 25)).toBeCloseTo(961, 0);
    expect(rhoLiq('R32', 50)).toBeLessThan(961);
    const rv = rhoVapSat('R32', 20);
    expect(rv).toBeGreaterThan(35); // real ≈ 42 kg/m³
    expect(rv).toBeLessThan(50);
  });

  it('units and regulation helpers', () => {
    expect(pWater(20) * 1000).toBeCloseTo(23.4, 0);
    expect(toRel(1.01325)).toBeCloseTo(0, 6);
    expect(tco2e('R404A', 8)).toBeCloseTo(31.38, 2);
    expect(leakCheckMonths(31.4)).toBe(12);
    expect(leakCheckMonths(60)).toBe(6);
    expect(leakCheckMonths(600)).toBe(3);
    expect(leakCheckMonths(600, true)).toBe(6);
    expect(leakCheckMonths(4)).toBeNull();
    expect(leakCheckMonths(8, false, true)).toBeNull();
  });
});

describe('leakCheckFor', () => {
  it('uses kg thresholds for HFOs and t CO₂e for HFCs', () => {
    expect(leakCheckFor('R1234yf', 1.5)).toBe(12);
    expect(leakCheckFor('R1234yf', 1.5, false, true)).toBeNull();
    expect(leakCheckFor('R1234yf', 12, true)).toBe(12);
    expect(leakCheckFor('R1234yf', 140)).toBe(3);
    expect(leakCheckFor('R32', 1.2)).toBeNull(); // 0.81 t
    expect(leakCheckFor('R410A', 3)).toBe(12); // 6.26 t
  });
});
