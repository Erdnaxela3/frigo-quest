import { ATM, type Circuit, type Device, type FluidId, type Link, type Species, type Volume, type VolumeState } from './types';
import { FLUIDS, P_ATM, R, psat, pWater, rhoLiq, rhoVapSat } from './refrigerants';

const M = { n2: 28.013e-3, air: 28.96e-3, h2o: 18.015e-3 }; // kg/mol
const T_ATM = 21;
const TAU_T = 120; // s
const H_MAX = 0.1; // s, largest sub-step
const H_MIN = H_MAX / 10; // s, floor: stiff liquid-full links then lean on the cap
const LIQ_FULL_STIFF = 15; // bar per K of thermal-expansion-equivalent overfill
const EPS_DP = 1e-3; // bar: flow is linear in ΔP below this, removing the √ singularity at equilibrium
// Below ~P_VISC mean pressure, hose conductance falls ∝ P (viscous regime): this is what makes the last millibars slow.
const P_VISC = 0.02; // bar
// simplification: one latent heat and a wall heat capacity ∝ V for every fluid and vessel; per-volume thermal mass if levels need it.
const H_FG = 250; // kJ/kg
const C_WALL = 1; // kJ/K per L
const CP_LIQ = 1.5; // kJ/(kg·K)
const CP_GAS = 1; // kJ/(kg·K)

const SP = ['ref', 'n2', 'air', 'h2o'] as const;
const KEY = { ref: 'mRef', n2: 'mN2', air: 'mAir', h2o: 'mH2O' } as const;
const SOURCE = '__n2_bottle__';

const TK = (T: number) => T + 273.15;
const zero = (): Species => ({ ref: 0, n2: 0, air: 0, h2o: 0 });
const sum = (s: Species) => s.ref + s.n2 + s.air + s.h2o;
const scale = (s: Species, f: number): Species => ({ ref: s.ref * f, n2: s.n2 * f, air: s.air * f, h2o: s.h2o * f });

interface Full extends VolumeState {
  rho: Species; // gas-phase partial densities, kg/m³
  rhoL: number;
  mLiq: number; // liquid refrigerant, kg
}

const rhoAtm = (P_ATM * 1e5 * M.air) / (R * TK(T_ATM));
const ATM_STATE: Full = {
  P: P_ATM, Pref: 0, PN2: 0, PAir: P_ATM, PH2O: 0, liquidFraction: 0, phase: 'empty', waterLiquid: 0,
  rho: { ref: 0, n2: 0, air: rhoAtm, h2o: 0 }, rhoL: 0, mLiq: 0,
};

function analyse(fluid: FluidId, v: Volume): Full {
  const f = FLUIDS[fluid], Vm = v.V / 1000, T = TK(v.T);
  let Pref = 0, lf = 0, rhoRef = 0, mLiq = 0, phase: VolumeState['phase'] = 'empty';
  const rhoL = rhoLiq(fluid, v.T);
  if (v.mRef > 1e-12) {
    const rvs = rhoVapSat(fluid, v.T);
    // simplification: supercritical is handled as dense vapour, P saturates near 1.1·Pc; fine below ~Tc, wrong for R744 transcritical.
    if (v.mRef < rvs * Vm || v.T >= f.critical.T) {
      // exact inverse of rhoVap(): ρ = P·A / (1 − 0.9·P/Pc)
      rhoRef = v.mRef / Vm;
      Pref = rhoRef / ((1e2 * f.molarMass) / (R * T) + (rhoRef * 0.9) / f.critical.P);
      phase = 'vapour';
    } else {
      lf = (v.mRef - rvs * Vm) / (rhoL - rvs) / Vm;
      rhoRef = rvs;
      const Pb = psat(fluid, v.T, 'bubble'), Pd = psat(fluid, v.T, 'dew');
      if (lf <= 1) {
        mLiq = lf * Vm * rhoL;
        // zeotropes: dew pressure when the last drop is vapour, bubble pressure when it is all liquid (mass basis)
        Pref = Pd + (Pb - Pd) * (mLiq / v.mRef);
        phase = 'twoPhase';
      } else {
        Pref = Pb + (LIQ_FULL_STIFF * (v.mRef / (Vm * rhoL) - 1)) / f.beta;
        mLiq = v.mRef;
        lf = 1;
        phase = 'liquidFull';
      }
    }
  }
  // simplification: gas space never below 5 % of V so non-condensables stay finite over a liquid-full vessel.
  const Vg = Vm * Math.max(1 - lf, 0.05);
  const pp = (m: number, Mm: number) => (m * R * T) / (Mm * Vg) / 1e5;
  // simplification: liquid water flashes instantly up to pWater(T), so boil-off is limited only by how fast vapour is pumped away
  // (≈ S·ρ_sat: 5 g takes ~5 min at 3.4 m³/h). Add a separate evaporation-rate cap if a level needs a longer plateau.
  const h2oVap = Math.min(v.mH2O, (pWater(v.T) * 1e5 * M.h2o * Vg) / (R * T));
  const PN2 = pp(v.mN2, M.n2), PAir = pp(v.mAir, M.air), PH2O = pp(h2oVap, M.h2o);
  return {
    P: Pref + PN2 + PAir + PH2O, Pref, PN2, PAir, PH2O, liquidFraction: lf, phase,
    waterLiquid: Math.max(0, v.mH2O - h2oVap),
    rho: { ref: rhoRef, n2: v.mN2 / Vg, air: v.mAir / Vg, h2o: h2oVap / Vg }, rhoL, mLiq,
  };
}

const stateOf = (c: Circuit, id: string) => (id === ATM ? ATM_STATE : analyse(c.fluid, c.volumes[id]));

export const volumeState = (c: Circuit, id: string): VolumeState => stateOf(c, id);

export const makeVolume = (id: string, V: number, init: Partial<Volume> = {}): Volume => ({
  id, V, T: 20, mRef: 0, mN2: 0, mAir: 0, mH2O: 0, ...init,
});

export const makeCircuit = (fluid: FluidId, volumes: Volume[], links: Link[] = [], devices: Device[] = [], ambient = 20): Circuit => ({
  fluid, ambient, t: 0, volumes: Object.fromEntries(volumes.map((v) => [v.id, v])), links, devices, emitted: zero(),
});

export function totals(c: Circuit): Species {
  const t = zero();
  for (const v of Object.values(c.volumes)) for (const s of SP) t[s] += v[KEY[s]];
  return t;
}

const orifice = (k: number, rho: number, dP: number) => (k * Math.sqrt(rho) * dP) / Math.sqrt(Math.max(Math.abs(dP), EPS_DP));

function linkFlow(l: Link, a: Full, b: Full): { q: Species; liquid: boolean } {
  const dP = a.P - b.P, up = dP >= 0 ? a : b;
  // a liquid-full end has no vapour space: whatever leaves it is liquid
  const liquid = (l.liquidSide === (dP >= 0 ? 'a' : 'b') && up.liquidFraction > 0) || up.phase === 'liquidFull';
  const rho = liquid ? up.rhoL : sum(up.rho);
  if (l.open <= 0 || rho <= 0 || dP === 0) return { q: zero(), liquid };
  if (liquid) return { q: { ref: orifice(l.k * l.open, rho, dP), n2: 0, air: 0, h2o: 0 }, liquid };
  const Pm = (a.P + b.P) / 2;
  return { q: scale(up.rho, (orifice(l.k * l.open, rho, dP) * Pm) / (Pm + P_VISC) / rho), liquid };
}

/** kg/s from link.a to link.b, per species (negative = b → a). */
export const flow = (c: Circuit, l: Link): Species => linkFlow(l, stateOf(c, l.a), stateOf(c, l.b)).q;

// dP/dm when adding a little of `mix` (fractions summing to 1) to volume id.
function stiffness(c: Circuit, id: string, P0: number, mix: Species): number {
  if (id === ATM || id === SOURCE) return 0;
  const v = c.volumes[id], d = 1e-4 * (v.mRef + v.mN2 + v.mAir + v.mH2O) + 1e-9;
  const w = { ...v, mRef: v.mRef + d * mix.ref, mN2: v.mN2 + d * mix.n2, mAir: v.mAir + d * mix.air, mH2O: v.mH2O + d * mix.h2o };
  return Math.max(0, (analyse(c.fluid, w).P - P0) / d);
}

interface Rate { from: string; to: string; q: Species /* kg/s */; cap: number /* kg per sub-step */; liquid?: boolean }

function subStep(c: Circuit, left: number): number {
  const st: Record<string, Full> = { [ATM]: ATM_STATE };
  for (const id in c.volumes) st[id] = analyse(c.fluid, c.volumes[id]);
  const deg: Record<string, number> = {};
  for (const l of c.links) if (l.open > 0) for (const e of [l.a, l.b]) deg[e] = (deg[e] ?? 0) + 1;

  const rates: Rate[] = [];
  let hLim = H_MAX;
  // Sub-step so explicit Euler stays monotone (h·G·Σ dP/dm·n ≤ ½) on links that carry real flow. Near equilibrium the √ law is
  // infinitely stiff, so there the cap takes over: never move more than the mass that would equalise both ends, shared among
  // the n links on the busier end.
  const add = (from: string, to: string, q: Species, dP: number, n: number, liquid = false) => {
    const rate = sum(q), mix = scale(q, 1 / rate);
    const s = stiffness(c, from, st[from]?.P ?? 0, mix) + stiffness(c, to, st[to].P, mix);
    const busy = Math.abs(dP) > Math.max(10 * EPS_DP, 0.05 * Math.max(st[from]?.P ?? 0, st[to].P));
    if (s > 0 && busy) hLim = Math.min(hLim, (0.5 * Math.abs(dP)) / (rate * s * n));
    rates.push({ from, to, q, cap: s > 0 ? Math.abs(dP) / s / n : Infinity, liquid });
  };

  for (const l of c.links) {
    const a = st[l.a], b = st[l.b], { q, liquid } = linkFlow(l, a, b), tot = sum(q);
    if (tot === 0) continue;
    const [from, to] = tot > 0 ? [l.a, l.b] : [l.b, l.a];
    add(from, to, scale(q, Math.sign(tot)), a.P - b.P, Math.max(deg[l.a], deg[l.b]), liquid);
  }
  for (const d of c.devices) {
    if (d.kind === 'n2') {
      const dP = d.setpoint - st[d.at].P;
      if (!d.open || dP <= 0) continue;
      const rho = (d.setpoint * 1e5 * M.n2) / (R * TK(c.ambient));
      add(SOURCE, d.at, { ref: 0, n2: orifice(d.k, rho, dP), air: 0, h2o: 0 }, dP, (deg[d.at] ?? 0) + 1);
    } else if (d.on) {
      // simplification: transfer ignores outlet back-pressure (an overheated, overfull recovery cylinder doesn't slow it down).
      const from = d.kind === 'vacuumPump' ? d.at : d.from, P = st[from].P, S = d.speed / 3600;
      const lim = d.kind === 'vacuumPump' ? d.ultimate : d.cutoff;
      if (P <= lim) continue;
      hLim = Math.min(hLim, (0.5 * c.volumes[from].V) / 1000 / S); // never sweep more than half the inlet volume
      const liquid = st[from].phase === 'liquidFull', f = S * (1 - lim / P);
      const q = liquid ? { ref: st[from].rhoL * f, n2: 0, air: 0, h2o: 0 } : scale(st[from].rho, f);
      rates.push({ from, to: d.kind === 'vacuumPump' ? ATM : d.to, q, cap: Infinity, liquid });
    }
  }

  const h = Math.min(left, Math.max(H_MIN, hLim));
  const moves = rates.map((r) => {
    const m = scale(r.q, h), amt = sum(m);
    return { ...r, m: amt > r.cap ? scale(m, r.cap / amt) : m };
  });

  // A volume never gives more of a species than it holds.
  const out: Record<string, Species> = {};
  for (const mv of moves) {
    const o = (out[mv.from] ??= zero());
    for (const s of SP) o[s] += mv.m[s];
  }
  for (const mv of moves) {
    const v = c.volumes[mv.from];
    if (v) for (const s of SP) if (out[mv.from][s] > v[KEY[s]]) mv.m[s] *= v[KEY[s]] / out[mv.from][s];
  }

  // liqNet: liquid carried by liquid-port links, so liquid flashing in the receiver cools it rather than reading as condensation.
  // mix*: sensible heat carried by the flow, so a hose fed by a warm cylinder warms up instead of going liquid-full.
  const liqNet: Record<string, number> = {}, liqLeft: Record<string, number> = {}, mixC: Record<string, number> = {}, mixCT: Record<string, number> = {};
  for (const id in c.volumes) (liqNet[id] = 0), (liqLeft[id] = st[id].mLiq), (mixC[id] = 0), (mixCT[id] = 0);
  const Tof = (id: string) => c.volumes[id]?.T ?? (id === ATM ? T_ATM : c.ambient);
  for (const { from, to, m, liquid } of moves) {
    const vf = c.volumes[from], vt = c.volumes[to];
    if (liquid && vf) {
      const l = Math.min(m.ref, liqLeft[from]);
      liqLeft[from] -= l;
      liqNet[from] -= l;
      if (vt) liqNet[to] += l;
    }
    if (vt) {
      const C = sum(m) * (liquid ? CP_LIQ : CP_GAS);
      mixC[to] += C;
      mixCT[to] += C * Tof(from);
    }
    for (const s of SP) {
      if (vf) vf[KEY[s]] = Math.max(0, vf[KEY[s]] - m[s]);
      if (vt) vt[KEY[s]] += m[s];
      else if (to === ATM) c.emitted[s] += m[s];
    }
  }

  const relax = 1 - Math.exp(-h / TAU_T);
  for (const id in c.volumes) {
    const v = c.volumes[id], C = C_WALL * v.V + CP_LIQ * v.mRef;
    const evap = st[id].mLiq + liqNet[id] - analyse(c.fluid, v).mLiq; // at constant T: >0 boiled off, <0 condensed
    v.T = (C * v.T + mixCT[id]) / (C + mixC[id]) - (H_FG * evap) / C;
    v.T += ((v.Tdrive ?? c.ambient) - v.T) * relax;
    v.T = Math.min(150, Math.max(-60, v.T)); // keep tables and rhoLiq in range whatever a level throws at it
  }
  c.t += h;
  return h;
}

export function step(c: Circuit, dt: number): void {
  for (let left = dt; left > 1e-12; ) left -= subStep(c, left);
}
