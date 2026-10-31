import type { KeyboardEvent } from 'react';
import type { FluidId } from '../../physics/types';
import { FLUIDS, psat, toRel, tsat, type SatSide } from '../../physics/refrigerants';
import './instruments.css';

type ValveKey = 'lp' | 'hp' | 'vac' | 'charge';

export interface ManifoldProps {
  fluid: FluidId;
  lpAbs: number;
  hpAbs: number;
  valves: { lp: boolean; hp: boolean; vac?: boolean; charge?: boolean };
  fourWay?: boolean;
  onToggle?: (v: ValveKey) => void;
}

const A0 = 135, SWEEP = 270;
const polar = (cx: number, cy: number, r: number, deg: number): [number, number] => {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
};
const arc = (cx: number, cy: number, r: number, d0: number, d1: number) => {
  const [x0, y0] = polar(cx, cy, r, d0), [x1, y1] = polar(cx, cy, r, d1);
  return `M${x0},${y0} A${r},${r} 0 ${d1 - d0 > 180 ? 1 : 0} 1 ${x1},${y1}`;
};
const PORTS2: [number, string, string][] = [[150, 'var(--lp)', 'BP'], [220, 'var(--service)', 'SERVICE'], [290, 'var(--hp)', 'HP']];
const PORTS4: [number, string, string][] = [[132, 'var(--lp)', 'BP'], [204, 'var(--service)', 'CHARGE'], [238, '#4b5563', 'VIDE'], [308, 'var(--hp)', 'HP']];
const fmt = (v: number, d = 1) => v.toFixed(d).replace('.', ',');

interface GaugeProps {
  cx: number; cy: number; r: number; min: number; max: number; major: number; minor: number;
  pAbs: number; fluid: FluidId; side: SatSide; kind: 'lp' | 'hp';
}

function Gauge({ cx, cy, r, min, max, major, minor, pAbs, fluid, side, kind }: GaugeProps) {
  const ang = (v: number) => A0 + ((Math.min(max + 0.6, Math.max(min - 0.3, v)) - min) / (max - min)) * SWEEP;
  const rel = toRel(pAbs);
  const ticks = [];
  for (let v = min; v <= max + 1e-9; v += minor) {
    const isMajor = Math.abs(v / major - Math.round(v / major)) < 1e-6 || v === min;
    const [x0, y0] = polar(cx, cy, r - 3, ang(v)), [x1, y1] = polar(cx, cy, r - (isMajor ? 13 : 8), ang(v));
    ticks.push(<line key={v} x1={x0} y1={y0} x2={x1} y2={y1} strokeWidth={isMajor ? 1.6 : 0.8} className="inst-tick" />);
    if (isMajor) {
      const [tx, ty] = polar(cx, cy, r - 22, ang(v));
      ticks.push(<text key={`t${v}`} x={tx} y={ty + 3.5} className="inst-num" textAnchor="middle">{Math.round(v)}</text>);
    }
  }
  // °C saturation ring: placed with psat so each label sits exactly at the pressure where the fluid boils/condenses.
  const temps = [];
  let lastLabel = A0;
  const crit = FLUIDS[fluid].critical.T;
  for (let T = -50; T < crit; T += 5) {
    const pr = toRel(psat(fluid, T, side));
    if (pr < min || pr > max) continue;
    const a = ang(pr);
    const [x0, y0] = polar(cx, cy, r * 0.66, a), [x1, y1] = polar(cx, cy, r * 0.66 + (T % 10 ? 4 : 7), a);
    temps.push(<line key={T} x1={x0} y1={y0} x2={x1} y2={y1} className="inst-ttick" />);
    if (T % 10 === 0 && a - lastLabel >= 14) {
      lastLabel = a;
      const [tx, ty] = polar(cx, cy, r * 0.66 - 9, a);
      temps.push(<text key={`l${T}`} x={tx} y={ty + 2.5} className={`inst-tnum ${kind}`} textAnchor="middle">{T}</text>);
    }
  }
  const ts = pAbs > 0.05 ? tsat(fluid, pAbs, side) : NaN;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r + 11} fill="url(#inst-chrome)" stroke="#555" />
      <circle cx={cx} cy={cy} r={r + 5} className={`inst-ring ${kind}`} />
      <circle cx={cx} cy={cy} r={r} fill="#fbfaf6" />
      <path d={arc(cx, cy, r - 5, ang(min), ang(0))} className="inst-vac" />
      <path d={arc(cx, cy, r * 0.66, ang(Math.max(min, toRel(psat(fluid, -50, side)))), ang(Math.min(max, toRel(psat(fluid, crit - 0.1, side)))))} className={`inst-tarc ${kind}`} />
      {ticks}
      {temps}
      <text x={cx} y={cy + r * 0.8} className="inst-unit" textAnchor="middle">bar</text>
      <text x={cx} y={cy + r * 0.3} className={`inst-fluid ${kind}`} textAnchor="middle">{fluid} · °C</text>
      <text x={cx} y={cy + r * 0.44} className="inst-side" textAnchor="middle">{side === 'dew' ? 'rosée' : 'bulle'}</text>
      <g className="inst-needle" style={{ transform: `rotate(${ang(rel) - 270}deg)`, transformOrigin: `${cx}px ${cy}px` }}>
        <path d={`M${cx - 2.2},${cy + 9} L${cx},${cy - r + 8} L${cx + 2.2},${cy + 9} Z`} fill={kind === 'lp' ? '#1d3f8f' : '#991b1b'} />
      </g>
      <circle cx={cx} cy={cy} r={6} fill="url(#inst-chrome)" stroke="#333" />
      <path d={arc(cx, cy, r - 2, 200, 250)} stroke="#fff" strokeOpacity={0.6} strokeWidth={3} fill="none" />
      <g className="inst-lcd-g">
        <rect x={cx - 46} y={cy + r + 18} width={92} height={34} rx={4} className="inst-lcdbox" />
        <text x={cx + 40} y={cy + r + 33} className="inst-lcd" textAnchor="end">{fmt(rel, 2)} bar</text>
        <text x={cx + 40} y={cy + r + 47} className="inst-lcd small" textAnchor="end">{Number.isFinite(ts) ? `${fmt(ts)} °C` : '— °C'}</text>
      </g>
    </g>
  );
}

function Knob({ x, y, k, open, color, label, onToggle }: { x: number; y: number; k: ValveKey; open: boolean; color: string; label: string; onToggle?: (v: ValveKey) => void }) {
  const act = () => onToggle?.(k);
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } };
  const state = open ? 'ouverte' : 'fermée';
  return (
    <g role="button" tabIndex={0} aria-label={`Vanne ${label} du manifold : ${state}`} aria-pressed={open} className="inst-knob" onClick={act} onKeyDown={onKey}>
      <title>{`${label} — ${state}`}</title>
      <circle cx={x} cy={y} r={17} fill={color} stroke="#111" />
      <g style={{ transform: `rotate(${open ? 90 : 0}deg)`, transformOrigin: `${x}px ${y}px` }} className="inst-knob-grip">
        {Array.from({ length: 12 }, (_, i) => <line key={i} x1={x} y1={y - 17} x2={x} y2={y - 13} stroke="#000" strokeOpacity={0.35} transform={`rotate(${i * 30} ${x} ${y})`} />)}
        <rect x={x - 2} y={y - 15} width={4} height={10} rx={1} fill="#fff" />
      </g>
      <circle cx={x} cy={y} r={5} fill="#000" fillOpacity={0.25} />
      <text x={x} y={y + 30} textAnchor="middle" className={open ? 'inst-kstate open' : 'inst-kstate'}>{open ? 'OUVERT' : 'FERMÉ'}</text>
    </g>
  );
}

export default function Manifold({ fluid, lpAbs, hpAbs, valves, fourWay, onToggle }: ManifoldProps) {
  const R = 80;
  return (
    <svg className="inst-manifold" viewBox="0 0 440 372" role="group" aria-label={`Manifold ${fourWay ? '4' : '2'} voies, échelle ${fluid}`}>
      <defs>
        <radialGradient id="inst-chrome" cx=".35" cy=".3" r=".8">
          <stop offset="0" stopColor="#ffffff" /><stop offset=".5" stopColor="#b9c0c6" /><stop offset="1" stopColor="#5f676d" />
        </radialGradient>
        <linearGradient id="inst-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e5e8ea" /><stop offset=".5" stopColor="#aab1b6" /><stop offset="1" stopColor="#767d83" />
        </linearGradient>
      </defs>
      <Gauge cx={110} cy={110} r={R} min={-1} max={18} major={2} minor={0.5} pAbs={lpAbs} fluid={fluid} side="dew" kind="lp" />
      <Gauge cx={330} cy={110} r={R} min={-1} max={50} major={5} minor={1} pAbs={hpAbs} fluid={fluid} side="bubble" kind="hp" />
      <rect x={52} y={262} width={336} height={58} rx={10} fill="url(#inst-body)" stroke="#555" />
      <text x={220} y={277} textAnchor="middle" className="inst-brand">{fourWay ? 'MANIFOLD 4 VOIES' : 'MANIFOLD 2 VOIES'}</text>
      {(fourWay ? PORTS4 : PORTS2).map(([x, c, t]) => (
        <g key={t}>
          <rect x={x - 7} y={320} width={14} height={20} fill="url(#inst-chrome)" stroke="#444" />
          <rect x={x - (t === 'VIDE' ? 12 : 9)} y={336} width={t === 'VIDE' ? 24 : 18} height={10} rx={2} fill={c} stroke="#222" />
          <text x={x} y={360} textAnchor="middle" className="inst-port">{t}</text>
        </g>
      ))}
      <Knob x={34} y={290} k="lp" open={valves.lp} color="var(--lp)" label="BP" onToggle={onToggle} />
      <Knob x={406} y={290} k="hp" open={valves.hp} color="var(--hp)" label="HP" onToggle={onToggle} />
      {fourWay && <Knob x={168} y={298} k="charge" open={!!valves.charge} color="var(--service)" label="charge" onToggle={onToggle} />}
      {fourWay && <Knob x={272} y={298} k="vac" open={!!valves.vac} color="#4b5563" label="vide" onToggle={onToggle} />}
    </svg>
  );
}
