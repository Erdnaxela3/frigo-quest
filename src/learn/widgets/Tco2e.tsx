import { useState } from 'react';
import { fluid, leakCheckFor, tco2e } from '../../physics/refrigerants';
import type { FluidId } from '../../physics/types';
import { FluidSelect, Readout, Widget, clamp, fmt } from './common';

const NOT_FGAS: FluidId[] = ['R290', 'R744'];
const BANDS = [
  { from: 0.1, to: 5, label: 'pas de contrôle', cls: 'none' },
  { from: 5, to: 50, label: '12 mois', cls: 'low' },
  { from: 50, to: 500, label: '6 mois', cls: 'mid' },
  { from: 500, to: 5000, label: '3 mois', cls: 'high' },
];
const lx = (t: number) => 10 + ((Math.log10(clamp(t, 0.1, 5000)) + 1) / Math.log10(50000)) * 340;

export default function Tco2e() {
  const [id, setId] = useState<FluidId>('R404A');
  const [kg, setKg] = useState(3);
  const [lds, setLds] = useState(false);
  const [hermetic, setHermetic] = useState(false);

  const f = fluid(id);
  const charge = Number.isFinite(kg) && kg > 0 ? kg : 0;
  const t = tco2e(id, charge);
  const months = leakCheckFor(f.id, charge, lds, hermetic);
  const notFgas = NOT_FGAS.includes(id);

  return (
    <Widget
      title="Tonnes équivalent CO₂ et fréquence des contrôles d'étanchéité"
      note={<>t CO₂e = charge (kg) × PRP ÷ 1000. Un système de détection de fuites (LDS) double l'intervalle ; il est obligatoire à partir de 500 t CO₂e. HFO (R1234yf) : seuils en masse, 1 / 10 / 100 kg.</>}
    >
      <div className="widget-controls">
        <FluidSelect value={id} onChange={setId} />
        <label className="field">
          <span>Charge (kg)</span>
          <input type="number" min={0} step={0.1} value={kg} onChange={(e) => setKg(e.target.valueAsNumber)} style={{ width: '7em' }} />
        </label>
        <label className="check"><input type="checkbox" checked={lds} onChange={(e) => setLds(e.target.checked)} /> Détection de fuites (LDS)</label>
        <label className="check"><input type="checkbox" checked={hermetic} onChange={(e) => setHermetic(e.target.checked)} /> Hermétiquement scellé</label>
      </div>

      <div className="readouts">
        <Readout label={`PRP du ${f.id}`} value={fmt(f.gwp, f.gwp < 10 ? 3 : 0)} sub={f.safety} />
        <Readout label="Équivalent CO₂" value={`${fmt(t, t < 10 ? 2 : 1)} t`} sub={`${fmt(charge, 2)} kg × ${f.gwp} ÷ 1000`} accent="copper" />
        <Readout
          label="Contrôle d'étanchéité"
          value={notFgas ? '—' : months ? `tous les ${months} mois` : 'non obligatoire'}
          sub={notFgas ? 'hors F-Gas' : hermetic && t >= 5 && t < 10 ? 'exemption hermétique < 10 t' : undefined}
          accent={months ? (months <= 3 ? 'bad' : months <= 6 ? 'warn' : 'ok') : undefined}
        />
      </div>

      <svg viewBox="0 0 360 64" className="chart scale" role="img" aria-label="Échelle des seuils 5, 50 et 500 t CO₂e">
        {BANDS.map((b) => (
          <g key={b.from}>
            <rect x={lx(b.from)} y={14} width={lx(b.to) - lx(b.from)} height={16} className={`band ${b.cls}`} />
            <text x={(lx(b.from) + lx(b.to)) / 2} y={44} textAnchor="middle" className="tick">{b.label}</text>
          </g>
        ))}
        {[5, 50, 500].map((v) => <text key={v} x={lx(v)} y={10} textAnchor="middle" className="tick strong">{v} t</text>)}
        {charge > 0 && (
          <g className="needle" style={{ transform: `translateX(${lx(t)}px)` }}>
            <path d="M0 12 L-6 4 L6 4 Z" />
            <line x1={0} x2={0} y1={12} y2={32} />
          </g>
        )}
        <text x={10} y={60} className="tick">0,1 t</text>
        <text x={350} y={60} textAnchor="end" className="tick">5 000 t (échelle log)</text>
      </svg>

      <p className="widget-text">
        Pour le <b>{f.id}</b>, le seuil de 5 t CO₂e est atteint dès <b className="mono">{fmt(5000 / f.gwp, f.gwp > 500 ? 2 : 0)} kg</b>
        {f.gwp > 50 && <> ; 50 t à <b className="mono">{fmt(50000 / f.gwp, 1)} kg</b></>}.
        {notFgas && ' Ce fluide n\'est pas un gaz fluoré : pas de contrôle F-Gas, mais des règles de sécurité spécifiques (inflammabilité, haute pression).'}
        {id === 'R1234yf' && ' Les HFO suivent des règles particulières (annexe II du règlement) — à vérifier.'}
      </p>
    </Widget>
  );
}
