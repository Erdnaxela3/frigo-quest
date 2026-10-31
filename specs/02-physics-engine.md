# Physics engine

Goal: **qualitatively right, numerically plausible.** A tech reading the gauges should see what they'd see on site (±0.3 bar, ±1 K). Not a CFD/EOS solver.

Units internally: pressure **bar absolute**, temperature **°C** (K only inside gas law), mass **kg**, volume **L**. Gauges display **bar relative** (abs − 1.013) and their temperature scale, as real manifolds do. Vacuum gauge displays **mbar abs** and **microns**.

## 1. Refrigerant data (`refrigerants.ts`)

Per fluid:

```ts
interface Fluid {
  id: 'R134a'|'R404A'|'R407C'|'R410A'|'R32'|'R290'|'R1234yf'|'R449A'|'R744';
  gwp: number;            // AR4 values as used in French paperwork
  safety: 'A1'|'A2L'|'A3';
  glide: number;          // K, ~0 for azeotropes
  molarMass: number;      // g/mol, ideal-gas density of vapour
  liquidDensity: number;  // kg/L at 25 °C (approx, constant)
  sat: [T: number, Pbubble: number, Pdew: number][]; // bar abs, -40…+60 °C every 10 K
  critical: { T: number; P: number };
  lfl?: number;           // kg/m³, flammables only (R290 0.038, R32 0.307)
}
```

Saturation lookup: linear interpolation on **ln(P) vs T** (near-linear, so a 10 K table gives < 1 % error). Inverse lookup (`Tsat(P)`) by the same table. Outside the table → clamp and flag.

Reference data (bar abs, dew; bubble for blends where different):

| °C | R134a | R410A | R32 | R290 | R404A | R1234yf | R744 |
|---|---|---|---|---|---|---|---|
| −30 | 0.84 | 2.70 | 2.73 | 1.68 | 2.05 | 0.99 | 14.3 |
| −20 | 1.33 | 4.00 | 4.06 | 2.45 | 3.0 | 1.51 | 19.7 |
| −10 | 2.01 | 5.73 | 5.83 | 3.45 | 4.3 | 2.22 | 26.5 |
| 0 | 2.93 | 7.99 | 8.13 | 4.74 | 6.1 | 3.16 | 34.9 |
| 10 | 4.15 | 10.86 | 11.07 | 6.36 | 8.3 | 4.39 | 45.0 |
| 20 | 5.72 | 14.44 | 14.75 | 8.36 | 11.0 | 5.92 | 57.3 |
| 30 | 7.70 | 18.85 | 19.28 | 10.79 | 14.3 | 7.83 | 72.1 |
| 40 | 10.17 | 24.19 | 24.78 | 13.69 | 18.3 | 10.17 | supercrit. |
| 50 | 13.18 | 30.6 | 31.4 | 17.13 | 23.0 | 12.98 | — |

R407C / R449A carry separate bubble & dew columns (glide ≈ 5–7 K / ≈ 4–5 K). Final values are cross-checked against a published table (CoolProp/REFPROP-derived) when implementing; the test file pins them.

## 2. Static circuit model (`circuit.ts`)

Used whenever the compressor is **off**: pressure tests, vacuum, recovery, charging, leak tests, purging.

### Volumes
A level defines a graph of **volumes** (HP side, LP side, liquid receiver, hoses, manifold body, cylinder, recovery bottle, vacuum pump inlet) connected by **valves/ports**.

Each volume holds:
```ts
{ V: number;                    // L
  T: number;                    // °C, relaxes to ambient (τ ≈ 120 s) unless driven
  mRef: number;                 // kg refrigerant
  mN2: number; mAir: number;    // kg non-condensables
  mH2O: number;                 // kg moisture (vacuum level only)
  mOil?: number; }
```

### Pressure from contents
1. Refrigerant: specific volume v = V / mRef.
   - If mRef ≥ ρ_vap,sat(T)·V → **two-phase**: P_ref = Psat(T) (bubble if mostly liquid, dew if mostly vapour, linear in between for blends). Liquid fraction = (mRef − ρ_vap·V) / (ρ_liq − ρ_vap) / V.
   - Else **superheated**: P_ref = mRef·R·T / (M·V) (ideal gas).
   - If liquid fraction would exceed 100 % → **hydraulically full**: P rises steeply (+15 bar/K). This is the "overfilled cylinder in the sun" lesson.
2. Non-condensables (N₂, air): ideal gas, **partial pressure** added (Dalton). This is what makes L11 (incondensables) work: HP at standstill > Psat(T_ambient).
3. Moisture: water partial pressure capped at Psat_water(T) (23 mbar @ 20 °C). While liquid water remains, a vacuum pump can't pull below that → **plateau** on the vacuum gauge. Evaporation rate limited → it boils off slowly.

### Flow between volumes
Valve opening `u ∈ [0,1]`, flow coefficient `k` per connection:

- Gas: ṁ = k·u·sign(ΔP)·√(|ΔP|·ρ_upstream), each species carried proportionally to its share upstream.
- Liquid (dip tube / liquid port when upstream liquid fraction > 0): same formula with ρ_liq → charging liquid is ~10× faster than vapour, as on site.
- Flashing: mass moved into a volume adjusts its two-phase state; temperature drop from evaporation modelled as T −= c·ṁ_evap (lets the cylinder frost/slow down when vapour charging — "warm the cylinder" lesson).

Integration: explicit Euler at dt = 0.1 s, sub-stepped if any ΔP > 20 % of P in one step. **Mass conservation is a unit-tested invariant.**

### Special devices
| Device | Model |
|---|---|
| Vacuum pump | Sink on its port, pumping speed S (m³/h, e.g. 2 CFM ≈ 3.4 m³/h): ṁ = S·ρ_inlet, ultimate pressure 0.05 mbar. Running with refrigerant > 2 bar abs inside → "vous pompez du fluide" mistake + oil contamination flag |
| Recovery unit | Compressor from inlet volume to outlet volume: draws if P_in > P_cutoff (0.3 bar abs default, user can set), rate ∝ ρ_in. Outlet cylinder heats up → push P rises; cooling the cylinder helps |
| Nitrogen bottle + regulator | Source at regulator setpoint (0–40 bar rel), infinite mass |
| Leak | Orifice to atmosphere with k_leak; ambient pressure 1.013 bar. Inward leak (air) when under vacuum |
| Schrader valve | Closed unless a hose with depressor is connected; core can be removed (vacuum faster: k ×4) |
| Service valve (vanne 3 voies) | 3 positions: back-seated (port closed, line open), mid (all open), front-seated (line closed, port to compressor) — exam item 6.04 |
| Scale | Displays mass of cylinder + contents, tare button |
| Hoses | 0.1 L each, valves at manifold end; disconnecting a pressurised hose vents its contents → counted as emission |

### Emissions accounting
Every gram of refrigerant leaving to atmosphere (leak, hose disconnect, venting, purge) is tallied per action. Levels use it for scoring; the legal tolerance is "minimal" (5.01): **< 5 g per hose disconnect** with proper procedure (close manifold, purge into LP, use low-loss fittings).

## 3. Running cycle model (`cycle.ts`)

Used when the compressor runs. Steady-state + first-order lag (τ ≈ 30 s) toward it so gauges move smoothly.

Inputs: fluid, charge ratio (actual / nominal), ambient (condenser air) T, room / box T, evaporator & condenser fan states, condenser fouling, evaporator fouling/frost, TXV setting (static superheat), filter drier restriction, non-condensables mass, compressor efficiency, pressostat settings.

Base equations (empirical, tuned for plausible numbers):
- T_cond = T_amb + ΔT_cond, ΔT_cond = 12 K nominal × (1 + fouling) × (fan off ? 2.5 : 1) + overcharge term.
- T_evap = T_room − ΔT_evap, ΔT_evap = 8 K nominal (positive cold room), × (1 + frost) × (fan off ? 2 : 1).
- BP = Psat_dew(T_evap), HP = Psat_bubble(T_cond) + P_noncond.
- Superheat SH = TXV static setting (5 K) + 2 K, increasing when undercharged/restricted, decreasing (→ 0, liquid flood-back) when overfed.
- Subcooling SC = 5 K nominal, ∝ charge (0 when undercharged, > 10 K when overcharged).
- Discharge temperature = T_cond + 25 K + 2·(SH − 7).
- Compressor current ∝ (HP − BP) × mass flow; mass flow ∝ ρ_suction.
- Cooling capacity & COP computed for the energy-efficiency questions (1 decimal).

### Fault signatures (unit-tested directions)

| Fault | BP | HP | SH | SC | Other |
|---|---|---|---|---|---|
| Undercharge (leak) | ↓ | ↓ | ↑↑ | ↓ (0) | bubbles in sight glass |
| Overcharge | ↑ | ↑↑ | ↓ | ↑↑ | high current |
| Non-condensables | ≈/↑ | ↑↑ | ≈ | ≈/↑ | HP at standstill > Psat(T_amb) |
| Condenser fouled / fan off | ↑ | ↑↑ | ≈ | ≈ | high discharge T |
| Evaporator iced / fan off | ↓↓ | ↓ | ↓ (→ 0) | ≈ | frost on suction |
| Filter drier clogged | ↓ | ≈/↓ | ↑↑ | ↑ | ΔT across filter > 2 K, bubbles after filter |
| TXV too open | ↑ | ≈ | ↓ (→ 0) | ↓ | flood-back risk |
| TXV too closed / bulb lost charge | ↓↓ | ↓ | ↑↑ | ↑ | |
| Compressor inefficient (valves) | ↑ | ↓ | ↑ | ≈ | low current, HP/BP converge |

### Safety devices
- **BP pressostat (Danfoss KP1 style)**: settings = **cut-in (range)** and **differential**; cut-out = cut-in − diff. Compressor stops when BP < cut-out, restarts when BP > cut-in. Short-cycling detected if > 6 starts / 10 min → mistake.
- **HP pressostat (KP5)**: cut-out (range) and differential; manual reset variant.
- **Thermostat**: setpoint + differential on box temperature.
- Box temperature: first-order model with load & door openings, so the BP pressostat used as régulation actually cycles (CAP EP3 setup).

## 4. Out of scope
Transient two-phase flow in pipes, oil migration dynamics, transcritical CO₂ cycle (R744 only in the lab sandbox, as static P/T demo), real EOS.
