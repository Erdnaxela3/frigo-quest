import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import type { Question } from './types';
import { SKILL_BY_ID, SKILL_GROUPS } from './skills';
import { GENERATORS, QUESTIONS } from './content';
import { EP1_DOSSIER, EP1_DURATION, EP1_QUESTIONS } from './content/exam-ep1';
import { parseNumber, shuffle } from './quiz';
import {
  A1_DURATION, A1_PASS, A1_SIZE, EP3_LEVELS, EP3_PARTS, buildA1Exam, ep3Bests, ep3Mark, ep3Points, scoreExam, type Answers, type ExamScore, type Tally,
} from './exam';
import { renderMarkdown } from './Markdown';
import { record, useProgress, type ProgressEvent } from '../progress/store';
import { LEVELS } from '../levels';
import './quiz.css';
import './exam.css';

type ExamId = 'a1' | 'ep1' | 'ep3';

export default function ExamPage({ args }: { args: string[] }) {
  const [nonce, setNonce] = useState(0);
  const restart = () => setNonce((n) => n + 1);
  switch (args[0]) {
    case 'a1': return <A1Exam key={nonce} onRestart={restart} />;
    case 'ep1': return <Ep1Exam key={nonce} onRestart={restart} />;
    case 'ep3': return <Ep3 />;
    default: return <ExamHome />;
  }
}

const back = <a className="btn" href="#/examen">← Examens</a>;
const pctText = (x: number) => `${Math.round(x * 100)} %`;
const mark20 = (score: number) => Math.round(score * 200) / 10;
const fmt = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 3 });
const clock = (s: number) => {
  const t = Math.max(0, Math.ceil(s));
  return `${Math.floor(t / 3600)}:${String(Math.floor((t % 3600) / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};

function lastExam(events: ProgressEvent[], id: ExamId) {
  for (let i = events.length - 1; i >= 0; i--) if (events[i].kind === 'exam' && events[i].detail?.exam === id) return events[i];
}

function ExamHome() {
  const { events, levels } = useProgress();
  const a1 = lastExam(events, 'a1'), ep1 = lastExam(events, 'ep1');
  const date = (e: ProgressEvent) => new Date(e.at).toLocaleDateString('fr-FR');
  const cards: { id: ExamId; kicker: string; title: string; desc: string; duration: string; last: string }[] = [
    {
      id: 'a1', kicker: 'Attestation d\'aptitude', title: 'A1 théorie blanche',
      desc: `${A1_SIZE} questions tirées selon les règles de l'examen : groupes 1–5, 10, 11, 12, un groupe parmi 6/7/8/9 tenu secret, au moins une question CO₂, NH₃ et efficacité énergétique. Aucune correction avant la fin.`,
      duration: '1 h 15',
      last: a1 ? `${pctText(a1.score)} — ${a1.score >= A1_PASS ? 'réussi' : 'non réussi'} (${date(a1)})` : 'Jamais passé',
    },
    {
      id: 'ep1', kicker: 'CAP IFCA', title: 'EP1 blanche — Préparation d\'une réalisation',
      desc: `Étude de cas écrite : dossier technique d'un split R32 3,5 kW à installer dans un bureau, ${EP1_QUESTIONS.length} questions (lecture du dossier, quantitatifs, matériel, sécurité, procédures).`,
      duration: '3 h (pause possible)',
      last: ep1 ? `${fmt(mark20(ep1.score))} / 20 (${date(ep1)})` : 'Jamais passé',
    },
    {
      id: 'ep3', kicker: 'CAP IFCA', title: 'EP3 blanche — Entretien, mise en service',
      desc: 'Enchaînement des niveaux du jeu en mode examen (vide, charge, mise en service et pressostats), noté avec le barème officiel.',
      duration: '6 h à l\'examen réel',
      last: `Note actuelle : ${fmt(ep3Mark(ep3Bests(events, levels)))} / 20`,
    },
  ];
  return (
    <div className="quiz exam">
      <header className="quiz-head">
        <h1>Examens blancs</h1>
        <p className="muted">Conditions d'examen : chronomètre, pas d'indice, correction détaillée à la fin.</p>
      </header>
      <div className="exam-cards">
        {cards.map((c) => (
          <a key={c.id} className="card exam-card" href={`#/examen/${c.id}`}>
            <span className="quiz-mode-kicker">{c.kicker}</span>
            <strong>{c.title}</strong>
            <span className="muted">{c.desc}</span>
            <span className="exam-card-foot">
              <span className="badge">⏱ {c.duration}</span>
              <span className="muted">{c.last}</span>
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

function recordExam(exam: ExamId, questions: Question[], s: ExamScore, detail: Record<string, unknown> = {}) {
  questions.forEach((q, i) => record({ kind: 'quiz', skills: q.skills, score: s.results[i] ? 1 : 0, detail: { id: q.id, exam } }));
  record({ kind: 'exam', skills: [...new Set(questions.flatMap((q) => q.skills))], score: s.score, detail: { exam, ...detail } });
}

function A1Exam({ onRestart }: { onRestart: () => void }) {
  const [paper] = useState(() => buildA1Exam(Math.random, QUESTIONS, GENERATORS));
  const [answers, setAnswers] = useState<Answers | null>(null);
  const [started, setStarted] = useState(false);
  const title = 'A1 théorie blanche';
  if (!started) {
    return (
      <Intro title={title} onStart={() => setStarted(true)}>
        <li>{paper.questions.length} questions, durée <strong>1 h 15</strong> (15 min spécifique A1 + 1 h tronc commun).</li>
        <li>Un groupe parmi 6/7/8/9 est tiré au sort ; il n'est révélé qu'à la fin.</li>
        <li>Aucune correction pendant l'épreuve. Vous pouvez naviguer entre les questions et en marquer pour y revenir.</li>
        <li>La copie est rendue automatiquement à la fin du temps.</li>
        <li>Seuil de réussite retenu : {pctText(A1_PASS)} (le seuil officiel n'est pas publié dans les textes consultés).</li>
      </Intro>
    );
  }
  if (!answers) {
    return (
      <Paper title={title} questions={paper.questions} duration={A1_DURATION} onSubmit={(a) => {
        recordExam('a1', paper.questions, scoreExam(paper.questions, a), { group: paper.group });
        setAnswers(a);
      }} />
    );
  }
  const s = scoreExam(paper.questions, answers);
  const pass = s.score >= A1_PASS;
  const rows = Object.entries(s.byGroup).sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([g, t]) => [`${g} — ${SKILL_GROUPS[g] ?? ''}`, t] as [string, Tally]);
  return (
    <Results title={title} questions={paper.questions} answers={answers} s={s} rows={rows} rowsHead="Groupe" onRestart={onRestart}
      ring={<><span className="mono">{pctText(s.score)}</span><small>{s.correct}/{s.total}</small></>}
      tone={pass ? 'ok' : s.score >= 0.5 ? 'warn' : 'bad'}>
      <h2>{pass ? 'Réussi' : 'Non réussi'} <span className="muted">(seuil {pctText(A1_PASS)})</span></h2>
      <p>Groupe tiré au sort parmi 6/7/8/9 : <strong>{paper.group} — {SKILL_GROUPS[paper.group]}</strong></p>
      <p className="muted small">Le seuil officiel n'est pas publié dans les textes consultés (arrêté du 21/11/2025) : {pctText(A1_PASS)} est une valeur par défaut.</p>
    </Results>
  );
}

function Ep1Exam({ onRestart }: { onRestart: () => void }) {
  const [answers, setAnswers] = useState<Answers | null>(null);
  const [started, setStarted] = useState(false);
  const title = 'CAP EP1 blanche';
  const dossier = (
    <div className="md exam-dossier-body">
      {EP1_DOSSIER.map((sec) => <section key={sec.title}><h3>{sec.title}</h3>{renderMarkdown(sec.body)}</section>)}
    </div>
  );
  if (!started) {
    return (
      <Intro title={title} onStart={() => setStarted(true)}>
        <li>Étude de cas écrite : installation d'un split R32 3,5 kW dans un bureau.</li>
        <li>Le dossier technique reste affiché à côté des questions pendant toute l'épreuve.</li>
        <li>{EP1_QUESTIONS.length} questions, durée <strong>3 h</strong>. Vous pouvez mettre l'épreuve en pause.</li>
        <li>Note sur 20 à la fin, avec la correction détaillée.</li>
      </Intro>
    );
  }
  if (!answers) {
    return (
      <Paper title={title} questions={EP1_QUESTIONS} duration={EP1_DURATION} pausable dossier={dossier} onSubmit={(a) => {
        recordExam('ep1', EP1_QUESTIONS, scoreExam(EP1_QUESTIONS, a));
        setAnswers(a);
      }} />
    );
  }
  const s = scoreExam(EP1_QUESTIONS, answers);
  const rows = Object.entries(s.bySkill).sort((a, b) => Number(b[0].startsWith('CAP')) - Number(a[0].startsWith('CAP')) || a[0].localeCompare(b[0]))
    .map(([id, t]) => [`${id} — ${SKILL_BY_ID[id]?.label ?? ''}`, t] as [string, Tally]);
  const m = mark20(s.score);
  return (
    <Results title={title} questions={EP1_QUESTIONS} answers={answers} s={s} rows={rows} rowsHead="Compétence" onRestart={onRestart}
      ring={<><span className="mono">{fmt(m)}</span><small>/ 20</small></>}
      tone={m >= 12 ? 'ok' : m >= 10 ? 'warn' : 'bad'}>
      <h2>{fmt(m)} / 20 <span className="muted">({s.correct}/{s.total} bonnes réponses)</span></h2>
      <p className="muted small">Note indicative : toutes les questions ont le même poids.</p>
      <details className="exam-dossier-recall"><summary>Revoir le dossier technique</summary>{dossier}</details>
    </Results>
  );
}

function Intro({ title, children, onStart }: { title: string; children: ReactNode; onStart: () => void }) {
  return (
    <div className="quiz exam">
      <div className="quiz-bar">{back}<h1>{title}</h1></div>
      <div className="card exam-intro">
        <ul>{children}</ul>
        <button className="primary" onClick={onStart}>Commencer l'épreuve</button>
      </div>
    </div>
  );
}

function initialPerm(q: Question) {
  const ids = 'choices' in q ? q.choices.map((_, i) => i) : [];
  if (q.type !== 'order' || ids.length < 2) return shuffle(ids);
  let p = shuffle(ids);
  while (p.every((x, i) => x === i)) p = shuffle(ids);
  return p;
}

const isAnswered = (q: Question, a: unknown) =>
  a !== undefined && (q.type === 'multi' ? (a as number[]).length > 0 : q.type === 'numeric' ? String(a).trim() !== '' : true);

function Paper({ title, questions, duration, pausable, dossier, onSubmit }: {
  title: string; questions: Question[]; duration: number; pausable?: boolean; dossier?: ReactNode; onSubmit: (a: Answers) => void;
}) {
  const [perms] = useState(() => Object.fromEntries(questions.map((q) => [q.id, initialPerm(q)])));
  const [answers, setAnswers] = useState<Answers>({});
  const [flags, setFlags] = useState<Set<string>>(new Set());
  const [idx, setIdx] = useState(0);
  const [left, setLeft] = useState(duration);
  const [paused, setPaused] = useState(false);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (paused) return;
    // wall-clock deltas, so a throttled background tab still counts down correctly
    let last = Date.now();
    const t = setInterval(() => {
      const now = Date.now();
      setLeft((l) => l - (now - last) / 1000);
      last = now;
    }, 500);
    return () => clearInterval(t);
  }, [paused]);

  const timeUp = left <= 0;
  useEffect(() => {
    if (timeUp) onSubmit(answers);
  }, [timeUp]); // eslint-disable-line react-hooks/exhaustive-deps

  const q = questions[idx];
  const unanswered = questions.filter((x) => !isAnswered(x, answers[x.id])).length;
  const toggleFlag = () => setFlags((f) => {
    const n = new Set(f);
    if (n.has(q.id)) n.delete(q.id); else n.add(q.id);
    return n;
  });

  return (
    <div className={`exam${dossier ? ' exam-wide' : ''}`}>
      <div className="quiz-bar exam-bar">
        <h1>{title}</h1>
        <span className={`exam-clock mono${left < 300 ? ' low' : ''}`} role="timer" aria-label="Temps restant">⏱ {clock(left)}</span>
        {pausable && <button onClick={() => setPaused((p) => !p)}>{paused ? 'Reprendre' : 'Pause'}</button>}
        <button className="primary" onClick={() => setConfirm(true)}>Rendre la copie</button>
      </div>

      {confirm && (
        <div className="card exam-confirm" role="alertdialog" aria-label="Confirmer la remise de la copie">
          <p><strong>Rendre la copie maintenant ?</strong> {unanswered ? `${unanswered} question${unanswered > 1 ? 's' : ''} sans réponse. ` : 'Toutes les questions ont une réponse. '}
            {flags.size > 0 && `${flags.size} question${flags.size > 1 ? 's' : ''} marquée${flags.size > 1 ? 's' : ''}. `}Vous ne pourrez plus modifier vos réponses.</p>
          <div className="row">
            <button className="primary" onClick={() => onSubmit(answers)}>Oui, rendre la copie</button>
            <button onClick={() => setConfirm(false)}>Continuer l'épreuve</button>
          </div>
        </div>
      )}

      {paused ? (
        <div className="card exam-paused"><h2>Épreuve en pause</h2><p className="muted">Le chronomètre est arrêté. Le sujet est masqué.</p>
          <button className="primary" onClick={() => setPaused(false)}>Reprendre</button></div>
      ) : (
        <div className="exam-layout">
          {dossier && <aside className="card exam-dossier" aria-label="Dossier technique"><h2>Dossier technique</h2>{dossier}</aside>}
          <div className="exam-main">
            <nav className="exam-nav" aria-label="Questions">
              {questions.map((x, i) => (
                <button key={x.id} onClick={() => setIdx(i)} aria-current={i === idx ? 'true' : undefined}
                  className={`${isAnswered(x, answers[x.id]) ? 'done' : ''}${flags.has(x.id) ? ' flag' : ''}${i === idx ? ' cur' : ''}`}
                  aria-label={`Question ${i + 1}${isAnswered(x, answers[x.id]) ? ', répondue' : ''}${flags.has(x.id) ? ', marquée' : ''}`}>
                  {i + 1}
                </button>
              ))}
            </nav>
            <ExamQuestion key={q.id} q={q} perm={perms[q.id]} value={answers[q.id]} label={`Question ${idx + 1} / ${questions.length}`}
              onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))} />
            <div className="row exam-move">
              <button disabled={idx === 0} onClick={() => setIdx(idx - 1)}>← Précédente</button>
              <button className={flags.has(q.id) ? 'exam-flag on' : 'exam-flag'} aria-pressed={flags.has(q.id)} onClick={toggleFlag}>⚑ {flags.has(q.id) ? 'Marquée' : 'Marquer'}</button>
              <button disabled={idx === questions.length - 1} onClick={() => setIdx(idx + 1)}>Suivante →</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ExamQuestion({ q, perm, value, label, onChange, review }: {
  q: Question; perm: number[]; value: unknown; label: string; onChange?: (v: unknown) => void; review?: { ok: boolean };
}) {
  const picked = q.type === 'single' ? (value === undefined ? [] : [value as number]) : q.type === 'multi' ? ((value as number[]) ?? []) : [];
  const order = q.type === 'order' ? ((value as number[]) ?? perm) : [];
  const toggle = (i: number) => {
    if (review || !onChange) return;
    if (q.type === 'single') onChange(i);
    else onChange(picked.includes(i) ? picked.filter((x) => x !== i) : [...picked, i]);
  };
  const move = (pos: number, d: -1 | 1) => {
    const n = [...order];
    [n[pos], n[pos + d]] = [n[pos + d], n[pos]];
    onChange?.(n);
  };
  const choiceState = (i: number) => {
    if (!review) return picked.includes(i) ? 'picked' : '';
    const right = q.type === 'single' ? q.answer === i : q.type === 'multi' && q.answer.includes(i);
    if (right) return 'right';
    return picked.includes(i) ? 'wrong' : 'dim';
  };
  const text = typeof value === 'string' ? value : '';
  const invalid = !review && text.trim() !== '' && parseNumber(text) === null;

  return (
    <article className={`card quiz-q${review ? ` exam-review-q ${review.ok ? 'ok' : 'bad'}` : ''}`}>
      <div className="row quiz-q-meta">
        <span className="muted">{label}</span>
        {review && q.skills.map((s) => <span key={s} className="badge" title={SKILL_BY_ID[s]?.label}>{s}</span>)}
        {q.confidence !== 'ok' && (
          <span className="badge warn" title={q.confidence === 'disputed' ? 'Point débattu selon les sources' : 'Source secondaire, à confirmer'}>⚠ à vérifier</span>
        )}
      </div>
      <p className="quiz-prompt">{q.prompt}</p>

      {(q.type === 'single' || q.type === 'multi') && (
        <>
          {q.type === 'multi' && <p className="muted quiz-hint">Plusieurs réponses possibles.</p>}
          <div className="quiz-choices" role={q.type === 'single' ? 'radiogroup' : 'group'}>
            {(review ? q.choices.map((_, i) => i) : perm).map((i) => (
              <button key={i} role={q.type === 'single' ? 'radio' : 'checkbox'} aria-checked={picked.includes(i)}
                className={`quiz-choice ${choiceState(i)}`} onClick={() => toggle(i)} disabled={!!review}>
                <span className={`quiz-tick ${q.type}`} aria-hidden />
                {q.choices[i]}
              </button>
            ))}
          </div>
        </>
      )}

      {q.type === 'numeric' && (
        <div className="quiz-numeric">
          <input aria-label="Votre réponse" inputMode="decimal" value={text} disabled={!!review} className={invalid ? 'invalid' : ''}
            placeholder={review ? 'sans réponse' : ''} onChange={(e) => onChange?.(e.target.value)} />
          {q.unit && <span className="quiz-unit">{q.unit}</span>}
          {invalid && <span className="quiz-invalid" role="alert">Nombre invalide (ex. 8,1)</span>}
        </div>
      )}

      {q.type === 'order' && (
        <ol className="quiz-order">
          {order.map((i, pos) => (
            <li key={i} className={review ? (i === pos ? 'right' : 'wrong') : ''}>
              <span className="quiz-order-text">{q.choices[i]}</span>
              {!review && (
                <span className="quiz-order-btns">
                  <button aria-label={`Monter « ${q.choices[i]} »`} disabled={pos === 0} onClick={() => move(pos, -1)}>↑</button>
                  <button aria-label={`Descendre « ${q.choices[i]} »`} disabled={pos === order.length - 1} onClick={() => move(pos, 1)}>↓</button>
                </span>
              )}
            </li>
          ))}
        </ol>
      )}

      {review && (
        <div className={`quiz-feedback ${review.ok ? 'ok' : 'bad'}`}>
          <strong>{review.ok ? '✓ Bonne réponse' : value === undefined ? '✗ Sans réponse' : '✗ Mauvaise réponse'}</strong>
          {!review.ok && q.type === 'numeric' && <p className="mono">Attendu : {fmt(q.answer.value)} ± {fmt(q.answer.tol)} {q.unit}</p>}
          {!review.ok && q.type === 'order' && <ol className="quiz-correct-order">{q.choices.map((c, i) => <li key={i}>{c}</li>)}</ol>}
          <p>{q.explain}</p>
        </div>
      )}
    </article>
  );
}

function Results({ title, questions, answers, s, rows, rowsHead, ring, tone, children, onRestart }: {
  title: string; questions: Question[]; answers: Answers; s: ExamScore; rows: [string, Tally][]; rowsHead: string;
  ring: ReactNode; tone: 'ok' | 'warn' | 'bad'; children: ReactNode; onRestart: () => void;
}) {
  const [onlyWrong, setOnlyWrong] = useState(false);
  return (
    <div className="quiz exam">
      <div className="quiz-bar">{back}<h1>{title} — résultat</h1></div>
      <div className="card quiz-summary">
        <div className={`quiz-ring ${tone}`} style={{ '--pct': Math.round(s.score * 100) } as CSSProperties}>{ring}</div>
        <div className="quiz-summary-body">
          {children}
          <table className="quiz-skills">
            <thead><tr><th>{rowsHead}</th><th>Résultat</th></tr></thead>
            <tbody>
              {rows.map(([label, { ok, n }]) => (
                <tr key={label}><td>{label}</td><td className={ok === n ? 'ok' : ok === 0 ? 'bad' : 'warn'}>{ok} / {n}</td></tr>
              ))}
            </tbody>
          </table>
          <div className="row">
            <button className="primary" onClick={onRestart}>Nouvelle épreuve</button>
            <a className="btn" href="#/quiz/revision">Révision ciblée</a>
            <a className="btn" href="#/examen">Autres examens</a>
          </div>
        </div>
      </div>
      <div className="row exam-review-head">
        <h2>Correction</h2>
        <label className="row"><input type="checkbox" checked={onlyWrong} onChange={(e) => setOnlyWrong(e.target.checked)} /> Erreurs seulement</label>
      </div>
      {questions.map((q, i) => (onlyWrong && s.results[i] ? null : (
        <ExamQuestion key={q.id} q={q} perm={[]} value={answers[q.id]} label={`Question ${i + 1}`} review={{ ok: s.results[i] }} />
      )))}
    </div>
  );
}

function Ep3() {
  const { events, levels } = useProgress();
  const bests = ep3Bests(events, levels);
  const mark = ep3Mark(bests);
  const points = ep3Points(bests);
  const LABEL: Record<string, string> = { L04: 'Tirage au vide', L06: 'Charge en fluide', L07: 'Mise en service et pressostats' };
  return (
    <div className="quiz exam">
      <div className="quiz-bar">{back}<h1>CAP EP3 blanche</h1></div>
      <p className="muted">Jouez les niveaux dans l'ordre en mode <strong>examen</strong>. La note reprend votre meilleur résultat en mode examen
        (à défaut, le meilleur tous modes) et le barème officiel sur 100.</p>
      <ol className="exam-chain">
        {EP3_LEVELS.map((id) => {
          const l = LEVELS.find((x) => x.id === id), b = bests[id];
          return (
            <li key={id} className={`card${l ? '' : ' soon'}`}>
              <span className="quiz-theme-id mono">{id}</span>
              <span className="grow"><strong>{l?.title ?? LABEL[id]}</strong>
                <span className="muted small">{b ? ` meilleur ${b.best}/100${b.examTier ? ' (mode examen)' : ' (tous modes)'}` : ' pas encore joué'}</span></span>
              {l ? <a className="btn primary" href={`#/niveau/${id}/examen`}>Jouer en mode examen</a> : <span className="badge">bientôt</span>}
            </li>
          );
        })}
      </ol>
      <div className="card quiz-summary">
        <div className={`quiz-ring ${mark >= 14 ? 'ok' : mark >= 10 ? 'warn' : 'bad'}`} style={{ '--pct': mark * 5 } as CSSProperties}>
          <span className="mono">{fmt(mark)}</span><small>/ 20</small>
        </div>
        <div className="quiz-summary-body">
          <table className="quiz-skills">
            <thead><tr><th>Barème EP3</th><th>Niveaux</th><th>Points</th></tr></thead>
            <tbody>
              {EP3_PARTS.map((p, i) => (
                <tr key={p.label}><td>{p.label}</td><td className="mono">{p.levels.join(' + ')}</td><td>{fmt(Math.round(points[i] * 10) / 10)} / {p.points}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="muted small">Relevés et documents : moyenne des trois niveaux (les relevés se remplissent dans chaque niveau).</p>
        </div>
      </div>
    </div>
  );
}
