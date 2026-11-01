import { useCallback, useEffect, useRef, useState } from 'react';
import PlatineBoard from './scene/PlatineBoard';
import Manifold from './instruments/Manifold';
import VacuumGauge from './instruments/VacuumGauge';
import Scale from './instruments/Scale';
import Readout from './instruments/Readout';
import Toolbox, { toolLabel } from './Toolbox';
import Panel from './panels/Panels';
import { TARGET_LABELS, type TargetId } from './sceneIds';
import type { Action, GameState, Level, ManifoldValve, Socket, Tier } from './types';
import {
  SEVERITY_LABEL, SOCKET_LABELS, TIERS, answersFor, clickAction, currentObjective, dispatch, emittedG, fmt, fmtTime, highlight,
  hoseName, objectivesFor, readings, scaleGross, socketAction, tick, type PanelId,
} from './engine';
import { concentration, gasDetector, gasReading, gaugeP, sceneView, vs } from './platineModel';
import { getLevel } from '../levels';
import { SANDBOX_FLUIDS } from '../levels/sandbox';
import { FLUID_IDS, toAbs, toRel } from '../physics/refrigerants';
import type { FluidId } from '../physics/types';
import { mulberry32, parseNumber } from '../learn/quiz';
import { useHashRoute } from '../ui/useHashRoute';
import { record, setLevelResult } from '../progress/store';
import './game.css';

const isTier = (x: string | undefined): x is Tier => x === 'guide' || x === 'standard' || x === 'examen';

export default function LevelPage({ id }: { id?: string }) {
  const [, , tierArg] = useHashRoute();
  const [run, setRun] = useState(0);
  const level = getLevel(id);
  if (!level) return <div className="card"><h1>Niveau introuvable</h1><p><a href="#/niveaux">Retour aux niveaux</a></p></div>;
  if (!isTier(tierArg)) return <Briefing level={level} />;
  return <Game key={`${level.id}/${tierArg}/${run}`} level={level} tier={tierArg} onRestart={() => setRun((r) => r + 1)} />;
}

function Briefing({ level }: { level: Level }) {
  if (level.sandbox) return (
    <div className="lv-brief card">
      <p><a href="#/niveaux">← Niveaux</a></p>
      <h1>Atelier libre</h1>
      <p>{level.briefing}</p>
      <h3>Choisir le fluide de la platine</h3>
      <div className="row">
        {SANDBOX_FLUIDS.map((f) => <a key={f} className="btn" href={`#/niveau/LIBRE-${f}/guide`}>{f}</a>)}
      </div>
    </div>
  );
  return (
    <div className="lv-brief card">
      <p><a href="#/niveaux">← Niveaux</a></p>
      <h1>{level.id} · {level.title}</h1>
      <h3>Ordre de mission</h3>
      <p>{level.briefing}</p>
      <div className="grid">
        {TIERS.map((t) => (
          <a key={t.id} className="card lv-tier" href={`#/niveau/${level.id}/${t.id}`}>
            <h3>{t.label}</h3>
            <p className="muted">{t.desc}</p>
            <p>{level.tierNotes[t.id]}</p>
          </a>
        ))}
      </div>
    </div>
  );
}

const OPENINGS: [number, string][] = [[0, 'fermée'], [0.05, 'entrouverte (5 %)'], [0.3, 'mi-ouverte (30 %)'], [1, 'ouverte']];

function Game({ level, tier, onRestart }: { level: Level; tier: Tier; onRestart: () => void }) {
  const [s, setS] = useState<GameState>(() => level.setup(tier, mulberry32(tier === 'examen' ? Date.now() : 1)));
  const [panel, setPanel] = useState<PanelId | null>(null);
  const [showJournal, setShowJournal] = useState(false);
  const [toast, setToast] = useState<GameState['toast']>(null);
  const act = useCallback((a: Action) => setS((x) => dispatch(level, x, a)), [level]);

  useEffect(() => {
    if (s.timeScale === 0 || s.finished) return;
    let raf = 0, last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      setS((x) => tick(level, x, dt * x.timeScale));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [level, s.timeScale, s.finished]);

  useEffect(() => {
    if (!s.toast) return;
    setToast(s.toast);
    const h = setTimeout(() => setToast(null), Math.max(s.toast.kind === 'bad' ? 7000 : 4500, s.toast.text.length * 60));
    return () => clearTimeout(h);
  }, [s.toast?.n]);

  const recorded = useRef(false);
  useEffect(() => {
    const r = s.finished;
    if (!r || recorded.current) return;
    recorded.current = true;
    if (r.completed) setLevelResult(level.id, r.score, r.stars);
    record({ kind: 'level', skills: level.skills, score: r.completed ? r.score / 100 : 0, detail: { level: level.id, tier, mistakes: s.mistakes.map((m) => m.id) } });
  }, [s.finished, level, tier, s.mistakes]);

  const onTarget = (t: TargetId) => {
    const a = clickAction(s, t);
    if ('panel' in a) setPanel(a.panel);
    else act(a);
  };

  const lpG = useDamped(gaugeP(s, 'mf.lp')), hpG = useDamped(gaugeP(s, 'mf.hp'));
  if (s.finished) return <Debrief level={level} s={s} onRestart={onRestart} />;

  const exam = tier === 'examen';
  const obj = currentObjective(level, s);
  const stuck = tier === 'guide' && s.t - s.lastProgressT > 60;
  const hoseTool = s.tool?.startsWith('hose:') ? s.tool.slice(5) : null;
  const sockets: Socket[] = ['mf.lp', 'mf.center', 'mf.hp', ...(s.manifold.fourWay ? ['mf.vac' as const] : []),
    ...(s.bench.pump ? ['pump' as const] : []), ...(s.bench.recovery ? ['rec.in' as const, 'rec.out' as const] : []),
    ...(s.bench.n2 ? ['n2' as const] : []), ...(s.bench.cylinder ? ['cyl.gas' as const] : []),
    ...(s.bench.cylinder && s.bench.cylinder.dipTube !== false ? ['cyl.liq' as const] : [])];
  const mfValves: ManifoldValve[] = ['lp', 'hp', ...(s.manifold.fourWay ? ['charge' as const] : [])];

  return (
    <div className="lv">
      <header className="lv-head">
        <a href={`#/niveau/${level.id}`}>← {level.id}</a>
        <h1>{level.title}</h1>
        <span className="badge">{TIERS.find((t) => t.id === tier)!.label}</span>
        <span className="mono" title="Temps simulé">⏱ {fmtTime(s.t)}{exam && level.timeLimit ? ` / ${fmtTime(level.timeLimit)}` : ''}</span>
        <span className={`mono ${emittedG(s) > 5 ? 'lv-bad' : ''}`}>Émissions {fmt(emittedG(s))} g</span>
        {level.sandbox
          ? <button type="button" onClick={() => confirm('Remettre la platine à zéro ?') && onRestart()}>Recommencer</button>
          : <button type="button" className="primary" onClick={() => confirm('Terminer l\'intervention ?') && act({ type: 'finish' })}>Terminer</button>}
      </header>

      <div className="lv-main">
        <div className="lv-scene">
          <PlatineBoard view={sceneView(s, highlight(level, s))} onTarget={onTarget} cursorTool={s.tool ?? undefined} />
          {s.tool && <div className="lv-cursor">Outil : {toolLabel(s.tool, s.hoses)}</div>}
          {panel && <Panel id={panel} s={s} act={act} onClose={() => setPanel(null)} />}
        </div>

        <aside className="lv-side">
          <section className="card">
            <h3>{level.sandbox ? 'Atelier libre' : 'Ordre de mission'}</h3>
            <p className="lv-small">{level.briefing}</p>
            {!exam && !level.sandbox && (
              <ol className="lv-obj">
                {objectivesFor(level, tier).map((o) => (
                  <li key={o.id} className={s.done.includes(o.id) ? 'done' : o === obj ? 'current' : ''}>{o.label}</li>
                ))}
              </ol>
            )}
          </section>

          <section className="card lv-inst">
            <h3>Manifold</h3>
            <Manifold fluid={s.manifold.scale} lpAbs={lpG} hpAbs={hpG} valves={s.manifold.valves}
              fourWay={s.manifold.fourWay} onToggle={(v) => act({ type: 'toggleManifold', valve: v })} />
            <label className="row lv-small">Échelle
              <select value={s.manifold.scale} onChange={(e) => act({ type: 'setScale', fluid: e.target.value as FluidId })}>
                {FLUID_IDS.map((f) => <option key={f}>{f}</option>)}
              </select>
            </label>
            <div className="lv-open lv-small">Ouverture
              {mfValves.map((v) => {
                const cur = s.manifold.valves[v] ? s.manifold.opening[v] ?? 1 : 0;
                const opts = OPENINGS.some(([o]) => o === cur) ? OPENINGS : [...OPENINGS, [cur, `${Math.round(cur * 100)} %`] as [number, string]];
                return (
                  <label key={v}>{{ lp: 'BP', hp: 'HP', charge: 'charge', vac: 'vide' }[v]}{' '}
                    <select value={cur} onChange={(e) => act({ type: 'setManifoldOpening', valve: v, opening: Number(e.target.value) })}>
                      {opts.map(([o, l]) => <option key={o} value={o}>{l}</option>)}
                    </select>
                  </label>
                );
              })}
            </div>
            <h4>Flexibles</h4>
            <ul className="lv-hoses">
              {s.hoses.map((h) => (
                <li key={h.id}>
                  <span className={`lv-chip h-${h.color}`} aria-hidden="true" />
                  <span className="lv-small">{hoseName(h)} : {h.manifold ? SOCKET_LABELS[h.manifold] : 'libre'} ↔ {h.port ? SOCKET_LABELS[h.port] : 'libre'}</span>
                  <button type="button" className="lv-mini" aria-pressed={h.valve} onClick={() => act({ type: 'toggleHoseValve', hose: h.id })}>
                    vanne à boule {h.valve ? 'ouverte' : 'fermée'}
                  </button>
                  {h.port && <button type="button" className="lv-mini" onClick={() => act({ type: 'disconnectHose', hose: h.id, end: 'port' })}>déposer côté prise</button>}
                </li>
              ))}
            </ul>
            <h4>Raccords {hoseTool ? '(cliquez pour raccorder le flexible choisi)' : ''}</h4>
            <div className="lv-sockets">
              {sockets.map((k) => {
                const h = s.hoses.find((x) => x.manifold === k || x.port === k);
                return (
                  <button key={k} type="button" className="lv-mini" disabled={!hoseTool}
                    onClick={() => hoseTool && act(socketAction(s, hoseTool, k))}>
                    {h && <span className={`lv-chip h-${h.color}`} aria-hidden="true" />}{SOCKET_LABELS[k]}
                  </button>
                );
              })}
            </div>
            {readings(level, s).map(({ probe, r }) => (
              <Readout key={`${probe.tool}${probe.target}`} label={`${r.label} (${TARGET_LABELS[probe.target]})`} value={r.value} unit={r.unit} digits={r.digits} />
            ))}
            {s.bench.vacuumGaugeAt && <VacuumGauge pAbs={vs(s, s.bench.vacuumGaugeAt).P} />}
            {s.bench.scaleTare !== undefined && <Scale kg={scaleGross(s)} tare={s.bench.scaleTare} onTare={() => act({ type: 'tareScale' })} />}
            <Bench s={s} act={act} level={level} />
          </section>

          {(level.tools.includes('gasDetector') || s.room || s.ignition) && <Atex s={s} act={act} level={level} />}

          {answersFor(level, tier).length > 0 && (
            <section className="card">
              <h3>Relevés</h3>
              {answersFor(level, tier).map((f) => <AnswerRow key={f.id} f={f} s={s} exam={exam} act={act} />)}
            </section>
          )}
        </aside>
      </div>

      <footer className="lv-bar">
        <Toolbox tools={level.tools} hoses={s.hoses} current={s.tool} onPick={(t) => act({ type: 'pickTool', tool: t })} />
        <div className="row">
          <div className="lv-speed" role="group" aria-label="Vitesse de simulation">
            {([0, 1, 10, 60] as const).map((k) => (
              <button key={k} type="button" aria-pressed={s.timeScale === k} className={s.timeScale === k ? 'active' : ''}
                onClick={() => act({ type: 'setTimeScale', scale: k })}>{k === 0 ? '⏸' : `×${k}`}</button>
            ))}
          </div>
          {!exam && !level.sandbox && (
            <button type="button" className={stuck ? 'lv-pulse' : ''} onClick={() => act({ type: 'requestHint' })}>
              Indice{tier === 'standard' ? ' (−5)' : ''}
            </button>
          )}
          {tier === 'guide' && <button type="button" disabled={!s.undo} onClick={() => act({ type: 'undo' })}>Annuler</button>}
          <button type="button" aria-expanded={showJournal} onClick={() => setShowJournal((v) => !v)}>Journal ({s.journal.length})</button>
        </div>
      </footer>
      {showJournal && <Journal s={s} />}
      {toast && <div className={`toast ${toast.kind}`} role={toast.kind === 'bad' ? 'alert' : 'status'} onClick={() => setToast(null)}>{toast.text}</div>}
    </div>
  );
}

// glycerine-filled gauge: damps the hose's sub-second condensation flicker, follows real changes (> 1.5 bar) at once
function useDamped(v: number) {
  const r = useRef({ v, t: performance.now() });
  const now = performance.now(), a = 1 - Math.exp(-(now - r.current.t) / 400);
  r.current = { v: Math.abs(v - r.current.v) > 1.5 ? v : r.current.v + (v - r.current.v) * a, t: now };
  return r.current.v;
}

function AnswerRow({ f, s, exam, act }: { f: ReturnType<typeof answersFor>[number]; s: GameState; exam: boolean; act: (a: Action) => void }) {
  const [v, setV] = useState('');
  const a = s.answers[f.id];
  const send = () => {
    const n = f.choices ? Number(v) : parseNumber(v);
    if (n !== null && Number.isFinite(n)) act({ type: 'answer', field: f.id, value: n });
  };
  return (
    <form className="lv-answer" onSubmit={(e) => { e.preventDefault(); send(); }}>
      <label htmlFor={`ans-${f.id}`}>{f.label}</label>
      {f.choices ? (
        <select id={`ans-${f.id}`} value={v} onChange={(e) => setV(e.target.value)}>
          <option value="">—</option>
          {f.choices.map((c, i) => <option key={c} value={i}>{c}</option>)}
        </select>
      ) : (
        <input id={`ans-${f.id}`} inputMode="decimal" value={v} onChange={(e) => setV(e.target.value)} placeholder={a ? fmt(a.value, 2) : ''} />
      )}
      <span className="lv-small">{f.unit}</span>
      <button type="submit" className="lv-mini">OK</button>
      {a && <span className={exam ? 'muted' : a.ok ? 'lv-ok' : 'lv-bad'} aria-label={exam ? 'enregistré' : a.ok ? 'correct' : 'incorrect'}>{exam ? '•' : a.ok ? '✓' : '✗'}</span>}
    </form>
  );
}

function Bench({ s, act, level }: { s: GameState; act: (a: Action) => void; level: Level }) {
  const { pump, recovery, n2, cylinder } = s.bench;
  const [sp, setSp] = useState(n2 ? fmt(toRel(n2.setpoint)) : '');
  const custom = (level.actions ?? []).filter((c) => !c.visible || c.visible(s));
  if (!level.unitControl && !pump && !recovery && !n2 && !cylinder && !custom.length) return null;
  return (
    <div className="lv-bench">
      <h4>Commandes</h4>
      {level.unitControl && (
        <>
          <button type="button" onClick={() => act({ type: 'setUnit', on: !s.unitOn })}>{s.unitOn ? 'Arrêter l\'unité' : 'Mettre en marche'}</button>
          {s.unitOn && <span className="lv-small">Compresseur : {s.running ? 'en marche' : 'à l\'arrêt'}</span>}
        </>
      )}
      {pump && <button type="button" aria-pressed={pump.on} onClick={() => act({ type: 'device', device: 'pump', on: !pump.on })}>Pompe à vide : {pump.on ? 'marche' : 'arrêt'}</button>}
      {recovery && <button type="button" aria-pressed={recovery.on} onClick={() => act({ type: 'device', device: 'recovery', on: !recovery.on })}>Station : {recovery.on ? 'marche' : 'arrêt'}</button>}
      {n2 && (
        <>
          <button type="button" aria-pressed={n2.open} onClick={() => act({ type: 'device', device: 'n2', on: !n2.open })}>Azote : {n2.open ? 'ouvert' : 'fermé'}</button>
          <form className="row" onSubmit={(e) => { e.preventDefault(); const n = parseNumber(sp); if (n !== null) act({ type: 'setN2', setpoint: toAbs(n) }); }}>
            <label className="lv-small">Détendeur <input value={sp} onChange={(e) => setSp(e.target.value)} size={5} inputMode="decimal" /> bar rel</label>
            <button type="submit" className="lv-mini">Régler</button>
          </form>
        </>
      )}
      {cylinder && (
        <>
          <span className="lv-small">{cylinder.label}</span>
          <button type="button" aria-pressed={cylinder.gas} onClick={() => act({ type: 'cylValve', valve: 'gas' })}>Vanne gaz : {cylinder.gas ? 'ouverte' : 'fermée'}</button>
          {cylinder.dipTube !== false && <button type="button" aria-pressed={cylinder.liq} onClick={() => act({ type: 'cylValve', valve: 'liq' })}>Vanne liquide : {cylinder.liq ? 'ouverte' : 'fermée'}</button>}
          <button type="button" aria-pressed={!!cylinder.inverted} onClick={() => act({ type: 'invertCylinder' })}>{cylinder.inverted ? 'Remettre la bouteille debout' : 'Retourner la bouteille'}</button>
        </>
      )}
      {custom.map((c) => <CustomButton key={c.id} c={c} s={s} act={act} />)}
    </div>
  );
}

function Atex({ s, act, level }: { s: GameState; act: (a: Action) => void; level: Level }) {
  const d = gasDetector(s), fan = s.room?.fan;
  return (
    <section className="card lv-inst">
      <h3>Sécurité fluide inflammable</h3>
      {level.tools.includes('gasDetector') && (
        <>
          <div className="row">
            <button type="button" aria-pressed={d.on} onClick={() => act({ type: 'setGasDetector', on: !d.on })}>Détecteur : {d.on ? 'marche' : 'arrêt'}</button>
            <label className="lv-small">Position{' '}
              <select value={d.position} onChange={(e) => act({ type: 'setGasDetector', position: e.target.value as typeof d.position })}>
                <option value="floor">au sol</option>
                <option value="head">à hauteur de tête</option>
              </select>
            </label>
          </div>
          <span className={`lv-small ${d.battery === 'ok' ? '' : 'lv-bad'}`}>Piles : {{ ok: 'OK', low: 'faibles', empty: 'vides' }[d.battery]}</span>
          {d.battery !== 'ok' && <button type="button" className="lv-mini" onClick={() => act({ type: 'setGasDetector', battery: 'ok' })}>Remplacer les piles</button>}
          {(() => { const r = gasReading(s); return <Readout label={r.label} value={r.value} unit={r.unit} digits={0} />; })()}
        </>
      )}
      {s.tier === 'guide' && s.room && (
        <p className="lv-small muted">Local {fmt(s.room.volume, 0)} m³ : sol {fmt(concentration(s, 'floor'), 0)} % LIE, tête {fmt(concentration(s, 'head'), 0)} % LIE</p>
      )}
      {fan && <button type="button" aria-pressed={fan.on} onClick={() => act({ type: 'setRoomFan', on: !fan.on })}>Ventilateur ATEX : {fan.on ? 'marche' : 'arrêt'}</button>}
      {s.ignition && s.ignition.length > 0 && (
        <>
          <h4>Sources d'inflammation</h4>
          <ul className="lv-hoses">
            {s.ignition.map((x) => (
              <li key={x.id}>
                <span className={`lv-small ${x.active ? 'lv-bad' : 'lv-ok'}`}>{x.label} : {x.active ? 'active' : 'neutralisée'}</span>
                {x.active && <button type="button" className="lv-mini" onClick={() => act({ type: 'setIgnition', id: x.id, active: false })}>Couper / retirer</button>}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function CustomButton({ c, s, act }: { c: NonNullable<Level['actions']>[number]; s: GameState; act: (a: Action) => void }) {
  const [v, setV] = useState('');
  const label = typeof c.label === 'function' ? c.label(s) : c.label;
  if (!c.input) return <button type="button" onClick={() => act({ type: 'custom', id: c.id })}>{label}</button>;
  return (
    <form className="row" onSubmit={(e) => { e.preventDefault(); const n = parseNumber(v); if (n !== null) act({ type: 'custom', id: c.id, value: n }); }}>
      <label className="lv-small">{label} <input value={v} onChange={(e) => setV(e.target.value)} size={5} inputMode="decimal" /> {c.input.unit}</label>
      <button type="submit" className="lv-mini">OK</button>
    </form>
  );
}

function Journal({ s }: { s: GameState }) {
  return (
    <ol className="lv-journal card" aria-label="Journal d'intervention">
      {s.journal.map((j, i) => (
        <li key={i} className={`j-${j.kind}`}><span className="mono">{fmtTime(j.t)}</span> {j.text}</li>
      ))}
    </ol>
  );
}

function Debrief({ level, s, onRestart }: { level: Level; s: GameState; onRestart: () => void }) {
  const r = s.finished!;
  return (
    <div className="lv-debrief">
      <div className="card">
        <h1>{level.id} · Compte rendu d'intervention</h1>
        <p className="lv-stars" aria-label={`${r.stars} étoile(s) sur 3`}>{'★'.repeat(r.stars)}<span className="muted">{'★'.repeat(3 - r.stars)}</span></p>
        <p><strong>{r.completed ? r.score : '—'}/100</strong> · {r.completed ? 'Intervention réussie' : r.failed ?? 'Objectifs non atteints'} · émissions {fmt(r.emittedG)} g · {fmtTime(s.t)}</p>
        {!r.completed && !r.failed && (
          <ul className="lv-small">{objectivesFor(level, s.tier).filter((o) => !s.done.includes(o.id)).map((o) => <li key={o.id}>Non fait : {o.label}</li>)}</ul>
        )}
        <h3>Détail du score</h3>
        <table className="lv-small">
          <tbody>
            <tr><td>Départ</td><td className="mono">100</td></tr>
            {r.breakdown.map((b, i) => <tr key={i}><td>{b.label}</td><td className="mono">{b.points}</td></tr>)}
          </tbody>
        </table>
        {s.mistakes.length > 0 && (
          <>
            <h3>À revoir</h3>
            <ul>
              {s.mistakes.map((m) => (
                <li key={m.id}><span className={`badge ${m.severity === 'minor' ? 'warn' : 'bad'}`}>{SEVERITY_LABEL[m.severity]}</span> {m.message}{' '}
                  <a href={`#/lecons/${m.lesson ?? level.lesson}`}>Leçon</a> <span className="muted lv-small">({m.skill})</span></li>
              ))}
            </ul>
          </>
        )}
        <div className="row">
          <button type="button" className="primary" onClick={onRestart}>Rejouer</button>
          <a className="btn" href={`#/niveau/${level.id}`}>Changer de mode</a>
          <a className="btn" href="#/niveaux">Niveaux</a>
          <a className="btn" href={`#/lecons/${level.lesson}`}>Leçon du niveau</a>
        </div>
      </div>
      <Journal s={s} />
    </div>
  );
}
