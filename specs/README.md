# FrigoQuest — specs

Browser study app and game to prepare for:

- **CAP IFCA** (Installateur en froid et conditionnement d'air, RNCP 31334)
- **Attestation d'aptitude catégorie A1** (new category, replaces cat. I under the arrêté of 21 Nov 2025 / EU 2024/2215; mandatory from 1 Jan 2027, cat. I holders must do the ad-hoc refresher before 12 Mar 2029)

## Scope decisions

| Requirement | Decision |
|---|---|
| Lessons, exercises, assessments | Organised by référentiel item (A1 items 1.00–12.14, CAP blocs UP1–UP3) so progress maps 1:1 onto the exam |
| Quizzes, flashcards | Flashcards use spaced repetition (Leitner, 5 boxes) |
| Real-world scenario simulations | = the game levels plus a "diagnostic" level with random faults |
| Progress tracker | Local only (browser `localStorage`), one user, export/import JSON for backup. No accounts, no server |
| Gas physics game, "not super realistic" | Lumped model: real saturation curves per refrigerant + ideal gas for superheated vapour/N₂/air + a heuristic running-cycle model. See [02-physics-engine.md](02-physics-engine.md) |
| One level per A1 task | 15 levels + a free sandbox lab (L00). See [levels/](levels/) |
| Point and click | Pick a tool → click a connection point on an SVG scene → turn valves with clicks/drag |
| — | UI language **French** (exam vocabulary is French); specs in English with French domain terms |
| — | Desktop first (mouse), tablet usable; phone only for quizzes/flashcards |

## Recommended stack (decision)

**TypeScript + React + Vite, SVG scenes, Vitest.** Static site, no backend.

- TypeScript: the physics engine and level rules are logic-heavy; types catch unit mix-ups (bar abs vs bar rel, °C vs K).
- React: lots of screens (lessons, quiz, flashcards, dashboard, levels) — a component model pays off. React is the only runtime dependency.
- **SVG** for game scenes rather than canvas/game engine: every valve, port, gauge is a DOM element → click handling, hover hints, accessibility and responsive scaling for free. The simulation is low-frequency (10–20 Hz), no need for a game engine.
- Vite: dev server + static build, deployable to GitHub Pages / any host, works offline once loaded.
- Vitest: unit tests for the physics engine and scoring rules (the parts where bugs teach you wrong things).

Not used: game engines (Phaser/Pixi), state libraries (Redux/Zustand), CSS frameworks, backend. Add when a concrete need appears.

## Spec index

- [00-reglementation.md](00-reglementation.md) — research: A1 framework, CAP IFCA exam, F-Gas III facts (with sources and confidence)
- [01-architecture.md](01-architecture.md) — modules, data model, persistence, testing
- [02-physics-engine.md](02-physics-engine.md) — refrigerant data, circuit model, cycle model, faults
- [03-learning-modules.md](03-learning-modules.md) — lessons, quizzes, flashcards, mock exams, progress tracker
- [04-game-mechanics.md](04-game-mechanics.md) — point & click, tools, scoring, hints, feedback
- [levels/](levels/) — one file per level

## Delivery phases

1. **Core**: physics engine + tests, sandbox lab (L00), levels L01–L05, quiz + flashcards engine with A1 tronc commun content, progress dashboard.
2. **Interventions**: L06–L10 (charge, mise en service, TXV Danfoss, filtre/pump-down, compressor/oil).
3. **Advanced**: L11–L15 (incondensables, diagnostic, R290, paperwork, KVP/KVR), mock exams A1 + CAP EP1, CAP electrical lessons.

## Settled questions

- UI in French.
- CAP EP2 electrical wiring: lessons + quiz only, no game level.
- Main scene: a vertical wooden training board (platine didactique) with an R32 split; the cold room is a secondary scene.
