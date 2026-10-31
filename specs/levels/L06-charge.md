# L06 — Charge en fluide

**Mission (CAP EP3 item 2, 20 pts):** "Procédez à la charge en fluide en vous référant à la plaque signalétique."

**Skills:** A1 5.02, 5.05, 5.06, 5.07 · CAP UP3 (manipuler le fluide, raccorder équipements de charge)

## Setup
Scene **CF** under vacuum after L04 (or loaded state). Nameplate: R449A, 6.0 kg. New cylinder R449A with **dip tube** (liquid valve / gas valve) — variant: cylinder without dip tube (must be turned upside down for liquid). Scale.

SPLIT variant: R32, precharge 1.1 kg for 7.5 m, actual line length 12 m, additional charge 20 g/m → +90 g.

## Correct procedure
1. Check fluid on cylinder = nameplate. Check vacuum still held.
2. Cylinder on scale, yellow hose to the **liquid** valve (R449A is zeotropic, glide ~4–5 K → **liquid phase** charging, 5.05).
3. Purge the yellow hose briefly from the cylinder side (or it was under vacuum with the manifold).
4. Tare the scale.
5. Break vacuum: charge liquid into the **HP/liquid side** (receiver) with the compressor off, until pressures equalise.
6. Remaining mass: start the unit (→ L07 safety checks), feed liquid **through the BP side slowly** with the manifold valve throttled so it vaporises before the compressor (no liquid slugging).
7. Stop at nameplate mass on the scale (± 2 %).
8. Close cylinder, recover the hose content into BP (system running), disconnect.
9. Check: sight glass clear, SC ≈ 4–6 K, SH 5–8 K.
10. Record mass charged, fluid type (vierge / recyclé / régénéré).

SPLIT: compute additional charge from line length (numeric question), R32 is near-single-component → vapour charging acceptable but liquid recommended; charge by weight.

## Challenges
| Tier | Variation |
|---|---|
| 1 Guidé | R449A, cylinder with dip tube |
| 2 Standard | Cylinder without dip tube (flip it); SPLIT additional-charge calculation |
| 3 Examen | Partial recharge after a leak repair on a system whose remaining charge is unknown → must **recover + vacuum + full charge** rather than "top up" a blend; or a single-fluid R134a system where topping up by SH/SC is acceptable |

## Mistakes
| id | Sev. | Trigger | Feedback |
|---|---|---|---|
| vapour-charge-blend | major | Charge zeotrope from gas phase | Fractionation, wrong composition |
| liquid-slug | critical | Liquid into BP with valve wide open while running | Compressor liquid hammer |
| wrong-fluid | critical | Cylinder ≠ nameplate | Contamination |
| overcharge | major | > nameplate + 5 % | High HP, see L12 |
| undercharge | major | < nameplate − 5 % | |
| charge-by-pressure | major | Stop on gauge reading instead of weight | Pressure = temperature, not charge (L00 E1) |
| no-tare | minor | Forgot tare | Wrong mass record |
| topping-blend | major | Top up zeotrope after leak (tier 3) | Composition unknown after leak |

## Physics
Static circuit (liquid/vapour flow from cylinder depending on dip tube/orientation) then cycle model with charge ratio input. Fractionation flag tracked by phase drawn.

## Success
Mass within ± 2 % of target, correct phase, no slug, recorded.
