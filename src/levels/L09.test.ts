import { describe, expect, it } from 'vitest';
import { dispatch, emittedG, play } from '../game/engine';
import { P } from '../game/platineModel';
import { toRel } from '../physics/refrigerants';
import { mulberry32 } from '../learn/quiz';
import type { Action, GameState, Tier } from '../game/types';
import L09 from './L09';

const start = (tier: Tier = 'standard', seed = 7) => L09.setup(tier, mulberry32(seed));
const run = (s: GameState, actions: Action[]) => actions.reduce((x, a) => dispatch(L09, x, a), s);
const ids = (s: GameState) => s.mistakes.map((m) => m.id);
const custom = (id: string): Action => ({ type: 'custom', id });
/** Perfect run up to (excluding) the custom action `id`. */
function upTo(tier: Tier, id: string) {
  const steps = L09.perfectRun(tier);
  const i = steps.findIndex((st) => typeof st !== 'function' && st.type === 'custom' && st.id === id);
  return play(L09, start(tier), steps.slice(0, i));
}
const pumpedDown = (tier: Tier = 'standard') => run(start(tier), [
  { type: 'toggleCap', target: 'valve.receiver' }, { type: 'setServiceValve', valve: 'valve.receiver', pos: 'closed' }, { type: 'wait', seconds: 60 },
  { type: 'toggleCap', target: 'valve.liquid' }, { type: 'setServiceValve', valve: 'valve.liquid', pos: 'closed' }, { type: 'lockout' },
]);

describe('L09', () => {
  for (const [tier, seed] of [['guide', 7], ['standard', 7], ['examen', 7], ['examen', 1], ['examen', 42]] as [Tier, number][]) {
    it(`perfect run → completed with 3 stars (${tier}, seed ${seed})`, () => {
      const s = play(L09, start(tier, seed), L09.perfectRun(tier));
      expect(ids(s)).toEqual([]);
      expect(s.finished?.completed).toBe(true);
      expect(s.finished?.stars).toBe(3);
      expect(emittedG(s)).toBeLessThan(5);
      expect(s.plant.faults.filterRestriction).toBe(0);
    });
  }

  it('N₂ hold: a full, still-warm fill cooling toward ambient is not a leak', () => {
    const steps = L09.perfectRun('guide');
    const i = steps.findIndex((st) => typeof st !== 'function' && st.type === 'setN2' && st.setpoint > 20);
    let s = play(L09, start('guide'), steps.slice(0, i + 1));
    while (toRel(P(s, 'filt')) < 29.8) s = run(s, [{ type: 'wait', seconds: 0.5 }]);
    s = run(s, [{ type: 'device', device: 'n2', on: false }]);
    s = run(s, [{ type: 'wait', seconds: 310 }]);
    expect(s.vars.n2ok).toBe(true);
  });

  it('the board starts with a restricted filter: ΔT > 2 K and bubbles', () => {
    const s = start();
    expect(s.cycle!.filterDT).toBeGreaterThan(2);
    expect(run(s, [{ type: 'inspect', target: 'comp.sightglass' }]).toast?.text).toMatch(/bulles.*JAUNE/);
  });

  it('exam: pumping down into the small receiver until KP5 trips is critical', () => {
    let s = run(start('examen'), [{ type: 'toggleCap', target: 'valve.receiver' }, { type: 'setServiceValve', valve: 'valve.receiver', pos: 'closed' }]);
    s = run(s, [{ type: 'wait', seconds: 14 }, { type: 'inspect', target: 'comp.receiver' }]);
    expect(s.toast?.text).toMatch(/PRESQUE PLEIN/);
    s = run(s, [{ type: 'wait', seconds: 30 }]);
    expect(ids(s)).toEqual(['pumpdown-overfill']);
    expect(s.finished?.completed).toBe(false);
  });

  it('KP1 lowered below 0 bar: the pump-down pulls the suction into vacuum', () => {
    const s = run(start(), [
      { type: 'setPressostat', kp: 'kp1', range: -0.2, diff: 0.7 },
      { type: 'toggleCap', target: 'valve.receiver' }, { type: 'setServiceValve', valve: 'valve.receiver', pos: 'closed' },
      { type: 'wait', seconds: 90 },
    ]);
    expect(ids(s)).toContain('pumpdown-vacuum');
  });

  it('cutting right after the pump-down (section ≈ 1 bar) → open-under-pressure; refused while not locked out', () => {
    const s = pumpedDown();
    expect(toRel(P(s, 'filt'))).toBeGreaterThan(0.5);
    expect(run(start(), [custom('cut')]).toast?.text).toMatch(/Consignez/);
    expect(ids(run(s, [custom('cut')]))).toEqual(['open-under-pressure']);
  });

  it('torch on the pressurised section → brazing-pressurised', () => {
    expect(ids(run(pumpedDown(), [custom('debraze')]))).toContain('brazing-pressurised');
  });

  it('brazing with the receiver valve reopened → brazing-pressurised', () => {
    const s = run(upTo('standard', 'join'), [{ type: 'setServiceValve', valve: 'valve.receiver', pos: 'open' }, custom('join')]);
    expect(ids(s)).toContain('brazing-pressurised');
  });

  it('brazing without N₂ sweep → no-sweep (not in guidé: flare filter)', () => {
    const s = run(upTo('standard', 'cut'), [custom('cut'), custom('pick-dml'), custom('uncap'), custom('place-flow'), custom('join')]);
    expect(ids(s)).toEqual(['no-sweep']);
    const g = run(upTo('guide', 'cut'), [custom('cut'), custom('pick-dml'), custom('uncap'), custom('place-flow'), custom('join')]);
    expect(ids(g)).toEqual([]);
  });

  it('saw, reversed arrow, wrong filter, early uncapping', () => {
    const s = run(upTo('standard', 'cut'), [custom('pick-dcl'), custom('uncap'), custom('saw'), custom('place-back')]);
    expect(ids(s)).toEqual(['filter-open-early', 'saw-cut']);
    const j = run(s, [{ type: 'setN2', setpoint: 1.2 }, { type: 'device', device: 'n2', on: true }, custom('join')]);
    expect(ids(j)).toEqual(['filter-open-early', 'saw-cut', 'arrow-backwards', 'wrong-filter']);
  });

  it('uncapping long before fitting → filter-open-early', () => {
    const s = run(upTo('standard', 'pick-dml'), [custom('pick-dml'), custom('uncap'), { type: 'wait', seconds: 700 }, custom('place-flow'), custom('join')]);
    expect(ids(s)).toEqual(['filter-open-early']);
  });

  it('no unlock while the section is open; the indicator stays yellow with the wrong filter', () => {
    const open = run(upTo('standard', 'cut'), [custom('cut'), { type: 'unlock' }]);
    expect(open.elec.locked).toBe(true);
    expect(open.toast?.text).toMatch(/Circuit ouvert/);
    const wrong = play(L09, start(), L09.perfectRun('standard').map((st) => (typeof st !== 'function' && st.type === 'custom' && st.id === 'pick-dml' ? custom('pick-dcl') : st)));
    expect(wrong.vars.dry).toBe(false);
    expect(wrong.finished?.completed).toBe(false);
  });
});
