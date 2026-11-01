import { makeVolume } from '../physics/circuit';
import { fluid as fluidData } from '../physics/refrigerants';
import type { Faults, FluidId, TxvState } from '../physics/types';
import { JOINTS, type JointId } from '../game/sceneIds';
import { JOINT_VOLUME, SYSTEM_IDS, vs } from '../game/platineModel';
import { makePlatine } from '../game/platineModel';
import { fmt } from '../game/engine';
import type { CustomAction, GameState, Level } from '../game/types';

export const SANDBOX_FLUIDS: FluidId[] = ['R32', 'R410A', 'R290', 'R134a', 'R449A', 'R407C'];
const CYL_V = 12; // L

const fillCylinder = (s: GameState) => {
  const c = s.circuit.volumes.cyl;
  Object.assign(c, { mRef: 0.4 * CYL_V * fluidData(s.fluid).rhoLiq25 / 1000, mAir: 0, mN2: 0, mH2O: 0 });
};

type BoolFault = 'condFanOk' | 'evapFanOk' | 'solenoidStuck';
type LevelFault = 'condFouling' | 'evapFrost' | 'filterRestriction';
const BOOL: [BoolFault, string, boolean][] = [
  ['condFanOk', 'Ventilateur condenseur HS', false], ['evapFanOk', 'Ventilateur évaporateur HS', false], ['solenoidStuck', 'Électrovanne bloquée fermée', true],
];
const LEVEL: [LevelFault, string][] = [['condFouling', 'Condenseur encrassé'], ['evapFrost', 'Évaporateur givré'], ['filterRestriction', 'Filtre déshydrateur colmaté']];
const TXV: [TxvState, string][] = [['ok', 'normal'], ['tooOpen', 'trop ouvert'], ['tooClosed', 'trop fermé'], ['bulbLost', 'bulbe vide (charge perdue)'], ['bulbLoose', 'bulbe mal fixé']];
const yn = (b: boolean) => (b ? 'oui' : 'non');
const f = (s: GameState): Faults => s.plant.faults;

const actions: CustomAction[] = [
  { id: 'tamb', label: (s) => `Air extérieur (${fmt(s.plant.Tamb, 0)} °C)`, input: { unit: '°C', min: -10, max: 45, step: 1 } },
  { id: 'troom', label: (s) => `Air intérieur (${fmt(s.plant.Troom, 0)} °C)`, input: { unit: '°C', min: 0, max: 35, step: 1 } },
  ...BOOL.map(([k, label, bad]): CustomAction => ({ id: k, label: (s) => `${label} : ${yn(f(s)[k] === bad)}` })),
  ...LEVEL.map(([k, label]): CustomAction => ({ id: k, label: (s) => `${label} : ${f(s)[k] ? `${Math.round(f(s)[k] * 100)} %` : 'non'}` })),
  { id: 'txv', label: (s) => `Détendeur : ${TXV.find(([t]) => t === f(s).txv)![1]}` },
  { id: 'comp', label: (s) => `Compresseur usé : ${f(s).compEff < 1 ? `rendement ${Math.round(f(s).compEff * 100)} %` : 'non'}` },
  { id: 'leak', label: (s) => `Créer une fuite cachée (${s.leaks.length} en cours)` },
  { id: 'fixLeaks', label: 'Réparer toutes les fuites', visible: (s) => s.leaks.length > 0 },
  { id: 'air', label: 'Faire entrer de l\'air dans le circuit (incondensables)' },
  { id: 'refill', label: 'Remplacer la bouteille par une pleine' },
  { id: 'fourWay', label: (s) => `Manifold ${s.manifold.fourWay ? '4' : '2'} voies (changer)` },
  { id: 'repair', label: 'Tout réparer (pannes, fuites, détendeur)' },
];

const cycle = <T,>(xs: T[], cur: T) => xs[(xs.indexOf(cur) + 1) % xs.length];

function onAction(s: GameState, a: Parameters<NonNullable<Level['onAction']>>[1]): string | void {
  if (a.type !== 'custom') return;
  const msg = apply(s, a.id, a.value);
  if (msg) return msg;
  const label = actions.find((c) => c.id === a.id)?.label;
  return typeof label === 'function' ? label(s) : label;
}

function apply(s: GameState, id: string, value: number | string | undefined): string | void {
  const fl = f(s), v = typeof value === 'number' ? value : NaN;
  switch (id) {
    case 'tamb': s.plant.Tamb = Math.max(-10, Math.min(45, v)); return `Air extérieur réglé à ${fmt(s.plant.Tamb, 0)} °C`;
    case 'troom': s.plant.Troom = Math.max(0, Math.min(35, v)); return `Air intérieur réglé à ${fmt(s.plant.Troom, 0)} °C`;
    case 'condFanOk': case 'evapFanOk': fl[id] = !fl[id]; return;
    case 'solenoidStuck': fl.solenoidStuck = !fl.solenoidStuck; return;
    case 'condFouling': case 'evapFrost': case 'filterRestriction': fl[id] = cycle([0, 0.4, 0.8], fl[id]); return;
    case 'txv': fl.txv = cycle(TXV.map(([t]) => t), fl.txv); return;
    case 'comp': fl.compEff = cycle([1, 0.7, 0.4], fl.compEff); return;
    case 'leak': {
      const free = (Object.keys(JOINTS) as JointId[]).filter((j) => !s.leaks.some((l) => l.joint === j));
      if (!free.length) return 'Tous les raccords fuient déjà.';
      const joint = free[Math.floor(Math.random() * free.length)];
      s.leaks.push({ at: JOINT_VOLUME[joint], k: 1e-7 * (1 + 4 * Math.random()), joint });
      if (Math.random() < 0.5) s.oilStains.push(joint);
      return 'Une fuite est apparue quelque part… à vous de la trouver.';
    }
    case 'fixLeaks': s.leaks = []; s.oilStains = []; return 'Fuites réparées';
    case 'air': {
      const hp = s.circuit.volumes.hp;
      hp.mAir += 0.0015 * hp.V; // ≈ 1 bar of air in the condenser side
      return 'De l\'air est entré dans le circuit';
    }
    case 'refill': fillCylinder(s); return 'Bouteille pleine en place';
    case 'fourWay':
      if (s.hoses.some((h) => h.manifold === 'mf.vac' || h.port === 'mf.vac')) return 'Déposez d\'abord le flexible de la voie vide.';
      s.manifold.fourWay = !s.manifold.fourWay;
      s.manifold.valves.vac = s.manifold.valves.charge = false;
      return;
    case 'repair':
      Object.assign(fl, { condFanOk: true, evapFanOk: true, solenoidStuck: false, condFouling: 0, evapFrost: 0, filterRestriction: 0, txv: 'ok', compEff: 1 });
      s.leaks = []; s.oilStains = [];
      return 'Platine remise en état';
  }
}

export function makeSandbox(fl: FluidId): Level {
  return {
    id: `LIBRE-${fl}`,
    sandbox: true,
    title: `Atelier libre · platine ${fl}`,
    skills: [],
    lesson: 'circuit',
    scene: 'PLATINE',
    fluid: fl,
    briefing: 'Aucune consigne, aucune note : la platine est à vous. Banc complet (pompe à vide, station de récupération, azote, bouteille sur balance, '
      + 'vacuomètre), pannes à injecter et conditions d\'air réglables dans « Commandes ». Le journal garde la trace de tout.',
    tierNotes: { guide: '', standard: '', examen: '' },
    tools: ['hand', 'wrench', 'screwdriver', 'thermometer', 'clamp', 'detector', 'soap', 'coreTool'],
    unitControl: true,
    setup(tier) {
      const s = makePlatine({
        levelId: `LIBRE-${fl}`, tier, fluid: fl, running: true,
        hoses: [
          { id: 'blue', color: 'blue', manifold: 'mf.lp', port: null, valve: true },
          { id: 'red', color: 'red', manifold: 'mf.hp', port: null, valve: true },
          { id: 'yellow', color: 'yellow', manifold: 'mf.center', port: null, valve: false },
          { id: 'récup', color: 'yellow', manifold: null, port: null, valve: true },
        ],
        bench: {
          pump: { on: false, speed: 3.4, ultimate: 5e-5 },
          recovery: { on: false, speed: 0.5, cutoff: 0.7 },
          n2: { open: false, setpoint: 11 },
          cylinder: { label: `Bouteille ${fl} 12 L (tube plongeur)`, gas: false, liq: false, tare: 7, dipTube: true },
          scaleTare: 0,
          vacuumGaugeAt: 'manifold',
        },
        volumes: [makeVolume('cyl', CYL_V, { T: 30 })],
      });
      fillCylinder(s);
      return s;
    },
    objectives: [],
    rules: [],
    answers: [],
    actions,
    onAction,
    onTick(s) {
      // air or N₂ left in the system ends up in the condenser while running
      const nc = SYSTEM_IDS.reduce((x, id) => { const st = vs(s, id); return x + (st.PAir + st.PN2) * s.circuit.volumes[id].V; }, 0);
      s.plant.faults.nonCondBar = nc / s.circuit.volumes.hp.V;
    },
    measure(s, p) {
      if (!(p.target in JOINTS)) return undefined;
      const leak = s.leaks.find((l) => l.joint === p.target);
      const pressurised = vs(s, JOINT_VOLUME[p.target as JointId]).P > 1.5;
      const on = !!leak && pressurised;
      if (p.tool === 'soap') return { label: 'Produit moussant', value: on ? Math.round(leak!.k * 2e8) : 0, unit: 'bulles/min', digits: 0 };
      if (p.tool === 'detector') return { label: 'Détecteur électronique', value: on ? Math.round(leak!.k * 1e8) : 0, unit: 'g/an', digits: 0 };
    },
    perfectRun: () => [],
  };
}

export const isSandboxId = (id: string | undefined) => !!id?.startsWith('LIBRE');
const cache = new Map<FluidId, Level>();
export const sandboxFor = (id: string) => {
  const s = id.slice(6) as FluidId, fl = SANDBOX_FLUIDS.includes(s) ? s : 'R32';
  if (!cache.has(fl)) cache.set(fl, makeSandbox(fl));
  return cache.get(fl)!;
};
