# L15 — Régulateurs de pression KVP / KVR

**Mission:** "Chambre froide avec deux évaporateurs à températures différentes et condenseur à air extérieur en hiver. Réglez les régulateurs de pression."

**Skills:** A1 7.02, 8.02, 8.07, 9.05, 7.10, 8.11 · CAP UP3 (régler les valeurs de consigne)

## Setup
Scene **CF** extended: two evaporators on one condensing unit — a +6 °C produce room with an **evaporating pressure regulator** (Danfoss KVP type) on its suction outlet, a 0 °C room without; air-cooled condenser with a **condensing pressure regulator** (KVR type) + receiver pressure regulator (KVD type) for winter operation. Ambient varies (−5 °C to +30 °C via a season slider).

## Concepts
- **KVP** keeps the evaporator pressure **above** a setpoint (opens on rising inlet pressure) → prevents the warm room from evaporating too cold (dehydration of produce, frost).
- **KVR** keeps condensing pressure **above** a minimum (opens on rising inlet pressure) → in winter, ensures enough ΔP for the TXV to feed correctly. KVD keeps receiver pressure up.
- Adjustment: spindle clockwise = higher setpoint (Danfoss convention ⚠ verify per model); set using the manifold on the regulator's gauge port, not the scale.

## Tasks
1. Winter (−5 °C): observe low HP, TXV starving, high SH. Set KVR to give T_cond ≥ 25 °C (compute Psat).
2. Produce room: set KVP to give T_evap ≈ 0 °C for that evaporator while the other runs at −8 °C.
3. Summer (+30 °C): verify regulators fully open, no penalty on HP.
4. Energy question (7.10/8.11): why not set KVR higher "for safety"? → higher compression ratio, lower COP (shown live).

## Challenges
| Tier | Variation |
|---|---|
| 1 Guidé | KVP only |
| 2 Standard | KVR + KVP |
| 3 Examen | Random season and targets, plus a mis-set KVP causing the warm room to freeze |

## Mistakes
| id | Sev. | Trigger | Feedback |
|---|---|---|---|
| kvp-too-low | major | Produce room evaporates < −2 °C | Produce dehydration/frost |
| kvr-too-high | minor | T_cond > 35 °C in winter | Wasted energy (COP shown) |
| scale-only | minor | Set without gauge verification | |

## Physics
Cycle model extended to 2 evaporators (each with its own T_evap, combined suction via KVP as a pressure floor) and a condensing pressure floor.

## Success
Targets within ± 0.3 bar in both seasons.
