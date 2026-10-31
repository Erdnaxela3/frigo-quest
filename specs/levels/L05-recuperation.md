# L05 — Récupération du fluide

**Mission:** "Le compresseur est HS. Récupérez la totalité de la charge de R449A avant intervention."

**Skills:** A1 5.02, 5.03, 5.07, 5.08 · CAP UP3 (manipuler fluide et huiles)

## Setup
Scene **CF** stopped, 6 kg R449A. Bench: recovery station, 3 cylinders: (a) R449A recovery cylinder 12 L, tare 7.8 kg, test date valid; (b) R32 recovery cylinder with 2 kg inside; (c) disposable new-refrigerant cylinder (non-refillable). Scale.

## Correct procedure
1. Identify fluid (nameplate) and choose cylinder **(a)**: dedicated to the fluid, refillable, labelled, test date valid.
2. Compute max fill: 12 L × ρ_liq(≈ 1.1 kg/L) × 0.8 ≈ **10.5 kg** (game uses the cylinder's labelled max load, compared to player's computation).
3. Place cylinder on scale, tare or note gross weight.
4. Connect: circuit HP (liquid) + BP → manifold → station inlet; station outlet → cylinder **gas** valve. Purge hoses' air minimally (or pre-evacuate hoses with the pump).
5. Recover **liquid first** (faster) from the liquid/HP side, then vapour from both sides.
6. Watch cylinder pressure; if the station head pressure rises, cool the cylinder.
7. Stop at the target (station cut-off, circuit ≤ 0 bar rel / slight vacuum). Wait 5 min: if pressure rises (refrigerant from oil / cold spots), recover again.
8. Self-purge the station into the cylinder, close cylinder valve, disconnect.
9. Weigh: recovered mass = gross − previous; compare with nameplate charge (difference = what leaked).
10. Label the cylinder (fluid, mass) and record (5.07) — destination: re-use after recycling on site, or return to distributor for regeneration/destruction (5.08, BSFF / Trackdéchets in L14).

## Push-pull variant (tier 2)
Large charge with receiver: liquid pushed by vapour from the cylinder (cylinder liquid valve → circuit liquid; station sucks cylinder vapour and pushes it into circuit vapour). Faster for > 5 kg.

## Challenges
| Tier | Variation |
|---|---|
| 1 Guidé | As above |
| 2 Standard | 15 kg system, push-pull, cylinder capacity forces using **two cylinders** (switch at 80 %) |
| 3 Examen | Random fluids and cylinder states; one cylinder contains another fluid; hot day (cylinder pressure limits the rate) |

## Mistakes
| id | Sev. | Trigger | Feedback |
|---|---|---|---|
| mixed-fluids | critical | Recover into cylinder with another fluid | Mixture cannot be regenerated → destruction, cost |
| disposable-cylinder | critical | Use non-refillable cylinder | Prohibited |
| overfill | critical | Cylinder liquid > 80 % (scale shows) | Hydraulic burst risk (see L00 E4) |
| expired-cylinder | major | Test date expired | Pressure equipment regulation |
| vent | critical | Open circuit to atmosphere | Emission |
| stop-too-early | major | Stop with circuit > 0 bar rel or pressure rise ignored | Remaining charge vented at opening |
| no-weigh | major | No weighing | 5.07 quantities must be recorded |
| liquid-into-station-without-capability | minor | Liquid to station flagged vapour-only | Compressor slugging (station spec on the label) |

## Physics
Static circuit + recovery unit device + cylinder with liquid level; heat of compression warms cylinder (T_cyl += k·ṁ), cooling action (wet towel / ice bath) lowers it.

## Success
≥ 98 % of charge recovered, correct cylinder, ≤ 80 %, labelled and recorded.
