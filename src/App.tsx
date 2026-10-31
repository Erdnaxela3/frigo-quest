import { useHashRoute } from './ui/useHashRoute';
import { loadError } from './progress/store';
import Home from './pages/Home';
import LessonsPage from './learn/LessonsPage';
import QuizPage from './learn/QuizPage';
import FlashcardsPage from './learn/FlashcardsPage';
import Dashboard from './progress/Dashboard';
import LevelsPage from './game/LevelsPage';
import LevelPage from './game/LevelPage';
import Lab from './levels/Lab';
import DevScene from './game/DevScene';

const NAV: [string, string][] = [
  ['', 'Accueil'],
  ['labo', 'Labo des gaz'],
  ['niveaux', 'Niveaux'],
  ['lecons', 'Leçons'],
  ['quiz', 'Quiz'],
  ['cartes', 'Flashcards'],
  ['progres', 'Progression'],
];

export default function App() {
  const [page = '', ...args] = useHashRoute();
  const view = (() => {
    switch (page) {
      case 'labo': return <Lab />;
      case 'niveaux': return <LevelsPage />;
      case 'niveau': return <LevelPage id={args[0]} />;
      case 'lecons': return <LessonsPage id={args[0]} />;
      case 'quiz': return <QuizPage args={args} />;
      case 'cartes': return <FlashcardsPage />;
      case 'progres': return <Dashboard />;
      case 'dev': return <DevScene />;
      default: return <Home />;
    }
  })();
  const active = page === 'niveau' ? 'niveaux' : page;
  return (
    <div className="app">
      <nav className="nav" aria-label="Navigation principale">
        <div className="brand">❄ FrigoQuest</div>
        {NAV.map(([p, label]) => (
          <a key={p} href={`#/${p}`} className={active === p ? 'active' : ''}>{label}</a>
        ))}
      </nav>
      <main className="main">
        {loadError && <div className="card" role="alert" style={{ borderColor: 'var(--warn)', marginBottom: '1rem' }}>{loadError}</div>}
        {view}
      </main>
    </div>
  );
}
