import { createContext, useContext, type ReactNode, type KeyboardEvent } from 'react';
import { TARGET_LABELS, type HoseColor, type JointId, type PortId, type SegmentState, type TargetId, type ThreeWay } from '../sceneIds';
import { PLATINE_LAYOUT as L, coilPath, roundPath, type Box, type Coil, type Pt } from './layout';

export const BoardCtx = createContext<{ onTarget: (id: TargetId) => void; highlight: ReadonlySet<TargetId> }>({
  onTarget: () => {},
  highlight: new Set(),
});

export function Target({ id, children }: { id: TargetId; children: ReactNode }) {
  const { onTarget, highlight } = useContext(BoardCtx);
  const label = TARGET_LABELS[id];
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTarget(id); }
  };
  return (
    <g role="button" tabIndex={0} aria-label={label} data-target={id}
      className={highlight.has(id) ? 'pt-target pt-hl' : 'pt-target'} onClick={() => onTarget(id)} onKeyDown={onKey}>
      <title>{label}</title>
      {children}
    </g>
  );
}

export function Plate({ x, y, text, small }: { x: number; y: number; text: string; small?: boolean }) {
  const fs = small ? 7.5 : 9;
  const w = text.length * fs * 0.66 + 10;
  return (
    <g className="pt-plate" transform={`translate(${x} ${y})`}>
      <rect x={-w / 2} y={-fs} width={w} height={fs * 1.9} rx={2} />
      <text y={fs * 0.38} fontSize={fs} textAnchor="middle">{text}</text>
    </g>
  );
}

export function Pipe({ d, state, running, w = 9 }: { d: string; state?: SegmentState; running?: boolean; w?: number }) {
  const filled = state && state !== 'empty';
  return (
    <g className={`pt-pipe st-${state ?? 'empty'}`}>
      <path d={d} className="pt-pipe-sh" strokeWidth={w + 2} transform="translate(1.5 2.5)" />
      <path d={d} className="pt-pipe-cu" strokeWidth={w} />
      {filled && <path d={d} className="pt-core" strokeWidth={w * 0.5} />}
      {state === 'twoPhase' && <path d={d} className="pt-core2" strokeWidth={w * 0.5} />}
      <path d={d} className="pt-pipe-hl" strokeWidth={Math.max(0.8, w * 0.16)} transform="translate(-1.3 -1.6)" />
      {running && filled && state !== 'vacuum' && <path d={d} className="pt-flow" strokeWidth={w * 0.32} />}
    </g>
  );
}

export const Tube = ({ pts, w = 2.6, r = 8 }: { pts: readonly Pt[]; w?: number; r?: number }) => <Pipe d={roundPath(pts, r)} w={w} />;

export function CoilBody({ c, state, running, children }: { c: Coil; state: SegmentState; running: boolean; children?: ReactNode }) {
  return (
    <g filter="url(#pt-shadow)">
      <rect x={c.x - 4} y={c.y - 6} width={c.w + 8} height={c.h + 12} rx={3} fill="#6b757c" />
      <Pipe d={coilPath(c)} state={state} running={running} w={7} />
      <rect x={c.x} y={c.y} width={c.w} height={c.h} fill="url(#pt-fins)" />
      <rect x={c.x - 6} y={c.y - 8} width={8} height={c.h + 16} rx={1.5} fill="url(#pt-galva)" />
      <rect x={c.x + c.w - 2} y={c.y - 8} width={8} height={c.h + 16} rx={1.5} fill="url(#pt-galva)" />
      {children}
    </g>
  );
}

export function Fan({ cx, cy, r, on }: { cx: number; cy: number; r: number; on: boolean }) {
  const s = r + 12;
  const blade = `M0,0 C${r * 0.15},${-r * 0.2} ${r * 0.55},${-r * 0.45} ${r * 0.88},${-r * 0.28} C${r * 0.8},${r * 0.05} ${r * 0.35},${r * 0.12} 0,0 Z`;
  return (
    <g className={on ? 'pt-fan on' : 'pt-fan'} filter="url(#pt-shadow)">
      <rect x={cx - s} y={cy - s} width={s * 2} height={s * 2} rx={10} fill="#2f3439" stroke="#1b1e21" />
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([dx, dy]) => (
        <circle key={`${dx}${dy}`} cx={cx + dx * (s - 7)} cy={cy + dy * (s - 7)} r={2.6} fill="#9aa1a7" />
      ))}
      <circle cx={cx} cy={cy} r={r + 2} fill="#0e1012" />
      <g className="pt-blades">
        {[0, 72, 144, 216, 288].map((a) => <path key={a} d={blade} fill="#3c4247" stroke="#555c62" strokeWidth={0.8} transform={`translate(${cx} ${cy}) rotate(${a})`} />)}
        <circle cx={cx} cy={cy} r={r * 0.2} fill="#50575d" />
      </g>
      <circle cx={cx} cy={cy} r={r * 0.13} fill="#1f2326" stroke="#6b7278" />
      <g className="pt-guard">
        {[0.35, 0.6, 0.85, 1].map((k) => <circle key={k} cx={cx} cy={cy} r={r * k} />)}
        {[0, 45, 90, 135].map((a) => <line key={a} x1={cx - r} y1={cy} x2={cx + r} y2={cy} transform={`rotate(${a} ${cx} ${cy})`} />)}
      </g>
    </g>
  );
}

export function Compressor({ running, fluid = 'R32' }: { running: boolean; fluid?: string }) {
  const { x, y, w, h } = L.compressor;
  const t = L.terminalBox;
  return (
    <g filter="url(#pt-shadow)">
      <rect x={x - 12} y={y + h} width={w + 24} height={10} rx={2} fill="#3a3f44" />
      <ellipse cx={x + 6} cy={y + h + 2} rx={9} ry={4} fill="#151718" />
      <ellipse cx={x + w - 6} cy={y + h + 2} rx={9} ry={4} fill="#151718" />
      <path d={`M${x},${y + 44} Q${x},${y} ${x + w / 2},${y} Q${x + w},${y} ${x + w},${y + 44} V${y + h - 8} Q${x + w},${y + h} ${x + w - 8},${y + h} H${x + 8} Q${x},${y + h} ${x},${y + h - 8} Z`}
        fill="url(#pt-dome)" stroke="#111" />
      <rect x={x} y={y + 52} width={w} height={5} fill="#000" opacity={0.35} />
      <path d={`M${x + 22},${y + 12} Q${x + 14},${y + 60} ${x + 18},${y + h - 20}`} stroke="#fff" strokeOpacity={0.12} strokeWidth={8} fill="none" />
      <rect x={x + 30} y={y + 78} width={70} height={34} rx={2} fill="url(#pt-alu)" stroke="#555" />
      <text x={x + 65} y={y + 90} className="pt-tiny" textAnchor="middle" fontWeight={700}>SCROLL</text>
      <text x={x + 65} y={y + 100} className="pt-tiny" textAnchor="middle">{fluid} · 230 V</text>
      <text x={x + 65} y={y + 108} className="pt-tiny" textAnchor="middle">{fluid === 'R290' ? 'PAO' : 'POE'} 0,4 L</text>
      <rect x={t.x} y={t.y} width={t.w} height={t.h} rx={3} fill="#575d63" stroke="#2a2d30" />
      <circle cx={t.x + t.w / 2} cy={t.y + 9} r={2} fill="#aaa" />
      <circle cx={t.x + t.w / 2} cy={t.y + t.h - 9} r={2} fill="#aaa" />
      <circle cx={t.x + 6} cy={t.y + t.h / 2} r={2.4} fill={running ? 'var(--ok)' : '#222'} />
    </g>
  );
}

export function CrankHeater({ on }: { on: boolean }) {
  const b = L.crankHeater;
  return (
    <g>
      <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={3} fill={on ? '#b4532a' : '#7a3b22'} stroke="#3b1c10" />
      {Array.from({ length: 16 }, (_, i) => <line key={i} x1={b.x + 6 + i * 8.2} y1={b.y + 2} x2={b.x + 6 + i * 8.2} y2={b.y + b.h - 2} stroke="#000" strokeOpacity={0.3} />)}
      <path d={`M${b.x + 2},${b.y + 7} q-14,4 -14,30`} stroke="#222" strokeWidth={2.4} fill="none" />
      <rect x={b.x - 4} y={b.y - 6} width={b.w + 8} height={b.h + 12} fill="transparent" pointerEvents="all" />
    </g>
  );
}

export function Receiver() {
  const b = L.receiver;
  return (
    <g filter="url(#pt-shadow)">
      <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={b.w / 2} ry={14} fill="url(#pt-tank)" stroke="#1d2a22" />
      <rect x={b.x} y={b.y + 28} width={b.w} height={3} fill="#000" opacity={0.25} />
      <rect x={b.x} y={b.y + b.h - 31} width={b.w} height={3} fill="#000" opacity={0.25} />
      <rect x={b.x + 6} y={b.y + 46} width={b.w - 12} height={30} fill="#efeadf" />
      <text x={b.x + b.w / 2} y={b.y + 58} className="pt-tiny" textAnchor="middle" fontWeight={700}>1,6 L</text>
      <text x={b.x + b.w / 2} y={b.y + 68} className="pt-tiny" textAnchor="middle">PS 45</text>
    </g>
  );
}

export function Filter() {
  const b = L.filter, cy = b.y + b.h / 2;
  return (
    <g filter="url(#pt-shadow)">
      <path d={`M${b.x},${cy - 5} L${b.x + 8},${b.y} H${b.x + b.w - 8} L${b.x + b.w},${cy - 5} V${cy + 5} L${b.x + b.w - 8},${b.y + b.h} H${b.x + 8} L${b.x},${cy + 5} Z`}
        fill="url(#pt-drier)" stroke="#1b2b3d" />
      <rect x={b.x + 14} y={b.y + 4} width={b.w - 28} height={b.h - 8} fill="#f3f1ea" />
      <text x={b.x + b.w / 2} y={cy - 0.5} className="pt-tiny" textAnchor="middle" fontWeight={700}>DML 083</text>
      <path d={`M${b.x + 20},${cy + 5} H${b.x + b.w - 20} m-4,-2.5 l4,2.5 l-4,2.5`} stroke="#1b2b3d" strokeWidth={1} fill="none" />
    </g>
  );
}

const SG_FILL = { clair: '#bfe3ff', bulles: '#a9d6f7', mousse: '#e8eef2', vide: '#2b3036' } as const;

export function SightGlass({ state }: { state: keyof typeof SG_FILL }) {
  const [cx, cy] = L.sightglass;
  const hex = Array.from({ length: 6 }, (_, i) => `${cx + 14 * Math.cos((i * Math.PI) / 3)},${cy + 14 * Math.sin((i * Math.PI) / 3)}`).join(' ');
  const bubbles = state === 'bulles' ? [[-4, -3, 1.6], [3, 4, 1.2], [4, -3, 1], [-3, 4, 1.1]] : state === 'mousse'
    ? Array.from({ length: 14 }, (_, i) => [5.5 * Math.cos(i * 2.4), 5.5 * Math.sin(i * 2.4), 1 + (i % 3) * 0.5]) : [];
  return (
    <g filter="url(#pt-shadow)">
      <rect x={cx - 20} y={cy - 6} width={40} height={12} rx={2} fill="url(#pt-brass)" stroke="#6d5216" />
      <polygon points={hex} fill="url(#pt-brass)" stroke="#6d5216" />
      <circle cx={cx} cy={cy} r={9.5} fill="#ddd" stroke="#555" />
      <circle cx={cx} cy={cy} r={8} fill={SG_FILL[state]} />
      {bubbles.map(([dx, dy, r], i) => <circle key={i} cx={cx + dx} cy={cy + dy} r={r} fill="#fff" stroke="#7aa" strokeWidth={0.4} />)}
      <circle cx={cx} cy={cy} r={3.2} fill="#16a34a" stroke="#0b4" strokeWidth={0.5} />
      <path d={`M${cx - 6},${cy - 4} q3,-4 8,-4`} stroke="#fff" strokeOpacity={0.7} strokeWidth={1.2} fill="none" />
    </g>
  );
}

/** Drawn downward from `from`; `right` points it to the right instead (to.x sets the length). */
export function Schrader({ from, to, hose, right }: { from: Pt; to: Pt; hose?: HoseColor; right?: boolean }) {
  const [x, y0] = from, y1 = right ? y0 + to[0] - x : to[1];
  return (
    <g transform={right ? `rotate(-90 ${x} ${y0})` : undefined}>
      <rect x={x - 3.5} y={y0} width={7} height={y1 - y0 - 6} fill="url(#pt-brass)" stroke="#6d5216" strokeWidth={0.6} />
      <rect x={x - 5} y={y0 + 4} width={10} height={4} fill="url(#pt-brass)" stroke="#6d5216" strokeWidth={0.6} />
      {hose
        ? <rect x={x - 6.5} y={y1 - 12} width={13} height={16} rx={2} className={`pt-coupler h-${hose}`} />
        : <rect x={x - 5.5} y={y1 - 8} width={11} height={9} rx={2} fill="#1d1f22" stroke="#000" />}
      <rect x={x - 12} y={y0 - 2} width={24} height={y1 - y0 + 10} fill="transparent" pointerEvents="all" />
    </g>
  );
}

const STEM = { open: 14, closed: 4, back: 17, mid: 10, front: 3 } as const;
const STEM_TXT = { open: 'OUVERTE', closed: 'FERMÉE', back: 'ARRIÈRE', mid: 'MILIEU', front: 'AVANT' } as const;

export function ServiceValve({ c, pos, big }: { c: Pt; pos: 'open' | 'closed' | ThreeWay; big?: boolean }) {
  const [cx, cy] = c, hh = big ? 15 : 13, s = STEM[pos];
  return (
    <g filter="url(#pt-shadow)">
      <rect x={cx - 18} y={cy - hh} width={36} height={hh * 2} rx={3} fill="url(#pt-brass)" stroke="#6d5216" />
      <line x1={cx - 18} y1={cy} x2={cx + 18} y2={cy} stroke="#6d5216" strokeOpacity={0.5} />
      <rect x={cx - 9} y={cy - hh - 11} width={18} height={11} rx={1} fill="url(#pt-brass)" stroke="#6d5216" />
      <line x1={cx - 3} y1={cy - hh - 11} x2={cx - 3} y2={cy - hh} stroke="#6d5216" strokeOpacity={0.5} />
      <line x1={cx + 3} y1={cy - hh - 11} x2={cx + 3} y2={cy - hh} stroke="#6d5216" strokeOpacity={0.5} />
      <rect x={cx - 3.5} y={cy - hh - 11 - s} width={7} height={s} fill="url(#pt-steel)" stroke="#555" strokeWidth={0.5} />
      <rect x={cx - 1.6} y={cy - hh - 12.5 - s} width={3.2} height={2.5} fill="#222" />
      <text x={cx + 12} y={cy - hh - 15} className="pt-tiny pt-engrave">{STEM_TXT[pos]}</text>
    </g>
  );
}

/** Receiver outlet (Rotalock-style) valve: body on the vertical outlet, spindle to the right. */
export function ReceiverValve({ pos }: { pos: 'open' | 'closed' }) {
  const [cx, cy] = L.receiverValve, s = pos === 'open' ? 14 : 4;
  return (
    <g filter="url(#pt-shadow)">
      <rect x={cx - 11} y={cy - 9} width={22} height={18} rx={3} fill="url(#pt-brass)" stroke="#6d5216" />
      <rect x={cx + 11} y={cy - 5} width={9} height={10} rx={1} fill="url(#pt-brass)" stroke="#6d5216" />
      <rect x={cx + 20} y={cy - 3} width={s} height={6} fill="url(#pt-steel)" stroke="#555" strokeWidth={0.5} />
      <rect x={cx + 20 + s} y={cy - 1.6} width={2.5} height={3.2} fill="#222" />
      <text x={cx + 14} y={cy - 9} className="pt-tiny pt-engrave">{pos === 'open' ? 'OUVERT' : 'FERMÉ'}</text>
    </g>
  );
}

export function KP({ b, model, hp }: { b: Box; model: string; hp?: boolean }) {
  const ptr = hp ? 0.62 : 0.35;
  return (
    <g filter="url(#pt-shadow)">
      <rect x={b.x + 12} y={b.y - 9} width={8} height={10} fill="url(#pt-steel)" stroke="#444" />
      <line x1={b.x + 16} y1={b.y - 9} x2={b.x + 16} y2={b.y - 5} stroke="#222" />
      <rect x={b.x + b.w - 20} y={b.y - 6} width={8} height={7} fill="url(#pt-steel)" stroke="#444" />
      <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={5} fill="#40464c" stroke="#1d2024" />
      <rect x={b.x + 4} y={b.y + 6} width={b.w - 8} height={b.h - 14} rx={3} fill="#c9cdd0" />
      <rect x={b.x + 8} y={b.y + 10} width={b.w - 16} height={20} fill="#fbfaf5" stroke="#777" strokeWidth={0.6} />
      {Array.from({ length: 9 }, (_, i) => <line key={i} x1={b.x + 11 + i * ((b.w - 22) / 8)} y1={b.y + 10} x2={b.x + 11 + i * ((b.w - 22) / 8)} y2={b.y + (i % 2 ? 14 : 17)} stroke="#333" strokeWidth={0.6} />)}
      <line x1={b.x + 11 + ptr * (b.w - 22)} y1={b.y + 11} x2={b.x + 11 + ptr * (b.w - 22)} y2={b.y + 29} stroke="#d00" strokeWidth={1.4} />
      <text x={b.x + 12} y={b.y + 27} className="pt-tiny" fontSize={5}>bar</text>
      <text x={b.x + b.w / 2} y={b.y + 50} textAnchor="middle" fontSize={12} fontWeight={800} fill="#1f2326">{model}</text>
      <text x={b.x + b.w / 2} y={b.y + 60} textAnchor="middle" fontSize={6} fill="#333">Danfoss</text>
      <rect x={b.x + 4} y={b.y + b.h - 22} width={b.w - 8} height={6} fill={hp ? 'var(--hp)' : 'var(--lp)'} />
      {hp && <circle cx={b.x + b.w - 12} cy={b.y + 40} r={4} fill="#c0262d" stroke="#600" />}
      <rect x={b.x - 6} y={b.y + 64} width={7} height={10} fill="#222" />
      <rect x={b.x + b.w / 2 - 6} y={b.y + b.h - 2} width={12} height={7} fill="url(#pt-brass)" stroke="#6d5216" />
    </g>
  );
}

export function Solenoid({ on }: { on: boolean }) {
  const [cx, cy] = L.solenoid;
  return (
    <g filter="url(#pt-shadow)">
      <rect x={cx - 14} y={cy - 9} width={28} height={18} rx={2} fill="url(#pt-brass)" stroke="#6d5216" />
      <rect x={cx - 4} y={cy - 22} width={8} height={14} fill="url(#pt-steel)" stroke="#555" />
      <rect x={cx - 16} y={cy - 52} width={32} height={30} rx={3} fill="#1e2226" stroke="#000" />
      <text x={cx} y={cy - 38} textAnchor="middle" fontSize={8} fontWeight={700} fill="#e8e4dc">EVR 3</text>
      <text x={cx} y={cy - 29} textAnchor="middle" fontSize={5.5} fill="#9aa3ad">230 V~</text>
      <rect x={cx + 16} y={cy - 48} width={11} height={22} rx={1.5} fill="#5d646a" stroke="#2a2d30" />
      <circle cx={cx + 21.5} cy={cy - 43} r={2} fill={on ? '#facc15' : '#3a3a3a'} />
      <path d={`M${cx - 6},${cy + 4} h12 m-3,-2.5 l3,2.5 l-3,2.5`} stroke="#6d5216" fill="none" strokeWidth={1} />
    </g>
  );
}

export function TXV() {
  const [cx, cy] = L.txv;
  return (
    <g filter="url(#pt-shadow)">
      <rect x={cx - 6} y={cy + 10} width={12} height={13} rx={1} fill="url(#pt-brass)" stroke="#6d5216" />
      <rect x={cx - 16} y={cy - 11} width={32} height={22} rx={3} fill="url(#pt-brass)" stroke="#6d5216" />
      <text x={cx} y={cy + 3} textAnchor="middle" fontSize={7} fontWeight={700} fill="#4a370c">TEV</text>
      <rect x={cx - 5} y={cy - 23} width={10} height={13} fill="url(#pt-brass)" stroke="#6d5216" />
      <rect x={cx - 19} y={cy - 30} width={38} height={7} rx={2} fill="url(#pt-steel)" stroke="#555" />
      <path d={`M${cx - 17},${cy - 30} Q${cx},${cy - 46} ${cx + 17},${cy - 30} Z`} fill="url(#pt-steel)" stroke="#555" />
      <rect x={cx + 14} y={cy + 8} width={8} height={7} fill="url(#pt-brass)" stroke="#6d5216" />
    </g>
  );
}

export function Bulb({ attached }: { attached: boolean }) {
  const b = attached ? L.bulb : L.bulbLoose;
  return (
    <g transform={attached ? undefined : `rotate(-14 ${b.x + b.w / 2} ${b.y})`}>
      <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={6} fill="url(#pt-bulb)" stroke="#5a3214" />
      {attached && [12, 46].map((dy) => (
        <g key={dy}>
          <rect x={b.x - 12} y={b.y + dy} width={b.w + 15} height={6} rx={1} fill="url(#pt-steel)" stroke="#555" strokeWidth={0.6} />
          <circle cx={b.x + b.w + 1} cy={b.y + dy + 3} r={1.6} fill="#333" />
        </g>
      ))}
    </g>
  );
}

export function Thermostat({ running, troom = 24 }: { running: boolean; troom?: number }) {
  const b = L.thermostat;
  return (
    <g filter="url(#pt-shadow)">
      <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={10} fill="#ece9e2" stroke="#9a968c" />
      <rect x={b.x + 12} y={b.y + 14} width={b.w - 24} height={26} rx={3} fill="#9fb59a" stroke="#556" />
      <text x={b.x + b.w / 2} y={b.y + 33} textAnchor="middle" fontSize={14} className="pt-lcd">{troom.toFixed(1)}°</text>
      <circle cx={b.x + b.w / 2} cy={b.y + 70} r={17} fill="#f7f6f2" stroke="#b5b1a8" />
      <line x1={b.x + b.w / 2} y1={b.y + 70} x2={b.x + b.w / 2 + 10} y2={b.y + 60} stroke="#555" strokeWidth={2} strokeLinecap="round" />
      <circle cx={b.x + 12} cy={b.y + b.h - 10} r={3} fill={running ? 'var(--liquid)' : '#bbb'} />
      <text x={b.x + 18} y={b.y + b.h - 7.5} fontSize={6} fill="#555">froid</text>
    </g>
  );
}

export function ElecBox({ running }: { running: boolean }) {
  const { x, y, w, h } = L.elecBox;
  const mod = (mx: number, mw: number, mh: number, fill: string, label: string) => (
    <g>
      <rect x={x + mx} y={y + 36} width={mw} height={mh} rx={2} fill={fill} stroke="#555" />
      <text x={x + mx + mw / 2} y={y + 36 + mh + 10} textAnchor="middle" fontSize={7} fill="#2a2d30">{label}</text>
    </g>
  );
  return (
    <g filter="url(#pt-shadow)">
      <rect x={x} y={y} width={w} height={h} rx={6} fill="#a7adb2" stroke="#5c636a" strokeWidth={2} />
      <rect x={x + 8} y={y + 22} width={w - 16} height={h - 30} rx={3} fill="#d9dbdc" stroke="#8a9096" />
      {[60, 150, 240, 320].map((gx) => <rect key={gx} x={x + gx} y={y - 6} width={12} height={8} rx={1.5} fill="#2d3135" />)}
      <rect x={x + 12} y={y + 54} width={w - 24} height={6} fill="#b8bcbf" />
      {mod(18, 44, 62, '#e3e5e6', 'Q1 sect.')}
      <rect x={x + 24} y={y + 44} width={32} height={32} rx={3} fill="#facc15" />
      <rect x={x + 37} y={y + 40} width={6} height={40} rx={2} fill="#dc2626" transform={`rotate(${running ? 0 : -90} ${x + 40} ${y + 60})`} />
      {mod(74, 36, 62, '#f4f4f2', 'Q2 disj.')}
      <rect x={x + 87} y={y + 52} width={10} height={14} rx={1} fill="#2563eb" />
      {mod(122, 48, 62, '#e7e6e1', 'KM1')}
      <rect x={x + 130} y={y + 42} width={32} height={16} fill="#9aa1a7" />
      {mod(176, 40, 62, '#d6d3cb', 'F1 therm.')}
      <circle cx={x + 196} cy={y + 52} r={5} fill="#2563eb" />
      {mod(228, 62, 62, '#26292c', 'T1 230/24 V')}
      <text x={x + 259} y={y + 70} textAnchor="middle" fontSize={8} fill="#cfd3d6">24 V</text>
      {[['H1 marche', running ? '#22c55e' : '#14532d'], ['H2 défaut', '#5a1a1a']].map(([lab, col], i) => (
        <g key={lab}>
          <circle cx={x + 318} cy={y + 50 + i * 34} r={9} fill="#333" />
          <circle cx={x + 318} cy={y + 50 + i * 34} r={6.5} fill={col} className={i === 0 && running ? 'pt-lamp' : undefined} />
          <text x={x + 332} y={y + 53 + i * 34} fontSize={7} fill="#2a2d30">{lab}</text>
        </g>
      ))}
      {Array.from({ length: 22 }, (_, i) => <rect key={i} x={x + 18 + i * 15} y={y + h - 22} width={12} height={10} fill={i < 3 ? '#facc15' : '#7a8086'} stroke="#444" strokeWidth={0.5} />)}
    </g>
  );
}

export function Joint({ id, vertical, braze }: { id: JointId; vertical?: boolean; braze?: boolean }) {
  const [x, y] = L.anchors[id];
  const [w, h] = braze ? [5, 13] : [9, 16];
  return (
    <Target id={id}>
      <circle cx={x} cy={y} r={11} fill="transparent" />
      <rect x={x - (vertical ? h : w) / 2} y={y - (vertical ? w : h) / 2} width={vertical ? h : w} height={vertical ? w : h} rx={1.2}
        fill={braze ? 'url(#pt-silver)' : 'url(#pt-brass)'} stroke={braze ? '#6a6a6a' : '#6d5216'} strokeWidth={0.7} />
    </Target>
  );
}

export function OilStain({ at }: { at: Pt }) {
  const [x, y] = at;
  return (
    <g className="pt-oil" pointerEvents="none">
      <ellipse cx={x + 1} cy={y + 5} rx={19} ry={13} fill="url(#pt-oilgrad)" />
      <path d={`M${x - 2},${y + 8} q-1,14 1,24 q2,4 3,0 q1,-10 -1,-24 Z`} fill="#2a1708" opacity={0.65} />
    </g>
  );
}

export function Hose({ port, color }: { port: PortId; color: HoseColor }) {
  const [x, y] = L.anchors[port], [ex, ey] = L.hoseEnd[port];
  const d = `M${x},${y} C${x},${y + 170} ${ex},${ey - 150} ${ex},${ey}`;
  return (
    <g className={`pt-hose h-${color}`} pointerEvents="none">
      <path d={d} className="pt-hose-sh" transform="translate(3 4)" />
      <path d={d} className="pt-hose-body" />
      <path d={d} className="pt-hose-hl" transform="translate(-1.5 0)" />
    </g>
  );
}

export function Clamp({ x, y, dir }: { x: number; y: number; dir: 'h' | 'v' }) {
  const v = dir === 'v';
  return (
    <g pointerEvents="none">
      <rect x={x - (v ? 8 : 4)} y={y - (v ? 4 : 8)} width={v ? 16 : 8} height={v ? 8 : 16} rx={2} fill="url(#pt-silver)" stroke="#555" strokeWidth={0.6} />
      {[-1, 1].map((k) => <circle key={k} cx={x + (v ? k * 12 : 0)} cy={y + (v ? 0 : k * 12)} r={2.4} fill="#8d9398" stroke="#444" strokeWidth={0.6} />)}
    </g>
  );
}

export function FlowArrow({ x, y, a }: { x: number; y: number; a: number }) {
  return <path d="M-3.5,-3.5 L1.5,0 L-3.5,3.5" transform={`translate(${x} ${y}) rotate(${a})`} className="pt-arrow" />;
}

export function Screw({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={5} fill="url(#pt-silver)" stroke="#555" strokeWidth={0.6} />
      <line x1={x - 3.5} y1={y - 1} x2={x + 3.5} y2={y + 1} stroke="#444" strokeWidth={1.2} />
    </g>
  );
}

export function Defs() {
  return (
    <defs>
      <linearGradient id="pt-brass" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f1d27a" /><stop offset=".45" stopColor="#c9a03f" /><stop offset="1" stopColor="#8a6620" />
      </linearGradient>
      <linearGradient id="pt-steel" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#8d959b" /><stop offset=".4" stopColor="#e3e7ea" /><stop offset="1" stopColor="#6c747a" />
      </linearGradient>
      <linearGradient id="pt-silver" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#f2f4f5" /><stop offset="1" stopColor="#9aa1a6" />
      </linearGradient>
      <linearGradient id="pt-galva" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#9ca5ab" /><stop offset=".5" stopColor="#d5dade" /><stop offset="1" stopColor="#8c959b" />
      </linearGradient>
      <linearGradient id="pt-alu" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#eef0f1" /><stop offset="1" stopColor="#b9bfc3" />
      </linearGradient>
      <linearGradient id="pt-dome" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#141816" /><stop offset=".3" stopColor="#3d4541" /><stop offset=".55" stopColor="#2a302d" /><stop offset="1" stopColor="#0d0f0e" />
      </linearGradient>
      <linearGradient id="pt-tank" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#1f3a2a" /><stop offset=".35" stopColor="#4f7a5e" /><stop offset="1" stopColor="#162a1e" />
      </linearGradient>
      <linearGradient id="pt-drier" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#7fa6cf" /><stop offset=".4" stopColor="#3f6c9c" /><stop offset="1" stopColor="#24456a" />
      </linearGradient>
      <linearGradient id="pt-bulb" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#9a5a2a" /><stop offset=".4" stopColor="#f0b27a" /><stop offset="1" stopColor="#7c4520" />
      </linearGradient>
      <radialGradient id="pt-oilgrad">
        <stop offset="0" stopColor="#1f1004" stopOpacity=".85" /><stop offset=".6" stopColor="#2e1a08" stopOpacity=".6" /><stop offset="1" stopColor="#3b2410" stopOpacity="0" />
      </radialGradient>
      <pattern id="pt-fins" width="3.2" height="10" patternUnits="userSpaceOnUse">
        <rect width="3.2" height="10" fill="#b7c0c6" fillOpacity=".38" />
        <line x1="0.8" y1="0" x2="0.8" y2="10" stroke="#e9edf0" strokeOpacity=".75" strokeWidth=".9" />
        <line x1="1.8" y1="0" x2="1.8" y2="10" stroke="#5f686e" strokeOpacity=".35" strokeWidth=".5" />
      </pattern>
      <pattern id="pt-frostpat" width="9" height="9" patternUnits="userSpaceOnUse">
        <rect width="9" height="9" fill="#f0f9ff" fillOpacity=".55" />
        <path d="M2,2 l2,2 m0,-2 l-2,2 M6,6 l2,2 m0,-2 l-2,2" stroke="#fff" strokeWidth=".8" />
      </pattern>
      <filter id="pt-shadow" x="-20%" y="-20%" width="140%" height="150%">
        <feDropShadow dx="2.5" dy="4" stdDeviation="2.5" floodColor="#2a1a08" floodOpacity=".45" />
      </filter>
    </defs>
  );
}

/** Danfoss KVP / KVR: brass body in line with the pipe, steel bell, cap, Schrader gauge port. Drawn along x, dome up; rotate for a vertical pipe. */
export function Regulator({ c, model, rotate = 0, reverse }: { c: Pt; model: string; rotate?: number; reverse?: boolean }) {
  return (
    <g filter="url(#pt-shadow)" transform={`translate(${c[0]} ${c[1]}) rotate(${rotate})`}>
      {[-1, 1].map((d) => <rect key={d} x={d * 21 - 5} y={-8} width={10} height={16} rx={1.5} fill="url(#pt-brass)" stroke="#6d5216" />)}
      <rect x={-16} y={-10} width={32} height={20} rx={3} fill="url(#pt-brass)" stroke="#6d5216" />
      <rect x={-6} y={-18} width={12} height={9} fill="url(#pt-brass)" stroke="#6d5216" />
      <rect x={-11} y={-48} width={22} height={31} rx={5} fill="url(#pt-steel)" stroke="#555" />
      <rect x={-7} y={-56} width={14} height={9} rx={2} fill="#2b2f33" stroke="#000" />
      <text x={0} y={-30} textAnchor="middle" fontSize={6.5} fontWeight={800} fill="#1f2326" transform="rotate(-90 0 -32)">{model}</text>
      <rect x={9} y={9} width={6} height={9} fill="url(#pt-brass)" stroke="#6d5216" />
      <path d={reverse ? 'M5,4 h-10 m3,-2.5 l-3,2.5 l3,2.5' : 'M-5,4 h10 m-3,-2.5 l3,2.5 l-3,2.5'} stroke="#6d5216" fill="none" strokeWidth={1} />
    </g>
  );
}
