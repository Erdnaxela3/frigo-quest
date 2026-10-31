# Game mechanics

## Screen layout

```
┌───────────────────────────────────────────────┬────────────────┐
│ SVG scene (installation)                      │ Ordre de       │
│  click ports / valves / components            │ mission        │
│                                               │ + objectifs ✓  │
│                                               ├────────────────┤
│                                               │ Instruments    │
│                                               │ (gauges live)  │
├───────────────────────────────────────────────┴────────────────┤
│ Caisse à outils: [manifold][pompe][station][balance][N₂][détect]│
│ Time: ▶ ×1 ×10 ×60   Indice (−)   Journal                     │
└────────────────────────────────────────────────────────────────┘
```

## Interaction model
1. **Pick a tool** in the toolbox → cursor carries it.
2. **Click a target** (port, valve, component). Valid targets highlight on hover; an invalid click gives immediate feedback ("Ce raccord est côté HP, votre flexible bleu va côté BP").
3. **Manipulate**: click a valve to open/close; drag (or scroll) for progressive opening and for setting dials (pressostat, regulator, TXV spindle in ¼ turns).
4. **Inspect**: hover a component → name + role tooltip; click with the thermometer/clamp meter to measure.
5. **Hoses** are first-class: blue (BP), red (HP), yellow (service). Each end is connected separately. A hose has a Schrader depressor end and a manifold end.

All actions go through one `dispatch(action)` → engine validates against level rules → mutates state → logs to the **journal** (shown at the end as the intervention report).

## Tools

| Tool | Actions |
|---|---|
| Manifold 2 or 4 voies (BP/HP gauges with temp scales per fluid, vacuum gauge on 4-way) | connect hoses, open/close BP/HP/vac/charge valves |
| Flexibles (bleu/rouge/jaune), with optional ball valves (low-loss) | connect/disconnect each end |
| Pompe à vide + vacuomètre électronique | on/off, isolate valve |
| Station de récupération | inlet/outlet, on/off, mode liquid/vapour, cutoff pressure |
| Bouteille de récupération (vide, tare marquée, capacité) | valves liquide/gaz, place on scale |
| Bouteille de fluide neuf (avec/sans tube plongeur) | valve, flip upside down |
| Balance électronique | tare, read |
| Azote + détendeur | setpoint, open/close |
| Détecteur électronique / produit moussant / lampe UV | sweep a component → reading |
| Thermomètre à contact / pince ampèremétrique / multimètre | measure |
| Clés (vanne de service, chapeau de vanne), démonte-obus | rotate valve to back/mid/front seat, remove Schrader core |
| Chalumeau + baguette + azote balayage (L08–L10) | braze joint |
| Fiche d'intervention (Cerfa 15497) | fill form |
| EPI (lunettes, gants), détecteur de gaz portable (R290) | equip |

## Level structure (data)

```ts
interface Level {
  id: LevelId; title: string; skills: SkillId[];
  scene: SceneId; fluid: FluidId; initial: CircuitState;
  briefing: string;                 // ordre de mission
  objectives: Objective[];          // shown as a checklist, each a predicate on state/journal
  rules: Rule[];                    // mistakes: predicate on (action, state) → Mistake
  hints: Hint[];                    // contextual, ordered; triggered by objective + time stuck
  challenges: Challenge[];          // variants: same scene, different parameters/faults
  perfectRun: Action[];             // for tests
}
```

Each level has **3 challenges** of rising difficulty: (1) guided (checklist visible, hints free), (2) standard (checklist visible, hints cost points), (3) exam (no checklist, no hints, timer, random parameter variations).

## Scoring
Start at 100:
- Mistake: −5 (minor), −15 (major), −40 (critical, e.g. venting refrigerant, brazing on a pressurised circuit, vacuum pump on a charged circuit, filling a cylinder > 80 %, open flame near R290). A critical mistake in exam mode = failed.
- Emissions: −1 per 5 g vented (beyond the 5 g allowance per disconnect).
- Hint: −0 / −5 / not available depending on challenge tier.
- Time: no penalty except exam tier (over time → −10).
- Stars: ★ completed, ★★ ≥ 70, ★★★ ≥ 90 and no major mistakes.

## Feedback
- **Immediate** on mistakes: red toast, what went wrong + why (1–2 sentences, referencing the skill item), and the physical consequence shown in the sim (pressure spike, frost, hiss + emission counter).
- **Undo**: guided tier allows undo of the last action (physics snapshot); higher tiers don't.
- **Debrief** at the end: score breakdown, journal replay with mistakes highlighted, linked lesson for each mistake, skill events recorded.

## Hints
Three levels per objective: nudge ("Que faut-il faire avant d'ouvrir le circuit ?") → specific ("Raccordez le flexible jaune à la station de récupération") → show (highlight the exact target). Offered automatically after 60 s without progress in guided tier.

## Visual language
- Gauges are drawn as real analog manifold gauges (needle + bar scale + fluid temperature arcs), with a digital readout toggle.
- Pipes colour by state: liquid blue, vapour light, two-phase striped; temperature tint optional ("vision thermique").
- Cylinders show liquid level (cutaway toggle) — makes 80 % fill rule and liquid/vapour charging visible.
- Frost appears on cold surfaces (< 0 °C), sweat on < dew point.
