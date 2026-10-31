import './instruments.css';

export interface ScaleProps { kg: number; tare: number; onTare?: () => void }

export default function Scale({ kg, tare, onTare }: ScaleProps) {
  const net = kg - tare;
  const txt = net.toFixed(3).replace('.', ',');
  return (
    <div className="inst-scale">
      <div className="inst-scale-plate" aria-hidden="true" />
      <div className="inst-scale-body">
        <div className="inst-lcd-panel" role="status" aria-label={`Balance : ${txt} kg`}>
          <div className="inst-scale-net">{txt}<small>kg</small></div>
          <div className="inst-scale-sub">brut {kg.toFixed(3).replace('.', ',')} · tare {tare.toFixed(3).replace('.', ',')}</div>
        </div>
        <button type="button" onClick={onTare} disabled={!onTare}>TARE</button>
      </div>
    </div>
  );
}
