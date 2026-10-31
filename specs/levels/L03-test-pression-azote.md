# L03 — Test de pression à l'azote

**Mission:** "Le circuit vient d'être modifié (brasures neuves). Réalisez le test de résistance et d'étanchéité avant tirage au vide."

**Skills:** A1 3.01, 3.02, 3.05, 12.08 · CAP UP2 (assurer l'étanchéité avant mise en service)

## Setup
Scene **CF**, empty of refrigerant (0 bar rel, air inside). Nameplate PS: HP side 28 bar, BP side 18 bar ⚠ (values per scene; exact test pressures follow the manufacturer / EN 378 — the game uses the nameplate figures given in the briefing). One of: no leak / a leaking new brazed joint / a leaking flare / a Schrader core not tight.

Tools: bouteille d'azote (OFN, "azote déshydraté") + détendeur à 2 manomètres with soupape, manifold, flexibles, produit moussant, thermomètre ambiant, chronomètre (time acceleration).

## Correct procedure
1. Check: solenoid valve open (energised or manual opener) and all internal valves open so the whole circuit is tested; isolate components not rated for test pressure (e.g. pressostats with lower rating — per briefing).
2. Connect nitrogen: bottle → **détendeur** → yellow hose → manifold → circuit (both sides).
3. Set regulator low, pressurise progressively in steps (e.g. 5 bar → check → 10 → …), never open the bottle straight into the circuit.
4. **Strength test** (3.01) to the briefing value, short hold, no deformation.
5. **Tightness test** (3.02) at the briefing value ≤ PS: close manifold, isolate bottle, note P₁ and T₁.
6. Hold (sim 30 min – 24 h). Note P₂ and T₂. Correct for temperature: P₂,expected(abs) = P₁(abs) × T₂(K) / T₁(K).
7. Drop beyond correction → locate with produit moussant (bubbles grow at the faulty joint).
8. Release nitrogen (vented outdoors — N₂ is not a regulated emission) down to ~0.2 bar rel, keep slight positive pressure if pausing.
9. Record (3.05): test pressure, duration, temperatures, result.

## Challenges
| Tier | Variation |
|---|---|
| 1 Guidé | No temperature change, obvious leak |
| 2 Standard | Sun on the condenser: temperature rises 10 K during the test → pressure goes **up**; a small leak hides behind it. Player must apply correction |
| 3 Examen | Night test, temperature falls 8 K, no leak → player must **not** declare a leak; random PS values; must pick the right gas from bottles (N₂ / O₂ / air compressor / R449A) |

## Mistakes
| id | Sev. | Trigger | Feedback |
|---|---|---|---|
| wrong-gas-oxygen | critical | Connect oxygen bottle | Oil + O₂ under pressure = explosion |
| wrong-gas-refrigerant | critical | Pressure test with refrigerant | Prohibited emission source; use dry N₂ |
| no-regulator | critical | Bottle (200 bar) directly to manifold | Burst risk |
| over-ps | critical | P > strength test value | Component damage / burst |
| solenoid-closed | major | Test with solenoid closed | Part of the circuit is untested |
| no-temp-correction | major | Leak verdict contradicts the corrected result | P/T proportional in absolute units |
| relative-units | minor | Correction computed with bar rel or °C (numeric answer check) | Use bar abs and kelvin |
| no-record | minor | — | 3.05 |

## Physics
Static circuit with N₂ only (ideal gas), volume T follows ambient profile, leak orifice. Bubble rate at leak ∝ ṁ_leak.

## Success
Correct verdict (leak / no leak), leak located if present, record completed, no critical mistake.
