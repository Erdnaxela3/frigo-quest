# L10 — Compresseur grillé et huile contaminée

**Mission:** "Le compresseur a disjoncté, odeur de brûlé. Remplacez-le et décontaminez le circuit."

**Skills:** A1 5.03, 5.04, 6.01, 6.02, 6.05, 6.06, 6.07 · CAP UP3 (manipuler fluides et huiles, remplacer des composants)

## Setup
Scene **CF**, R449A, hermetic compressor with burnt motor (winding to ground). Oil acid test kit, multimeter (insulation/continuity), recovery station, **"contaminé" labelled cylinder** and a clean recovery cylinder, oil drain container, new compressor (POE oil, pre-charged), burn-out suction filter, new liquid filter drier.

## Correct procedure
1. Electrical diagnosis (lock out first): winding resistance / insulation to ground → confirm burnt motor (vs. contactor / thermal overload problem — variant).
2. Oil sample from the old compressor → acid test positive.
3. **Recover** the charge into the **contaminated** cylinder (do not mix with clean recovered fluid; it goes to destruction/regeneration).
4. Remove the compressor, **drain its oil** into a labelled container — oil contaminated with refrigerant is hazardous waste (5.04). Weigh/estimate volume for the record.
5. Install new compressor: same model/oil type (POE for HFC/HFO), antivibration mounts, no stress on pipes (6.02 — vibrating pipes = future leaks).
6. Fit **burn-out filter** on the suction line + new liquid filter drier. Braze with N₂ sweep.
7. N₂ tightness test, **triple evacuation** (vacuum → N₂ break → vacuum → N₂ → vacuum).
8. Charge (new fluid, by weight), start: check rotation (3-phase scroll), current, oil level sight glass (6.05), oil return (no trapping in long risers).
9. After 48 h sim-time: new acid test → if still acid, change filters again.
10. Record: fluid recovered (contaminated, to destruction), oil quantity, new compressor serial.

## Challenges
| Tier | Variation |
|---|---|
| 1 Guidé | Compressor mechanically dead, no burn (oil clean) → no burn-out filter needed |
| 2 Standard | Burnt motor, full decontamination |
| 3 Examen | It's actually the **contactor** (pitted contacts) → replacing the compressor is a costly mistake; or wrong oil type supplied (mineral) — must refuse it |

## Mistakes
| id | Sev. | Trigger | Feedback |
|---|---|---|---|
| contaminated-mix | major | Recover acid refrigerant into clean cylinder | Cross-contamination |
| oil-in-sink | critical | Dispose oil anywhere but labelled waste container | Hazardous waste |
| wrong-oil | major | Mineral oil in an HFC system | Miscibility, oil return failure |
| no-burnout-filter | major | Restart without decontamination (tier 2) | Acid kills the new compressor |
| no-electrical-check | major | Replace compressor without confirming fault | Tier 3 trap |
| no-lockout | critical | Touch terminals without consignation | Electrical safety |

## Physics
Static model for recovery/evacuation; acid level as a scalar decreasing with filter changes; cycle model afterwards.

## Success
New compressor running, acid test negative at 48 h, contaminated fluid and oil correctly segregated and recorded.
