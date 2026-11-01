import type { Circuit, CycleOutput, Faults, FluidId, Pressostat } from '../physics/types';
import type { HoseColor, JointId, PortId, TargetId, ThreeWay, ValveId } from './sceneIds';

export type Tier = 'guide' | 'standard' | 'examen';
export type Severity = 'minor' | 'major' | 'critical';

/** `hose:<id>` picks a hose from GameState.hoses. */
export type ToolId = 'hand' | 'wrench' | 'screwdriver' | 'thermometer' | 'clamp' | 'detector' | 'soap' | 'coreTool' | 'gasDetector' | `hose:${string}`;

/** Where a hose end can be screwed. Board ports take the hose's 'port' end (Schrader depressor); the rest take either end. */
export type Socket =
  | PortId
  | 'mf.lp' | 'mf.hp' | 'mf.center' | 'mf.vac' // manifold
  | 'pump' | 'rec.in' | 'rec.out' | 'n2' // bench devices
  | 'cyl.gas' | 'cyl.liq'; // cylinder valves

export type HoseEnd = 'manifold' | 'port';
export type CapId = PortId | ValveId;
export type ManifoldValve = 'lp' | 'hp' | 'vac' | 'charge';

export interface Hose {
  id: string;
  color: HoseColor;
  manifold: Socket | null; // plain end; null = open to air
  port: Socket | null; // depressor end
  valve: boolean; // low-loss ball valve at the port end, true = open
}

export interface Bench {
  pump?: { on: boolean; speed: number /* m³/h */; ultimate: number /* bar abs */ };
  recovery?: { on: boolean; speed: number /* m³/h */; cutoff: number /* bar abs */ };
  n2?: { open: boolean; setpoint: number /* bar abs, regulator outlet */ };
  /** Circuit volume 'cyl' must exist when set. */
  /** dipTube false = single-valve cylinder (no 'cyl.liq'): liquid only from 'cyl.gas' when inverted. With a dip tube, inverting swaps the phases. */
  cylinder?: { label: string; gas: boolean; liq: boolean; tare: number /* kg, empty */; dipTube?: boolean; inverted?: boolean };
  scaleTare?: number; // kg shown as tare on the scale; undefined = no scale
  vacuumGaugeAt?: string; // circuit volume id the electronic vacuum gauge reads; undefined = no gauge
}

/** Danfoss KP. Values bar REL. KP1: range = cut-in, cut-out = range − diff. KP5: range = cut-out, cut-in = range − diff. */
export interface Kp extends Pressostat {
  scaleError: number; // bar: the RANGE scale reads true + scaleError
  tripped: boolean; // contact open
}

export interface Plant {
  Tamb: number; // outdoor air, °C
  Troom: number; // indoor air, °C; dynamic only when `box` is set
  txvSH: number; // static superheat, K
  faults: Faults; // chargeRatio is overwritten from the actual mass in the circuit
  nominalCharge: number; // kg
  kp1: Kp; // senses 'comp'
  kp5: Kp; // senses 'hp'
  /** direct: thermostat starts/stops the compressor. pumpDown: thermostat drives the solenoid, KP1 starts/stops the compressor. */
  control: 'direct' | 'pumpDown';
  /** Stops at setpoint, calls again at setpoint + diff. Undefined = always calling. */
  thermostat?: { setpoint: number; diff: number; call: boolean };
  /** Room/box thermal model (boxStep, heat from Tamb). Undefined = Troom fixed. */
  box?: { UA: number /* kW/K */; C: number /* kJ/K */ };
  /** Evaporating pressure regulator on the suction line (drawn when defined, regulates when enabled). */
  kvp?: Regulator;
  /** Condensing pressure regulator at the condenser outlet. */
  kvr?: Regulator;
}

/** Danfoss KVP / KVR: keeps its inlet pressure ≥ setting. */
export interface Regulator { setting: number /* bar REL */; enabled: boolean }

export type RoomLevel = 'floor' | 'head';
/** Room around the unit: released refrigerant stratifies at floor level (heavier than air) and is ventilated away. */
export interface Room {
  volume: number; // m³
  ach: number; // natural air changes per hour
  fan?: { on: boolean; ach: number }; // ATEX extraction fan, extra air changes per hour
  floor: number; // kg/m³ refrigerant, lower 20 % of the room
  head: number; // kg/m³, the rest
  outside?: boolean; // releases go outdoors (hose routed outside): not added to the room
  seen?: number; // kg of circuit.emitted.ref already counted
}
export interface GasDetector { on: boolean; position: RoomLevel; battery: 'ok' | 'low' | 'empty' }
export interface IgnitionSource { id: string; label: string; active: boolean; level?: RoomLevel /* default floor */ }

export interface Elec {
  locked: boolean; // isolator open + padlock (consignation)
  voltageChecked: boolean; // absence of voltage verified since the lockout
  crankHeaterOnSince: number | null; // sim s when the crankcase heater got power; null = unpowered
}

export interface Probe { tool: ToolId; target: TargetId }
export interface Reading { label: string; value: number; unit: string; digits?: number }

export interface Mistake { id: string; severity: Severity; message: string; skill: string; lesson?: string; t: number }
export interface JournalEntry { t: number; text: string; kind: 'action' | 'mistake' | 'info' }
export interface Toast { text: string; kind: 'info' | 'bad' | 'ok'; n: number }

export interface Result {
  completed: boolean;
  failed?: string; // reason, when a critical mistake ends an exam
  score: number; // 0..100
  stars: 0 | 1 | 2 | 3;
  breakdown: { label: string; points: number }[];
  emittedG: number;
}

export interface GameState {
  levelId: string;
  tier: Tier;
  fluid: FluidId;
  t: number; // sim seconds
  timeScale: 0 | 1 | 10 | 60;
  circuit: Circuit; // system volumes: hp, liq, lp, comp; + manifold, hose:<id>, optional cyl, level extras
  unitOn: boolean; // command switch; the compressor may still be held off by KP1/KP5/thermostat
  running: boolean; // compressor running
  cycle: CycleOutput | null; // relaxed running point; null when stopped AND during a pump-down transient
  starts: number[]; // sim s of every automatic or manual compressor start
  elec: Elec;
  opened: string[]; // circuit volumes open to air (component removed), see openSection
  suctionLiquid: number; // g/s of liquid entering the compressor volume, ~2 s average (liquidIntoSuction)
  plant: Plant;
  valves: { liquid: 'open' | 'closed'; gas: ThreeWay; receiver: 'open' | 'closed'; solenoid: boolean /* manual opener */ };
  caps: Record<CapId, boolean>; // true = cap on
  cores: Partial<Record<PortId, boolean>>; // true = Schrader core removed
  /** opening: fraction for a throttled (cracked) open valve, absent = fully open. */
  manifold: { scale: FluidId; fourWay: boolean; valves: Record<ManifoldValve, boolean>; opening: Partial<Record<ManifoldValve, number>> };
  hoses: Hose[];
  bench: Bench;
  leaks: { at: string; k: number; joint?: JointId }[]; // orifices to ATM
  leakedRef?: number; // kg lost through `leaks` (not counted as player emissions)
  oilStains: JointId[];
  bulbAttached: boolean;
  nameplate: string;
  tool: ToolId | null;
  probes: Probe[];
  inspected: TargetId[];
  answers: Record<string, { value: number; ok: boolean }>;
  vars: Record<string, number | string | boolean>; // level-specific state
  journal: JournalEntry[];
  mistakes: Mistake[];
  done: string[]; // objective ids, sticky
  hintLevel: Record<string, number>; // objective id → 1..3
  hintPenalty: number;
  disconnects: number; // port-end disconnections (each grants a 5 g emission allowance)
  lastVentG: number; // refrigerant vented by the last disconnect, g
  lastProgressT: number;
  toast: Toast | null;
  finished: Result | null;
  undo: GameState | null; // guidé only
  room?: Room;
  gasDetector?: GasDetector; // undefined = off, at floor level, battery ok
  ignition?: IgnitionSource[];
  /** First ignition (concentration ≥ LFL at an active source, or torchIgnition). Levels decide the consequence. */
  ignitionEvent?: { t: number; source: string; lfl: number /* % LFL */ };
}

export type Action =
  | { type: 'pickTool'; tool: ToolId | null }
  | { type: 'toggleCap'; target: CapId }
  | { type: 'connectHose'; hose: string; end: HoseEnd; socket: Socket }
  | { type: 'disconnectHose'; hose: string; end: HoseEnd }
  | { type: 'toggleHoseValve'; hose: string }
  | { type: 'toggleManifold'; valve: ManifoldValve }
  | { type: 'setScale'; fluid: FluidId }
  | { type: 'setServiceValve'; valve: 'valve.gas'; pos: ThreeWay }
  | { type: 'setServiceValve'; valve: 'valve.liquid' | 'valve.receiver'; pos: 'open' | 'closed' }
  | { type: 'setManifoldOpening'; valve: ManifoldValve; opening: number } // 0..1
  | { type: 'invertCylinder' }
  | { type: 'setPressostat'; kp: 'kp1' | 'kp5'; range?: number; diff?: number } // SCALE values, bar rel
  | { type: 'resetKp5' }
  | { type: 'setThermostat'; setpoint?: number; diff?: number }
  | { type: 'adjustTxv'; quarterTurns: number } // + = clockwise = more superheat
  | { type: 'lockout' }
  | { type: 'unlock' }
  | { type: 'checkVoltage' }
  | { type: 'setRegulator'; reg: 'kvp' | 'kvr'; setting: number } // bar rel
  | { type: 'setGasDetector'; on?: boolean; position?: RoomLevel; battery?: GasDetector['battery'] }
  | { type: 'setIgnition'; id: string; active: boolean }
  | { type: 'setRoomFan'; on: boolean }
  | { type: 'toggleSolenoid' }
  | { type: 'toggleCore'; port: PortId }
  | { type: 'setUnit'; on: boolean }
  | { type: 'device'; device: 'pump' | 'recovery' | 'n2'; on: boolean }
  | { type: 'setN2'; setpoint: number } // bar abs
  | { type: 'cylValve'; valve: 'gas' | 'liq' }
  | { type: 'tareScale' }
  | { type: 'measure'; tool: ToolId; target: TargetId }
  | { type: 'inspect'; target: TargetId }
  | { type: 'answer'; field: string; value: number }
  | { type: 'custom'; id: string; value?: number | string }
  | { type: 'wait'; seconds: number }
  | { type: 'setTimeScale'; scale: GameState['timeScale'] }
  | { type: 'requestHint' }
  | { type: 'undo' }
  | { type: 'finish' };

/** Rules also see ticks: `{ type: 'tick', dt }` after every tick() call. */
export type RuleAction = Action | { type: 'tick'; dt: number };
export interface RuleCtx { prev: GameState; s: GameState; a: RuleAction }

export interface Rule {
  id: string; // mistake id, recorded at most once per run
  severity: Severity;
  skill: string; // skill id, e.g. 'A1:5.01'
  lesson?: string; // lesson id linked from the debrief
  message: string; // French: what went wrong + why
  when: (c: RuleCtx) => boolean;
}

export interface Objective {
  id: string;
  label: string;
  /** Sticky and sequential: checked only once every previous objective is done. */
  done: (s: GameState) => boolean;
  hints?: [nudge: string, specific: string, show?: TargetId[]];
  tiers?: Tier[]; // default: all
}

export interface AnswerField {
  id: string;
  label: string;
  unit: string;
  tol: number | { rel: number }; // inclusive; rel = fraction of |expected|
  expected: (s: GameState) => number; // evaluated when the player answers
  choices?: string[]; // value = index; tol ignored
  tiers?: Tier[];
}

export interface CustomAction {
  id: string;
  label: string | ((s: GameState) => string);
  visible?: (s: GameState) => boolean;
  /** Numeric input sent as value (e.g. regulator setpoint). */
  input?: { unit: string; min: number; max: number; step: number };
}

export type Step = Action | ((s: GameState) => Action);

export interface Level {
  id: string;
  title: string;
  skills: string[];
  lesson: string; // main lesson id
  scene: 'PLATINE';
  fluid: FluidId;
  briefing: string;
  tierNotes: Record<Tier, string>;
  tools: ToolId[]; // hose tools are added automatically
  unitControl?: boolean; // show the start/stop switch
  timeLimit?: number; // exam tier, sim seconds
  setup: (tier: Tier, rng: () => number) => GameState;
  objectives: Objective[];
  rules: Rule[];
  answers: AnswerField[];
  actions?: CustomAction[];
  /** Called after every built-in action and for every 'custom' action. Mutate s; return journal text. Throw refuse(msg) to reject. */
  onAction?: (s: GameState, a: Action) => string | void;
  onTick?: (s: GameState, dt: number) => void;
  inspect?: (s: GameState, target: TargetId) => string | undefined;
  /** Live reading for a placed probe; return undefined to fall back to the default thermometer/clamp. */
  measure?: (s: GameState, p: Probe) => Reading | undefined;
  perfectRun: (tier: Tier) => Step[];
}
