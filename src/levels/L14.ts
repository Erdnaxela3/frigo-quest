import { FLUIDS, leakCheckMonths, tco2e } from '../physics/refrigerants';
import type { FluidId } from '../physics/types';
import { makePlatine } from '../game/platineModel';
import { fmt, refuse } from '../game/engine';
import { JOINTS, type JointId } from '../game/sceneIds';
import type { AnswerField, GameState, Level, Rule, Severity, Step, Tier } from '../game/types';

const JOINT_IDS = Object.keys(JOINTS) as JointId[];
const NO_LOC = JOINT_IDS.length;
const NATURES = ['Assemblage', 'Mise en service', 'Modification', 'Maintenance', 'Contrôle d\'étanchéité périodique',
  'Contrôle d\'étanchéité non périodique', 'Démantèlement', 'Autre'];
const N = { maintenance: 3, nonPeriodic: 5, dismantling: 6 };
const LEAK_RESULTS = ['Pas de fuite constatée', 'Fuite constatée et réparée', 'Fuite constatée, non réparée', 'Sans objet (pas de contrôle)'];
const L = { none: 0, repaired: 1, open: 2, na: 3 };
const CHARGED_TYPES = ['Recyclé', 'Vierge', 'Régénéré', 'Sans objet (aucune charge)'];
const FREQ = ['3 mois', '6 mois', 'Non soumis (< 5 t CO₂e)', '12 mois', '24 mois'];
const STICKERS = ['Marquage rouge « défaut d\'étanchéité »', 'Aucune étiquette', 'Étiquette bleue avec date du prochain contrôle'];
const FLUID_CHOICES: FluidId[] = ['R410A', 'R32', 'R134a', 'R290', 'R1234yf'];

const HEADER = 'Opérateur : J. Martin, attestation d\'aptitude cat. I n° AP-58213. Entreprise FroidService, '
  + 'attestation de capacité n° CAP-2024-07731, SIRET 812 345 678 00021. '
  + 'Détenteur : lycée professionnel, atelier froid, 12 rue des Écoles. '
  + 'Équipement : platine split PLT-01, R32, charge nominale 1,2 kg (plaque signalétique), sans système de détection permanent.';

interface Report {
  text: string;
  nature: number;
  leak: number;
  loc: number; // joint index or NO_LOC
  charged: number; // kg, from the scale readings
  virgin: boolean;
  recovered: number;
  balanceOk: boolean;
  stain?: JointId;
}

const REPORTS: Record<string, Report> = {
  guide: {
    text: '03/11/2026 — Motif : contrôle d\'étanchéité non périodique (plainte client, froid insuffisant). '
      + 'Détecteur électronique puis produit moussant : fuite sur le dudgeon sortie détendeur. '
      + 'Fluide restant récupéré dans la bouteille de récupération n° RC-1187 : balance 11,20 → 12,02 kg. '
      + 'Dudgeon refait, épreuve azote, tirage au vide. Charge : bouteille R32 vierge 8,45 → 7,25 kg. '
      + 'Contrôle après réparation : plus de fuite. 0,1 L d\'huile POE souillée recueillie en bidon.',
    nature: N.nonPeriodic, leak: L.repaired, loc: JOINT_IDS.indexOf('joint.txvOut'), charged: 1.2, virgin: true, recovered: 0.82, balanceOk: true,
  },
  standard: {
    text: '04/11/2026 — Motif : remplacement du compresseur à l\'identique (bobinage HS). '
      + 'Récupération (station, bouteille n° RC-2291) : balance 10,85 → 12,01 kg. '
      + 'Compresseur déposé, 0,4 L d\'huile vidangée (test d\'acidité positif). Compresseur neuf brasé, épreuve azote, tirage au vide. '
      + 'Charge en phase liquide : bouteille R32 vierge 9,10 → 7,90 kg. Contrôle d\'étanchéité après intervention : pas de fuite.',
    nature: N.maintenance, leak: L.none, loc: NO_LOC, charged: 1.2, virgin: true, recovered: 1.16, balanceOk: true,
  },
  ecart: {
    text: '05/11/2026 — Motif : remplacement du filtre déshydrateur (colmaté). '
      + 'Récupération (station, bouteille n° RC-3304) : balance 11,60 → 12,55 kg. '
      + 'Filtre neuf, épreuve azote, tirage au vide, 0,1 L d\'huile souillée recueillie en bidon. '
      + 'Charge : bouteille R32 vierge 7,95 → 6,75 kg. Contrôle d\'étanchéité après intervention : pas de fuite. Aucune fuite antérieure déclarée.',
    nature: N.maintenance, leak: L.none, loc: NO_LOC, charged: 1.2, virgin: true, recovered: 0.95, balanceOk: false,
  },
  fuite: {
    text: '05/11/2026 — Motif : contrôle d\'étanchéité non périodique (baisse de performance). '
      + 'Trace d\'huile et bulles au produit moussant sur la brasure entrée condenseur. Brasure à refaire, pièce en commande : '
      + 'installation consignée, fluide récupéré (bouteille n° RC-4410) : balance 12,10 → 12,84 kg. Pas de recharge. '
      + '0,15 L d\'huile souillée recueillie en bidon.',
    nature: N.nonPeriodic, leak: L.open, loc: JOINT_IDS.indexOf('joint.condIn'), charged: 0, virgin: false, recovered: 0.74, balanceOk: true,
    stain: 'joint.condIn',
  },
  demantelement: {
    text: '06/11/2026 — Motif : démantèlement de la platine (remplacement par une platine neuve). '
      + 'Récupération complète (station, bouteille n° RC-5127) : balance 10,40 → 11,57 kg. '
      + '0,3 L d\'huile du compresseur vidangée en bidon. Pas de contrôle d\'étanchéité, pas de charge.',
    nature: N.dismantling, leak: L.na, loc: NO_LOC, charged: 0, virgin: false, recovered: 1.17, balanceOk: true,
  },
};
export const EXAM_REPORTS = ['ecart', 'fuite', 'demantelement'];

const EQUIPMENTS = ['chambre froide', 'vitrine réfrigérée', 'groupe d\'eau glacée', 'pompe à chaleur'];
const rep = (s: GameState) => REPORTS[s.vars.report as string];
const boardMonths = (s: GameState) => leakCheckMonths(tco2e(s.fluid, s.plant.nominalCharge));
const freqIndex = (m: number | null) => (m === null ? 2 : FREQ.indexOf(`${m} mois`));
const eq2Index = (s: GameState) => freqIndex(leakCheckMonths(tco2e(s.vars.eqFluid as FluidId, s.vars.eqKg as number), !!s.vars.eqLDS));

interface Field extends AnswerField { mistake: string; severity: Severity; skill: string; message: string }
const choice = (id: string, label: string, choices: string[], expected: (s: GameState) => number,
  mistake: string, severity: Severity, skill: string, message: string, tiers?: Tier[]): Field =>
  ({ id, label, unit: '', tol: 0, choices, expected, mistake, severity, skill, message, tiers });
const kg = (id: string, label: string, expected: (s: GameState) => number, mistake: string, severity: Severity, skill: string, message: string): Field =>
  ({ id, label, unit: 'kg', tol: 0.015, expected, mistake, severity, skill, message });

const FIELDS: Field[] = [
  choice('attestation', 'Opérateur : n° à porter sur la fiche', ['AP-58213', 'CAP-2024-07731', '812 345 678 00021'], () => 1,
    'wrong-attestation', 'minor', 'A1:9.09', 'La fiche porte le numéro d\'attestation de capacité de l\'entreprise (pas l\'attestation d\'aptitude de l\'opérateur, ni le SIRET).'),
  choice('nature', 'Nature de l\'intervention', NATURES, (s) => rep(s).nature,
    'wrong-nature', 'minor', 'A1:4.09', 'Nature de l\'intervention mal cochée : relisez le motif du compte rendu.'),
  choice('fluid', 'Fluide', FLUID_CHOICES, (s) => FLUID_CHOICES.indexOf(s.fluid),
    'wrong-fluid', 'minor', 'A1:4.09', 'Fluide erroné : il se lit sur la plaque signalétique (R32).'),
  kg('nominal', 'Charge nominale', (s) => s.plant.nominalCharge,
    'wrong-nominal', 'minor', 'A1:4.09', 'Charge nominale : celle de la plaque signalétique, pas la quantité chargée ce jour.'),
  { id: 'tco2e', label: 'Charge en t CO₂e', unit: 't', tol: 0.01, expected: (s) => tco2e(s.fluid, s.plant.nominalCharge),
    mistake: 'wrong-tco2e', severity: 'major', skill: 'A1:2.02', message: 't CO₂e = charge nominale (kg) × PRP / 1000 : 1,2 × 675 / 1000 = 0,81 t.' },
  choice('leakResult', 'Contrôle d\'étanchéité : résultat', LEAK_RESULTS, (s) => rep(s).leak,
    'wrong-leak-result', 'minor', 'A1:4.09', 'Résultat du contrôle d\'étanchéité mal reporté : fuite trouvée ? réparée ?'),
  choice('leakLocation', 'Fuite : localisation', [...JOINT_IDS.map((j) => JOINTS[j]), 'Sans objet'], (s) => rep(s).loc,
    'wrong-leak-location', 'minor', 'A1:4.09', 'Localisation de la fuite mal reportée (ou fuite inventée).'),
  kg('charged', 'Quantité chargée', (s) => rep(s).charged,
    'wrong-charged', 'major', 'A1:5.07', 'Quantité chargée = différence des pesées de la bouteille de charge (avant − après).'),
  choice('chargedType', 'Fluide chargé', CHARGED_TYPES, (s) => (rep(s).charged ? (rep(s).virgin ? 1 : 0) : 3),
    'wrong-charged-type', 'minor', 'A1:5.07', 'Origine du fluide chargé mal reportée (vierge / recyclé / régénéré).'),
  kg('recovered', 'Quantité récupérée', (s) => rep(s).recovered,
    'wrong-recovered', 'major', 'A1:5.08', 'Quantité récupérée = différence des pesées de la bouteille de récupération (après − avant).'),
  choice('recoveredDest', 'Fluide récupéré : destination', ['Réutilisation après recyclage', 'Retour distributeur pour traitement', 'Sans objet'], () => 1,
    'wrong-recovered-dest', 'minor', 'A1:8.10', 'Le fluide de la bouteille de récupération repart chez le distributeur pour traitement (régénération ou destruction).'),
  choice('balance', 'Bilan matière (récupéré / charge nominale)',
    ['Cohérent (écart nul ou expliqué)', 'Écart non expliqué : fuite présumée, recherche de fuite à programmer'], (s) => (rep(s).balanceOk ? 0 : 1),
    'wrong-balance', 'minor', 'A1:4.09', 'Bilan matière mal jugé : un écart n\'est suspect que s\'il n\'est expliqué ni par une fuite déclarée ni par les résidus normaux (quelques %).'),
  choice('nextCheck', 'Platine : prochain contrôle d\'étanchéité périodique', FREQ, (s) => freqIndex(boardMonths(s)),
    'wrong-frequency', 'major', 'A1:2.02', 'Périodicité erronée : < 5 t CO₂e non soumis ; 5–50 t → 12 mois, 50–500 t → 6 mois, ≥ 500 t → 3 mois ; doublée avec détection permanente.'),
  choice('nextCheck2', 'Équipement n°2 du détenteur : périodicité', FREQ, eq2Index,
    'wrong-frequency-eq2', 'major', 'A1:2.02', 'Périodicité de l\'équipement n°2 erronée : t CO₂e = kg × PRP / 1000 ; 5 / 50 / 500 t → 12 / 6 / 3 mois, doublée avec détection permanente.', ['examen']),
  choice('sticker', 'Étiquetage de l\'équipement (à vérifier)', STICKERS,
    (s) => (rep(s).leak === L.open ? 0 : boardMonths(s) === null ? 1 : 2),
    'wrong-sticker', 'minor', 'A1:4.09', 'Étiquetage : rouge « défaut d\'étanchéité » si une fuite reste non réparée ; bleue datée pour un équipement soumis au contrôle périodique ; sinon rien.'),
  choice('cylinderPath', 'Bouteille de récupération : suivi (à vérifier)',
    ['Stockée à l\'atelier, sans document', 'Retour distributeur, BSFF créé sur Trackdéchets (n° bouteille, fluide, masse)', 'Laissée au client', 'Déchetterie'], () => 1,
    'wrong-cylinder-path', 'minor', 'A1:8.10', 'La bouteille de récupération retourne au distributeur avec un bordereau de suivi des fluides frigorigènes (BSFF, Trackdéchets).'),
  choice('oilPath', 'Huile souillée : filière',
    ['Versée dans la bouteille de récupération', 'Réseau d\'eaux usées', 'Déchet dangereux : bidon étanche étiqueté, filière agréée avec bordereau', 'Ordures ménagères'], () => 2,
    'wrong-oil-path', 'minor', 'A1:8.10', 'Huile de machine frigorifique usagée = déchet dangereux : bidon étanche étiqueté, collecte par une filière agréée.'),
  choice('archive', 'Conservation de la fiche (à vérifier)', ['1 an', '3 ans', '5 ans', '10 ans'], () => 2,
    'wrong-archive', 'minor', 'A1:4.09', 'Fiche d\'intervention conservée 5 ans par le détenteur et par l\'opérateur.'),
];

const fieldsFor = (s: GameState) => FIELDS.filter((f) => !f.tiers || f.tiers.includes(s.tier));
const allAnswered = (s: GameState) => fieldsFor(s).every((f) => s.answers[f.id]);
export const correctRatio = (s: GameState) => fieldsFor(s).filter((f) => s.answers[f.id]?.ok).length / fieldsFor(s).length;
const say = (s: GameState, text: string) => { s.toast = { text, kind: 'info', n: (s.toast?.n ?? 0) + 1 }; return text; };

function reportText(s: GameState) {
  const r = rep(s);
  let t = `${HEADER} ${r.text}`;
  if (s.tier === 'examen') {
    const f = s.vars.eqFluid as FluidId, m = s.vars.eqKg as number;
    t += ` Équipement n°2 du détenteur : ${s.vars.eqName}, ${f} ${fmt(m, m % 1 ? 1 : 0)} kg (PRP ${FLUIDS[f].gwp}), `
      + `${s.vars.eqLDS ? 'avec' : 'sans'} système de détection permanent.`;
  }
  if (s.tier === 'guide') {
    t += ' Repères : masses = différences de pesées ; t CO₂e = kg × PRP / 1000 (PRP R32 = 675) ; < 5 t CO₂e → pas de contrôle périodique ; '
      + 'fluide récupéré → distributeur + BSFF ; huile → déchet dangereux.';
  }
  return t;
}

const rules: Rule[] = [
  ...FIELDS.map((f): Rule => ({
    id: f.mistake, severity: f.severity, skill: f.skill, lesson: 'reglementation', message: f.message,
    when: ({ a, s }) => a.type === 'answer' && a.field === f.id && !s.answers[f.id].ok && !(f.id === 'balance' && !rep(s).balanceOk),
  })),
  {
    id: 'missing-leak-declaration', severity: 'major', skill: 'A1:4.09', lesson: 'etancheite',
    message: 'Les pesées ne bouclent pas (récupéré nettement inférieur à la charge nominale) sans fuite déclarée : il faut signaler une fuite présumée et programmer une recherche de fuite.',
    when: ({ a, s }) => a.type === 'answer' && a.field === 'balance' && !rep(s).balanceOk && !s.answers.balance.ok,
  },
];

const L14: Level = {
  id: 'L14',
  title: 'Traçabilité : fiche d\'intervention et déchets',
  skills: ['A1:3.05', 'A1:4.09', 'A1:5.07', 'A1:5.08', 'A1:6.07', 'A1:7.09', 'A1:8.10', 'A1:9.09', 'A1:2.02', 'CAP:UP3', 'CAP:UP1'],
  lesson: 'reglementation',
  scene: 'PLATINE',
  fluid: 'R32',
  briefing: 'L\'intervention sur la platine split R32 est terminée (unité à l\'arrêt). Lisez le compte rendu d\'intervention, '
    + 'remplissez la fiche d\'intervention (inspirée du Cerfa 15497*04, liste des champs à vérifier), décidez du suivi de la bouteille '
    + 'de récupération et de l\'huile usagée, puis signez. Les points marqués « à vérifier » reposent sur des sources non revérifiées '
    + '(BSFF sur Trackdéchets, conservation 5 ans, étiquetage).',
  tierNotes: {
    guide: 'Réparation de fuite ; repères de remplissage dans le compte rendu, champs corrigés en direct.',
    standard: 'Remplacement de compresseur : récupération puis charge, pesées à exploiter.',
    examen: 'Compte rendu aléatoire, peut-être incohérent ; un second équipement du détenteur à classer. 15 min.',
  },
  tools: ['hand'],
  timeLimit: 15 * 60,

  setup(tier, rng) {
    const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rng() * xs.length)];
    const s = makePlatine({ levelId: 'L14', tier, running: false });
    const report = tier === 'examen' ? pick(EXAM_REPORTS) : tier;
    s.vars = { report };
    if (REPORTS[report].stain) s.oilStains = [REPORTS[report].stain!];
    if (tier === 'examen') {
      Object.assign(s.vars, {
        eqName: pick(EQUIPMENTS),
        eqFluid: pick(['R404A', 'R134a', 'R410A', 'R449A', 'R407C'] as FluidId[]),
        eqKg: pick([2, 6, 10, 25, 60, 140]), eqLDS: rng() < 0.3,
      });
    }
    return s;
  },

  objectives: [
    {
      id: 'read', label: 'Lire le compte rendu d\'intervention',
      done: (s) => !!s.vars.read,
      hints: ['Toutes les données de la fiche sont dans le compte rendu.', 'Bouton « Lire le compte rendu d\'intervention ».'],
    },
    {
      id: 'fill', label: 'Remplir tous les champs de la fiche',
      done: allAnswered,
      hints: ['Masses : différences de pesées. t CO₂e = charge nominale × PRP / 1000. Comparez récupéré et charge nominale.',
        'R32 : PRP 675 → 0,81 t CO₂e, non soumis au contrôle périodique. Bouteille de récupération → distributeur + BSFF ; huile → déchet dangereux ; conservation 5 ans.'],
    },
    {
      id: 'sign', label: 'Signer la fiche',
      done: (s) => !!s.vars.signed,
      hints: ['Une fiche non signée n\'a pas de valeur.', 'Bouton « Signer la fiche » (tous les champs doivent être remplis).'],
    },
    {
      id: 'valid', label: 'Fiche conforme (au moins 90 % des champs justes)',
      done: (s) => correctRatio(s) >= 0.9,
    },
  ],

  answers: FIELDS,
  rules,

  actions: [
    { id: 'read', label: 'Lire le compte rendu d\'intervention' },
    { id: 'sign', label: 'Signer la fiche', visible: (s) => !!s.vars.read && !s.vars.signed },
  ],

  onAction(s, a) {
    if (a.type === 'answer') {
      if (!s.vars.read) refuse('Lisez d\'abord le compte rendu d\'intervention.');
      if (s.vars.signed) refuse('Fiche signée : elle ne se modifie plus.');
    }
    if (a.type !== 'custom') return;
    if (a.id === 'read') { s.vars.read = true; return say(s, reportText(s)); }
    if (a.id === 'sign') {
      if (!allAnswered(s)) refuse('Remplissez tous les champs avant de signer.');
      s.vars.signed = true;
      return `Fiche signée : ${Math.round(correctRatio(s) * 100)} % des champs justes.`;
    }
  },

  perfectRun(tier) {
    const steps: Step[] = [
      { type: 'custom', id: 'read' },
      ...FIELDS.filter((f) => !f.tiers || f.tiers.includes(tier))
        .map((f) => (s: GameState) => ({ type: 'answer', field: f.id, value: f.expected(s) }) as const),
      { type: 'custom', id: 'sign' },
      { type: 'finish' },
    ];
    return steps;
  },
};

export default L14;
