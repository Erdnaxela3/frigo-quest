import { useCallback, useState } from 'react';
import PlatineBoard from './scene/PlatineBoard';
import Manifold from './instruments/Manifold';
import VacuumGauge from './instruments/VacuumGauge';
import Scale from './instruments/Scale';
import Readout from './instruments/Readout';
import {
  JOINTS, PORTS, TARGET_LABELS,
  type HoseColor, type JointId, type PortId, type SceneView, type SegmentId, type SegmentState, type TargetId, type ThreeWay,
} from './sceneIds';
import { FLUID_IDS, psat, toRel, tsat } from '../physics/refrigerants';
import type { FluidId } from '../physics/types';

const SEGMENTS: SegmentId[] = ['discharge', 'condenser', 'liquid', 'liquidAfterFilter', 'evaporator', 'suction'];
const STATES: SegmentState[] = ['vapour', 'liquid', 'twoPhase', 'empty', 'n2', 'vacuum'];
const FROST_KEYS = ['suction', 'evaporator', 'liquidAfterFilter', 'comp.evaporator', 'comp.txv', 'comp.txvBulb', 'comp.filter', 'comp.sightglass', 'comp.solenoid', 'comp.compressor', 'comp.receiver'] as const;

const RUNNING: SceneView = {
  running: true,
  segments: { discharge: 'vapour', condenser: 'twoPhase', liquid: 'liquid', liquidAfterFilter: 'liquid', evaporator: 'twoPhase', suction: 'vapour' },
  frost: {},
  valves: { 'valve.liquid': 'open', 'valve.gas': 'mid' },
  hoses: { 'port.lp': 'blue', 'port.hp': 'red' },
  fans: { cond: true, evap: true },
  sightGlass: 'clair',
  oilStains: [],
  bulbAttached: true,
  highlight: [],
};
const STOPPED: SceneView = {
  ...RUNNING, running: false, fans: { cond: false, evap: false }, hoses: {},
  segments: { discharge: 'n2', condenser: 'n2', liquid: 'n2', liquidAfterFilter: 'n2', evaporator: 'n2', suction: 'n2' },
  valves: { 'valve.liquid': 'open', 'valve.gas': 'back' }, sightGlass: 'vide',
};

export default function DevScene() {
  const [view, setView] = useState<SceneView>(RUNNING);
  const [clicked, setClicked] = useState<TargetId | null>(null);
  const [fluid, setFluid] = useState<FluidId>('R32');
  const [lp, setLp] = useState(psat('R32', 6));
  const [hp, setHp] = useState(psat('R32', 42, 'bubble'));
  const [mv, setMv] = useState({ lp: false, hp: false, vac: false, charge: false });
  const [fourWay, setFourWay] = useState(false);
  const [vacExp, setVacExp] = useState(2.7);
  const [kg, setKg] = useState(12.4);
  const [tare, setTare] = useState(0);

  const set = <K extends keyof SceneView>(k: K, v: SceneView[K]) => setView((s) => ({ ...s, [k]: v }));
  const onTarget = useCallback((id: TargetId) => setClicked(id), []);
  const vacAbs = 10 ** vacExp / 750_061.7;

  return (
    <div className="dev">
      <style>{`.dev{display:grid;gap:1rem;grid-template-columns:minmax(0,1fr) 300px;align-items:start}
        .dev .ctl{display:grid;gap:.5rem;font-size:.85rem}.dev .ctl label{display:flex;gap:.4rem;align-items:center;justify-content:space-between}
        .dev fieldset{border:1px solid var(--line);border-radius:8px;padding:.4rem .6rem}.dev legend{color:var(--muted);font-size:.75rem}
        .dev .inst{display:flex;flex-wrap:wrap;gap:1.5rem;align-items:flex-start;grid-column:1/-1}
        @media(max-width:1000px){.dev{grid-template-columns:1fr}}`}</style>
      <div>
        <h1>Dev — platine</h1>
        <PlatineBoard view={view} onTarget={onTarget} />
        <p className="mono" role="status">{clicked ? `${clicked} — ${TARGET_LABELS[clicked]}` : 'Cliquez un élément de la platine.'}</p>
      </div>

      <div className="card ctl">
        <div className="row">
          <button type="button" onClick={() => setView(RUNNING)}>En marche</button>
          <button type="button" onClick={() => setView(STOPPED)}>Arrêt (azote)</button>
        </div>
        <label>En marche <input type="checkbox" checked={view.running} onChange={(e) => set('running', e.target.checked)} /></label>
        <label>Ventilateur cond. <input type="checkbox" checked={view.fans.cond} onChange={(e) => set('fans', { ...view.fans, cond: e.target.checked })} /></label>
        <label>Ventilateur évap. <input type="checkbox" checked={view.fans.evap} onChange={(e) => set('fans', { ...view.fans, evap: e.target.checked })} /></label>
        <label>Bulbe fixé <input type="checkbox" checked={view.bulbAttached} onChange={(e) => set('bulbAttached', e.target.checked)} /></label>
        <label>Vanne liquide
          <select value={view.valves['valve.liquid']} onChange={(e) => set('valves', { ...view.valves, 'valve.liquid': e.target.value as 'open' | 'closed' })}>
            <option value="open">ouverte</option><option value="closed">fermée</option>
          </select>
        </label>
        <label>Vanne gaz 3 voies
          <select value={view.valves['valve.gas']} onChange={(e) => set('valves', { ...view.valves, 'valve.gas': e.target.value as ThreeWay })}>
            <option value="back">arrière</option><option value="mid">milieu</option><option value="front">avant</option>
          </select>
        </label>
        <label>Voyant
          <select value={view.sightGlass} onChange={(e) => set('sightGlass', e.target.value as SceneView['sightGlass'])}>
            {['clair', 'bulles', 'mousse', 'vide'].map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <fieldset><legend>Segments</legend>
          {SEGMENTS.map((s) => (
            <label key={s}>{s}
              <select value={view.segments[s]} onChange={(e) => set('segments', { ...view.segments, [s]: e.target.value as SegmentState })}>
                {STATES.map((st) => <option key={st}>{st}</option>)}
              </select>
            </label>
          ))}
        </fieldset>
        <fieldset><legend>Flexibles</legend>
          {(Object.keys(PORTS) as PortId[]).map((p) => (
            <label key={p}>{p}
              <select value={view.hoses[p] ?? ''} onChange={(e) => set('hoses', { ...view.hoses, [p]: (e.target.value || undefined) as HoseColor | undefined })}>
                <option value="">—</option><option value="blue">bleu</option><option value="red">rouge</option><option value="yellow">jaune</option>
              </select>
            </label>
          ))}
        </fieldset>
        <fieldset><legend>Givre</legend>
          {FROST_KEYS.map((k) => (
            <label key={k}>{k} <input type="checkbox" checked={!!view.frost[k]} onChange={(e) => set('frost', { ...view.frost, [k]: e.target.checked })} /></label>
          ))}
        </fieldset>
        <fieldset><legend>Traces d'huile</legend>
          {(Object.keys(JOINTS) as JointId[]).map((j) => (
            <label key={j}>{j} <input type="checkbox" checked={view.oilStains.includes(j)}
              onChange={(e) => set('oilStains', e.target.checked ? [...view.oilStains, j] : view.oilStains.filter((x) => x !== j))} /></label>
          ))}
        </fieldset>
        <label>Surbrillance
          <select value={view.highlight[0] ?? ''} onChange={(e) => set('highlight', e.target.value ? [e.target.value as TargetId] : [])}>
            <option value="">—</option>
            {(Object.keys(TARGET_LABELS) as TargetId[]).map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
      </div>

      <div className="card inst">
        <div style={{ flex: '1 1 380px', maxWidth: 460 }}>
          <div className="row" style={{ marginBottom: '.5rem' }}>
            <select value={fluid} onChange={(e) => setFluid(e.target.value as FluidId)}>{FLUID_IDS.map((f) => <option key={f}>{f}</option>)}</select>
            <label><input type="checkbox" checked={fourWay} onChange={(e) => setFourWay(e.target.checked)} /> 4 voies</label>
          </div>
          <Manifold fluid={fluid} lpAbs={lp} hpAbs={hp} valves={mv} fourWay={fourWay} onToggle={(k) => setMv((m) => ({ ...m, [k]: !m[k] }))} />
          <label className="row">BP abs <input type="range" min={0} max={19} step={0.05} value={lp} onChange={(e) => setLp(+e.target.value)} /> {lp.toFixed(2)}</label>
          <label className="row">HP abs <input type="range" min={0} max={51} step={0.1} value={hp} onChange={(e) => setHp(+e.target.value)} /> {hp.toFixed(1)}</label>
        </div>
        <div style={{ display: 'grid', gap: '1rem' }}>
          <VacuumGauge pAbs={vacAbs} />
          <input type="range" min={1} max={6.1} step={0.01} value={vacExp} onChange={(e) => setVacExp(+e.target.value)} aria-label="Pression vide (log)" />
          <Scale kg={kg} tare={tare} onTare={() => setTare(kg)} />
          <input type="range" min={0} max={30} step={0.005} value={kg} onChange={(e) => setKg(+e.target.value)} aria-label="Masse sur la balance" />
        </div>
        <div style={{ display: 'grid', gap: '.6rem' }}>
          <Readout label="BP relative" value={toRel(lp)} unit="bar" digits={2} />
          <Readout label="T évap (rosée)" value={tsat(fluid, lp, 'dew')} unit="°C" />
          <Readout label="T cond (bulle)" value={tsat(fluid, hp, 'bubble')} unit="°C" />
          <Readout label="Surchauffe" value={NaN} unit="K" />
        </div>
      </div>
    </div>
  );
}
