import { describe, expect, it } from 'vitest';
import { dispatch, emittedG, play } from '../game/engine';
import { mulberry32 } from '../learn/quiz';
import type { Action, GameState, Step, Tier } from '../game/types';
import L08 from './L08';

const start = (tier: Tier = 'guide', seed = 7) => L08.setup(tier, mulberry32(seed));
const run = (s: GameState, actions: Action[]) => actions.reduce((x, a) => dispatch(L08, x, a), s);
const ids = (s: GameState) => s.mistakes.map((m) => m.id);
const seedFor = (v: string) => {
  for (let i = 1; i < 200; i++) if (start('examen', i).vars.variant === v) return i;
  throw new Error(v);
};
const perfect = (s: GameState) => {
  const out = play(L08, s, L08.perfectRun(s.tier));
  expect(ids(out)).toEqual([]);
  expect(out.finished?.completed).toBe(true);
  expect(out.finished?.stars).toBe(3);
  expect(emittedG(out)).toBeLessThan(10);
  return out;
};
// pumped down, isolated, locked out: ready to open
const isolated = () => run(start('standard'), [
  { type: 'toggleCap', target: 'valve.liquid' },
  { type: 'setServiceValve', valve: 'valve.liquid', pos: 'closed' },
  { type: 'wait', seconds: 60 },
  { type: 'toggleCap', target: 'valve.gas' },
  { type: 'setServiceValve', valve: 'valve.gas', pos: 'front' },
  { type: 'lockout' },
]);
const opened = () => run(isolated(), [{ type: 'custom', id: 'open-section' }]);

describe('L08', () => {
  it('starts with a high superheat in every tier', () => {
    expect(start('guide').cycle!.SH).toBeGreaterThan(15);
    expect(start('standard').cycle!.SH).toBeGreaterThan(15);
    expect(start('examen', seedFor('small')).cycle!.SH).toBeGreaterThan(15);
  });

  it('perfect run → completed with 3 stars (guide)', () => { perfect(start('guide')); });
  it('perfect run → completed with 3 stars (standard)', () => {
    const s = perfect(start('standard'));
    expect(s.cycle!.SH).toBeGreaterThanOrEqual(5);
    expect(s.cycle!.SH).toBeLessThanOrEqual(8);
  });
  for (const v of ['loose', 'dead', 'big', 'small']) {
    it(`perfect run → completed with 3 stars (examen, ${v})`, () => { perfect(start('examen', seedFor(v))); });
  }

  it('oversized orifice makes the superheat hunt', () => {
    const s = run(start('examen', seedFor('big')), [{ type: 'wait', seconds: 90 }]);
    const shs: number[] = [];
    let x = s;
    for (let i = 0; i < 9; i++) { x = run(x, [{ type: 'wait', seconds: 10 }]); shs.push(x.cycle!.SH); }
    expect(Math.max(...shs) - Math.min(...shs)).toBeGreaterThan(8);
  });

  it('hunting valve: an initial superheat read anywhere in the swing is accepted', () => {
    const s = run(start('examen', seedFor('big')), [{ type: 'wait', seconds: 60 }, { type: 'answer', field: 'SH0', value: 11 }]);
    expect(s.answers.SH0.ok).toBe(true);
  });

  it('dead element: opening right after the KP1 cut is judged on the port.evap gauge, not the slow liquid line', () => {
    let s = run(start('standard'), [{ type: 'toggleCap', target: 'valve.liquid' }, { type: 'setServiceValve', valve: 'valve.liquid', pos: 'closed' }]);
    while (s.running || s.t < 5) s = run(s, [{ type: 'wait', seconds: 0.1 }]);
    s = run(s, [{ type: 'toggleCap', target: 'valve.gas' }, { type: 'setServiceValve', valve: 'valve.gas', pos: 'front' }, { type: 'lockout' },
      { type: 'custom', id: 'open-section' }]);
    expect(ids(s)).toEqual([]);
  });

  it('opening without pump-down → open-under-pressure (critical, ends an exam)', () => {
    let s = start('examen', seedFor('dead'));
    s = run(s, [{ type: 'lockout' }, { type: 'custom', id: 'open-section' }]);
    expect(ids(s)).toContain('open-under-pressure');
    expect(s.finished?.completed).toBe(false);
  });

  it('opening an evacuated section → open-under-vacuum', () => {
    const s = isolated();
    s.circuit.volumes.lp.mRef = 0; s.circuit.volumes.liq.mRef = 0;
    expect(ids(run(s, [{ type: 'custom', id: 'open-section' }]))).toContain('open-under-vacuum');
  });

  it('pumped-down section opens slightly above 0 bar without mistake', () => {
    const s = opened();
    expect(s.vars.openP).toBeGreaterThan(0);
    expect(s.vars.openP).toBeLessThan(0.5);
    expect(ids(s)).toEqual([]);
  });

  it('wrong-fluid body → wrong-body; old nuts → reuse-gasket; no equaliser → equaliser-missing', () => {
    const s = run(opened(), [
      { type: 'custom', id: 'body-N' },
      { type: 'custom', id: 'orifice', value: 4 },
      { type: 'custom', id: 'fit-old' },
      { type: 'custom', id: 'close-section' },
    ]);
    expect(ids(s)).toEqual(['wrong-body', 'reuse-gasket', 'equaliser-missing']);
  });

  it('reused flare nuts leak: the N₂ hold fails', () => {
    const sub = (a: Action): Action => (a.type === 'custom' && a.id === 'fit-new' ? { type: 'custom', id: 'fit-old' } : a);
    const steps = L08.perfectRun('standard').map((st): Step => (s: GameState) => sub(typeof st === 'function' ? st(s) : st));
    const s = play(L08, start('standard'), steps);
    expect(s.vars.n2Ok).toBe(false);
    expect(ids(s)).toEqual(['reuse-gasket', 'skip-tests']);
  });

  it('bulb under the pipe → bulb-wrong-place; uninsulated at start too', () => {
    expect(ids(run(start('guide'), [{ type: 'custom', id: 'bulb-pos-six' }]))).toContain('bulb-wrong-place');
    expect(ids(run(start('guide'), [{ type: 'custom', id: 'bulb-pos-ok' }, { type: 'finish' }]))).toContain('bulb-wrong-place');
  });

  it('three quarter-turns without waiting → big-adjust; waiting 10 min resets', () => {
    expect(ids(run(start('guide'), [{ type: 'adjustTxv', quarterTurns: 2 }, { type: 'adjustTxv', quarterTurns: 1 }]))).toContain('big-adjust');
    expect(ids(run(start('guide'), [{ type: 'adjustTxv', quarterTurns: 2 }, { type: 'wait', seconds: 600 }, { type: 'adjustTxv', quarterTurns: 2 }]))).toEqual([]);
  });

  it('reopening the valves without N₂ test and vacuum → skip-tests', () => {
    const s = run(opened(), [
      { type: 'custom', id: 'body-R32' }, { type: 'custom', id: 'orifice', value: 4 }, { type: 'custom', id: 'fit-new' },
      { type: 'custom', id: 'eq-connect' }, { type: 'custom', id: 'close-section' },
      { type: 'setServiceValve', valve: 'valve.gas', pos: 'back' },
    ]);
    expect(ids(s)).toEqual(['skip-tests']);
  });

  it('wrong diagnosis is a mistake', () => {
    expect(ids(run(start('standard'), [{ type: 'answer', field: 'diag', value: 0 }]))).toContain('wrong-diagnosis');
  });
});
