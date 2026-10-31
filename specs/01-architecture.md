# Architecture

## Layout

```
src/
  physics/          pure TS, no React. Unit-tested.
    refrigerants.ts   fluid data + saturation lookup
    circuit.ts        lumped volumes, valves, mass transfer, step(dt)
    cycle.ts          running-system steady state + faults
    *.test.ts
  game/
    engine.ts         level runner: state, actions, rule checks, scoring
    tools/            one React component per tool (manifold, pump, scale, …)
    scenes/           SVG scenes (split, chambre froide, bench)
  levels/           one file per level: scene + initial state + steps + rules + hints
  learn/
    lessons/          markdown-ish content in TS modules
    quiz.tsx, flashcards.tsx, exam.tsx
    content/          questions.ts, cards.ts (tagged by skill item)
  progress/
    store.ts          localStorage read/write, export/import
    Dashboard.tsx
  App.tsx           hash router (#/lab, #/level/L03, #/quiz/…)
```

Routing: plain `location.hash` switch. No router library.

## Dependency rule

`physics` ← `game` ← `levels`; `learn` and `progress` don't import `game`. Everything reports results to `progress/store.ts` through one function: `record(event)`.

## Core types

```ts
type SkillId = string;                 // "A1:4.06", "CAP:UP3.vide"
type Confidence = 'ok' | 'secondary' | 'disputed';

interface ProgressEvent {
  kind: 'quiz' | 'card' | 'level' | 'exam';
  skills: SkillId[];
  score: number;                       // 0..1
  at: number;                          // epoch ms
  detail?: Record<string, unknown>;    // level mistakes, quiz id…
}

interface Progress {
  version: 1;
  events: ProgressEvent[];             // append-only, capped at 5000
  cards: Record<string, { box: 1|2|3|4|5; due: number }>;
  levels: Record<LevelId, { best: number; stars: 0|1|2|3; completed: boolean }>;
}
```

Skill mastery is **derived** from events (exponentially weighted mean of the last N scores per skill), never stored. One source of truth, no sync bugs.

## Persistence
- `localStorage['frigoquest.progress']`, JSON, written on every `record()`.
- Export: download JSON. Import: file input, validated (`version === 1`, arrays/objects shape) before replacing.
- Corrupt storage → keep a copy under `frigoquest.progress.corrupt`, start fresh, show a banner. Never silently drop data.

## Simulation loop
- `requestAnimationFrame` drives the UI; physics steps at fixed `dt = 0.1 s` sim-time with an accumulator.
- Time acceleration ×1 / ×10 / ×60 for slow processes (vacuum, recovery, leak decay). Fixed `dt` keeps results deterministic; at ×60 we run 600 steps/s, which is cheap for ≤ 10 volumes.
- Physics state is a plain object; React re-renders from a snapshot at ≤ 20 Hz.

## Testing
- Vitest on `physics/` and `game/engine.ts`: saturation lookup vs reference table, mass conservation in `circuit.step`, vacuum reaches/plateaus, recovery stops at target, cycle model fault signatures (each fault moves BP/HP/SH/SC in the documented direction), scoring rules.
- Each level file has one smoke test: replay the "perfect run" action list → expect completion with 3 stars; replay a known-bad action → expect the matching mistake id.
- No UI tests in phase 1.

## Non-goals
Accounts, cloud sync, multiplayer, i18n framework (strings are French in code), PWA/service worker (add if offline-on-site use matters).
