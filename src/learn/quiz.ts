import type { Question, QuestionGenerator } from './types';
import { SKILL_BY_ID } from './skills';
import { GENERATORS, QUESTIONS } from './content';

type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(arr: readonly T[], rng: Rng = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Accepts "8,1", "8.1", " -0,5 ", "1 200" (French thousands spacing) and the Unicode minus. */
export function parseNumber(s: string): number | null {
  const t = s.trim().replace(/\s+/g, '').replace('−', '-').replace(',', '.');
  return /^[-+]?(\d+\.?\d*|\.\d+)$/.test(t) ? Number(t) : null;
}

/** Order answers are the original choice indices in the user's order. */
export function grade(q: Question, a: unknown): boolean {
  switch (q.type) {
    case 'single':
      return a === q.answer;
    case 'multi':
      return Array.isArray(a) && new Set(a).size === a.length && a.length === q.answer.length
        && q.answer.every((i) => a.includes(i));
    case 'numeric': {
      const v = typeof a === 'number' ? a : typeof a === 'string' ? parseNumber(a) : null;
      // epsilon: 8.3 - 8 = 0.30000000000000071 must still be inside ±0.3
      return v !== null && Number.isFinite(v) && Math.abs(v - q.answer.value) <= q.answer.tol + 1e-9;
    }
    case 'order':
      return Array.isArray(a) && a.length === q.choices.length && a.every((x, i) => x === i);
  }
}

function topUp(out: Question[], n: number, gens: QuestionGenerator[], rng: Rng) {
  while (gens.length && out.length < n) out.push(gens[Math.floor(rng() * gens.length)].make(rng));
  return out;
}

function pickWhere(pred: (skills: string[]) => boolean, n: number, rng: Rng, pool: Question[], gens: QuestionGenerator[]) {
  const out = shuffle(pool.filter((q) => pred(q.skills)), rng).slice(0, n);
  return topUp(out, n, gens.filter((g) => pred(g.skills)), rng);
}

export const inGroup = (group: string) => (skills: string[]) => skills.some((s) => SKILL_BY_ID[s]?.group === group);

export function pickTheme(group: string, n: number, rng: Rng, pool = QUESTIONS, gens = GENERATORS): Question[] {
  return pickWhere(inGroup(group), n, rng, pool, gens);
}

export function pickForSkills(skills: string[], n: number, rng: Rng, pool = QUESTIONS, gens = GENERATORS): Question[] {
  return pickWhere((qs) => qs.some((s) => skills.includes(s)), n, rng, pool, gens);
}

/** Round-robin over the 5 weakest skills (unseen = 0, seen ranks first on ties), then generators, then random. */
export function pickWeakest(n: number, m: Record<string, number>, rng: Rng, pool = QUESTIONS, gens = GENERATORS): Question[] {
  const skills = shuffle([...new Set([...pool, ...gens].flatMap((x) => x.skills))], rng)
    .sort((a, b) => (m[a] ?? 0) - (m[b] ?? 0) || Number(b in m) - Number(a in m))
    .slice(0, 5);
  const buckets = skills.map((s) => shuffle(pool.filter((q) => q.skills.includes(s)), rng));
  const out: Question[] = [];
  const taken = new Set<string>();
  const take = (q: Question | undefined) => {
    if (q && !taken.has(q.id)) { taken.add(q.id); out.push(q); }
  };
  for (let i = 0; out.length < n && buckets.some((b) => b.length); i++) take(buckets[i % buckets.length].shift());
  topUp(out, n, gens.filter((g) => g.skills.some((s) => skills.includes(s))), rng);
  for (const q of shuffle(pool, rng)) {
    if (out.length >= n) break;
    take(q);
  }
  return out;
}
