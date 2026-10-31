# L08 — Remplacer un détendeur thermostatique Danfoss

**Mission:** "Surchauffe élevée et chambre qui ne descend pas. Diagnostiquez, remplacez le détendeur (TE2) et réglez la surchauffe."

**Skills:** A1 9.01, 9.02, 9.03, 9.09, 12.07, 10.01, 6.04, 3.02, 3.04 · CAP UP3 (remplacer des composants, régler)

## Setup
Scene **CF**, R449A. Fault: TXV bulb has lost its charge (or orifice too small in variant). Readings: BP low, SH 18 K, SC high, box +9 °C. Danfoss **TE2** body (flare × flare, external equaliser) with interchangeable **orifice assembly** (sizes 00–06), separate bulb.

Parts tray: TE2 bodies for different fluids (letter code on the label ⚠ verify: N = R134a, S = R404A/R507, X = R22/R407C, and the R449A-compatible type per Danfoss documentation), orifices 00–06, new flare nuts, copper gaskets, bulb clamps, insulation.

## Correct procedure
1. Diagnose: measure SH (high), check sight glass full (rules out undercharge), check bulb contact (variant: bulb loose → just refix it!), warm the bulb in hand → no BP reaction = dead power element.
2. Isolate by **pump-down** (L09 technique): close liquid line valve, run compressor until BP pressostat stops it (~0.2 bar rel), front-seat the suction service valve (isolates the low side from the compressor), lock out.
3. The low-side section with the TXV now holds a small amount of vapour at ~0.2 bar rel → recover or bring to slightly above 0 bar rel (never below atmospheric when opening — air/moisture ingress).
4. Unscrew TXV inlet/outlet flares and equaliser, remove bulb.
5. Choose the right TE2 for the fluid, choose orifice for the evaporator capacity (table in the scene's dossier technique), assemble.
6. Fit: arrow in flow direction, new flare nuts/gaskets, torque per size.
7. **Bulb**: on horizontal suction line close to the evaporator outlet, **before** the equaliser connection, good contact, clamp, insulate. Position by diameter ⚠ (Danfoss guidance: small lines on top ~1 o'clock, large lines at ~4 o'clock; never underneath where oil runs).
8. Equaliser line connected downstream of the bulb.
9. Nitrogen tightness test on the opened section (L03 mini), vacuum the section (L04 mini).
10. Reopen valves (suction back-seat-crack, liquid valve), start.
11. **Adjust superheat**: spindle ¼ turn at a time, **clockwise = more SH (closes)**, ≈ 4 K per turn; wait 10–15 min sim-time between adjustments; target 5–8 K.
12. Record.

## Challenges
| Tier | Variation |
|---|---|
| 1 Guidé | Bulb fell off the pipe → reattach + insulate, adjust SH; no replacement needed (teaches "check simple first") |
| 2 Standard | Dead power element → full replacement, right orifice |
| 3 Examen | Orifice wrong size (too big → hunting, SH oscillates 0–12 K; too small → high SH); random fluid → must pick the right body |

## Mistakes
| id | Sev. | Trigger | Feedback |
|---|---|---|---|
| open-under-pressure | critical | Open flare with refrigerant > 0.5 bar rel | Emission |
| open-under-vacuum | major | Open section under vacuum | Air + moisture sucked in |
| wrong-body | major | TE2 for another fluid | Wrong pressure–temperature charge in the bulb |
| bulb-wrong-place | major | Bulb after equaliser, on vertical riser, at 6 o'clock or uninsulated | Erratic control |
| equaliser-missing | major | Equaliser not reconnected | TXV sees wrong pressure, feeds poorly |
| big-adjust | minor | > ½ turn without waiting | Hunting, over-correction |
| skip-tests | major | Skip N₂ test / vacuum on opened section | Moisture/leak |
| reuse-gasket | minor | Old flare gasket / nut | Leak point (4.01) |

## Physics
Cycle model with TXV param (static SH, orifice capacity vs load, bulb ok/lost/misplaced → noise on SH), pump-down static model.

## Success
SH 5–8 K stable, box reaching setpoint, opened section tested and evacuated, no emission > 10 g.
