import { describe, expect, it } from 'vitest';
import { dispatch, tick } from './engine';
import {
  P, closeSection, cylinderLiquid, gasMass, jointVolume, liquidIntoSuction, makePlatine, openSection, startsWithin, vs,
} from './platineModel';
import { makeVolume } from '../physics/circuit';
import { P_ATM, toRel } from '../physics/refrigerants';
import type { Action, GameState, Level } from './types';

const level: Level = {
  id: 'T', title: 'T', skills: [], lesson: 'circuit', scene: 'PLATINE', fluid: 'R32', briefing: '',
  tierNotes: { guide: '', standard: '', examen: '' }, tools: ['hand'],
  setup: () => makePlatine({ levelId: 'T', tier: 'guide', running: true }),
  objectives: [], rules: [],
  answers: [{ id: 'rel', label: 'rel', unit: 'g', tol: { rel: 0.1 }, expected: () => 10 }],
  actions: [{ id: 'say', label: (s) => `t = ${s.t}` }],
  onAction: (_s, a) => (a.type === 'custom' ? 'Registre rempli' : undefined),
  perfectRun: () => [],
};
const run = (s: GameState, ...as: Action[]) => as.reduce((x, a) => dispatch(level, x, a), s);
const running = () => level.setup('guide', Math.random);
const bp = (s: GameState) => toRel(P(s, 'comp'));
/** Ticks 0.1 s until `until`; returns the state and the BP the pressostat saw on the step that changed it. */
function stepUntil(s: GameState, until: (s: GameState) => boolean, max = 600) {
  let seen = bp(s);
  for (let t = 0; t < max && !until(s); t += 0.1) { seen = bp(s); s = tick(level, s, 0.1); }
  return { s, seen };
}

describe('pump-down and pressostats', () => {
  it('closing the liquid valve pumps the low side down; KP1 stops at cut-out and restarts at cut-in', () => {
    let s = run(running(), { type: 'toggleCap', target: 'valve.liquid' }, { type: 'setServiceValve', valve: 'valve.liquid', pos: 'closed' });
    const t0 = s.t;
    const a = stepUntil(s, (x) => !x.running);
    s = a.s;
    expect(s.t - t0).toBeGreaterThan(10);
    expect(s.t - t0).toBeLessThan(90);
    expect(a.seen).toBeCloseTo(0.5, 0); // cut-out = range − diff = 2 − 1.5
    expect(Math.abs(a.seen - 0.5)).toBeLessThanOrEqual(0.1);
    expect(s.cycle).toBeNull();
    expect(s.unitOn).toBe(true);
    expect(s.journal.some((j) => /KP1.*coupure/.test(j.text))).toBe(true);
    expect(vs(s, 'hp').liquidFraction).toBeGreaterThan(0.8); // charge stored in the receiver

    s = run(tick(level, s, 5), { type: 'setServiceValve', valve: 'valve.liquid', pos: 'open' });
    const b = stepUntil(s, (x) => x.running, 60);
    expect(b.s.running).toBe(true);
    expect(Math.abs(b.seen - 2)).toBeLessThanOrEqual(0.1);
    expect(b.s.starts).toHaveLength(1);
    s = tick(level, b.s, 120);
    expect(s.cycle && toRel(s.cycle.BP)).toBeGreaterThan(8); // back to the running point
  });

  it('a liquid-full receiver spikes the HP and trips KP5 (manual reset)', () => {
    let s = makePlatine({ levelId: 'T', tier: 'guide', running: true, system: { hp: 1.2 } });
    s = run(s, { type: 'toggleCap', target: 'valve.receiver' }, { type: 'setServiceValve', valve: 'valve.receiver', pos: 'closed' });
    const r = run(s, { type: 'resetKp5' });
    expect(r.toast?.text).toMatch(/pas déclenché/);
    s = stepUntil(s, (x) => !x.running).s;
    expect(s.plant.kp5.tripped).toBe(true);
    expect(vs(s, 'hp').phase).toBe('liquidFull');
    expect(s.journal.some((j) => /KP5.*réarmement manuel/.test(j.text))).toBe(true);
    s = tick(level, s, 60);
    expect(s.running).toBe(false); // stays off until reset
    s = run(s, { type: 'setServiceValve', valve: 'valve.receiver', pos: 'open' }, { type: 'resetKp5' });
    expect(s.plant.kp5.tripped).toBe(false);
    expect(tick(level, s, 1).running).toBe(true);
  });

  it('pressostat dials work on the scale; the true value is offset by scaleError', () => {
    let s = running();
    s.plant.kp1.scaleError = 0.3;
    s = run(s, { type: 'setPressostat', kp: 'kp1', range: 2, diff: 1.5 });
    expect(s.plant.kp1.range).toBeCloseTo(1.7, 6);
    expect(s.journal.at(-1)?.text).toMatch(/RANGE 2,0 bar, DIFF 1,5 bar/);
    expect(run(s, { type: 'setPressostat', kp: 'kp1', diff: 0.2 }).toast?.text).toMatch(/butée/);
  });

  it('thermostat stops the compressor at setpoint; pump-down control closes the solenoid instead', () => {
    let s = running();
    s.plant.thermostat = { setpoint: 24, diff: 2, call: true };
    s.plant.box = { UA: 0.05, C: 20 };
    s = stepUntil(s, (x) => !x.running, 3000).s;
    expect(s.plant.Troom).toBeLessThanOrEqual(24.05);
    expect(s.journal.at(-1)?.text).toMatch(/Thermostat/);
    let p = running();
    p.plant.control = 'pumpDown';
    p.plant.thermostat = { setpoint: 30, diff: 2, call: false };
    p = stepUntil(p, (x) => !x.running).s;
    expect(p.plant.kp1.tripped).toBe(true); // stopped by KP1 after a pump-down, not by the thermostat
  });

  it('counts starts for short-cycling detection', () => {
    let s = running();
    s.plant.kp1 = { ...s.plant.kp1, range: 1.2, diff: 0.7 }; // tiny differential
    s = run(s, { type: 'toggleCap', target: 'valve.liquid' }, { type: 'setServiceValve', valve: 'valve.liquid', pos: 'closed' });
    s = tick(level, s, 600);
    expect(s.starts.length).toBeGreaterThan(2);
    expect(startsWithin(s, 600)).toBe(s.starts.length);
    s.starts = [0, 10, 20, 30, 40, 50, 60];
    s.t = 100;
    expect(startsWithin(s)).toBe(7);
    s.t = 615;
    expect(startsWithin(s)).toBe(5);
  });
});

describe('phase-2 actions', () => {
  it('TXV: a quarter turn clockwise is +1 K of static superheat', () => {
    let s = running();
    const sh0 = s.cycle!.SH;
    s = run(s, { type: 'adjustTxv', quarterTurns: 2 });
    expect(s.plant.txvSH).toBe(7);
    expect(s.journal.at(-1)?.text).toMatch(/horaire/);
    expect(tick(level, s, 300).cycle!.SH).toBeCloseTo(sh0 + 2, 0);
    expect(run(s, { type: 'adjustTxv', quarterTurns: 20 }).toast?.text).toMatch(/butée/);
  });

  it('lockout stops the unit, refuses a start and powers the crankcase heater on unlock', () => {
    let s = run(running(), { type: 'lockout' });
    expect(s.running).toBe(false);
    expect(s.elec.crankHeaterOnSince).toBeNull();
    expect(run(s, { type: 'setUnit', on: true }).toast?.text).toMatch(/consignée/);
    s = run(s, { type: 'checkVoltage' });
    expect(s.elec.voltageChecked).toBe(true);
    s = run(tick(level, s, 30), { type: 'unlock' });
    expect(s.elec.crankHeaterOnSince).toBeCloseTo(s.t, 6);
    expect(s.elec.voltageChecked).toBe(false);
    s = run(s, { type: 'setUnit', on: true });
    expect(s.running).toBe(true);
    expect(s.starts).toEqual([s.t]);
  });

  it('openSection vents a pressurised section, sucks air into an evacuated one; jointVolume maps joints', () => {
    const s = makePlatine({ levelId: 'T', tier: 'guide' });
    expect(openSection(s, ['lp'])).toBeGreaterThan(10);
    const after = tick(level, s, 30);
    expect(after.circuit.emitted.ref).toBeGreaterThan(0.1);
    expect(toRel(P(after, 'lp'))).toBeLessThan(0.5);

    const v = makePlatine({ levelId: 'T', tier: 'guide' });
    Object.assign(v.circuit.volumes.filt, { mRef: 0, mAir: 0 });
    v.valves.receiver = 'closed'; v.valves.liquid = 'closed';
    expect(openSection(v, ['filt'])).toBeLessThan(-0.9);
    const breathed = tick(level, v, 10);
    expect(breathed.circuit.volumes.filt.mAir).toBeGreaterThan(0.5 * gasMass(P_ATM, 0.2));
    closeSection(breathed, ['filt']);
    expect(breathed.opened).toEqual([]);
    expect(jointVolume('joint.filterIn')).toBe('filt');
    expect(jointVolume('joint.txvOut')).toBe('lp');
  });

  it('port.liq reads the filter section, port.evap the evaporator', () => {
    let s = makePlatine({ levelId: 'T', tier: 'guide' });
    Object.assign(s.circuit.volumes.filt, { mRef: 0, mAir: 0 });
    s.valves.receiver = 'closed'; s.valves.liquid = 'closed';
    s = run(s, { type: 'toggleCap', target: 'port.liq' }, { type: 'connectHose', hose: 'red', end: 'port', socket: 'port.liq' },
      { type: 'toggleCap', target: 'port.evap' }, { type: 'connectHose', hose: 'blue', end: 'port', socket: 'port.evap' }, { type: 'wait', seconds: 30 });
    expect(P(s, 'hose:red')).toBeLessThan(P_ATM);
    expect(P(s, 'hose:blue')).toBeCloseTo(P(s, 'lp'), 1);
  });

  it('cylinder: liquid from the dip tube, or from the gas valve when inverted without one', () => {
    const s = makePlatine({ levelId: 'T', tier: 'guide', bench: { cylinder: { label: 'R32', gas: false, liq: false, tare: 5, dipTube: false } }, volumes: [makeVolume('cyl', 12)] });
    expect(cylinderLiquid(s, 'gas')).toBe(false);
    const inv = run(s, { type: 'invertCylinder' });
    expect(cylinderLiquid(inv, 'gas')).toBe(true);
    expect(inv.journal.at(-1)?.text).toMatch(/retournée/);
    const r = run(s, { type: 'connectHose', hose: 'yellow', end: 'port', socket: 'cyl.liq' });
    expect(r.toast?.text).toMatch(/pas disponible/);
  });

  it('liquid charged through the BP: wide-open manifold slugs, a cracked valve meters it', () => {
    const rate = (opening: number) => {
      let s = makePlatine({
        levelId: 'T', tier: 'guide', running: true, charge: 1,
        bench: { cylinder: { label: 'R32', gas: false, liq: true, tare: 5 } }, volumes: [makeVolume('cyl', 12, { T: 30, mRef: 5 })],
      });
      s = run(s, { type: 'toggleCap', target: 'port.lp' }, { type: 'toggleCap', target: 'valve.gas' },
        { type: 'connectHose', hose: 'blue', end: 'port', socket: 'port.lp' }, { type: 'setServiceValve', valve: 'valve.gas', pos: 'mid' },
        { type: 'connectHose', hose: 'yellow', end: 'port', socket: 'cyl.liq' }, { type: 'toggleHoseValve', hose: 'yellow' },
        { type: 'setManifoldOpening', valve: 'lp', opening }, { type: 'wait', seconds: 20 });
      return liquidIntoSuction(s);
    };
    const open = rate(1), cracked = rate(0.05);
    expect(open).toBeGreaterThan(10);
    expect(cracked).toBeLessThan(3);
    expect(cracked).toBeGreaterThan(0);
  });

  it('tol.rel, custom label functions and toasted custom text', () => {
    const s = running();
    expect(run(s, { type: 'answer', field: 'rel', value: 10.9 }).answers.rel.ok).toBe(true);
    expect(run(s, { type: 'answer', field: 'rel', value: 11.2 }).answers.rel.ok).toBe(false);
    const c = run(s, { type: 'custom', id: 'say' });
    expect(c.toast?.text).toBe('Registre rempli');
    const label = level.actions![0].label;
    expect(typeof label === 'function' && label(s)).toBe('t = 0');
  });

  it('the N₂ regulator relieves its hose down to a lowered setpoint', () => {
    let s = makePlatine({ levelId: 'T', tier: 'guide', charge: 0, bench: { n2: { open: true, setpoint: P_ATM + 10 } } });
    s = run(s, { type: 'connectHose', hose: 'yellow', end: 'port', socket: 'n2' }, { type: 'wait', seconds: 20 });
    expect(toRel(P(s, 'hose:yellow'))).toBeGreaterThan(9);
    s = run(s, { type: 'device', device: 'n2', on: false }, { type: 'setN2', setpoint: P_ATM + 2 }, { type: 'wait', seconds: 1 });
    expect(toRel(P(s, 'hose:yellow'))).toBeLessThan(2.1);
  });
});
