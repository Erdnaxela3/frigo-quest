# L07 — Mise en service et réglage des pressostats

**Mission (CAP EP3 items 3+4, 15 + 30 pts):** "Remettez l'installation en marche en sécurité, puis réglez le pressostat BP aux valeurs données par le jury (ex. coupure 0,5 bar, enclenchement 2,0 bar)."

**Skills:** A1 6.03, 6.06, 7.04, 8.04, 9.04, 9.06, 1.05 · CAP UP3 (régler consignes régulation et sécurité, mesurer, rendre compte)

## Setup
Scene **CF** charged (end of L06), electrical panel with main switch, consignation padlock, thermostat, **Danfoss KP1** (BP, range −0.2…7.5 bar, diff 0.7…4 bar) **deliberately mis-set** (as in the EP3 preparation sheet), **KP5** (HP, manual or auto reset), crankcase heater, solenoid valve on liquid line, fixed gauges absent → player's manifold connected.

Mode: **pump-down** control (thermostat → solenoid; BP pressostat starts/stops compressor).

## KP dial model
- **KP1 (BP)**: "RANGE" spindle = **enclenchement (cut-in)**; "DIFF" spindle = différentiel; **coupure = enclenchement − différentiel**.
- **KP5 (HP)**: "RANGE" = **coupure (cut-out)**; "DIFF" = différentiel; réenclenchement = coupure − différentiel (auto version).
- Dials turn in ¼ turns; scale reading has ± 0.2 bar inaccuracy → you must **verify with the manifold**, not trust the scale (EP3 graders check the real values).

## Correct procedure
### Remise en marche (3)
1. Visual: service valves back-seated + cracked for gauges, liquid valve open, caps, nothing loose.
2. Electrical: check supply voltage (multimeter), crankcase heater on for the required time (briefing: already done / not done — if not, wait), remove consignation in presence of the jury.
3. Start: check rotation/noise, current vs nameplate (pince), fans running.
4. Watch BP/HP stabilise, sight glass, SH/SC.

### Réglage BP (4)
1. Compute: target cut-in 2.0, cut-out 0.5 → diff 1.5 bar. Set RANGE ≈ 2.0, DIFF ≈ 1.5 on the scales.
2. **Verify cut-out**: close the liquid line valve (or let thermostat close the solenoid) → BP falls → note pressure when the compressor stops.
3. **Verify cut-in**: reopen slowly → BP rises → note pressure when it restarts.
4. Adjust in ¼ turns and repeat until both within ± 0.2 bar.
5. Check HP pressostat cut-out is below PS HP (test by stopping condenser fan briefly, watch HP — tier 3 only, with jury).
6. Thermostat setpoint per briefing (+2 °C, diff 2 K); observe one full cycle (time ×60).
7. Fill the readings sheet (→ L14 mini form): BP, HP, Tevap, Tcond, SH, SC, current, air in/out temps, box temp.

## Challenges
| Tier | Variation |
|---|---|
| 1 Guidé | KP1 only, values given, scale accurate |
| 2 Standard | Scale ± 0.3 bar off, must verify; short-cycling trap: diff set too low → compressor restarts every 30 s |
| 3 Examen | Jury values random; also set KP5 + thermostat; crankcase heater not energised at start (must wait) |

## Mistakes
| id | Sev. | Trigger | Feedback |
|---|---|---|---|
| no-consignation-check | critical | Work in panel without lock-out / verifying absence of voltage | Electrical safety (habilitation) |
| start-valve-closed | critical | Start with liquid or discharge valve closed | Discharge valve closed = HP explosion risk; liquid closed = immediate pump-down |
| no-crankcase-wait | major | Start cold compressor with heater off (tier 3) | Liquid in oil → foaming, bearing wear |
| kp-logic | major | Treat RANGE as cut-out on KP1 | KP1: range = enclenchement |
| short-cycle | major | > 6 starts / 10 min | Compressor wear; increase differential |
| unverified | major | Finish without measuring the real cut-out/in | Scale is indicative |
| hp-above-ps | critical | KP5 cut-out > PS | Safety device must trip before PS |

## Physics
Cycle model + box temperature model + pressostat/thermostat logic (02 §3). Pump-down: solenoid closed → BP falls with compressor running (static-ish model on LP volume with compressor sink).

## Success
Cut-out and cut-in within ± 0.2 bar of jury values, no short cycling, readings sheet complete. Score weights mirror EP3 (15 pts remise en marche, 30 pts réglage).
