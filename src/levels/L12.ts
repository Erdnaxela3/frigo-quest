import { psat, toRel } from '../physics/refrigerants';
import { standstillPressure } from '../physics/cycle';
import { NO_FAULTS, type Faults } from '../physics/types';
import { DT, SYSTEM_IDS, gaugeP, makePlatine, physicsStep, startUnit, systemRef } from '../game/platineModel';
import { fmt, isPort, refuse } from '../game/engine';
import type { JointId, TargetId } from '../game/sceneIds';
import type { GameState, Level, Objective, Step, Tier } from '../game/types';

export const CAUSES = [
  'Manque de charge (fuite)',
  'Surcharge en fluide',
  'Incondensables dans le circuit',
  'Condenseur encrassé',
  'Ventilateur condenseur HS',
  'Évaporateur pris en glace (dégivrage défaillant)',
  'Ventilateur évaporateur HS',
  'Filtre déshydrateur colmaté',
  'Bulbe du détendeur vidé de sa charge',
  'Détendeur trop ouvert / bulbe mal fixé',
  'Compresseur : clapets usés',
  'Électrovanne liquide bloquée fermée',
  'Thermostat mal réglé',
];
export const REMEDIES = [
  'Rechercher la fuite, réparer, tirer au vide, recharger à la balance',
  'Compléter la charge',
  'Récupérer l\'excédent à la balance jusqu\'à la charge plaquée',
  'Récupérer la charge, tirer au vide, recharger en fluide neuf à la balance',
  'Nettoyer le condenseur',
  'Réparer ou remplacer le moteur du ventilateur (condensateur, bobinage)',
  'Dégivrer l\'évaporateur et remettre en état le dégivrage / l\'écoulement',
  'Remplacer le filtre déshydrateur (après pump-down), tirer au vide',
  'Remplacer l\'élément thermostatique du détendeur',
  'Refixer et isoler le bulbe, régler la surchauffe',
  'Remplacer le compresseur',
  'Contrôler la bobine, remplacer l\'électrovanne',
  'Régler la consigne du thermostat',
];
const TOP_UP = 1;
export const FIX = [0, 2, 3, 4, 5, 6, 5, 7, 8, 9, 10, 11, 12];
const SYMPTOM = [
  'Ça refroidit de moins en moins depuis quelques semaines.',
  'Un dépanneur a « remis du gaz » le mois dernier ; depuis ça refroidit mal et ça consomme.',
  'Depuis le remplacement du compresseur l\'an dernier, la clim peine dès qu\'il fait chaud.',
  'Ça refroidit de moins en moins, surtout l\'après-midi.',
  'Le groupe extérieur fait moins de bruit que d\'habitude, et ça ne refroidit plus.',
  'Ça refroidissait bien puis de moins en moins ; il y a de l\'eau par terre sous l\'unité intérieure.',
  'On n\'entend plus souffler l\'unité intérieure.',
  'Ça refroidit mal depuis qu\'on a changé une pièce sur le circuit.',
  'Plus de froid du tout, et pourtant le groupe tourne.',
  'Ça refroidit, mais le compresseur est tout froid, il y a même du givre dessus.',
  'Le compresseur tourne sans arrêt mais ça ne refroidit pas ; il a 15 ans.',
  'Ça ne refroidit plus, le groupe démarre et s\'arrête tout seul.',
  'Ça ne refroidit plus du tout, le groupe ne démarre pas.',
];
const SIG = [
  'BP ↓, HP ↓, SH ↑↑, SC ≈ 0, voyant à bulles / mousse, trace d\'huile',
  'BP ↑, HP ↑↑, SH ↓, SC ↑↑, intensité élevée',
  'HP ↑↑, SH ≈, SC ≈/↑ ; à l\'arrêt, pression d\'équilibre > Psat(T air)',
  'BP ↑, HP ↑↑, SH ≈, SC ≈, T refoulement élevée, ailettes sales',
  'BP ↑, HP ↑↑, SH ≈, SC ≈, ventilateur condenseur à l\'arrêt',
  'BP ↓↓, HP ↓, SH → 0, SC ≈, évaporateur en glace',
  'BP ↓↓, HP ↓, SH → 0, SC ≈, ventilateur intérieur à l\'arrêt',
  'BP ↓, SH ↑↑, SC ↑, ΔT filtre > 2 K, bulles après le filtre',
  'BP ↓↓, HP ↓, SH ↑↑, SC ↑, voyant clair',
  'BP ↑, SH → 0 (retour liquide), SC ↓',
  'BP ↑, HP ↓ (elles se rapprochent), SH ↑, intensité faible',
  'Compresseur en pump-down : BP tirée jusqu\'à la coupure KP1, cycles courts, voyant plein',
  'Compresseur à l\'arrêt, pressions équilibrées, consigne au-dessus de la température de la pièce',
];
const SEE = ['L02 et L06', 'L06', 'L11', 'L07', 'L07', 'L08', 'L07', 'L09', 'L08', 'L08', 'L10', 'L09', 'L07'];

const GUIDE_POOL = [0, 1, 3, 4, 5, 6, 7, 11, 12];
const COMBOS = [[0, 3], [7, 4], [1, 6], [10, 2], [8, 3]];
const AIRFLOW: Record<number, TargetId> = { 3: 'comp.condenser', 4: 'comp.condFan', 5: 'comp.evaporator', 6: 'comp.evapFan' };
const STAINS: JointId[] = ['joint.filterIn', 'joint.txvIn', 'joint.evapOut', 'joint.condOut', 'joint.gasValve'];
const SUCTION_T: TargetId[] = ['comp.txvBulb', 'joint.evapOut', 'joint.compSuction', 'valve.gas', 'port.lp', 'joint.gasValve', 'port.evap'];
const LIQUID_T: TargetId[] = ['joint.condOut', 'comp.receiver', 'valve.receiver', 'comp.filter', 'joint.filterIn',
  'joint.filterOut', 'comp.sightglass', 'valve.liquid', 'port.liq', 'joint.liqValve', 'comp.solenoid', 'joint.txvIn'];
const N = 5, REF_MIN = 4; // efficiency reference: minutes of measurement per scenario

export interface Scen { c: number[]; m: number; Tamb: number; j: JointId }

export const plan = (s: GameState): Scen[] => JSON.parse(s.vars.plan as string);
export const cur = (s: GameState) => plan(s)[Number(s.vars.sc)];
const names = (sc: Scen) => sc.c.map((c) => CAUSES[c]).join(' + ');

function draw(tier: Tier, rng: () => number): Scen[] {
  const shuffle = <T>(a: T[]) => {
    const b = [...a];
    for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
    return b;
  };
  let sets: number[][];
  if (tier === 'guide') sets = shuffle(GUIDE_POOL).slice(0, N).map((c) => [c]);
  else if (tier === 'standard') sets = shuffle(CAUSES.map((_, i) => i)).slice(0, N).map((c) => [c]);
  else {
    const doubles = shuffle(COMBOS).slice(0, 2);
    const singles = shuffle(CAUSES.map((_, i) => i).filter((c) => !doubles.flat().includes(c))).slice(0, N - 2).map((c) => [c]);
    sets = shuffle([...doubles, ...singles]);
  }
  return sets.map((c) => ({
    c,
    m: tier === 'guide' ? 0.5 : rng(),
    Tamb: tier === 'guide' ? 30 : 27 + Math.round(8 * rng()),
    j: STAINS[Math.floor(rng() * STAINS.length)],
  }));
}

function applyScenario(s: GameState) {
  const sc = cur(s), m = sc.m, f: Faults = { ...NO_FAULTS };
  let charge = 1, thermo: number | undefined;
  for (const c of sc.c) {
    if (c === 0) charge = 0.8 - 0.2 * m;
    if (c === 1) charge = 1.15 + 0.15 * m;
    if (c === 2) f.nonCondBar = 1.5 + 2 * m;
    if (c === 3) f.condFouling = 0.6 + 0.4 * m;
    if (c === 4) f.condFanOk = false;
    if (c === 5) f.evapFrost = 0.6 + 0.4 * m;
    if (c === 6) f.evapFanOk = false;
    if (c === 7) f.filterRestriction = 0.4 + 0.4 * m;
    if (c === 8) f.txv = 'bulbLost';
    if (c === 9) f.txv = m < 0.5 ? 'bulbLoose' : 'tooOpen';
    if (c === 10) f.compEff = 0.5 + 0.2 * m;
    if (c === 11) f.solenoidStuck = true;
    if (c === 12) thermo = 27 + Math.round(3 * m);
  }
  const p = s.plant;
  p.faults = f;
  // simplification: KP5 (36 bar) would trip on a hot day with a dead condenser fan / fouled coil and hide the fault; cap the ambient
  p.Tamb = s.circuit.ambient = Math.min(sc.Tamb, sc.c.includes(4) ? 24 : sc.c.includes(3) ? 31 : 99);
  p.thermostat = thermo === undefined ? undefined : { setpoint: thermo, diff: 2, call: false };
  p.kp1.tripped = p.kp5.tripped = false;
  const k = (charge * p.nominalCharge) / systemRef(s);
  for (const id of SYSTEM_IDS) s.circuit.volumes[id].mRef *= k;
  s.bulbAttached = f.txv !== 'bulbLoose';
  s.oilStains = sc.c.includes(0) ? [sc.j] : [];
  s.inspected = [];
  delete s.answers.diag;
  delete s.answers.remedy;
  Object.assign(s.vars, { dAns: false, rAns: false, tS: false, tL: false, min: 0 });
  startUnit(s);
  for (let i = 0; i < 60 / DT; i++) physicsStep(s); // relax; control messages would give the fault away
}

// measurement time; control messages (KP1 cycling…) are clues, keep them
function spend(s: GameState, sec: number) {
  for (let i = 0; i < sec / DT; i++) {
    const msg = physicsStep(s);
    if (msg) s.journal.push({ t: s.t, text: msg, kind: 'info' });
  }
  s.vars.min = Number(s.vars.min) + sec / 60;
  s.vars.minTot = Number(s.vars.minTot) + sec / 60;
}

const bpGauge = (s: GameState) => s.hoses.some((h) => h.manifold === 'mf.lp' && h.valve
  && (h.port === 'port.evap' || (h.port === 'port.lp' && s.valves.gas !== 'back')));
const hpGauge = (s: GameState) => s.hoses.some((h) => h.manifold === 'mf.hp' && h.valve && (h.port === 'port.hp' || h.port === 'port.liq'));
const cycleFault = (sc: Scen) => !sc.c.includes(11) && !sc.c.includes(12);
const callText = (s: GameState) => `Scénario ${Number(s.vars.sc) + 1}/${N} : appel client « ${SYMPTOM[cur(s).c[0]]} »`;

function bilan(s: GameState) {
  const tot = Number(s.vars.minTot), eff = Math.min(100, Math.round((100 * REF_MIN * N) / Math.max(1, tot)));
  return `Bilan : ${s.vars.good}/${N} diagnostics corrects (cause et remède). Efficacité des mesures : ${eff} % `
    + `(${Math.round(tot)} min de mesures, référence ${REF_MIN} min par scénario).`;
}

function closeScenario(s: GameState, remedy: number) {
  const v = s.vars, sc = cur(s), i = Number(v.sc), good = !!s.answers.diag?.ok && !!s.answers.remedy?.ok;
  v[`r${i}`] = good ? 'ok' : 'ko';
  if (good) v.good = Number(v.good) + 1;
  const meas = [
    bpGauge(s) && `BP ${fmt(toRel(gaugeP(s, 'mf.lp')))} bar`,
    hpGauge(s) && `HP ${fmt(toRel(gaugeP(s, 'mf.hp')))} bar`,
    v.tS && bpGauge(s) && s.cycle && `SH ${fmt(s.cycle.SH)} K`,
    v.tL && hpGauge(s) && s.cycle && `SC ${fmt(s.cycle.SC)} K`,
  ].filter(Boolean).join(', ') || 'aucune mesure manomètre';
  const text = `Remède : ${REMEDIES[remedy]}. Scénario ${i + 1} ${good ? 'réussi' : 'manqué'} : c'était ${names(sc)}. `
    + `Signature : ${sc.c.map((c) => SIG[c]).join(' / ')}. Vos relevés : ${meas}. Temps de mesure : ${Math.round(Number(v.min))} min. `
    + `Voir ${sc.c.map((c) => SEE[c]).join(', ')}.${i === N - 1 ? ` ${bilan(s)}` : ''}`;
  s.toast = { text, kind: good ? 'ok' : 'bad', n: (s.toast?.n ?? 0) + 1 };
  return text;
}

const TABLE = 'Signatures (BP / HP / SH / SC) — Manque de charge : ↓ ↓ ↑↑ 0, bulles · Surcharge : ↑ ↑↑ ↓ ↑↑ · '
  + 'Incondensables : ≈ ↑↑ ≈ ≈/↑, HP à l\'arrêt > Psat(T air) · Condenseur sale / ventilateur HS : ↑ ↑↑ ≈ ≈, refoulement chaud · '
  + 'Évaporateur en glace / ventilateur HS : ↓↓ ↓ →0 ≈ · Filtre colmaté : ↓ ≈ ↑↑ ↑, ΔT filtre > 2 K · '
  + 'Bulbe vidé : ↓↓ ↓ ↑↑ ↑ · Détendeur trop ouvert : ↑ ≈ →0 ↓ · Clapets usés : ↑ ↓ ↑ ≈, intensité faible · '
  + 'Électrovanne fermée : BP tirée au vide, cycles courts KP1 · Thermostat : compresseur arrêté, voir la consigne.';

const fan = (name: string, s: GameState, ok: boolean) => `${name} : ${!s.running ? 'à l\'arrêt (compresseur arrêté)'
  : ok ? 'tourne normalement' : 'à l\'arrêt alors que le compresseur tourne, carcasse du moteur chaude'}.`;

const scenarioObjectives: Objective[] = Array.from({ length: N }, (_, i) => ({
  id: `s${i + 1}`,
  label: `Scénario ${i + 1} : mesurer, diagnostiquer, proposer le remède`,
  done: (s: GameState) => s.vars[`r${i}`] !== undefined,
  hints: [
    'Regardez d\'abord (ventilateurs, condenseur, givre, voyant), puis mesurez BP, HP, surchauffe et sous-refroidissement.',
    'Comparez au tableau des signatures : SC nul + SH élevée = manque de fluide ; SC élevé + HP haute = surcharge ; '
      + 'HP haute + SC normal = problème d\'air au condenseur ou incondensables (essai à l\'arrêt) ; BP très basse + SH ≈ 0 = problème d\'air à l\'évaporateur.',
    ['comp.condFan', 'comp.evapFan', 'comp.sightglass'],
  ],
}));

const L12: Level = {
  id: 'L12',
  title: 'Diagnostic de pannes',
  skills: ['A1:4.04', 'A1:1.03', 'A1:6.04', 'A1:9.06', 'CAP:UP3'],
  lesson: 'cap-up3',
  scene: 'PLATINE',
  fluid: 'R32',
  briefing: 'Appel client : « ça ne refroidit plus ». Cinq pannes successives sur la platine R32 en marche. Pour chacune : '
    + 'lisez la plainte du client, regardez, mesurez (manomètres, thermomètres, pince, voyant, essai à l\'arrêt), posez votre '
    + 'diagnostic puis proposez le remède. Chaque mesure prend du temps : soyez méthodique. Objectif : au moins 4 sur 5.',
  tierNotes: {
    guide: 'Une seule panne franche par scénario. Tableau des signatures disponible (bouton dédié). Mesurez SH et SC avant de conclure.',
    standard: 'Tableau masqué, pannes voisines (sosies) et intensités aléatoires, air extérieur variable.',
    examen: 'Deux pannes simultanées dans certains scénarios (l\'une ou l\'autre est acceptée, avec son remède). 40 min pour les 5 (chaque mesure compte 1 à 3 min).',
  },
  tools: ['hand', 'wrench', 'thermometer', 'clamp'],
  timeLimit: 40 * 60,

  setup(tier, rng) {
    const s = makePlatine({ levelId: 'L12', tier, running: true });
    Object.assign(s.vars, { plan: JSON.stringify(draw(tier, rng)), sc: 0, good: 0, wrong: 0, minTot: 0 });
    applyScenario(s);
    s.journal.push({ t: s.t, text: callText(s), kind: 'info' });
    s.toast = { text: callText(s), kind: 'info', n: 1 };
    return s;
  },

  objectives: [
    ...scenarioObjectives,
    {
      id: 'score', label: `Au moins 4 diagnostics corrects sur ${N} (cause et remède)`,
      done: (s) => Number(s.vars.good) >= 4,
    },
  ],

  answers: [
    { id: 'diag', label: 'Diagnostic', unit: '', tol: 0, choices: CAUSES, expected: (s) => cur(s).c[0] },
    { id: 'remedy', label: 'Remède', unit: '', tol: 0, choices: REMEDIES, expected: (s) => FIX[cur(s).c[0]] },
  ],

  actions: [
    { id: 'client', label: (s) => `Client : « ${SYMPTOM[cur(s).c[0]]} »` },
    { id: 'table', label: 'Tableau des signatures de pannes', visible: (s) => s.tier === 'guide' },
    { id: 'standstill', label: 'Essai à l\'arrêt (pression d\'équilibre, 3 min)' },
    { id: 'next', label: (s) => `Scénario suivant (${Number(s.vars.sc) + 2}/${N})`, visible: (s) => !!s.vars.rAns && Number(s.vars.sc) < N - 1 },
  ],

  onAction(s, a) {
    const v = s.vars;
    if (a.type === 'measure') {
      if (a.tool === 'thermometer' && SUCTION_T.includes(a.target)) v.tS = true;
      if (a.tool === 'thermometer' && LIQUID_T.includes(a.target)) v.tL = true;
      spend(s, 60);
    }
    if (a.type === 'inspect') spend(s, 60);
    if (a.type === 'connectHose' && isPort(a.socket)) spend(s, 60);
    if (a.type === 'answer' && a.field === 'diag') {
      if (v.dAns) refuse('Diagnostic déjà posé pour ce scénario.');
      v.dAns = true;
      s.answers.diag.ok = cur(s).c.includes(a.value);
      if (!s.answers.diag.ok) v.wrong = Number(v.wrong) + 1;
      return `Diagnostic : ${CAUSES[a.value]}`;
    }
    if (a.type === 'answer' && a.field === 'remedy') {
      if (!v.dAns) refuse('Posez d\'abord le diagnostic.');
      if (v.rAns) refuse('Remède déjà proposé pour ce scénario.');
      v.rAns = true;
      s.answers.remedy.ok = cur(s).c.some((c) => FIX[c] === a.value);
      return closeScenario(s, a.value);
    }
    if (a.type === 'finish' && Number(v.sc) === N - 1 && v.rAns) return bilan(s);
    if (a.type !== 'custom') return;
    if (a.id === 'client') return callText(s);
    if (a.id === 'table') return TABLE;
    if (a.id === 'standstill') {
      if (!hpGauge(s)) refuse('Raccordez le manomètre HP pour lire la pression d\'équilibre.');
      spend(s, 180);
      const Ta = s.plant.Tamb;
      return `Essai à l'arrêt (groupe arrêté, ventilateur condenseur forcé, équilibre atteint) : pression ${fmt(toRel(standstillPressure(s.fluid, Ta, s.plant.faults.nonCondBar)))} bar, `
        + `air extérieur ${fmt(Ta)} °C → Psat(${fmt(Ta)} °C) = ${fmt(toRel(psat(s.fluid, Ta, 'bubble')))} bar. Groupe remis en marche.`;
    }
    if (a.id === 'next') {
      if (!v.rAns) refuse('Terminez d\'abord ce scénario (diagnostic puis remède).');
      if (Number(v.sc) >= N - 1) refuse('C\'était le dernier scénario : terminez l\'intervention.');
      v.sc = Number(v.sc) + 1;
      applyScenario(s);
      return callText(s);
    }
  },

  inspect(s, t) {
    const f = s.plant.faults, cy = s.cycle;
    switch (t) {
      case 'comp.condenser': return f.condFouling > 0.3 ? 'Condenseur : ailettes colmatées (poussière, pollen, feuilles), l\'air passe mal.' : 'Condenseur : ailettes propres.';
      case 'comp.condFan': return fan('Ventilateur condenseur', s, f.condFanOk);
      case 'comp.evapFan': return fan('Ventilateur évaporateur', s, f.evapFanOk);
      case 'comp.evaporator':
        return f.evapFrost > 0.3 ? 'Évaporateur : pris en glace, ailettes bouchées, les condensats débordent.'
          : cy && cy.Tevap < 0 ? 'Évaporateur : givre léger.' : 'Évaporateur : ailettes froides et humides, pas de givre.';
      case 'comp.txvBulb':
        return `Bulbe : ${s.bulbAttached ? 'bien fixé et isolé' : 'collier desserré, le bulbe ne touche plus le tube'}`
          + `${cy && cy.Tsuction < 0 ? ', givre sur l\'aspiration jusqu\'au compresseur' : ''}.`;
      case 'comp.solenoid':
        return `Électrovanne : bobine ${s.unitOn ? 'sous tension (aimantée)' : 'hors tension'}`
          + `${f.solenoidStuck && s.unitOn ? ', mais aucun passage : tube à température ambiante en aval' : ''}.`;
      case 'comp.filter':
        return f.filterRestriction >= 0.4 && cy ? 'Filtre : nettement plus froid en sortie qu\'en entrée, condensation sur la sortie.'
          : 'Filtre : même température au toucher en entrée et en sortie.';
      case 'comp.thermostat':
        return s.plant.thermostat ? undefined : `Thermostat d'ambiance : affiche ${fmt(s.plant.Troom)} °C, consigne 20,0 °C, demande de froid.`;
    }
    return undefined;
  },

  rules: [
    {
      id: 'top-up-reflex', severity: 'major', skill: 'A1:4.04', lesson: 'reglementation',
      message: 'Compléter la charge sans trouver la fuite est interdit (F-gas) et inutile : il faut localiser et réparer la fuite, '
        + 'tirer au vide puis recharger à la balance.',
      when: ({ a }) => a.type === 'answer' && a.field === 'remedy' && a.value === TOP_UP,
    },
    {
      id: 'wrong-cause', severity: 'major', skill: 'CAP:UP3', lesson: 'cap-up3',
      message: 'Mauvais diagnostic : comparez vos mesures (BP, HP, surchauffe, sous-refroidissement, voyant) au tableau des signatures.',
      when: ({ a, s }) => a.type === 'answer' && a.field === 'diag' && s.answers.diag?.ok === false,
    },
    {
      id: 'no-sh-sc', severity: 'minor', skill: 'A1:1.03', lesson: 'saturation',
      message: 'Diagnostic posé sans surchauffe ni sous-refroidissement : ce sont eux qui séparent un problème de charge d\'un problème d\'alimentation.',
      when: ({ a, s }) => a.type === 'answer' && a.field === 'diag' && s.tier === 'guide' && cycleFault(cur(s))
        && !(s.vars.tS && s.vars.tL && bpGauge(s) && hpGauge(s)),
    },
    {
      id: 'connect-first', severity: 'minor', skill: 'A1:4.04', lesson: 'etancheite',
      message: 'Regardez avant de raccorder : un défaut d\'air (ventilateur, condenseur, évaporateur) se voit, et chaque raccordement est un risque d\'émission.',
      when: ({ a, s }) => a.type === 'connectHose' && isPort(a.socket)
        && cur(s).c.some((c) => AIRFLOW[c] && !s.inspected.includes(AIRFLOW[c])),
    },
  ],

  perfectRun(tier) {
    const look = (s: GameState): TargetId => AIRFLOW[cur(s).c.find((c) => AIRFLOW[c]) ?? -1] ?? 'comp.sightglass';
    const steps: Step[] = [];
    for (let i = 0; i < N; i++) {
      steps.push((s) => ({ type: 'inspect', target: look(s) }));
      if (tier === 'guide') {
        if (i === 0) steps.push(
          { type: 'toggleCap', target: 'port.lp' }, { type: 'toggleCap', target: 'port.hp' }, { type: 'toggleCap', target: 'valve.gas' },
          { type: 'connectHose', hose: 'blue', end: 'port', socket: 'port.lp' },
          { type: 'connectHose', hose: 'red', end: 'port', socket: 'port.hp' },
          { type: 'setServiceValve', valve: 'valve.gas', pos: 'mid' },
        );
        steps.push({ type: 'measure', tool: 'thermometer', target: 'comp.txvBulb' }, { type: 'measure', tool: 'thermometer', target: 'joint.condOut' });
      }
      steps.push(
        (s) => ({ type: 'answer', field: 'diag', value: cur(s).c[0] }),
        (s) => ({ type: 'answer', field: 'remedy', value: FIX[cur(s).c[0]] }),
      );
      if (i < N - 1) steps.push({ type: 'custom', id: 'next' });
    }
    if (tier === 'guide') steps.push(
      { type: 'setServiceValve', valve: 'valve.gas', pos: 'back' },
      { type: 'disconnectHose', hose: 'blue', end: 'port' },
      { type: 'disconnectHose', hose: 'red', end: 'port' },
      { type: 'toggleCap', target: 'valve.gas' }, { type: 'toggleCap', target: 'port.lp' }, { type: 'toggleCap', target: 'port.hp' },
    );
    steps.push({ type: 'finish' });
    return steps;
  },
};

export default L12;
