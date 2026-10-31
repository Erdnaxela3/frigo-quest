import { P_ATM } from '../physics/refrigerants';
import { gasMass, hoseAt, hoseVol, makePlatine, P, vs } from '../game/platineModel';
import type { JointId } from '../game/sceneIds';
import type { Action, GameState, Level, Socket, Step, Tier } from '../game/types';

export const TARGET = 0.002; // bar abs, CAP limit (2 mbar); pros aim at 500 microns ≈ 0.67 mbar
const HOLD_S = 600;
const SYS = ['hp', 'liq', 'lp', 'comp'];
const VARIANTS = ['dry', 'wet', 'leak', 'pump'] as const;
const VERDICTS = ['Vide tenu : OK', 'Humidité (remontée puis palier)', 'Fuite (remontée linéaire sans fin)', 'Pompe défectueuse (n\'atteint pas le vide)'];
const GAUGE = { circuit: 'comp', pump: hoseVol('vac') };
const LEAKS: [JointId, string][] = [['joint.evapOut', 'lp'], ['joint.filterOut', 'hp'], ['joint.txvIn', 'liq'], ['joint.compSuction', 'comp']];

const mfOpen = (s: GameState, sock: Socket) => {
  const v = s.manifold.valves;
  return sock === 'mf.lp' ? v.lp : sock === 'mf.hp' ? v.hp : sock === 'mf.center' ? v.charge : sock === 'mf.vac' && v.vac;
};
const reaches = (s: GameState, ports: Socket[]) =>
  s.hoses.some((h) => h.port && ports.includes(h.port) && h.valve && h.manifold?.startsWith('mf.') && mfOpen(s, h.manifold)
    && (h.port !== 'port.lp' || s.valves.gas !== 'back'));
const lpSide = (s: GameState) => reaches(s, ['port.lp']);
const hpSide = (s: GameState) => reaches(s, ['port.hp', 'port.liq']);
const pumpLinked = (s: GameState) => {
  const h = hoseAt(s, 'pump');
  return !!h && h.valve && (h.manifold === 'pump' ? h.port : h.manifold) === 'mf.vac' && s.manifold.valves.vac;
};
// pump → manifold → circuit is open
const linked = (s: GameState) => pumpLinked(s) && (lpSide(s) || hpSide(s));
const pumpOn = (s: GameState) => !!s.bench.pump?.on;
export const circ = (s: GameState) => P(s, 'comp');
const maxSys = (s: GameState) => Math.max(...SYS.map((id) => P(s, id)));
const gaugeAtPump = (s: GameState) => s.bench.vacuumGaugeAt === GAUGE.pump;
export const waterG = (s: GameState) => SYS.reduce((g, id) => g + s.circuit.volumes[id].mH2O, 0) * 1000;
export const variant = (s: GameState) => s.vars.variant as (typeof VARIANTS)[number];

const truth = (s: GameState) => (s.bench.pump!.ultimate > 1e-3 ? 3 : s.leaks.length ? 2 : waterG(s) > 0.1 ? 1 : 0);
// 'pompe défectueuse' is read on the isolated pump; every other verdict needs a real standing test
const holdFor = (s: GameState, v: number) => v === 3
  ? pumpOn(s) && !pumpLinked(s) && gaugeAtPump(s) && !!hoseAt(s, 'pump')
  : !gaugeAtPump(s) && circ(s) < 0.1 && typeof s.vars.holdT0 === 'number' && s.t - s.vars.holdT0 >= HOLD_S - 0.5;

function n2Fill(s: GameState) {
  for (const id of SYS) Object.assign(s.circuit.volumes[id], { mRef: 0, mAir: 0, mN2: gasMass(P_ATM + 8, s.circuit.volumes[id].V, 'n2', 20) });
}

const L04: Level = {
  id: 'L04',
  title: 'Tirage au vide',
  skills: ['A1:3.03', 'A1:3.04', 'A1:12.09', 'CAP:UP3.vide'],
  lesson: 'vide-pression',
  scene: 'PLATINE',
  fluid: 'R32',
  briefing: 'La platine sort d\'un essai d\'étanchéité : elle est sous 8 bar relatifs d\'azote, sans fluide. Vidangez l\'azote par le manifold '
    + 'jusqu\'à 0 bar relatif, puis réalisez le tirage au vide par la BP et la HP (manifold 4 voies, pompe à vide 2 étages, vacuomètre électronique). '
    + 'Objectif CAP : moins de 2 mbar absolus (les pros visent 500 microns ≈ 0,67 mbar). Terminez par un essai de tenue au vide : '
    + 'isolez la pompe, arrêtez-la, observez au moins 10 min, puis concluez.',
  tierNotes: {
    guide: 'Circuit sec et étanche.',
    standard: 'Circuit humide (4 g d\'eau) : l\'eau bout sous vide et bloque la pression vers 20–23 mbar à 20 °C.',
    examen: 'Situation aléatoire (sec, humide, micro-fuite ou huile de pompe contaminée), 60 min.',
  },
  tools: ['hand', 'wrench', 'coreTool'],
  unitControl: true,
  timeLimit: 60 * 60,

  setup(tier: Tier, rng) {
    const v = tier === 'guide' ? 'dry' : tier === 'standard' ? 'wet' : VARIANTS[Math.floor(rng() * VARIANTS.length)];
    const s = makePlatine({
      levelId: 'L04', tier, charge: 0, Tamb: 20,
      hoses: [
        { id: 'blue', color: 'blue', manifold: 'mf.lp', port: null, valve: true },
        { id: 'red', color: 'red', manifold: 'mf.hp', port: null, valve: true },
        { id: 'yellow', color: 'yellow', manifold: 'mf.center', port: null, valve: false },
        { id: 'vac', color: 'yellow', manifold: null, port: null, valve: true },
      ],
      bench: { pump: { on: false, speed: 3.4, ultimate: v === 'pump' ? 5e-3 : 5e-5 }, vacuumGaugeAt: GAUGE.pump },
    });
    s.manifold.fourWay = true;
    n2Fill(s);
    // simplification: 4 g, not the 10 g of the spec: the manifold valves cap the boil-off at ~0.2 g/min, 10 g would be a 50 min plateau.
    if (v === 'wet') s.circuit.volumes.lp.mH2O = s.circuit.volumes.hp.mH2O = 0.002;
    if (v === 'leak') {
      const [joint, at] = LEAKS[Math.floor(rng() * LEAKS.length)];
      s.leaks.push({ at, k: 2e-8, joint });
    }
    s.vars.variant = v;
    return s;
  },

  actions: [
    { id: 'gauge-circuit', label: 'Vacuomètre : côté circuit', visible: (s) => gaugeAtPump(s) },
    { id: 'gauge-pump', label: 'Vacuomètre : sur la pompe', visible: (s) => !gaugeAtPump(s) },
  ],

  onAction(s, a) {
    if (a.type === 'custom' && a.id.startsWith('gauge-')) {
      const at = a.id === 'gauge-pump' ? 'pump' : 'circuit';
      s.bench.vacuumGaugeAt = GAUGE[at];
      return at === 'pump' ? 'Vacuomètre déplacé sur la pompe' : 'Vacuomètre déplacé côté circuit (prise BP)';
    }
    if (a.type === 'answer' && a.field === 'verdict') s.vars.verdictValid = holdFor(s, a.value);
  },

  onTick(s, dt) {
    if (pumpOn(s) && pumpLinked(s) && P(s, 'manifold') > P_ATM + 0.5) s.vars.overP = true;
    if (!linked(s) && !pumpOn(s)) s.vars.holdT0 ??= s.t - dt;
    else delete s.vars.holdT0;
  },

  inspect(s, target) {
    if (target !== 'comp.compressor') return undefined;
    const v = vs(s, 'comp');
    return `${s.nameplate}. Circuit : ${v.PN2 > 0.05 ? 'azote' : 'air / vide'}, ${(v.P * 1000).toFixed(1).replace('.', ',')} mbar abs.`;
  },

  objectives: [
    {
      id: 'vent', label: 'Vidanger l\'azote par le manifold jusqu\'à 0 bar relatif',
      done: (s) => maxSys(s) <= P_ATM + 0.05,
      hints: ['L\'azote se rejette à l\'air, mais par le manifold, pas en dévissant un flexible sous pression.',
        'Retirez les bouchons BP et HP et le chapeau de vanne gaz, raccordez bleu sur BP et rouge sur HP, vanne gaz en position milieu, '
        + 'puis ouvrez BP, HP et la vanne vide du manifold avec le flexible de vide libre.', ['port.lp', 'port.hp', 'valve.gas']],
    },
    {
      id: 'connect', label: 'Ouvrir le circuit côté BP et côté HP, électrovanne ouverte (ouverture manuelle)',
      done: (s) => lpSide(s) && hpSide(s) && s.valves.solenoid,
      hints: ['Tirer par un seul côté laisse la HP piégée derrière le compresseur et l\'électrovanne.',
        'Manifold BP et HP ouverts, vanne gaz en position milieu, posez l\'ouverture manuelle de l\'électrovanne.', ['comp.solenoid', 'valve.gas']],
    },
    {
      id: 'pump', label: 'Pompe sur la voie vide du manifold, vacuomètre côté circuit, pompe en marche',
      done: (s) => pumpOn(s) && pumpLinked(s) && !gaugeAtPump(s),
      hints: ['Un vacuomètre sur la pompe mesure la pompe, pas le circuit.',
        'Flexible de vide : manifold « vide » → pompe. Choisissez « Vacuomètre : côté circuit », puis démarrez la pompe.'],
    },
    {
      id: 'pull', label: 'Tirer au vide sous 2 mbar absolus (pro : 500 microns ≈ 0,67 mbar)',
      done: (s) => circ(s) <= TARGET || (s.answers.verdict?.ok && s.answers.verdict.value === 3 && !!s.vars.verdictValid),
      hints: ['Si la pression reste bloquée vers 20–25 mbar, c\'est de l\'eau qui bout : continuez à tirer.',
        'Obus retirés (démonte-obus) : débit ×4. Patientez (accélérez le temps) en surveillant le vacuomètre.', ['port.lp', 'port.hp']],
    },
    {
      id: 'hold', label: 'Essai de tenue : isoler la pompe, l\'arrêter, observer 10 min, conclure',
      done: (s) => !!s.answers.verdict?.ok && !!s.vars.verdictValid && s.answers.verdict.value !== 1,
      hints: ['Toujours isoler avant d\'arrêter la pompe. Palier ≈ humidité, remontée linéaire = fuite.',
        'Fermez la vanne vide du manifold, arrêtez la pompe, attendez 10 min, puis choisissez votre conclusion. Humidité : retirez encore et refaites l\'essai.'],
    },
  ],

  answers: [{ id: 'verdict', label: 'Essai de tenue', unit: '', tol: 0, expected: truth, choices: VERDICTS }],

  rules: [
    {
      id: 'pump-on-pressure', severity: 'major', skill: 'A1:3.03', lesson: 'vide-pression',
      message: 'Pompe à vide mise sur un circuit sous pression (> 0,5 bar relatif) : l\'huile est chassée, la pompe s\'abîme. Vidangez l\'azote d\'abord.',
      when: ({ s }) => !!s.vars.overP || (pumpOn(s) && pumpLinked(s) && P(s, 'manifold') > P_ATM + 0.5),
    },
    {
      id: 'one-side-only', severity: 'minor', skill: 'A1:3.04', lesson: 'vide-pression',
      message: 'Tirage par un seul côté : lent, et la HP reste piégée derrière les clapets du compresseur et l\'électrovanne.',
      when: ({ a, s }) => a.type === 'device' && a.device === 'pump' && a.on && lpSide(s) !== hpSide(s),
    },
    {
      id: 'gauge-at-pump', severity: 'minor', skill: 'A1:3.04', lesson: 'vide-pression',
      message: 'Vacuomètre sur la pompe pendant le tirage : il lit le vide de la pompe, pas celui du circuit (pertes de charge des flexibles).',
      when: ({ s }) => pumpOn(s) && linked(s) && gaugeAtPump(s),
    },
    {
      id: 'stop-before-isolate', severity: 'major', skill: 'A1:3.03', lesson: 'vide-pression',
      message: 'Pompe arrêtée avant d\'être isolée : l\'huile de la pompe remonte dans le flexible et le vide est perdu. Fermez la vanne, puis arrêtez.',
      when: ({ a, prev }) => a.type === 'device' && a.device === 'pump' && !a.on && pumpOn(prev) && linked(prev) && circ(prev) < P_ATM - 0.1,
    },
    {
      id: 'wrong-verdict', severity: 'major', skill: 'A1:3.04', lesson: 'vide-pression',
      message: 'Mauvaise interprétation de l\'essai de tenue : palier vers 20–25 mbar = humidité, remontée linéaire sans fin = fuite, '
        + 'pompe isolée qui n\'atteint pas le vide = pompe (huile) en cause.',
      when: ({ a, s }) => a.type === 'answer' && a.field === 'verdict' && !s.answers.verdict?.ok,
    },
    {
      id: 'compressor-under-vacuum', severity: 'critical', skill: 'A1:6.06', lesson: 'circuit',
      message: 'Compresseur mis sous tension sous vide : sans fluide pour refroidir et isoler, le bobinage moteur peut claquer.',
      when: ({ a, prev }) => a.type === 'setUnit' && a.on && circ(prev) < 0.5,
    },
    {
      id: 'skip-hold', severity: 'major', skill: 'A1:3.04', lesson: 'vide-pression',
      message: 'Pas d\'essai de tenue valable : pompe isolée et arrêtée, vacuomètre côté circuit, au moins 10 min d\'observation.',
      when: ({ a, s }) => (a.type === 'answer' && a.field === 'verdict' && !holdFor(s, a.value)) || (a.type === 'finish' && !s.vars.verdictValid),
    },
  ],

  perfectRun() {
    const noop: Action = { type: 'pickTool', tool: null };
    const when = (p: (s: GameState) => boolean, a: Action): Step => (s) => (p(s) ? a : noop);
    const waitUntil = (p: (s: GameState) => boolean, seconds: number, n: number): Step[] =>
      Array.from({ length: n }, () => (s: GameState) => (p(s) ? noop : { type: 'wait', seconds }));
    const is = (...v: string[]) => (s: GameState) => v.includes(variant(s));
    const standing = (p: (s: GameState) => boolean, verdict: number | ((s: GameState) => number)): Step[] => [
      when(p, { type: 'toggleManifold', valve: 'vac' }),
      when(p, { type: 'device', device: 'pump', on: false }),
      when(p, { type: 'wait', seconds: HOLD_S }),
      (s) => (p(s) ? { type: 'answer', field: 'verdict', value: typeof verdict === 'number' ? verdict : verdict(s) } : noop),
    ];
    const deep = (s: GameState) => circ(s) <= 1.5e-3;
    return [
      { type: 'toggleCap', target: 'port.lp' },
      { type: 'toggleCap', target: 'port.hp' },
      { type: 'toggleCap', target: 'valve.gas' },
      { type: 'connectHose', hose: 'blue', end: 'port', socket: 'port.lp' },
      { type: 'connectHose', hose: 'red', end: 'port', socket: 'port.hp' },
      { type: 'setServiceValve', valve: 'valve.gas', pos: 'mid' },
      { type: 'toggleCore', port: 'port.lp' },
      { type: 'toggleCore', port: 'port.hp' },
      { type: 'connectHose', hose: 'vac', end: 'manifold', socket: 'mf.vac' },
      { type: 'toggleManifold', valve: 'lp' },
      { type: 'toggleManifold', valve: 'hp' },
      { type: 'toggleManifold', valve: 'vac' },
      ...waitUntil((s) => maxSys(s) <= P_ATM + 0.02, 10, 60),
      { type: 'connectHose', hose: 'vac', end: 'port', socket: 'pump' },
      { type: 'toggleSolenoid' },
      { type: 'custom', id: 'gauge-circuit' },
      { type: 'device', device: 'pump', on: true },
      ...waitUntil((s) => deep(s) || (is('wet', 'pump')(s) && s.t > 12 * 60), 60, 30),
      // contaminated pump: isolate it and read the gauge on the pump alone
      when(is('pump'), { type: 'toggleManifold', valve: 'vac' }),
      when(is('pump'), { type: 'custom', id: 'gauge-pump' }),
      when(is('pump'), { type: 'wait', seconds: 30 }),
      when(is('pump'), { type: 'answer', field: 'verdict', value: 3 }),
      when(is('pump'), { type: 'device', device: 'pump', on: false }),
      ...standing(is('dry', 'leak', 'wet'), (s) => (variant(s) === 'leak' ? 2 : variant(s) === 'wet' ? 1 : 0)),
      // wet: the plateau said water, keep pulling until it has boiled off, then test again
      when(is('wet'), { type: 'device', device: 'pump', on: true }),
      when(is('wet'), { type: 'toggleManifold', valve: 'vac' }),
      ...waitUntil((s) => !is('wet')(s) || deep(s), 60, 40),
      ...standing(is('wet'), 0),
      { type: 'finish' },
    ];
  },
};

export default L04;
