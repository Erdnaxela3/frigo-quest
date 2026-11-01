import type { FluidId } from '../../physics/types';
import { FLUIDS, psat, rhoLiq, tco2e, leakCheckMonths, toAbs, toRel, tsat } from '../../physics/refrigerants';
import type { Question, QuestionGenerator } from '../types';

type Rng = () => number;

const int = (rng: Rng, a: number, b: number) => a + Math.floor(rng() * (b - a + 1));
const pick = <T,>(rng: Rng, arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];
const round = (x: number, d = 1) => Math.round(x * 10 ** d) / 10 ** d;
const fr = (x: number, d = 1) => x.toFixed(d).replace('.', ',').replace(/^-0(,0+)?$/, '0$1');

// Evaporating / condensing temperature ranges (°C) that make sense for each fluid.
const EVAP: Partial<Record<FluidId, [number, number]>> = {
  R32: [-20, 10], R410A: [-20, 10], R134a: [-25, 10], R290: [-35, 5], R1234yf: [-15, 10],
  R404A: [-40, -5], R407C: [-10, 10], R449A: [-35, -5],
};
const COND: Partial<Record<FluidId, [number, number]>> = {
  R32: [30, 50], R410A: [30, 50], R134a: [30, 55], R290: [30, 50], R1234yf: [30, 55],
  R404A: [30, 45], R407C: [30, 50], R449A: [30, 45],
};
const PSAT_RANGE: Partial<Record<FluidId, [number, number]>> = {
  R32: [-30, 50], R410A: [-30, 50], R134a: [-30, 60], R290: [-40, 50], R1234yf: [-30, 60], R404A: [-40, 45], R744: [-40, 25],
};
const PURE = Object.keys(PSAT_RANGE) as FluidId[];
const ALL = Object.keys(EVAP) as FluidId[];
const zeo = (f: FluidId) => FLUIDS[f].glide >= 1;

const numeric = (q: Omit<Extract<Question, { type: 'numeric' }>, 'type' | 'confidence'>): Question => ({
  type: 'numeric', confidence: 'ok', ...q,
});

export const GENERATORS: QuestionGenerator[] = [
  {
    id: 'g-psat',
    skills: ['A1:1.03', 'A1:1.01'],
    label: 'Pression de saturation à partir de la température',
    make: (rng) => {
      const f = pick(rng, PURE);
      const [a, b] = PSAT_RANGE[f]!;
      const T = int(rng, a, b);
      const abs = rng() < 0.3;
      const pa = psat(f, T, 'dew');
      const pr = toRel(pa);
      const v = abs ? pa : pr;
      return numeric({
        id: `g-psat-${f}-${T}${abs ? '-abs' : ''}`,
        skills: ['A1:1.03', 'A1:1.01'],
        prompt: abs
          ? `Quelle est la pression de saturation absolue du ${f} à ${T} °C (bar abs) ?`
          : `${f} saturé à ${T} °C : quelle pression doit indiquer le manomètre (bar relatif) ?`,
        answer: { value: round(v, 2), tol: Math.max(0.3, round(0.03 * Math.abs(v), 1)) },
        unit: 'bar',
        explain: abs
          ? `Table ${f} : à ${T} °C, Psat ≈ ${fr(pa, 2)} bar abs (soit ${fr(pr, 2)} bar au manomètre, qui affiche P abs − 1,01).`
          : `Table ${f} : à ${T} °C, Psat ≈ ${fr(pa, 2)} bar abs. Le manomètre affiche la pression relative : ${fr(pa, 2)} − 1,01 = ${fr(pr, 2)} bar.`,
      });
    },
  },
  {
    id: 'g-tsat',
    skills: ['A1:1.03', 'A1:4.04'],
    label: 'Température de saturation à partir de la pression lue',
    make: (rng) => {
      const f = pick(rng, PURE.filter((x) => x !== 'R744'));
      const [a, b] = PSAT_RANGE[f]!;
      const pr = round(toRel(psat(f, a + rng() * (b - a))), 1);
      const T = tsat(f, toAbs(pr));
      return numeric({
        id: `g-tsat-${f}-${fr(pr)}`,
        skills: ['A1:1.03', 'A1:4.04'],
        prompt: `Circuit au ${f} : le manomètre indique ${fr(pr)} bar (relatif) sur une zone en mélange liquide-vapeur. Quelle est la température de saturation (°C) ?`,
        answer: { value: round(T), tol: 1 },
        unit: '°C',
        explain: `Pression absolue = ${fr(pr)} + 1,01 = ${fr(toAbs(pr), 2)} bar abs. La table ${f} donne Tsat ≈ ${fr(T)} °C.`,
      });
    },
  },
  {
    id: 'g-superheat',
    skills: ['A1:1.03', 'A1:4.04'],
    label: 'Surchauffe à partir de la BP et de la température d\'aspiration',
    make: (rng) => {
      const f = pick(rng, ALL);
      const [a, b] = EVAP[f]!;
      const pr = round(toRel(psat(f, a + rng() * (b - a), 'dew')), 1);
      const te = tsat(f, toAbs(pr), 'dew');
      const tasp = Math.round(te + int(rng, 3, 14));
      const sh = tasp - te;
      return numeric({
        id: `g-superheat-${f}-${fr(pr)}-${tasp}`,
        skills: ['A1:1.03', 'A1:4.04'],
        prompt: `${f} : manomètre BP ${fr(pr)} bar (relatif), température mesurée sur la ligne d'aspiration ${tasp} °C. Quelle est la surchauffe (K) ?`,
        answer: { value: round(sh), tol: 1 },
        unit: 'K',
        explain: `${fr(pr)} bar rel = ${fr(toAbs(pr), 2)} bar abs → température d'évaporation${zeo(f) ? ' (rosée, fluide zéotrope)' : ''} ≈ ${fr(te)} °C. Surchauffe = T aspiration − T évaporation = ${tasp} − (${fr(te)}) = ${fr(sh)} K.`,
      });
    },
  },
  {
    id: 'g-subcooling',
    skills: ['A1:1.03', 'A1:4.04'],
    label: 'Sous-refroidissement à partir de la HP et de la température liquide',
    make: (rng) => {
      const f = pick(rng, ALL);
      const [a, b] = COND[f]!;
      const pr = round(toRel(psat(f, a + rng() * (b - a), 'bubble')), 1);
      const tc = tsat(f, toAbs(pr), 'bubble');
      const tliq = Math.round(tc - int(rng, 2, 10));
      const sc = tc - tliq;
      return numeric({
        id: `g-subcooling-${f}-${fr(pr)}-${tliq}`,
        skills: ['A1:1.03', 'A1:4.04'],
        prompt: `${f} : manomètre HP ${fr(pr)} bar (relatif), température de la ligne liquide ${tliq} °C. Quel est le sous-refroidissement (K) ?`,
        answer: { value: round(sc), tol: 1 },
        unit: 'K',
        explain: `${fr(pr)} bar rel = ${fr(toAbs(pr), 2)} bar abs → température de condensation${zeo(f) ? ' (bulle, fluide zéotrope)' : ''} ≈ ${fr(tc)} °C. Sous-refroidissement = T condensation − T liquide = ${fr(tc)} − ${tliq} = ${fr(sc)} K.`,
      });
    },
  },
  {
    id: 'g-tco2e',
    skills: ['A1:2.02', 'A1:4.09'],
    label: 'Charge en tonnes équivalent CO₂',
    make: (rng) => {
      const f = pick(rng, (Object.keys(FLUIDS) as FluidId[]).filter((x) => FLUIDS[x].gwp > 100));
      const kg = round(0.5 + rng() * 79.5, 1);
      const t = tco2e(f, kg);
      return numeric({
        id: `g-tco2e-${f}-${fr(kg)}`,
        skills: ['A1:2.02', 'A1:4.09'],
        prompt: `Une installation contient ${fr(kg)} kg de ${f} (PRP ${FLUIDS[f].gwp}). Combien de tonnes équivalent CO₂ cela représente-t-il ?`,
        answer: { value: round(t, 2), tol: Math.max(0.05, round(0.02 * t, 2)) },
        unit: 't CO₂e',
        explain: `t CO₂e = kg × PRP / 1000 = ${fr(kg)} × ${FLUIDS[f].gwp} / 1000 = ${fr(t, 2)} t CO₂e.`,
      });
    },
  },
  {
    id: 'g-leakcheck',
    skills: ['A1:4.09', 'A1:4.02', 'A1:2.02'],
    label: 'Périodicité du contrôle d\'étanchéité',
    make: (rng) => {
      const f = pick(rng, ['R32', 'R410A', 'R134a', 'R404A', 'R407C', 'R449A'] as FluidId[]);
      const kgMin = 5000 / FLUIDS[f].gwp;
      // log-uniform from the 5 t threshold up to ~1000 t so all three bands come up
      const kg = round(kgMin * 1.05 * Math.exp(rng() * Math.log(200)), 1);
      const lds = rng() < 0.3;
      const t = tco2e(f, kg);
      const m = leakCheckMonths(t, lds)!;
      const band = t >= 500 ? '≥ 500 t → 3 mois' : t >= 50 ? '≥ 50 t → 6 mois' : '≥ 5 t → 12 mois';
      return {
        ...numeric({
          id: `g-leakcheck-${f}-${fr(kg)}${lds ? '-lds' : ''}`,
          skills: ['A1:4.09', 'A1:4.02', 'A1:2.02'],
          prompt: `Installation non hermétique chargée de ${fr(kg)} kg de ${f}${lds ? ', équipée d\'un système de détection de fuites' : ', sans système de détection de fuites'}. Quelle est la périodicité du contrôle d'étanchéité (mois) ?`,
          answer: { value: m, tol: 0 },
          unit: 'mois',
          explain: `${fr(kg)} × ${FLUIDS[f].gwp} / 1000 = ${fr(t)} t CO₂e (${band})${lds ? ', doublée avec un système de détection de fuites' : ''} : ${m} mois.`,
        }),
        confidence: 'ok',
      };
    },
  },
  {
    id: 'g-n2-temp',
    skills: ['A1:3.02', 'A1:1.01'],
    label: 'Correction de température d\'un essai à l\'azote',
    make: (rng) => {
      const p1 = int(rng, 10, 40);
      const t1 = int(rng, 5, 35);
      let t2 = int(rng, 0, 35);
      if (t2 === t1) t2 = t1 > 17 ? t1 - 8 : t1 + 8;
      const p2a = (toAbs(p1) * (t2 + 273.15)) / (t1 + 273.15);
      const p2 = toRel(p2a);
      return numeric({
        id: `g-n2-temp-${p1}-${t1}-${t2}`,
        skills: ['A1:3.02', 'A1:1.01'],
        prompt: `Essai d'étanchéité à l'azote : ${p1} bar (relatif) à ${t1} °C. Le lendemain la température est de ${t2} °C. Sans fuite, quelle pression relative devrait-on lire (bar) ?`,
        answer: { value: round(p2, 2), tol: 0.1 },
        unit: 'bar',
        explain: `À volume constant P/T est constant, en absolu et en kelvins : P₂ = (${p1} + 1,01) × (${t2} + 273,15) / (${t1} + 273,15) = ${fr(p2a, 2)} bar abs, soit ${fr(p2, 2)} bar relatif.`,
      });
    },
  },
  {
    id: 'g-cylinder-fill',
    skills: ['A1:5.02', 'A1:5.03'],
    label: 'Charge maximale d\'une bouteille de récupération (règle des 80 %)',
    make: (rng) => {
      const f = pick(rng, ['R32', 'R410A', 'R134a', 'R404A', 'R407C', 'R449A', 'R1234yf'] as FluidId[]);
      const wc = pick(rng, [10, 12, 13.6, 20, 22.7, 26.2, 27.2, 40, 50, 61]);
      const T = int(rng, 10, 40);
      const rho = rhoLiq(f, T) / 1000;
      const m = 0.8 * wc * rho;
      return numeric({
        id: `g-cylinder-fill-${f}-${fr(wc)}-${T}`,
        skills: ['A1:5.02', 'A1:5.03'],
        prompt: `Bouteille de récupération de ${String(wc).replace(".", ",")} L de capacité en eau, dédiée au ${f}. Masse volumique du liquide à ${T} °C : ${fr(rho, 3)} kg/L. Quelle masse maximale de fluide peut-on y transférer (kg) ?`,
        answer: { value: round(m, 2), tol: Math.max(0.2, round(0.02 * m, 1)) },
        unit: 'kg',
        explain: `On ne remplit jamais plus de 80 % du volume en liquide : 0,8 × ${String(wc).replace(".", ",")} L × ${fr(rho, 3)} kg/L = ${fr(m, 2)} kg.`,
      });
    },
  },
];
