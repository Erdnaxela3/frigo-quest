import { describe, expect, it } from 'vitest';
import { dispatch, emittedG, play } from '../game/engine';
import { mulberry32 } from '../learn/quiz';
import type { Action, GameState, Tier } from '../game/types';
import L03 from './L03';

const start = (tier: Tier = 'guide', seed = 7) => L03.setup(tier, mulberry32(seed));
const run = (s: GameState, actions: Action[]) => actions.reduce((x, a) => dispatch(L03, x, a), s);

// perfect run with the verdict answer replaced
function playVerdict(tier: Tier, verdict: number) {
  let s = start(tier);
  for (const st of L03.perfectRun(tier)) {
    let a = typeof st === 'function' ? st(s) : st;
    if (a.type === 'answer' && a.field === 'verdict') a = { ...a, value: verdict };
    s = dispatch(L03, s, a);
  }
  return s;
}

describe('L03', () => {
  for (const [tier, seed] of [['guide', 7], ['standard', 7], ['examen', 7], ['examen', 5 /* leak */]] as [Tier, number][]) {
    it(`perfect run → completed with 3 stars (${tier}, seed ${seed})`, () => {
      const s = play(L03, start(tier, seed), L03.perfectRun(tier));
      expect(s.mistakes.map((m) => m.id)).toEqual([]);
      expect(s.finished?.completed).toBe(true);
      expect(s.finished?.stars).toBe(3);
      expect(emittedG(s)).toBe(0);
      expect(s.circuit.emitted.n2).toBeGreaterThan(0.1); // N₂ vented, not scored
    });
  }

  it('choosing the oxygen bottle → wrong-gas-oxygen, fails the exam', () => {
    const s = run(start('examen'), [{ type: 'custom', id: 'gas-o2' }]);
    expect(s.mistakes.map((m) => m.id)).toEqual(['wrong-gas-oxygen']);
    expect(s.finished?.completed).toBe(false);
  });

  it('pressurising with the solenoid closed → solenoid-closed', () => {
    const s = run(start(), [
      { type: 'custom', id: 'gas-n2' },
      { type: 'toggleCap', target: 'port.hp' },
      { type: 'connectHose', hose: 'red', end: 'port', socket: 'port.hp' },
      { type: 'connectHose', hose: 'yellow', end: 'port', socket: 'n2' },
      { type: 'toggleManifold', valve: 'hp' },
      { type: 'setN2', setpoint: 11 },
      { type: 'device', device: 'n2', on: true },
      { type: 'wait', seconds: 60 },
    ]);
    expect(s.mistakes.map((m) => m.id)).toContain('solenoid-closed');
  });

  it('standard: the sun masks the leak, P2 > P1, "étanche" → no-temp-correction', () => {
    const s = playVerdict('standard', 0);
    expect(s.answers.P2.value).toBeGreaterThan(s.answers.P1.value);
    expect(s.answers.P2.value).toBeLessThan(s.answers.P2c.value - 0.3);
    expect(s.mistakes.map((m) => m.id)).toContain('no-temp-correction');
  });

  it('correction in bar rel / °C → relative-units', () => {
    let s = start('standard');
    for (const st of L03.perfectRun('standard')) {
      let a = typeof st === 'function' ? st(s) : st;
      if (a.type === 'answer' && a.field === 'P2c') a = { ...a, value: s.answers.P1.value * s.answers.T2.value / s.answers.T1.value };
      s = dispatch(L03, s, a);
      if (a.type === 'answer' && a.field === 'P2c') break;
    }
    expect(s.mistakes.map((m) => m.id)).toEqual(['relative-units']);
  });

  it('finishing without recording → no-record', () => {
    const s = play(L03, start(), L03.perfectRun('guide').filter((st) => typeof st === 'function' || st.type !== 'custom' || st.id !== 'record'));
    expect(s.mistakes.map((m) => m.id)).toContain('no-record');
    expect(s.finished?.completed).toBe(false);
  });
});
