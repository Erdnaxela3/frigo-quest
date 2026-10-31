import { describe, expect, it } from 'vitest';
import { dispatch, emittedG, play } from '../game/engine';
import { mulberry32 } from '../learn/quiz';
import type { Action, Tier } from '../game/types';
import L01 from './L01';

const start = (tier: Tier = 'guide') => L01.setup(tier, mulberry32(7));
const run = (s: ReturnType<typeof start>, actions: Action[]) => actions.reduce((x, a) => dispatch(L01, x, a), s);

describe('L01', () => {
  for (const tier of ['guide', 'standard', 'examen'] as Tier[]) {
    it(`perfect run → completed with 3 stars (${tier})`, () => {
      const s = play(L01, start(tier), L01.perfectRun(tier));
      expect(s.mistakes.map((m) => m.id)).toEqual([]);
      expect(s.finished?.completed).toBe(true);
      expect(s.finished?.stars).toBe(3);
      expect(emittedG(s)).toBeLessThan(10);
    });
  }

  it('blue hose on port.hp → hose-swap', () => {
    const s = run(start(), [
      { type: 'toggleCap', target: 'port.hp' },
      { type: 'connectHose', hose: 'blue', end: 'port', socket: 'port.hp' },
    ]);
    expect(s.mistakes.map((m) => m.id)).toContain('hose-swap');
  });

  it('disconnecting the HP hose without transfer vents > 5 g → vent-hose', () => {
    const s = run(start(), [
      { type: 'toggleCap', target: 'port.hp' },
      { type: 'connectHose', hose: 'red', end: 'port', socket: 'port.hp' },
      { type: 'wait', seconds: 600 },
      { type: 'disconnectHose', hose: 'red', end: 'port' },
    ]);
    expect(emittedG(s)).toBeGreaterThan(5);
    expect(s.mistakes.map((m) => m.id)).toContain('vent-hose');
  });

  it('front-seating the gas valve while running is critical and ends an exam', () => {
    const s = run(start('examen'), [
      { type: 'toggleCap', target: 'valve.gas' },
      { type: 'setServiceValve', valve: 'valve.gas', pos: 'front' },
    ]);
    expect(s.mistakes.map((m) => m.id)).toEqual(['front-seat']);
    expect(s.finished?.completed).toBe(false);
  });
});
