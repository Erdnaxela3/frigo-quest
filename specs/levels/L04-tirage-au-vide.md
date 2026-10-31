# L04 — Tirage au vide

**Mission (CAP EP3 item 1, 15 pts):** "Vidangez l'azote de l'installation et réalisez le tirage au vide."

**Skills:** A1 3.03, 3.04, 12.09 · CAP UP3 (tirer au vide)

## Setup
Scene **CF** under 8 bar rel nitrogen (the EP3 starting state). Variants inject moisture (mH₂O 2–20 g) or a micro leak.

Tools: pompe à vide 2 étages (oil level/state visible, lest d'air / gas ballast), vacuomètre électronique (mbar + microns), manifold 4 voies, flexibles (standard ¼" or large ⅜"), démonte-obus, azote.

## Correct procedure
1. Release nitrogen to atmosphere through the manifold until 0 bar rel.
2. Check pump oil (cloudy → change first).
3. Remove Schrader cores with the démonte-obus (optional, ×4 speed), use short large-diameter hoses.
4. Connect pump to manifold, both sides of the circuit open (BP + HP), solenoid open.
5. Vacuum gauge **on the circuit side**, not at the pump.
6. Start pump; open gas ballast during the first minutes if moisture is suspected, then close it.
7. Pull down to the target (briefing: ≤ 2 mbar abs, guided tier shows 500 microns ≈ 0.67 mbar as the professional target).
8. **Hold test**: isolate the pump (close manifold/valve), stop the pump, watch for 10–30 min sim-time:
   - stays below the limit → OK
   - rises then **plateaus** (~10–25 mbar) → moisture → re-pump, optionally break with N₂ (triple evacuation)
   - rises **linearly without end** → leak → back to L03
9. Break the vacuum with refrigerant (→ L06) or dry N₂; never leave the circuit under vacuum open to air.
10. Stop pump **after** isolating it (otherwise pump oil is sucked into the hose/circuit).

## Challenges
| Tier | Variation |
|---|---|
| 1 Guidé | Dry, tight circuit |
| 2 Standard | Moisture (10 g): plateau at ~23 mbar; player must recognise it and do a nitrogen break / keep pumping; cold night slows evaporation |
| 3 Examen | Random: dry / wet / micro-leak / pump oil contaminated (ultimate pressure 5 mbar — player must spot the pump, not the circuit, is the problem by isolating and reading the gauge at the pump) |

## Mistakes
| id | Sev. | Trigger | Feedback |
|---|---|---|---|
| pump-on-pressure | major | Start pump with > 0.5 bar rel in circuit | Pump damage, oil blown out |
| pump-on-refrigerant | critical | Pump with refrigerant in circuit | Refrigerant emission through pump exhaust |
| one-side-only | minor | Only BP connected | Slow, HP side trapped behind compressor valves |
| gauge-at-pump | minor | Vacuum gauge next to pump | Reads pump, not circuit |
| stop-before-isolate | major | Stop pump before closing valve | Oil backflow, vacuum lost |
| wrong-verdict | major | Hold test interpretation wrong | Plateau = humidité, linéaire = fuite |
| compressor-under-vacuum | critical | Energise compressor under vacuum | Motor winding damage |
| skip-hold | major | Skip the hold test | Not a valid evacuation |

## Physics
Static circuit with N₂/air, moisture (Psat water), pump model (speed, ultimate pressure, oil contamination), hose conductance (diameter, length, Schrader core). Gauge shows log scale.

## Success
Correct final state (vacuum held below target) and correct verdict on the hold test. Scoring mirrors EP3 (15 pts → shown in the EP3 mock).
