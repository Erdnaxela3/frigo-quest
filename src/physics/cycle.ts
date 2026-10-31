import { psat, tsat } from './refrigerants';
import type { CycleInput, CycleOutput, FluidId, Pressostat, TxvState } from './types';

// simplification: every constant below is hand-tuned so the spec §3 fault table directions hold and the
// R32 split / R449A cold room land on textbook numbers. Not a thermodynamic model: replace with a
// real compressor map + heat-exchanger NTU if exam-grade numbers are ever needed.
const TXV_FEED: Record<TxvState, number> = { ok: 0, tooOpen: -0.9, tooClosed: 1, bulbLost: 1.5, bulbLoose: -0.5 };
const SC_NOM = 5;
const CARNOT_FRACTION = 0.45;
const VOLT_PF = 0.23 * 0.85; // kV × cos φ, single-phase

export function steadyState(i: CycleInput): CycleOutput {
  const f = i.faults, ce = f.compEff;
  const dTc0 = i.dTcondNominal ?? 12, dTe0 = i.dTevapNominal ?? 8, I0 = i.nominalCurrent ?? 4.5;
  const under = Math.max(0, 1 - f.chargeRatio), over = Math.max(0, f.chargeRatio - 1);
  const txv = TXV_FEED[f.txv];
  const starve = 2 * under + 1.2 * f.filterRestriction + Math.max(0, txv);
  const flood = over + Math.max(0, -txv);
  const lowLoad = Math.min(1, 0.6 * f.evapFrost + (f.evapFanOk ? 0 : 0.8));

  const HP0 = psat(i.fluid, i.Tamb + dTc0, 'bubble'), BP0 = psat(i.fluid, i.Troom - dTe0, 'dew');
  const dTcAir = dTc0 * (1 + f.condFouling) * (f.condFanOk ? 1 : 2.5);
  const dTcCharge = 20 * over - 4 * under;
  // high head pressure lowers volumetric efficiency → less suction flow → BP rises
  const hpStress = (psat(i.fluid, i.Tamb + dTcAir + dTcCharge, 'bubble') + f.nonCondBar) / HP0 - 1;

  const dTevap = Math.max(1,
    dTe0 * (1 + f.evapFrost) * (f.evapFanOk ? 1 : 2) * (1 - 0.25 * flood) * (0.5 + 0.5 * ce)
      * Math.max(0.5, 1 - 0.3 * hpStress) + 6 * starve);
  const Tevap = i.Troom - dTevap;
  const BP = psat(i.fluid, Tevap, 'dew');

  const mRel = (BP / BP0) * ce;
  const TcRef = i.Tamb + Math.max(1, dTcAir * (0.4 + 0.6 * mRel) + dTcCharge);
  const HP = psat(i.fluid, TcRef, 'bubble') + f.nonCondBar;
  const Tcond = tsat(i.fluid, HP, 'bubble'); // as read on the gauge: air inflates it

  const SH = Math.max(0, (i.txvSH + 2) * (1 - lowLoad) * (1 - Math.min(1, flood))) + 15 * starve + 6 * (1 - ce);
  const scTrue = Math.max(0, (under > 0 ? SC_NOM - 35 * under : SC_NOM + 40 * over)
    + 4 * (1.2 * f.filterRestriction + Math.max(0, txv)) - 4 * Math.max(0, -txv));
  const Tliquid = TcRef - scTrue;
  const SC = Tcond - Tliquid;

  const current = I0 * (0.35 + 0.65 * ((HP - BP) / (HP0 - BP0)) * mRel);
  const COP = (CARNOT_FRACTION * ce * (Tevap + 273.15)) / Math.max(5, Tcond - Tevap);
  const filterDT = 6 * f.filterRestriction;

  return {
    BP, HP, Tevap, Tcond, SH, SC,
    Tsuction: Tevap + SH,
    Tliquid,
    Tdischarge: Tcond + 30 + 2 * (SH - 7) + 8 * (HP / BP - 2.4) + 10 * (1 - ce),
    filterDT,
    current,
    capacityKW: COP * VOLT_PF * current,
    COP,
    sightGlass: f.chargeRatio < 0.7 ? 'mousse' : SC < 1 || f.filterRestriction >= 0.4 ? 'bulles' : 'clair',
    airOutEvap: i.Troom - 0.6 * (i.Troom - Tevap) * (f.evapFanOk ? 1 : 0.3),
    airOutCond: i.Tamb + 0.6 * (TcRef - i.Tamb) * (f.condFanOk ? 1 : 0.3),
    floodBack: SH < 1,
  };
}

export function relax(prev: CycleOutput, target: CycleOutput, dt: number, tau = 30): CycleOutput {
  const a = 1 - Math.exp(-dt / tau);
  const out = { ...target } as Record<string, unknown>;
  for (const k in target) {
    const p = prev[k as keyof CycleOutput], t = target[k as keyof CycleOutput];
    if (typeof p === 'number' && typeof t === 'number') out[k] = p + (t - p) * a;
  }
  return out as unknown as CycleOutput;
}

export const kpCutIn = (p: Pressostat) => (p.kind === 'BP' ? p.range : p.range - p.diff);
export const kpCutOut = (p: Pressostat) => (p.kind === 'BP' ? p.range - p.diff : p.range);

// manualReset (HP): once tripped it never re-arms by itself; the caller's reset button passes wasAllowing = true.
export function pressostatAllows(p: Pressostat, Prel: number, wasAllowing: boolean): boolean {
  if (p.kind === 'BP') return wasAllowing ? Prel >= kpCutOut(p) : Prel > kpCutIn(p);
  if (wasAllowing) return Prel < kpCutOut(p);
  return !p.manualReset && Prel <= kpCutIn(p);
}

// C dT/dt = UA·(Tamb − T) − Q, solved exactly so any dt is stable. UA kW/K, C kJ/K.
export function boxStep(
  Tbox: number, running: boolean, capacityKW: number, dt: number,
  opts: { Tamb: number; UA?: number; C?: number } = { Tamb: 25 },
): number {
  const UA = opts.UA ?? 0.05, C = opts.C ?? 200;
  const Teq = opts.Tamb - (running ? capacityKW : 0) / UA;
  return Teq + (Tbox - Teq) * Math.exp((-UA * dt) / C);
}

// bubble side: a charged circuit at rest is mostly liquid
export const standstillPressure = (fluid: FluidId, Tamb: number, nonCondBar: number) =>
  psat(fluid, Tamb, 'bubble') + nonCondBar;
