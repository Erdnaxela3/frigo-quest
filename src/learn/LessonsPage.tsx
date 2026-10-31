import { useEffect, useRef } from 'react';
import { LESSONS } from './content';
import { SKILL_BY_ID, SKILL_GROUPS } from './skills';
import { renderMarkdown } from './Markdown';
import { WIDGETS } from './widgets';
import { mastery, record, useProgress } from '../progress/store';
import type { Lesson, WidgetId } from './types';
import './lessons.css';

const READ_KEY = 'frigoquest.read';
const DEMO_ID = 'demo-widgets';

// Dev-only preview so the widgets can be checked before lesson content lands.
const DEMO: Lesson = {
  id: DEMO_ID,
  title: 'Démo des widgets (dev)',
  skills: [],
  sections: (Object.keys(WIDGETS) as WidgetId[]).map((w) => ({ title: w, body: `Widget \`${w}\`.`, widget: w })),
};

const all = (): Lesson[] => (import.meta.env.DEV ? [...LESSONS, DEMO] : LESSONS);

function readSet(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(READ_KEY) ?? '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function lessonMastery(l: Lesson, m: Record<string, number>): number | null {
  const seen = l.skills.filter((s) => s in m);
  return seen.length ? seen.reduce((a, s) => a + m[s], 0) / seen.length : null;
}

function MasteryChip({ value }: { value: number | null }) {
  if (value === null) return <span className="badge">Pas commencée</span>;
  const cls = value >= 0.8 ? 'ok' : value >= 0.5 ? 'warn' : 'bad';
  return <span className={`badge ${cls}`} title="Maîtrise moyenne des compétences de la leçon">{Math.round(value * 100)} %</span>;
}

const groupOf = (l: Lesson) => SKILL_BY_ID[l.skills[0]]?.group ?? '';

function LessonList() {
  const { events } = useProgress();
  const m = mastery(events);
  const read = new Set(readSet());
  const lessons = LESSONS;

  if (!lessons.length) {
    return (
      <div className="lessons">
        <h1>Leçons</h1>
        <div className="card empty"><p>Les leçons arrivent bientôt.</p><p className="muted">En attendant, entraînez-vous avec les <a href="#/quiz">quiz</a> et les <a href="#/cartes">flashcards</a>.</p>
          {import.meta.env.DEV && <p><a href={`#/lecons/${DEMO_ID}`}>Démo des widgets (dev)</a></p>}
        </div>
      </div>
    );
  }

  const order = [...Object.keys(SKILL_GROUPS), ''];
  const groups = order
    .map((g) => ({ g, items: lessons.filter((l) => groupOf(l) === g || (g === '' && !(groupOf(l) in SKILL_GROUPS))) }))
    .filter((x) => x.items.length);

  return (
    <div className="lessons">
      <h1>Leçons</h1>
      <p className="muted">Cours courts avec des outils interactifs, chacun suivi d'un quiz de contrôle.</p>
      {groups.map(({ g, items }) => (
        <section key={g || 'other'} className="lesson-group">
          <h2>{SKILL_GROUPS[g] ?? 'Autres'}</h2>
          <div className="grid">
            {items.map((l) => (
              <a key={l.id} href={`#/lecons/${encodeURIComponent(l.id)}`} className="card lesson-card">
                <span className="lesson-card-title">{l.title}</span>
                <span className="row">
                  <MasteryChip value={lessonMastery(l, m)} />
                  {read.has(l.id) && <span className="badge">Lue</span>}
                  {l.level && <span className="badge">Niveau {l.level}</span>}
                </span>
                <span className="muted small">{l.sections.length} sections · {l.skills.map((s) => s.replace(/^A1:|^CAP:/, '')).join(', ')}</span>
              </a>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function LessonView({ lesson }: { lesson: Lesson }) {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    root.current?.closest('.main')?.scrollTo?.(0, 0);
    if (lesson.id === DEMO_ID) return;
    const read = readSet();
    if (read.includes(lesson.id)) return;
    localStorage.setItem(READ_KEY, JSON.stringify([...read, lesson.id]));
    record({ kind: 'quiz', skills: lesson.skills, score: 0.2 });
  }, [lesson]);

  const i = LESSONS.indexOf(lesson);
  const next = i >= 0 ? LESSONS[i + 1] : undefined;

  return (
    <article className="lesson" ref={root}>
      <a href="#/lecons" className="back">← Toutes les leçons</a>
      <h1>{lesson.title}</h1>
      <div className="row skills">
        {lesson.skills.map((s) => (
          <span key={s} className="badge" title={SKILL_BY_ID[s]?.label}>{s}{SKILL_BY_ID[s] && ` · ${SKILL_BY_ID[s].label}`}</span>
        ))}
      </div>
      {lesson.sections.map((s, i) => {
        const W = s.widget && WIDGETS[s.widget];
        return (
          <section key={i} className="lesson-section">
            <h2><span className="sec-num">{i + 1}</span>{s.title}</h2>
            <div className="md">{renderMarkdown(s.body)}</div>
            {W && <W />}
          </section>
        );
      })}
      <footer className="lesson-footer card">
        <div>
          <strong>Vérifiez vos acquis</strong>
          <p className="muted">5 questions sur cette leçon, comptées dans votre progression.</p>
        </div>
        <div className="row">
          <a className="btn primary" href={`#/quiz/lecon/${encodeURIComponent(lesson.id)}`}>Quiz de la leçon</a>
          {lesson.level && <a className="btn" href={`#/niveau/${encodeURIComponent(lesson.level)}`}>S'entraîner ({lesson.level})</a>}
          {next && <a className="btn" href={`#/lecons/${encodeURIComponent(next.id)}`}>Leçon suivante →</a>}
        </div>
      </footer>
    </article>
  );
}

export default function LessonsPage({ id }: { id?: string }) {
  if (!id) return <LessonList />;
  const lesson = all().find((l) => l.id === id);
  if (!lesson) {
    return (
      <div className="card empty">
        <h1>Leçon introuvable</h1>
        <p className="muted">Aucune leçon ne porte l'identifiant « {id} ».</p>
        <a href="#/lecons" className="btn">← Retour aux leçons</a>
      </div>
    );
  }
  return <LessonView key={lesson.id} lesson={lesson} />;
}
