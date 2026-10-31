import { useEffect, useRef, useState } from 'react';
import type { Flashcard } from './types';
import { CARDS } from './content';
import { dueCards, nextState } from './leitner';
import { shuffle } from './quiz';
import { getProgress, record, setCard, useProgress } from '../progress/store';
import './quiz.css';

const DECKS: Record<Flashcard['deck'], string> = {
  fluides: 'Fluides',
  composants: 'Composants',
  reglementation: 'Réglementation',
  danfoss: 'Danfoss',
  procedures: 'Procédures',
  unites: 'Unités',
  electricite: 'Électricité',
  securite: 'Sécurité',
};

interface Run { free: boolean; queue: Flashcard[]; pos: number; knew: number; missed: number }

export default function FlashcardsPage() {
  const progress = useProgress();
  const [deck, setDeck] = useState<Flashcard['deck'] | null>(null);
  const [run, setRun] = useState<Run | null>(null);

  if (!CARDS.length) {
    return (
      <div className="quiz">
        <h1>Flashcards</h1>
        <div className="card quiz-empty"><p>Aucune carte pour l'instant — le paquet est en préparation.</p></div>
      </div>
    );
  }

  const cards = deck ? CARDS.filter((c) => c.deck === deck) : CARDS;
  const due = dueCards(cards, progress.cards, Date.now(), Infinity);
  const decks = (Object.keys(DECKS) as Flashcard['deck'][]).filter((d) => CARDS.some((c) => c.deck === d));

  if (run) return <Session run={run} setRun={setRun} />;

  return (
    <div className="quiz">
      <header className="quiz-head">
        <h1>Flashcards</h1>
        <p className="muted">Répétition espacée (Leitner, 5 boîtes : 0, 1, 3, 7, 21 jours). Session de 30 cartes maximum.</p>
      </header>
      <div className="fc-chips" role="group" aria-label="Paquets">
        <button className={`fc-chip${deck === null ? ' on' : ''}`} aria-pressed={deck === null} onClick={() => setDeck(null)}>
          Tous <span className="mono">{CARDS.length}</span>
        </button>
        {decks.map((d) => (
          <button key={d} className={`fc-chip${deck === d ? ' on' : ''}`} aria-pressed={deck === d} onClick={() => setDeck(d)}>
            {DECKS[d]} <span className="mono">{CARDS.filter((c) => c.deck === d).length}</span>
          </button>
        ))}
      </div>
      <div className="card fc-home">
        <div className="fc-due">
          <span className="fc-due-n mono">{due.length}</span>
          <span>carte{due.length > 1 ? 's' : ''} à revoir aujourd'hui</span>
        </div>
        <div className="row">
          <button className="primary" disabled={!due.length} onClick={() => setRun({ free: false, queue: due.slice(0, 30), pos: 0, knew: 0, missed: 0 })}>
            {due.length ? `Réviser (${Math.min(30, due.length)})` : 'Rien à revoir aujourd\'hui'}
          </button>
          <button onClick={() => setRun({ free: true, queue: shuffle(cards), pos: 0, knew: 0, missed: 0 })}>
            Toutes les cartes
          </button>
        </div>
        <p className="muted fc-note">« Toutes les cartes » : entraînement libre, sans modifier le planning de révision.</p>
      </div>
    </div>
  );
}

function Session({ run, setRun }: { run: Run; setRun: (r: Run | null) => void }) {
  const [flipped, setFlipped] = useState(false);
  const card = run.queue[run.pos];
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => cardRef.current?.focus(), [run.pos]);

  const answer = (knew: boolean) => {
    if (!card || !flipped) return;
    record({ kind: 'card', skills: card.skills, score: knew ? 1 : 0, detail: { id: card.id, free: run.free } });
    if (!run.free) setCard(card.id, nextState(getProgress().cards[card.id], knew, Date.now()));
    // Box 1 is due again today: a missed card comes back at the end of the session.
    const queue = !knew && !run.free ? [...run.queue, card] : run.queue;
    setRun({ ...run, queue, pos: run.pos + 1, knew: run.knew + Number(knew), missed: run.missed + Number(!knew) });
    setFlipped(false);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === ' ' && e.target instanceof HTMLButtonElement) return; // native click
      if (e.key === ' ') { e.preventDefault(); setFlipped((f) => !f); }
      else if (e.key === '1') answer(true);
      else if (e.key === '2') answer(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const quit = <button onClick={() => setRun(null)}>← Paquets</button>;

  if (!card) {
    return (
      <div className="quiz">
        <div className="quiz-bar">{quit}<h1>Session terminée</h1></div>
        <div className="card quiz-empty">
          <p><strong className="fc-ok">{run.knew}</strong> je savais · <strong className="fc-bad">{run.missed}</strong> pas su</p>
          <button className="primary" onClick={() => setRun(null)}>Retour aux paquets</button>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz">
      <div className="quiz-bar">
        {quit}
        <h1>{run.free ? 'Entraînement libre' : 'Révision du jour'}</h1>
        <span className="quiz-score mono">{run.pos + 1} / {run.queue.length}</span>
      </div>
      <div className="fc-scene">
        <div
          ref={cardRef}
          className={`fc-card${flipped ? ' flipped' : ''}`}
          role="button"
          tabIndex={0}
          aria-label={flipped ? 'Carte retournée (verso). Espace pour revoir le recto' : 'Retourner la carte'}
          onClick={() => setFlipped((f) => !f)}
          onKeyDown={(e) => { if (e.key === 'Enter') setFlipped((f) => !f); }}
        >
          <div className="fc-face fc-front" aria-hidden={flipped}>
            <div className="row fc-tags">
              <span className="badge">{DECKS[card.deck]}</span>
              {card.confidence !== 'ok' && <span className="badge warn">⚠ à vérifier</span>}
            </div>
            <p>{card.front}</p>
            <span className="muted fc-hint">Cliquer ou Espace pour retourner</span>
          </div>
          <div className="fc-face fc-back" aria-hidden={!flipped}>
            <p>{card.back}</p>
          </div>
        </div>
      </div>
      <div className="row fc-answers">
        <button className="fc-btn-bad" disabled={!flipped} onClick={() => answer(false)}>Pas su <kbd>2</kbd></button>
        <button className="fc-btn-ok" disabled={!flipped} onClick={() => answer(true)}>Je savais <kbd>1</kbd></button>
      </div>
    </div>
  );
}
