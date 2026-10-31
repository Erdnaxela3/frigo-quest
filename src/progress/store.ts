import { useSyncExternalStore } from 'react';

export interface ProgressEvent {
  kind: 'quiz' | 'card' | 'level' | 'exam';
  skills: string[];
  score: number; // 0..1
  at: number;
  detail?: Record<string, unknown>;
}

export interface CardState { box: 1 | 2 | 3 | 4 | 5; due: number }
export interface LevelResult { best: number; stars: 0 | 1 | 2 | 3; completed: boolean }

export interface Progress {
  version: 1;
  events: ProgressEvent[];
  cards: Record<string, CardState>;
  levels: Record<string, LevelResult>;
  examDate?: string; // ISO date
}

const KEY = 'frigoquest.progress';
const MAX_EVENTS = 5000;
const empty = (): Progress => ({ version: 1, events: [], cards: {}, levels: {} });

export function isProgress(x: unknown): x is Progress {
  const p = x as Progress;
  return !!p && p.version === 1 && Array.isArray(p.events) && typeof p.cards === 'object' && p.cards !== null
    && typeof p.levels === 'object' && p.levels !== null;
}

export let loadError: string | null = null;

function load(): Progress {
  const raw = localStorage.getItem(KEY);
  if (!raw) return empty();
  try {
    const p = JSON.parse(raw);
    if (isProgress(p)) return p;
    throw new Error('format');
  } catch {
    localStorage.setItem(`${KEY}.corrupt`, raw);
    loadError = 'Progression illisible : une copie a été conservée (frigoquest.progress.corrupt) et une nouvelle progression a démarré.';
    return empty();
  }
}

let state: Progress = typeof localStorage === 'undefined' ? empty() : load();
const listeners = new Set<() => void>();

function commit(next: Progress) {
  state = next;
  if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}

export const getProgress = () => state;

export function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export const useProgress = () => useSyncExternalStore(subscribe, getProgress);

export function record(e: Omit<ProgressEvent, 'at'> & { at?: number }) {
  const events = [...state.events, { ...e, at: e.at ?? Date.now() }].slice(-MAX_EVENTS);
  commit({ ...state, events });
}

export function setCard(id: string, c: CardState) {
  commit({ ...state, cards: { ...state.cards, [id]: c } });
}

export function setLevelResult(id: string, score: number, stars: 0 | 1 | 2 | 3) {
  const prev = state.levels[id];
  const best = Math.max(prev?.best ?? 0, score);
  commit({
    ...state,
    levels: { ...state.levels, [id]: { best, stars: Math.max(prev?.stars ?? 0, stars) as 0 | 1 | 2 | 3, completed: true } },
  });
}

export function setExamDate(iso: string | undefined) {
  commit({ ...state, examDate: iso });
}

export const exportProgress = () => JSON.stringify(state, null, 2);

/** Throws on invalid input; never overwrites progress with garbage. */
export function importProgress(json: string) {
  const p = JSON.parse(json);
  if (!isProgress(p)) throw new Error('Fichier de progression invalide');
  commit(p);
}

export function resetProgress() {
  commit(empty());
}

/** Mastery per skill: EWMA (α = 0.3) of scores in chronological order. Missing = never seen. */
export function mastery(events: ProgressEvent[] = state.events): Record<string, number> {
  const m: Record<string, number> = {};
  for (const e of events) for (const s of e.skills) m[s] = s in m ? 0.7 * m[s] + 0.3 * e.score : e.score;
  return m;
}
