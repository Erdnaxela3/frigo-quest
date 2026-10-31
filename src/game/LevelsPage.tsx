import { LEVELS } from '../levels';
import { useProgress } from '../progress/store';
import { TIERS } from './engine';
import './game.css';

// specs/levels/README.md
const PLANNED: [string, string][] = [
  ['L01', 'Raccorder le manifold et lire l\'installation'],
  ['L02', 'Contrôle d\'étanchéité périodique'],
  ['L03', 'Test de pression à l\'azote'],
  ['L04', 'Tirage au vide'],
  ['L05', 'Récupération du fluide'],
  ['L06', 'Charge en fluide'],
  ['L07', 'Mise en service et réglage des pressostats'],
  ['L08', 'Remplacer un détendeur thermostatique Danfoss'],
  ['L09', 'Pump-down et remplacement du filtre déshydrateur'],
  ['L10', 'Compresseur grillé et huile contaminée'],
  ['L11', 'Incondensables'],
  ['L12', 'Diagnostic de pannes'],
  ['L13', 'Intervention sur R290'],
  ['L14', 'Traçabilité : fiche d\'intervention et déchets'],
  ['L15', 'Régulateurs de pression KVP / KVR'],
];

export default function LevelsPage() {
  const { levels } = useProgress();
  return (
    <div>
      <h1>Niveaux</h1>
      <p className="muted">Interventions sur la platine didactique split R32. Chaque niveau se joue en mode guidé, standard ou examen.</p>
      <div className="grid">
        {PLANNED.map(([id, title]) => {
          const l = LEVELS.find((x) => x.id === id), r = levels[id];
          if (!l) {
            return (
              <div key={id} className="card lv-card locked" aria-disabled="true">
                <h3>{id} · {title}</h3>
                <p className="muted">Bientôt disponible</p>
              </div>
            );
          }
          return (
            <div key={id} className="card lv-card">
              <h3><a href={`#/niveau/${id}`}>{id} · {l.title}</a></h3>
              <p className="lv-stars" aria-label={`${r?.stars ?? 0} étoile(s) sur 3`}>
                {'★'.repeat(r?.stars ?? 0)}<span className="muted">{'★'.repeat(3 - (r?.stars ?? 0))}</span>
                {r && <span className="muted lv-small"> meilleur score {r.best}/100</span>}
              </p>
              <div className="row">
                {TIERS.map((t) => <a key={t.id} className="btn lv-mini" href={`#/niveau/${id}/${t.id}`} title={t.desc}>{t.label}</a>)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
