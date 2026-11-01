import { P_ATM, rhoLiq } from '../physics/refrigerants';
import { makeVolume } from '../physics/circuit';
import { P, SYSTEM_IDS, hoseAt, hoseVol, makePlatine, vs } from '../game/platineModel';
import { emittedG, fmt, isPort, refuse, scaleGross } from '../game/engine';
import type { GameState, Level, Socket, Step, Tier } from '../game/types';

const CHARGE = 1.2; // kg, nameplate
const OIL_G = 12; // g dissolved in the compressor oil, released after the first stop
const CUTOFF = 0.7; // bar abs, station cut-off (slight vacuum)
const SYS = SYSTEM_IDS;

type Bad = 'mixed-fluids' | 'disposable-cylinder' | 'expired-cylinder';
interface Cyl { text: string; short: string; V: number; tare: number; kg: number; bad?: Bad }

const fr = (x: number, d = 1) => fmt(x, d);
const maxFill = (V: number) => (0.8 * V * rhoLiq('R32', 25)) / 1000;
const fits = (c: Cyl) => !c.bad && maxFill(c.V) >= c.kg + CHARGE;

const cyls = (s: GameState): Cyl[] => JSON.parse(s.vars.cyls as string);
const picked = (s: GameState): Cyl | undefined => cyls(s)[s.vars.cyl as number];
const gainedKg = (s: GameState) => (picked(s) ? s.circuit.volumes.cyl.mRef - picked(s)!.kg : 0);
const sysP = (s: GameState) => Math.max(...SYS.map((id) => P(s, id)));
const joined = (s: GameState, a: Socket, b: Socket) => s.hoses.some((h) => (h.manifold === a && h.port === b) || (h.manifold === b && h.port === a));
const reaches = (s: GameState, port: Socket, mf: 'lp' | 'hp') =>
  s.hoses.some((h) => h.port === port && h.valve && h.manifold === `mf.${mf}`) && s.manifold.valves[mf];
const ok = (s: GameState, ...ids: string[]) => ids.every((id) => s.answers[id]?.ok);
const onBoard = (s: GameState) => s.hoses.some((h) => h.port && isPort(h.port));
const onCyl = (s: GameState) => !!(hoseAt(s, 'cyl.gas') || hoseAt(s, 'cyl.liq'));
const cylT = (s: GameState) => s.vars.cylT as number;

function lineup(tier: Tier, rng: () => number): Cyl[] {
  const exam = tier === 'examen';
  const V = exam ? [10, 12, 13.6][Math.floor(rng() * 3)] : 12;
  const tare = exam ? Math.round((6.5 + 2 * rng()) * 10) / 10 : 7.8;
  const smallKg = Math.round((1 + 0.25 * rng()) * 100) / 100;
  const list: Cyl[] = [
    { V, tare, kg: 0, short: `récupération R32 ${fr(V)} L`,
      text: `bouteille de récupération R32, ${fr(V)} L (capacité en eau), tare ${fr(tare)} kg, requalifiée en 2024 (validité 5 ans), vide.` },
    // simplification: the circuit holds one fluid, so the 2 kg of "R410A" behave as R32 (pressure, weight); only the rule cares.
    { V: 12, tare: 7.6, kg: 2, bad: 'mixed-fluids', short: 'récupération R410A 12 L',
      text: 'bouteille de récupération R410A, 12 L, tare 7,6 kg, requalifiée en 2023, contient déjà 2,0 kg de R410A.' },
    { V: 10, tare: 5.2, kg: 0, bad: 'disposable-cylinder', short: 'jetable R32 neuf 10 L',
      text: 'bouteille jetable (non rechargeable) de R32 neuf, 10 L, vide.' },
  ];
  if (exam) {
    list.push(
      { V: 12, tare: 7.9, kg: 0, bad: 'expired-cylinder', short: 'récupération R32 12 L (2018)',
        text: 'bouteille de récupération R32, 12 L, tare 7,9 kg, dernière requalification en 2018 (validité 5 ans), vide.' },
      { V: 2.5, tare: 2.9, kg: smallKg, short: 'récupération R32 2,5 L',
        text: `bouteille de récupération R32, 2,5 L (capacité en eau), tare 2,9 kg, requalifiée en 2025, contient déjà ${fr(smallKg, 2)} kg de R32.` },
    );
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
  }
  return list;
}

const goodIndex = (s: GameState) => cyls(s).findIndex(fits);

const L05: Level = {
  id: 'L05',
  title: 'Récupération du fluide',
  skills: ['A1:5.02', 'A1:5.03', 'A1:5.07', 'A1:5.08', 'CAP:UP3'],
  lesson: 'recuperation',
  scene: 'PLATINE',
  fluid: 'R32',
  briefing: 'Le compresseur de la platine est HS (moteur grillé). Récupérez la totalité de la charge de R32 (1,2 kg) avant intervention : '
    + 'choisissez la bonne bouteille, vérifiez sa charge maximale, pesez, récupérez le liquide puis la vapeur, contrôlez la remontée de pression, '
    + 'puis pesez, étiquetez et enregistrez le fluide récupéré.',
  tierNotes: {
    guide: 'Atelier à 20 °C, trois bouteilles sur le banc.',
    standard: 'Journée chaude : 35 °C, bouteille au soleil. Récupérer d\'abord le liquide fait gagner beaucoup de temps.',
    examen: 'Bouteilles et température aléatoires, certaines sont piégées. 30 min.',
  },
  tools: ['hand', 'wrench'],
  timeLimit: 30 * 60,

  setup(tier, rng) {
    const exam = tier === 'examen';
    const Tamb = exam ? Math.round(18 + 17 * rng()) : tier === 'standard' ? 35 : 20;
    const s = makePlatine({
      levelId: 'L05', tier, Tamb, charge: CHARGE - OIL_G / 1000,
      hoses: [
        { id: 'blue', color: 'blue', manifold: 'mf.lp', port: null, valve: true },
        { id: 'red', color: 'red', manifold: 'mf.hp', port: null, valve: true },
        { id: 'yellow', color: 'yellow', manifold: 'mf.center', port: null, valve: false },
        { id: 'rec', color: 'yellow', manifold: null, port: null, valve: true },
      ],
      bench: { recovery: { on: false, speed: 0.5, cutoff: CUTOFF } },
      volumes: [makeVolume('cyl', 12, { T: Tamb })],
    });
    s.vars = { cyls: JSON.stringify(lineup(tier, rng)), cyl: -1, oilG: OIL_G, cylT: tier === 'standard' ? 42 : Tamb + 3 };
    return s;
  },

  objectives: [
    {
      id: 'fluid', label: 'Identifier le fluide (plaque signalétique)',
      done: (s) => ok(s, 'fluid'),
      hints: ['On ne récupère un fluide que dans une bouteille dédiée à ce fluide.', 'Inspectez le compresseur (outil main) et lisez la plaque, puis répondez.', ['comp.compressor']],
    },
    {
      id: 'pick', label: 'Choisir une bouteille de récupération adaptée',
      done: (s) => !!picked(s) && fits(picked(s)!),
      hints: ['Bouteille rechargeable, dédiée au fluide, épreuve valide, assez de place pour 1,2 kg.',
        'Examinez les bouteilles du banc : écartez la jetable, celle d\'un autre fluide, celle dont la requalification est échue et celle trop petite.'],
    },
    {
      id: 'maxFill', label: 'Calculer la charge maximale de la bouteille (80 % du volume en liquide)',
      done: (s) => ok(s, 'maxFill'),
      hints: ['Jamais plus de 80 % du volume occupé par le liquide.', 'Charge max = 0,8 × capacité en eau (L) × masse volumique du R32 liquide (≈ 0,96 kg/L à 25 °C).'],
    },
    {
      id: 'scale', label: 'Poser la bouteille sur la balance et tarer',
      done: (s) => s.bench.scaleTare !== undefined && Math.abs(s.bench.scaleTare - scaleGross(s)) < 5e-4,
      hints: ['La masse récupérée se lit sur la balance.', 'Commande « Poser la bouteille sur la balance », puis TARE.'],
    },
    {
      id: 'connect', label: 'Raccorder : prises liquide et BP → manifold → station (entrée), station (sortie) → vanne gaz de la bouteille',
      done: (s) => joined(s, 'port.liq', 'mf.hp') && joined(s, 'port.lp', 'mf.lp') && joined(s, 'mf.center', 'rec.in') && joined(s, 'rec.out', 'cyl.gas')
        && s.hoses.every((h) => h.valve),
      hints: ['Rouge sur la prise liquide, bleu sur la prise BP, jaune du manifold vers l\'entrée de la station, second jaune de la sortie vers la bouteille.',
        'Retirez les bouchons. Flexible rouge → prise liquide, bleu → prise BP, jaune (côté vanne) → station entrée et ouvrez sa vanne à boule ; flexible « rec » : station sortie → vanne gaz de la bouteille.',
        ['port.liq', 'port.lp']],
    },
    {
      id: 'cylOpen', label: 'Ouvrir la vanne gaz de la bouteille',
      done: (s) => !!s.bench.cylinder?.gas,
      hints: ['La station refoule dans la bouteille : sortie fermée = surpression.', 'Commande « Vanne gaz » de la bouteille.'],
    },
    {
      id: 'liquid', label: 'Récupérer d\'abord le liquide par la prise liquide',
      done: (s) => joined(s, 'port.liq', 'mf.hp') && gainedKg(s) > 0.3 && vs(s, 'hp').liquidFraction < 0.01,
      hints: ['Le liquide se transfère bien plus vite que la vapeur.', 'Ouvrez la vanne HP du manifold (côté prise liquide) et mettez la station en marche.', ['port.liq']],
    },
    {
      id: 'vapour', label: 'Récupérer la vapeur des deux côtés jusqu\'à la coupure (≤ 0 bar rel)',
      done: (s) => reaches(s, 'port.lp', 'lp') && s.valves.gas !== 'back' && sysP(s) <= P_ATM,
      hints: ['Il reste de la vapeur et du liquide côté BP (évaporateur).', 'Vanne gaz en position milieu, vanne BP du manifold ouverte, station en marche jusqu\'à la coupure.', ['valve.gas']],
    },
    {
      id: 'rise', label: 'Arrêter la station et attendre 5 min : contrôler la remontée de pression',
      done: (s) => s.vars.oilG === 0,
      hints: ['Du fluide dissous dans l\'huile se dégage encore après l\'arrêt.', 'Arrêtez la station et attendez environ 5 minutes en surveillant le manomètre BP.'],
    },
    {
      id: 'again', label: 'Récupérer à nouveau jusqu\'à la coupure',
      done: (s) => sysP(s) <= P_ATM && !s.bench.recovery!.on,
      hints: ['La pression est remontée : ce fluide est encore dans le circuit.', 'Relancez la station jusqu\'à la coupure, puis arrêtez-la.'],
    },
    {
      id: 'disconnect', label: 'Fermer la bouteille et déposer les flexibles',
      done: (s) => !s.bench.cylinder!.gas && !onBoard(s) && !onCyl(s),
      hints: ['Bouteille fermée avant de déposer son flexible, sinon son contenu part à l\'air.',
        'Fermez la vanne gaz de la bouteille et la vanne à boule du flexible « rec », puis déposez les flexibles de la bouteille et des prises.'],
    },
    {
      id: 'weigh', label: 'Peser la bouteille : masse récupérée',
      done: (s) => ok(s, 'mass'),
      hints: ['La balance a été tarée avec la bouteille vide de ce fluide.', 'Lisez la masse nette sur la balance et saisissez-la.'],
    },
    {
      id: 'label', label: 'Étiqueter la bouteille (fluide, masse)',
      done: (s) => s.vars.labelled === true,
      hints: ['Une bouteille de récupération doit indiquer son contenu.', 'Commande « Étiqueter la bouteille ».'],
    },
    {
      id: 'record', label: 'Choisir la destination du fluide et renseigner la fiche',
      done: (s) => ok(s, 'dest') && s.vars.recorded === true,
      hints: ['Moteur grillé : le fluide est probablement acide.', 'Destination : retour distributeur (régénération ou destruction), puis « Renseigner la fiche d\'intervention ».'],
    },
  ],

  answers: [
    { id: 'fluid', label: 'Fluide', unit: '', tol: 0, expected: () => 1, choices: ['R410A', 'R32', 'R134a', 'R449A'] },
    // tol is checked relatively (±2 %) in onAction
    { id: 'maxFill', label: 'Charge max bouteille', unit: 'kg', tol: 0.2, expected: (s) => (picked(s) ? maxFill(picked(s)!.V) : NaN) },
    { id: 'mass', label: 'Masse récupérée', unit: 'kg', tol: 0.005, expected: (s) => scaleGross(s) - (s.bench.scaleTare ?? 0) },
    {
      id: 'dest', label: 'Destination du fluide', unit: '', tol: 0, expected: () => 1,
      choices: ['Réutilisation sur site après recyclage', 'Retour au distributeur pour régénération ou destruction'],
    },
  ],

  actions: [
    { id: 'look', label: 'Examiner les bouteilles du banc' },
    { id: 'pick', label: 'Choisir la bouteille n°', input: { unit: '', min: 1, max: 5, step: 1 } },
    { id: 'scale', label: 'Poser la bouteille sur la balance', visible: (s) => !!s.bench.cylinder && s.bench.scaleTare === undefined },
    { id: 'label', label: 'Étiqueter la bouteille (fluide, masse)', visible: (s) => !!s.bench.cylinder },
    { id: 'record', label: 'Renseigner la fiche d\'intervention' },
  ],

  onAction(s, a) {
    if (a.type === 'device' && a.device === 'recovery' && a.on) s.vars.recRan = true;
    if (a.type === 'answer' && a.field === 'maxFill' && picked(s)) {
      const exp = maxFill(picked(s)!.V);
      s.answers.maxFill.ok = Math.abs(a.value - exp) <= 0.02 * exp;
    }
    if (a.type !== 'custom') return;
    if (a.id === 'look') {
      const text = cyls(s).map((c, i) => `n°${i + 1} : ${c.text}`).join(' · ');
      s.toast = { text, kind: 'info', n: (s.toast?.n ?? 0) + 1 };
      return `Bouteilles : ${text}`;
    }
    if (a.id === 'pick') {
      const i = Number(a.value) - 1, c = cyls(s)[i] ?? refuse('Pas de bouteille à ce numéro.');
      if (onCyl(s)) refuse('Un flexible est raccordé à la bouteille : déposez-le d\'abord.');
      if (picked(s) && Math.abs(gainedKg(s)) > 0.001) refuse('Cette bouteille contient maintenant du fluide récupéré : on ne la change plus.');
      s.vars.cyl = i;
      s.bench.cylinder = { label: `Bouteille n°${i + 1} : ${c.short}`, gas: false, liq: false, tare: c.tare };
      s.bench.scaleTare = undefined;
      Object.assign(s.circuit.volumes.cyl, { V: c.V, mRef: c.kg, mAir: 0, mN2: 0, mH2O: 0, T: s.plant.Tamb, Tdrive: cylT(s) });
      return `Bouteille choisie : n°${i + 1} (${c.short})`;
    }
    if (a.id === 'scale') {
      if (!s.bench.cylinder) refuse('Choisissez d\'abord une bouteille.');
      s.bench.scaleTare = 0;
      return 'Bouteille posée sur la balance';
    }
    if (a.id === 'label') {
      if (!s.answers.mass) refuse('Pesez d\'abord la bouteille : la masse figure sur l\'étiquette.');
      s.vars.labelled = true;
      return `Étiquette : R32 récupéré, ${fr(s.answers.mass.value, 3)} kg`;
    }
    if (a.id === 'record') {
      if (!s.answers.dest) refuse('Choisissez d\'abord la destination du fluide.');
      s.vars.recorded = true;
      return 'Fiche d\'intervention renseignée (fluide, masse récupérée, bouteille, destination)';
    }
  },

  onTick(s, dt) {
    // station discharge line stays warmer than the cylinder, so recovered fluid never condenses (and stays) in it
    for (const h of s.hoses) s.circuit.volumes[hoseVol(h)].Tdrive = h.manifold === 'rec.out' || h.port === 'rec.out' ? cylT(s) + 10 : null;
    const rec = s.bench.recovery!;
    if (!s.vars.outgas && s.vars.recRan && !rec.on && sysP(s) <= P_ATM) s.vars.outgas = true;
    const oil = s.vars.oilG as number;
    if (s.vars.outgas && oil > 0) {
      let d = oil * (1 - Math.exp(-dt / 60));
      if (oil - d < 0.1) d = oil;
      s.circuit.volumes.comp.mRef += d / 1000;
      s.vars.oilG = oil - d;
    }
  },

  inspect(s, target) {
    if (target === 'comp.compressor' || target === 'comp.elecBox')
      return `${s.nameplate}. Compresseur HS : bobinage en court-circuit, odeur de brûlé au bornier (huile et fluide probablement acides).`;
    return undefined;
  },

  rules: [
    ...([
      ['mixed-fluids', 'critical', 'A1:5.02', 'Fluide récupéré dans une bouteille contenant un autre fluide : le mélange ne se régénère pas, il part en destruction (coût élevé).'],
      ['disposable-cylinder', 'critical', 'A1:5.02', 'Bouteille jetable : interdite au remplissage, elle n\'est pas conçue pour être rechargée.'],
      ['expired-cylinder', 'major', 'A1:5.02', 'Bouteille dont la requalification périodique est échue : interdite d\'utilisation (réglementation des équipements sous pression).'],
    ] as const).map(([id, severity, skill, message]) => ({
      id, severity, skill, message, lesson: 'recuperation',
      when: ({ s }: { s: GameState }) => picked(s)?.bad === id && gainedKg(s) > 0.005,
    })),
    {
      id: 'overfill', severity: 'critical', skill: 'A1:5.03', lesson: 'recuperation',
      message: 'Bouteille remplie à plus de 80 % de liquide : à la moindre hausse de température le liquide occupe tout le volume, risque d\'éclatement hydraulique.',
      when: ({ s }) => !!picked(s) && vs(s, 'cyl').liquidFraction > 0.8,
    },
    {
      id: 'vent', severity: 'critical', skill: 'A1:5.03', lesson: 'recuperation',
      message: 'Fluide rejeté à l\'atmosphère : le circuit ou la station a été ouvert à l\'air. Toute émission volontaire est interdite.',
      when: ({ s }) => emittedG(s) > 15 + 5 * s.disconnects,
    },
    {
      id: 'stop-too-early', severity: 'major', skill: 'A1:5.03', lesson: 'recuperation',
      message: 'Récupération arrêtée trop tôt (circuit au-dessus de 0 bar relatif ou remontée de pression non contrôlée) : le fluide restant partira à l\'ouverture du circuit.',
      when: ({ a, prev, s }) => {
        const leaving = a.type === 'finish'
          || (a.type === 'disconnectHose' && a.end === 'port' && isPort(prev.hoses.find((h) => h.id === a.hose)?.port ?? ''));
        return leaving && ((s.vars.oilG as number) > 0.5 || sysP(s) > P_ATM);
      },
    },
    {
      id: 'no-weigh', severity: 'major', skill: 'A1:5.07', lesson: 'reglementation',
      message: 'Bouteille non pesée : la quantité récupérée doit être consignée sur la fiche d\'intervention.',
      when: ({ a, s }) => a.type === 'finish' && !s.answers.mass,
    },
  ],

  perfectRun() {
    const steps: Step[] = [
      { type: 'inspect', target: 'comp.compressor' },
      { type: 'answer', field: 'fluid', value: 1 },
      { type: 'custom', id: 'look' },
      (s) => ({ type: 'custom', id: 'pick', value: goodIndex(s) + 1 }),
      (s) => ({ type: 'answer', field: 'maxFill', value: Math.round(maxFill(picked(s)!.V) * 100) / 100 }),
      { type: 'custom', id: 'scale' },
      { type: 'tareScale' },
      { type: 'toggleCap', target: 'port.liq' },
      { type: 'toggleCap', target: 'port.lp' },
      { type: 'toggleCap', target: 'valve.gas' },
      { type: 'connectHose', hose: 'red', end: 'port', socket: 'port.liq' },
      { type: 'connectHose', hose: 'blue', end: 'port', socket: 'port.lp' },
      { type: 'connectHose', hose: 'yellow', end: 'port', socket: 'rec.in' },
      { type: 'toggleHoseValve', hose: 'yellow' },
      { type: 'connectHose', hose: 'rec', end: 'manifold', socket: 'rec.out' },
      { type: 'connectHose', hose: 'rec', end: 'port', socket: 'cyl.gas' },
      { type: 'cylValve', valve: 'gas' },
      { type: 'toggleManifold', valve: 'hp' },
      { type: 'device', device: 'recovery', on: true },
      { type: 'wait', seconds: 120 },
      { type: 'setServiceValve', valve: 'valve.gas', pos: 'mid' },
      { type: 'toggleManifold', valve: 'lp' },
      { type: 'wait', seconds: 720 },
      { type: 'device', device: 'recovery', on: false },
      { type: 'wait', seconds: 300 },
      { type: 'device', device: 'recovery', on: true },
      { type: 'wait', seconds: 120 },
      { type: 'device', device: 'recovery', on: false },
      { type: 'cylValve', valve: 'gas' },
      { type: 'toggleHoseValve', hose: 'rec' },
      { type: 'disconnectHose', hose: 'rec', end: 'port' },
      { type: 'disconnectHose', hose: 'red', end: 'port' },
      { type: 'disconnectHose', hose: 'blue', end: 'port' },
      (s) => ({ type: 'answer', field: 'mass', value: Math.round((scaleGross(s) - s.bench.scaleTare!) * 1000) / 1000 }),
      { type: 'custom', id: 'label' },
      { type: 'answer', field: 'dest', value: 1 },
      { type: 'custom', id: 'record' },
      { type: 'finish' },
    ];
    return steps;
  },
};

export const recoveredRatio = (s: GameState) => gainedKg(s) / CHARGE;
export default L05;
