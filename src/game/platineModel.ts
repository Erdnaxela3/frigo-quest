import { ATM, NO_FAULTS, type Circuit, type Device, type Faults, type FluidId, type Link, type Volume, type VolumeState } from '../physics/types';
import { flow, makeCircuit, makeVolume, step, volumeState } from '../physics/circuit';
import { relax, steadyState } from '../physics/cycle';
import { P_ATM, R, tsat } from '../physics/refrigerants';
import type { ComponentId, PortId, SceneView, SegmentState, TargetId } from './sceneIds';
import type { Bench, GameState, Hose, Probe, Reading, Socket, Tier } from './types';

// PLATINE R32 split, compressor-off model as volumes (L). Running, the cycle model drives the system volumes.
export const SYSTEM = { hp: 1.6, liq: 0.2, lp: 1.6, comp: 0.8 } as const; // hp: discharge→condenser→receiver→liquid valve; liq: →TXV; lp: evaporator→gas valve; comp: valve→compressor
const RUN_SHARE = { hp: 0.7, liq: 0.05, lp: 0.2, comp: 0.05 } as const;
export const HOSE_V = 0.07; // L: 1/4" low-loss hose 1.8 m with fittings
const MANIFOLD_V = 0.02;
const K = 4e-4; // hose / valve
const K_CORELESS = 1.6e-3;
const K_INTERNAL = 2e-5; // HP↔LP through the stopped compressor
const K_TXV = 1e-4;
export const DT = 0.1; // s, fixed physics step

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
  charge?: number; // kg refrigerant in the system, default 1.2
  running?: boolean;
  Tamb?: number; // default 30 running, 20 stopped
  Troom?: number; // default 25
  faults?: Partial<Faults>;
  hoses?: Hose[];
  bench?: Bench;
  volumes?: Volume[]; // extra volumes, e.g. { id: 'cyl' } with bench.cylinder
  nameplate?: string;
}

/** A charged PLATINE: service valves back-seated, caps on, 2-way manifold with blue/red/yellow hoses mounted. Mutate the result in Level.setup. */
export function makePlatine(o: PlatineOpts): GameState {
  const fluid = o.fluid ?? 'R32', running = !!o.running, charge = o.charge ?? 1.2;
  const Tamb = o.Tamb ?? (running ? 30 : 20);
  const sysV = SYSTEM.hp + SYSTEM.liq + SYSTEM.lp + SYSTEM.comp;
  const hoses = o.hoses ?? defaultHoses();
  const vols = [
    ...Object.entries(SYSTEM).map(([id, V]) => makeVolume(id, V, { T: Tamb, mRef: (charge * V) / sysV })),
    airVolume('manifold', MANIFOLD_V, Tamb),
    ...hoses.map((h) => airVolume(`hose:${h.id}`, HOSE_V, Tamb)),
    ...(o.volumes ?? []),
  ];
  const s: GameState = {
    levelId: o.levelId, tier: o.tier, fluid, t: 0, timeScale: 1,
    circuit: makeCircuit(fluid, vols, [], [], Tamb),
    running: false, cycle: null,
    plant: { Tamb, Troom: o.Troom ?? 25, txvSH: 5, faults: { ...NO_FAULTS, ...o.faults }, nominalCharge: 1.2 },
    valves: { liquid: 'open', gas: 'back', solenoid: false },
    caps: { 'port.hp': true, 'port.lp': true, 'port.liq': true, 'valve.liquid': true, 'valve.gas': true },
    cores: {},
    manifold: { scale: fluid, fourWay: false, valves: { lp: false, hp: false, vac: false, charge: false } },
    hoses, bench: o.bench ?? {}, leaks: [], oilStains: [], bulbAttached: true,
    nameplate: o.nameplate ?? `Plaque signalétique : ${fluid} · charge 1,2 kg · PS HP 42 bar / BP 25 bar · 230 V 50 Hz`,
    tool: null, probes: [], inspected: [], answers: {}, vars: {},
    journal: [], mistakes: [], done: [], hintLevel: {}, hintPenalty: 0, disconnects: 0, lastVentG: 0, lastProgressT: 0,
    toast: null, finished: null, undo: null,
  };
  if (running) startUnit(s);
  return s;
}

const sysIds = Object.keys(SYSTEM) as (keyof typeof SYSTEM)[];
export const systemRef = (s: GameState) => sysIds.reduce((m, id) => m + s.circuit.volumes[id].mRef, 0);

function runningTarget(s: GameState) {
  const p = s.plant;
  return steadyState({
    fluid: s.fluid, Tamb: p.Tamb, Troom: p.Troom, txvSH: p.txvSH, dTevapNominal: 15,
    faults: { ...p.faults, chargeRatio: systemRef(s) / p.nominalCharge },
  });
}

export function startUnit(s: GameState) {
  s.running = true;
  s.cycle = runningTarget(s);
  forceSystem(s);
}

export function stopUnit(s: GameState) {
  s.running = false;
  s.cycle = null;
  for (const id of sysIds) s.circuit.volumes[id].Tdrive = null;
}

// Running: the compressor keeps the charge distributed and the pressures at the cycle point; saturation temperatures do that in the static model.
function forceSystem(s: GameState) {
  const c = s.circuit, m = systemRef(s), cy = s.cycle!;
  const Th = tsat(s.fluid, cy.HP, 'bubble'), Tl = tsat(s.fluid, cy.BP, 'dew');
  for (const id of sysIds) {
    const v = c.volumes[id];
    v.mRef = m * RUN_SHARE[id];
    v.T = v.Tdrive = id === 'hp' || id === 'liq' ? Th : Tl;
  }
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
  switch (sock) {
    case 'port.hp': return { vol: 'hp', open: 1, k: k(sock), liquid: false };
    case 'port.liq': return { vol: 'hp', open: 1, k: k(sock), liquid: true };
    case 'port.lp': return { vol: 'comp', open: b(s.valves.gas !== 'back'), k: k(sock), liquid: false };
    case 'mf.lp': return { vol: 'manifold', open: b(mv.lp), k: K, liquid: true };
    case 'mf.hp': return { vol: 'manifold', open: b(mv.hp), k: K, liquid: true };
    case 'mf.center': return { vol: 'manifold', open: fw ? b(mv.charge) : 1, k: K, liquid: true };
    case 'mf.vac': return { vol: 'manifold', open: fw ? b(mv.vac) : 0, k: 2 * K, liquid: true };
    case 'cyl.gas': return { vol: 'cyl', open: b(cyl?.gas), k: K, liquid: false };
    case 'cyl.liq': return { vol: 'cyl', open: b(cyl?.liq), k: K, liquid: true };
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
  if (!s.running) {
    add('internal', 'hp', 'comp', K_INTERNAL, 1);
    add('txv', 'liq', 'lp', K_TXV, s.valves.solenoid ? 1 : 0, true);
    add('valve.liquid', 'hp', 'liq', K, s.valves.liquid === 'open' ? 1 : 0, true, true);
    add('valve.gas', 'lp', 'comp', K, s.valves.gas !== 'front' ? 1 : 0, true, true);
  }
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
  c.links = links;
  c.devices = devices;
}

/** One fixed physics step. Returns a journal message when a safety device trips. */
export function physicsStep(s: GameState, h = DT): string | undefined {
  let msg: string | undefined;
  if (s.running) {
    if (s.valves.gas === 'front' || s.valves.liquid === 'closed') {
      // simplification: no pump-down transient, KP1 trips at once; model the BP fall if L09 needs it.
      stopUnit(s);
      msg = 'Pressostat BP (KP1) : coupure, l\'aspiration est tirée au vide.';
    } else {
      s.cycle = relax(s.cycle!, runningTarget(s), h);
      forceSystem(s);
    }
  }
  syncLinks(s);
  // pre-existing leaks are the fault being diagnosed, not the player's emission: tally them apart from the score
  for (const l of s.circuit.links) if (l.id.startsWith('leak:')) s.leakedRef = (s.leakedRef ?? 0) + Math.max(0, flow(s.circuit, l).ref) * h;
  step(s.circuit, h);
  s.t += h;
  return msg;
}

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
      discharge: 'vapour', condenser: 'twoPhase', liquid: 'liquid',
      liquidAfterFilter: sightGlass === 'clair' ? 'liquid' : 'twoPhase', evaporator: 'twoPhase', suction: 'vapour',
    };
    if (cy.Tevap < 0) frost.evaporator = frost['comp.evaporator'] = true;
    if (cy.Tsuction < 0) frost.suction = frost['comp.txvBulb'] = true;
  } else {
    const hp = vs(s, 'hp'), liq = vs(s, 'liq'), lp = vs(s, 'lp');
    segments = {
      discharge: segState(hp), condenser: segState(hp), liquid: segState(hp),
      liquidAfterFilter: segState(liq), evaporator: segState(lp), suction: segState(lp),
    };
    sightGlass = hp.Pref < 0.3 * hp.P ? 'vide' : hp.liquidFraction > 0.2 ? 'clair' : hp.liquidFraction > 0 ? 'bulles' : 'vide';
    const T = (id: string) => s.circuit.volumes[id].T;
    if (T('lp') < 0) frost.evaporator = frost.suction = frost['comp.evaporator'] = true;
    if (T('hp') < 0) frost.liquid = frost['comp.receiver'] = true;
  }
  const hoses: SceneView['hoses'] = {};
  for (const h of s.hoses) if (h.port && h.port.startsWith('port.')) hoses[h.port as PortId] = h.color;
  return {
    running: s.running, segments, frost, sightGlass, hoses, highlight,
    valves: { 'valve.liquid': s.valves.liquid, 'valve.gas': s.valves.gas },
    fans: { cond: s.running && f.condFanOk, evap: s.running && f.evapFanOk },
    oilStains: s.oilStains, bulbAttached: s.bulbAttached,
  };
}

type Zone = 'suction' | 'liquid' | 'liqLine' | 'discharge' | 'evap' | 'cond';
const ZONES: Partial<Record<TargetId, Zone>> = {
  'comp.txvBulb': 'suction', 'joint.evapOut': 'suction', 'joint.compSuction': 'suction', 'valve.gas': 'suction',
  'port.lp': 'suction', 'joint.gasValve': 'suction', 'comp.kp1': 'suction', 'joint.kp1Cap': 'suction',
  'joint.condOut': 'liquid', 'comp.receiver': 'liquid', 'comp.filter': 'liquid', 'joint.filterIn': 'liquid',
  'joint.filterOut': 'liquid', 'comp.sightglass': 'liquid', 'valve.liquid': 'liquid', 'joint.liqValve': 'liquid', 'port.liq': 'liquid',
  'comp.solenoid': 'liqLine', 'joint.txvIn': 'liqLine',
  'joint.compDischarge': 'discharge', 'joint.condIn': 'discharge', 'port.hp': 'discharge', 'comp.kp5': 'discharge',
  'joint.kp5Cap': 'discharge', 'comp.compressor': 'discharge',
  'comp.evaporator': 'evap', 'joint.txvOut': 'evap', 'comp.txv': 'evap',
  'comp.condenser': 'cond',
};
const ZONE_VOL: Record<Zone, string> = { suction: 'lp', liquid: 'hp', liqLine: 'liq', discharge: 'hp', evap: 'lp', cond: 'hp' };
const ZONE_LABEL: Record<Zone, string> = {
  suction: 'aspiration', liquid: 'ligne liquide', liqLine: 'ligne liquide', discharge: 'refoulement', evap: 'évaporateur', cond: 'condenseur',
};
const AIR: Partial<Record<ComponentId, 'amb' | 'room'>> = { 'comp.condFan': 'amb', 'comp.evapFan': 'room', 'comp.thermostat': 'room' };

/** Default live reading of a thermometer / clamp meter probe. */
export function defaultReading(s: GameState, p: Probe): Reading | undefined {
  const cy = s.cycle;
  if (p.tool === 'clamp') {
    if (p.target !== 'comp.compressor' && p.target !== 'comp.elecBox') return undefined;
    return { label: 'Intensité compresseur', value: s.running && cy ? cy.current : 0, unit: 'A' };
  }
  if (p.tool !== 'thermometer') return undefined;
  const air = AIR[p.target as ComponentId];
  if (air) return { label: air === 'amb' ? 'Air extérieur' : 'Air intérieur', value: air === 'amb' ? s.plant.Tamb : s.plant.Troom, unit: '°C' };
  const z = ZONES[p.target];
  if (!z) return undefined;
  const label = `T ${ZONE_LABEL[z]}`;
  if (s.running && cy) {
    const v = { suction: cy.Tsuction, liquid: cy.Tliquid, liqLine: cy.Tliquid, discharge: cy.Tdischarge, evap: cy.Tevap + 1, cond: cy.Tcond }[z];
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
