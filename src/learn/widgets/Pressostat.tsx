import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { fluid, toAbs, tsat } from '../../physics/refrigerants';
import type { FluidId } from '../../physics/types';
import { FluidSelect, Readout, Widget, clamp, fmt } from './common';

// Local copy of the KP rules (specs/02 §pressostats): BP cut-out = range − diff; HP cut-in = range − diff.
const KP1 = { range: [-0.2, 7.5], diff: [0.7, 4] } as const;
const KP5 = { range: [8, 32], diff: [1.8, 6] } as const;

const SWEEP = 135;
const snap = (v: number, step: number) => Number((Math.round(v / step) * step).toFixed(2));

function Dial({ label, value, min, max, step, majors, onChange, tone }: {
  label: string; value: number; min: number; max: number; step: number; majors: number[]; onChange: (v: number) => void; tone: 'lp' | 'hp';
}) {
  const ref = useRef<SVGSVGElement>(null);
  const ang = (v: number) => -SWEEP + (2 * SWEEP * (v - min)) / (max - min);
  const pt = (a: number, r: number) => [60 + r * Math.sin((a * Math.PI) / 180), 60 - r * Math.cos((a * Math.PI) / 180)];
  const set = (v: number) => onChange(clamp(snap(v, step), min, max));

  const fromPointer = (e: PointerEvent<SVGSVGElement>) => {
    const b = ref.current!.getBoundingClientRect();
    const a = (Math.atan2(e.clientX - b.left - b.width / 2, -(e.clientY - b.top - b.height / 2)) * 180) / Math.PI;
    set(min + ((clamp(a, -SWEEP, SWEEP) + SWEEP) / (2 * SWEEP)) * (max - min));
  };
  const onKey = (e: KeyboardEvent) => {
    const d = { ArrowUp: step, ArrowRight: step, ArrowDown: -step, ArrowLeft: -step, PageUp: 10 * step, PageDown: -10 * step }[e.key];
    if (d !== undefined) { e.preventDefault(); set(value + d); }
    else if (e.key === 'Home') { e.preventDefault(); set(min); }
    else if (e.key === 'End') { e.preventDefault(); set(max); }
  };

  const minors: number[] = [];
  for (let v = min; v <= max + 1e-9; v += (max - min) / 30) minors.push(v);
  const [x0, y0] = pt(-SWEEP, 46), [x1, y1] = pt(SWEEP, 46);
  const [nx, ny] = pt(ang(value), 38);

  return (
    <div className="dial-wrap">
      <svg
        ref={ref} viewBox="0 0 120 120" className={`dial ${tone}`}
        role="slider" tabIndex={0} aria-label={label} aria-valuemin={min} aria-valuemax={max} aria-valuenow={value}
        aria-valuetext={`${fmt(value, 1)} bar`}
        onKeyDown={onKey}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); fromPointer(e); }}
        onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) fromPointer(e); }}
      >
        <circle cx={60} cy={60} r={56} className="dial-face" />
        <path d={`M${x0} ${y0} A46 46 0 1 1 ${x1} ${y1}`} className="dial-arc" />
        {minors.map((v, i) => {
          const [a, b] = pt(ang(v), 46), [c, d] = pt(ang(v), 42);
          return <line key={i} x1={a} y1={b} x2={c} y2={d} className="dial-tick" />;
        })}
        {majors.map((v) => {
          const [a, b] = pt(ang(v), 48), [c, d] = pt(ang(v), 40), [tx, ty] = pt(ang(v), 31);
          return (
            <g key={v}>
              <line x1={a} y1={b} x2={c} y2={d} className="dial-tick major" />
              <text x={tx} y={ty + 3} textAnchor="middle" className="dial-num">{v}</text>
            </g>
          );
        })}
        <line x1={60} y1={60} x2={nx} y2={ny} className="dial-needle" />
        <circle cx={60} cy={60} r={6} className="dial-hub" />
        <text x={60} y={98} textAnchor="middle" className="dial-value">{fmt(value, 1)}</text>
        <text x={60} y={108} textAnchor="middle" className="dial-unit">bar</text>
      </svg>
      <span className="dial-label">{label}</span>
    </div>
  );
}

function Cycle({ on, off, diff }: { on: number; off: number; diff: number }) {
  const lo = off - 0.6, hi = on + 0.6;
  const y = (p: number) => 100 - ((p - lo) / (hi - lo)) * 86;
  const run = 22 + 16 * diff, stop = 14 + 10 * diff;
  const runs: [number, number][] = [];
  let x = 46, d = `M${x} ${y(on)}`;
  while (x < 350) {
    runs.push([x, Math.min(x + run, 350)]);
    x += run; d += ` L${x} ${y(off)}`;
    x += stop; d += ` L${x} ${y(on)}`;
  }
  return (
    <svg viewBox="0 0 360 132" className="chart" role="img" aria-label="Évolution de la BP : le compresseur s'arrête à la coupure et redémarre à l'enclenchement">
      <defs><clipPath id="kp-clip"><rect x={46} y={0} width={304} height={132} /></clipPath></defs>
      {runs.map(([a, b]) => <rect key={a} x={a} y={104} width={b - a} height={8} className="run-band" />)}
      <line x1={46} x2={350} y1={y(on)} y2={y(on)} className="limit on" />
      <line x1={46} x2={350} y1={y(off)} y2={y(off)} className="limit off" />
      <text x={42} y={y(on) + 4} textAnchor="end" className="tick">{fmt(on, 1)}</text>
      <text x={42} y={y(off) + 4} textAnchor="end" className="tick">{fmt(off, 1)}</text>
      <path d={d} className="bp-trace" clipPath="url(#kp-clip)" />
      <text x={350} y={y(on) - 5} textAnchor="end" className="tick strong">enclenchement</text>
      <text x={350} y={y(off) + 13} textAnchor="end" className="tick strong">coupure</text>
      <text x={46} y={127} className="tick">compresseur en marche</text>
    </svg>
  );
}

export default function Pressostat() {
  const [id, setId] = useState<FluidId>('R134a');
  const [bpRange, setBpRange] = useState(2.5);
  const [bpDiff, setBpDiff] = useState(1.5);
  const [hpRange, setHpRange] = useState(16);
  const [hpDiff, setHpDiff] = useState(4);

  const bpOn = bpRange, bpOff = snap(bpRange - bpDiff, 0.1);
  const hpOff = hpRange, hpOn = snap(hpRange - hpDiff, 0.1);
  const tMin = fluid(id).sat[0][0];
  const ts = (prel: number) => {
    if (toAbs(prel) <= 0) return 'impossible : sous le vide absolu';
    const t = tsat(id, toAbs(prel));
    return t < tMin ? `< ${tMin} °C sat.` : `≈ ${fmt(t, 0)} °C sat.`;
  };

  return (
    <Widget
      title="Réglage des pressostats BP (type KP1) et HP (type KP5)"
      note="Tournez les cadrans (glisser, ou flèches du clavier). Pressions relatives. Les températures de saturation affichées dépendent du fluide choisi."
    >
      <div className="widget-controls"><FluidSelect value={id} onChange={setId} /></div>
      <div className="kp-grid">
        <section className="kp lp" aria-label="Pressostat basse pression">
          <h4>BP — régulation / sécurité manque de fluide</h4>
          <div className="row">
            <Dial label="Range = enclenchement" value={bpRange} min={KP1.range[0]} max={KP1.range[1]} step={0.1} majors={[0, 2, 4, 6]} onChange={setBpRange} tone="lp" />
            <Dial label="Différentiel" value={bpDiff} min={KP1.diff[0]} max={KP1.diff[1]} step={0.1} majors={[1, 2, 3, 4]} onChange={setBpDiff} tone="lp" />
          </div>
          <div className="readouts">
            <Readout label="Enclenchement" value={`${fmt(bpOn, 1)} bar`} sub={ts(bpOn)} accent="ok" />
            <Readout label="Coupure = range − diff" value={`${fmt(bpOff, 1)} bar`} sub={ts(bpOff)} accent="bad" />
          </div>
          {bpOff < -0.9 && <p className="alert bad">Coupure hors plage : un KP1 ne descend pas sous −0,9 bar.</p>}
          {bpOff >= -0.9 && bpOff < 0 && <p className="alert warn">Coupure sous la pression atmosphérique : en cas de fuite, le circuit aspire de l'air humide.</p>}
          {bpDiff < 1 && <p className="alert warn">Différentiel faible : redémarrages fréquents (court-cyclage), le compresseur s'use.</p>}
        </section>
        <section className="kp hp" aria-label="Pressostat haute pression">
          <h4>HP — sécurité surpression</h4>
          <div className="row">
            <Dial label="Range = coupure" value={hpRange} min={KP5.range[0]} max={KP5.range[1]} step={0.5} majors={[8, 16, 24, 32]} onChange={setHpRange} tone="hp" />
            <Dial label="Différentiel" value={hpDiff} min={KP5.diff[0]} max={KP5.diff[1]} step={0.1} majors={[2, 3, 4, 5, 6]} onChange={setHpDiff} tone="hp" />
          </div>
          <div className="readouts">
            <Readout label="Coupure" value={`${fmt(hpOff, 1)} bar`} sub={ts(hpOff)} accent="bad" />
            <Readout label="Réenclenchement = range − diff" value={`${fmt(hpOn, 1)} bar`} sub={ts(hpOn)} accent="ok" />
          </div>
          <p className="widget-text">En sécurité HP, on préfère souvent la version à <b>réarmement manuel</b> : après une coupure, quelqu'un doit chercher la cause avant de relancer.</p>
        </section>
      </div>
      <Cycle on={bpOn} off={bpOff} diff={bpDiff} />
    </Widget>
  );
}
