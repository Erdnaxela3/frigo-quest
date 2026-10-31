import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Readout, Widget, clamp, fmt } from './common';

// Stylised dome in SVG units; apex = critical point. Not real fluid data.
const X0 = 60, X1 = 500, Y0 = 30, YB = 300, AX = 280, AY = 40;
const tOf = (y: number) => clamp((y - AY) / (YB - AY), 0, 1);
const xl = (y: number) => AX - 180 * tOf(y) ** 0.7;
const xv = (y: number) => AX + 254 * tOf(y) ** 0.4 - 154 * tOf(y);
const hOf = (x: number) => 100 + ((x - X0) * 400) / (X1 - X0);

const DOME = (() => {
  const pts: string[] = [];
  for (let i = 60; i >= 0; i--) { const y = AY + (YB - AY) * (i / 60) ** 2; pts.push(`${xl(y).toFixed(1)},${y.toFixed(1)}`); }
  for (let i = 1; i <= 60; i++) { const y = AY + (YB - AY) * (i / 60) ** 2; pts.push(`${xv(y).toFixed(1)},${y.toFixed(1)}`); }
  return pts.join(' ');
})();

interface Cyc { yL: number; yH: number; x1: number; x2: number; x3: number }
type Pt = 1 | 2 | 3 | 4;

function move(c: Cyc, i: Pt, x: number, y: number): Cyc {
  let { yL, yH, x1, x2, x3 } = c;
  if (i === 1 || i === 4) yL = clamp(y, yH + 50, 295);
  else yH = clamp(y, 70, yL - 50);
  if (i === 1) x1 = x; else if (i === 2) x2 = x; else x3 = x;
  x3 = clamp(x3, xl(yL) + 5, xv(yH) - 5);
  x1 = clamp(x1, Math.max(xl(yL) + 10, x3 + 20), 490);
  x2 = clamp(x2, Math.max(x1, xv(yH)) + 10, 520);
  return { yL, yH, x1, x2, x3 };
}

const LABELS: Record<Pt, string> = {
  1: 'Point 1, aspiration du compresseur',
  2: 'Point 2, refoulement du compresseur',
  3: 'Point 3, sortie du condenseur',
  4: 'Point 4, sortie du détendeur',
};

export default function LogPh() {
  const [c, setC] = useState<Cyc>({ yL: 250, yH: 110, x1: 420, x2: 470, x3: 180 });
  const [drag, setDrag] = useState<Pt | null>(null);
  const svg = useRef<SVGSVGElement>(null);

  const pos: Record<Pt, [number, number]> = { 1: [c.x1, c.yL], 2: [c.x2, c.yH], 3: [c.x3, c.yH], 4: [c.x3, c.yL] };
  const h1 = hOf(c.x1), h2 = hOf(c.x2), h3 = hOf(c.x3);
  const q0 = h1 - h3, w = h2 - h1;
  const vL = xv(c.yL), lH = xl(c.yH);
  const wet = c.x1 < vL, flash = c.x3 > lH;

  const toSvg = (e: PointerEvent) => {
    const m = svg.current!.getScreenCTM()!.inverse();
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m);
    return [p.x, p.y] as const;
  };
  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    if (!drag) return;
    const [x, y] = toSvg(e);
    setC((prev) => move(prev, drag, x, y));
  };
  const onKey = (i: Pt) => (e: KeyboardEvent) => {
    const d = { ArrowLeft: [-5, 0], ArrowRight: [5, 0], ArrowUp: [0, -5], ArrowDown: [0, 5] }[e.key];
    if (!d) return;
    e.preventDefault();
    const [x, y] = pos[i];
    setC((prev) => move(prev, i, x + d[0], y + d[1]));
  };

  const mid = (a: Pt, b: Pt) => [(pos[a][0] + pos[b][0]) / 2, (pos[a][1] + pos[b][1]) / 2];
  const [cx, cy] = mid(1, 2);

  return (
    <Widget
      title="Le cycle frigorifique sur le diagramme log p-h"
      note="Schéma qualitatif : la cloche et les enthalpies sont indicatives. Glissez les 4 points (ou focus + flèches)."
    >
      <svg
        ref={svg} viewBox="0 0 540 340" className={`chart logph ${drag ? 'dragging' : ''}`}
        onPointerMove={onMove} onPointerUp={() => setDrag(null)} onPointerCancel={() => setDrag(null)}
        role="group" aria-label="Diagramme log p-h interactif"
      >
        <line x1={X0} y1={YB} x2={X1 + 20} y2={YB} className="axis" markerEnd="url(#lph-arrow)" />
        <line x1={X0} y1={YB} x2={X0} y2={Y0 - 10} className="axis" markerEnd="url(#lph-arrow)" />
        <defs>
          <marker id="lph-arrow" viewBox="0 0 10 10" refX={8} refY={5} markerWidth={6} markerHeight={6} orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 Z" className="axis-head" />
          </marker>
        </defs>
        {[100, 200, 300, 400, 500].map((h) => {
          const x = X0 + ((h - 100) * (X1 - X0)) / 400;
          return <text key={h} x={x} y={YB + 16} textAnchor="middle" className="tick">{h}</text>;
        })}
        <text x={X1 + 20} y={YB + 32} textAnchor="end" className="axis-label">h (kJ/kg, indicatif)</text>
        <text x={X0 - 8} y={Y0 - 14} className="axis-label">log p</text>

        <polygon points={DOME} className="dome" />
        <text x={AX} y={AY - 6} textAnchor="middle" className="tick">point critique</text>
        <text x={70} y={125} className="zone-label">liquide</text>
        <text x={AX - 10} y={285} textAnchor="middle" className="zone-label">liquide + vapeur</text>
        <text x={470} y={210} textAnchor="middle" className="zone-label">vapeur</text>

        <line x1={X0} x2={X1} y1={c.yH} y2={c.yH} className="iso hp" />
        <line x1={X0} x2={X1} y1={c.yL} y2={c.yL} className="iso lp" />
        <text x={X0 + 4} y={c.yH - 5} className="tick hp-text">HP</text>
        <text x={X0 + 4} y={c.yL - 5} className="tick lp-text">BP</text>

        <polyline points={`${pos[4]} ${pos[1]}`} className="cyc evap" />
        <polyline points={`${pos[1]} ${pos[2]} ${pos[3]}`} className="cyc hot" />
        <polyline points={`${pos[3]} ${pos[4]}`} className="cyc exp" />

        {!wet && <line x1={vL} x2={c.x1} y1={c.yL} y2={c.yL} className="zone sh" />}
        {!flash && <line x1={c.x3} x2={lH} y1={c.yH} y2={c.yH} className="zone sc" />}
        {!wet && c.x1 - vL > 14 && <text x={c.x1 + 14} y={c.yL + 24} className="tick sh-text">surchauffe</text>}
        {!flash && lH - c.x3 > 14 && <text x={c.x3 - 14} y={c.yH - 14} textAnchor="end" className="tick sc-text">sous-refroid.</text>}

        <text x={cx + 10} y={cy} className="seg-label">compression</text>
        <text x={(c.x3 + c.x2) / 2} y={c.yH - 6} textAnchor="middle" className="seg-label">condensation</text>
        <text x={c.x3 - 8} y={(c.yH + c.yL) / 2} textAnchor="end" className="seg-label">détente</text>
        <text x={(c.x3 + c.x1) / 2} y={c.yL + 16} textAnchor="middle" className="seg-label">évaporation</text>

        {([1, 2, 3, 4] as Pt[]).map((i) => (
          <g
            key={i} className={`handle ${drag === i ? 'active' : ''}`}
            transform={`translate(${pos[i][0]} ${pos[i][1]})`}
            role="button" tabIndex={0} aria-label={`${LABELS[i]} — flèches pour déplacer`}
            onKeyDown={onKey(i)}
            onPointerDown={(e) => { e.preventDefault(); svg.current!.setPointerCapture(e.pointerId); setDrag(i); }}
          >
            <circle r={14} className="handle-hit" />
            <circle r={9} />
            <text y={4} textAnchor="middle">{i}</text>
          </g>
        ))}
      </svg>

      <div className="readouts">
        <Readout label="h1 / h2 / h3 = h4" value={`${fmt(h1, 0)} / ${fmt(h2, 0)} / ${fmt(h3, 0)}`} sub="kJ/kg" />
        <Readout label="Effet frigorifique h1 − h4" value={`${fmt(q0, 0)} kJ/kg`} accent="lp" />
        <Readout label="Travail de compression h2 − h1" value={`${fmt(w, 0)} kJ/kg`} accent="hp" />
        <Readout label="COP froid = (h1 − h4) / (h2 − h1)" value={fmt(q0 / w, 1)} accent="copper" />
      </div>
      {wet && <p className="alert bad">Point 1 dans la cloche : aspiration humide, risque de coup de liquide au compresseur.</p>}
      {flash && <p className="alert warn">Point 3 dans la cloche : pas de sous-refroidissement, du gaz flash arrive au détendeur.</p>}
      {!wet && !flash && <p className="alert ok">Surchauffe à l'aspiration et sous-refroidissement en sortie de condenseur : cycle sain. Remontez la BP ou baissez la HP pour voir le COP augmenter.</p>}
    </Widget>
  );
}
