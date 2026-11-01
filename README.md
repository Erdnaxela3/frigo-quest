# FrigoQuest

A French-language study app and game for refrigeration technicians preparing the
**CAP IFCA** (Installateur en froid et conditionnement d'air) and the
**attestation d'aptitude A1** (the F-Gas III category that replaces cat. I).

- **Game:** point-and-click interventions on a vertical training board (platine
  didactique) with an R32 split. A lumped gas-physics model drives the gauges:
  saturation curves, N₂ and air, vacuum, recovery, leaks, and a running cycle with
  faults. There are 15 levels (leak checks, nitrogen test, vacuum, recovery, charge,
  pressostats, Danfoss TXV, pump-down, burnt compressor, R290…), each in a
  guided, standard and exam tier.
- **Gas lab and free workshop:** sandbox experiments and an open board with
  fault injection.
- **Learning:** lessons with interactive widgets, quizzes, spaced-repetition
  flashcards, A1 and CAP mock exams.
- **Progress:** stored locally in the browser (`localStorage`), with export and import.

Static site, no backend. React and TypeScript with SVG scenes.

## Run

```sh
npm install
npm run dev        # dev server
npm test           # vitest
npm run build      # typecheck + static build in dist/
```

## Docs

- [`specs/`](specs/): regulation research, architecture, physics engine, learning
  modules, game mechanics, one spec per level
- [`docs/level-api.md`](docs/level-api.md): how to write a level

## Disclaimer

The simulation is a teaching approximation, not an engineering tool. The
regulation summary in `specs/00-reglementation.md` gives its sources and marks
uncertain points. Check the official texts before relying on it.
