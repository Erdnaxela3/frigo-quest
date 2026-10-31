# L11 — Incondensables

**Mission:** "HP anormalement élevée et compresseur chaud après une intervention d'un collègue. Trouvez la cause et remettez en état."

**Skills:** A1 7.06, 7.07, 7.09, 1.03, 5.03 · CAP UP3 (mesurer, comparer)

## Setup
Scene **CF** or **SPLIT** after a poorly done intervention: 30–80 g of air in the circuit (vacuum skipped). Running: HP +3 to +5 bar above normal, SC normal or higher, discharge temperature high, BP slightly high. Alternative causes present as decoys in variants: dirty condenser, condenser fan off, overcharge.

## Correct procedure
1. Running checks: HP high; measure air on/off condenser ΔT, condenser surface clean, fan running → rules out airflow causes.
2. **Standstill test**: stop compressor, keep condenser fan running ~10 min (time ×10) until refrigerant and air temperature equalise. Compare HP (abs) with Psat(T_ambient):
   - HP ≈ Psat → no incondensables (look at overcharge: SC high)
   - HP > Psat + ~0.5 bar → incondensables
3. Remedy (A1 practice, small/medium systems): **recover the charge** (L05), **evacuate** properly (L04), **recharge** by weight (L06). Recovered fluid can be recycled on site only if it meets quality; otherwise to regeneration.
4. Large plants with a purger: use the automatic non-condensable purger on top of the condenser/receiver (7.06) — shown as a theory card, since venting from the top by hand releases refrigerant with the air.
5. Restart, compare readings, record.

## Challenges
| Tier | Variation |
|---|---|
| 1 Guidé | Air only, clear standstill difference (+3 bar) |
| 2 Standard | Decoys: condenser partly dirty AND air → must clean and still find the standstill gap |
| 3 Examen | Random among: air / overcharge / dirty condenser / fan off; must pick the right cause and the right fix |

## Mistakes
| id | Sev. | Trigger | Feedback |
|---|---|---|---|
| manual-purge | critical | "Purger au sommet du condenseur" by cracking a valve to air | Refrigerant released with the air — prohibited emission |
| no-standstill | major | Conclude without the standstill comparison | Can't distinguish from overcharge/condenser problems |
| relative-vs-abs | minor | Compare bar rel to an abs table | Units |
| remove-charge-guess | major | Remove refrigerant "until HP is normal" | Masks the cause, undercharge follows |

## Physics
Dalton: HP = Psat(T_cond) + P_air,partial (air accumulates in condenser → reduces effective surface → raises T_cond further). Standstill: all volumes at ambient, air partial pressure distributed by volume.

## Success
Correct cause identified, fixed via recover/vacuum/recharge, readings back to normal, no venting.
