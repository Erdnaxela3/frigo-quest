import { P_ATM } from '../physics/refrigerants';
import { makeVolume } from '../physics/circuit';
import { P, SYSTEM, SYSTEM_IDS, closeSection, gasMass, hoseAt, hoseVol, makePlatine, openSection } from '../game/platineModel';
import { fmt, isPort, refuse } from '../game/engine';
import type { Action, GameState, Level, Step, Tier } from '../game/types';

const CHARGE = 1.2;
const DIRTY_KG = 2; // already in the "contaminé" cylinder
const ACID_LIMIT = 0.3; // acid level above which the test kit turns
const VARIANTS = ['dead', 'burnt', 'contactor'] as const;
type Variant = (typeof VARIANTS)[number];
const DIAG = ['Compresseur bloqué mécaniquement (moteur sain)', 'Moteur grillé (bobinage à la masse)', 'Contacteur KM1 défectueux (compresseur sain)'];
const DEST = ['Réutilisation sur site après recyclage', 'Retour distributeur : régénération', 'Retour distributeur : destruction / régénération (fluide acide contaminé)'];
const TERMINALS = ['ohm', 'insul', 'km', 'km-replace', 'remove'];
const SYS = SYSTEM_IDS;

const variant = (s: GameState) => s.vars.variant as Variant;
const contactor = (s: GameState) => variant(s) === 'contactor';
const burnt = (s: GameState) => variant(s) === 'burnt';
const acid = (s: GameState) => s.vars.acid as number;
const v = (s: GameState, k: string) => !!s.vars[k];
const ok = (s: GameState, ...ids: string[]) => ids.every((id) => s.answers[id]?.ok);
const sysP = (s: GameState) => Math.max(...SYS.map((id) => P(s, id)));
const toRelMax = (s: GameState) => sysP(s) - P_ATM;
const gainedKg = (s: GameState) => (s.vars.cyl ? s.circuit.volumes.cyl.mRef - (s.vars.cyl === 'dirty' ? DIRTY_KG : 0) : 0);
const onBoard = (s: GameState) => s.hoses.some((h) => h.port && isPort(h.port));
const onCyl = (s: GameState) => !!(hoseAt(s, 'cyl.gas') || hoseAt(s, 'cyl.liq'));
const consigned = (s: GameState) => s.elec.locked && s.elec.voltageChecked;
const cylT = (s: GameState) => s.plant.Tamb + 3;
const later = (s: GameState, min: number) => { s.t += min * 60; };

const MEASURES: Record<Variant, { ohm: string; insul: string; km: string }> = {
  dead: {
    ohm: 'C-R 2,4 Ω · C-S 3,6 Ω · R-S 6,0 Ω (R-S = C-R + C-S : enroulements sains)',
    insul: 'bornes / masse sous 500 V : > 200 MΩ (bon)',
    km: 'contacts de puissance propres, bobine 230 V OK. À l\'essai, le compresseur grogne, intensité de rotor bloqué ≈ 28 A, puis le protecteur thermique déclenche',
  },
  burnt: {
    ohm: 'C-R 1,1 Ω · C-S 3,6 Ω · R-S 4,2 Ω (R-S ≠ C-R + C-S : spires en court-circuit)',
    insul: 'borne C / masse sous 500 V : 0,3 MΩ (< 2 MΩ : bobinage à la masse)',
    km: 'contacts légèrement noircis par le court-circuit, bobine 230 V OK. Le disjoncteur moteur déclenche dès la mise sous tension',
  },
  contactor: {
    ohm: 'C-R 2,4 Ω · C-S 3,6 Ω · R-S 6,0 Ω (R-S = C-R + C-S : enroulements sains)',
    insul: 'bornes / masse sous 500 V : > 200 MΩ (bon)',
    km: 'contacts de puissance piqués et charbonnés, un pôle ne ferme plus : chute de 40 V à l\'appel, le compresseur ne reçoit qu\'une partie de la tension',
  },
};

function vacuumCircuit(s: GameState) {
  for (const id of SYS) Object.assign(s.circuit.volumes[id], { mRef: 0, mN2: 0, mH2O: 0, mAir: gasMass(0.0005, SYSTEM[id], 'air', s.plant.Tamb) });
}
function chargeCircuit(s: GameState, kg: number) {
  const sysV = SYS.reduce((n, id) => n + s.circuit.volumes[id].V, 0);
  for (const id of SYS) Object.assign(s.circuit.volumes[id], { mRef: (kg * s.circuit.volumes[id].V) / sysV, mAir: 0 });
}

const L10: Level = {
  id: 'L10',
  title: 'Compresseur grillé et huile contaminée',
  skills: ['A1:5.03', 'A1:5.04', 'A1:6.01', 'A1:6.02', 'A1:6.05', 'A1:6.06', 'A1:6.07', 'CAP:UP3'],
  lesson: 'composants',
  scene: 'PLATINE',
  fluid: 'R32',
  briefing: 'Le compresseur de la platine a disjoncté, odeur de brûlé au coffret, unité arrêtée. Consignez, diagnostiquez (enroulements, isolement, contacteur), '
    + 'testez l\'acidité de l\'huile, récupérez la charge dans la bonne bouteille, déposez le compresseur et éliminez son huile, posez le compresseur neuf '
    + '(huile POE pour le R32, plots antivibratiles), les filtres, faites l\'essai azote, le triple tirage au vide, chargez au poids, remettez en service (intensité, niveau d\'huile) '
    + 'et refaites un test d\'acidité après 48 h. Renseignez la fiche (fluide récupéré, quantité d\'huile).',
  tierNotes: {
    guide: 'Compresseur bloqué mécaniquement, moteur sain, huile claire : pas de filtre burn-out obligatoire.',
    standard: 'Moteur grillé : décontamination complète (fluide et huile acides).',
    examen: 'Panne à diagnostiquer : moteur grillé ou simple contacteur. Le compresseur livré n\'est peut-être pas le bon. 51 h (dont 48 h de fonctionnement).',
  },
  tools: ['hand', 'wrench', 'clamp'],
  unitControl: true,
  timeLimit: 51 * 3600,

  setup(tier: Tier, rng) {
    const exam = tier === 'examen';
    const variant: Variant = tier === 'guide' ? 'dead' : tier === 'standard' ? 'burnt' : rng() < 0.5 ? 'burnt' : 'contactor';
    const Tamb = exam ? Math.round(15 + 15 * rng()) : 20;
    const s = makePlatine({
      levelId: 'L10', tier, Tamb,
      hoses: [
        { id: 'blue', color: 'blue', manifold: 'mf.lp', port: null, valve: true },
        { id: 'red', color: 'red', manifold: 'mf.hp', port: null, valve: true },
        { id: 'yellow', color: 'yellow', manifold: 'mf.center', port: null, valve: false },
        { id: 'rec', color: 'yellow', manifold: null, port: null, valve: true },
      ],
      bench: { recovery: { on: false, speed: 0.5, cutoff: 0.7 } },
      volumes: [makeVolume('cyl', 12, { T: Tamb })],
    });
    s.vars = {
      variant,
      acid: variant === 'burnt' ? (exam ? 0.6 : 1) : 0,
      oilMl: tier === 'guide' ? 350 : tier === 'standard' ? 320 : Math.round(28 + 12 * rng()) * 10,
      newOil: exam && variant === 'burnt' ? 'min' : 'poe',
      vacN: 0, cyl: '',
    };
    return s;
  },

  objectives: [
    {
      id: 'lockout', label: 'Consigner le coffret électrique (sectionneur cadenassé, VAT)',
      done: consigned,
      hints: ['Avant de toucher au bornier : séparer, condamner, vérifier l\'absence de tension.', 'Outil main sur le coffret électrique : « Consigner », puis « VAT ».', ['comp.elecBox']],
    },
    {
      id: 'diag', label: 'Diagnostic électrique : enroulements, isolement, contacteur, conclusion',
      done: (s) => v(s, 'ohm') && v(s, 'insul') && v(s, 'km') && ok(s, 'diag'),
      hints: ['Moteur sain : R-S = C-R + C-S et isolement > 2 MΩ. Ne concluez pas avant d\'avoir tout mesuré.',
        'Commandes « Multimètre : résistances des enroulements », « Mégohmmètre : isolement », « Examiner le contacteur KM1 », puis choisissez le diagnostic (Relevés).'],
    },
    {
      id: 'acidOld', label: 'Prélever l\'huile du compresseur : test d\'acidité',
      done: (s) => contactor(s) || v(s, 'oilTest'),
      hints: ['L\'acidité de l\'huile dit si le fluide et le circuit sont contaminés.', 'Commande « Test d\'acidité de l\'huile du compresseur ».'],
    },
    {
      id: 'cyl', label: 'Choisir la bouteille de récupération (propre ou « contaminé »)',
      done: (s) => contactor(s) || !!s.vars.cyl,
      hints: ['Un fluide acide ne se mélange pas au fluide récupéré propre.', 'Test positif : bouteille « R32 contaminé ». Test négatif : bouteille propre.'],
    },
    {
      id: 'recover', label: 'Récupérer la charge (prises liquide et BP → manifold → station → bouteille) jusqu\'à ≤ 0 bar rel',
      done: (s) => contactor(s) || sysP(s) <= P_ATM,
      hints: ['Même montage qu\'en récupération classique : liquide d\'abord, puis vapeur des deux côtés.',
        'Rouge → prise liquide, bleu → prise BP, jaune → station (entrée) vanne ouverte, flexible « rec » : station (sortie) → vanne gaz bouteille. Ouvrez la bouteille, HP puis BP au manifold (vanne gaz milieu), station en marche jusqu\'à la coupure.',
        ['port.liq', 'port.lp', 'valve.gas']],
    },
    {
      id: 'disconnect', label: 'Fermer la bouteille et déposer les flexibles',
      done: (s) => contactor(s) || (!!s.bench.cylinder && !s.bench.cylinder.gas && !onBoard(s) && !onCyl(s) && !s.bench.recovery!.on),
      hints: ['Station arrêtée, bouteille fermée avant de déposer son flexible.', 'Arrêtez la station, fermez la vanne gaz de la bouteille et la vanne à boule du flexible « rec », puis déposez les flexibles côté prise.'],
    },
    {
      id: 'remove', label: 'Déposer le compresseur et vidanger son huile dans le bidon « huiles usagées »',
      done: (s) => contactor(s) || (v(s, 'removed') && !!s.vars.drained),
      hints: ['Une huile chargée de fluide (et acide) est un déchet dangereux.', 'Commandes « Déposer le compresseur », puis « Vidanger l\'huile dans le bidon étiqueté ».'],
    },
    {
      id: 'install', label: 'Poser le compresseur neuf : huile POE, plots antivibratiles neufs, sans contrainte sur les tubes',
      done: (s) => contactor(s) || (v(s, 'mounted') && v(s, 'mounts') && s.vars.newOil === 'poe'),
      hints: ['R32 (HFC) : huile POE. Une huile minérale n\'est pas miscible et ne revient pas au compresseur.',
        'Examinez le compresseur livré, refusez-le s\'il n\'est pas en POE, remplacez les plots, puis posez-le (brasage sous balayage d\'azote).'],
    },
    {
      id: 'filters', label: 'Braser le filtre déshydrateur liquide neuf (et le filtre burn-out d\'aspiration si l\'huile est acide)',
      done: (s) => contactor(s) || (v(s, 'liqFilter') && (variant(s) === 'dead' || v(s, 'burnout'))),
      hints: ['Le filtre burn-out piège l\'acide et les boues côté aspiration, avant le compresseur neuf.', 'Commandes « Braser un filtre burn-out sur l\'aspiration » (huile acide) et « Braser un filtre déshydrateur liquide neuf ».'],
    },
    {
      id: 'n2', label: 'Essai de pression à l\'azote',
      done: (s) => contactor(s) || v(s, 'n2Test'),
      hints: ['Toutes les brasures neuves sont à éprouver.', 'Commande « Essai de pression à l\'azote ».'],
    },
    {
      id: 'vac', label: 'Triple tirage au vide : vide → azote → vide → azote → vide',
      done: (s) => contactor(s) || s.vars.vacN === 5,
      hints: ['Chaque cassure à l\'azote sec emporte l\'humidité et l\'acide résiduels.', 'Alternez « Tirage au vide » et « Casser le vide à l\'azote », en finissant par un vide.'],
    },
    {
      id: 'charge', label: 'Charger au poids la masse de la plaque signalétique',
      done: (s) => contactor(s) || v(s, 'charged'),
      hints: ['La charge est indiquée sur la plaque signalétique.', 'Inspectez le compresseur, puis « Charger au poids » avec la masse lue.', ['comp.compressor']],
    },
    {
      id: 'km', label: 'Remplacer l\'organe défectueux', tiers: ['examen'],
      done: (s) => !contactor(s) || v(s, 'kmReplaced'),
    },
    {
      id: 'start', label: 'Déconsigner, mettre en marche, contrôler l\'intensité et le niveau d\'huile',
      done: (s) => s.running && s.probes.some((p) => p.tool === 'clamp' && (p.target === 'comp.compressor' || p.target === 'comp.elecBox')) && v(s, 'oilLevel'),
      hints: ['Intensité proche de la nominale, niveau d\'huile visible au voyant.',
        'Coffret : « Déconsigner », mettez l\'unité en marche, pince ampèremétrique sur le compresseur, puis « Contrôler le niveau d\'huile ».', ['comp.elecBox', 'comp.compressor']],
    },
    {
      id: 'retest', label: 'Après 48 h de fonctionnement : test d\'acidité négatif (sinon changer les filtres)',
      done: (s) => contactor(s) || v(s, 'acidNeg'),
      hints: ['Une acidité résiduelle détruira le compresseur neuf.', '« Attendre 48 h de fonctionnement, test d\'acidité ». Positif : arrêtez, consignez, « Remplacer les filtres », déconsignez, redémarrez et refaites le test.'],
    },
    {
      id: 'record', label: 'Fiche d\'intervention : destination du fluide, quantité d\'huile',
      done: (s) => v(s, 'recorded'),
      hints: ['Fluide propre : rechargé en neuf, la bouteille repart chez le distributeur (régénération). Fluide d\'un moteur grillé = contaminé : destruction / régénération.', 'Relevés : choisissez la destination, saisissez la quantité d\'huile vidangée (mL), puis « Renseigner la fiche d\'intervention ».'],
    },
  ],

  answers: [
    { id: 'diag', label: 'Diagnostic', unit: '', tol: 0, expected: (s) => VARIANTS.indexOf(variant(s)), choices: DIAG },
    { id: 'oil', label: 'Huile vidangée', unit: 'mL', tol: 10, expected: (s) => s.vars.oilMl as number },
    { id: 'dest', label: 'Destination du fluide', unit: '', tol: 0, expected: (s) => (acid(s) > 0 || s.vars.cyl === 'dirty' ? 2 : 1), choices: DEST },
  ],

  actions: [
    { id: 'ohm', label: 'Multimètre : résistances des enroulements (C-R, C-S, R-S)' },
    { id: 'insul', label: 'Mégohmmètre : isolement bornes / masse (500 V)' },
    { id: 'km', label: 'Examiner le contacteur KM1' },
    { id: 'km-replace', label: 'Remplacer le contacteur KM1', visible: (s) => v(s, 'km') && !v(s, 'kmReplaced') },
    { id: 'acid-old', label: 'Test d\'acidité de l\'huile du compresseur', visible: (s) => !v(s, 'removed') },
    { id: 'cyl-clean', label: 'Bouteille de récupération « R32 récupéré » (propre, vide)', visible: (s) => !v(s, 'removed') },
    { id: 'cyl-dirty', label: 'Bouteille de récupération « R32 contaminé » (destruction)', visible: (s) => !v(s, 'removed') },
    { id: 'remove', label: 'Déposer le compresseur (débrancher, débraser sous azote)', visible: (s) => !v(s, 'removed') },
    { id: 'drain-waste', label: 'Vidanger l\'huile dans le bidon étiqueté « huiles usagées / déchet dangereux »', visible: (s) => v(s, 'removed') && !s.vars.drained },
    { id: 'drain-sink', label: 'Vidanger l\'huile dans le bac de lavage de l\'atelier', visible: (s) => v(s, 'removed') && !s.vars.drained },
    { id: 'new-look', label: 'Examiner le compresseur neuf livré', visible: (s) => v(s, 'removed') && !v(s, 'mounted') },
    { id: 'swap-new', label: 'Refuser le compresseur livré et faire livrer le modèle POE', visible: (s) => s.vars.newOil === 'min' && v(s, 'newLook') },
    { id: 'mounts', label: 'Remplacer les plots antivibratiles', visible: (s) => v(s, 'removed') && !v(s, 'mounts') },
    { id: 'mount', label: 'Poser et braser le compresseur neuf (balayage N₂, sans contrainte)', visible: (s) => v(s, 'removed') && !v(s, 'mounted') },
    { id: 'burnout', label: 'Braser un filtre burn-out sur l\'aspiration (balayage N₂)', visible: (s) => v(s, 'removed') && !v(s, 'burnout') },
    { id: 'liq-filter', label: 'Braser un filtre déshydrateur liquide neuf (balayage N₂)', visible: (s) => v(s, 'removed') && !v(s, 'liqFilter') },
    { id: 'n2', label: 'Essai de pression à l\'azote (brasures neuves)', visible: (s) => v(s, 'removed') && !v(s, 'n2Test') },
    { id: 'vac', label: (s) => `Tirage au vide n°${Math.floor((s.vars.vacN as number) / 2) + 1} (< 2 mbar)`, visible: (s) => v(s, 'n2Test') && (s.vars.vacN as number) < 5 },
    { id: 'break', label: 'Casser le vide à l\'azote sec (≈ 0,5 bar rel)', visible: (s) => v(s, 'n2Test') && (s.vars.vacN as number) < 5 },
    { id: 'charge', label: 'Charger au poids (kg)', input: { unit: 'kg', min: 0, max: 3, step: 0.01 }, visible: (s) => s.vars.vacN === 5 && !v(s, 'charged') },
    { id: 'oil-level', label: 'Contrôler le niveau d\'huile (voyant du carter)' },
    { id: 'retest', label: 'Attendre 48 h de fonctionnement, test d\'acidité', visible: (s) => v(s, 'charged') },
    { id: 'refilter', label: 'Remplacer les filtres burn-out et déshydrateur (pump-down, brasage, tirage — abrégé)', visible: (s) => v(s, 'charged') },
    { id: 'record', label: 'Renseigner la fiche d\'intervention' },
  ],

  onAction(s, a) {
    if (a.type === 'setUnit' && a.on) {
      if (contactor(s) && !v(s, 'kmReplaced')) refuse('Le contacteur grésille, le compresseur ne démarre pas.');
      if (!contactor(s) && !v(s, 'mounted')) refuse('Le disjoncteur moteur déclenche aussitôt : le compresseur est HS.');
      if (!contactor(s) && !v(s, 'charged')) refuse('Circuit vide : jamais de démarrage sans charge (et jamais sous vide).');
    }
    if (a.type !== 'custom') return;
    const fixed = (cond: boolean, msg: string) => { if (!cond) refuse(msg); };
    switch (a.id) {
      case 'ohm': case 'insul': case 'km':
        s.vars[a.id] = true;
        return `${a.id === 'km' ? 'Contacteur KM1' : a.id === 'ohm' ? 'Enroulements' : 'Isolement'} : ${MEASURES[variant(s)][a.id]}`;
      case 'km-replace':
        s.vars.kmReplaced = true;
        return 'Contacteur KM1 remplacé (même calibre, bobine 230 V), serrage des bornes contrôlé';
      case 'acid-old':
        s.vars.oilTest = true;
        return acid(s) > 0 ? 'Test d\'acidité : POSITIF (virage violet → orange). Huile noire, odeur âcre : huile et fluide contaminés.'
          : 'Test d\'acidité : négatif. Huile claire, sans odeur.';
      case 'cyl-clean': case 'cyl-dirty': {
        fixed(!onCyl(s), 'Un flexible est raccordé à la bouteille : déposez-le d\'abord.');
        fixed(Math.abs(gainedKg(s)) < 0.001, 'La bouteille contient maintenant du fluide récupéré : on ne la change plus.');
        const dirty = a.id === 'cyl-dirty';
        s.vars.cyl = dirty ? 'dirty' : 'clean';
        s.bench.cylinder = { label: dirty ? 'Récupération R32 CONTAMINÉ 12 L' : 'Récupération R32 (propre) 12 L', gas: false, liq: false, tare: 7.8 };
        Object.assign(s.circuit.volumes.cyl, { mRef: dirty ? DIRTY_KG : 0, mAir: 0, mN2: 0, mH2O: 0, T: s.plant.Tamb, Tdrive: cylT(s) });
        return dirty ? `Bouteille « R32 contaminé » sur le banc (contient déjà ${fmt(DIRTY_KG)} kg de fluide acide, destination destruction)`
          : 'Bouteille de récupération R32 propre, vide, sur le banc';
      }
      case 'remove': {
        fixed(toRelMax(s) <= 0.5, 'Le circuit est encore sous pression : récupérez d\'abord la charge.');
        openSection(s, ['comp', 'hp']);
        s.vars.removed = true;
        return 'Compresseur débranché et déposé, tubes obturés';
      }
      case 'drain-waste': case 'drain-sink':
        s.vars.drained = a.id === 'drain-waste' ? 'waste' : 'sink';
        return `Huile vidangée : ${s.vars.oilMl} mL (éprouvette) ${a.id === 'drain-waste' ? 'dans le bidon étiqueté « huiles usagées »' : 'dans le bac de lavage'}`;
      case 'new-look':
        s.vars.newLook = true;
        return s.vars.newOil === 'poe' ? 'Compresseur livré : même modèle, R32, huile POE (précharge usine), plots fournis.'
          : 'Compresseur livré : même modèle mais étiquette « huile minérale 3GS » : non miscible avec le R32.';
      case 'swap-new':
        s.vars.newOil = 'poe';
        if (v(s, 'mounted')) { s.vars.mounted = false; openSection(s, ['comp', 'hp']); }
        return 'Compresseur refusé : le modèle à huile POE est livré';
      case 'mounts':
        s.vars.mounts = true;
        return 'Plots antivibratiles neufs posés';
      case 'mount':
        s.vars.mounted = true;
        closeSection(s, ['comp', 'hp']);
        return `Compresseur neuf (huile ${s.vars.newOil === 'poe' ? 'POE' : 'minérale'}) posé et brasé sous balayage d'azote, tubes sans contrainte`;
      case 'burnout':
        s.vars.burnout = s.vars.fresh = true;
        return 'Filtre burn-out brasé sur l\'aspiration (balayage N₂)';
      case 'liq-filter':
        s.vars.liqFilter = s.vars.fresh = true;
        return 'Filtre déshydrateur neuf brasé sur la ligne liquide (balayage N₂)';
      case 'n2':
        fixed(v(s, 'mounted') && v(s, 'liqFilter') && !s.opened.length, 'Circuit encore ouvert : posez le compresseur et le filtre déshydrateur d\'abord.');
        s.vars.n2Test = true;
        later(s, 15);
        return 'Essai azote : 15 min sous pression, pas de chute, brasures bulle-testées : étanche. Azote vidangé.';
      case 'vac': case 'break': {
        const n = s.vars.vacN as number, want = n % 2 === 0 ? 'vac' : 'break';
        fixed(n < 5, 'Triple tirage déjà terminé.');
        fixed(a.id === want, 'Triple tirage : vide → cassure azote → vide → cassure azote → vide.');
        s.vars.vacN = n + 1;
        later(s, a.id === 'vac' ? 20 : 5);
        if (n + 1 === 5) vacuumCircuit(s);
        return a.id === 'vac' ? `Tirage au vide n°${n / 2 + 1} : < 2 mbar` : 'Vide cassé à l\'azote sec (0,5 bar rel)';
      }
      case 'charge': {
        fixed(s.vars.vacN === 5, 'Terminez d\'abord le triple tirage au vide.');
        const kg = Number(a.value);
        fixed(Math.abs(kg - CHARGE) <= 0.01, 'Cette masse ne correspond pas à la plaque signalétique : relisez-la.');
        chargeCircuit(s, kg);
        s.vars.charged = true;
        return `Charge au poids : ${fmt(kg, 2)} kg de R32 neuf (liquide, côté HP)`;
      }
      case 'oil-level':
        fixed(s.running, 'Le niveau d\'huile se contrôle compresseur en marche, stabilisé.');
        s.vars.oilLevel = true;
        return 'Niveau d\'huile : mi-voyant, pas de mousse : correct';
      case 'retest': {
        fixed(s.running, 'L\'unité doit tourner 48 h avant le test.');
        if (v(s, 'fresh')) s.vars.acid = acid(s) * (v(s, 'burnout') ? 0.4 : 0.8);
        s.vars.fresh = false;
        s.t += 48 * 3600;
        const pos = acid(s) > ACID_LIMIT;
        s.vars.acidNeg = !pos;
        return pos ? '48 h plus tard, test d\'acidité : encore POSITIF. Les filtres sont saturés : changez-les.' : '48 h plus tard, test d\'acidité : négatif. Circuit décontaminé.';
      }
      case 'refilter':
        fixed(!s.running && s.elec.locked, 'Arrêtez l\'unité (pump-down) et consignez avant de changer les filtres.');
        s.vars.burnout = s.vars.liqFilter = s.vars.fresh = true;
        later(s, 45);
        return 'Pump-down, filtres burn-out et déshydrateur remplacés (brasage sous N₂), section tirée au vide';
      case 'record':
        fixed(contactor(s) || (!!s.answers.dest && !!s.answers.oil), 'Choisissez la destination du fluide et saisissez la quantité d\'huile.');
        s.vars.recorded = true;
        return 'Fiche d\'intervention renseignée';
    }
  },

  onTick(s) {
    for (const h of s.hoses) s.circuit.volumes[hoseVol(h)].Tdrive = h.manifold === 'rec.out' || h.port === 'rec.out' ? cylT(s) + 10 : null;
  },

  inspect(s, target) {
    if (target === 'comp.compressor')
      return `${s.nameplate}. ${v(s, 'mounted') ? 'Compresseur neuf posé.' : v(s, 'removed') ? 'Compresseur déposé.' : 'Compresseur hermétique, carter tiède.'}`;
    if (target === 'comp.elecBox')
      return `Coffret : disjoncteur moteur déclenché${burnt(s) ? ', odeur de brûlé au bornier du compresseur' : ''}. ${s.elec.locked ? 'Sectionneur cadenassé.' : 'Sous tension.'}`;
    return undefined;
  },

  rules: [
    {
      id: 'no-lockout', severity: 'critical', skill: 'CAP:UP3', lesson: 'cap-up3',
      message: 'Intervention sur le bornier sans consignation complète (sectionneur ouvert et cadenassé, absence de tension vérifiée) : risque d\'électrisation.',
      when: ({ a, s }) => a.type === 'custom' && TERMINALS.includes(a.id) && !consigned(s),
    },
    {
      id: 'no-electrical-check', severity: 'major', skill: 'A1:6.06', lesson: 'composants',
      message: 'Remplacement du compresseur engagé sans diagnostic électrique concluant (enroulements, isolement, contacteur) : un compresseur sain changé coûte cher et la panne reste.',
      when: ({ a, s }) => ((a.type === 'custom' && a.id === 'remove') || (a.type === 'device' && a.device === 'recovery' && a.on))
        && (contactor(s) || !(v(s, 'ohm') && v(s, 'insul'))),
    },
    {
      id: 'contaminated-mix', severity: 'major', skill: 'A1:5.03', lesson: 'recuperation',
      message: 'Fluide acide récupéré dans la bouteille de fluide propre : tout son contenu est contaminé et part en destruction.',
      when: ({ s }) => s.vars.cyl === 'clean' && acid(s) > 0 && gainedKg(s) > 0.005,
    },
    {
      id: 'oil-in-sink', severity: 'critical', skill: 'A1:5.04', lesson: 'reglementation',
      message: 'Huile de compresseur jetée au bac : chargée de fluide (et acide), c\'est un déchet dangereux à collecter en bidon étiqueté.',
      when: ({ a }) => a.type === 'custom' && a.id === 'drain-sink',
    },
    {
      id: 'wrong-oil', severity: 'major', skill: 'A1:6.05', lesson: 'composants',
      message: 'Compresseur à huile minérale sur un circuit R32 (HFC) : huile non miscible, elle reste dans l\'évaporateur et le compresseur manque d\'huile.',
      when: ({ a, s }) => a.type === 'custom' && a.id === 'mount' && s.vars.newOil === 'min',
    },
    {
      id: 'no-burnout-filter', severity: 'major', skill: 'A1:6.07', lesson: 'composants',
      message: 'Redémarrage après un moteur grillé sans filtre burn-out d\'aspiration : l\'acide résiduel attaque le bobinage du compresseur neuf.',
      when: ({ a, s }) => a.type === 'setUnit' && a.on && burnt(s) && !v(s, 'burnout'),
    },
  ],

  perfectRun() {
    const noop: Action = { type: 'pickTool', tool: null };
    const ifComp = (...xs: Action[]): Step[] => xs.map((x) => (s: GameState) => (contactor(s) ? noop : x));
    const c = (id: string, value?: number): Action => ({ type: 'custom', id, value });
    const steps: Step[] = [
      { type: 'lockout' },
      { type: 'checkVoltage' },
      c('ohm'), c('insul'), c('km'),
      (s) => ({ type: 'answer', field: 'diag', value: VARIANTS.indexOf(variant(s)) }),
      ...ifComp(c('acid-old')),
      (s) => (contactor(s) ? noop : c(acid(s) > 0 ? 'cyl-dirty' : 'cyl-clean')),
      ...ifComp(
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
        { type: 'wait', seconds: 900 },
        { type: 'device', device: 'recovery', on: false },
        { type: 'cylValve', valve: 'gas' },
        { type: 'toggleHoseValve', hose: 'rec' },
        { type: 'disconnectHose', hose: 'rec', end: 'port' },
        { type: 'disconnectHose', hose: 'red', end: 'port' },
        { type: 'disconnectHose', hose: 'blue', end: 'port' },
        c('remove'), c('drain-waste'),
      ),
      (s) => (contactor(s) ? noop : { type: 'answer', field: 'oil', value: s.vars.oilMl as number }),
      ...ifComp(c('new-look')),
      (s) => (s.vars.newOil === 'min' ? c('swap-new') : noop),
      ...ifComp(c('mounts'), c('mount')),
      (s) => (burnt(s) ? c('burnout') : noop),
      ...ifComp(c('liq-filter'), c('n2'), c('vac'), c('break'), c('vac'), c('break'), c('vac')),
      { type: 'inspect', target: 'comp.compressor' },
      ...ifComp(c('charge', CHARGE)),
      (s) => (contactor(s) ? c('km-replace') : noop),
      { type: 'unlock' },
      { type: 'setUnit', on: true },
      { type: 'wait', seconds: 120 },
      { type: 'measure', tool: 'clamp', target: 'comp.compressor' },
      c('oil-level'),
      ...ifComp(c('retest')),
      ...[{ type: 'lockout' }, c('refilter'), { type: 'unlock' }, { type: 'setUnit', on: true }, c('retest')]
        .map((x) => (s: GameState) => (contactor(s) || v(s, 'acidNeg') ? noop : x as Action)),
      (s) => (contactor(s) ? noop : { type: 'answer', field: 'dest', value: acid(s) > 0 || s.vars.cyl === 'dirty' ? 2 : 1 }),
      c('record'),
      { type: 'finish' },
    ];
    return steps;
  },
};

export { variant };
export default L10;
