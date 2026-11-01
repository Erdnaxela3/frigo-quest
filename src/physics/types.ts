// Units: pressure bar ABSOLUTE, temperature °C, mass kg, volume L — unless a name says otherwise (…Rel = bar relative).

export type FluidId = 'R32' | 'R410A' | 'R134a' | 'R290' | 'R1234yf' | 'R404A' | 'R407C' | 'R449A' | 'R744';

export interface Fluid {
  id: FluidId;
  name: string;
  gwp: number; // Regulation (EU) 2024/573 values: AR4 for saturated HFCs, newer values for HFOs/HCs
  safety: 'A1' | 'A2L' | 'A3';
  glide: number; // K, nominal
  molarMass: number; // g/mol
  rhoLiq25: number; // kg/m³ liquid at 25 °C
  beta: number; // 1/K liquid thermal expansion
  critical: { T: number; P: number };
  lfl?: number; // kg/m³, flammables only
  sat: [T: number, Pbubble: number, Pdew: number][];
  oil: string;
  uses: string;
}

// ---- Static circuit (compressor off): see specs/02-physics-engine.md §2 ----

export const ATM = 'ATM';

export interface Volume {
  id: string;
  label?: string;
  V: number; // L
  T: number; // °C
  Tdrive?: number | null; // when set, T relaxes to this instead of ambient (sun, heater, ice bath)
  mRef: number;
  mN2: number;
  mAir: number;
  mH2O: number; // total water, liquid + vapour
  ps?: number; // bar abs, design pressure (warnings only)
}

export interface Link {
  id: string;
  a: string; // volume id or ATM
  b: string;
  k: number; // flow coefficient, see circuit.ts flow()
  open: number; // 0..1
  liquidSide?: 'a' | 'b'; // that end draws liquid when two-phase (dip tube, bottom port)
}

export type Device =
  | { kind: 'vacuumPump'; id: string; at: string; on: boolean; speed: number /* m³/h */; ultimate: number /* bar abs */ }
  | { kind: 'transfer'; id: string; from: string; to: string; on: boolean; speed: number /* m³/h swept */; cutoff: number /* bar abs: stops drawing below */ }
  | { kind: 'n2'; id: string; at: string; open: boolean; setpoint: number /* bar abs */; k: number };

export interface Species { ref: number; n2: number; air: number; h2o: number }

export interface Circuit {
  fluid: FluidId;
  ambient: number; // °C
  t: number; // s
  volumes: Record<string, Volume>;
  links: Link[];
  devices: Device[];
  emitted: Species; // kg released to ATM since start
}

export interface VolumeState {
  P: number; // total bar abs
  Pref: number;
  PN2: number;
  PAir: number;
  PH2O: number;
  liquidFraction: number; // refrigerant liquid volume / V, 0..1
  phase: 'empty' | 'vapour' | 'twoPhase' | 'liquidFull';
  waterLiquid: number; // kg liquid water remaining
}

// ---- Running cycle (compressor on): see specs/02-physics-engine.md §3 ----

export type TxvState = 'ok' | 'tooOpen' | 'tooClosed' | 'bulbLost' | 'bulbLoose';

export interface Faults {
  chargeRatio: number; // actual / nominal charge, 1 = nominal
  nonCondBar: number; // partial pressure of air in condenser, bar
  condFouling: number; // 0..1
  condFanOk: boolean;
  evapFrost: number; // 0..1
  evapFanOk: boolean;
  filterRestriction: number; // 0..1
  txv: TxvState;
  compEff: number; // 0..1, 1 = healthy
  solenoidStuck: boolean;
}

export const NO_FAULTS: Faults = {
  chargeRatio: 1,
  nonCondBar: 0,
  condFouling: 0,
  condFanOk: true,
  evapFrost: 0,
  evapFanOk: true,
  filterRestriction: 0,
  txv: 'ok',
  compEff: 1,
  solenoidStuck: false,
};

export interface CycleInput {
  fluid: FluidId;
  Tamb: number; // condenser air in, °C
  Troom: number; // evaporator air in, °C
  txvSH: number; // static superheat setting, K
  faults: Faults;
  dTcondNominal?: number; // K, default 12
  dTevapNominal?: number; // K, default 8 (AC: ~15)
  nominalCurrent?: number; // A at nominal point, default 4.5 (R32 3.5 kW)
  evapPressureFloor?: number; // bar abs, KVP: evaporator pressure kept ≥ floor (compressor suction stays lower)
  condPressureFloor?: number; // bar abs, KVR: condensing pressure kept ≥ floor
  txvMinDP?: number; // bar, HP − BP below which the TXV starves; default 0.4 × (Psat 40 °C − Psat 0 °C)
}

export interface CycleOutput {
  BP: number; // bar abs, evaporator
  BPsuction?: number; // bar abs, compressor suction (below BP when a KVP throttles)
  HP: number; // bar abs
  Tevap: number; // dew
  Tcond: number; // bubble
  SH: number; // K
  SC: number; // K
  Tsuction: number;
  Tliquid: number;
  Tdischarge: number;
  filterDT: number; // K across filter drier
  current: number; // A
  capacityKW: number;
  COP: number;
  sightGlass: 'clair' | 'bulles' | 'mousse';
  airOutEvap: number;
  airOutCond: number;
  floodBack: boolean; // SH ≈ 0
}

export interface Pressostat {
  kind: 'BP' | 'HP';
  range: number; // bar REL. KP1 (BP): range = enclenchement (cut-in). KP5 (HP): range = coupure (cut-out)
  diff: number; // bar
  manualReset?: boolean;
}
