import { describe, expect, it } from 'vitest';
import { clickAction, dispatch, tick } from './engine';
import {
  P, SYSTEM, closeSection, concentration, gasReading, makePlatine, makeRoom, openSection, sceneView, systemRef, torchIgnition,
} from './platineModel';
import { psat, toRel } from '../physics/refrigerants';
import type { Action, GameState, Level } from './types';

const level = (setup: () => GameState): Level => ({
  id: 'T', title: 'T', skills: [], lesson: 'circuit', scene: 'PLATINE', fluid: 'R290', briefing: '',
  tierNotes: { guide: '', standard: '', examen: '' }, tools: ['hand', 'gasDetector'],
  setup, objectives: [], rules: [], answers: [], perfectRun: () => [],
});
const run = (l: Level, s: GameState, ...as: Action[]) => as.reduce((x, a) => dispatch(l, x, a), s);

describe('R290 board', () => {
  it('R32 default board unchanged', () => {
    const s = makePlatine({ levelId: 'T', tier: 'guide' });
    expect(s.plant.nominalCharge).toBe(1.2);
    expect(s.circuit.volumes.hp.V).toBe(SYSTEM.hp);
    expect(sceneView(s).title).toBe('PLATINE DIDACTIQUE · SPLIT R32 · 1,2 kg');
  });

  it('a 0.2 kg R290 charge runs at a plausible point', () => {
    const s = makePlatine({ levelId: 'T', tier: 'guide', fluid: 'R290', charge: 0.2, running: true });
    expect(s.plant.nominalCharge).toBe(0.2);
    expect(systemRef(s)).toBeCloseTo(0.2, 6);
    const cy = s.cycle!;
    expect(toRel(cy.BP)).toBeGreaterThan(4);
    expect(toRel(cy.HP)).toBeGreaterThan(11);
    expect(toRel(cy.HP)).toBeLessThan(15);
    expect(Math.abs(cy.SH - 7)).toBeLessThan(2);
    expect(cy.sightGlass).toBe('clair');
    const l = level(() => s), t = tick(l, s, 5);
    expect(P(t, 'comp')).toBeCloseTo(t.cycle!.BP, 1);
    expect(P(t, 'hp')).toBeCloseTo(t.cycle!.HP, 1);
    const off = makePlatine({ levelId: 'T', tier: 'guide', fluid: 'R290', nominalCharge: 0.15, Tamb: 20 });
    expect(P(off, 'hp')).toBeCloseTo(psat('R290', 20, 'bubble'), 0);
  });
});

describe('flammable concentration', () => {
  const setup = () => {
    const s = makePlatine({ levelId: 'T', tier: 'guide', fluid: 'R290', charge: 0.2 });
    s.room = makeRoom(20, 0.5, 15);
    s.ignition = [{ id: 'socket', label: 'Prise de courant', active: true }, { id: 'switch', label: 'Interrupteur', active: true, level: 'head' }];
    return s;
  };
  const l = level(setup);

  it('venting R290 stratifies at floor level and ignites an active floor source', () => {
    let s = setup();
    s.room!.volume = 10;
    openSection(s, ['hp', 'filt', 'liq', 'lp', 'comp']);
    s = tick(l, s, 120);
    expect(concentration(s, 'floor')).toBeGreaterThan(100);
    expect(concentration(s, 'head')).toBeLessThan(concentration(s, 'floor') / 3);
    expect(s.ignitionEvent?.source).toBe('socket');
    expect(s.journal.some((j) => j.text.startsWith('Inflammation'))).toBe(true);
  });

  it('no ignition with sources removed; ventilation and the ATEX fan clear the room', () => {
    let s = run(l, setup(), { type: 'setIgnition', id: 'socket', active: false }, { type: 'setIgnition', id: 'switch', active: false });
    openSection(s, ['hp', 'filt', 'liq', 'lp', 'comp']);
    s = tick(l, s, 120);
    closeSection(s, ['hp', 'filt', 'liq', 'lp', 'comp']);
    expect(s.ignitionEvent).toBeUndefined();
    const c0 = concentration(s, 'floor');
    const calm = tick(l, s, 1200), fan = tick(l, run(l, s, { type: 'setRoomFan', on: true }), 1200);
    expect(concentration(calm, 'floor')).toBeLessThan(c0);
    expect(concentration(fan, 'floor')).toBeLessThan(concentration(calm, 'floor') / 5);
    expect(concentration(fan, 'floor')).toBeLessThan(1);
  });

  it('gas detector: off refused, floor vs head, battery', () => {
    let s = setup();
    expect(run(l, s, { type: 'measure', tool: 'gasDetector', target: 'joint.compSuction' }).probes).toHaveLength(0);
    s.room!.floor = 0.019; // 50 % LFL
    s = run(l, s, { type: 'setGasDetector', on: true });
    expect(gasReading(s).value).toBeCloseTo(50, 0);
    s = run(l, s, { type: 'setGasDetector', position: 'head' });
    expect(gasReading(s).value).toBeLessThan(1);
    s = run(l, s, { type: 'setGasDetector', battery: 'low' });
    expect(gasReading(s).label).toContain('batterie faible');
    s = run(l, s, { type: 'setGasDetector', battery: 'empty' });
    expect(s.gasDetector!.on).toBe(false);
    expect(run(l, s, { type: 'setGasDetector', on: true }).gasDetector!.on).toBe(false);
  });

  it('torch: ignites on an unpurged opening, safe after purge', () => {
    const s = setup();
    s.circuit.volumes.comp.mRef = 0.0004; // recovered to ~0.3 bar
    openSection(s, ['comp']);
    expect(torchIgnition(s, 'joint.compSuction')).toBe(true);
    expect(s.ignitionEvent?.source).toBe('torch');
    const p = setup();
    p.circuit.volumes.comp.mRef = 1e-9; // OFN purged
    openSection(p, ['comp']);
    expect(torchIgnition(p, 'joint.compSuction')).toBe(false);
    expect(p.ignitionEvent).toBeUndefined();
  });
});

describe('KVP / KVR on the board', () => {
  const cold = (Tamb: number) => () => {
    const s = makePlatine({ levelId: 'T', tier: 'guide', fluid: 'R449A', Tamb, Troom: 2 });
    s.plant.kvp = { setting: 0, enabled: true };
    s.plant.kvr = { setting: 5, enabled: false };
    return s;
  };

  it('targets drawn and panels opened only when the level defines them', () => {
    const s = cold(30)();
    expect(sceneView(s)).toMatchObject({ kvp: true, kvr: true });
    expect(clickAction({ ...s, tool: 'wrench' }, 'comp.kvp')).toEqual({ panel: 'kvp' });
    const bare = makePlatine({ levelId: 'T', tier: 'guide' });
    expect(sceneView(bare)).toMatchObject({ kvp: false, kvr: false });
    expect(clickAction({ ...bare, tool: 'wrench' }, 'comp.kvp')).toEqual({ type: 'inspect', target: 'comp.kvp' });
  });

  it('KVP holds the evaporator pressure, suction stays lower', () => {
    const l = level(cold(30));
    let s = l.setup('guide', Math.random);
    s = tick(l, run(l, s, { type: 'setUnit', on: true }), 300);
    const free = s.cycle!.BP, floor = psat('R449A', 4, 'dew');
    s = run(l, s, { type: 'setRegulator', reg: 'kvp', setting: toRel(floor) });
    s = tick(l, s, 300);
    // R449A glide: the evaporator volume reads ~0.1 bar above the dew pressure
    expect(s.cycle!.BP).toBeCloseTo(floor, 2);
    expect(Math.abs(P(s, 'lp') - floor)).toBeLessThan(0.25);
    expect(P(s, 'comp')).toBeLessThan(P(s, 'lp') - 0.4);
    expect(s.cycle!.BPsuction).toBeCloseTo(free, 1);
    expect(run(l, s, { type: 'setRegulator', reg: 'kvp', setting: 9 }).plant.kvp!.setting).toBeCloseTo(toRel(floor), 6); // refused
  });

  it('winter: KVR set to Psat(25 °C) restores HP and superheat', () => {
    const l = level(cold(-5));
    let s = run(l, l.setup('guide', Math.random), { type: 'setUnit', on: true });
    s = tick(l, s, 300);
    const starvedSH = s.cycle!.SH, lowHP = P(s, 'hp');
    expect(starvedSH).toBeGreaterThan(10);
    s.plant.kvr!.enabled = true;
    const floor = psat('R449A', 25, 'bubble');
    s = run(l, s, { type: 'setRegulator', reg: 'kvr', setting: toRel(floor) });
    s = tick(l, s, 300);
    expect(P(s, 'hp')).toBeGreaterThan(lowHP + 3);
    expect(s.cycle!.HP).toBeGreaterThanOrEqual(floor - 0.01);
    expect(P(s, 'hp')).toBeGreaterThan(floor - 1); // glide: the vapour-rich HP volume reads below bubble
    expect(s.cycle!.SH).toBeLessThan(8);
  });
});
