# L12 — Diagnostic de pannes

**Mission:** "Appel client : 'ça ne refroidit plus'. Mesurez, diagnostiquez, proposez la réparation."

**Skills:** A1 groups 6–9 (one per scenario, so this level also trains the examiner's random group), 4.04, 1.03 · CAP UP3 (contribuer au diagnostic, mesurer, rendre compte)

## Format
A run = **5 scenarios** drawn from the fault table (02-physics-engine §3) on scene **CF** or **SPLIT**. Each scenario:

1. Customer description (symptom text, sometimes misleading).
2. Free measurement phase: manifold (BP/HP), thermometers (suction, liquid, discharge, air in/out evap & cond, before/after filter), clamp meter, sight glass, visual (frost, dirt, fan state), standstill test.
   Each measurement costs sim-time (1–3 min) → "efficiency" score: fewer, smarter measurements score better.
3. Diagnosis: choose cause from a list of 12.
4. Remedy: choose action(s) from a list (e.g. "rechercher la fuite puis réparer, tirer au vide, recharger à la balance" vs "compléter la charge").
5. Feedback: the fault's signature table highlighted with the player's measurements; explanation; linked level (L08, L09, L11…).

## Fault pool
Undercharge (leak) · overcharge · non-condensables · condenser fouled · condenser fan dead · evaporator iced (defrost failure) · evaporator fan dead · filter drier clogged · TXV bulb lost charge · TXV too open / bulb loose · compressor valves worn · solenoid valve stuck closed · BP pressostat mis-set (short-cycling) · thermostat setpoint wrong.

## Challenges
| Tier | Variation |
|---|---|
| 1 Guidé | Single-cause faults, signature table visible |
| 2 Standard | Table hidden; cause list includes look-alikes |
| 3 Examen | Two simultaneous faults in some scenarios; 30 min budget for 5 scenarios |

## Mistakes
| id | Sev. | Trigger | Feedback |
|---|---|---|---|
| top-up-reflex | major | Remedy "compléter la charge" without finding the leak | Illegal & pointless: leak must be repaired first (F-gas) |
| wrong-cause | major | Wrong diagnosis | Signature comparison shown |
| no-sh-sc | minor | Diagnose without SH and SC | They separate charge vs. feeding problems |
| connect-first | minor | Connect manifold before visual checks on an obvious airflow fault | Look before you connect (each connection = emission risk) |

## Physics
Cycle model with fault parameters; standstill uses static model. Random parameter magnitude so the same fault never looks identical twice.

## Success
≥ 4/5 correct diagnoses with correct remedy.
