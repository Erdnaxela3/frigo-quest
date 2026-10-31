import { useState } from 'react';
import { fluid, psat, toAbs, toRel, tsat } from '../../physics/refrigerants';
import type { FluidId } from '../../physics/types';
import { FluidSelect, Readout, Widget, clamp, fmt } from './common';

const W = 360, H = 210, L = 44, R = 12, T = 24, B = 30;

export default function PtSlider() {
  const [id, setId] = useState<FluidId>('R32');
  const [mode, setMode] = useState<'T' | 'P'>('T');
  const [tIn, setT] = useState(0);
  const [pIn, setP] = useState(7);

  const f = fluid(id);
  const glide = f.glide > 0.2;
  const tMin = f.sat[0][0];
  const tMax = Math.min(f.sat[f.sat.length - 1][0], f.critical.T);
  const pMin = Math.round(toRel(psat(id, tMin, 'dew')) * 10) / 10;
  const pMax = Math.round(toRel(psat(id, tMax, 'bubble')) * 10) / 10;
  const t = clamp(tIn, tMin, tMax);
  const p = clamp(pIn, pMin, pMax);

  const pDew = psat(id, t, 'dew'), pBub = psat(id, t, 'bubble');
  const tDew = tsat(id, toAbs(p), 'dew'), tBub = tsat(id, toAbs(p), 'bubble');

  const yMin = Math.min(0, pMin), yMax = pMax * 1.05;
  const sx = (v: number) => L + ((v - tMin) / (tMax - tMin)) * (W - L - R);
  const sy = (v: number) => H - B - ((v - yMin) / (yMax - yMin)) * (H - T - B);
  const curve = (side: 'dew' | 'bubble') => {
    const pts: string[] = [];
    for (let i = 0; i <= 40; i++) {
      const tt = tMin + ((tMax - tMin) * i) / 40;
      pts.push(`${sx(tt).toFixed(1)},${sy(toRel(psat(id, tt, side))).toFixed(1)}`);
    }
    return pts.join(' ');
  };
  const tStep = (tMax - tMin) > 60 ? 20 : 10;
  const tTicks: number[] = [];
  for (let v = Math.ceil(tMin / tStep) * tStep; v <= tMax; v += tStep) tTicks.push(v);
  const pStep = [1, 2, 5, 10, 20].find((s) => (yMax - yMin) / s <= 6) ?? 20;
  const pTicks: number[] = [];
  for (let v = Math.ceil(yMin / pStep) * pStep; v <= yMax; v += pStep) pTicks.push(v);

  const mx = mode === 'T' ? t : tDew;
  const my = mode === 'T' ? toRel(pDew) : p;

  return (
    <Widget
      title="Relation pression / température de saturation"
      note={<>Le manomètre affiche la pression <b>relative</b> : P abs = P rel + 1,013 bar.{glide && ' Mélange zéotrope : à pression égale, le liquide commence à bouillir (bulle) plus froid que la dernière goutte ne s\'évapore (rosée) — c\'est le glissement.'}</>}
    >
      <div className="widget-controls">
        <FluidSelect value={id} onChange={setId} />
        <div className="seg" role="group" aria-label="Sens du calcul">
          <button type="button" aria-pressed={mode === 'T'} onClick={() => setMode('T')}>T → P</button>
          <button type="button" aria-pressed={mode === 'P'} onClick={() => setMode('P')}>P → T</button>
        </div>
      </div>

      {mode === 'T' ? (
        <label className="field wide">
          <span>Température de saturation : <b className="mono">{fmt(t, 0)} °C</b></span>
          <input type="range" min={tMin} max={tMax} step={1} value={t} onChange={(e) => setT(+e.target.value)} />
        </label>
      ) : (
        <label className="field wide">
          <span>Pression lue au manomètre : <b className="mono">{fmt(p, 1)} bar</b> (relatif)</span>
          <input type="range" min={pMin} max={pMax} step={0.1} value={p} onChange={(e) => setP(+e.target.value)} />
        </label>
      )}

      <div className="readouts">
        {mode === 'T' ? (
          <>
            <Readout label={glide ? 'P rosée (relative)' : 'P saturation (relative)'} value={`${fmt(toRel(pDew), 2)} bar`} sub={`${fmt(pDew, 2)} bar abs`} accent="lp" />
            {glide && <Readout label="P bulle (relative)" value={`${fmt(toRel(pBub), 2)} bar`} sub={`${fmt(pBub, 2)} bar abs`} accent="liquid" />}
          </>
        ) : (
          <>
            <Readout label={glide ? 'T rosée' : 'T saturation'} value={`${fmt(tDew, 1)} °C`} sub={`à ${fmt(toAbs(p), 2)} bar abs`} accent="lp" />
            {glide && <Readout label="T bulle" value={`${fmt(tBub, 1)} °C`} sub={`glissement ${fmt(tDew - tBub, 1)} K`} accent="liquid" />}
          </>
        )}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label={`Courbe de saturation du ${f.id}`}>
        {pTicks.map((v) => (
          <g key={`p${v}`}>
            <line x1={L} x2={W - R} y1={sy(v)} y2={sy(v)} className="grid-line" />
            <text x={L - 6} y={sy(v) + 4} textAnchor="end" className="tick">{v}</text>
          </g>
        ))}
        {tTicks.map((v) => (
          <text key={`t${v}`} x={sx(v)} y={H - B + 16} textAnchor="middle" className="tick">{v}</text>
        ))}
        <text x={W - R} y={H - 4} textAnchor="end" className="axis-label">T (°C)</text>
        <text x={4} y={12} className="axis-label">P (bar rel)</text>
        <text x={sx(tMin + (tMax - tMin) * 0.2)} y={sy(yMax * 0.75)} className="zone-label">liquide</text>
        <text x={sx(tMin + (tMax - tMin) * 0.7)} y={sy(yMax * 0.12)} className="zone-label">vapeur</text>
        {glide && <polyline points={curve('bubble')} className="sat-curve bubble" />}
        <polyline points={curve('dew')} className="sat-curve" />
        <line x1={sx(mx)} x2={sx(mx)} y1={sy(my)} y2={H - B} className="crosshair" />
        <line x1={L} x2={sx(mx)} y1={sy(my)} y2={sy(my)} className="crosshair" />
        <circle cx={sx(mx)} cy={sy(my)} r={5} className="marker" />
      </svg>
    </Widget>
  );
}
