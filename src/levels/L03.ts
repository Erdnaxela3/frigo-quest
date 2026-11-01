import { flow } from '../physics/circuit';
import { P_ATM, toRel } from '../physics/refrigerants';
import { P, SYSTEM_IDS, gaugeP, gasMass, makePlatine } from '../game/platineModel';
import { fmt, refuse } from '../game/engine';
import type { JointId, TargetId } from '../game/sceneIds';
import type { GameState, Level, Socket, Step, Tier } from '../game/types';

const STRENGTH = 33, TIGHT = 30, HOLD = 30 * 60, STRENGTH_HOLD = 5 * 60; // bar rel, s
const LEAK_AT: Partial<Record<JointId, string>> = {
  'joint.condOut': 'hp', 'joint.filterOut': 'hp', 'joint.compDischarge': 'hp', 'joint.txvIn': 'liq', 'joint.evapOut': 'lp',
};
const GASES = { n2: 'azote déshydraté (OFN)', o2: 'oxygène', air: 'air comprimé (compresseur)', r32: 'R32' } as const;

const K = (T: number) => T + 273.15;
const rel = (s: GameState) => toRel(gaugeP(s, 'mf.hp'));
const circuitRel = (s: GameState) => toRel(Math.max(P(s, 'hp'), P(s, 'lp'), P(s, 'comp')));
const Tc = (s: GameState) => s.circuit.volumes.hp.T;
const num = (s: GameState, k: string) => s.vars[k] as number;
const ok = (s: GameState, ...ids: string[]) => ids.every((id) => s.answers[id]?.ok);
const hoseOn = (s: GameState, port: Socket, mf: Socket) => s.hoses.some((h) => h.port === port && h.manifold === mf);
const leak = (s: GameState) => s.leaks[0];
const isolated = (s: GameState) => !s.manifold.valves.lp && !s.manifold.valves.hp && !s.bench.n2?.open;
// P2 expected from the true P1/T1/T2 captured when the player noted them
const p2Expected = (s: GameState) => toRel(num(s, 'P1') * K(num(s, 'T2')) / K(num(s, 'T1')));

function ambient(s: GameState) {
  const T0 = num(s, 'T0'), t1 = s.vars.tP1 as number | undefined;
  if (t1 === undefined || s.tier === 'guide') return T0;
  return s.tier === 'standard' ? T0 + 10 * Math.min(1, (s.t - t1) / 1200) : T0 - 8 * Math.min(1, (s.t - t1) / 1500);
}

const L03: Level = {
  id: 'L03',
  title: 'Test de pression à l\'azote',
  skills: ['A1:3.01', 'A1:3.02', 'A1:3.05', 'A1:12.08', 'CAP:UP2'],
  lesson: 'vide-pression',
  scene: 'PLATINE',
  fluid: 'R32',
  briefing: 'La platine split R32 vient d\'être réparée (brasures neuves) : elle est vide de fluide, pleine d\'air à la pression atmosphérique. '
    + 'Plaque signalétique : PS HP 42 bar / BP 33 bar. Avant le tirage au vide, réalisez le test de résistance puis le test d\'étanchéité '
    + `aux valeurs du constructeur (notice d'installation, circuit complet) : résistance ${STRENGTH} bar rel maintenus 5 min, `
    + `étanchéité ${TIGHT} bar rel maintenus 30 min. Utilisez l'azote déshydraté avec détendeur, montez en pression par paliers, `
    + 'relevez P1/T1 puis P2/T2 (thermomètre sur une tuyauterie), corrigez la température (P2 attendue = P1 × T2 / T1, en bar absolu et en kelvin), '
    + 'concluez, localisez la fuite éventuelle au produit moussant, relâchez l\'azote et consignez le test.',
  tierNotes: {
    guide: 'Température constante, fuite franche.',
    standard: 'Soleil sur le condenseur pendant le test : la température monte de 10 K et masque une petite fuite.',
    examen: 'Test de nuit : la température baisse de 8 K. Fuite éventuelle aléatoire, 60 min.',
  },
  tools: ['hand', 'wrench', 'thermometer', 'soap'],
  timeLimit: 60 * 60,

  setup(tier: Tier, rng) {
    const T0 = tier === 'examen' ? Math.round(16 + 8 * rng()) : 20;
    const s = makePlatine({
      levelId: 'L03', tier, charge: 0, Tamb: T0, bench: { n2: { open: false, setpoint: P_ATM } },
      nameplate: 'Plaque signalétique : R32 · charge 1,2 kg · PS HP 42 bar / BP 33 bar · 230 V 50 Hz',
    });
    for (const id of SYSTEM_IDS) {
      const v = s.circuit.volumes[id];
      v.mAir = gasMass(P_ATM, v.V, 'air', T0);
    }
    s.vars.T0 = T0;
    // k sized for the 30 min hold at 30 bar: guide ≈ −4 bar, standard ≈ −0.6 bar (less than the +1 bar of the sun), examen ≈ −1.5 bar
    const joint: JointId | undefined = tier === 'guide' ? 'joint.condOut' : tier === 'standard' ? 'joint.filterOut'
      : rng() < 0.5 ? undefined : (['joint.compDischarge', 'joint.txvIn', 'joint.evapOut'] as const)[Math.floor(rng() * 3)];
    if (joint) s.leaks.push({ at: LEAK_AT[joint]!, joint, k: { guide: 3.5e-7, standard: 5e-8, examen: 1.3e-7 }[tier] });
    return s;
  },

  actions: [
    ...(Object.keys(GASES) as (keyof typeof GASES)[]).map((g) => ({
      id: `gas-${g}`, label: `Installer la bouteille : ${GASES[g]}`, visible: (s: GameState) => s.vars.gas !== 'n2',
    })),
    { id: 'solenoid', label: (s: GameState) => `${s.valves.solenoid ? 'Retirer' : 'Poser'} l'ouverture manuelle de l'électrovanne` },
    { id: 'direct', label: 'Ouvrir la bouteille sans détendeur (200 bar)', visible: (s: GameState) => s.vars.gas === 'n2' },
    { id: 'record', label: 'Consigner le test (fiche d\'intervention)', visible: (s: GameState) => !s.vars.recorded },
  ],

  onAction(s, a) {
    if (a.type === 'custom') {
      if (a.id.startsWith('gas-')) {
        const g = a.id.slice(4) as keyof typeof GASES;
        s.vars.gas = g;
        return `Bouteille installée : ${GASES[g]}`;
      }
      if (a.id === 'solenoid') {
        s.valves.solenoid = !s.valves.solenoid;
        return `Électrovanne : ouverture manuelle ${s.valves.solenoid ? 'posée' : 'retirée'}`;
      }
      if (a.id === 'direct') return 'Bouteille ouverte directement sur le manifold, sans détendeur';
      if (a.id === 'record') {
        if (!s.answers.verdict) refuse('Terminez d\'abord le test : relevés P1/T1, P2/T2 et conclusion.');
        s.vars.recorded = true;
        return `Test consigné : résistance ${STRENGTH} bar rel 5 min, étanchéité ${fmt(toRel(num(s, 'P1')))} bar rel, `
          + `${fmt((num(s, 'tP2') - num(s, 'tP1')) / 60, 0)} min, T1 ${fmt(num(s, 'T1'))} °C / T2 ${fmt(num(s, 'T2'))} °C, `
          + `P2 ${fmt(toRel(num(s, 'P2')))} bar rel (attendue ${fmt(p2Expected(s), 2)}), `
          + `${s.answers.verdict.value ? 'fuite' : 'étanche'}`;
      }
    }
    if (a.type === 'connectHose' && a.socket === 'n2' && s.vars.gas !== 'n2') refuse('Installez d\'abord la bouteille d\'azote sur le banc.');
    if (a.type === 'device' && a.device === 'n2' && a.on && s.vars.gas !== 'n2') refuse('Pas de bouteille d\'azote installée.');
    if (a.type === 'answer' && a.field === 'P1') {
      if (!isolated(s)) refuse('Fermez d\'abord le manifold et la bouteille : P1 se relève circuit isolé.');
      Object.assign(s.vars, { P1: gaugeP(s, 'mf.hp'), T1: Tc(s), tP1: s.t });
    }
    if (a.type === 'answer' && a.field === 'P2') {
      if (s.vars.tP1 === undefined) refuse('Relevez d\'abord P1 et T1.');
      const left = HOLD - (s.t - num(s, 'tP1'));
      if (left > 0) refuse(`Maintien de ${HOLD / 60} min minimum : encore ${Math.ceil(left / 60)} min.`);
      Object.assign(s.vars, { P2: gaugeP(s, 'mf.hp'), T2: Tc(s), tP2: s.t });
    }
    if (a.type === 'measure' && a.tool === 'soap' && a.target === leak(s)?.joint && bubbles(s, a.target) > 0) s.vars.found = true;
  },

  onTick(s, dt) {
    s.circuit.ambient = s.plant.Tamb = ambient(s);
    const n2 = s.bench.n2!;
    const r = circuitRel(s);
    if (r >= 5 && toRel(n2.setpoint) <= 11) s.vars.palier = true;
    if (r >= STRENGTH - 1) s.vars.strengthHold = (num(s, 'strengthHold') || 0) + dt;
  },

  measure(s, p) {
    if (p.tool !== 'soap') return undefined;
    if (!p.target.startsWith('joint.')) return undefined;
    return { label: 'Produit moussant, bulles', value: bubbles(s, p.target), unit: '/min', digits: 0 };
  },

  objectives: [
    {
      id: 'gas', label: 'Choisir le gaz d\'essai : azote déshydraté (OFN)',
      done: (s) => s.vars.gas === 'n2',
      hints: ['Un seul gaz convient : inerte, sec, sans huile.', 'Installez la bouteille d\'azote OFN (jamais d\'oxygène, d\'air comprimé ni de fluide frigorigène).'],
    },
    {
      id: 'open', label: 'Ouvrir l\'électrovanne (ouverture manuelle) et les vannes de service',
      done: (s) => s.valves.solenoid && s.valves.gas === 'mid' && s.valves.liquid === 'open',
      hints: ['Tout le circuit doit être testé : aucune vanne interne fermée.',
        'Bouton « Poser l\'ouverture manuelle de l\'électrovanne ». Outil main : retirez le chapeau de la vanne gaz, puis clé de vanne : position milieu.', ['comp.solenoid', 'valve.gas']],
    },
    {
      id: 'connect', label: 'Raccorder azote → détendeur → flexible jaune → manifold, bleu sur la BP, rouge sur la HP',
      done: (s) => hoseOn(s, 'n2', 'mf.center') && hoseOn(s, 'port.lp', 'mf.lp') && hoseOn(s, 'port.hp', 'mf.hp'),
      hints: ['Pressurisez par les deux côtés du circuit à travers le manifold.',
        'Flexible jaune du raccord central vers le détendeur azote ; bouchons retirés, bleu sur la prise BP, rouge sur la prise HP.', ['port.lp', 'port.hp']],
    },
    {
      id: 'palier', label: 'Monter en pression progressivement : premier palier à 5–10 bar rel',
      done: (s) => !!s.vars.palier,
      tiers: ['guide', 'standard'],
      hints: ['Jamais la pleine pression d\'un coup : un palier bas permet de repérer une grosse fuite sans risque.',
        'Ouvrez les vannes BP et HP du manifold, réglez le détendeur à 10 bar rel, ouvrez la bouteille et contrôlez.'],
    },
    {
      id: 'strength', label: `Test de résistance : ${STRENGTH} bar rel maintenus 5 min`,
      done: (s) => num(s, 'strengthHold') >= STRENGTH_HOLD,
      hints: [`Valeur de résistance de la notice : ${STRENGTH} bar rel, sans la dépasser.`,
        `Réglez le détendeur à ${STRENGTH} bar rel et attendez 5 min (accélération du temps).`],
    },
    {
      id: 'tight', label: `Ramener à ${TIGHT} bar rel, fermer le manifold et isoler la bouteille`,
      done: (s) => isolated(s) && Math.abs(rel(s) - TIGHT) <= 0.5,
      hints: ['Le détendeur à décharge purge l\'excédent quand on baisse sa consigne.',
        `Réglez le détendeur à ${TIGHT} bar rel, attendez la stabilisation, fermez la bouteille puis les vannes BP et HP du manifold.`],
    },
    {
      id: 'p1', label: 'Relever P1 et T1',
      done: (s) => ok(s, 'P1', 'T1'),
      hints: ['Pression au manomètre, température de la tuyauterie.', 'Thermomètre sur le condenseur, puis saisissez P1 (bar rel) et T1 (°C).', ['comp.condenser']],
    },
    {
      id: 'hold', label: 'Maintenir 30 min, puis relever P2 et T2',
      done: (s) => ok(s, 'P2', 'T2'),
      hints: ['Le maintien se fait circuit isolé.', 'Accélérez le temps 30 min, puis relevez P2 et T2 aux mêmes points.'],
    },
    {
      id: 'verdict', label: 'Corriger la température et conclure',
      done: (s) => ok(s, 'P2c', 'verdict'),
      hints: ['P/T est constant en unités absolues (bar abs, kelvin).',
        'P2 attendue (abs) = (P1 + 1,013) × (T2 + 273,15) / (T1 + 273,15) ; retranchez 1,013 pour la saisir en bar rel et comparez avec P2 relevée.'],
    },
    {
      id: 'locate', label: 'Localiser la fuite au produit moussant (si fuite)',
      done: (s) => !leak(s) || !!s.vars.found,
      hints: ['Cherchez sur les brasures et dudgeons, circuit sous pression.', 'Outil produit moussant sur chaque raccord : les bulles grossissent au raccord fuyard.'],
    },
    {
      id: 'release', label: 'Relâcher l\'azote (moins de 1 bar rel)',
      done: (s) => circuitRel(s) < 1,
      hints: ['L\'azote se relâche à l\'extérieur : ce n\'est pas une émission réglementée.',
        'Déposez le flexible jaune du détendeur (vanne à boule fermée), ouvrez le manifold puis la vanne à boule du jaune.'],
    },
    {
      id: 'record', label: 'Consigner le test',
      done: (s) => !!s.vars.recorded,
      hints: ['Pression, durée, températures et résultat se consignent.', 'Bouton « Consigner le test ».'],
    },
  ],

  answers: [
    { id: 'P1', label: 'P1', unit: 'bar rel', tol: 0.2, expected: rel },
    { id: 'T1', label: 'T1', unit: '°C', tol: 0.5, expected: Tc },
    { id: 'P2', label: 'P2', unit: 'bar rel', tol: 0.2, expected: rel },
    { id: 'T2', label: 'T2', unit: '°C', tol: 0.5, expected: Tc },
    { id: 'P2c', label: 'P2 attendue (corrigée)', unit: 'bar rel', tol: 0.2, expected: (s) => (s.vars.P2 === undefined ? NaN : p2Expected(s)) },
    { id: 'verdict', label: 'Conclusion', unit: '', tol: 0, expected: (s) => (leak(s) ? 1 : 0), choices: ['étanche', 'fuite'] },
  ],

  rules: [
    {
      id: 'wrong-gas-oxygen', severity: 'critical', skill: 'A1:3.01', lesson: 'vide-pression',
      message: 'Oxygène sous pression au contact de l\'huile : risque d\'explosion. Seul l\'azote déshydraté convient.',
      when: ({ a }) => a.type === 'custom' && a.id === 'gas-o2',
    },
    {
      id: 'wrong-gas-refrigerant', severity: 'critical', skill: 'A1:3.01', lesson: 'vide-pression',
      message: 'Test de pression au fluide frigorigène : interdit, c\'est une source d\'émission. Utilisez l\'azote déshydraté.',
      when: ({ a }) => a.type === 'custom' && a.id === 'gas-r32',
    },
    {
      id: 'wrong-gas-air', severity: 'critical', skill: 'A1:3.01', lesson: 'vide-pression',
      message: 'Air comprimé : humide, chargé d\'huile et d\'oxygène (risque d\'explosion, humidité dans le circuit). Utilisez l\'azote déshydraté.',
      when: ({ a }) => a.type === 'custom' && a.id === 'gas-air',
    },
    {
      id: 'no-regulator', severity: 'critical', skill: 'A1:3.01', lesson: 'vide-pression',
      message: 'Bouteille à 200 bar ouverte sans détendeur : risque d\'éclatement du manifold et du circuit.',
      when: ({ a }) => a.type === 'custom' && a.id === 'direct',
    },
    {
      id: 'over-ps', severity: 'critical', skill: 'A1:3.01', lesson: 'vide-pression',
      message: `Pression au-delà de la valeur de résistance (${STRENGTH} bar rel) : risque de déformation ou d'éclatement.`,
      when: ({ s }) => circuitRel(s) > STRENGTH + 0.5,
    },
    {
      id: 'solenoid-closed', severity: 'major', skill: 'A1:3.02', lesson: 'vide-pression',
      message: 'Électrovanne fermée pendant la mise en pression : une partie du circuit n\'est pas testée.',
      when: ({ s }) => !s.valves.solenoid && circuitRel(s) > 2,
    },
    {
      id: 'no-temp-correction', severity: 'major', skill: 'A1:3.02', lesson: 'vide-pression',
      message: 'Conclusion contraire au résultat corrigé : la pression suit la température (P/T constant en bar abs et kelvin).',
      when: ({ a, s }) => a.type === 'answer' && a.field === 'verdict' && !s.answers.verdict.ok,
    },
    {
      id: 'relative-units', severity: 'minor', skill: 'A1:3.02', lesson: 'vide-pression',
      message: 'Correction calculée en bar relatif ou en °C : la loi P/T = constante s\'applique en bar absolu et en kelvin.',
      when: ({ a, s }) => {
        if (a.type !== 'answer' || a.field !== 'P2c' || s.answers.P2c.ok) return false;
        const p1 = num(s, 'P1'), r = num(s, 'T2') / num(s, 'T1');
        return [toRel(p1) * r, toRel(p1 * r), p1 * r, toRel(p1) * K(num(s, 'T2')) / K(num(s, 'T1'))]
          .some((x) => Math.abs(a.value - x) <= 0.2);
      },
    },
    {
      id: 'no-palier', severity: 'minor', skill: 'A1:3.01', lesson: 'vide-pression',
      message: 'Montée en pression sans palier : marquez un premier palier à 5–10 bar rel pour repérer une grosse fuite sans risque, puis montez progressivement.',
      when: ({ s }) => !s.vars.palier && circuitRel(s) > 12,
    },
    {
      id: 'no-record', severity: 'minor', skill: 'A1:3.05', lesson: 'vide-pression',
      message: 'Test non consigné : pression, durée, températures et résultat doivent figurer sur la fiche d\'intervention.',
      when: ({ a, s }) => a.type === 'finish' && !s.vars.recorded,
    },
  ],

  perfectRun() {
    const r2 = (x: number) => Math.round(x * 100) / 100;
    const r1 = (x: number) => Math.round(x * 10) / 10;
    const temp = (s: GameState) => r1(Tc(s));
    const steps: Step[] = [
      { type: 'inspect', target: 'comp.compressor' },
      { type: 'custom', id: 'gas-n2' },
      { type: 'custom', id: 'solenoid' },
      { type: 'toggleCap', target: 'valve.gas' },
      { type: 'setServiceValve', valve: 'valve.gas', pos: 'mid' },
      { type: 'toggleCap', target: 'port.lp' },
      { type: 'toggleCap', target: 'port.hp' },
      { type: 'connectHose', hose: 'blue', end: 'port', socket: 'port.lp' },
      { type: 'connectHose', hose: 'red', end: 'port', socket: 'port.hp' },
      { type: 'connectHose', hose: 'yellow', end: 'port', socket: 'n2' },
      { type: 'toggleManifold', valve: 'lp' },
      { type: 'toggleManifold', valve: 'hp' },
      { type: 'setN2', setpoint: P_ATM + 10 },
      { type: 'device', device: 'n2', on: true },
      { type: 'wait', seconds: 120 },
      { type: 'setN2', setpoint: P_ATM + STRENGTH },
      { type: 'wait', seconds: 120 },
      { type: 'wait', seconds: STRENGTH_HOLD + 120 },
      { type: 'setN2', setpoint: P_ATM + TIGHT },
      { type: 'wait', seconds: 300 },
      { type: 'device', device: 'n2', on: false },
      { type: 'toggleManifold', valve: 'lp' },
      { type: 'toggleManifold', valve: 'hp' },
      { type: 'measure', tool: 'thermometer', target: 'comp.condenser' },
      (s) => ({ type: 'answer', field: 'P1', value: r2(rel(s)) }),
      (s) => ({ type: 'answer', field: 'T1', value: temp(s) }),
      { type: 'wait', seconds: HOLD + 60 },
      (s) => ({ type: 'answer', field: 'P2', value: r2(rel(s)) }),
      (s) => ({ type: 'answer', field: 'T2', value: temp(s) }),
      (s) => ({
        type: 'answer', field: 'P2c',
        value: r2(toRel((s.answers.P1.value + P_ATM) * K(s.answers.T2.value) / K(s.answers.T1.value))),
      }),
      (s) => ({ type: 'answer', field: 'verdict', value: s.answers.P2.value < s.answers.P2c.value - 0.2 ? 1 : 0 }),
      (s) => (leak(s)?.joint ? { type: 'measure', tool: 'soap', target: leak(s).joint as TargetId } : { type: 'inspect', target: 'comp.condenser' }),
      { type: 'disconnectHose', hose: 'yellow', end: 'port' },
      { type: 'toggleManifold', valve: 'lp' },
      { type: 'toggleManifold', valve: 'hp' },
      { type: 'toggleHoseValve', hose: 'yellow' },
      { type: 'wait', seconds: 180 },
      { type: 'custom', id: 'record' },
      { type: 'finish' },
    ];
    return steps;
  },
};

function bubbles(s: GameState, target: TargetId) {
  const l = leak(s);
  if (!l || l.joint !== target) return 0;
  const link = s.circuit.links.find((x) => x.id === `leak:${l.at}:${l.joint}`);
  const q = link ? flow(s.circuit, link) : null;
  return q ? Math.round((q.n2 + q.air + q.ref) * 1e7) : 0;
}

export default L03;
