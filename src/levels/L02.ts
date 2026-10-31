import { FLUIDS, leakCheckMonths, tco2e } from '../physics/refrigerants';
import type { FluidId } from '../physics/types';
import { makePlatine } from '../game/platineModel';
import { fmt, isPort, refuse } from '../game/engine';
import { JOINTS, type JointId } from '../game/sceneIds';
import type { GameState, Level, Step, Tier } from '../game/types';

const JOINT_IDS = Object.keys(JOINTS) as JointId[];
const NONE = JOINT_IDS.length; // choice index of "aucune fuite"
const LEAK_CHOICES = [...JOINT_IDS.map((j) => JOINTS[j]), 'Aucune (autre) fuite'];
const FREQ = ['Non obligatoire', '3 mois', '6 mois', '12 mois', '24 mois'];
const SIGHT = ['Liquide clair', 'Quelques bulles', 'Mousse'];
const SWEEP_S = 5; // sim s the probe must dwell on a joint (≈ 5 cm/s over a fitting)
const DET_TAU = 2; // s, sensor lag
const LEAK_K = 1e-7;
const LEAK_GPY = 30, FALSE_GPY = 8; // detector readings, g/an equivalent

// circuit volume each joint sits on (leak source)
const JOINT_VOL: Record<JointId, 'hp' | 'liq' | 'lp'> = {
  'joint.compDischarge': 'hp', 'joint.condIn': 'hp', 'joint.condOut': 'hp', 'joint.filterIn': 'hp', 'joint.filterOut': 'hp',
  'joint.liqValve': 'hp', 'joint.kp5Cap': 'hp', 'joint.txvIn': 'liq',
  'joint.txvOut': 'lp', 'joint.evapOut': 'lp', 'joint.gasValve': 'lp', 'joint.kp1Cap': 'lp', 'joint.compSuction': 'lp',
};

const isJoint = (t: string): t is JointId => t in JOINTS;
const leakJoints = (s: GameState) => s.leaks.map((l) => l.joint!);
const nFields = (s: GameState) => (s.tier === 'examen' ? 2 : 1);
const LEAK_FIELDS = ['leak1', 'leak2'];
/** Expected declarations: real leaks in board order, padded with "aucune". */
const pool = (s: GameState) => {
  const p = JOINT_IDS.flatMap((j, i) => (leakJoints(s).includes(j) ? [i] : []));
  while (p.length < nFields(s)) p.push(NONE);
  return p;
};
const freqIndex = (s: GameState) => {
  const m = leakCheckMonths(tco2e(s.vars.eqFluid as FluidId, s.vars.eqKg as number), !!s.vars.eqLDS, !!s.vars.eqHerm);
  return m === null ? 0 : [3, 6, 12, 24].indexOf(m) + 1;
};
const swept = (s: GameState, j: JointId) => !!s.vars[`sw:${j}`];
const soaped = (s: GameState, j: JointId) => !!s.vars[`soap:${j}`];
const ok = (s: GameState, ...ids: string[]) => ids.every((id) => s.answers[id]?.ok);
const say = (s: GameState, text: string) => { s.toast = { text, kind: 'info', n: (s.toast?.n ?? 0) + 1 }; return text; };

function registre(s: GameState) {
  const f = s.vars.eqFluid as FluidId, kg = s.vars.eqKg as number;
  return 'Registre — Platine split R32 : charge 1,2 kg (PRP 675), sans détection permanente. '
    + 'Historique : 03/2025 mise en service ; 04/2026 fuite sur le dudgeon sortie détendeur, réparée. '
    + 'Réclamation client : froid insuffisant depuis quelques semaines. '
    + `Équipement n°2 du site : ${s.vars.eqName}, ${f} ${fmt(kg, kg % 1 ? 1 : 0)} kg (PRP ${FLUIDS[f].gwp}), `
    + `${s.vars.eqHerm ? 'hermétiquement scellé' : 'non hermétique'}, ${s.vars.eqLDS ? 'avec' : 'sans'} système de détection permanent.`;
}

const L02: Level = {
  id: 'L02',
  title: 'Contrôle d\'étanchéité périodique',
  skills: ['A1:2.02', 'A1:4.01', 'A1:4.02', 'A1:4.03', 'A1:4.04', 'A1:4.05', 'A1:4.06', 'A1:4.07', 'A1:4.08', 'A1:4.09', 'CAP:UP3'],
  lesson: 'etancheite',
  scene: 'PLATINE',
  fluid: 'R32',
  briefing: 'Le client signale une baisse de froid sur la platine split R32. Consultez le registre, déterminez les obligations de contrôle, '
    + 'inspectez, faites un contrôle indirect, puis recherchez la fuite au détecteur (vérifié sur sa fuite de référence), confirmez au produit moussant, '
    + 'déclarez le résultat et remplissez la fiche d\'intervention. Inutile de raccorder le manifold.',
  tierNotes: {
    guide: 'Une fuite évidente : trace d\'huile sur le raccord.',
    standard: 'Pas de trace d\'huile ; un flacon de nettoyant près d\'un raccord peut tromper le détecteur.',
    examen: 'De 0 à 2 fuites (n\'en inventez pas), équipement n°2 du registre aléatoire, 20 min.',
  },
  tools: ['hand', 'thermometer', 'detector', 'soap'],
  unitControl: true,
  timeLimit: 20 * 60,

  setup(tier: Tier, rng) {
    const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rng() * xs.length)];
    const exam = tier === 'examen';
    let leaks: JointId[] = tier === 'guide' ? ['joint.filterOut'] : ['joint.txvOut'];
    let fp: JointId | '' = tier === 'standard' ? 'joint.compSuction' : '';
    if (exam) {
      const shuffled = [...JOINT_IDS].sort(() => rng() - 0.5);
      leaks = shuffled.slice(0, Math.floor(rng() * 3));
      fp = rng() < 0.5 ? shuffled[2] : '';
    }
    // the leak has been running for weeks: the charge is already short
    const s = makePlatine({ levelId: 'L02', tier, running: true, charge: 1.2 * (1 - 0.12 * leaks.length) });
    s.leaks = leaks.map((j) => ({ at: JOINT_VOL[j], k: LEAK_K, joint: j }));
    if (tier === 'guide') s.oilStains = [...leaks];
    s.vars = exam
      ? {
        eqName: pick(['chambre froide', 'vitrine réfrigérée', 'groupe d\'eau glacée', 'pompe à chaleur']),
        eqFluid: pick(['R404A', 'R134a', 'R410A', 'R449A', 'R407C', 'R32', 'R1234yf'] as FluidId[]),
        eqKg: pick([1.5, 3, 6, 10, 25, 60, 140]), eqLDS: rng() < 0.3, eqHerm: rng() < 0.3, fp,
      }
      : { eqName: 'chambre froide négative', eqFluid: 'R404A', eqKg: 8, eqLDS: false, eqHerm: false, fp };
    return s;
  },

  objectives: [
    {
      id: 'registre', label: 'Consulter le registre de l\'installation',
      done: (s) => !!s.vars.registre,
      hints: ['Fluide, charge, historique des fuites : tout est dans le registre.', 'Bouton « Consulter le registre » dans le panneau latéral.'],
    },
    {
      id: 'regle', label: 'Déterminer les obligations de contrôle périodique',
      done: (s) => ok(s, 'mandatory', 'freq'),
      hints: ['t CO₂e = charge (kg) × PRP / 1000. Seuils : 5, 50, 500 t CO₂e.',
        'Platine : 1,2 × 675 / 1000 = 0,81 t < 5 t → pas de contrôle périodique (mais une suspicion de fuite impose recherche et réparation). '
        + 'Équipement n°2 : 5–50 t → 12 mois, 50–500 t → 6 mois, ≥ 500 t → 3 mois ; ×2 avec détection permanente ; hermétique < 10 t exempté.'],
    },
    {
      id: 'visual', label: 'Inspection visuelle de tous les raccords (traces d\'huile, frottements)',
      done: (s) => JOINT_IDS.every((j) => s.inspected.includes(j)),
      hints: ['Une trace d\'huile signale souvent une fuite : le fluide entraîne l\'huile.',
        'Outil main : cliquez chaque brasure et chaque dudgeon de la platine.', JOINT_IDS],
    },
    {
      id: 'indirect', label: 'Contrôle indirect : observer le voyant liquide, unité en marche',
      done: (s) => ok(s, 'sight'),
      hints: ['Un manque de charge se voit au voyant, sans se raccorder.',
        'Unité en marche, inspectez le voyant liquide (outil main) et indiquez ce que vous voyez.', ['comp.sightglass']],
    },
    {
      id: 'calib', label: 'Vérifier le détecteur sur sa fuite de référence',
      done: (s) => !!s.vars.calib,
      hints: ['Un détecteur non vérifié ne prouve rien quand il ne sonne pas.', 'Bouton « Vérifier le détecteur (fuite de référence) ».'],
    },
    {
      id: 'sweep', label: 'Balayer lentement chaque raccord au détecteur',
      done: (s) => JOINT_IDS.every((j) => swept(s, j)),
      hints: ['Lentement (≈ 5 cm/s) : le capteur a un temps de réponse.',
        `Détecteur sur chaque raccord, laissez-le au moins ${SWEEP_S} s avant de passer au suivant.`, JOINT_IDS],
    },
    {
      id: 'confirm', label: 'Confirmer chaque alarme au produit moussant',
      done: (s) => leakJoints(s).every((j) => soaped(s, j)),
      hints: ['Le détecteur peut réagir à autre chose que le fluide (solvants, nettoyants).',
        'Produit moussant sur chaque raccord où le détecteur a sonné : des bulles confirment la fuite.'],
    },
    {
      id: 'declare', label: 'Déclarer la ou les fuites trouvées',
      done: (s) => LEAK_FIELDS.slice(0, nFields(s)).every((f) => s.answers[f]?.ok),
      hints: ['Ne déclarez que ce qui est confirmé ; « aucune fuite » est une réponse possible.',
        'Choisissez le raccord où le produit moussant a fait des bulles.'],
    },
    {
      id: 'record', label: 'Consigner l\'intervention (registre et fiche d\'intervention)',
      done: (s) => !!s.vars.record,
      hints: ['Obligation réglementaire : chaque contrôle est consigné et conservé 5 ans.', 'Bouton « Remplir la fiche d\'intervention ».'],
    },
  ],

  answers: [
    {
      id: 'mandatory', label: 'Platine : contrôle périodique obligatoire ?', unit: '', tol: 0, choices: ['Oui', 'Non'],
      expected: (s) => (leakCheckMonths(tco2e(s.fluid, s.plant.nominalCharge)) === null ? 1 : 0),
    },
    { id: 'freq', label: 'Équipement n°2 du registre : périodicité', unit: '', tol: 0, choices: FREQ, expected: freqIndex },
    {
      id: 'sight', label: 'Voyant liquide', unit: '', tol: 0, choices: SIGHT,
      expected: (s) => (s.running && s.cycle ? ['clair', 'bulles', 'mousse'].indexOf(s.cycle.sightGlass) : -1),
    },
    { id: 'leak1', label: 'Fuite constatée', unit: '', tol: 0, choices: LEAK_CHOICES, expected: (s) => pool(s)[0] },
    { id: 'leak2', label: 'Seconde fuite', unit: '', tol: 0, choices: LEAK_CHOICES, expected: (s) => pool(s)[1], tiers: ['examen'] },
  ],

  actions: [
    { id: 'registre', label: 'Consulter le registre' },
    { id: 'calib', label: 'Vérifier le détecteur (fuite de référence)' },
    { id: 'record', label: 'Remplir la fiche d\'intervention', visible: (s) => !!s.answers.leak1 },
  ],

  onAction(s, a) {
    if (a.type === 'custom') {
      if (a.id === 'registre') { s.vars.registre = true; return say(s, registre(s)); }
      if (a.id === 'calib') {
        s.vars.calib = true;
        return say(s, 'Détecteur approché de la fuite étalon (3 g/an) : alarme franche, sensibilité vérifiée.');
      }
      if (a.id === 'record') {
        if (!s.answers.leak1) refuse('Déclarez d\'abord le résultat de la recherche de fuite.');
        s.vars.record = true;
        const found = LEAK_FIELDS.map((f) => s.answers[f]?.value).filter((v): v is number => v !== undefined && v < NONE);
        return say(s, `Fiche d'intervention et registre complétés : contrôle d'étanchéité (voyant, détecteur électronique, produit moussant) — ${
          found.length ? `fuite(s) : ${found.map((i) => LEAK_CHOICES[i]).join(', ')} ; réparation puis contrôle d'efficacité sous 1 mois` : 'aucune fuite constatée'}.`);
      }
      return;
    }
    if (a.type === 'measure' && isJoint(a.target)) {
      if (a.tool === 'detector' && s.vars.detJ !== a.target) { s.vars.detJ = a.target; s.vars.detT = s.t; }
      if (a.tool === 'soap') s.vars[`soap:${a.target}`] = true;
    }
    if (a.type === 'answer' && LEAK_FIELDS.includes(a.field)) {
      // order-insensitive: each declaration must consume one expected entry
      const left = pool(s);
      for (const f of LEAK_FIELDS) {
        const ans = s.answers[f];
        if (!ans) continue;
        const i = left.indexOf(ans.value);
        ans.ok = i >= 0;
        if (i >= 0) left.splice(i, 1);
      }
    }
  },

  onTick(s) {
    const j = s.vars.detJ as string | undefined;
    if (j && s.t - (s.vars.detT as number) >= SWEEP_S) s.vars[`sw:${j}`] = true;
  },

  inspect(s, target) {
    if (target === s.vars.fp) return `${JOINTS[target as JointId]} : propre. Un flacon de nettoyant dégraissant est posé juste à côté.`;
  },

  measure(s, p) {
    if (!isJoint(p.target)) return undefined;
    const leak = leakJoints(s).includes(p.target);
    if (p.tool === 'soap') return { label: 'Produit moussant', value: leak ? 20 : 0, unit: 'bulles/min', digits: 0 };
    if (p.tool !== 'detector') return undefined;
    const dwell = s.vars.detJ === p.target ? s.t - (s.vars.detT as number) : 0;
    const full = leak ? LEAK_GPY : p.target === s.vars.fp ? FALSE_GPY : 0;
    return { label: 'Détecteur électronique', value: full * (1 - Math.exp(-dwell / DET_TAU)), unit: 'g/an', digits: 0 };
  },

  rules: [
    {
      id: 'wrong-frequency', severity: 'major', skill: 'A1:2.02', lesson: 'reglementation',
      message: 'Obligation de contrôle mal déterminée : t CO₂e = charge (kg) × PRP / 1000 ; seuils 5 / 50 / 500 t → 12 / 6 / 3 mois, doublés avec détection permanente.',
      when: ({ a, s }) => a.type === 'answer' && (a.field === 'mandatory' || a.field === 'freq') && !s.answers[a.field].ok,
    },
    {
      id: 'skip-registre', severity: 'minor', skill: 'A1:4.02', lesson: 'etancheite',
      message: 'Recherche commencée sans lire le registre : les points de fuite déjà réparés sont les premiers suspects.',
      when: ({ a, s }) => a.type === 'measure' && (a.tool === 'detector' || a.tool === 'soap') && !s.vars.registre,
    },
    {
      id: 'detector-uncalibrated', severity: 'minor', skill: 'A1:4.07', lesson: 'etancheite',
      message: 'Détecteur utilisé sans vérification sur la fuite de référence : un résultat négatif n\'est alors pas fiable.',
      when: ({ a, s }) => a.type === 'measure' && a.tool === 'detector' && !s.vars.calib,
    },
    {
      id: 'sweep-too-fast', severity: 'minor', skill: 'A1:4.08', lesson: 'etancheite',
      message: `Balayage trop rapide : le capteur a un temps de réponse, restez au moins ${SWEEP_S} s par raccord (≈ 5 cm/s) ou vous manquerez la fuite.`,
      when: ({ a, prev }) => {
        const j = prev.vars.detJ as JointId | undefined;
        return a.type === 'measure' && a.tool === 'detector' && !!j && j !== a.target && !swept(prev, j);
      },
    },
    {
      id: 'unconfirmed', severity: 'major', skill: 'A1:4.06', lesson: 'etancheite',
      message: 'Fuite déclarée sans confirmation au produit moussant : le détecteur réagit aussi aux solvants et nettoyants.',
      when: ({ a, s }) => a.type === 'answer' && LEAK_FIELDS.includes(a.field) && a.value < NONE && !soaped(s, JOINT_IDS[a.value]),
    },
    {
      id: 'false-declaration', severity: 'major', skill: 'A1:4.01', lesson: 'etancheite',
      message: 'Déclaration de fuite erronée : ne déclarez que les fuites confirmées, et n\'en inventez pas.',
      when: ({ a, s }) => a.type === 'answer' && LEAK_FIELDS.includes(a.field) && !s.answers[a.field].ok,
    },
    {
      id: 'no-record', severity: 'major', skill: 'A1:4.09', lesson: 'reglementation',
      message: 'Intervention non consignée : registre et fiche d\'intervention sont obligatoires et conservés 5 ans.',
      when: ({ a, s }) => a.type === 'finish' && !s.vars.record,
    },
    {
      id: 'needless-connect', severity: 'minor', skill: 'A1:4.04', lesson: 'etancheite',
      message: 'Manifold raccordé sans nécessité : chaque raccordement est une émission potentielle. Le voyant suffit au contrôle indirect.',
      when: ({ a }) => a.type === 'connectHose' && isPort(a.socket),
    },
  ],

  perfectRun(tier) {
    const leakAt = (i: number) => (s: GameState) => {
      const j = leakJoints(s)[i];
      return j ? { type: 'measure', tool: 'soap', target: j } as const : { type: 'wait', seconds: 1 } as const;
    };
    const steps: Step[] = [
      { type: 'custom', id: 'registre' },
      { type: 'answer', field: 'mandatory', value: 1 },
      (s) => ({ type: 'answer', field: 'freq', value: freqIndex(s) }),
      ...JOINT_IDS.map((target) => ({ type: 'inspect', target }) as const),
      { type: 'inspect', target: 'comp.sightglass' },
      (s) => ({ type: 'answer', field: 'sight', value: ['clair', 'bulles', 'mousse'].indexOf(s.cycle!.sightGlass) }),
      { type: 'custom', id: 'calib' },
      ...JOINT_IDS.flatMap((target) => [{ type: 'measure', tool: 'detector', target }, { type: 'wait', seconds: SWEEP_S + 1 }] as const),
      leakAt(0), leakAt(1),
      (s) => ({ type: 'answer', field: 'leak1', value: pool(s)[0] }),
      ...(tier === 'examen' ? [(s: GameState) => ({ type: 'answer', field: 'leak2', value: pool(s)[1] }) as const] : []),
      { type: 'custom', id: 'record' },
      { type: 'finish' },
    ];
    return steps;
  },
};

export default L02;
