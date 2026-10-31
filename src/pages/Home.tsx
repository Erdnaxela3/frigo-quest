export default function Home() {
  return (
    <div style={{ maxWidth: 900 }}>
      <h1>FrigoQuest</h1>
      <p className="muted">Préparation au CAP Installateur en froid et conditionnement d'air et à l'attestation d'aptitude catégorie A1 (ex-catégorie I).</p>
      <div className="grid" style={{ marginTop: '1rem' }}>
        <a className="card" href="#/labo"><h3>Labo des gaz</h3><p className="muted">Pression, température, saturation : manipulez les fluides.</p></a>
        <a className="card" href="#/niveaux"><h3>Niveaux</h3><p className="muted">Interventions sur la platine R32 : manifold, vide, récupération…</p></a>
        <a className="card" href="#/lecons"><h3>Leçons</h3><p className="muted">Le référentiel A1 et CAP, point par point.</p></a>
        <a className="card" href="#/quiz"><h3>Quiz</h3><p className="muted">Questions par thème et révision ciblée.</p></a>
        <a className="card" href="#/cartes"><h3>Flashcards</h3><p className="muted">Répétition espacée.</p></a>
        <a className="card" href="#/progres"><h3>Progression</h3><p className="muted">Compétences, points faibles, jalons.</p></a>
      </div>
    </div>
  );
}
