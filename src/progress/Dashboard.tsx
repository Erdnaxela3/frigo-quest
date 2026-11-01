import { useRef, useState } from 'react';
import { exportProgress, importProgress, mastery, resetProgress, setExamDate, useProgress } from './store';
import { SKILLS, SKILL_BY_ID, SKILL_GROUPS, type Skill } from '../learn/skills';
import { CARDS, LESSONS } from '../learn/content';
import { LEVELS as LEVEL_DEFS } from '../levels';
import type { ProgressEvent } from './store';
import './dashboard.css';

const LEVELS: [string, string][] = LEVEL_DEFS.map((l) => [l.id, l.title]);

/** Top recurring mistakes across level runs, labelled with the rule message. */
function recurringMistakes(events: ProgressEvent[], n = 5) {
  const count = new Map<string, number>();
  for (const e of events) {
    const d = e.detail as { level?: string; mistakes?: unknown } | undefined;
    if (e.kind !== 'level' || !d?.level || !Array.isArray(d.mistakes)) continue;
    for (const id of d.mistakes) count.set(`${d.level}:${id}`, (count.get(`${d.level}:${id}`) ?? 0) + 1);
  }
  return [...count].sort((a, b) => b[1] - a[1]).slice(0, n).map(([key, times]) => {
    const [level, id] = key.split(':');
    const def = LEVEL_DEFS.find((l) => l.id === level);
    const rule = def?.rules.find((r) => r.id === id);
    return { level, id, times, message: rule?.message ?? id, lesson: rule?.lesson ?? def?.lesson };
  });
}

const DAY = 86_400_000;
const pct = (x: number) => `${Math.round(x * 100)} %`;
const tone = (m: number | undefined) => (m === undefined ? 'none' : m < 0.5 ? 'bad' : m < 0.8 ? 'mid' : 'good');
const midnight = (t: number) => new Date(t).setHours(0, 0, 0, 0);

function skillHref(s: Skill) {
  const lesson = LESSONS.find((l) => l.skills.includes(s.id));
  return lesson ? `#/lecons/${lesson.id}` : `#/quiz/theme/${s.group}`;
}

function daysUntil(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.round((new Date(y, m - 1, d).getTime() - midnight(Date.now())) / DAY);
}

function streak(times: number[]) {
  const days = new Set(times.map(midnight));
  let day = midnight(Date.now());
  if (!days.has(day)) day = midnight(day - DAY / 2); // today not played yet: streak still alive from yesterday
  let n = 0;
  while (days.has(day)) { n++; day = midnight(day - DAY / 2); }
  return n;
}

export default function Dashboard() {
  const progress = useProgress();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const m = mastery(progress.events);
  const now = Date.now();
  const due = CARDS.filter((c) => (progress.cards[c.id]?.due ?? 0) <= now).length;
  const days = progress.examDate ? daysUntil(progress.examDate) : null;
  const weak = Object.entries(m).filter(([id]) => id in SKILL_BY_ID).sort((a, b) => a[1] - b[1]).slice(0, 5);

  const tSkills = SKILLS.filter((s) => s.type === 'T' && s.id.startsWith('A1:') && Number(s.group) <= 11);
  const tMean = tSkills.reduce((sum, s) => sum + (m[s.id] ?? 0), 0) / tSkills.length;
  const mistakes = recurringMistakes(progress.events);
  const levelsDone = LEVELS.filter(([id]) => id <= 'L05').every(([id]) => progress.levels[id]?.completed);
  const milestones: [string, boolean | null, string?][] = [
    ['Tronc commun théorie ≥ 80 %', tMean >= 0.8, pct(tMean)],
    ['Procédures L01 à L05 terminées', levelsDone],
    ['Toutes les procédures A1 réussies sans indice', null],
    ['Examen blanc A1 réussi', null],
    ['EP3 blanche ≥ 14/20', null],
  ];

  function exportFile() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([exportProgress()], { type: 'application/json' }));
    a.download = `frigoquest-progression-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function importFile(f: File | undefined) {
    if (!f) return;
    try {
      importProgress(await f.text());
      setMsg({ ok: true, text: 'Progression importée.' });
    } catch (e) {
      setMsg({ ok: false, text: `Import refusé : ${e instanceof Error ? e.message : String(e)}. Ta progression actuelle n'a pas été modifiée.` });
    }
    if (fileRef.current) fileRef.current.value = '';
  }

  function reset() {
    if (window.confirm('Effacer toute ta progression ? Cette action est irréversible (pense à exporter avant).')) {
      resetProgress();
      setMsg({ ok: true, text: 'Progression réinitialisée.' });
    }
  }

  return (
    <div className="dash">
      <h1>Progression</h1>

      <section className="dash-stats">
        <a className="card stat" href="#/cartes">
          <span className="stat-n">{due}</span>
          <span className="muted">carte{due > 1 ? 's' : ''} à réviser</span>
        </a>
        <div className="card stat">
          <span className="stat-n">{streak(progress.events.map((e) => e.at))}</span>
          <span className="muted">jour(s) d'affilée</span>
        </div>
        <div className="card stat">
          <span className="stat-n">{Object.keys(m).filter((id) => id in SKILL_BY_ID).length}<small>/{SKILLS.length}</small></span>
          <span className="muted">compétences abordées</span>
        </div>
        <div className="card stat">
          <label className="muted" htmlFor="exam-date">Date d'examen</label>
          <input id="exam-date" type="date" value={progress.examDate ?? ''} onChange={(e) => setExamDate(e.target.value || undefined)} />
          {days !== null && (
            <span className={days < 0 ? 'muted' : 'stat-sub'}>
              {days > 1 ? `J − ${days}` : days === 1 ? 'Demain !' : days === 0 ? "Aujourd'hui !" : 'Date passée'}
            </span>
          )}
        </div>
      </section>

      <section className="card">
        <div className="row dash-head">
          <h2>Carte des compétences</h2>
          <div className="legend" aria-label="Légende">
            <span><i className="sq none" /> non vue</span>
            <span><i className="sq bad" /> &lt; 50 %</span>
            <span><i className="sq mid" /> &lt; 80 %</span>
            <span><i className="sq good" /> ≥ 80 %</span>
          </div>
        </div>
        <div className="skill-map">
          {Object.entries(SKILL_GROUPS).map(([g, label]) => (
            <div key={g} className="skill-group">
              <div className="skill-group-title" title={label}>{/^\d/.test(g) ? `${g}. ` : ''}{label}</div>
              <div className="squares">
                {SKILLS.filter((s) => s.group === g).map((s) => {
                  const tip = `${s.id.replace(/^A1:/, '')} — ${s.label} : ${s.id in m ? pct(m[s.id]) : 'non vue'}`;
                  return <a key={s.id} className={`sq ${tone(m[s.id])}`} href={skillHref(s)} title={tip} aria-label={tip} />;
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="dash-cols">
        <section className="card">
          <h2>Points faibles</h2>
          {weak.length === 0 ? (
            <p className="muted">Fais quelques quiz ou flashcards pour voir apparaître tes points faibles.</p>
          ) : (
            <ul className="dash-list">
              {weak.map(([id, v]) => (
                <li key={id}>
                  <span className={`dot ${tone(v)}`} />
                  <span className="grow">{SKILL_BY_ID[id].label}<span className="muted"> · {pct(v)}</span></span>
                  <button onClick={() => { location.hash = '#/quiz/revision'; }}>S'entraîner</button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2>Erreurs récurrentes</h2>
          {mistakes.length === 0 ? (
            <p className="muted">Aucune erreur enregistrée dans les niveaux pour l'instant.</p>
          ) : (
            <ul className="dash-list">
              {mistakes.map((x) => (
                <li key={`${x.level}:${x.id}`}>
                  <span className="mono muted">{x.level}</span>
                  <span className="grow">{x.message}<span className="muted"> · ×{x.times}</span></span>
                  {x.lesson && <a className="btn" href={`#/lecons/${x.lesson}`}>Leçon</a>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2>Niveaux</h2>
          <ul className="dash-list">
            <li>
              <span className="mono muted">L00</span>
              <a className="grow" href="#/labo">Labo des gaz</a>
            </li>
            {LEVELS.map(([id, title]) => {
              const r = progress.levels[id];
              const stars = r?.stars ?? 0;
              return (
                <li key={id}>
                  <span className="mono muted">{id}</span>
                  <a className="grow" href={`#/niveau/${id}`}>{title}</a>
                  {r && <span className="muted">{Math.round(r.best)}</span>}
                  <span className="stars" aria-label={`${stars} étoile(s) sur 3`}>
                    {[1, 2, 3].map((i) => <span key={i} className={i <= stars ? 'on' : ''}>★</span>)}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="card">
          <h2>Jalons</h2>
          <ul className="dash-list">
            {milestones.map(([label, done, extra]) => (
              <li key={label} className={done === null ? 'locked' : ''}>
                <span className={`badge ${done ? 'ok' : ''}`}>{done === null ? '🔒' : done ? '✓' : '…'}</span>
                <span className="grow">{label}</span>
                {extra && <span className="muted">{extra}</span>}
                {done === null && <span className="muted small">bientôt</span>}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card">
        <h2>Sauvegarde</h2>
        <p className="muted">Ta progression est enregistrée dans ce navigateur. Exporte-la pour la garder ou la transférer.</p>
        <div className="row">
          <button className="primary" onClick={exportFile}>Exporter (JSON)</button>
          <button onClick={() => fileRef.current?.click()}>Importer…</button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => importFile(e.target.files?.[0])} />
          <button className="danger" onClick={reset}>Réinitialiser</button>
        </div>
        {msg && <p role="status" className={msg.ok ? 'msg ok' : 'msg bad'}>{msg.text}</p>}
      </section>
    </div>
  );
}
