import type { FluidId } from '../../physics/types';
import { FLUIDS, P_ATM, psat, pWater } from '../../physics/refrigerants';

export interface PtPoint { T: number; P: number }

const W = 560, H = 330, L = 50, R = 14, TOP = 14, B = 34;
const T0 = -45, T1 = 80, LP0 = -3, LP1 = Math.log10(150);
const sx = (T: number) => L + ((T - T0) / (T1 - T0)) * (W - L - R);
const sy = (P: number) => H - B - ((Math.log10(Math.max(P, 10 ** LP0)) - LP0) / (LP1 - LP0)) * (H - TOP - B);
const fmtP = (p: number) => (p < 1 ? `${p * 1000} mbar` : `${p}`);

function curve(f: FluidId, side: 'bubble' | 'dew') {
  const tc = Math.min(FLUIDS[f].critical.T, 60), pts: string[] = [];
  for (let i = 0; i <= 80; i++) {
    const T = -40 + ((tc + 40) * i) / 80;
    pts.push(`${sx(T).toFixed(1)},${sy(psat(f, T, side)).toFixed(1)}`);
  }
  return pts;
}

export default function PtChart({ fluid, trail, now, other, water }: { fluid: FluidId; trail: PtPoint[]; now: PtPoint; other?: PtPoint; water: boolean }) {
  const f = FLUIDS[fluid], glide = f.glide > 0.2;
  const bub = curve(fluid, 'bubble'), dew = curve(fluid, 'dew');
  const crit = f.critical.T <= 60 ? { x: sx(f.critical.T), y: sy(f.critical.P) } : null;
  const wPts: string[] = [];
  for (let T = -40; T <= 80; T += 2) wPts.push(`${sx(T).toFixed(1)},${sy(pWater(T)).toFixed(1)}`);
  const grid = [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100];
  const decade = (p: number) => Math.abs(Math.log10(p) - Math.round(Math.log10(p))) < 1e-9;
  const mid = dew[Math.floor(dew.length * 0.55)].split(',').map(Number);

  return (
    <svg className="lab-chart" viewBox={`0 0 ${W} ${H}`} role="img"
      aria-label={`Diagramme pression-température du ${fluid}, point actuel ${now.T.toFixed(1)} °C, ${now.P.toFixed(2)} bar abs`}>
      <rect x={L} y={TOP} width={W - L - R} height={H - TOP - B} className="lab-chart-bg" />
      {crit && <rect x={crit.x} y={TOP} width={W - R - crit.x} height={crit.y - TOP} className="lab-chart-sc" />}
      {grid.map((p) => (
        <g key={p}>
          <line x1={L} x2={W - R} y1={sy(p)} y2={sy(p)} className={decade(p) ? 'lab-grid major' : 'lab-grid'} />
          {(decade(p) || p === 5 || p === 50) && <text x={L - 5} y={sy(p) + 3} textAnchor="end" className="lab-axis">{fmtP(p)}</text>}
        </g>
      ))}
      {[-40, -20, 0, 20, 40, 60, 80].map((T) => (
        <g key={T}>
          <line y1={TOP} y2={H - B} x1={sx(T)} x2={sx(T)} className={T === 0 ? 'lab-grid major' : 'lab-grid'} />
          <text x={sx(T)} y={H - B + 14} textAnchor="middle" className="lab-axis">{T}</text>
        </g>
      ))}
      <text x={W - R} y={H - 4} textAnchor="end" className="lab-axis">T (°C)</text>
      <text x={L + 4} y={TOP + 11} className="lab-axis">P (bar abs, échelle log)</text>
      <line x1={L} x2={W - R} y1={sy(P_ATM)} y2={sy(P_ATM)} className="lab-atm" />
      <text x={W - R - 4} y={sy(P_ATM) - 3} textAnchor="end" className="lab-axis">P atm</text>
      {water && <>
        <polyline points={wPts.join(' ')} className="lab-water" />
        <text x={sx(40)} y={sy(pWater(40)) - 5} className="lab-axis water">eau</text>
      </>}
      {glide && <polygon points={[...bub, ...dew.slice().reverse()].join(' ')} className="lab-glide" />}
      <polyline points={bub.join(' ')} className="lab-sat bubble" />
      {glide && <polyline points={dew.join(' ')} className="lab-sat dew" />}
      <text x={mid[0] - 8} y={mid[1] - 10} textAnchor="end" className="lab-region">LIQUIDE</text>
      <text x={mid[0] + 14} y={mid[1] + 22} className="lab-region">VAPEUR SURCHAUFFÉE</text>
      {glide && <text x={sx(-38)} y={sy(psat(fluid, -38, 'dew')) + 16} className="lab-axis">bulle / rosée (glissement {String(f.glide).replace('.', ',')} K)</text>}
      {crit && <>
        <circle cx={crit.x} cy={crit.y} r={4} className="lab-crit" />
        <text x={crit.x + 6} y={crit.y + 14} className="lab-axis">point critique {f.critical.T} °C · {String(f.critical.P).replace('.', ',')} bar</text>
        <text x={W - R - 6} y={TOP + 12} textAnchor="end" className="lab-region sc">SUPERCRITIQUE</text>
      </>}
      {trail.length > 1 && <polyline points={trail.map((p) => `${sx(p.T).toFixed(1)},${sy(p.P).toFixed(1)}`).join(' ')} className="lab-trail" />}
      {other && <circle cx={sx(other.T)} cy={sy(other.P)} r={5} className="lab-pt b" />}
      <circle cx={sx(now.T)} cy={sy(now.P)} r={10} className="lab-pt-halo" />
      <circle cx={sx(now.T)} cy={sy(now.P)} r={5.5} className="lab-pt" />
    </svg>
  );
}
