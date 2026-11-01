import type { Fluid, FluidId } from './types';

export const P_ATM = 1.01325;
export const R = 8.314462618;

// simplification: saturation tables are approximate (±2 %) values transcribed from manufacturer P/T charts.
// Cross-check against CoolProp before using them in exam-grade numeric questions.
// GWP = Regulation (EU) 2024/573 values: AR4 for saturated HFCs (Annex I), newer values for HFOs and HCs.
const F: Fluid[] = [
  {
    id: 'R32', name: 'R32 (difluorométhane)', gwp: 675, safety: 'A2L', glide: 0, molarMass: 52.02,
    rhoLiq25: 961, beta: 0.0032, critical: { T: 78.1, P: 57.8 }, lfl: 0.307, oil: 'POE / PVE',
    uses: 'Split et PAC résidentiels récents',
    sat: [[-40, 1.77, 1.77], [-30, 2.73, 2.73], [-20, 4.06, 4.06], [-10, 5.83, 5.83], [0, 8.13, 8.13], [10, 11.07, 11.07],
      [20, 14.75, 14.75], [30, 19.28, 19.28], [40, 24.78, 24.78], [50, 31.4, 31.4], [60, 39.3, 39.3]],
  },
  {
    id: 'R410A', name: 'R410A (R32/R125 50/50)', gwp: 2088, safety: 'A1', glide: 0.1, molarMass: 72.58,
    rhoLiq25: 1062, beta: 0.0035, critical: { T: 71.3, P: 49.0 }, oil: 'POE',
    uses: 'Split et PAC (ancienne génération)',
    sat: [[-40, 1.76, 1.75], [-30, 2.71, 2.70], [-20, 4.01, 4.00], [-10, 5.75, 5.73], [0, 8.01, 7.99], [10, 10.89, 10.86],
      [20, 14.48, 14.44], [30, 18.90, 18.85], [40, 24.25, 24.19], [50, 30.7, 30.6], [60, 38.4, 38.3]],
  },
  {
    id: 'R134a', name: 'R134a', gwp: 1430, safety: 'A1', glide: 0, molarMass: 102.03,
    rhoLiq25: 1206, beta: 0.0026, critical: { T: 101.1, P: 40.6 }, oil: 'POE',
    uses: 'Froid commercial moyenne température, groupes d\'eau glacée',
    sat: [[-40, 0.51, 0.51], [-30, 0.84, 0.84], [-20, 1.33, 1.33], [-10, 2.01, 2.01], [0, 2.93, 2.93], [10, 4.15, 4.15],
      [20, 5.72, 5.72], [30, 7.70, 7.70], [40, 10.17, 10.17], [50, 13.18, 13.18], [60, 16.82, 16.82]],
  },
  {
    id: 'R290', name: 'R290 (propane)', gwp: 0.02, safety: 'A3', glide: 0, molarMass: 44.1,
    rhoLiq25: 493, beta: 0.0033, critical: { T: 96.7, P: 42.5 }, lfl: 0.038, oil: 'Minérale / PAO / POE',
    uses: 'Vitrines plug-in, PAC monobloc, petits équipements',
    sat: [[-40, 1.11, 1.11], [-30, 1.68, 1.68], [-20, 2.45, 2.45], [-10, 3.45, 3.45], [0, 4.74, 4.74], [10, 6.36, 6.36],
      [20, 8.36, 8.36], [30, 10.79, 10.79], [40, 13.69, 13.69], [50, 17.13, 17.13], [60, 21.17, 21.17]],
  },
  {
    id: 'R1234yf', name: 'R1234yf (HFO)', gwp: 0.501, safety: 'A2L', glide: 0, molarMass: 114.04,
    rhoLiq25: 1092, beta: 0.0030, critical: { T: 94.7, P: 33.8 }, lfl: 0.289, oil: 'PAG (auto) / POE',
    uses: 'Climatisation automobile, remplacement du R134a',
    sat: [[-40, 0.62, 0.62], [-30, 0.99, 0.99], [-20, 1.51, 1.51], [-10, 2.22, 2.22], [0, 3.16, 3.16], [10, 4.39, 4.39],
      [20, 5.92, 5.92], [30, 7.83, 7.83], [40, 10.17, 10.17], [50, 12.98, 12.98], [60, 16.3, 16.3]],
  },
  {
    id: 'R404A', name: 'R404A', gwp: 3922, safety: 'A1', glide: 0.7, molarMass: 97.6,
    rhoLiq25: 1044, beta: 0.0040, critical: { T: 72.1, P: 37.3 }, oil: 'POE',
    uses: 'Froid commercial basse température (interdit en entretien avec fluide vierge)',
    sat: [[-40, 1.35, 1.31], [-30, 2.10, 2.04], [-20, 3.12, 3.03], [-10, 4.45, 4.33], [0, 6.16, 6.00], [10, 8.30, 8.10],
      [20, 10.94, 10.69], [30, 14.14, 13.84], [40, 17.97, 17.62], [50, 22.5, 22.1], [60, 27.8, 27.4]],
  },
  {
    id: 'R407C', name: 'R407C', gwp: 1774, safety: 'A1', glide: 6.5, molarMass: 86.2,
    rhoLiq25: 1134, beta: 0.0033, critical: { T: 86.0, P: 46.3 }, oil: 'POE',
    uses: 'Climatisation, remplacement du R22',
    sat: [[-40, 1.22, 0.85], [-30, 1.86, 1.35], [-20, 2.72, 2.04], [-10, 3.88, 3.00], [0, 5.39, 4.27], [10, 7.31, 5.93],
      [20, 9.70, 8.04], [30, 12.64, 10.66], [40, 16.19, 13.89], [50, 20.44, 17.80], [60, 25.47, 22.47]],
  },
  {
    id: 'R449A', name: 'R449A', gwp: 1396, safety: 'A1', glide: 4.5, molarMass: 87.2,
    rhoLiq25: 1113, beta: 0.0034, critical: { T: 81.5, P: 44.5 }, oil: 'POE',
    uses: 'Froid commercial, remplacement du R404A',
    sat: [[-40, 1.40, 1.00], [-30, 2.10, 1.55], [-20, 3.05, 2.33], [-10, 4.30, 3.38], [0, 5.92, 4.76], [10, 7.97, 6.52],
      [20, 10.5, 8.72], [30, 13.6, 11.45], [40, 17.3, 14.8], [50, 21.8, 18.9], [60, 27.1, 23.8]],
  },
  {
    id: 'R744', name: 'R744 (CO₂)', gwp: 1, safety: 'A1', glide: 0, molarMass: 44.01,
    rhoLiq25: 713, beta: 0.012, critical: { T: 31.0, P: 73.8 }, oil: 'POE / PAG',
    uses: 'Froid commercial transcritique, PAC eau chaude sanitaire',
    sat: [[-40, 10.05, 10.05], [-30, 14.28, 14.28], [-20, 19.70, 19.70], [-10, 26.49, 26.49], [0, 34.85, 34.85],
      [10, 45.02, 45.02], [20, 57.29, 57.29], [30, 72.14, 72.14], [31, 73.8, 73.8]],
  },
];

export const FLUIDS: Record<FluidId, Fluid> = Object.fromEntries(F.map((f) => [f.id, f])) as Record<FluidId, Fluid>;
export const FLUID_IDS = F.map((f) => f.id);

export const fluid = (id: FluidId): Fluid => FLUIDS[id];

export type SatSide = 'bubble' | 'dew';

const col = (side: SatSide) => (side === 'bubble' ? 1 : 2);

/** Saturation pressure, bar abs. ln(P) is interpolated linearly in T; clamped at the critical point. */
export function psat(id: FluidId, T: number, side: SatSide = 'dew'): number {
  const f = FLUIDS[id];
  if (T >= f.critical.T) return f.critical.P;
  const s = f.sat, c = col(side);
  let i = 0;
  while (i < s.length - 2 && T > s[i + 1][0]) i++;
  const [T0, T1] = [s[i][0], s[i + 1][0]];
  const [l0, l1] = [Math.log(s[i][c]), Math.log(s[i + 1][c])];
  return Math.exp(l0 + ((T - T0) * (l1 - l0)) / (T1 - T0));
}

/** Saturation temperature (°C) for a pressure in bar abs. Inverse of psat. */
export function tsat(id: FluidId, P: number, side: SatSide = 'dew'): number {
  const f = FLUIDS[id];
  if (P >= f.critical.P) return f.critical.T;
  const s = f.sat, c = col(side), lp = Math.log(Math.max(P, 1e-6));
  let i = 0;
  while (i < s.length - 2 && P > s[i + 1][c]) i++;
  const [T0, T1] = [s[i][0], s[i + 1][0]];
  const [l0, l1] = [Math.log(s[i][c]), Math.log(s[i + 1][c])];
  return T0 + ((lp - l0) * (T1 - T0)) / (l1 - l0);
}

export const isSupercritical = (id: FluidId, T: number) => T >= FLUIDS[id].critical.T;

/** Compressibility of refrigerant vapour, crude: Z ≈ 1 − 0.9·P/Pc. */
export const zVap = (id: FluidId, P: number) => Math.max(0.3, 1 - (0.9 * P) / FLUIDS[id].critical.P);

/** Refrigerant vapour density, kg/m³. */
export function rhoVap(id: FluidId, P: number, T: number): number {
  return (P * 1e5 * FLUIDS[id].molarMass * 1e-3) / (zVap(id, P) * R * (T + 273.15));
}

/** Saturated vapour density at T (dew side), kg/m³. */
export const rhoVapSat = (id: FluidId, T: number) => rhoVap(id, psat(id, T, 'dew'), T);

/** Liquid density, kg/m³, linear thermal expansion around 25 °C. */
export function rhoLiq(id: FluidId, T: number): number {
  const f = FLUIDS[id];
  return f.rhoLiq25 * (1 - f.beta * (T - 25));
}

/** Water vapour saturation pressure, bar abs (Magnus). 20 °C → 0.0234 bar. */
export const pWater = (T: number) => (6.112 * Math.exp((17.62 * T) / (243.12 + T))) / 1000;

export const toRel = (Pabs: number) => Pabs - P_ATM;
export const toAbs = (Prel: number) => Prel + P_ATM;

/** Tonnes CO₂ equivalent = kg × GWP / 1000. */
export const tco2e = (id: FluidId, kg: number) => (kg * FLUIDS[id].gwp) / 1000;

/** F-Gas III leak-check interval in months for an HFC charge (no leak detection system); null = not required. */
export function leakCheckMonths(t: number, hasLDS = false, hermetic = false): number | null {
  if (hermetic && t < 10) return null;
  if (t < 5) return null;
  const base = t >= 500 ? 3 : t >= 50 ? 6 : 12;
  return hasLDS ? base * 2 : base;
}

/** 2024/573 art. 5: Annex II HFOs (here R1234yf) are thresholded in kg (1/10/100 kg, hermetic exempt < 2 kg), the rest in t CO₂e. */
export function leakCheckFor(id: FluidId, kg: number, hasLDS = false, hermetic = false): number | null {
  if (id !== 'R1234yf') return leakCheckMonths(tco2e(id, kg), hasLDS, hermetic);
  if ((hermetic && kg < 2) || kg < 1) return null;
  const base = kg >= 100 ? 3 : kg >= 10 ? 6 : 12;
  return hasLDS ? base * 2 : base;
}
