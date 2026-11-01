import { useCallback, useEffect, useRef, useState } from 'react';
import type { FluidId } from '../physics/types';
import { FLUID_IDS, FLUIDS, P_ATM, isSupercritical, toRel, tsat } from '../physics/refrigerants';
import { record } from '../progress/store';
import Readout from '../game/instruments/Readout';
import Scale from '../game/instruments/Scale';
import VacuumGauge from '../game/instruments/VacuumGauge';
import BenchView from './lab/BenchView';
import PtChart, { type PtPoint } from './lab/PtChart';
import {
  BLENDS, EXP, EXPERIMENTS, addN2, addWater, changeFluid, freeBench, inject, pumpOn, setPlate, setPump, setSecond, setValve,
  setVolume, stateOf, tick, valveOpen, vol, type Bench, type ExpId, type Mem, type VesselId,
} from './lab/experiments';
import './lab/lab.css';

const LS = 'frigoquest.lab';
const SPEEDS = [1, 10, 60];
const fmt = (v: number, d = 1) => v.toFixed(d).replace('.', ',');
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const emptyMass = (V: number) => 0.6 + 0.35 * V; // kg, steel bottle tare

function loadDone(): ExpId[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(LS) ?? '[]');
    return Array.isArray(v) ? v.filter((x): x is ExpId => typeof x === 'string' && x in EXP) : [];
  } catch {
    return [];
  }
}

const clock = (t: number) => {
  const m = Math.floor(t / 60), s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

function phaseText(b: Bench, id: VesselId) {
  const s = stateOf(b, id);
  if (s.phase !== 'empty' && isSupercritical(b.c.fluid, vol(b, id).T)) return { t: 'Supercritique', cls: 'warn' };
  return {
    empty: { t: vol(b, id).mAir + vol(b, id).mN2 > 1e-6 ? 'Sans fluide' : 'Vide', cls: '' },
    vapour: { t: 'Vapeur surchauffée', cls: '' },
    twoPhase: { t: 'Liquide + vapeur', cls: 'ok' },
    liquidFull: { t: 'Plein liquide !', cls: 'bad' },
  }[s.phase];
}

export default function Lab() {
  const bench = useRef<Bench>(freeBench());
  const mem = useRef<Mem>({});
  const trail = useRef<PtPoint[]>([]);
  const prev = useRef({ t: 0, A: 0, B: 0 });
  const boil = useRef<Record<VesselId, number>>({ A: 0, B: 0 });
  const [, setFrame] = useState(0);
  const [exp, setExp] = useState<ExpId | null>(null);
  const [reached, setReached] = useState(false);
  const [done, setDone] = useState<ExpId[]>(loadDone);
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [side, setSide] = useState<'gas' | 'liquid'>('gas');
  const [tare, setTare] = useState(0);
  const expRef = useRef(exp), reachedRef = useRef(reached), doneRef = useRef(done);
  expRef.current = exp; reachedRef.current = reached; doneRef.current = done;

  const refresh = useCallback(() => {
    const b = bench.current, A = vol(b, 'A'), sA = stateOf(b, 'A');
    const last = trail.current[trail.current.length - 1];
    if (!last || Math.abs(last.T - A.T) > 0.05 || Math.abs(Math.log(last.P / Math.max(sA.P, 1e-6))) > 0.003) {
      trail.current.push({ T: A.T, P: Math.max(sA.P, 1e-6) });
      if (trail.current.length > 400) trail.current.shift();
    }
    const dt = b.c.t - prev.current.t;
    for (const id of ['A', 'B'] as const) {
      const lf = stateOf(b, id).liquidFraction, T = vol(b, id).T;
      const loss = dt > 0 ? Math.max(0, (prev.current[id] - lf) / dt) : 0;
      boil.current[id] = lf > 0 ? clamp(0.12 + (b.plate - T) / 8 + loss * 200, 0, 1) : 0;
      prev.current[id] = lf;
    }
    prev.current.t = b.c.t;

    const e = expRef.current ? EXP[expRef.current] : null;
    if (e && !reachedRef.current && e.check(b, mem.current)) {
      reachedRef.current = true;
      setReached(true);
      if (!doneRef.current.includes(e.id)) {
        const next = [...doneRef.current, e.id];
        doneRef.current = next;
        setDone(next);
        localStorage.setItem(LS, JSON.stringify(next));
        record({ kind: 'level', skills: e.skills, score: 1, detail: { lab: e.id } });
      }
    }
    setFrame((f) => f + 1);
  }, []);

  useEffect(() => {
    if (!running) return;
    let raf = 0, last = performance.now(), acc = 0, lastDraw = 0;
    const loop = (now: number) => {
      acc += Math.min(0.25, (now - last) / 1000) * speed;
      last = now;
      for (let n = 0; acc >= 0.1 && n < 200; n++, acc -= 0.1) tick(bench.current);
      if (now - lastDraw >= 50) { lastDraw = now; refresh(); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, speed, refresh]);

  const act = (fn: (b: Bench) => void) => { fn(bench.current); refresh(); };

  const load = (id: ExpId | null) => {
    bench.current = id ? EXP[id].setup() : freeBench();
    mem.current = {};
    trail.current = [];
    prev.current = { t: 0, A: stateOf(bench.current, 'A').liquidFraction, B: stateOf(bench.current, 'B').liquidFraction };
    reachedRef.current = false;
    expRef.current = id;
    setReached(false);
    setExp(id);
    setTare(0);
    setRunning(true);
    refresh();
  };

  const b = bench.current, f = b.c.fluid, A = vol(b, 'A'), sA = stateOf(b, 'A'), sB = stateOf(b, 'B');
  const e = exp ? EXP[exp] : null;
  const blend = BLENDS[f];
  const pumping = pumpOn(b), emitted = b.c.emitted.ref * 1000;

  const vesselPanel = (id: VesselId) => {
    const v = vol(b, id), s = id === 'A' ? sA : sB, ph = phaseText(b, id);
    const sat = s.P > 0.05 && s.P < FLUIDS[f].critical.P && !isSupercritical(f, v.T);
    const ts = sat ? tsat(f, s.P) : NaN, tb = sat ? tsat(f, s.P, 'bubble') : NaN;
    const glide = Math.abs(ts - tb) > 0.5;
    return (
      <div className="lab-vpanel" key={id}>
        <div className="row lab-vhead">
          <strong>Bouteille {id}</strong>
          <span className={`badge ${ph.cls}`}>{ph.t}</span>
          {s.phase === 'twoPhase' && <span className="muted">liquide {Math.round(s.liquidFraction * 100)} %</span>}
        </div>
        <div className="lab-readouts">
          <Readout label="Manomètre" value={toRel(s.P)} unit="bar" digits={2} />
          <Readout label="Absolue" value={s.P} unit="bar abs" digits={s.P < 1 ? 3 : 2} />
          <Readout label={glide ? 'T rosée lue' : 'Tsat lue'} value={ts} unit="°C" />
          {glide && <Readout label="T bulle lue" value={tb} unit="°C" />}
          <Readout label="T réelle" value={v.T} unit="°C" />
          <Readout label="Fluide" value={v.mRef * 1000} unit="g" digits={0} />
          {s.PN2 + s.PAir > 0.001 && <Readout label="N₂ + air" value={s.PN2 + s.PAir} unit="bar" digits={2} />}
        </div>
        <div className="lab-ctl-row">
          <label className="lab-field">Volume <input type="range" min={1} max={20} step={0.5} value={v.V} onChange={(ev) => act((bb) => setVolume(bb, id, +ev.target.value))} /> <span className="mono">{fmt(v.V)} L</span></label>
        </div>
        <div className="lab-ctl-row">
          <button onClick={() => act((bb) => inject(bb, id, 0.05))}>+50 g</button>
          <button onClick={() => act((bb) => inject(bb, id, 0.2))}>+200 g</button>
          <button onClick={() => act((bb) => inject(bb, id, -0.05, side))} disabled={v.mRef <= 0}>−50 g {side === 'gas' ? 'gaz' : 'liquide'}</button>
          <button onClick={() => act((bb) => { Object.assign(vol(bb, id), { mRef: 0, mN2: 0, mAir: 0, mH2O: 0 }); })}>Vider</button>
        </div>
      </div>
    );
  };

  return (
    <div className="lab">
      <header className="lab-head">
        <div>
          <h1>Labo des gaz</h1>
          <p className="muted">Une paillasse, des bouteilles transparentes et de la vraie physique : chauffez, remplissez, videz, et regardez ce que fait le fluide.</p>
        </div>
        <div className="lab-time" role="group" aria-label="Contrôle du temps">
          <button className="lab-play" onClick={() => setRunning(!running)} aria-label={running ? 'Pause' : 'Lecture'}>{running ? '⏸' : '▶'}</button>
          {SPEEDS.map((s) => (
            <button key={s} className={speed === s ? 'primary' : ''} aria-pressed={speed === s} onClick={() => setSpeed(s)}>×{s}</button>
          ))}
          <span className="lab-clock mono" aria-label="Temps simulé">{clock(b.c.t)}</span>
        </div>
      </header>

      <nav className="lab-exps" aria-label="Expériences">
        <button className={exp === null ? 'lab-exp active' : 'lab-exp'} onClick={() => load(null)}>
          <span className="lab-exp-id">∞</span><span>Paillasse libre</span>
        </button>
        {EXPERIMENTS.map((x) => (
          <button key={x.id} className={`lab-exp${exp === x.id ? ' active' : ''}${done.includes(x.id) ? ' done' : ''}`} onClick={() => load(x.id)} title={x.title}>
            <span className="lab-exp-id">{done.includes(x.id) ? '✓' : x.id}</span><span>{x.title}</span>
          </button>
        ))}
      </nav>

      {e && (
        <section className={reached ? 'card lab-brief reached' : 'card lab-brief'} aria-live="polite">
          <div className="row">
            <span className="badge">{e.id}</span>
            <h2>{e.title}</h2>
            {done.includes(e.id) && <span className="badge ok">✓ réussie</span>}
            <button className="lab-reset" onClick={() => load(e.id)}>↺ Recommencer</button>
          </div>
          <p className="lab-instr">{e.instruction}</p>
          {reached ? (
            <div className="lab-takeaway">
              <p><strong>À retenir :</strong> {e.takeaway[0]}</p>
              <p>{e.takeaway[1]}</p>
              <a className="btn primary" href={`#/quiz/generateur/${e.quiz}`}>Quiz : {e.quiz === 'g-psat' ? 'pression de saturation' : 'température de saturation'} →</a>
            </div>
          ) : (
            <p className="muted lab-wait"><span className="lab-spinner" aria-hidden="true" /> Expérience en cours…</p>
          )}
        </section>
      )}

      <div className="lab-main">
        <div className="card lab-bench-card">
          <BenchView b={b} boil={boil.current} onValve={() => act((bb) => setValve(bb, !valveOpen(bb)))} onPump={() => act((bb) => setPump(bb, !pumpOn(bb)))} />
          <div className="lab-alerts">
            {sA.phase === 'liquidFull' && <div className="lab-alert bad">⚠ Bouteille A pleine de liquide : la pression monte d'environ 15 bar par degré. Refroidissez ou soutirez du liquide !</div>}
            {sB.phase === 'liquidFull' && b.second && <div className="lab-alert bad">⚠ Bouteille B pleine de liquide !</div>}
            {pumping && sA.Pref > 0.05 && <div className="lab-alert bad">La pompe à vide rejette du fluide frigorigène à l'atmosphère : on récupère d'abord, on tire au vide ensuite.</div>}
            {emitted >= 0.5 && <div className="lab-alert warn">Fluide rejeté à l'atmosphère : {fmt(emitted, 0)} g</div>}
            {sA.phase !== 'empty' && sA.liquidFraction > 0.8 && sA.phase !== 'liquidFull' && <div className="lab-alert warn">Bouteille A remplie à plus de 80 % de liquide.</div>}
          </div>
        </div>

        <aside className="lab-side">
          {(pumping || sA.P < P_ATM) && (
            <div className="lab-inst"><VacuumGauge pAbs={sA.P} /></div>
          )}
          <div className="lab-inst">
            <span className="lab-inst-cap">Balance (bouteille A)</span>
            <Scale kg={emptyMass(A.V) + A.mRef + A.mN2 + A.mAir + A.mH2O} tare={tare} onTare={() => setTare(emptyMass(A.V) + A.mRef + A.mN2 + A.mAir + A.mH2O)} />
          </div>
          {blend && (
            <div className="card lab-blend">
              <span className="lab-inst-cap">Composition du liquide (A)</span>
              <div className="lab-blend-bar" role="img" aria-label={`${blend.light} ${Math.round(b.blend * 100)} %, ${blend.heavy} ${Math.round((1 - b.blend) * 100)} %`}>
                <div className="light" style={{ width: `${b.blend * 100}%` }} />
                <div className="nominal" style={{ left: `${blend.x0 * 100}%` }} title="composition d'origine" />
              </div>
              <div className="row lab-blend-legend">
                <span><i className="sw light" />{blend.light} {Math.round(b.blend * 100)} %</span>
                <span><i className="sw heavy" />{blend.heavy} {Math.round((1 - b.blend) * 100)} %</span>
              </div>
            </div>
          )}
        </aside>
      </div>

      <div className="lab-lower">
        <div className="card">
          <h3>Diagramme P–T · {f}</h3>
          <PtChart fluid={f} trail={trail.current} now={{ T: A.T, P: sA.P }} other={b.second ? { T: vol(b, 'B').T, P: sB.P } : undefined} water={A.mH2O > 0} />
          <p className="muted lab-legend"><i className="sw a" /> bouteille A (avec sa trace){b.second && <> · <i className="sw b" /> bouteille B</>}</p>
        </div>

        <div className="card lab-controls">
          <h3>Réglages</h3>
          <label className="lab-field">Fluide
            <select value={f} onChange={(ev) => act((bb) => changeFluid(bb, ev.target.value as FluidId))}>
              {FLUID_IDS.map((id) => <option key={id} value={id}>{FLUIDS[id].name}</option>)}
            </select>
          </label>
          <label className="lab-field lab-plate">Plaque
            <input type="range" min={-40} max={70} step={1} value={b.plate} onChange={(ev) => act((bb) => setPlate(bb, +ev.target.value))}
              style={{ accentColor: b.plate > 25 ? 'var(--hp)' : b.plate < 0 ? 'var(--lp)' : 'var(--copper)' }} />
            <span className="mono">{b.plate > 0 ? '+' : ''}{b.plate} °C</span>
          </label>
          <fieldset className="lab-side-pick">
            <legend>Soutirage</legend>
            <label><input type="radio" checked={side === 'gas'} onChange={() => setSide('gas')} /> par le haut (gaz)</label>
            <label><input type="radio" checked={side === 'liquid'} onChange={() => setSide('liquid')} /> par le bas (liquide)</label>
          </fieldset>
          {vesselPanel('A')}
          <div className="lab-ctl-row">
            <button onClick={() => act((bb) => addN2(bb, 'A', 0.005))}>+5 g N₂ dans A</button>
            <button onClick={() => act((bb) => addWater(bb, 'A', 0.003))}>Quelques gouttes d'eau</button>
            <button className={pumping ? 'primary' : ''} aria-pressed={pumping} onClick={() => act((bb) => setPump(bb, !pumping))}>Pompe à vide : {pumping ? 'ON' : 'OFF'}</button>
          </div>
          <label className="lab-check"><input type="checkbox" checked={b.second} onChange={(ev) => act((bb) => setSecond(bb, ev.target.checked))} /> Deuxième bouteille (B) reliée par une vanne</label>
          {b.second && <>
            <div className="lab-ctl-row">
              <button className={valveOpen(b) ? 'primary' : ''} aria-pressed={valveOpen(b)} onClick={() => act((bb) => setValve(bb, !valveOpen(bb)))}>Vanne A ↔ B : {valveOpen(b) ? 'ouverte' : 'fermée'}</button>
            </div>
            {vesselPanel('B')}
          </>}
        </div>
      </div>
    </div>
  );
}
