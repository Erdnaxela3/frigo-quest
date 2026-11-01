// Clickable targets on the PLATINE board (specs/levels/README.md). Shared by the scene, the engine and the levels.

export const PORTS = {
  'port.hp': 'Prise HP (Schrader refoulement)',
  'port.lp': 'Prise BP (Schrader vanne gaz 3 voies)',
  'port.liq': 'Prise liquide (Schrader vanne 2 voies)',
  'port.evap': 'Prise Schrader sortie évaporateur',
} as const;

export const VALVES = {
  'valve.liquid': 'Vanne de service liquide (2 voies)',
  'valve.gas': 'Vanne de service gaz (3 voies)',
  'valve.receiver': 'Robinet de sortie réservoir',
} as const;

export const COMPONENTS = {
  'comp.compressor': 'Compresseur',
  'comp.crankHeater': 'Résistance de carter',
  'comp.condenser': 'Condenseur',
  'comp.condFan': 'Ventilateur condenseur',
  'comp.receiver': 'Réservoir liquide',
  'comp.filter': 'Filtre déshydrateur',
  'comp.sightglass': 'Voyant liquide',
  'comp.solenoid': 'Électrovanne liquide',
  'comp.txv': 'Détendeur thermostatique (Danfoss TE2)',
  'comp.txvBulb': 'Bulbe du détendeur',
  'comp.evaporator': 'Évaporateur',
  'comp.evapFan': 'Ventilateur évaporateur',
  'comp.kp1': 'Pressostat BP (KP1)',
  'comp.kp5': 'Pressostat HP (KP5)',
  'comp.thermostat': 'Thermostat d\'ambiance',
  'comp.elecBox': 'Coffret électrique',
  'comp.kvp': 'Régulateur de pression d\'évaporation (KVP)',
  'comp.kvr': 'Régulateur de pression de condensation (KVR)',
} as const;

// Brazed / flared joints: leak candidates (A1 4.01).
export const JOINTS = {
  'joint.compDischarge': 'Brasure refoulement compresseur',
  'joint.compSuction': 'Brasure aspiration compresseur',
  'joint.condIn': 'Brasure entrée condenseur',
  'joint.condOut': 'Brasure sortie condenseur',
  'joint.filterIn': 'Dudgeon entrée filtre',
  'joint.filterOut': 'Dudgeon sortie filtre',
  'joint.txvIn': 'Dudgeon entrée détendeur',
  'joint.txvOut': 'Dudgeon sortie détendeur',
  'joint.evapOut': 'Brasure sortie évaporateur',
  'joint.liqValve': 'Dudgeon vanne liquide',
  'joint.gasValve': 'Dudgeon vanne gaz',
  'joint.kp1Cap': 'Capillaire pressostat BP',
  'joint.kp5Cap': 'Capillaire pressostat HP',
} as const;

export type PortId = keyof typeof PORTS;
export type ValveId = keyof typeof VALVES;
export type ComponentId = keyof typeof COMPONENTS;
export type JointId = keyof typeof JOINTS;
export type TargetId = PortId | ValveId | ComponentId | JointId;

export const TARGET_LABELS: Record<TargetId, string> = { ...PORTS, ...VALVES, ...COMPONENTS, ...JOINTS };

// Pipe segments the scene colours by state.
// liquid: condenser → receiver; filterLine: receiver valve → filter → sight glass → liquid valve; liquidAfterFilter: liquid valve → TXV.
export type SegmentId = 'discharge' | 'condenser' | 'liquid' | 'filterLine' | 'liquidAfterFilter' | 'evaporator' | 'suction';
export type SegmentState = 'vapour' | 'liquid' | 'twoPhase' | 'empty' | 'n2' | 'vacuum';

export type ThreeWay = 'back' | 'mid' | 'front'; // contre-siège arrière (prise fermée) / milieu / avant (ligne fermée)
export type HoseColor = 'blue' | 'red' | 'yellow';

/** Everything the PLATINE scene needs to draw. Pure data, no callbacks. */
export interface SceneView {
  running: boolean;
  segments: Record<SegmentId, SegmentState>;
  frost: Partial<Record<ComponentId | SegmentId, boolean>>;
  valves: { 'valve.liquid': 'open' | 'closed'; 'valve.gas': ThreeWay; 'valve.receiver': 'open' | 'closed' };
  hoses: Partial<Record<PortId, HoseColor>>; // which hose is screwed on each port
  fans: { cond: boolean; evap: boolean };
  sightGlass: 'clair' | 'bulles' | 'mousse' | 'vide';
  oilStains: JointId[]; // visible oil traces (leak evidence)
  bulbAttached: boolean;
  highlight: TargetId[]; // hint highlight
  troom?: number; // thermostat display, °C
  kvp?: boolean; // draw the KVP (comp.kvp) on the suction line
  kvr?: boolean; // draw the KVR (comp.kvr) on the discharge line
  fluid?: string; // compressor nameplate, default R32
  title?: string; // brass title plate, default 'PLATINE DIDACTIQUE · SPLIT R32 · 1,2 kg'
}
