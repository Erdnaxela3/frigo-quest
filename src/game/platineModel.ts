import { ATM, NO_FAULTS, type Circuit, type Device, type Faults, type FluidId, type Link, type Volume, type VolumeState } from '../physics/types';
import { flow, makeCircuit, makeVolume, step, volumeState } from '../physics/circuit';
import { boxStep, pressostatAllows, relax, steadyState } from '../physics/cycle';
import { P_ATM, R, fluid as fluidData, rhoVapSat, toAbs, toRel, tsat } from '../physics/refrigerants';
import type { ComponentId, JointId, PortId, SceneView, SegmentState, TargetId } from './sceneIds';
import type { Bench, GameState, GasDetector, Hose, Kp, Probe, Reading, Regulator, Room, RoomLevel, Socket, Tier } from './types';

// PLATINE R32 split, compressor-off model as volumes (L). Running, the cycle model drives the system volumes,
// except during a pump-down transient where the compressor is a transfer device comp → hp on the static circuit.
// hp: discharge→condenser→receiver; filt: receiver valve→filter→sight glass→liquid valve; liq: →solenoid→TXV;
// lp: evaporator→gas valve; comp: gas valve→compressor.
export const SYSTEM = { hp: 1.4, filt: 0.2, liq: 0.2, lp: 1.6, comp: 0.8 } as const;
export type SystemVolume = keyof typeof SYSTEM;
export const SYSTEM_IDS = Object.keys(SYSTEM) as SystemVolume[];
const RUN_SHARE: Record<SystemVolume, number> = { hp: 0.65, filt: 0.05, liq: 0.05, lp: 0.2, comp: 0.05 };
export const HOSE_V = 0.07; // L: 1/4" low-loss hose 1.8 m with fittings
const MANIFOLD_V = 0.02;
const K = 4e-4; // hose / valve
const K_CORELESS = 1.6e-3;
const K_SUCTION = 1e-2; // 5/8" suction line through the gas valve: must outflow the compressor during a pump-down
const K_OPEN = 2e-3; // circuit opened to air (component removed)
// simplification: one leak for valves + scroll back-flow; low enough that a pumped-down unit holds a few minutes.
const K_INTERNAL = 1e-6; // HP→LP through the stopped compressor
const K_TXV = 1e-4;
const COMP_SWEPT = 2; // m³/h, 3.5 kW R32 scroll
const TAU_FAN = 10; // s, coil + fan heat exchange during a pump-down (TAU_T of circuit.ts is the still-air value)
export const DT = 0.1; // s, fixed physics step
/** ¼-turn of a pressostat spindle, bar. */
export const KP_STEP = { kp1: { range: 0.15, diff: 0.1 }, kp5: { range: 0.5, diff: 0.2 } } as const;
export const KP_LIMITS = { kp1: { range: [-0.2, 7.5], diff: [0.7, 4] }, kp5: { range: [8, 46], diff: [1.8, 6] } } as const;
// simplification: Danfoss KVP 0–5.5 bar / KVR 5–17.5 bar ranges; bar per ¼ turn and "clockwise = higher" are to verify per model.
export const REG_STEP = { kvp: 0.1, kvr: 0.25 } as const;
export const REG_LIMITS = { kvp: [0, 5.5], kvr: [5, 17.5] } as const;

const M_AIR = 28.96e-3, M_N2 = 28.013e-3;
/** Ideal-gas mass (kg) of air or N₂ at P bar abs in V litres. */
export const gasMass = (P: number, V: number, gas: 'air' | 'n2' = 'air', T = 20) =>
  (P * 1e5 * V * 1e-3 * (gas === 'air' ? M_AIR : M_N2)) / (R * (T + 273.15));

const airVolume = (id: string, V: number, T: number) => makeVolume(id, V, { T, mAir: gasMass(P_ATM, V, 'air', T) });

export const defaultHoses = (): Hose[] => [
  { id: 'blue', color: 'blue', manifold: 'mf.lp', port: null, valve: true },
  { id: 'red', color: 'red', manifold: 'mf.hp', port: null, valve: true },
  { id: 'yellow', color: 'yellow', manifold: 'mf.center', port: null, valve: false },
];

export interface PlatineOpts {
  levelId: string;
  tier: Tier;
  fluid?: FluidId; // default R32
  charge?: number; // kg refrigerant in the system, default = nominalCharge
  /** Label charge, kg. Default 1.2 kg for R32; other fluids: `charge` if given, else the board's 1.2 kg R32 scaled by liquid density.
   * System volumes scale with it (a 0.15 kg R290 case gets a small circuit). */
  nominalCharge?: number;
  running?: boolean;
  Tamb?: number; // default 30 running, 20 stopped
  Troom?: number; // default 25
  faults?: Partial<Faults>;
  hoses?: Hose[];
  bench?: Bench;
  volumes?: Volume[]; // extra volumes, e.g. { id: 'cyl' } with bench.cylinder
  system?: Partial<Record<SystemVolume, number>>; // override system volumes (L), e.g. { hp: 1.1 } = receiver too small
  nameplate?: string;
}

/** A charged PLATINE: service valves back-seated, caps on, 2-way manifold with blue/red/yellow hoses mounted. Mutate the result in Level.setup. */
export function makePlatine(o: PlatineOpts): GameState {
  const fluid = o.fluid ?? 'R32', running = !!o.running;
  const boardCharge = (1.2 * fluidData(fluid).rhoLiq25) / fluidData('R32').rhoLiq25;
  const nominalCharge = o.nominalCharge ?? (fluid !== 'R32' && o.charge ? o.charge : boardCharge);
  const charge = o.charge ?? nominalCharge;
  const Tamb = o.Tamb ?? (running ? 30 : 20);
  const sys = Object.fromEntries(SYSTEM_IDS.map((id) => [id, o.system?.[id] ?? (SYSTEM[id] * nominalCharge) / boardCharge])) as Record<SystemVolume, number>;
  const sysV = SYSTEM_IDS.reduce((v, id) => v + sys[id], 0);
  const hoses = o.hoses ?? defaultHoses();
  const vols = [
    ...SYSTEM_IDS.map((id) => makeVolume(id, sys[id], { T: Tamb, mRef: (charge * sys[id]) / sysV })),
    airVolume('manifold', MANIFOLD_V, Tamb),
    ...hoses.map((h) => airVolume(`hose:${h.id}`, HOSE_V, Tamb)),
    ...(o.volumes ?? []),
  ];
  const s: GameState = {
    levelId: o.levelId, tier: o.tier, fluid, t: 0, timeScale: 1,
    circuit: makeCircuit(fluid, vols, [], [], Tamb),
    unitOn: false, running: false, cycle: null, starts: [], opened: [], suctionLiquid: 0,
    elec: { locked: false, voltageChecked: false, crankHeaterOnSince: -86400 },
    plant: {
      Tamb, Troom: o.Troom ?? 25, txvSH: 5, faults: { ...NO_FAULTS, ...o.faults }, nominalCharge, control: 'direct',
      kp1: { kind: 'BP', range: 2, diff: 1.5, scaleError: 0, tripped: false },
      kp5: { kind: 'HP', range: 36, diff: 4, manualReset: true, scaleError: 0, tripped: false },
    },
    valves: { liquid: 'open', gas: 'back', receiver: 'open', solenoid: false },
    caps: { 'port.hp': true, 'port.lp': true, 'port.liq': true, 'port.evap': true, 'valve.liquid': true, 'valve.gas': true, 'valve.receiver': true },
    cores: {},
    manifold: { scale: fluid, fourWay: false, valves: { lp: false, hp: false, vac: false, charge: false }, opening: {} },
    hoses, bench: o.bench ?? {}, leaks: [], oilStains: [], bulbAttached: true,
    nameplate: o.nameplate ?? `Plaque signalétique : ${fluid} · charge ${kg(nominalCharge)} kg · PS HP 42 bar / BP 25 bar · 230 V 50 Hz`,
    tool: null, probes: [], inspected: [], answers: {}, vars: {},
    journal: [], mistakes: [], done: [], hintLevel: {}, hintPenalty: 0, disconnects: 0, lastVentG: 0, lastProgressT: 0,
    toast: null, finished: null, undo: null,
  };
  if (running) startUnit(s);
  return s;
}

const kg = (x: number) => String(+x.toFixed(3)).replace('.', ',');

export const systemRef = (s: GameState) => SYSTEM_IDS.reduce((m, id) => m + s.circuit.volumes[id].mRef, 0);

const regFloor = (r?: Regulator) => (r?.enabled ? toAbs(r.setting) : undefined);

function runningTarget(s: GameState) {
  const p = s.plant;
  return steadyState({
    fluid: s.fluid, Tamb: p.Tamb, Troom: p.Troom, txvSH: p.txvSH, dTevapNominal: 15,
    faults: { ...p.faults, chargeRatio: systemRef(s) / p.nominalCharge },
    evapPressureFloor: regFloor(p.kvp), condPressureFloor: regFloor(p.kvr),
  });
}

/** Switches the unit on and puts the compressor at its steady running point at once (level setups). */
export function startUnit(s: GameState) {
  s.unitOn = true;
  s.running = true;
  if (transient(s)) return enterTransient(s);
  s.cycle = runningTarget(s);
  forceSystem(s);
}

/** Switches the unit off. */
export function stopUnit(s: GameState) {
  s.unitOn = false;
  stopCompressor(s);
}

function stopCompressor(s: GameState) {
  s.running = false;
  s.cycle = null;
  for (const id of SYSTEM_IDS) s.circuit.volumes[id].Tdrive = null;
}

// Automatic or manual start under the controls: the cycle relaxes from the pressures the gauges show.
function startCompressor(s: GameState) {
  s.running = true;
  s.starts.push(s.t);
  if (transient(s)) return enterTransient(s);
  s.cycle = { ...runningTarget(s), BP: P(s, 'comp'), HP: P(s, 'hp') };
  forceSystem(s);
}

// Running: the compressor keeps the charge distributed and the pressures at the cycle point; saturation temperatures do that in the static model.
function forceSystem(s: GameState) {
  const c = s.circuit, m = systemRef(s), cy = s.cycle!;
  const Th = tsat(s.fluid, cy.HP, 'bubble'), Tl = tsat(s.fluid, cy.BP, 'dew'), Ts = tsat(s.fluid, cy.BPsuction ?? cy.BP, 'dew');
  for (const id of SYSTEM_IDS) {
    const v = c.volumes[id];
    v.mRef = m * RUN_SHARE[id];
    v.T = v.Tdrive = id === 'hp' || id === 'filt' || id === 'liq' ? Th : id === 'comp' ? Ts : Tl;
  }
}

/** Solenoid open: manual opener, or powered (direct control: whenever the unit is on; pump-down control: thermostat calling). */
export const solenoidOpen = (s: GameState) =>
  s.valves.solenoid || (s.unitOn && !s.elec.locked && !s.plant.faults.solenoidStuck && (s.plant.control === 'direct' || thermoCall(s)));
const thermoCall = (s: GameState) => s.plant.thermostat?.call ?? true;
/** Liquid can reach the TXV: receiver valve, liquid valve and solenoid open. */
export const liquidPathOpen = (s: GameState) => s.valves.receiver === 'open' && s.valves.liquid === 'open' && solenoidOpen(s);
/** Compressor running on a closed path (pump-down) or a closed suction: static circuit + compressor transfer, no cycle. */
export const transient = (s: GameState) => s.running && (!liquidPathOpen(s) || s.valves.gas === 'front');

function enterTransient(s: GameState) {
  s.cycle = null;
  const c = s.circuit, comp = c.volumes.comp;
  for (const id of SYSTEM_IDS) c.volumes[id].Tdrive = null;
  // the running share left liquid in the compressor volume; it belongs in the evaporator
  const vap = rhoVapSat(s.fluid, comp.T) * comp.V * 1e-3;
  if (comp.mRef > vap) { c.volumes.lp.mRef += comp.mRef - vap; comp.mRef = vap; }
}

// simplification: below 30 % charge the cycle model is meaningless; KP1 then reads the circuit as empty.
const kpBP = (s: GameState) => (systemRef(s) < 0.3 * s.plant.nominalCharge ? -1 : toRel(P(s, 'comp')));
const f1 = (x: number) => x.toFixed(1).replace('.', ',');

/** Safety devices and thermostat → compressor start/stop. Returns a journal message. */
export function control(s: GameState): string | undefined {
  const p = s.plant, bp = kpBP(s), hp = toRel(P(s, 'hp'));
  const kp = (k: Kp, P: number) => { k.tripped = !pressostatAllows(k, P, !k.tripped); };
  const was5 = p.kp5.tripped;
  kp(p.kp1, bp);
  kp(p.kp5, hp);
  const want = s.unitOn && !s.elec.locked && !p.kp1.tripped && !p.kp5.tripped && (p.control === 'pumpDown' || thermoCall(s));
  if (s.running && !want) {
    stopCompressor(s);
    if (p.kp5.tripped && !was5) return `Pressostat HP (KP5) : coupure à ${f1(hp)} bar${p.kp5.manualReset ? ', réarmement manuel nécessaire' : ''}.`;
    if (p.kp1.tripped) return `Pressostat BP (KP1) : coupure à ${f1(bp)} bar, le compresseur s'arrête.`;
    if (!thermoCall(s)) return `Thermostat : consigne atteinte (${f1(p.Troom)} °C), arrêt du compresseur.`;
    return undefined;
  }
  if (!s.running && want) {
    startCompressor(s);
    return `Compresseur en marche (BP ${f1(bp)} bar).`;
  }
  return undefined;
}

export const hoseAt = (s: GameState, sock: Socket): Hose | undefined => s.hoses.find((h) => h.manifold === sock || h.port === sock);
export const hoseVol = (h: Hose | string) => `hose:${typeof h === 'string' ? h : h.id}`;
export const P = (s: GameState, id: string) => (id === ATM ? P_ATM : volumeState(s.circuit, id).P);
export const vs = (s: GameState, id: string): VolumeState => volumeState(s.circuit, id);
/** Refrigerant in a volume, g. */
export const refG = (s: GameState, id: string) => s.circuit.volumes[id].mRef * 1000;

interface Node { vol: string; open: number; k: number; liquid: boolean }

function socketNode(s: GameState, sock: Socket): Node | null {
  const k = (p: PortId) => (s.cores[p] ? K_CORELESS : K);
  const mv = s.manifold.valves, fw = s.manifold.fourWay, cyl = s.bench.cylinder;
  const b = (x: boolean | undefined) => (x ? 1 : 0);
  const o = (v: keyof typeof mv) => b(mv[v]) * (s.manifold.opening[v] ?? 1);
  switch (sock) {
    case 'port.hp': return { vol: 'hp', open: 1, k: k(sock), liquid: false };
    case 'port.liq': return { vol: 'filt', open: 1, k: k(sock), liquid: true };
    case 'port.evap': return { vol: 'lp', open: 1, k: k(sock), liquid: false };
    case 'port.lp': return { vol: 'comp', open: b(s.valves.gas !== 'back'), k: k(sock), liquid: false };
    case 'mf.lp': return { vol: 'manifold', open: o('lp'), k: K, liquid: true };
    case 'mf.hp': return { vol: 'manifold', open: o('hp'), k: K, liquid: true };
    case 'mf.center': return { vol: 'manifold', open: fw ? o('charge') : 1, k: K, liquid: true };
    case 'mf.vac': return { vol: 'manifold', open: fw ? o('vac') : 0, k: 2 * K, liquid: true };
    case 'cyl.gas': return { vol: 'cyl', open: b(cyl?.gas), k: K, liquid: !!cyl?.inverted };
    case 'cyl.liq': return { vol: 'cyl', open: b(cyl?.liq && cyl.dipTube !== false), k: K, liquid: !cyl?.inverted };
    default: return null; // device sockets
  }
}

/** Rebuilds circuit links and devices from the discrete state (valves, hoses, bench). */
export function syncLinks(s: GameState) {
  const c = s.circuit, links: Link[] = [], devices: Device[] = [];
  const add = (id: string, a: string, b: string, k: number, open: number, liqA = false, liqB = false) => {
    if (open <= 0) return;
    const up = P(s, a) >= P(s, b);
    links.push({ id, a, b, k, open, liquidSide: up ? (liqA ? 'a' : undefined) : liqB ? 'b' : undefined });
  };
  const tr = transient(s);
  if (!s.running || tr) {
    if (!s.running) add('internal', 'hp', 'comp', K_INTERNAL, 1);
    add('txv', 'liq', 'lp', K_TXV, solenoidOpen(s) ? 1 : 0, true);
    add('valve.receiver', 'hp', 'filt', K, s.valves.receiver === 'open' ? 1 : 0, true, true);
    add('valve.liquid', 'filt', 'liq', K, s.valves.liquid === 'open' ? 1 : 0, true, true);
    // running, the suction line draws vapour off the evaporator
    add('valve.gas', 'lp', 'comp', K_SUCTION, s.valves.gas !== 'front' ? 1 : 0, !s.running, !s.running);
  }
  for (const id of s.opened) add(`open:${id}`, id, ATM, K_OPEN, 1, true);
  for (const h of s.hoses) {
    const hv = hoseVol(h);
    for (const end of ['manifold', 'port'] as const) {
      const sock = h[end], gate = end === 'port' && !h.valve ? 0 : 1;
      if (!sock) { add(`${hv}:${end}:atm`, hv, ATM, K, gate, true); continue; }
      const n = socketNode(s, sock);
      if (n) add(`${hv}:${end}`, hv, n.vol, n.k, gate * n.open, true, n.liquid);
    }
  }
  for (const l of s.leaks) add(`leak:${l.at}:${l.joint ?? ''}`, l.at, ATM, l.k, 1);
  const at = (sock: Socket) => { const h = hoseAt(s, sock); return h && hoseVol(h); };
  const { pump, recovery, n2 } = s.bench;
  const pumpAt = at('pump'), recIn = at('rec.in'), n2At = at('n2');
  if (pump && pumpAt) devices.push({ kind: 'vacuumPump', id: 'pump', at: pumpAt, on: pump.on, speed: pump.speed, ultimate: pump.ultimate });
  if (recovery && recIn) devices.push({ kind: 'transfer', id: 'recovery', from: recIn, to: at('rec.out') ?? ATM, on: recovery.on, speed: recovery.speed, cutoff: recovery.cutoff });
  if (n2 && n2At) devices.push({ kind: 'n2', id: 'n2', at: n2At, open: n2.open, setpoint: n2.setpoint, k: K });
  if (tr) devices.push({ kind: 'transfer', id: 'compressor', from: 'comp', to: 'hp', on: true, speed: COMP_SWEPT * s.plant.faults.compEff, cutoff: 0.02 });
  c.links = links;
  c.devices = devices;
}

// Relieving N₂ regulator: a setpoint below the outlet pressure bleeds the hose gas (N₂/air only) down to it.
function relieveN2(s: GameState) {
  const n2 = s.bench.n2, h = hoseAt(s, 'n2');
  if (!n2 || !h) return;
  const v = s.circuit.volumes[hoseVol(h)], Pv = P(s, hoseVol(h));
  if (Pv <= n2.setpoint) return;
  const f = 1 - n2.setpoint / Pv;
  s.circuit.emitted.n2 += v.mN2 * f; s.circuit.emitted.air += v.mAir * f;
  v.mN2 *= 1 - f; v.mAir *= 1 - f;
}

const fanRelax = (s: GameState, id: string, T: number, h: number) => {
  const v = s.circuit.volumes[id];
  v.T += (T - v.T) * (1 - Math.exp(-h / TAU_FAN));
};

/** One fixed physics step. Returns a journal message when a safety device or the thermostat acts. */
export function physicsStep(s: GameState, h = DT): string | undefined {
  const p = s.plant, th = p.thermostat;
  if (p.box) p.Troom = boxStep(p.Troom, !!s.cycle, s.cycle?.capacityKW ?? 0, h, { Tamb: p.Tamb, ...p.box });
  if (th) th.call = th.call ? p.Troom > th.setpoint : p.Troom >= th.setpoint + th.diff;
  if (s.elec.locked) s.elec.crankHeaterOnSince = null;
  else s.elec.crankHeaterOnSince ??= s.t;
  relieveN2(s);
  const msg = control(s);
  if (transient(s)) {
    if (s.cycle) enterTransient(s);
  } else if (s.running) {
    s.cycle ??= { ...runningTarget(s), BP: P(s, 'comp'), HP: P(s, 'hp') };
    s.cycle = relax(s.cycle, runningTarget(s), h);
    forceSystem(s);
  }
  syncLinks(s);
  // the small hose volume makes the instantaneous flow jumpy: average over ~2 s
  s.suctionLiquid += (suctionLiquid(s) - s.suctionLiquid) * (1 - Math.exp(-h / 2));
  // pre-existing leaks are the fault being diagnosed, not the player's emission: tally them apart from the score
  for (const l of s.circuit.links) if (l.id.startsWith('leak:')) s.leakedRef = (s.leakedRef ?? 0) + Math.max(0, flow(s.circuit, l).ref) * h;
  step(s.circuit, h);
  const fire = roomStep(s, h);
  if (transient(s)) {
    if (p.faults.condFanOk) fanRelax(s, 'hp', p.Tamb, h);
    if (p.faults.evapFanOk) fanRelax(s, 'lp', p.Troom, h);
  }
  s.t += h;
  return msg ?? fire;
}

// ---- Flammable refrigerant in the room (L13) ----

const FLOOR_SHARE = 0.2; // floor layer: lower 0.5 m of a 2.5 m room
const SNIFF = 5e-4; // m³/s of air a detector probe sees mixed with a local leak
/** Detector resolution: below this a detector reads 0 and a torch is safe. */
export const TRACE_LFL = 1;

/** A room of `volume` m³ with `ach` natural air changes per hour; `fanAch` adds an ATEX fan (off). */
export const makeRoom = (volume: number, ach = 0.5, fanAch?: number): Room =>
  ({ volume, ach, fan: fanAch ? { on: false, ach: fanAch } : undefined, floor: 0, head: 0 });

const lflPct = (s: GameState, kgm3: number) => {
  const lfl = fluidData(s.fluid).lfl;
  return lfl ? (100 * kgm3) / lfl : 0;
};
/** Room concentration at floor or head level, % LFL (0 without a room or for a non-flammable fluid). */
export const concentration = (s: GameState, at: RoomLevel) => (s.room ? lflPct(s, s.room[at]) : 0);

// Every gram reaching circuit.emitted (hose vent, open section, leak, recovery to air) lands in the floor layer.
function roomStep(s: GameState, h: number): string | undefined {
  const r = s.room;
  if (!r) return undefined;
  const e = s.circuit.emitted.ref, dm = e - (r.seen ?? e);
  r.seen = e;
  const Vf = FLOOR_SHARE * r.volume, Vh = r.volume - Vf, fan = !!r.fan?.on;
  if (!r.outside) r.floor += dm / Vf;
  const q = (r.ach + (fan ? r.fan!.ach : 0)) / 3600, ex = (fan ? 1 / 30 : 1 / 900) * (r.floor - r.head);
  r.floor -= h * (q * r.floor + ex);
  r.head += h * ((ex * Vf) / Vh - q * r.head);
  if (s.ignitionEvent) return undefined;
  for (const src of s.ignition ?? []) {
    const c = concentration(s, src.level ?? 'floor');
    if (!src.active || c < 100) continue;
    s.ignitionEvent = { t: s.t, source: src.id, lfl: c };
    return `Inflammation : atmosphère explosive (${Math.round(c)} % LIE) au contact de « ${src.label} ».`;
  }
  return undefined;
}

const targetVolume = (t: TargetId): string | undefined => JOINT_VOLUME[t as JointId] ?? (ZONES[t] && ZONE_VOL[ZONES[t]!]);

/** Refrigerant escaping at a board target, % LFL: content of an opened section, or a leak's plume. */
export function localLFL(s: GameState, t: TargetId): number {
  const vol = targetVolume(t);
  if (!vol) return 0;
  let kgm3 = s.opened.includes(vol) ? s.circuit.volumes[vol].mRef / (s.circuit.volumes[vol].V * 1e-3) : 0;
  for (const l of s.circuit.links) if (l.id.startsWith(`leak:${vol}:`)) kgm3 += Math.max(0, flow(s.circuit, l).ref) / SNIFF;
  return lflPct(s, kgm3);
}

/**
 * Torch / brazing at a board target: ignites if refrigerant is present there (opened section not purged,
 * leak, floor-level concentration) above TRACE_LFL. Sets s.ignitionEvent and returns true; the level decides the consequence.
 */
export function torchIgnition(s: GameState, t: TargetId): boolean {
  const c = concentration(s, 'floor') + localLFL(s, t);
  if (c <= TRACE_LFL) return false;
  s.ignitionEvent ??= { t: s.t, source: 'torch', lfl: c };
  return true;
}

export const gasDetector = (s: GameState): GasDetector => s.gasDetector ?? { on: false, position: 'floor', battery: 'ok' };
export const detectorWorks = (s: GameState) => { const d = gasDetector(s); return d.on && d.battery !== 'empty'; };

/** Portable HC detector reading, % LFL (0–100), at its position; with a target, plus what escapes there. */
export function gasReading(s: GameState, t?: TargetId): Reading {
  const d = gasDetector(s);
  if (!detectorWorks(s)) return { label: 'Détecteur de gaz (éteint)', value: 0, unit: '% LIE', digits: 0 };
  const v = concentration(s, d.position) + (t ? localLFL(s, t) : 0);
  return {
    label: `Détecteur de gaz ${d.position === 'floor' ? 'au sol' : 'à hauteur de tête'}${d.battery === 'low' ? ' · batterie faible' : ''}`,
    value: Math.min(100, v), unit: '% LIE', digits: 0,
  };
}

/** Liquid refrigerant reaching the compressor (g/s, ~2 s average) while it runs, e.g. charging liquid through the BP. */
export const liquidIntoSuction = (s: GameState) => s.suctionLiquid;

function suctionLiquid(s: GameState): number {
  if (!s.running) return 0;
  let g = 0;
  for (const l of s.circuit.links) {
    if (l.a !== 'comp' && l.b !== 'comp') continue;
    const q = flow(s.circuit, l).ref, into = l.b === 'comp' ? q : -q;
    if (into <= 0) continue;
    const up = l.b === 'comp' ? l.a : l.b, st = vs(s, up);
    const liquid = (l.liquidSide === (l.b === 'comp' ? 'a' : 'b') && st.liquidFraction > 0) || st.phase === 'liquidFull';
    if (liquid) g += into * 1000;
  }
  return g;
}

/** Which circuit volume a joint sits on. */
export const JOINT_VOLUME: Record<JointId, SystemVolume> = {
  'joint.compDischarge': 'hp', 'joint.condIn': 'hp', 'joint.condOut': 'hp', 'joint.kp5Cap': 'hp',
  'joint.filterIn': 'filt', 'joint.filterOut': 'filt',
  'joint.liqValve': 'liq', 'joint.txvIn': 'liq',
  'joint.txvOut': 'lp', 'joint.evapOut': 'lp', 'joint.gasValve': 'lp',
  'joint.compSuction': 'comp', 'joint.kp1Cap': 'comp',
};
export const jointVolume = (j: JointId) => JOINT_VOLUME[j];

/**
 * Opens circuit volumes to the air (component removed): from the next step they vent / breathe through K_OPEN.
 * Returns the highest pressure found before opening, bar rel: > 0.5 = opened under pressure, < 0 = under vacuum (air sucked in).
 */
export function openSection(s: GameState, ids: string[]): number {
  for (const id of ids) if (!s.opened.includes(id)) s.opened.push(id);
  return Math.max(...ids.map((id) => toRel(P(s, id))));
}
export function closeSection(s: GameState, ids: string[]) {
  s.opened = s.opened.filter((id) => !ids.includes(id));
}

/** Compressor starts within the last `window` sim s. Short-cycling: startsWithin(s) > 6. */
export const startsWithin = (s: GameState, window = 600) => s.starts.filter((t) => s.t - t <= window).length;

/** Cylinder valve delivering liquid (dip tube / inverted cylinder). */
export const cylinderLiquid = (s: GameState, valve: 'gas' | 'liq') => !!socketNode(s, `cyl.${valve}`)?.liquid;

export const gaugeP = (s: GameState, sock: 'mf.lp' | 'mf.hp') => {
  const h = hoseAt(s, sock);
  return h ? P(s, hoseVol(h)) : P_ATM;
};

function segState(v: VolumeState): SegmentState {
  if (v.P < 0.3 && v.Pref < 0.05) return 'vacuum';
  if (v.Pref < 0.3 * v.P) return v.PN2 > v.PAir ? 'n2' : 'empty';
  return v.phase === 'liquidFull' ? 'liquid' : v.phase === 'twoPhase' ? 'twoPhase' : 'vapour';
}

export function sceneView(s: GameState, highlight: TargetId[] = []): SceneView {
  const cy = s.cycle, f = s.plant.faults;
  let segments: SceneView['segments'], sightGlass: SceneView['sightGlass'];
  const frost: SceneView['frost'] = {};
  if (s.running && cy) {
    sightGlass = cy.sightGlass;
    segments = {
      discharge: 'vapour', condenser: 'twoPhase', liquid: 'liquid', filterLine: 'liquid',
      liquidAfterFilter: sightGlass === 'clair' ? 'liquid' : 'twoPhase', evaporator: 'twoPhase', suction: 'vapour',
    };
    if (cy.Tevap < 0) frost.evaporator = frost['comp.evaporator'] = true;
    if (cy.Tsuction < 0) frost.suction = frost['comp.txvBulb'] = true;
  } else {
    const hp = vs(s, 'hp'), filt = vs(s, 'filt'), liq = vs(s, 'liq'), lp = vs(s, 'lp');
    segments = {
      discharge: segState(hp), condenser: segState(hp), liquid: segState(hp), filterLine: segState(filt),
      liquidAfterFilter: segState(liq), evaporator: segState(lp), suction: segState(lp),
    };
    sightGlass = filt.Pref < 0.3 * filt.P ? 'vide' : filt.liquidFraction > 0.2 ? 'clair' : filt.liquidFraction > 0 ? 'bulles' : 'vide';
    const T = (id: string) => s.circuit.volumes[id].T;
    if (T('lp') < 0) frost.evaporator = frost.suction = frost['comp.evaporator'] = true;
    if (T('hp') < 0) frost.liquid = frost['comp.receiver'] = true;
  }
  const hoses: SceneView['hoses'] = {};
  for (const h of s.hoses) if (h.port && h.port.startsWith('port.')) hoses[h.port as PortId] = h.color;
  return {
    kvp: !!s.plant.kvp, kvr: !!s.plant.kvr,
    title: `PLATINE DIDACTIQUE · ${s.fluid === 'R32' ? 'SPLIT ' : ''}${s.fluid} · ${kg(s.plant.nominalCharge)} kg`,
    running: s.running, segments, frost, sightGlass, hoses, highlight,
    valves: { 'valve.liquid': s.valves.liquid, 'valve.gas': s.valves.gas, 'valve.receiver': s.valves.receiver },
    fans: { cond: s.running && f.condFanOk, evap: s.running && f.evapFanOk },
    oilStains: s.oilStains, bulbAttached: s.bulbAttached, troom: s.plant.Troom,
  };
}

type Zone = 'suction' | 'liquid' | 'filtIn' | 'filtOut' | 'liqLine' | 'discharge' | 'evap' | 'cond';
const ZONES: Partial<Record<TargetId, Zone>> = {
  'comp.txvBulb': 'suction', 'joint.evapOut': 'suction', 'joint.compSuction': 'suction', 'valve.gas': 'suction', 'port.evap': 'suction',
  'port.lp': 'suction', 'joint.gasValve': 'suction', 'comp.kp1': 'suction', 'joint.kp1Cap': 'suction',
  'joint.condOut': 'liquid', 'comp.receiver': 'liquid', 'valve.receiver': 'liquid', 'comp.filter': 'filtIn', 'joint.filterIn': 'filtIn',
  'joint.filterOut': 'filtOut', 'comp.sightglass': 'filtOut', 'valve.liquid': 'filtOut', 'port.liq': 'filtOut',
  'joint.liqValve': 'liqLine', 'comp.solenoid': 'liqLine', 'joint.txvIn': 'liqLine',
  'joint.compDischarge': 'discharge', 'joint.condIn': 'discharge', 'port.hp': 'discharge', 'comp.kp5': 'discharge',
  'joint.kp5Cap': 'discharge', 'comp.compressor': 'discharge',
  'comp.evaporator': 'evap', 'joint.txvOut': 'evap', 'comp.txv': 'evap',
  'comp.condenser': 'cond',
  'comp.kvp': 'suction', 'comp.kvr': 'discharge',
};
const ZONE_VOL: Record<Zone, string> = { suction: 'lp', liquid: 'hp', filtIn: 'filt', filtOut: 'filt', liqLine: 'liq', discharge: 'hp', evap: 'lp', cond: 'hp' };
const ZONE_LABEL: Record<Zone, string> = {
  suction: 'aspiration', liquid: 'ligne liquide', filtIn: 'entrée filtre', filtOut: 'sortie filtre', liqLine: 'ligne liquide',
  discharge: 'refoulement', evap: 'évaporateur', cond: 'condenseur',
};
const AIR: Partial<Record<ComponentId, 'amb' | 'room'>> = { 'comp.condFan': 'amb', 'comp.evapFan': 'room', 'comp.thermostat': 'room' };

/** Default live reading of a thermometer / clamp meter probe. */
export function defaultReading(s: GameState, p: Probe): Reading | undefined {
  const cy = s.cycle;
  if (p.tool === 'gasDetector') return gasReading(s, p.target);
  if (p.tool === 'clamp') {
    if (p.target !== 'comp.compressor' && p.target !== 'comp.elecBox') return undefined;
    // pump-down transient: no cycle, the unloaded compressor draws about half its nominal current
    return { label: 'Intensité compresseur', value: !s.running ? 0 : cy ? cy.current : 2.2, unit: 'A' };
  }
  if (p.tool !== 'thermometer') return undefined;
  const air = AIR[p.target as ComponentId];
  if (air) return { label: air === 'amb' ? 'Air extérieur' : 'Air intérieur', value: air === 'amb' ? s.plant.Tamb : s.plant.Troom, unit: '°C' };
  const z = ZONES[p.target];
  if (!z) return undefined;
  const label = `T ${ZONE_LABEL[z]}`;
  if (s.running && cy) {
    const after = cy.Tliquid - cy.filterDT;
    const v = { suction: cy.Tsuction, liquid: cy.Tliquid, filtIn: cy.Tliquid, filtOut: after, liqLine: after, discharge: cy.Tdischarge, evap: cy.Tevap + 1, cond: cy.Tcond }[z];
    return { label, value: v, unit: '°C' };
  }
  return { label, value: s.circuit.volumes[ZONE_VOL[z]].T, unit: '°C' };
}

/** Moves a volume's whole content to the atmosphere (counted as emission). Returns refrigerant g. */
export function vent(c: Circuit, id: string): number {
  const v = c.volumes[id], g = v.mRef * 1000;
  c.emitted.ref += v.mRef; c.emitted.n2 += v.mN2; c.emitted.air += v.mAir; c.emitted.h2o += v.mH2O;
  Object.assign(v, { mRef: 0, mN2: 0, mAir: gasMass(P_ATM, v.V, 'air', v.T), mH2O: 0 });
  return g;
}
