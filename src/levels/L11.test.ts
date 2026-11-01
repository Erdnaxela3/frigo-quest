import { describe, expect, it } from 'vitest';
import { dispatch, emittedG, play } from '../game/engine';
import { mulberry32 } from '../learn/quiz';
import { gaugeP } from '../game/platineModel';
import { psat, toRel } from '../physics/refrigerants';
import type { Action, GameState, Tier } from '../game/types';
import L11 from './L11';

const start = (tier: Tier = 'guide', seed = 7) => L11.setup(tier, mulberry32(seed));
const run = (s: GameState, actions: Action[]) => actions.reduce((x, a) => dispatch(L11, x, a), s);
const seedFor = (v: string) => { for (let i = 1; ; i++) if (start('examen', i).vars.variant === v) return i; };
const ids = (s: GameState) => s.mistakes.map((m) => m.id);
const connect: Action[] = [
  { type: 'toggleCap', target: 'port.hp' },
  { type: 'connectHose', hose: 'red', end: 'port', socket: 'port.hp' },
  { type: 'wait', seconds: 60 },
];
const standstill: Action[] = [...connect, { type: 'setUnit', on: false }, { type: 'custom', id: 'fan' }, { type: 'wait', seconds: 600 }];

describe('L11', () => {
  const cases: [Tier, number][] = [['guide', 7], ['standard', 7], ...['air', 'over', 'dirty', 'fan'].map((v) => ['examen', seedFor(v)] as [Tier, number])];
  for (const [tier, seed] of cases) {
    it(`perfect run → completed with 3 stars (${tier} ${start(tier, seed).vars.variant})`, () => {
      const s = play(L11, start(tier, seed), L11.perfectRun(tier));
      expect(ids(s)).toEqual([]);
      expect(s.finished?.completed).toBe(true);
      expect(s.finished?.stars).toBe(3);
      expect(emittedG(s)).toBeLessThan(5);
    });
  }

  it('air: standstill HP is well above Psat(Tamb), and back to normal after recover / vacuum / recharge', () => {
    let s = run(start(), standstill);
    expect(gaugeP(s, 'mf.hp') - psat('R32', 30, 'bubble')).toBeGreaterThan(2.5);
    s = run(s, [{ type: 'custom', id: 'recover' }, { type: 'custom', id: 'vacuum' }, { type: 'custom', id: 'recharge' },
      { type: 'setUnit', on: true }, { type: 'wait', seconds: 180 }]);
    expect(toRel(gaugeP(s, 'mf.hp'))).toBeCloseTo(25, 0);
  });

  it('standstill reading taken too early is not credited', () => {
    const s = run(start(), [...connect, { type: 'setUnit', on: false }, { type: 'wait', seconds: 30 }]);
    const t = dispatch(L11, s, { type: 'answer', field: 'HPstill', value: Math.round(gaugeP(s, 'mf.hp') * 100) / 100 });
    expect(t.answers.HPstill.ok).toBe(true);
    expect(t.vars.standstill).toBeFalsy();
  });

  it('manual purge is critical: emission, and an exam ends', () => {
    const s = run(start('examen', seedFor('air')), [{ type: 'answer', field: 'remedy', value: 0 }]);
    expect(ids(s)).toContain('manual-purge');
    expect(emittedG(s)).toBeGreaterThan(20);
    expect(s.finished?.completed).toBe(false);
  });

  it('verdict without standstill test → no-standstill', () => {
    const s = run(start(), [...connect, { type: 'answer', field: 'verdict', value: 0 }]);
    expect(ids(s)).toEqual(['no-standstill']);
  });

  it('Psat given in bar rel → relative-vs-abs', () => {
    const s = run(start(), [{ type: 'answer', field: 'Psat', value: Math.round(toRel(psat('R32', 30, 'bubble')) * 100) / 100 }]);
    expect(ids(s)).toEqual(['relative-vs-abs']);
  });

  it('removing charge until HP is normal → remove-charge-guess', () => {
    const s = run(start(), [{ type: 'answer', field: 'remedy', value: 1 }]);
    expect(ids(s)).toEqual(['remove-charge-guess']);
  });

  it('standard decoy: blaming only the dirty condenser → wrong-verdict', () => {
    const s0 = run(start('standard'), [...standstill, { type: 'custom', id: 'clean' }]);
    const s = run(s0, [{ type: 'answer', field: 'HPstill', value: Math.round(gaugeP(s0, 'mf.hp') * 100) / 100 }, { type: 'answer', field: 'verdict', value: 2 }]);
    expect(s.vars.standstill).toBe(true);
    expect(ids(s)).toEqual(['wrong-verdict']);
  });

  it('overcharge: wrong remedy (automatic purger) → wrong-remedy', () => {
    const s = run(start('examen', seedFor('over')), [{ type: 'answer', field: 'remedy', value: 5 }]);
    expect(ids(s)).toEqual(['wrong-remedy']);
  });
});
