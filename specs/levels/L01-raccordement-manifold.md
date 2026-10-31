# L01 — Raccorder le manifold et lire l'installation

**Mission:** "Contrôle de fonctionnement de la chambre froide. Relevez BP, HP, surchauffe et sous-refroidissement, puis déconnectez-vous sans émission."

**Skills:** A1 5.01, 1.03, 1.04, 6.04 · CAP UP3 (raccorder équipements de mesure, mesurer/comparer)

## Setup
Scene **CF** running steady (R449A, box +2 °C, ambient 25 °C). Normal readings ≈ BP 2.6 bar rel (T_evap −8 °C dew), HP 15.1 bar rel (T_cond 37 °C bubble), SH 6 K, SC 5 K. PLATINE R32 (default): BP ≈ 10 bar rel (T_evap 10 °C), HP ≈ 25 bar rel (T_cond 42 °C). Service valves back-seated (ports closed), caps on.

Tools: manifold 2 voies (with selectable fluid scale), 3 hoses (low-loss ball valves), clés de vanne, thermomètre à contact ×2, pince ampèremétrique.

## Correct procedure
1. Read the nameplate → fluid R449A; select R449A scale on the manifold (wrong scale → wrong Tsat).
2. Check manifold valves closed.
3. Remove valve caps (spindle cap + port cap).
4. Blue hose → suction service valve port (BP). Red hose → HP port on liquid receiver / discharge service valve.
5. Crack the service valves off back-seat (¼–½ turn) → gauges read.
6. Read BP / HP. Use Tsat scale: BP → **dew** temperature (evaporation), HP → **bubble** temperature (condensation) for blends.
7. Thermometer on suction line near the TXV bulb → SH = T_suction − T_evap,dew.
8. Thermometer on liquid line at condenser/receiver outlet → SC = T_cond,bubble − T_liquid.
9. Disconnect with minimal emissions:
   - Back-seat the HP service valve (port isolated).
   - Open manifold HP then BP valve briefly: the HP hose's liquid/vapour drains into suction (system running).
   - Back-seat the BP service valve, close manifold valves, close hose ball valves, unscrew hoses.
10. Caps back on (the cap is the final seal).

## Challenges
| Tier | Variation |
|---|---|
| 1 Guidé | As above, checklist visible |
| 2 Standard | SPLIT R32: only one Schrader port (gas line 3-way valve) → BP only; SH must be computed with the suction line temp at the outdoor unit; no HP reading available |
| 3 Examen | Random fluid (R134a / R404A / R449A / R32), random operating point; enter BP, HP, Tevap, Tcond, SH, SC within tolerance (±0.2 bar, ±1 K) |

## Mistakes
| id | Sev. | Trigger | Feedback |
|---|---|---|---|
| wrong-scale | minor | Manifold scale ≠ nameplate fluid when reading temps | Each fluid has its own P/T relation |
| hose-swap | major | Blue on HP port | BP gauge exposed to HP: risk of damaging gauge (over-range) |
| open-manifold-both | major | Open BP+HP manifold valves while hoses connected and compressor running, outside step 9 | You bypass HP to BP: hot gas into suction |
| front-seat | critical | Front-seat the suction valve with compressor running | Compressor pulls deep vacuum, damage |
| no-caps | minor | Leave without caps | Caps are the leak-tight seal (4.01 likely leak points) |
| vent-hose | minor/major | Disconnect pressurised hose | Emission counted (g); > 5 g = major |
| bubble-dew | minor | Using bubble for SH or dew for SC on a blend | Glide: dew for evaporation, bubble for condensation |

## Hints
- "Quel fluide ? Regardez la plaque signalétique."
- "Les vannes de service sont en contre-siège arrière : la prise de pression est fermée."
- "Surchauffe = température tube aspiration − température d'évaporation (rosée)."

## Success
All 4 values entered within tolerance, disconnected, caps on. ★★★ if emissions < 5 g total.
