# L14 — Traçabilité : fiche d'intervention et déchets

**Mission:** "Votre intervention est terminée. Remplissez la fiche d'intervention et gérez la bouteille de récupération."

**Skills:** A1 3.05, 4.09, 5.07, 5.08, 6.07, 7.09, 8.10, 9.09, 2.02 · CAP UP3 (rendre compte), UP1 (compléter, transmettre)

## Format
Form-filling level. Input: the **journal** of a previous level run (yours, or a canned one) + equipment data. Output: a filled form validated field by field.

## Form (modelled on Cerfa 15497\*04 ⚠ — field list to be checked against the current Cerfa)
- Opérateur: name, n° attestation de capacité
- Détenteur: name, address
- Équipement: identification, fluid, nominal charge (kg), t CO₂e, presence of a leak detection system
- Nature de l'intervention: assemblage · mise en service · modification · maintenance · contrôle d'étanchéité périodique / non périodique · démantèlement · autre
- Contrôle d'étanchéité: date, result, leaks found (location), repaired (yes/no), re-check date
- Quantité chargée (kg): vierge / recyclé / régénéré; fluid designation
- Quantité récupérée (kg): destination (réutilisation après recyclage / retour distributeur pour traitement), contenant identification
- Signatures

## Tasks
1. Fill the form from the journal (auto-computed values must match: t CO₂e, masses from scale readings).
2. Next leak check due date (from frequency).
3. Choose the sticker (blue with date / red défaut d'étanchéité).
4. Recovered cylinder: choose the right path — return to distributor; on **Trackdéchets** create the **BSFF** ⚠ (bordereau de suivi des fluides frigorigènes), cylinder ID, quantity, fluid.
5. Contaminated oil: hazardous waste path.
6. Archive: how long? (5 years ⚠).

## Challenges
| Tier | Variation |
|---|---|
| 1 Guidé | Field hints visible |
| 2 Standard | Journal from your own L05 / L06 run |
| 3 Examen | Journal contains an inconsistency (scale readings say 5.6 kg recovered but nameplate 6 kg and no leak declared) → must flag a leak investigation |

## Mistakes
Each wrong field = minor; wrong t CO₂e / frequency / quantities = major; missing leak declaration when masses don't add up = major.

## Success
≥ 90 % fields correct, no major error.
