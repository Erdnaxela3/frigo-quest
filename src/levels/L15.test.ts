import { describe, expect, it } from 'vitest';
import { dispatch, play } from '../game/engine';
import { gaugeP } from '../game/platineModel';
import { mulberry32 } from '../learn/quiz';
import { psat, toRel } from '../physics/refrigerants';
import type { Action, GameState, Tier } from '../game/types';
import L15 from './L15';

const start = (tier: Tier = 'standard', seed = 7) => L15.setup(tier, mulberry32(seed));
const run = (s: GameState, actions: Action[]) => actions.reduce((x, a) => dispatch(L15, x, a), s);
const ids = (s: GameState) => s.mistakes.map((m) => m.id);
const seedFor = (pred: (s: GameState) => boolean) => {
  for (let seed = 1; seed < 500; seed++) if (pred(start('examen', seed))) return seed;
  throw new Error('no seed');
};
const hoses: Action[] = [
  { type: 'toggleCap', target: 'port.evap' },
  { type: 'connectHose', hose: 'blue', end: 'port', socket: 'port.evap' },
  { type: 'toggleCap', target: 'port.hp' },
  { type: 'connectHose', hose: 'red', end: 'port', socket: 'port.hp' },
];

describe('L15', () => {
  for (const tier of ['guide', 'standard'] as Tier[]) {
    it(`perfect run → completed with 3 stars (${tier})`, () => {
      const s = play(L15, start(tier), L15.perfectRun(tier));
      expect(ids(s)).toEqual([]);
      expect(s.finished?.completed).toBe(true);
      expect(s.finished?.stars).toBe(3);
    });
  }

  const variants = [
    { season: 'hiver', tevapTarget: 0, tcondTarget: 28, Twinter: -8 },
    { season: 'ete', tevapTarget: 2, tcondTarget: 22, Tsummer: 34 },
    { season: 'hiver', tevapTarget: 1, tcondTarget: 25, Twinter: -4 },
    { season: 'ete', tevapTarget: 0, Tsummer: 26 },
  ];
  for (const v of variants) {
    it(`perfect run → 3 stars (examen ${JSON.stringify(v)})`, () => {
      const seed = seedFor((s) => Object.entries(v).every(([k, x]) => s.vars[k] === x));
      const s0 = start('examen', seed);
      expect(s0.cycle!.Tevap).toBeLessThan(-2); // mis-set KVP: produce room too cold
      const s = play(L15, s0, L15.perfectRun('examen'));
      expect(ids(s)).toEqual([]);
      expect(s.finished?.completed).toBe(true);
      expect(s.finished?.stars).toBe(3);
    });
  }

  it('winter without KVR: low HP and starving TXV; summer: KVR open', () => {
    const w = run(start(), [{ type: 'wait', seconds: 120 }]);
    expect(w.cycle!.Tcond).toBeLessThan(10);
    expect(w.cycle!.SH).toBeGreaterThan(10);
    const kvr = toRel(psat('R449A', 25, 'bubble'));
    const summer = run(start(), [{ type: 'custom', id: 'kvrBypass' }, { type: 'setRegulator', reg: 'kvr', setting: kvr },
      { type: 'custom', id: 'season' }, { type: 'wait', seconds: 200 }]);
    expect(toRel(summer.cycle!.HP)).toBeGreaterThan(kvr + 2);
  });

  it('verification answer while the room still evaporates too cold → kvp-too-low', () => {
    const s = run(start(), [...hoses, { type: 'wait', seconds: 60 }]);
    const r = run(s, [{ type: 'answer', field: 'bpEvap', value: toRel(gaugeP(s, 'mf.lp')) }]);
    expect(ids(r)).toEqual(['kvp-too-low']);
  });

  it('KVR cranked to the stop in winter → kvr-too-high (minor)', () => {
    const s = run(start(), [{ type: 'custom', id: 'kvrBypass' }, { type: 'setRegulator', reg: 'kvr', setting: 17.5 }, { type: 'wait', seconds: 200 }]);
    expect(ids(s)).toEqual(['kvr-too-high']);
  });

  it('KVP read on the compressor suction port → scale-only', () => {
    const s = run(start('guide'), [
      { type: 'toggleCap', target: 'port.lp' },
      { type: 'toggleCap', target: 'valve.gas' },
      { type: 'connectHose', hose: 'blue', end: 'port', socket: 'port.lp' },
      { type: 'setServiceValve', valve: 'valve.gas', pos: 'mid' },
      { type: 'setRegulator', reg: 'kvp', setting: 3.7 },
      { type: 'wait', seconds: 150 },
      { type: 'answer', field: 'bpEvap', value: 3.85 },
    ]);
    expect(ids(s)).toEqual(['scale-only']);
    expect(s.vars.kvpOk).toBe(false);
  });

  it('regulator set but never verified, then finish → scale-only', () => {
    const s = run(start('guide'), [{ type: 'setRegulator', reg: 'kvp', setting: 3.7 }, { type: 'wait', seconds: 150 }, { type: 'finish' }]);
    expect(ids(s)).toEqual(['scale-only']);
    expect(s.finished?.completed).toBe(false);
  });
});
