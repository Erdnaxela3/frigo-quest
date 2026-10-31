import { useState, type CSSProperties, type KeyboardEvent } from 'react';
import type { Question } from './types';
import { SKILL_BY_ID, SKILL_GROUPS } from './skills';
import { GENERATORS, LESSONS, QUESTIONS } from './content';
import { grade, inGroup, parseNumber, pickForSkills, pickTheme, pickWeakest, shuffle } from './quiz';
import { mastery, record } from '../progress/store';
import { go } from '../ui/useHashRoute';
import './quiz.css';

const N = 10;
const rng = Math.random;

interface Mode { title: string; build?: () => Question[]; gen?: () => Question; error?: string }

function resolve([mode, id]: string[]): Mode {
  switch (mode) {
    case 'theme':
      return SKILL_GROUPS[id]
        ? { title: `Thème ${id} — ${SKILL_GROUPS[id]}`, build: () => pickTheme(id, N, rng) }
        : { title: 'Thème inconnu', error: `Le thème « ${id ?? ''} » n'existe pas.` };
    case 'revision':
      return { title: 'Révision ciblée', build: () => pickWeakest(N, mastery(), rng) };
    case 'lecon': {
      const lesson = LESSONS.find((l) => l.id === id);
      return lesson
        ? { title: `Quiz — ${lesson.title}`, build: () => pickForSkills(lesson.skills, N, rng) }
        : { title: 'Leçon introuvable', error: `Aucune leçon « ${id ?? ''} ».` };
    }
    case 'generateur': {
      const gens = id ? GENERATORS.filter((g) => g.id === id) : GENERATORS;
      if (!gens.length) return { title: 'Générateur', error: id ? `Générateur « ${id} » introuvable.` : 'Aucun générateur disponible pour le moment.' };
      return {
        title: gens.length === 1 ? `Générateur — ${gens[0].label}` : 'Générateur — mélange',
        gen: () => gens[Math.floor(rng() * gens.length)].make(rng),
      };
    }
  }
  return { title: 'Quiz' };
}

export default function QuizPage({ args }: { args: string[] }) {
  const [nonce, setNonce] = useState(0);
  if (!args.length) return <ModePicker />;
  const mode = resolve(args);
  const restart = () => setNonce((n) => n + 1);
  const revision = () => (args[0] === 'revision' ? restart() : go('/quiz/revision'));
  return <Session key={`${args.join('/')}#${nonce}`} mode={mode} onRestart={restart} onRevision={revision} />;
}

function ModePicker() {
  const groups = Object.entries(SKILL_GROUPS).map(([id, label]) => ({
    id, label,
    count: QUESTIONS.filter((q) => inGroup(id)(q.skills)).length,
    gens: GENERATORS.some((g) => inGroup(id)(g.skills)),
  }));
  return (
    <div className="quiz">
      <header className="quiz-head">
        <h1>Quiz</h1>
        <p className="muted">{QUESTIONS.length} questions · {GENERATORS.length} générateurs · 10 questions par série, correction immédiate.</p>
      </header>

      <div className="quiz-modes">
        <a className="quiz-mode card accent" href="#/quiz/revision">
          <span className="quiz-mode-kicker">Recommandé</span>
          <strong>Révision ciblée</strong>
          <span className="muted">10 questions sur vos 5 compétences les plus faibles.</span>
        </a>
        <div className="quiz-mode card">
          <span className="quiz-mode-kicker">Entraînement illimité</span>
          <strong>Générateur</strong>
          {GENERATORS.length ? (
            <div className="row quiz-gens">
              <a className="btn primary" href="#/quiz/generateur">Mélange</a>
              {GENERATORS.map((g) => <a key={g.id} className="btn" href={`#/quiz/generateur/${encodeURIComponent(g.id)}`}>{g.label}</a>)}
            </div>
          ) : <span className="muted">Aucun générateur pour le moment.</span>}
        </div>
      </div>

      <h2>Par thème</h2>
      <div className="quiz-themes">
        {groups.map((g) => (
          <a key={g.id} href={`#/quiz/theme/${encodeURIComponent(g.id)}`} className={`quiz-theme card${g.count || g.gens ? '' : ' empty'}`}>
            <span className="quiz-theme-id mono">{g.id}</span>
            <span className="quiz-theme-label">{g.label}</span>
            <span className="quiz-theme-count">
              {g.count} question{g.count > 1 ? 's' : ''}{g.gens && <span className="badge">+ générateur</span>}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

interface Result { q: Question; ok: boolean }

function Session({ mode, onRestart, onRevision }: { mode: Mode; onRestart: () => void; onRevision: () => void }) {
  const [questions, setQuestions] = useState<Question[]>(() => mode.build?.() ?? (mode.gen ? [mode.gen()] : []));
  const [results, setResults] = useState<Result[]>([]);
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState(false);

  const back = <a className="btn" href="#/quiz">← Modes</a>;
  if (mode.error || !questions.length) {
    return (
      <div className="quiz">
        <div className="quiz-bar">{back}<h1>{mode.title}</h1></div>
        <div className="card quiz-empty">
          <p>{mode.error ?? 'Pas encore de questions ici — le contenu arrive bientôt.'}</p>
          <p className="muted">Essayez un autre thème ou le générateur en attendant.</p>
        </div>
      </div>
    );
  }

  if (done || idx >= questions.length) return <Summary title={mode.title} results={results} onRestart={onRestart} onRevision={onRevision} />;

  const q = questions[idx];
  const answered = results.length > idx;
  const next = () => {
    if (mode.gen) setQuestions((qs) => [...qs, mode.gen!()]);
    setIdx((i) => i + 1);
  };
  const score = results.filter((r) => r.ok).length;

  return (
    <div className="quiz">
      <div className="quiz-bar">
        {back}
        <h1>{mode.title}</h1>
        <span className="quiz-score mono" aria-label="Score">{score} / {results.length}</span>
        {mode.gen && results.length > 0 && <button onClick={() => setDone(true)}>Terminer</button>}
      </div>
      {!mode.gen && (
        <div className="quiz-progress" role="progressbar" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={idx + (answered ? 1 : 0)}>
          {questions.map((_, i) => (
            <span key={i} className={i < results.length ? (results[i].ok ? 'ok' : 'bad') : i === idx ? 'cur' : ''} />
          ))}
        </div>
      )}
      <QuestionView
        key={idx}
        q={q}
        label={mode.gen ? `Question ${idx + 1}` : `Question ${idx + 1} / ${questions.length}`}
        last={!mode.gen && idx === questions.length - 1}
        onResult={(ok) => {
          record({ kind: 'quiz', skills: q.skills, score: ok ? 1 : 0, detail: { id: q.id } });
          setResults((r) => [...r, { q, ok }]);
        }}
        onNext={next}
      />
    </div>
  );
}

function QuestionView({ q, label, last, onResult, onNext }: {
  q: Question; label: string; last: boolean; onResult: (ok: boolean) => void; onNext: () => void;
}) {
  // Display order for choices; grading always uses original indices.
  const [perm] = useState(() => {
    const ids = 'choices' in q ? q.choices.map((_, i) => i) : [];
    if (q.type !== 'order' || ids.length < 2) return shuffle(ids);
    let p = shuffle(ids);
    while (p.every((x, i) => x === i)) p = shuffle(ids);
    return p;
  });
  const [picked, setPicked] = useState<number[]>([]);
  const [order, setOrder] = useState(perm);
  const [text, setText] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [ok, setOk] = useState<boolean | null>(null);
  const locked = ok !== null;

  const answer = (): unknown => {
    switch (q.type) {
      case 'single': return picked[0];
      case 'multi': return picked;
      case 'numeric': return text;
      case 'order': return order;
    }
  };
  const canSubmit = q.type === 'numeric' ? text.trim() !== '' : q.type === 'order' || picked.length > 0;
  const submit = () => {
    if (locked || !canSubmit) return;
    if (q.type === 'numeric' && parseNumber(text) === null) { setInvalid(true); return; }
    const r = grade(q, answer());
    setOk(r);
    onResult(r);
  };
  const toggle = (i: number) => {
    if (locked) return;
    if (q.type === 'single') setPicked([i]);
    else setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));
  };
  const move = (pos: number, d: -1 | 1) => setOrder((o) => {
    const n = [...o];
    [n[pos], n[pos + d]] = [n[pos + d], n[pos]];
    return n;
  });

  const choiceState = (i: number) => {
    if (!locked) return picked.includes(i) ? 'picked' : '';
    const right = q.type === 'single' ? q.answer === i : q.type === 'multi' && q.answer.includes(i);
    if (right) return 'right';
    return picked.includes(i) ? 'wrong' : 'dim';
  };

  return (
    <article className="card quiz-q">
      <div className="row quiz-q-meta">
        <span className="muted">{label}</span>
        {q.skills.map((s) => <span key={s} className="badge" title={SKILL_BY_ID[s]?.label}>{s}</span>)}
        {q.confidence !== 'ok' && (
          <span className="badge warn" title={q.confidence === 'disputed' ? 'Point débattu selon les sources' : 'Source secondaire, à confirmer'}>⚠ à vérifier</span>
        )}
      </div>
      <p className="quiz-prompt">{q.prompt}</p>

      {(q.type === 'single' || q.type === 'multi') && (
        <>
          {q.type === 'multi' && <p className="muted quiz-hint">Plusieurs réponses possibles.</p>}
          <div className="quiz-choices" role={q.type === 'single' ? 'radiogroup' : 'group'}>
            {perm.map((i) => (
              <button
                key={i}
                role={q.type === 'single' ? 'radio' : 'checkbox'}
                aria-checked={picked.includes(i)}
                className={`quiz-choice ${choiceState(i)}`}
                onClick={() => toggle(i)}
                disabled={locked}
              >
                <span className={`quiz-tick ${q.type}`} aria-hidden />
                {q.choices[i]}
              </button>
            ))}
          </div>
        </>
      )}

      {q.type === 'numeric' && (
        <div className="quiz-numeric">
          <input
            aria-label="Votre réponse"
            inputMode="decimal"
            autoFocus
            value={text}
            disabled={locked}
            className={invalid ? 'invalid' : ''}
            onChange={(e) => { setText(e.target.value); setInvalid(false); }}
            onKeyDown={(e: KeyboardEvent) => { if (e.key === 'Enter') submit(); }}
          />
          {q.unit && <span className="quiz-unit">{q.unit}</span>}
          {invalid && <span className="quiz-invalid" role="alert">Nombre invalide (ex. 8,1)</span>}
        </div>
      )}

      {q.type === 'order' && (
        <ol className="quiz-order">
          {order.map((i, pos) => (
            <li key={i} className={locked ? (i === pos ? 'right' : 'wrong') : ''}>
              <span className="quiz-order-text">{q.choices[i]}</span>
              {!locked && (
                <span className="quiz-order-btns">
                  <button aria-label={`Monter « ${q.choices[i]} »`} disabled={pos === 0} onClick={() => move(pos, -1)}>↑</button>
                  <button aria-label={`Descendre « ${q.choices[i]} »`} disabled={pos === order.length - 1} onClick={() => move(pos, 1)}>↓</button>
                </span>
              )}
            </li>
          ))}
        </ol>
      )}

      {!locked ? (
        <div className="row quiz-actions">
          <button className="primary" onClick={submit} disabled={!canSubmit}>Valider</button>
        </div>
      ) : (
        <div className={`quiz-feedback ${ok ? 'ok' : 'bad'}`} role="status">
          <strong>{ok ? '✓ Bonne réponse' : '✗ Mauvaise réponse'}</strong>
          {!ok && q.type === 'numeric' && (
            <p className="mono">Attendu : {fmt(q.answer.value)} ± {fmt(q.answer.tol)} {q.unit}</p>
          )}
          {!ok && q.type === 'order' && (
            <ol className="quiz-correct-order">{q.choices.map((c, i) => <li key={i}>{c}</li>)}</ol>
          )}
          <p>{q.explain}</p>
          <button className="primary" autoFocus onClick={onNext}>{last ? 'Voir le bilan' : 'Question suivante →'}</button>
        </div>
      )}
    </article>
  );
}

const fmt = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 3 });

function Summary({ title, results, onRestart, onRevision }: { title: string; results: Result[]; onRestart: () => void; onRevision: () => void }) {
  const score = results.filter((r) => r.ok).length;
  const pct = results.length ? Math.round((100 * score) / results.length) : 0;
  const per = new Map<string, { ok: number; n: number }>();
  for (const r of results) for (const s of r.q.skills) {
    const e = per.get(s) ?? { ok: 0, n: 0 };
    per.set(s, { ok: e.ok + Number(r.ok), n: e.n + 1 });
  }
  const rows = [...per].sort((a, b) => a[1].ok / a[1].n - b[1].ok / b[1].n);
  const tone = pct >= 80 ? 'ok' : pct >= 50 ? 'warn' : 'bad';
  return (
    <div className="quiz">
      <div className="quiz-bar"><a className="btn" href="#/quiz">← Modes</a><h1>{title}</h1></div>
      <div className="card quiz-summary">
        <div className={`quiz-ring ${tone}`} style={{ '--pct': pct } as CSSProperties}>
          <span className="mono">{score}/{results.length}</span>
          <small>{pct} %</small>
        </div>
        <div className="quiz-summary-body">
          <h2>{pct >= 80 ? 'Excellent !' : pct >= 50 ? 'Pas mal, on continue.' : 'À retravailler.'}</h2>
          <table className="quiz-skills">
            <thead><tr><th>Compétence</th><th>Résultat</th></tr></thead>
            <tbody>
              {rows.map(([s, { ok, n }]) => (
                <tr key={s}>
                  <td><span className="mono">{s}</span> <span className="muted">{SKILL_BY_ID[s]?.label ?? ''}</span></td>
                  <td className={ok === n ? 'ok' : ok === 0 ? 'bad' : 'warn'}>{ok} / {n}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="row">
            <button className="primary" onClick={onRestart}>Recommencer</button>
            <button onClick={onRevision}>Révision ciblée</button>
            <a className="btn" href="#/quiz">Autres modes</a>
          </div>
        </div>
      </div>
    </div>
  );
}
