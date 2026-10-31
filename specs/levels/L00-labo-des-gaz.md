# L00 — Labo des gaz (sandbox)

**Goal:** build intuition for how refrigerants behave before touching an installation. No score; unlocks "experiments" achievements tracked in progress.

**Skills:** 1.01, 1.02, 1.03, 1.07, 5.02, 5.05

## Scene
Bench with a transparent "cutaway" vessel (adjustable 1–20 L) on a hot/cold plate (−40 … +70 °C), a gauge (bar rel + bar abs + Tsat scale), a scale under it, a second vessel connectable through a valve, nitrogen bottle, vacuum pump.

Controls: fluid picker, mass injected, plate temperature, volume, valve between vessels, N₂ added, view toggles (log P–T chart, live P–T point on the saturation curve).

## Experiments (each unlocks with a short explanation)

| # | Experiment | What the learner sees | Lesson |
|---|---|---|---|
| E1 | Same temperature, more refrigerant | While liquid remains, **P stays at Psat(T)** regardless of mass. Pressure tells you the temperature, not the quantity | "Pressure ≠ charge" — why you charge by weight |
| E2 | Heat a two-phase vessel | P follows the saturation curve; point slides along the curve on the P–T chart | Tables de saturation |
| E3 | Small mass, heat it | Once all liquid evaporates, P leaves the curve and rises slowly (ideal gas) — **superheated** region | Surchauffe |
| E4 | Overfilled vessel (> 80 %) + heat | Liquid expands, vessel goes hydraulically full, P skyrockets → burst warning | Règle des 80 % sur les bouteilles |
| E5 | Compare fluids at 20 °C | R744 57 bar, R410A/R32 ~14 bar, R290 ~8 bar, R134a/R1234yf ~5–6 bar | Niveaux de pression, choix des outils (PS) |
| E6 | Zeotropic blend (R407C): draw vapour from the top | Remaining liquid composition shifts (shown as a colour bar), dew/bubble lines differ (glide) | Charger en phase liquide |
| E7 | Add N₂ to a vessel with refrigerant | P = Psat + P_N2 → gauge reads higher than the Tsat scale says | Incondensables (L11) |
| E8 | Vacuum on a vessel with a few drops of water | Pressure falls fast then **plateaus at ~23 mbar** (20 °C) until the water boils off; cooling the vessel makes it worse | Humidité et tirage au vide (L04) |
| E9 | Open the valve to an empty vessel | Refrigerant flashes, source vessel cools (frost below 0 °C), pressure recovers as plate reheats | Charge vapeur lente, réchauffer la bouteille |
| E10 | R744 above 31 °C | Liquid level disappears — supercritical, no saturation | CO₂ transcritique (question obligatoire A1) |

## Physics
Static circuit model (02-physics-engine §2) with 1–2 volumes. Blend fractionation for E6 is a separate simple model: liquid & vapour composition via a fixed relative volatility per component pair; only used here and as a flag in L06.

## Done when
No completion requirement. Each experiment shows a 2-line takeaway and a "Quiz this" button (3 numeric questions using the same fluid/temperatures).
