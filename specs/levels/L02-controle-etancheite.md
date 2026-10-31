# L02 — Contrôle d'étanchéité périodique

**Mission:** "Contrôle d'étanchéité réglementaire de la chambre froide. Déterminez la périodicité, inspectez, détectez, consignez."

**Skills:** A1 2.02, 4.01, 4.02, 4.03, 4.04, 4.05, 4.06, 4.07, 4.08, 4.09 · CAP UP3 (contrôler l'étanchéité d'un circuit chargé)

## Setup
Scene **CF**, R404A 8 kg (31.4 t CO₂e), running. Registre (equipment log) on the clipboard: last check 13 months ago, a previous leak repaired on the evaporator flare. One hidden leak among: flare on TXV inlet, Schrader core on HP port, vibrating capillary rubbing the frame, pressostat capillary, filter drier flare. Leak rate set so it shows as slightly low SC and occasional bubbles.

Tools: registre, t CO₂e calculator (in tablet), detector électronique (needs warm-up + calibration check with reference leak), produit moussant, thermomètre, manifold (optional — connecting costs a little emission: lesson "ne pas se raccorder sans raison").

## Correct procedure
1. Open the registre: fluid, charge, last check, previous leaks (4.02).
2. Compute t CO₂e = 8 × 3922 / 1000 = 31.4 → **12 months** (no LDS) → the check is overdue (note it).
3. Visual & manual inspection (4.03): oil traces, corrosion, vibrations, rubbing capillaries, missing caps. Click components to inspect; oily joints show a stain.
4. Indirect check (4.04/4.05): sight glass, BP/HP vs expected, SH/SC — read from the unit's fixed gauges/controller where available, without connecting.
5. Direct check (4.07/4.08): detector — check reference leak first, sweep each likely point (4.01) **slowly (≈ 5 cm/s), probe below joints** (HFCs heavier than air), ventilation off in confined spaces.
6. Confirm the alarm with produit moussant at the exact spot (4.06).
7. Leak found → inform operator, repair (out of scope here; L08/L09 cover component work), **re-check within 1 month** of repair.
8. Record (4.09): registre + fiche d'intervention, blue sticker with next due date / red marking if not repaired immediately.

## Challenges
| Tier | Variation |
|---|---|
| 1 Guidé | One obvious oily leak |
| 2 Standard | Hidden leak; detector false-positive near the cleaning-product bottle (must confirm with bubbles) |
| 3 Examen | Random fluid & charge (incl. an HFO case in kg and a hermetic < 10 t CO₂e exempt case), answer the frequency question, find 0–2 leaks (zero is possible: don't invent one) |

## Mistakes
| id | Sev. | Trigger | Feedback |
|---|---|---|---|
| wrong-frequency | major | Frequency answer wrong | t CO₂e = kg × PRP / 1000, thresholds 5/50/500 |
| skip-registre | minor | Start detection before reading log | Previous leak points are the first suspects |
| detector-uncalibrated | minor | Use detector without reference check | You can't trust a negative result |
| sweep-too-fast | minor | Sweep speed > 10 cm/s | Missed leaks; the game shows the detector lagging |
| probe-above | minor | Probe above joints only | Refrigerant vapour is heavier than air |
| unconfirmed | major | Declare a leak from detector alone near interfering source | Confirm with a second method |
| no-record | major | Finish without logging | Legal obligation, kept 5 years |
| needless-connect | minor | Connect manifold when not needed | Each connection is a potential emission |

## Physics
Leak = orifice in circuit model; local refrigerant concentration around each component = f(leak rate, distance, air flow from fans). Detector reading = concentration with sensor lag (τ 1 s) and threshold (≈ 3 g/yr equivalent at "high sensitivity").

## Success
Correct frequency, all actual leaks found and confirmed, no false declaration, record completed.
