# L09 — Pump-down et remplacement du filtre déshydrateur

**Mission:** "Voyant liquide qui bulle, indicateur d'humidité jaune. Remplacez le filtre déshydrateur sans récupérer toute la charge."

**Skills:** A1 6.04, 9.07, 9.08, 9.09, 10.01, 12.07 · CAP UP3 (remplacer des composants)

## Setup
Scene **CF**, R449A, brazed filter drier (Danfoss DML type) between liquid line valve (sortie réservoir, "king valve") and sight glass + solenoid. Filter partly clogged (ΔT across filter 4 K) and moisture indicator yellow.

## Correct procedure
1. Diagnose: thermometer before/after filter → ΔT > 2 K = restriction (flash gas, bubbles in sight glass after the filter while SC upstream is fine).
2. **Pump-down**: close the liquid line valve at the receiver outlet; compressor runs and pumps the low side into condenser/receiver; BP pressostat stops it (~0.2 bar rel). Lock out. Close suction service valve (front-seat) to keep the charge in the HP side.
3. Isolated section (between king valve and solenoid/TXV) now at low pressure; recover remaining vapour / bring to slight positive pressure.
4. Cut out the old filter (pipe cutter, no saw — chips), new filter: correct type (molecular sieve for HFC/POE), size, **arrow in flow direction**, open caps at the last moment (moisture).
5. Braze with **nitrogen sweep** (balayage d'azote, low flow) to avoid oxide scale; wet rag on the filter body/sight glass to protect.
6. N₂ tightness test of the section, vacuum the section (via the Schrader on the sight glass or the filter port).
7. Open valves: suction back-seat then crack, liquid valve back-seat. Start.
8. Check ΔT across filter < 1 K, sight glass clear; moisture indicator turns green after hours (time ×60).
9. Record.

## 6.04 service valve mini-challenge (included)
Three-position valve drill: for each requested state (gauge reading while running / isolate compressor / normal operation with port closed), turn the spindle to front-seat / mid / back-seat. Wrong positions shown with animated flow.

## Challenges
| Tier | Variation |
|---|---|
| 1 Guidé | Flare filter (no brazing) |
| 2 Standard | Brazed filter, nitrogen sweep required |
| 3 Examen | Receiver capacity too small for full pump-down: HP rises toward HP pressostat cut-out → player must stop and **recover** the rest instead of forcing |

## Mistakes
| id | Sev. | Trigger | Feedback |
|---|---|---|---|
| pumpdown-overfill | critical | Continue pump-down while HP > KP5 cut-out / receiver full | Liquid-full receiver, burst risk (L00 E4) |
| pumpdown-vacuum | major | Bypass BP pressostat and pull suction into vacuum | Air ingress at shaft seal / joints |
| no-sweep | major | Brazing without N₂ sweep | Oxide scale clogs TXV/filter |
| brazing-pressurised | critical | Heat a pipe still under refrigerant pressure | Toxic decomposition products, blow-out |
| arrow-backwards | major | Filter reversed | Desiccant washed out |
| filter-open-early | minor | Uncap filter long before fitting | Desiccant saturated by ambient moisture |
| saw-cut | minor | Hacksaw | Chips in circuit |

## Physics
Pump-down: LP volume emptied by compressor into HP volume (static model with compressor device), receiver liquid level visible. Filter restriction = Δp → flash gas fraction after filter.

## Success
Filter replaced in correct orientation, section tested and evacuated, ΔT across filter < 1 K, no critical mistake.
