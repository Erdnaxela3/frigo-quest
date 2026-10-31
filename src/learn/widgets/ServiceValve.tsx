import { useState } from 'react';
import { Widget } from './common';

type Pos = 'back' | 'mid' | 'front';
type Port = 'line' | 'comp' | 'service';

const POS: Record<Pos, { label: string; spindle: string; dy: number; open: Port[]; link: string; use: string }> = {
  back: {
    label: 'Contre-siège arrière',
    spindle: 'Tige dévissée à fond (sens anti-horaire)',
    dy: 0,
    open: ['line', 'comp'],
    link: 'Ligne ↔ compresseur. Raccord de service isolé.',
    use: 'Fonctionnement normal. Position pour raccorder ou retirer un flexible sans perte de fluide.',
  },
  mid: {
    label: 'Position intermédiaire',
    spindle: 'Tige à mi-course (1 à 2 tours depuis l\'arrière)',
    dy: 32,
    open: ['line', 'comp', 'service'],
    link: 'Ligne ↔ compresseur ↔ raccord de service : tout communique.',
    use: 'Lecture des pressions au manifold, charge, tirage au vide ou récupération par la vanne.',
  },
  front: {
    label: 'Contre-siège avant',
    spindle: 'Tige vissée à fond (sens horaire)',
    dy: 64,
    open: ['comp', 'service'],
    link: 'Compresseur ↔ raccord de service. Ligne fermée.',
    use: 'Isoler le compresseur de l\'installation (contrôle, remplacement). Ne jamais faire tourner le compresseur vanne de refoulement fermée à l\'avant : surpression immédiate.',
  },
};

const PATHS: Record<Port, string> = {
  line: 'M40 208 H210 V170',
  comp: 'M210 130 H400',
  service: 'M210 90 V60 H350',
};

export default function ServiceValve() {
  const [pos, setPos] = useState<Pos>('back');
  const p = POS[pos];
  const on = (port: Port) => p.open.includes(port);

  return (
    <Widget title="Vanne de service à 3 positions" note="Toujours remettre le capuchon de tige et le bouchon du raccord de service après intervention : ce sont des points de fuite classiques.">
      <div className="seg" role="group" aria-label="Position de la tige">
        {(Object.keys(POS) as Pos[]).map((k) => (
          <button key={k} type="button" aria-pressed={pos === k} onClick={() => setPos(k)}>{POS[k].label}</button>
        ))}
      </div>

      <svg viewBox="0 -60 450 310" className="chart valve" role="img" aria-label={`${p.label} : ${p.link}`}>
        <defs>
          <pattern id="sv-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" className="hatch" />
          </pattern>
        </defs>
        <rect x={40} y={196} width={100} height={24} className="pipe" />
        <rect x={280} y={118} width={120} height={24} className="pipe" />
        <rect x={280} y={48} width={70} height={24} className="pipe" />
        <rect x={140} y={28} width={140} height={196} rx={14} className="body" />
        <rect x={140} y={28} width={140} height={196} rx={14} fill="url(#sv-hatch)" />

        <rect x={40} y={200} width={185} height={16} className={`duct ${on('line') ? 'on' : ''}`} />
        <rect x={195} y={168} width={30} height={40} className={`duct ${on('line') ? 'on' : ''}`} />
        <rect x={160} y={90} width={100} height={80} rx={6} className="duct on" />
        <rect x={258} y={122} width={142} height={16} className="duct on" />
        <rect x={195} y={40} width={30} height={52} className={`duct ${on('service') ? 'on' : ''}`} />
        <rect x={225} y={52} width={125} height={16} className={`duct ${on('service') ? 'on' : ''}`} />

        {(Object.keys(PATHS) as Port[]).map((k) => on(k) && <path key={k} d={PATHS[k]} className="flow" />)}

        <path d="M187 90 L195 98 M233 90 L225 98" className="seat" />
        <path d="M187 170 L195 162 M233 170 L225 162" className="seat" />

        <g className="spindle" style={{ transform: `translateY(${p.dy}px)` }}>
          <rect x={203} y={-42} width={14} height={134} className="stem" />
          <rect x={199} y={-54} width={22} height={12} rx={2} className="stem-square" />
          <path d="M178 92 H242 L232 106 H188 Z" className="disc" />
        </g>
        <rect x={190} y={22} width={40} height={14} rx={3} className="packing" />

        <rect x={350} y={48} width={22} height={24} rx={3} className="fitting" />
        <text x={378} y={64} className="port-label">Service</text>
        <text x={400} y={112} textAnchor="end" className="port-label">Compresseur</text>
        <text x={42} y={194} className="port-label">Ligne (installation)</text>

        {!on('service') && <text x={290} y={66} textAnchor="middle" className="blocked">✕</text>}
        {!on('line') && <text x={130} y={213} textAnchor="middle" className="blocked">✕</text>}
      </svg>

      <dl className="valve-info">
        <dt>Tige</dt><dd>{p.spindle}</dd>
        <dt>Communication</dt><dd><b>{p.link}</b></dd>
        <dt>Usage</dt><dd>{p.use}</dd>
      </dl>
    </Widget>
  );
}
