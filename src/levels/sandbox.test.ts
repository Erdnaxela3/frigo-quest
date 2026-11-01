import { describe, expect, it } from 'vitest';
import { dispatch, tick } from '../game/engine';
import { getLevel } from '.';
import { SANDBOX_FLUIDS } from './sandbox';

describe('atelier libre', () => {
  it.each(SANDBOX_FLUIDS)('%s board runs at a sane point', (fl) => {
    const l = getLevel(`LIBRE-${fl}`)!;
    expect(l.fluid).toBe(fl);
    const s = tick(l, l.setup('guide', Math.random), 30);
    expect(s.running).toBe(true);
    expect(s.cycle!.HP).toBeGreaterThan(s.cycle!.BP);
    expect(s.plant.faults.nonCondBar).toBeLessThan(0.01);
    expect(s.finished).toBeNull();
  });

  it('air and a dead condenser fan raise the HP; repair restores it', () => {
    const l = getLevel('LIBRE-R32')!;
    let s = tick(l, l.setup('guide', Math.random), 30);
    const hp0 = s.cycle!.HP;
    s = dispatch(l, s, { type: 'custom', id: 'air' });
    s = tick(l, s, 60);
    expect(s.cycle!.HP).toBeGreaterThan(hp0 + 0.5);
    s = dispatch(l, s, { type: 'custom', id: 'repair' });
    s = dispatch(l, s, { type: 'custom', id: 'condFanOk' });
    expect(s.plant.faults.condFanOk).toBe(false);
  });

  it('a hidden leak shows on the detector only at its joint', () => {
    const l = getLevel('LIBRE-R32')!;
    let s = dispatch(l, l.setup('guide', Math.random), { type: 'custom', id: 'leak' });
    const j = s.leaks[0].joint!;
    expect(l.measure!(s, { tool: 'detector', target: j })!.value).toBeGreaterThan(0);
    const other = j === 'joint.condIn' ? 'joint.condOut' : 'joint.condIn';
    expect(l.measure!(s, { tool: 'detector', target: other })!.value).toBe(0);
    s = dispatch(l, s, { type: 'finish' });
    expect(s.mistakes).toHaveLength(0);
  });
});
