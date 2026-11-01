import { describe, expect, it } from 'vitest';
import { dispatch, emittedG, play } from '../game/engine';
import { mulberry32 } from '../learn/quiz';
import type { Action, GameState, Tier } from '../game/types';
import L13 from './L13';

const start = (tier: Tier = 'standard', seed = 7) => L13.setup(tier, mulberry32(seed));
const run = (s: GameState, actions: Action[]) => actions.reduce((x, a) => dispatch(L13, x, a), s);
const ids = (s: GameState) => s.mistakes.map((m) => m.id);
const perfect = (tier: Tier) => L13.perfectRun(tier);

describe('L13', () => {
  const check = (s: GameState) => {
    expect(ids(s)).toEqual([]);
    expect(s.finished?.completed).toBe(true);
    expect(s.finished?.stars).toBe(3);
    expect(emittedG(s)).toBeLessThan(10);
  };
  for (const tier of ['guide', 'standard'] as Tier[]) it(`perfect run (${tier})`, () => check(play(L13, start(tier), perfect(tier))));

  it('perfect run (examen), every charge-limit question', () => {
    const seen = new Set<number>();
    for (let seed = 1; seen.size < 3 && seed < 40; seed++) {
      const s0 = start('examen', seed);
      if (seen.has(s0.vars.q as number)) continue;
      seen.add(s0.vars.q as number);
      const s = play(L13, s0, perfect('examen'));
      check(s);
      expect(s.t).toBeLessThan(L13.timeLimit!);
    }
    expect(seen.size).toBe(3);
  });

  const at = (tier: Tier, pred: (a: Action) => boolean) => {
    const steps = perfect(tier);
    return steps.findIndex((x) => typeof x === 'object' && pred(x));
  };
  const custom = (id: string) => (a: Action) => a.type === 'custom' && a.id === id;
  const until = (tier: Tier, pred: (a: Action) => boolean, s = start(tier)) => play(L13, s, perfect(tier).slice(0, at(tier, pred)));
  const swap = (tier: Tier, pred: (a: Action) => boolean, by: Action[]) => {
    const steps = perfect(tier), i = at(tier, pred);
    return play(L13, start(tier), [...steps.slice(0, i), ...by, ...steps.slice(i + 1)]);
  };

  it('recovery with ignition sources live → ignition-source; venting the charge into the room ignites and ends the run', () => {
    const recOn = (a: Action) => a.type === 'device' && a.on;
    let s = start('guide');
    s = play(L13, s, perfect('guide').slice(0, at('guide', recOn)).filter((a) => typeof a === 'function' || (a.type !== 'setIgnition' && a.type !== 'setRoomFan')));
    s = run(s, [{ type: 'disconnectHose', hose: 'rec', end: 'manifold' }, { type: 'device', device: 'recovery', on: true }]);
    expect(ids(s)).toEqual(['ignition-source']);
    expect(s.finished).toBeNull();
    s = run(s, [{ type: 'wait', seconds: 600 }]);
    expect(s.ignitionEvent).toBeDefined();
    expect(s.finished?.completed).toBe(false);
    expect(s.finished?.failed).toContain('Inflammation');
  });

  it('examen: hidden charger not found → ignition-source fails the exam', () => {
    const s = play(L13, start('examen'), perfect('examen').slice(0, at('examen', (a) => a.type === 'device' && a.on) + 1)
      .filter((a) => typeof a === 'function' || !(a.type === 'custom' && a.id === 'aZone') && !(a.type === 'setIgnition' && a.id === 'charger')));
    expect(ids(s)).toEqual(['ignition-source']);
    expect(s.finished?.completed).toBe(false);
  });

  it('examen: a low battery dies after a few minutes', () => {
    const s = run(start('examen'), [{ type: 'setGasDetector', on: true, position: 'floor' }, { type: 'wait', seconds: 400 }]);
    expect(s.gasDetector).toMatchObject({ on: false, battery: 'empty' });
  });

  it('brazing without purge → flame-before-purge ends the run', () => {
    let s = until('standard', custom('vent-out'));
    s = run(s, [{ type: 'custom', id: 'n2-fill', value: 0.5 }, { type: 'custom', id: 'n2-vent' }, ...['cut', 'remove', 'mount', 'braze'].map((id): Action => ({ type: 'custom', id }))]);
    expect(ids(s)).toEqual(['flame-before-purge']);
    expect(s.ignitionEvent?.source).toBe('torch');
    expect(s.finished?.failed).toContain('chalumeau');
  });

  it('opening without the detector → no-detector; detector at head height → detector-high', () => {
    const off = swap('standard', custom('cut'), [{ type: 'setGasDetector', on: false }, { type: 'custom', id: 'cut' }]);
    expect(ids(off)).toContain('no-detector');
    const high = swap('standard', custom('cut'), [{ type: 'setGasDetector', position: 'head' }, { type: 'custom', id: 'cut' }]);
    expect(ids(high)).toEqual(['detector-high']);
  });

  it('standard station → non-atex-tools; HFC cylinder → hc-into-hfc-cylinder', () => {
    const recOn = (a: Action) => a.type === 'device' && a.on;
    const base = until('standard', recOn);
    const std = run(base, [{ type: 'custom', id: 'station-std' }, { type: 'device', device: 'recovery', on: true }]);
    expect(ids(std)).toEqual(['non-atex-tools']);
    const hfc = run(until('standard', custom('cyl-hc')), [
      { type: 'custom', id: 'cyl-hfc' },
      ...(perfect('standard').slice(at('standard', custom('cyl-hc')) + 1, at('standard', recOn) + 1) as Action[]),
      { type: 'wait', seconds: 120 },
    ]);
    expect(ids(hfc)).toEqual(['hc-into-hfc-cylinder']);
  });

  it('charge 10 g over the label → charge-error', () => {
    const s = swap('standard', custom('vac'), [{ type: 'custom', id: 'vac' }, { type: 'custom', id: 'charge', value: 210 }]);
    expect(ids(s)).toContain('charge-error');
  });
});
