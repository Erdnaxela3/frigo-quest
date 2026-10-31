import type { CSSProperties, KeyboardEvent } from 'react';
import type { FluidId, VolumeState } from '../../physics/types';
import { FLUIDS, isSupercritical, psat, rhoVapSat, toRel } from '../../physics/refrigerants';
import { pumpOn, stateOf, valveOpen, vol, type Bench, type VesselId } from './experiments';

const W = 640, H = 480, PLATE_Y = 420;
const fmt = (v: number, d = 1) => v.toFixed(d).replace('.', ',');
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
// deterministic scatter so particles don't jump between renders
const rnd = (i: number, s: number) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };

const onKey = (act: () => void) => (e: KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); }
};

function gaugeRange(f: FluidId) {
  const top = toRel(psat(f, Math.min(60, FLUIDS[f].critical.T - 0.1), 'bubble')) * 1.2;
  const max = [10, 16, 25, 40, 60, 100, 160].find((m) => m >= top) ?? 160;
  const major = [1, 2, 5, 10, 20].find((s) => max / s <= 10)!;
  return { min: -1, max, major, minor: major / (major === 2 || major === 20 ? 4 : 5) };
}

const polar = (cx: number, cy: number, r: number, deg: number): [number, number] => {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
};
const arc = (cx: number, cy: number, r: number, d0: number, d1: number) => {
  const [x0, y0] = polar(cx, cy, r, d0), [x1, y1] = polar(cx, cy, r, d1);
  return `M${x0},${y0} A${r},${r} 0 ${d1 - d0 > 180 ? 1 : 0} 1 ${x1},${y1}`;
};

function Gauge({ cx, cy, r, pAbs, fluid }: { cx: number; cy: number; r: number; pAbs: number; fluid: FluidId }) {
  const { min, max, major, minor } = gaugeRange(fluid);
  const rel = toRel(pAbs), over = rel > max;
  const ang = (v: number) => 135 + ((clamp(v, min - 0.03 * max, max * 1.04) - min) / (max - min)) * 270;
  const els = [];
  for (let i = Math.ceil(min / minor); i * minor <= max + 1e-9; i++) {
    const v = i * minor, isMaj = Math.abs(v / major - Math.round(v / major)) < 1e-6;
    const [x0, y0] = polar(cx, cy, r - 2, ang(v)), [x1, y1] = polar(cx, cy, r - (isMaj ? 9 : 5), ang(v));
    els.push(<line key={v} x1={x0} y1={y0} x2={x1} y2={y1} stroke="#1f2326" strokeWidth={isMaj ? 1.3 : 0.6} />);
    if (isMaj) {
      const [tx, ty] = polar(cx, cy, r - 16, ang(v));
      els.push(<text key={`n${v}`} x={tx} y={ty + 3} className="lab-g-num" textAnchor="middle">{Math.round(v)}</text>);
    }
  }
  const crit = FLUIDS[fluid].critical.T;
  let last = -999;
  for (let T = -40; T < crit; T += 10) {
    if (T % 20 && FLUIDS[fluid].critical.T > 40) continue;
    const pr = toRel(psat(fluid, T));
    if (pr < min || pr > max) continue;
    const a = ang(pr);
    const [x0, y0] = polar(cx, cy, r * 0.5, a), [x1, y1] = polar(cx, cy, r * 0.5 + 4, a);
    els.push(<line key={`t${T}`} x1={x0} y1={y0} x2={x1} y2={y1} stroke="#1d3f8f" strokeWidth={0.7} />);
    if (a - last >= 26) {
      last = a;
      const [tx, ty] = polar(cx, cy, r * 0.5 - 8, a);
      els.push(<text key={`l${T}`} x={tx} y={ty + 2} className="lab-g-t" textAnchor="middle">{T}</text>);
    }
  }
  return (
    <g aria-hidden="true">
      <circle cx={cx} cy={cy} r={r + 7} fill="url(#lab-chrome)" stroke="#444" />
      <circle cx={cx} cy={cy} r={r} fill="#fbfaf6" />
      <path d={arc(cx, cy, r - 3, ang(min), ang(0))} stroke="#dc2626" strokeOpacity={0.5} strokeWidth={3} fill="none" />
      <path d={arc(cx, cy, r * 0.5, ang(Math.max(min, toRel(psat(fluid, -40)))), ang(Math.min(max, toRel(psat(fluid, crit - 0.1)))))} stroke="#1d3f8f" strokeWidth={0.7} fill="none" />
      {els}
      <text x={cx} y={cy + r * 0.5} className="lab-g-unit" textAnchor="middle">bar</text>
      <text x={cx} y={cy + r * 0.72} className="lab-g-fluid" textAnchor="middle">{fluid} °C</text>
      <g className="lab-needle" style={{ transform: `rotate(${ang(rel) - 270}deg)`, transformOrigin: `${cx}px ${cy}px` }}>
        <path d={`M${cx - 1.8},${cy + 9} L${cx},${cy - r + 5} L${cx + 1.8},${cy + 9} Z`} fill={over ? '#dc2626' : '#111'} />
      </g>
      <circle cx={cx} cy={cy} r={4} fill="url(#lab-chrome)" stroke="#333" />
      <path d={arc(cx, cy, r - 1, 200, 250)} stroke="#fff" strokeOpacity={0.7} strokeWidth={2.5} fill="none" />
      {over && <text x={cx} y={cy + r * 0.9} className="lab-g-over" textAnchor="middle">HORS ÉCHELLE</text>}
    </g>
  );
}

const geo = (V: number, cx: number) => {
  const w = 66 + 56 * Math.sqrt(V / 20), h = 130 + 120 * Math.sqrt(V / 20);
  return { cx, w, h, x0: cx - w / 2, y0: PLATE_Y - 2 - h };
};

function Vessel({ id, b, cx, boil }: { id: VesselId; b: Bench; cx: number; boil: number }) {
  const v = vol(b, id), s: VolumeState = stateOf(b, id), f = b.c.fluid;
  const { w, h, x0, y0 } = geo(v.V, cx);
  const pad = 4, ix = x0 + pad, iy = y0 + pad, iw = w - 2 * pad, ih = h - 2 * pad;
  const sc = s.phase !== 'empty' && isSupercritical(f, v.T);
  const lf = sc ? 0 : s.liquidFraction;
  const liqH = ih * lf, surf = iy + ih - liqH;
  const full = s.phase === 'liquidFull';
  const frost = clamp(-v.T / 12, 0, 0.85);
  const clip = `lab-clip-${id}`;
  const gasTop = iy + 4, gasH = Math.max(0, surf - gasTop - 4);
  const rhoGas = (kg: number) => kg / ((v.V / 1000) * Math.max(0.05, 1 - lf));
  const species: [string, number, number][] = [
    ['ref', s.phase === 'twoPhase' ? rhoVapSat(f, v.T) : s.phase === 'vapour' ? rhoGas(v.mRef) : 0, 1],
    ['n2', rhoGas(v.mN2), 2],
    ['air', rhoGas(v.mAir), 3],
    ['h2o', s.PH2O > 1e-4 ? 0.02 : 0, 4],
  ];
  const nDots = (rho: number) => (rho <= 1e-6 ? 0 : clamp(Math.round(6 * Math.log10(1 + rho * 10)), 2, 22));
  const bubbles = s.phase === 'twoPhase' && liqH > 6 ? Math.round(boil * 14) : 0;
  const drops = s.waterLiquid > 0 ? clamp(Math.ceil(s.waterLiquid * 1000), 1, 6) : 0;
  const boilingWater = drops > 0 && pumpOn(b) && s.P < 0.05;
  const mark80 = iy + ih * 0.2;

  return (
    <g className={full ? 'lab-vessel burst' : 'lab-vessel'}>
      <clipPath id={clip}><rect x={ix} y={iy} width={iw} height={ih} rx={Math.min(18, iw / 3)} /></clipPath>
      {/* neck, valve block */}
      <rect x={cx - 7} y={y0 - 20} width={14} height={22} fill="url(#lab-metal)" stroke="#333" />
      <rect x={cx - 12} y={y0 - 30} width={24} height={12} rx={3} fill="url(#lab-metal)" stroke="#333" />
      <rect x={x0} y={y0} width={w} height={h} rx={Math.min(22, w / 3)} className="lab-glass-back" />
      <g clipPath={`url(#${clip})`}>
        {sc ? (
          <rect x={ix} y={iy} width={iw} height={ih} className="lab-supercrit" />
        ) : (
          <>
            {species.map(([k, rho, seed]) =>
              Array.from({ length: nDots(rho) }, (_, i) => (
                <circle key={`${k}${i}`} className={`lab-dot ${k}`} r={k === 'ref' ? 2.2 : 1.8}
                  cx={ix + 4 + rnd(i, seed) * (iw - 8)} cy={gasTop + rnd(i, seed + 9) * gasH}
                  style={{ animationDelay: `${-rnd(i, seed + 3) * 4}s`, animationDuration: `${3 + rnd(i, seed + 5) * 3}s` }} />
              )))}
            {liqH > 0 && (
              <g>
                <rect x={ix} y={surf} width={iw} height={liqH + 2} fill="url(#lab-liquid)" />
                <ellipse cx={ix + iw / 2} cy={surf} rx={iw / 2} ry={Math.min(3, liqH / 2)} className={full ? 'lab-surface full' : 'lab-surface'} />
                {Array.from({ length: bubbles }, (_, i) => (
                  <circle key={i} className="lab-bubble" r={1.3 + rnd(i, 7) * 2}
                    cx={ix + 6 + rnd(i, 8) * (iw - 12)} cy={iy + ih - 3}
                    style={{ '--rise': `${-(liqH - 6)}px`, animationDelay: `${-rnd(i, 11) * 2}s`, animationDuration: `${2.6 - 1.6 * boil + rnd(i, 12)}s` } as CSSProperties} />
                ))}
              </g>
            )}
            {Array.from({ length: drops }, (_, i) => (
              <ellipse key={`w${i}`} className={boilingWater ? 'lab-drop boil' : 'lab-drop'} rx={4 + rnd(i, 21) * 4} ry={2.6}
                cx={ix + 10 + rnd(i, 22) * (iw - 20)} cy={iy + ih - 3 - liqH} />
            ))}
          </>
        )}
      </g>
      <rect x={x0} y={y0} width={w} height={h} rx={Math.min(22, w / 3)} className="lab-glass" />
      <rect x={x0 + 6} y={y0 + 10} width={5} height={h - 24} rx={2.5} fill="#fff" opacity={0.18} />
      {frost > 0 && (
        <g opacity={frost}>
          <rect x={x0} y={y0} width={w} height={h} rx={Math.min(22, w / 3)} fill="url(#lab-frost)" />
          <text x={cx} y={y0 + h - 10} textAnchor="middle" className="lab-tag frost">GIVRE</text>
        </g>
      )}
      {!sc && <g>
        <line x1={x0 + w - 12} x2={x0 + w - 2} y1={mark80} y2={mark80} stroke="var(--warn)" strokeWidth={1.2} />
        <text x={x0 + w + 3} y={mark80 + 3} className="lab-mark">80 %</text>
      </g>}
      {liqH > 10 && !full && <text x={x0 + w - 6} y={Math.min(iy + ih - 4, surf + 13)} textAnchor="end" className="lab-tag liq">{Math.round(lf * 100)} %</text>}
      {sc && <text x={cx} y={y0 + h / 2} textAnchor="middle" className="lab-tag sc">supercritique</text>}
      <text x={cx} y={PLATE_Y + 50} textAnchor="middle" className="lab-temp"><tspan className="lab-temp-id">{id} · {fmt(v.V, v.V < 10 ? 1 : 0)} L · </tspan>{fmt(v.T)} °C</text>
      {full && (
        <g className="lab-burst-warn">
          <rect x={cx - 64} y={y0 + h / 2 - 16} width={128} height={30} rx={6} />
          <text x={cx} y={y0 + h / 2 - 3} textAnchor="middle">⚠ PLEIN LIQUIDE</text>
          <text x={cx} y={y0 + h / 2 + 9} textAnchor="middle" className="small">risque d'éclatement</text>
        </g>
      )}
      <Gauge cx={cx} cy={y0 - 30 - 60} r={52} pAbs={s.P} fluid={f} />
    </g>
  );
}

export interface BenchViewProps { b: Bench; boil: Record<VesselId, number>; onValve: () => void; onPump: () => void }

export default function BenchView({ b, boil, onValve, onPump }: BenchViewProps) {
  const ax = b.second ? 270 : 360, bx = 500;
  const gA = geo(vol(b, 'A').V, ax), gB = geo(vol(b, 'B').V, bx);
  const left = 150, right = b.second ? 600 : 470;
  const t = b.plate, hot = clamp((t - 22) / 48, 0, 1), cold = clamp(-t / 40, 0, 1);
  const plateCol = t >= 22 ? `hsl(${20 - 10 * hot} 90% ${30 + 25 * hot}%)` : t <= 0 ? `hsl(200 80% ${40 + 35 * cold}%)` : 'hsl(210 10% 40%)';
  const open = valveOpen(b), pump = pumpOn(b);
  const pA = stateOf(b, 'A').P, pB = stateOf(b, 'B').P;
  const flowing = open && Math.abs(pA - pB) > 0.02;
  const ya = gA.y0 - 12, yb = gB.y0 - 12, mx = (ax + bx) / 2, vy = (ya + yb) / 2;
  const pipe = `M${ax + 7},${ya} H${mx} V${yb} H${bx - 7}`;
  const hose = `M118,382 C160,382 ${ax - 70},${ya} ${ax - 12},${ya}`;

  return (
    <svg className="lab-bench" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Paillasse : plaque à ${fmt(t, 0)} °C, ${b.second ? 'deux bouteilles' : 'une bouteille'}`}>
      <defs>
        <radialGradient id="lab-chrome" cx=".35" cy=".3" r=".8"><stop offset="0" stopColor="#fff" /><stop offset=".5" stopColor="#b9c0c6" /><stop offset="1" stopColor="#5f676d" /></radialGradient>
        <linearGradient id="lab-metal" x1="0" x2="1"><stop offset="0" stopColor="#8a9198" /><stop offset=".4" stopColor="#e5e8ea" /><stop offset="1" stopColor="#6b7278" /></linearGradient>
        <linearGradient id="lab-liquid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#93c5fd" stopOpacity=".85" /><stop offset="1" stopColor="#1d4ed8" stopOpacity=".9" /></linearGradient>
        <linearGradient id="lab-plate" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4b5563" /><stop offset="1" stopColor="#1f2937" /></linearGradient>
        <radialGradient id="lab-glow" cx=".5" cy="1" r=".7"><stop offset="0" stopColor="#f97316" stopOpacity=".7" /><stop offset="1" stopColor="#f97316" stopOpacity="0" /></radialGradient>
        <radialGradient id="lab-chill" cx=".5" cy="1" r=".7"><stop offset="0" stopColor="#7dd3fc" stopOpacity=".6" /><stop offset="1" stopColor="#7dd3fc" stopOpacity="0" /></radialGradient>
        <pattern id="lab-frost" width="14" height="14" patternUnits="userSpaceOnUse">
          <rect width="14" height="14" fill="#e0f2fe" fillOpacity=".55" />
          <path d="M7 2v10M2 7h10M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="#fff" strokeWidth=".7" />
        </pattern>
      </defs>

      {hot > 0 && <ellipse cx={(left + right) / 2} cy={PLATE_Y} rx={(right - left) / 1.6} ry={170 * hot + 20} fill="url(#lab-glow)" opacity={0.25 + 0.6 * hot} />}
      {cold > 0 && <ellipse cx={(left + right) / 2} cy={PLATE_Y} rx={(right - left) / 1.6} ry={120 * cold + 20} fill="url(#lab-chill)" opacity={0.3 + 0.6 * cold} />}
      {hot > 0.15 && [0, 1, 2, 3].map((i) => (
        <path key={i} className="lab-heat" d={`M${left + 40 + i * (right - left - 80) / 3},${PLATE_Y - 4} q6,-10 0,-20 q-6,-10 0,-20`} style={{ animationDelay: `${-i * 0.6}s` }} />
      ))}

      {/* vacuum pump */}
      <path d={hose} className={pump ? 'lab-hose on' : 'lab-hose'} />
      <g transform="translate(0 52)"><g role="button" tabIndex={0} aria-pressed={pump} aria-label={`Pompe à vide : ${pump ? 'en marche' : 'arrêtée'}`} className="lab-click" onClick={onPump} onKeyDown={onKey(onPump)}>
        <title>{pump ? 'Arrêter la pompe à vide' : 'Démarrer la pompe à vide'}</title>
        <rect x={22} y={312} width={96} height={56} rx={8} fill="#374151" stroke="#111" />
        <rect x={30} y={318} width={44} height={44} rx={22} fill="#1f2937" stroke="#555" />
        <g className={pump ? 'lab-fan spin' : 'lab-fan'} style={{ transformOrigin: '52px 340px' }}>
          {[0, 120, 240].map((a) => <path key={a} d="M52 340 l0 -16 a8 8 0 0 1 8 8 z" fill="#9ca3af" transform={`rotate(${a} 52 340)`} />)}
        </g>
        <circle cx={98} cy={330} r={6} fill={pump ? 'var(--ok)' : '#4b5563'} className={pump ? 'lab-led' : ''} />
        <text x={70} y={384} textAnchor="middle" className="lab-label">POMPE À VIDE</text>
        <text x={98} y={352} textAnchor="middle" className="lab-label small">{pump ? 'ON' : 'OFF'}</text>
      </g></g>

      {/* plate */}
      <rect x={left} y={PLATE_Y} width={right - left} height={12} rx={3} fill={plateCol} className="lab-plate-top" />
      <rect x={left - 6} y={PLATE_Y + 12} width={right - left + 12} height={22} rx={4} fill="url(#lab-plate)" stroke="#111" />
      <text x={left + 6} y={PLATE_Y + 28} className="lab-label">PLAQUE {t > 0 ? '+' : ''}{fmt(t, 0)} °C</text>

      {b.second && (
        <g>
          <path d={pipe} className="lab-pipe" />
          {flowing && <path d={pipe} className={pA > pB ? 'lab-flow' : 'lab-flow rev'} />}
          <g role="button" tabIndex={0} aria-pressed={open} aria-label={`Vanne entre les bouteilles : ${open ? 'ouverte' : 'fermée'}`} className="lab-click" onClick={onValve} onKeyDown={onKey(onValve)}>
            <title>{open ? 'Fermer la vanne' : 'Ouvrir la vanne'}</title>
            <circle cx={mx} cy={vy} r={16} fill="transparent" />
            <path d={`M${mx - 9},${vy - 7} L${mx + 9},${vy + 7} L${mx + 9},${vy - 7} L${mx - 9},${vy + 7} Z`} fill={open ? 'var(--ok)' : 'var(--bad)'} stroke="#111" />
            <rect x={mx - 12} y={vy - 22} width={24} height={6} rx={3} fill="#d1d5db" stroke="#111"
              style={{ transform: `rotate(${open ? 0 : 90}deg)`, transformOrigin: `${mx}px ${vy - 19}px`, transition: 'transform .25s' }} />
            <text x={Math.abs(ya - yb) < 1 ? mx : mx + 14} y={Math.abs(ya - yb) < 1 ? vy + 22 : vy + 4} textAnchor={Math.abs(ya - yb) < 1 ? 'middle' : 'start'} className={open ? 'lab-label ok' : 'lab-label'}>{open ? 'OUVERTE' : 'FERMÉE'}</text>
          </g>
        </g>
      )}

      <Vessel id="A" b={b} cx={ax} boil={boil.A} />
      {b.second && <Vessel id="B" b={b} cx={bx} boil={boil.B} />}
    </svg>
  );
}
