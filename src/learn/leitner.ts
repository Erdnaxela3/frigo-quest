import type { CardState } from '../progress/store';
import type { Flashcard } from './types';

export const INTERVALS_DAYS = [0, 1, 3, 7, 21];

/** Due dates fall on local midnight so a card answered at 23:59 with a 1-day interval is due the next calendar day. */
export function nextState(c: CardState | undefined, knew: boolean, now: number): CardState {
  const box = (knew ? Math.min(5, (c?.box ?? 1) + 1) : 1) as CardState['box'];
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + INTERVALS_DAYS[box - 1]);
  return { box, due: d.getTime() };
}

/** Overdue cards first (oldest due first), then never-seen cards in deck order. */
export function dueCards(cards: Flashcard[], states: Record<string, CardState>, now: number, max = 30): Flashcard[] {
  const seen = cards.filter((c) => states[c.id] && states[c.id].due <= now).sort((a, b) => states[a.id].due - states[b.id].due);
  const fresh = cards.filter((c) => !states[c.id]);
  return [...seen, ...fresh].slice(0, max);
}
