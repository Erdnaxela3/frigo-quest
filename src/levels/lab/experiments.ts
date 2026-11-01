import type { Circuit, FluidId, Volume, VolumeState } from '../../physics/types';
import { makeCircuit, makeVolume, step, volumeState } from '../../physics/circuit';
import { FLUIDS, P_ATM, R, isSupercritical, psat, pWater, rhoLiq, rhoVapSat } from '../../physics/refrigerants';

export type VesselId = 'A' | 'B';
export type ExpId = 'E1' | 'E2' | 'E3' | 'E4' | 'E5' | 'E6' | 'E7' | 'E8' | 'E9' | 'E10';

export interface Bench {
  c: Circuit;
  second: boolean;
  plate: number; // °C, drives both vessels
  blend: number; // mass fraction of the volatile pair in vessel A (zeotropes only)
}

// simplification: zeotropes as a pseudo-binary with one fixed relative volatility; only drives the composition bar, not the pressure.
export const BLENDS: Partial<Record<FluidId, { x0: number; light: string; heavy: string }>> = {
  R407C: { x0: 0.48, light: 'R32 + R125', heavy: 'R134a' },
  R449A: { x0: 0.49, light: 'R32 + R125', heavy: 'R134a + R1234yf' },
};
const ALPHA = 2.5;

const airMass = (VL: number, T: number) => (P_ATM * 1e5 * VL * 1e-3 * 28.96e-3) / (R * (T + 273.15));

/** Refrigerant mass that fills `lf` of the vessel with liquid at T. */
export const massForFill = (f: FluidId, VL: number, T: number, lf: number) => {
  const rv = rhoVapSat(f, T), rl = rhoLiq(f, T);
  return (VL / 1000) * (rv + lf * (rl - rv));
};

interface BenchInit {
  fluid?: FluidId;
  plate?: number;
  A?: Partial<Volume>;
  B?: Partial<Volume>;
  second?: boolean;
}

export function makeBench({ fluid = 'R32', plate = 20, A = {}, B = {}, second = false }: BenchInit = {}): Bench {
  const c = makeCircuit(
    fluid,
    [
      makeVolume('A', 5, { T: plate, Tdrive: plate, label: 'Bouteille A', ...A }),
      makeVolume('B', 10, { T: plate, Tdrive: plate, label: 'Bouteille B', ...B }),
    ],
    [{ id: 'valve', a: 'A', b: 'B', k: 4e-4, open: 0 }],
    [{ kind: 'vacuumPump', id: 'pump', at: 'A', on: false, speed: 3.4, ultimate: 5e-5 }],
  );
  return { c, second, plate, blend: BLENDS[fluid]?.x0 ?? 0 };
}

export const vol = (b: Bench, id: VesselId) => b.c.volumes[id];
export const stateOf = (b: Bench, id: VesselId) => volumeState(b.c, id);
export const valveOpen = (b: Bench) => b.c.links[0].open > 0;
export const pumpOn = (b: Bench) => b.c.devices[0].kind === 'vacuumPump' && b.c.devices[0].on;

export function setPlate(b: Bench, T: number) {
  b.plate = T;
  for (const v of Object.values(b.c.volumes)) v.Tdrive = T;
}

export function setValve(b: Bench, open: boolean) {
  b.c.links[0].open = open && b.second ? 1 : 0;
}

export function setPump(b: Bench, on: boolean) {
  const d = b.c.devices[0];
  if (d.kind === 'vacuumPump') d.on = on;
}

export function setSecond(b: Bench, on: boolean) {
  b.second = on;
  if (!on) b.c.links[0].open = 0;
}

export function setVolume(b: Bench, id: VesselId, V: number) {
  vol(b, id).V = V;
}

const removeVapour = (b: Bench, m: number, dm: number) => {
  const x = b.blend, y = (ALPHA * x) / (1 + (ALPHA - 1) * x);
  if (m - dm > 1e-6) b.blend = Math.min(1, Math.max(0, (x * m - y * dm) / (m - dm)));
};

/** kg > 0 injects fresh fluid; kg < 0 draws from the top (gas) or the bottom (liquid). */
export function inject(b: Bench, id: VesselId, kg: number, side: 'gas' | 'liquid' = 'gas') {
  const v = vol(b, id), bl = BLENDS[b.c.fluid];
  if (kg > 0) {
    if (id === 'A' && bl) b.blend = (b.blend * v.mRef + bl.x0 * kg) / (v.mRef + kg);
    v.mRef += kg;
    return;
  }
  const dm = Math.min(-kg, v.mRef);
  const fromGas = side === 'gas' || stateOf(b, id).liquidFraction === 0;
  if (id === 'A' && bl && fromGas) removeVapour(b, v.mRef, dm);
  v.mRef -= dm;
}

export const addN2 = (b: Bench, id: VesselId, kg: number) => { vol(b, id).mN2 += kg; };
export const addWater = (b: Bench, id: VesselId, kg: number) => { vol(b, id).mH2O += kg; };

/** Keeps each vessel's liquid fill (or its vapour pressure) when switching fluid. */
export function changeFluid(b: Bench, f: FluidId) {
  const old = b.c.fluid;
  for (const id of ['A', 'B'] as const) {
    const v = vol(b, id), s = stateOf(b, id);
    if (s.phase === 'twoPhase' || s.phase === 'liquidFull') v.mRef = massForFill(f, v.V, v.T, Math.min(0.9, s.liquidFraction));
    else v.mRef *= FLUIDS[f].molarMass / FLUIDS[old].molarMass;
  }
  b.c.fluid = f;
  b.blend = BLENDS[f]?.x0 ?? 0;
}

export function tick(b: Bench, dt = 0.1) {
  const A = vol(b, 'A'), m0 = A.mRef;
  step(b.c, dt);
  const dm = m0 - A.mRef;
  if (dm > 0 && BLENDS[b.c.fluid]) removeVapour(b, m0, dm);
}

export const run = (b: Bench, seconds: number) => {
  for (let i = 0; i < Math.round(seconds / 0.1); i++) tick(b);
};

// ---- experiments ----

export type Mem = Record<string, number>;

export interface Experiment {
  id: ExpId;
  title: string;
  skills: string[];
  instruction: string;
  takeaway: [string, string];
  quiz: 'g-psat' | 'g-tsat';
  setup: () => Bench;
  check: (b: Bench, mem: Mem) => boolean;
  /** What a learner does (one action per entry) and the simulated seconds it then takes; used by tests. */
  demo: { actions: ((b: Bench) => void)[]; seconds: number };
}

const settled = (b: Bench, id: VesselId = 'A', tol = 0.5) => Math.abs(vol(b, id).T - b.plate) < tol;
const sA = (b: Bench): VolumeState => stateOf(b, 'A');
const A1 = (...items: string[]) => items.map((i) => `A1:${i}`);

export const EXPERIMENTS: Experiment[] = [
  {
    id: 'E1',
    title: 'Plus de fluide, même température',
    skills: A1('1.01', '5.05'),
    instruction: 'Deux bouteilles identiques sur la même plaque, B contient 4× plus de fluide que A. Comparez les manomètres, puis injectez encore +200 g dans A.',
    takeaway: [
      'Tant qu\'il reste du liquide, la pression vaut Psat(T), quelle que soit la quantité : la pression indique la température, pas la charge.',
      'C\'est pour ça qu\'on charge à la balance, jamais « au manomètre ».',
    ],
    quiz: 'g-tsat',
    setup: () => makeBench({ A: { V: 5, mRef: 0.4 }, B: { V: 5, mRef: 1.6 }, second: true }),
    check: (b) => {
      const a = sA(b), bb = stateOf(b, 'B');
      return vol(b, 'A').mRef >= 0.55 && a.phase === 'twoPhase' && bb.phase === 'twoPhase'
        && settled(b) && settled(b, 'B') && Math.abs(a.P - bb.P) < 0.2;
    },
    demo: { actions: [(b) => { inject(b, 'A', 0.2); }], seconds: 5 },
  },
  {
    id: 'E2',
    title: 'Chauffer un mélange liquide-vapeur',
    skills: A1('1.03'),
    instruction: 'Chauffez la plaque à 40 °C (passez en ×10) et suivez le point sur le diagramme P–T.',
    takeaway: [
      'Le point glisse le long de la courbe de saturation : à chaque température correspond une seule pression tant qu\'il y a du liquide.',
      'C\'est exactement ce que donnent les tables de saturation et l\'échelle °C du manomètre.',
    ],
    quiz: 'g-psat',
    setup: () => makeBench({ A: { V: 5, mRef: 1 } }),
    check: (b) => {
      const a = sA(b), T = vol(b, 'A').T;
      return T >= 38 && a.phase === 'twoPhase' && Math.abs(a.P - psat(b.c.fluid, T)) < 0.5;
    },
    demo: { actions: [(b) => { setPlate(b, 40); }], seconds: 900 },
  },
  {
    id: 'E3',
    title: 'Peu de fluide, on chauffe',
    skills: A1('1.02', '1.03'),
    instruction: 'Très peu de fluide dans 10 L, plaque à −10 °C. Chauffez la plaque à 40 °C et regardez le point quitter la courbe quand la dernière goutte s\'évapore.',
    takeaway: [
      'Une fois tout le liquide évaporé, la pression ne suit plus la courbe : elle monte lentement, comme un gaz parfait. C\'est la vapeur surchauffée.',
      'Surchauffe = température réelle − température de saturation lue au manomètre.',
    ],
    quiz: 'g-tsat',
    setup: () => makeBench({ plate: -10, A: { V: 10, mRef: 0.32 } }),
    check: (b) => {
      const a = sA(b), T = vol(b, 'A').T;
      return a.phase === 'vapour' && T >= 25 && a.P < psat(b.c.fluid, T) - 2;
    },
    demo: { actions: [(b) => { setPlate(b, 40); }], seconds: 900 },
  },
  {
    id: 'E4',
    title: 'Bouteille trop remplie au soleil',
    skills: A1('5.02'),
    instruction: 'Cette bouteille de 1 L est remplie à près de 90 % de liquide. Chauffez la plaque à 55 °C.',
    takeaway: [
      'Le liquide se dilate jusqu\'à remplir toute la bouteille : plus de ciel gazeux, la pression explose (≈ +15 bar par degré).',
      'Règle des 80 % : jamais plus de 80 % de liquide dans une bouteille de récupération, et pas au soleil.',
    ],
    quiz: 'g-psat',
    setup: () => makeBench({ A: { V: 1, mRef: 0.88 } }),
    // wait for the hydraulic jump so the learner sees it before the takeaway
    check: (b) => sA(b).phase === 'liquidFull' && sA(b).P > psat(b.c.fluid, vol(b, 'A').T) + 10,
    demo: { actions: [(b) => { setPlate(b, 55); }], seconds: 900 },
  },
  {
    id: 'E5',
    title: 'Comparer les fluides à 20 °C',
    skills: A1('1.07', '1.03'),
    instruction: 'Plaque à 20 °C. Changez de fluide dans le sélecteur et comparez les pressions : essayez au moins 4 fluides (dont le R744).',
    takeaway: [
      'À 20 °C : R744 ≈ 56 bar, R410A/R32 ≈ 13,5 bar, R290 ≈ 7,3 bar, R134a/R1234yf ≈ 4,8 bar (relatifs).',
      'Chaque fluide a ses niveaux de pression : manomètres, flexibles et bouteilles doivent avoir la bonne PS.',
    ],
    quiz: 'g-psat',
    setup: () => makeBench({ A: { V: 5, mRef: massForFill('R32', 5, 20, 0.4) } }),
    check: (b, mem) => {
      const a = sA(b);
      if (a.phase === 'twoPhase' && Math.abs(vol(b, 'A').T - 20) < 1) mem[`f:${b.c.fluid}`] = a.P;
      return Object.keys(mem).length >= 4 && 'f:R744' in mem;
    },
    demo: { actions: (['R744', 'R290', 'R134a'] as const).map((f) => (b: Bench) => changeFluid(b, f)), seconds: 2 },
  },
  {
    id: 'E6',
    title: 'Mélange zéotrope : soutirer la vapeur',
    skills: A1('1.02', '5.05'),
    instruction: 'R407C. Soutirez la vapeur par le haut (−50 g gaz) plusieurs fois et regardez la composition du liquide restant. Comparez avec le soutirage liquide.',
    takeaway: [
      'Les composants volatils (R32, R125) partent d\'abord en vapeur : le liquide restant s\'enrichit en R134a et le mélange n\'est plus conforme.',
      'Un mélange zéotrope (glissement entre bulle et rosée) se charge toujours en phase liquide.',
    ],
    quiz: 'g-psat',
    setup: () => makeBench({ fluid: 'R407C', A: { V: 5, mRef: 1.5 } }),
    check: (b) => (BLENDS[b.c.fluid] ? BLENDS[b.c.fluid]!.x0 - b.blend >= 0.05 : false),
    demo: { actions: [(b) => { for (let i = 0; i < 8; i++) inject(b, 'A', -0.05, 'gas'); }], seconds: 1 },
  },
  {
    id: 'E7',
    title: 'Ajouter de l\'azote',
    skills: A1('1.02'),
    instruction: 'Ajoutez de l\'azote (+5 g N₂) dans la bouteille et comparez l\'aiguille avec l\'échelle Tsat du manomètre.',
    takeaway: [
      'Les pressions s\'additionnent (Dalton) : P = Psat(T) + P(N₂). Le manomètre lit plus haut que ce que dit la température.',
      'Pression trop haute à l\'arrêt par rapport à la température ambiante = incondensables dans le circuit.',
    ],
    quiz: 'g-tsat',
    setup: () => makeBench({ A: { V: 5, mRef: 1 } }),
    check: (b) => {
      const a = sA(b);
      return a.PN2 > 0.5 && a.phase === 'twoPhase' && settled(b) && a.P - psat(b.c.fluid, vol(b, 'A').T) > 0.5;
    },
    demo: { actions: [(b) => { addN2(b, 'A', 0.005); }], seconds: 2 },
  },
  {
    id: 'E8',
    title: 'Tirage au vide avec de l\'humidité',
    skills: A1('1.01'),
    instruction: 'Bouteille pleine d\'air avec quelques gouttes d\'eau. Démarrez la pompe à vide et surveillez le vacuomètre.',
    takeaway: [
      'La pression chute vite puis stagne vers 23 mbar à 20 °C : l\'eau bout sous vide et la pompe aspire sa vapeur tant qu\'il en reste.',
      'Refroidir n\'aide pas (l\'eau bout moins vite) : il faut du temps, de la chaleur et un vide poussé (< 2 mbar) pour sécher un circuit.',
    ],
    quiz: 'g-psat',
    setup: () => makeBench({ A: { V: 5, mAir: airMass(5, 20), mH2O: 0.005 } }),
    check: (b, mem) => {
      const a = sA(b), t = b.c.t;
      const plateau = pumpOn(b) && a.waterLiquid > 0 && Math.abs(a.P - pWater(vol(b, 'A').T)) < 0.004;
      if (!plateau) delete mem.t0;
      else mem.t0 ??= t;
      return plateau && t - mem.t0 >= 20;
    },
    demo: { actions: [(b) => { setPump(b, true); }], seconds: 120 },
  },
  {
    id: 'E9',
    title: 'Ouvrir vers une bouteille vide',
    skills: A1('5.02', '5.05'),
    instruction: 'La bouteille B est vide (sous vide). Ouvrez la vanne entre les deux bouteilles et observez la température de A, puis laissez la plaque la réchauffer.',
    takeaway: [
      'Le liquide de A se vaporise pour remplir B : il prend sa chaleur à la bouteille, qui se refroidit (jusqu\'au givre) et sa pression chute.',
      'Une charge en phase vapeur ralentit vite : réchauffer la bouteille (plaque, bain tiède) fait remonter la pression.',
    ],
    quiz: 'g-psat',
    setup: () => makeBench({ A: { V: 1, mRef: 0.7 }, B: { V: 20 }, second: true }),
    check: (b, mem) => {
      const T = vol(b, 'A').T;
      if (!valveOpen(b)) return false;
      mem.minT = Math.min(mem.minT ?? T, T);
      return mem.minT < b.plate - 8 && T > mem.minT + 10;
    },
    demo: { actions: [(b) => { setValve(b, true); }], seconds: 900 },
  },
  {
    id: 'E10',
    title: 'R744 au-delà de 31 °C',
    skills: A1('1.07'),
    instruction: 'CO₂ (R744) liquide-vapeur à 20 °C. Chauffez la plaque au-dessus de 31 °C, son point critique.',
    takeaway: [
      'Au-delà de 31 °C (73,8 bar abs) il n\'y a plus ni liquide ni vapeur : le niveau disparaît, c\'est l\'état supercritique, sans courbe de saturation.',
      'Une installation CO₂ fonctionne souvent en transcritique : le « condenseur » devient un refroidisseur de gaz.',
    ],
    quiz: 'g-psat',
    setup: () => makeBench({ fluid: 'R744', A: { V: 2, mRef: massForFill('R744', 2, 20, 0.5) } }),
    check: (b) => isSupercritical(b.c.fluid, vol(b, 'A').T),
    demo: { actions: [(b) => { setPlate(b, 36); }], seconds: 900 },
  },
];

export const EXP = Object.fromEntries(EXPERIMENTS.map((e) => [e.id, e])) as Record<ExpId, Experiment>;

export const freeBench = () => makeBench({ A: { V: 5, mRef: 1 } });
