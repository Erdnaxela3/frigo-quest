import type { Question, QuestionGenerator } from './types';
import type { ProgressEvent, LevelResult } from '../progress/store';
import { SKILL_BY_ID } from './skills';
import { grade, shuffle } from './quiz';

type Rng = () => number;

// The arrêté of 21/11/2025 publishes no pass mark (specs/00-reglementation.md §1): 70 % is our own default.
export const A1_PASS = 0.7;
export const A1_DURATION = 75 * 60; // 15 min A1-specific + 1 h tronc commun
export const A1_SIZE = 40;
export const A1_FIXED_GROUPS = ['1', '2', '3', '4', '5', '10', '11', '12'];
export const A1_RANDOM_GROUPS = ['6', '7', '8', '9'];
const QUOTA: Record<string, number> = { '1': 7, '2': 3, '3': 4, '4': 5, '5': 5, '10': 2, '11': 3, '12': 4 };
const DRAWN_QUOTA = 5;
const N_GEN = 2;

export const EFFICIENCY_SKILLS = ['A1:6.08', 'A1:7.10', 'A1:8.11', 'A1:9.10', 'A1:12.14'];
const ALT_FLUID_SKILLS = ['A1:1.07', 'A1:11.01', 'A1:11.03', 'A1:11.04'];

const text = (q: Question) => `${q.prompt} ${'choices' in q ? q.choices.join(' ') : ''}`;
const aboutAltFluids = (q: Question) => q.skills.some((s) => ALT_FLUID_SKILLS.includes(s));
// "t CO₂e" / "CO₂ équivalent" is about GWP accounting, not about R744
export const isCO2 = (q: Question) => aboutAltFluids(q) && /R744|CO[₂2](?!\s*(e\b|éq|eq))/i.test(text(q));
export const isNH3 = (q: Question) => aboutAltFluids(q) && /R717|NH[₃3]|ammoniac/i.test(text(q));
export const isEfficiency = (q: Question) => q.skills.some((s) => EFFICIENCY_SKILLS.includes(s));

export const groupsOf = (q: { skills: string[] }) => [...new Set(q.skills.map((s) => SKILL_BY_ID[s]?.group ?? '?'))];
const touches = (g: string) => (q: Question) => q.skills.some((s) => SKILL_BY_ID[s]?.group === g);

export function buildA1Exam(rng: Rng, pool: Question[], gens: QuestionGenerator[]): { questions: Question[]; group: string } {
  const group = A1_RANDOM_GROUPS[Math.floor(rng() * A1_RANDOM_GROUPS.length)];
  const allowed = new Set([...A1_FIXED_GROUPS, group]);
  // every skill must sit in an allowed group, otherwise a second group of 6–9 would leak in
  const ok = (skills: string[]) => skills.every((s) => allowed.has(SKILL_BY_ID[s]?.group));
  const eligible = shuffle(pool.filter((q) => ok(q.skills)), rng);
  const out: Question[] = [];
  const ids = new Set<string>();
  const add = (q: Question) => {
    if (ids.has(q.id)) return false;
    ids.add(q.id);
    out.push(q);
    return true;
  };
  const take = (pred: (q: Question) => boolean, n: number) => {
    for (const q of eligible) {
      if (n <= 0) return;
      if (!ids.has(q.id) && pred(q)) { add(q); n--; }
    }
  };

  take(isCO2, 1);
  take(isNH3, 1);
  take(isEfficiency, 1);
  for (const [g, n] of Object.entries({ ...QUOTA, [group]: DRAWN_QUOTA })) take(touches(g), n - out.filter(touches(g)).length);
  const okGens = gens.filter((g) => ok(g.skills));
  for (let made = 0, tries = 0; okGens.length && made < N_GEN && tries < 20; tries++) {
    if (add(okGens[Math.floor(rng() * okGens.length)].make(rng))) made++;
  }
  take(() => true, A1_SIZE - out.length);
  return { questions: shuffle(out, rng), group };
}

export type Answers = Record<string, unknown>;
export interface Tally { ok: number; n: number }
export interface ExamScore { correct: number; total: number; score: number; results: boolean[]; byGroup: Record<string, Tally>; bySkill: Record<string, Tally> }

export function scoreExam(questions: Question[], answers: Answers): ExamScore {
  const results = questions.map((q) => answers[q.id] !== undefined && grade(q, answers[q.id]));
  const byGroup: Record<string, Tally> = {};
  const bySkill: Record<string, Tally> = {};
  const bump = (m: Record<string, Tally>, k: string, ok: boolean) => {
    m[k] ??= { ok: 0, n: 0 };
    m[k].n++;
    if (ok) m[k].ok++;
  };
  questions.forEach((q, i) => {
    for (const g of groupsOf(q)) bump(byGroup, g, results[i]);
    for (const s of q.skills) bump(bySkill, s, results[i]);
  });
  const correct = results.filter(Boolean).length;
  return { correct, total: questions.length, score: questions.length ? correct / questions.length : 0, results, byGroup, bySkill };
}

// CAP IFCA EP3 barème /100 (specs/00-reglementation.md §3). Relevés & documents are filled inside each level.
export const EP3_PARTS = [
  { label: 'Vidange azote + tirage au vide', points: 15, levels: ['L04'] },
  { label: 'Charge selon plaque signalétique', points: 20, levels: ['L06'] },
  { label: 'Remise en marche en sécurité', points: 15, levels: ['L07'] },
  { label: 'Réglage du pressostat BP', points: 30, levels: ['L07'] },
  { label: 'Relevés de fonctionnement et documents', points: 20, levels: ['L04', 'L06', 'L07'] },
];
export const EP3_LEVELS = ['L04', 'L06', 'L07'];

/** Best exam-tier score (0–100) per level, falling back to the all-tier best. */
export function ep3Bests(events: ProgressEvent[], levels: Record<string, LevelResult>) {
  const out: Record<string, { best: number; examTier: boolean } | undefined> = {};
  for (const id of EP3_LEVELS) {
    const exam = events.filter((e) => e.kind === 'level' && e.detail?.level === id && e.detail?.tier === 'examen');
    if (exam.length) out[id] = { best: Math.max(...exam.map((e) => Math.round(e.score * 100))), examTier: true };
    else if (levels[id]) out[id] = { best: levels[id].best, examTier: false };
  }
  return out;
}

export const ep3Points = (bests: Record<string, { best: number } | undefined>) =>
  EP3_PARTS.map((p) => (p.points * p.levels.reduce((s, l) => s + (bests[l]?.best ?? 0), 0)) / (100 * p.levels.length));

export const ep3Mark = (bests: Record<string, { best: number } | undefined>) =>
  Math.round((ep3Points(bests).reduce((a, b) => a + b, 0) / 5) * 10) / 10;
