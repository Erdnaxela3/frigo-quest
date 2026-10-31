import { useId, type ReactNode } from 'react';
import { FLUID_IDS, fluid } from '../../physics/refrigerants';
import type { FluidId } from '../../physics/types';

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export const fmt = (n: number, d = 1) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });

export function Widget({ title, children, note }: { title: string; children: ReactNode; note?: ReactNode }) {
  return (
    <figure className="widget">
      <figcaption><span className="widget-tag">Interactif</span>{title}</figcaption>
      {children}
      {note && <p className="widget-note">{note}</p>}
    </figure>
  );
}

export function FluidSelect({ value, onChange, ids = FLUID_IDS }: { value: FluidId; onChange: (id: FluidId) => void; ids?: FluidId[] }) {
  const id = useId();
  return (
    <label className="field" htmlFor={id}>
      <span>Fluide</span>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as FluidId)}>
        {ids.map((f) => <option key={f} value={f}>{fluid(f).name}</option>)}
      </select>
    </label>
  );
}

export function Readout({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className={`readout ${accent ?? ''}`}>
      <span className="readout-label">{label}</span>
      <span className="readout-value mono">{value}</span>
      {sub && <span className="readout-sub mono">{sub}</span>}
    </div>
  );
}
