import { describe, expect, it } from 'vitest';
import { dispatch, emittedG, play } from '../game/engine';
import { mulberry32 } from '../learn/quiz';
import type { Action, GameState, Tier } from '../game/types';
import L12, { CAUSES, FIX, REMEDIES, cur, plan, type Scen } from './L12';

const start = (tier: Tier = 'guide', seed = 7) => L12.setup(tier, mulberry32(seed));
const run = (s: GameState, actions: Action[]) => actions.reduce((x, a) => dispatch(L12, x, a), s);
const ids = (s: GameState) => s.mistakes.map((m) => m.id);
const withPlan = (s: GameState, scens: Scen[]) => {
  s.vars.plan = JSON.stringify(scens);
  s.vars.sc = -1;
  s.vars.rAns = true;
  return run(s, [{ type: 'custom', id: 'next' }]);
};
const scen = (c: number[], m = 0.5): Scen => ({ c, m, Tamb: 30, j: 'joint.filterIn' });
const answer = (s: GameState, diag: number, remedy: number) =>
  run(s, [{ type: 'answer', field: 'diag', value: diag }, { type: 'answer', field: 'remedy', value: remedy }]);

describe('L12', () => {
  const cases: [Tier, number][] = [['guide', 7], ['standard', 7], ['examen', 7], ['examen', 3], ['examen', 11]];
  for (const [tier, seed] of cases) {
    it(`perfect run → completed with 3 stars (${tier}, seed ${seed})`, () => {
      const s0 = start(tier, seed);
      const s = play(L12, s0, L12.perfectRun(tier));
      expect(ids(s)).toEqual([]);
      expect(s.finished?.completed).toBe(true);
      expect(s.finished?.stars).toBe(3);
      expect(s.vars.good).toBe(5);
      expect(emittedG(s)).toBeLessThan(15);
      if (tier === 'examen') {
        expect(s.t).toBeLessThan(L12.timeLimit!);
        expect(plan(s0).filter((x) => x.c.length === 2)).toHaveLength(2);
      }
    });
  }

  it('draws are deterministic per seed and distinct within a run', () => {
    expect(plan(start('standard', 5))).toEqual(plan(start('standard', 5)));
    const c = plan(start('standard', 5)).map((x) => x.c[0]);
    expect(new Set(c).size).toBe(5);
  });

  it('each fault shows its signature on the running board', () => {
    const base = start();
    const at = (c: number) => {
      const s = withPlan(base, [scen([c]), scen([0]), scen([0]), scen([0]), scen([0])]);
      return { s, cy: s.cycle };
    };
    const n = withPlan(base, [scen([12]), scen([0]), scen([0]), scen([0]), scen([0])]);
    expect(n.running).toBe(false); // thermostat satisfied
    const ref = withPlan(base, [scen([]), scen([0]), scen([0]), scen([0]), scen([0])]).cycle!;
    const under = at(0).cy!, over = at(1).cy!, filt = at(7).cy!, evapFan = at(6).cy!, cond = at(4).cy!, comp = at(10).cy!;
    expect(under.SC).toBeLessThan(1);
    expect(under.SH).toBeGreaterThan(ref.SH + 3);
    expect(over.SC).toBeGreaterThan(ref.SC + 3);
    expect(over.HP).toBeGreaterThan(ref.HP);
    expect(filt.filterDT).toBeGreaterThan(2);
    expect(evapFan.BP).toBeLessThan(ref.BP);
    expect(evapFan.SH).toBeLessThan(ref.SH);
    expect(cond.HP).toBeGreaterThan(ref.HP + 3);
    expect(comp.current).toBeLessThan(ref.current);
    const sol = at(11).s;
    expect(sol.cycle).toBeNull();
    expect(sol.plant.kp1.tripped || sol.starts.length > 0).toBe(true);
  });

  it('standstill test reveals non-condensables', () => {
    let s = withPlan(start(), [scen([2]), scen([0]), scen([0]), scen([0]), scen([0])]);
    expect(run(s, [{ type: 'custom', id: 'standstill' }]).toast?.text).toMatch(/Raccordez/);
    s = run(s, [{ type: 'toggleCap', target: 'port.hp' }, { type: 'connectHose', hose: 'red', end: 'port', socket: 'port.hp' }, { type: 'custom', id: 'standstill' }]);
    const m = s.journal.at(-1)!.text.match(/pression (\d+,\d) bar.*= (\d+,\d) bar/)!;
    expect(parseFloat(m[1].replace(',', '.'))).toBeGreaterThan(parseFloat(m[2].replace(',', '.')) + 1);
  });

  it('next scenario is refused until diagnosis and remedy are given, then resets the answers', () => {
    let s = start();
    expect(run(s, [{ type: 'custom', id: 'next' }]).vars.sc).toBe(0);
    expect(run(s, [{ type: 'answer', field: 'remedy', value: 0 }]).answers.remedy).toBeUndefined();
    const c = cur(s).c[0];
    s = answer(s, c, FIX[c]);
    expect(run(s, [{ type: 'answer', field: 'diag', value: c }]).toast?.text).toMatch(/déjà/);
    s = run(s, [{ type: 'custom', id: 'next' }]);
    expect(s.vars.sc).toBe(1);
    expect(s.answers.diag).toBeUndefined();
    expect(s.done).toContain('s1');
  });

  it('wrong cause → wrong-cause, counted per scenario; < 4/5 fails the level', () => {
    let s = start('standard');
    for (let i = 0; i < 5; i++) {
      const c = cur(s).c[0], wrong = (c + 1) % CAUSES.length;
      s = answer(s, i < 2 ? wrong : c, i < 2 ? FIX[wrong] : FIX[c]);
      if (i < 4) s = run(s, [{ type: 'custom', id: 'next' }]);
    }
    s = run(s, [{ type: 'finish' }]);
    expect(ids(s)).toContain('wrong-cause');
    expect(s.vars.wrong).toBe(2);
    expect(s.vars.good).toBe(3);
    expect(s.finished?.completed).toBe(false);
  });

  it('"compléter la charge" → top-up-reflex', () => {
    const s = withPlan(start('standard'), [scen([0]), scen([1]), scen([2]), scen([3]), scen([4])]);
    expect(REMEDIES[1]).toMatch(/Compléter/);
    const r = answer(s, 0, 1);
    expect(ids(r)).toContain('top-up-reflex');
    expect(r.vars.r0).toBe('ko');
  });

  it('guide: diagnosing without SH and SC → no-sh-sc', () => {
    const s = start();
    expect(ids(run(s, [{ type: 'answer', field: 'diag', value: cur(s).c[0] }]))).toEqual(['no-sh-sc']);
  });

  it('guide: liquid temperature taken at the liquid service valve counts for SC', () => {
    const s = run(withPlan(start(), [scen([3]), scen([0]), scen([1]), scen([7]), scen([5])]), [
      { type: 'inspect', target: 'comp.condenser' },
      { type: 'toggleCap', target: 'port.lp' }, { type: 'toggleCap', target: 'port.hp' }, { type: 'toggleCap', target: 'valve.gas' },
      { type: 'connectHose', hose: 'blue', end: 'port', socket: 'port.lp' },
      { type: 'connectHose', hose: 'red', end: 'port', socket: 'port.hp' },
      { type: 'setServiceValve', valve: 'valve.gas', pos: 'mid' },
      { type: 'measure', tool: 'thermometer', target: 'comp.txvBulb' },
      { type: 'measure', tool: 'thermometer', target: 'valve.liquid' },
      { type: 'answer', field: 'diag', value: 3 },
    ]);
    expect(ids(s)).toEqual([]);
  });

  it('connecting the manifold before looking at a dead fan → connect-first', () => {
    const s = withPlan(start('standard'), [scen([4]), scen([1]), scen([2]), scen([3]), scen([0])]);
    const r = run(s, [{ type: 'toggleCap', target: 'port.lp' }, { type: 'connectHose', hose: 'blue', end: 'port', socket: 'port.lp' }]);
    expect(ids(r)).toEqual(['connect-first']);
    const ok = run(s, [{ type: 'inspect', target: 'comp.condFan' }, { type: 'toggleCap', target: 'port.lp' }, { type: 'connectHose', hose: 'blue', end: 'port', socket: 'port.lp' }]);
    expect(ids(ok)).toEqual([]);
    expect(ok.journal.some((j) => /Ventilateur condenseur : à l'arrêt alors que/.test(j.text))).toBe(true);
  });

  it('examen double fault: either cause with its remedy is accepted', () => {
    const s = withPlan(start('examen'), [scen([0, 3]), scen([1]), scen([2]), scen([4]), scen([5])]);
    expect(answer(s, 3, FIX[3]).vars.r0).toBe('ok');
    expect(answer(s, 0, FIX[0]).vars.r0).toBe('ok');
  });

  it('measurements cost sim time', () => {
    const s = start();
    const r = run(s, [{ type: 'inspect', target: 'comp.sightglass' }, { type: 'measure', tool: 'clamp', target: 'comp.compressor' }]);
    expect(r.t - s.t).toBeCloseTo(120, 0);
    expect(r.vars.minTot).toBeCloseTo(2);
  });
});
