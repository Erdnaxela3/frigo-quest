import { describe, expect, it } from 'vitest';
import { dispatch, result, tick } from './engine';
import { makePlatine } from './platineModel';
import type { Level, Tier } from './types';

const level: Level = {
  id: 'T', title: 'Test', skills: ['A1:5.01'], lesson: 'circuit', scene: 'PLATINE', fluid: 'R32', briefing: '',
  tierNotes: { guide: '', standard: '', examen: '' }, tools: ['hand'],
  setup: (tier) => makePlatine({ levelId: 'T', tier }),
  objectives: [
    { id: 'cap', label: 'Retirer le bouchon BP', done: (s) => !s.caps['port.lp'], hints: ['n', 's', ['port.lp']] },
    { id: 'scale', label: 'Échelle R134a', done: (s) => s.manifold.scale === 'R134a' },
  ],
  rules: [
    { id: 'minor', severity: 'minor', skill: 'A1:5.01', message: 'm', when: ({ a }) => a.type === 'custom' && a.id === 'minor' },
    { id: 'major', severity: 'major', skill: 'A1:5.01', message: 'M', when: ({ a }) => a.type === 'custom' && a.id === 'major' },
    { id: 'crit', severity: 'critical', skill: 'A1:5.01', message: 'C', when: ({ a }) => a.type === 'custom' && a.id === 'crit' },
  ],
  answers: [{ id: 'x', label: 'x', unit: 'bar', tol: 0.2, expected: () => 1 }],
  onAction: (_s, a) => (a.type === 'custom' ? `custom ${a.id}` : undefined),
  perfectRun: () => [],
};

const start = (tier: Tier = 'guide') => level.setup(tier, Math.random);
const act = (s: ReturnType<typeof start>, ...ids: string[]) => ids.reduce((x, id) => dispatch(level, x, { type: 'custom', id }), s);
const complete = (s: ReturnType<typeof start>) => dispatch(level, dispatch(level, s, { type: 'toggleCap', target: 'port.lp' }), { type: 'setScale', fluid: 'R134a' });

describe('engine', () => {
  it('scores mistakes once each and awards stars', () => {
    let s = complete(start());
    expect(dispatch(level, s, { type: 'finish' }).finished).toMatchObject({ completed: true, score: 100, stars: 3 });
    s = act(s, 'minor', 'minor');
    expect(s.mistakes).toHaveLength(1);
    expect(dispatch(level, s, { type: 'finish' }).finished).toMatchObject({ score: 95, stars: 3 });
    expect(dispatch(level, act(s, 'major'), { type: 'finish' }).finished).toMatchObject({ score: 80, stars: 2 });
    expect(dispatch(level, act(s, 'major', 'crit'), { type: 'finish' }).finished).toMatchObject({ score: 40, stars: 1 });
  });

  it('incomplete objectives give no star', () => {
    const s = dispatch(level, start(), { type: 'finish' });
    expect(s.finished).toMatchObject({ completed: false, stars: 0, score: 100 });
  });

  it('objectives are sequential and sticky', () => {
    let s = dispatch(level, start(), { type: 'setScale', fluid: 'R134a' });
    expect(s.done).toEqual([]);
    s = dispatch(level, s, { type: 'toggleCap', target: 'port.lp' });
    expect(s.done).toEqual(['cap', 'scale']);
    s = dispatch(level, s, { type: 'toggleCap', target: 'port.lp' });
    expect(s.done).toEqual(['cap', 'scale']);
  });

  it('a critical mistake ends an exam as failed', () => {
    const s = act(complete(start('examen')), 'crit');
    expect(s.finished).toMatchObject({ completed: false, stars: 0 });
    expect(act(complete(start('standard')), 'crit').finished).toBeNull();
  });

  it('hint cost depends on tier and the third hint highlights', () => {
    let g = start('guide');
    for (let i = 0; i < 3; i++) g = dispatch(level, g, { type: 'requestHint' });
    expect(g.hintPenalty).toBe(0);
    expect(g.hintLevel.cap).toBe(3);
    let st = dispatch(level, start('standard'), { type: 'requestHint' });
    st = dispatch(level, st, { type: 'requestHint' });
    expect(st.hintPenalty).toBe(10);
    expect(result(level, complete(st)).score).toBe(90);
    const ex = dispatch(level, start('examen'), { type: 'requestHint' });
    expect(ex.hintPenalty).toBe(0);
    expect(ex.toast?.text).toMatch(/examen/);
  });

  it('undo restores the last action in guidé only', () => {
    const g = dispatch(level, start('guide'), { type: 'toggleCap', target: 'port.lp' });
    const back = dispatch(level, g, { type: 'undo' });
    expect(back.caps['port.lp']).toBe(true);
    expect(back.journal.at(-1)?.text).toMatch(/annulée/);
    const st = dispatch(level, start('standard'), { type: 'toggleCap', target: 'port.lp' });
    expect(dispatch(level, st, { type: 'undo' }).caps['port.lp']).toBe(false);
  });

  it('emissions cost 1 point per 5 g beyond 5 g per disconnect', () => {
    const s = complete(start());
    s.circuit.emitted.ref = 0.023;
    expect(result(level, s).score).toBe(96);
    s.disconnects = 2;
    expect(result(level, s).score).toBe(98);
    s.circuit.emitted.ref = 0.009;
    expect(result(level, s).score).toBe(100);
  });

  it('venting a pressurised hose counts as emission', () => {
    let s = dispatch(level, start(), { type: 'toggleCap', target: 'port.liq' });
    s = dispatch(level, s, { type: 'connectHose', hose: 'red', end: 'port', socket: 'port.liq' });
    s = dispatch(level, s, { type: 'wait', seconds: 30 });
    s = dispatch(level, s, { type: 'disconnectHose', hose: 'red', end: 'port' });
    expect(s.lastVentG).toBeGreaterThan(5);
    expect(s.circuit.emitted.ref * 1000).toBeCloseTo(s.lastVentG, 3);
    expect(s.disconnects).toBe(1);
  });

  it('journals actions with sim time and refuses invalid ones without changing state', () => {
    let s = dispatch(level, start(), { type: 'wait', seconds: 10 });
    s = tick(level, s, 5);
    s = act(s, 'minor');
    expect(s.t).toBeCloseTo(15, 6);
    expect(s.journal.find((j) => j.text === 'custom minor')?.t).toBeCloseTo(15, 6);
    expect(s.journal.some((j) => j.kind === 'mistake')).toBe(true);
    const r = dispatch(level, s, { type: 'connectHose', hose: 'blue', end: 'port', socket: 'port.lp' });
    expect(r.hoses).toBe(s.hoses);
    expect(r.toast?.text).toMatch(/Bouchon/);
  });

  it('answers are checked against tolerance', () => {
    const s = dispatch(level, start(), { type: 'answer', field: 'x', value: 1.2 });
    expect(s.answers.x.ok).toBe(true);
    expect(dispatch(level, s, { type: 'answer', field: 'x', value: 1.25 }).answers.x.ok).toBe(false);
  });
});
