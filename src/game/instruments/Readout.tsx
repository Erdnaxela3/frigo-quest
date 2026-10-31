import './instruments.css';

export interface ReadoutProps { label: string; value: number; unit: string; digits?: number }

export default function Readout({ label, value, unit, digits = 1 }: ReadoutProps) {
  const txt = Number.isFinite(value) ? value.toFixed(digits).replace('.', ',') : '--';
  return (
    <div className="inst-readout" role="status" aria-label={`${label} : ${txt} ${unit}`}>
      <span className="inst-readout-label">{label}</span>
      <span className="inst-readout-value">{txt}<small>{unit}</small></span>
    </div>
  );
}
