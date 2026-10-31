import { useState } from 'react';
import { FLUID_IDS, fluid } from '../../physics/refrigerants';
import type { FluidId } from '../../physics/types';
import { FluidSelect, Readout, Widget, fmt } from './common';

const FLAMMABLE = FLUID_IDS.filter((f) => fluid(f).lfl !== undefined);
const HEIGHTS = [
  { h0: 0.6, label: 'Au sol' },
  { h0: 1.0, label: 'Fenêtre' },
  { h0: 1.8, label: 'Mural' },
  { h0: 2.2, label: 'Plafond' },
];
const ROOM_H = 2.5;

export default function R290Limit() {
  const [id, setId] = useState<FluidId>('R290');
  const [area, setArea] = useState(20);
  const [h0, setH0] = useState(1.8);
  const [charge, setCharge] = useState(0.3);

  const lfl = fluid(id).lfl!;
  const m1 = 4 * lfl, m2 = 26 * lfl, m3 = 130 * lfl;
  const A = Number.isFinite(area) && area > 0 ? area : 0;
  const m = Number.isFinite(charge) && charge > 0 ? charge : 0;
  const k = 2.5 * lfl ** 1.25 * h0;
  const mMax = k * Math.sqrt(A);
  const aMin = (m / k) ** 2;

  const verdict =
    m <= m1 ? { cls: 'ok', text: `Charge ≤ m1 (${fmt(m1, 3)} kg) : pas d'exigence de surface minimale.` }
    : m > m3 ? { cls: 'bad', text: `Charge > m3 (${fmt(m3, 2)} kg) : hors du champ de la formule pour un local occupé.` }
    : m > m2 ? { cls: 'warn', text: `Charge entre m2 et m3 : mesures complémentaires (ventilation, détection, installation fixe).` }
    : m <= mMax ? { cls: 'ok', text: `Charge ≤ m_max : acceptable pour ${fmt(A, 0)} m² avec cette hauteur d'installation.` }
    : { cls: 'bad', text: `Charge > m_max : il faut au moins ${fmt(aMin, 1)} m², ou installer l'unité plus haut, ou réduire la charge.` };

  const sy = (h: number) => 150 - (h / ROOM_H) * 120;

  return (
    <Widget
      title="Limite de charge d'un fluide inflammable dans un local"
      note={<>Formule IEC 60335-2-40 : m_max = 2,5 × LFL<sup>1,25</sup> × h0 × √A (LFL en kg/m³, h0 en m, A en m²). Seuils et formule : <b>(à vérifier)</b> selon l'édition de la norme et l'EN 378 applicable.</>}
    >
      <div className="widget-controls">
        <FluidSelect value={id} onChange={setId} ids={FLAMMABLE} />
        <label className="field">
          <span>Surface du local A (m²)</span>
          <input type="number" min={1} step={1} value={area} onChange={(e) => setArea(e.target.valueAsNumber)} style={{ width: '6em' }} />
        </label>
        <label className="field">
          <span>Charge (kg)</span>
          <input type="number" min={0} step={0.01} value={charge} onChange={(e) => setCharge(e.target.valueAsNumber)} style={{ width: '6em' }} />
        </label>
      </div>
      <div className="seg" role="group" aria-label="Hauteur d'installation h0">
        {HEIGHTS.map((h) => (
          <button key={h.h0} type="button" aria-pressed={h0 === h.h0} onClick={() => setH0(h.h0)}>
            {h.label} <span className="mono">{fmt(h.h0, 1)} m</span>
          </button>
        ))}
      </div>

      <div className="r290-layout">
        <svg viewBox="0 0 300 170" className="chart room" role="img" aria-label={`Unité installée à ${fmt(h0, 1)} m du sol`}>
          <defs>
            <linearGradient id="r290-gas" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" className="gas-stop-a" />
              <stop offset="1" className="gas-stop-b" />
            </linearGradient>
          </defs>
          <rect x={30} y={sy(ROOM_H)} width={240} height={120} className="room-wall" />
          <rect x={31} y={sy(0.5)} width={238} height={sy(0) - sy(0.5)} fill="url(#r290-gas)" />
          <line x1={20} x2={280} y1={sy(0)} y2={sy(0)} className="room-floor" />
          <g className="unit" style={{ transform: `translateY(${sy(h0)}px)` }}>
            <rect x={150} y={-16} width={70} height={16} rx={3} />
            <line x1={158} x2={212} y1={-4} y2={-4} />
          </g>
          <g className="dim">
            <line x1={240} x2={240} y1={sy(0)} y2={sy(h0)} />
            <text x={246} y={(sy(0) + sy(h0)) / 2 + 4}>h0 = {fmt(h0, 1)} m</text>
          </g>
          <text x={36} y={sy(0) - 6} className="tick">gaz plus lourd que l'air : il s'accumule au sol</text>
          <text x={150} y={166} textAnchor="middle" className="tick">A = {fmt(A, 0)} m²</text>
        </svg>

        <div className="readouts column">
          <Readout label="LFL" value={`${fmt(lfl, 3)} kg/m³`} />
          <Readout label="m1 = 4 × LFL" value={`${fmt(m1, 3)} kg`} />
          <Readout label="m2 = 26 × LFL" value={`${fmt(m2, 2)} kg`} />
          <Readout label="m3 = 130 × LFL" value={`${fmt(m3, 2)} kg`} />
          <Readout label="m_max pour ce local" value={`${fmt(mMax, 3)} kg`} sub="(à vérifier)" accent="copper" />
        </div>
      </div>
      <p className={`alert ${verdict.cls}`}>{verdict.text}</p>
    </Widget>
  );
}
