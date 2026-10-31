# Learning modules

All content is tagged with skill ids (`A1:x.yy`, `CAP:UP1|UP2|UP3.<topic>`) and a `confidence` (see 00-reglementation.md). Disputed facts show a small "⚠ à vérifier" badge to the learner.

## 1. Lessons

One lesson per skill group (A1 groups 1–12, CAP UP1–UP3). Format: short sections of text + inline interactive widgets reusing game components:

| Widget | Used in |
|---|---|
| P/T slider (pick fluid, drag temperature, read Psat bubble/dew) | 1.02, 1.03 |
| Mini log p-h diagram with the 4 cycle points draggable | 1.02, 1.04 |
| t CO₂e calculator (kg × GWP) → leak check frequency | 2.02, 4.02 |
| Service valve 3-position animation | 6.04 |
| Pressostat dial (cut-in / diff) | 6.03, 9.06 |
| R290 charge limit calculator (room volume, height, LFL) | 1.08, 12.03 |

Each lesson ends with a 5-question check quiz and a "Practise in the game" link to the matching level.

Lesson list (phase 1 = ★):
- ★ Réglementation F-Gas III et nouvelles attestations (1.00, 2.01, 2.02)
- ★ Unités et thermodynamique de base, mélanges zéotropes (1.01, 1.02)
- ★ Tables de saturation, surchauffe, sous-refroidissement (1.03)
- ★ Le circuit frigorifique et ses composants (1.04, 1.05)
- ★ Contrôle d'étanchéité : méthodes et fréquences (groupe 4)
- ★ Tirage au vide et tests de pression (groupe 3)
- ★ Récupération, bouteilles, traçabilité, déchets (groupe 5)
- Compresseurs, condenseurs, évaporateurs, détendeurs (groupes 6–9)
- Brasage et supportage (groupe 10)
- Fluides alternatifs : HC, CO₂, NH₃, HFO (1.06–1.08, groupe 11)
- Hydrocarbures : sécurité et mise en œuvre (groupe 12)
- CAP UP1 : lire un dossier technique, quantitatifs, schémas
- CAP UP2 : façonnage cuivre, schéma électrique de commande (contacteurs, relais thermiques, transfo 24 V)
- CAP UP3 : mise en service, relevés, fiches

## 2. Quizzes

Question types: single choice, multiple choice, numeric with tolerance (e.g. "Psat R32 à 5 °C ? ±0.3 bar"), ordering (sequence of a procedure), image hotspot (click the right port on an SVG).

```ts
interface Question {
  id: string;
  skills: SkillId[];
  type: 'single'|'multi'|'numeric'|'order'|'hotspot';
  prompt: string;
  choices?: string[]; answer: number | number[] | { value: number; tol: number } | string;
  explain: string;            // always shown after answering
  confidence: Confidence;
  generator?: (rng) => Question;  // parametrised numeric questions (random fluid/temperature)
}
```

Modes:
- **Thème**: pick a skill group, 10 questions.
- **Révision ciblée**: 10 questions drawn from the 5 weakest skills (from progress).
- **Générateur**: infinite parametrised numeric questions (Psat, SH/SC, t CO₂e, frequency, R290 charge limit) — never run out of practice.

Phase 1 content target: **≥ 150 questions** covering all A1 tronc commun items + group 12, each with an explanation.

## 3. Flashcards

Front / back, tagged by skill. Leitner 5 boxes: intervals 0, 1, 3, 7, 21 days. "Je savais" → box +1, "Pas su" → box 1. Daily session = due cards, max 30.

Phase 1 decks: fluids (GWP, safety class, glide, typical use), components (photo/SVG ↔ name/role), regulation dates, Danfoss part codes (TE2, KP1, KP5, KVP, KVR, DML, SGN), procedure steps, units & conversions. Target **≥ 120 cards**.

## 4. Mock exams

- **A1 théorie blanche**: 1 h 15 timed, mixes tronc commun + A1 items following the exam rules (≥ 1 CO₂/NH₃ question, ≥ 1 energy efficiency question, one random group among 6/7/8/9). Pass threshold default 70 % (configurable — real threshold not published in what we read).
- **A1 pratique blanche**: chains L01 → L03 → L04 → L05 → L06 with one random group-6–9 level, timed to 3 h sim-time, no hints.
- **CAP EP1 blanche** (phase 3): written case study, 3 h — dossier technique reading questions.
- **CAP EP3 blanche**: L04 + L06 + L07 + paperwork, graded with the official barème weights (15/20/15/30/20).

## 5. Progress tracker

Dashboard:
- **Skill map**: grid of all A1 items + CAP blocs, colour = mastery (grey not seen, red < 50 %, amber < 80 %, green ≥ 80 %). Click → lesson / quiz / level for that item.
- **Levels**: stars per level, best score, most frequent mistakes.
- **Milestones**: "Tronc commun théorie ≥ 80 %", "Toutes les procédures A1 réussies sans indice", "Examen blanc A1 réussi", "EP3 blanche ≥ 14/20".
- **Weak spots**: top 5 weakest skills + top 5 recurring game mistakes, each with a "s'entraîner" button.
- **Streak & due cards** count.
- Countdown to a target exam date the user sets (optional).

Mastery per skill = EWMA (α = 0.3) of scores from all events tagged with it; level events weigh ×2 for P items, quiz events ×2 for T items.
