import { P_ATM, toRel } from '../physics/refrigerants';
import { makeVolume } from '../physics/circuit';
import { P, defaultReading, hoseAt, makePlatine, openSection, closeSection, vs } from '../game/platineModel';
import { fmt, refuse } from '../game/engine';
import type { Action, GameState, Level, Socket, Step, Tier } from '../game/types';

const TEST = 30; // bar rel, N₂ tightness test of the section
const HOLD_S = 5 * 60;
const VAC = 0.002; // bar abs (2 mbar, CAP)
const FULL_WARN = 0.85; // receiver liquid fraction shown as "presque plein"
const UNCAP_MAX_S = 10 * 60;
const SEATS = ['Contre-siège arrière', 'Position milieu', 'Contre-siège avant'];
const FILTERS = {
  dml: 'DML 083 : 100 % tamis moléculaire, pour HFC/HFO et huile POE',
  dcl: 'DCL 083 : alumine activée + tamis, pour CFC/HCFC et huile minérale',
} as const;

const rel = (s: GameState, id: string) => toRel(P(s, id));
const ok = (s: GameState, ...ids: string[]) => ids.every((id) => s.answers[id]?.ok);
const brazed = (s: GameState) => s.tier !== 'guide';
const T = (s: GameState, target: 'joint.filterIn' | 'joint.filterOut') => defaultReading(s, { tool: 'thermometer', target })!.value;
const measured = (s: GameState, ...targets: string[]) => targets.every((t) => s.probes.some((p) => p.tool === 'thermometer' && p.target === t));
const joined = (s: GameState, a: Socket, b: Socket) => s.hoses.some((h) => (h.manifold === a && h.port === b) || (h.manifold === b && h.port === a));
// the port.liq hose opens onto the manifold body
const liqToManifold = (s: GameState) => s.manifold.valves.hp && s.hoses.some((h) => h.port === 'port.liq' && h.valve && h.manifold === 'mf.hp');
const sweeping = (s: GameState) => !!s.bench.n2?.open && joined(s, 'mf.center', 'n2') && liqToManifold(s);
const moisture = (s: GameState) => (s.vars.dry ? 'VERT (circuit sec)' : 'JAUNE (humidité dans le circuit)');

const L09: Level = {
  id: 'L09',
  title: 'Pump-down et remplacement du filtre déshydrateur',
  skills: ['A1:6.04', 'A1:9.07', 'A1:9.08', 'A1:9.09', 'A1:10.01', 'A1:12.07', 'CAP:UP3'],
  lesson: 'composants',
  scene: 'PLATINE',
  fluid: 'R32',
  briefing: 'Voyant liquide qui bulle, indicateur d\'humidité jaune. Remplacez le filtre déshydrateur sans récupérer toute la charge : '
    + 'commencez par l\'exercice des vannes de service, mesurez l\'écart de température entrée/sortie du filtre, faites un pump-down '
    + 'sur le robinet de sortie réservoir, isolez la section du filtre, consignez, récupérez le peu de fluide restant dans la section, '
    + 'remplacez le filtre, testez à l\'azote, tirez au vide, remettez en service et contrôlez.',
  tierNotes: {
    guide: 'Filtre à raccords dudgeon (pas de brasure).',
    standard: 'Filtre à braser : balayage d\'azote obligatoire pendant la brasure.',
    examen: 'Réservoir plus petit (1,2 L) : surveillez son niveau pendant le pump-down. Restriction et température aléatoires, 45 min.',
  },
  tools: ['hand', 'wrench', 'thermometer'],
  unitControl: true,
  timeLimit: 45 * 60,

  setup(tier: Tier, rng) {
    const exam = tier === 'examen';
    const Tamb = exam ? Math.round(25 + 10 * rng()) : 30;
    const s = makePlatine({
      levelId: 'L09', tier, running: true, Tamb,
      faults: { filterRestriction: exam ? Math.round((0.5 + 0.3 * rng()) * 100) / 100 : 0.6 },
      system: exam ? { hp: 1.2 } : undefined,
      hoses: [
        { id: 'blue', color: 'blue', manifold: 'mf.lp', port: null, valve: true },
        { id: 'red', color: 'red', manifold: 'mf.hp', port: null, valve: true },
        { id: 'yellow', color: 'yellow', manifold: 'mf.center', port: null, valve: false },
        { id: 'rec', color: 'yellow', manifold: null, port: null, valve: true },
      ],
      bench: {
        pump: { on: false, speed: 3.4, ultimate: 5e-5 },
        // simplification: station cut-off set just above 0 bar rel so the section is left at a slight positive pressure, no N₂ break needed
        recovery: { on: false, speed: 0.5, cutoff: P_ATM + 0.1 },
        n2: { open: false, setpoint: P_ATM },
        cylinder: { label: 'Bouteille de récupération R32 2,5 L (sous vide)', gas: false, liq: false, tare: 2.9 },
        vacuumGaugeAt: 'filt',
      },
      volumes: [makeVolume('cyl', 2.5, { T: Tamb })],
    });
    s.vars = { dry: false };
    return s;
  },

  objectives: [
    {
      id: 'drill', label: 'Exercice vanne de service 3 voies : position pour chaque usage',
      done: (s) => ok(s, 'sv1', 'sv2', 'sv3'),
      hints: ['Arrière : prise fermée, ligne ouverte. Avant : ligne fermée. Milieu : tout communique.',
        'Lecture en marche → milieu ; isoler la ligne → contre-siège avant ; marche normale prise fermée → contre-siège arrière.'],
    },
    {
      id: 'diag', label: 'Diagnostic : voyant, températures entrée/sortie filtre, conclusion',
      done: (s) => s.inspected.includes('comp.sightglass') && measured(s, 'joint.filterIn', 'joint.filterOut') && ok(s, 'dtBefore', 'diag'),
      hints: ['Un filtre colmaté crée une perte de charge : le liquide se refroidit en détendant (flash gas) après le filtre.',
        'Inspectez le voyant, posez un thermomètre avant et un après le filtre, saisissez l\'écart et concluez.', ['comp.sightglass', 'joint.filterIn', 'joint.filterOut']],
    },
    {
      id: 'pumpdown', label: 'Pump-down : fermer le robinet de sortie réservoir, compresseur en marche, jusqu\'à l\'arrêt',
      done: (s) => !!s.vars.pdStarted && s.valves.receiver === 'closed' && !s.running && !s.plant.kp5.tripped
        && (s.tier === 'examen' || !!s.vars.kp1Cut),
      hints: ['Le compresseur aspire la BP et stocke la charge dans le condenseur et le réservoir.',
        'Retirez le chapeau du robinet de sortie réservoir, fermez-le, attendez la coupure du pressostat BP (KP1). Surveillez le niveau du réservoir.', ['valve.receiver', 'comp.receiver']],
    },
    {
      id: 'isolate', label: 'Fermer la vanne liquide (section filtre isolée), consigner et vérifier l\'absence de tension',
      done: (s) => s.valves.liquid === 'closed' && s.elec.locked && s.elec.voltageChecked,
      hints: ['Une unité « pump-downée » laissée sous tension redémarre toute seule.',
        'Fermez la vanne liquide, puis au coffret : consigner (cadenas) et VAT.', ['valve.liquid', 'comp.elecBox']],
    },
    {
      id: 'recover', label: 'Récupérer le fluide de la section par la prise liquide jusqu\'à légère pression positive (0 à 0,5 bar)',
      done: (s) => rel(s, 'filt') <= 0.5 && rel(s, 'filt') >= -0.05 && !s.bench.recovery!.on && !s.bench.cylinder!.gas,
      hints: ['La section contient encore quelques grammes : pas de rejet, on récupère.',
        'Rouge : prise liquide → manifold HP ; jaune : centre → entrée station (vanne à boule ouverte) ; flexible « rec » : sortie station → vanne gaz bouteille. '
        + 'Ouvrez la bouteille, la vanne HP du manifold, station en marche jusqu\'à l\'arrêt, puis arrêtez la station et fermez la bouteille.', ['port.liq']],
    },
    {
      id: 'remove', label: 'Déposer l\'ancien filtre',
      done: (s) => !!s.vars.oldOut,
      hints: ['Coupe-tube, jamais de scie : les copeaux partent dans le circuit.', 'Commande « Couper au coupe-tube » (guidé : dévisser les dudgeons).'],
    },
    {
      id: 'fit', label: 'Poser le filtre neuf (bon type, flèche dans le sens du fluide, bouchons au dernier moment) et le raccorder',
      done: (s) => !!s.vars.joined && !s.opened.length,
      hints: ['R32 + huile POE : tamis moléculaire. La flèche va du réservoir vers le voyant.',
        'Choisissez le DML, retirez ses bouchons, présentez-le flèche vers le voyant, puis raccordez (brasure sous balayage d\'azote à faible débit par la prise liquide).'],
    },
    {
      id: 'n2', label: `Essai d'étanchéité de la section à l'azote (${TEST} bar rel, ${HOLD_S / 60} min, bouteille fermée)`,
      done: (s) => !!s.vars.n2ok,
      hints: ['Azote déshydraté avec détendeur, par la prise liquide.',
        `Flexible jaune sur le détendeur azote, détendeur à ${TEST} bar, ouvrez, puis fermez la bouteille et observez ${HOLD_S / 60} min sans chute.`],
    },
    {
      id: 'vacuum', label: 'Vidanger l\'azote puis tirer la section au vide (< 2 mbar)',
      done: (s) => P(s, 'filt') <= VAC,
      hints: ['L\'azote se rejette par le détendeur (consigne à 0), puis pompe à vide sur le flexible jaune.',
        'Consigne du détendeur à 0 bar rel, attendez, jaune sur la pompe à vide, pompe en marche jusqu\'à moins de 2 mbar.'],
    },
    {
      id: 'reopen', label: 'Isoler la pompe, déposer le flexible de la prise liquide, ouvrir la vanne liquide puis le robinet réservoir',
      done: (s) => !hoseAt(s, 'port.liq') && s.valves.liquid === 'open' && s.valves.receiver === 'open',
      hints: ['Flexible déposé sous vide : rien ne s\'échappe. Plein de liquide, il rejetterait plusieurs dizaines de grammes.',
        'Fermez la vanne HP du manifold, arrêtez la pompe, déposez le rouge, ouvrez la vanne liquide puis le robinet de sortie réservoir.', ['valve.liquid', 'valve.receiver']],
    },
    {
      id: 'restart', label: 'Déconsigner, remettre en marche et contrôler l\'écart de température du filtre (< 1 K)',
      done: (s) => s.running && ok(s, 'dtAfter') && s.answers.dtAfter.value < 1,
      hints: ['Laissez la marche se stabiliser quelques minutes.', 'Déconsignez, mettez en marche, attendez 3 min, relisez les deux thermomètres et saisissez l\'écart.'],
    },
    {
      id: 'dry', label: 'Revenir quelques heures plus tard : indicateur d\'humidité vert',
      done: (s) => !!s.vars.dry && s.inspected.includes('comp.sightglass'),
      hints: ['Le tamis neuf met quelques heures à sécher le fluide.', 'Commande « Revenir 4 h plus tard », puis inspectez le voyant.'],
      tiers: ['guide', 'standard'],
    },
    {
      id: 'caps', label: 'Remettre bouchons et chapeaux',
      done: (s) => Object.values(s.caps).every(Boolean),
      hints: ['Le bouchon est l\'étanchéité finale.', 'Outil main : bouchon de la prise liquide, chapeaux du robinet réservoir et de la vanne liquide.', ['port.liq', 'valve.liquid', 'valve.receiver']],
    },
  ],

  answers: [
    { id: 'sv1', label: 'Vanne 3 voies : lire la pression en marche', unit: '', tol: 0, expected: () => 1, choices: SEATS },
    { id: 'sv2', label: 'Vanne 3 voies : isoler la ligne', unit: '', tol: 0, expected: () => 2, choices: SEATS },
    { id: 'sv3', label: 'Vanne 3 voies : marche normale, prise fermée', unit: '', tol: 0, expected: () => 0, choices: SEATS },
    { id: 'dtBefore', label: 'ΔT entrée − sortie filtre', unit: 'K', tol: 0.5, expected: (s) => s.cycle?.filterDT ?? NaN },
    {
      id: 'diag', label: 'Diagnostic', unit: '', tol: 0, expected: () => 0,
      choices: ['Filtre déshydrateur colmaté', 'Manque de fluide', 'Détendeur bloqué fermé', 'Condenseur encrassé'],
    },
    { id: 'dtAfter', label: 'ΔT filtre après remplacement', unit: 'K', tol: 0.5, expected: (s) => s.cycle?.filterDT ?? NaN },
  ],

  actions: [
    { id: 'cut', label: (s) => (brazed(s) ? 'Couper le tube au coupe-tube (dépose de l\'ancien filtre)' : 'Dévisser les écrous dudgeon (dépose de l\'ancien filtre)'), visible: (s) => !s.vars.oldOut },
    { id: 'saw', label: 'Couper le tube à la scie à métaux', visible: (s) => brazed(s) && !s.vars.oldOut },
    { id: 'debraze', label: 'Débraser l\'ancien filtre au chalumeau', visible: (s) => brazed(s) && !s.vars.oldOut },
    { id: 'pick-dml', label: `Prendre le filtre ${FILTERS.dml}`, visible: (s) => !s.vars.joined },
    { id: 'pick-dcl', label: `Prendre le filtre ${FILTERS.dcl}`, visible: (s) => !s.vars.joined },
    { id: 'uncap', label: 'Retirer les bouchons du filtre neuf', visible: (s) => !!s.vars.type && s.vars.uncapT === undefined },
    { id: 'place-flow', label: 'Présenter le filtre, flèche vers le voyant (sens du fluide)', visible: (s) => !!s.vars.oldOut && !s.vars.joined },
    { id: 'place-back', label: 'Présenter le filtre, flèche vers le réservoir', visible: (s) => !!s.vars.oldOut && !s.vars.joined },
    {
      id: 'join', label: (s) => (brazed(s) ? 'Braser les deux raccords (baguette argent, chiffon humide sur le voyant)' : 'Serrer les écrous dudgeon (clé dynamométrique)'),
      visible: (s) => !!s.vars.arrow && !s.vars.joined,
    },
    { id: 'later', label: 'Revenir 4 h plus tard', visible: (s) => s.tier !== 'examen' && !!s.vars.joined && s.running && !s.vars.dry },
  ],

  onAction(s, a) {
    if (a.type === 'setServiceValve' && a.valve === 'valve.receiver' && a.pos === 'closed' && s.running) s.vars.pdStarted = true;
    if (a.type === 'unlock' && s.opened.length) refuse('Circuit ouvert : on ne déconsigne pas avant d\'avoir refermé et testé.');
    if (a.type === 'answer' && a.field.startsWith('sv')) {
      const why = [
        'contre-siège arrière : ligne ouverte, prise de service fermée',
        'position milieu : ligne ouverte et prise reliée, le manomètre lit la pression',
        'contre-siège avant : ligne fermée côté installation, prise reliée au compresseur',
      ][a.value];
      return `${s.answers[a.field].ok ? 'Exact' : 'Non'} : ${why}.`;
    }
    if (a.type !== 'custom') return;
    const id = a.id;
    if (id === 'cut' || id === 'saw' || id === 'debraze') {
      if (s.vars.oldOut) refuse('L\'ancien filtre est déjà déposé.');
      if (!brazed(s) && id !== 'cut') refuse('Filtre à dudgeons : on dévisse les écrous.');
      if (!s.elec.locked) refuse('Consignez l\'installation avant d\'ouvrir le circuit.');
      const p0 = rel(s, 'filt');
      if (id === 'debraze' && (p0 > 0.5 || s.valves.receiver === 'open' || s.valves.liquid === 'open')) s.vars.heatedPressurised = true;
      const p = openSection(s, ['filt']);
      if (p > 0.5) s.vars.openedUnderPressure = true;
      if (p < 0) s.vars.openedUnderVacuum = true;
      s.vars.oldOut = true;
      if (id === 'saw') s.vars.sawn = true;
      return `Ancien filtre déposé (${{ cut: brazed(s) ? 'coupe-tube' : 'écrous dévissés', saw: 'scie', debraze: 'chalumeau' }[id]}), section à ${fmt(p)} bar rel à l'ouverture`;
    }
    if (id === 'pick-dml' || id === 'pick-dcl') {
      if (s.vars.uncapT !== undefined) refuse('Le filtre déjà débouché ne se remet pas en stock.');
      s.vars.type = id.slice(5);
      return `Filtre choisi : ${FILTERS[id === 'pick-dml' ? 'dml' : 'dcl']}`;
    }
    if (id === 'uncap') {
      if (!s.vars.type) refuse('Choisissez d\'abord un filtre.');
      if (!s.vars.oldOut) s.vars.uncappedEarly = true;
      s.vars.uncapT = s.t;
      return 'Bouchons du filtre neuf retirés';
    }
    if (id === 'place-flow' || id === 'place-back') {
      if (!s.vars.oldOut) refuse('Déposez d\'abord l\'ancien filtre.');
      if (s.vars.uncapT === undefined) refuse('Retirez d\'abord les bouchons du filtre neuf.');
      s.vars.arrow = id.slice(6);
      return `Filtre présenté, flèche vers ${id === 'place-flow' ? 'le voyant' : 'le réservoir'}`;
    }
    if (id === 'join') {
      if (!s.vars.arrow) refuse('Présentez d\'abord le filtre neuf.');
      if (s.t - (s.vars.uncapT as number) > UNCAP_MAX_S) s.vars.uncappedEarly = true;
      if (brazed(s)) {
        if (rel(s, 'filt') > 0.5 || s.valves.receiver === 'open' || s.valves.liquid === 'open') s.vars.heatedPressurised = true;
        if (!sweeping(s)) s.vars.noSweep = true;
      }
      closeSection(s, ['filt']);
      s.plant.faults.filterRestriction = 0;
      s.vars.joined = true;
      return brazed(s) ? `Raccords brasés${sweeping(s) ? ' sous balayage d\'azote' : ' sans balayage d\'azote'}` : 'Écrous dudgeon serrés au couple';
    }
    if (id === 'later') {
      if (!s.vars.joined || !s.running) refuse('Remettez d\'abord l\'installation en marche avec le filtre neuf.');
      s.t += 4 * 3600;
      s.vars.dry = s.vars.type === 'dml';
      return `4 h plus tard : indicateur d'humidité ${moisture(s)}`;
    }
  },

  onTick(s) {
    if (s.vars.pdStarted && s.plant.kp1.tripped && s.valves.receiver === 'closed') s.vars.kp1Cut = true;
    if (s.running && rel(s, 'comp') < -0.05) s.vars.suctionVacuum = true;
    const hold = s.vars.joined && !s.vars.n2ok && rel(s, 'filt') >= TEST - 1 && !s.bench.n2!.open;
    if (!hold) { delete s.vars.holdT0; return; }
    if (s.vars.holdT0 === undefined) { s.vars.holdT0 = s.t; s.vars.holdP0 = rel(s, 'filt'); }
    if (s.t - (s.vars.holdT0 as number) >= HOLD_S && (s.vars.holdP0 as number) - rel(s, 'filt') < 0.1) s.vars.n2ok = true;
  },

  inspect(s, target) {
    if (target === 'comp.sightglass') {
      const sg = s.running && s.cycle ? { clair: 'liquide clair', bulles: 'des bulles', mousse: 'mousse' }[s.cycle.sightGlass] : 'à l\'arrêt';
      return `Voyant liquide : ${sg}. Indicateur d'humidité ${moisture(s)}.`;
    }
    if (target === 'comp.receiver') {
      const f = vs(s, 'hp').liquidFraction, V = s.circuit.volumes.hp.V;
      return `Réservoir liquide (côté HP ${fmt(V)} L avec le condenseur) : niveau ≈ ${Math.round(f * 100)} %${f >= FULL_WARN ? ', PRESQUE PLEIN !' : '.'}`;
    }
    if (target === 'comp.filter') {
      if (!s.vars.joined) return `Filtre déshydrateur ${FILTERS.dml.split(' :')[0]}, ${brazed(s) ? 'brasé' : 'à dudgeons'}, flèche vers le voyant.`;
      return `Filtre neuf ${s.vars.type === 'dml' ? 'DML' : 'DCL'}, flèche vers ${s.vars.arrow === 'flow' ? 'le voyant' : 'le réservoir'}.`;
    }
    return undefined;
  },

  rules: [
    {
      id: 'pumpdown-overfill', severity: 'critical', skill: 'A1:9.08', lesson: 'composants',
      message: 'Pump-down poursuivi réservoir plein : le liquide remplit tout le volume, la HP s\'envole (déclenchement KP5, risque d\'éclatement hydraulique). '
        + 'Arrêtez le pump-down et récupérez le reste.',
      when: ({ s }) => s.plant.kp5.tripped || (s.running && vs(s, 'hp').phase === 'liquidFull'),
    },
    {
      id: 'pumpdown-vacuum', severity: 'major', skill: 'A1:9.08', lesson: 'vide-pression',
      message: 'Aspiration tirée au vide (pressostat BP shunté ou trop bas) : de l\'air humide entre par la garniture et les raccords.',
      when: ({ s }) => !!s.vars.suctionVacuum,
    },
    {
      id: 'open-under-pressure', severity: 'critical', skill: 'A1:5.03', lesson: 'recuperation',
      message: 'Section ouverte sous pression de fluide : le fluide restant est rejeté à l\'atmosphère. Récupérez jusqu\'à une légère pression positive.',
      when: ({ s }) => !!s.vars.openedUnderPressure,
    },
    {
      id: 'open-under-vacuum', severity: 'minor', skill: 'A1:9.09', lesson: 'recuperation',
      message: 'Section ouverte en dépression : de l\'air humide est aspiré dans le circuit. Laissez une légère pression positive.',
      when: ({ s }) => !!s.vars.openedUnderVacuum,
    },
    {
      id: 'brazing-pressurised', severity: 'critical', skill: 'A1:10.01', lesson: 'brasage',
      message: 'Chalumeau sur un tube encore sous pression de fluide : décomposition toxique (HF), risque d\'éclatement du tube chauffé.',
      when: ({ s }) => !!s.vars.heatedPressurised,
    },
    {
      id: 'no-sweep', severity: 'major', skill: 'A1:10.01', lesson: 'brasage',
      message: 'Brasure sans balayage d\'azote : la calamine (oxyde de cuivre) se détache et colmate filtre et détendeur.',
      when: ({ s }) => !!s.vars.noSweep,
    },
    {
      id: 'arrow-backwards', severity: 'major', skill: 'A1:9.07', lesson: 'composants',
      message: 'Filtre monté à l\'envers : le déshydratant est délavé et part vers le détendeur.',
      when: ({ a, s }) => a.type === 'custom' && a.id === 'join' && s.vars.arrow === 'back',
    },
    {
      id: 'wrong-filter', severity: 'major', skill: 'A1:9.07', lesson: 'composants',
      message: 'Filtre pour CFC/HCFC et huile minérale : avec un HFC et de l\'huile POE, il faut un filtre 100 % tamis moléculaire.',
      when: ({ a, s }) => a.type === 'custom' && a.id === 'join' && s.vars.type === 'dcl',
    },
    {
      id: 'filter-open-early', severity: 'minor', skill: 'A1:9.07', lesson: 'composants',
      message: 'Filtre neuf débouché trop tôt : le tamis absorbe l\'humidité de l\'air avant d\'être en place.',
      when: ({ s }) => !!s.vars.uncappedEarly,
    },
    {
      id: 'saw-cut', severity: 'minor', skill: 'A1:10.01', lesson: 'brasage',
      message: 'Coupe à la scie : les copeaux partent dans le circuit. Utilisez un coupe-tube.',
      when: ({ s }) => !!s.vars.sawn,
    },
  ],

  perfectRun(tier) {
    const noop: Action = { type: 'pickTool', tool: null };
    const waitUntil = (p: (s: GameState) => boolean, seconds: number, n: number): Step[] =>
      Array.from({ length: n }, () => (s: GameState) => (p(s) ? noop : { type: 'wait', seconds }));
    const dT = (s: GameState) => Math.round((T(s, 'joint.filterIn') - T(s, 'joint.filterOut')) * 10) / 10;
    const exam = tier === 'examen';
    const steps: Step[] = [
      { type: 'answer', field: 'sv1', value: 1 },
      { type: 'answer', field: 'sv2', value: 2 },
      { type: 'answer', field: 'sv3', value: 0 },
      { type: 'inspect', target: 'comp.sightglass' },
      { type: 'measure', tool: 'thermometer', target: 'joint.filterIn' },
      { type: 'measure', tool: 'thermometer', target: 'joint.filterOut' },
      (s) => ({ type: 'answer', field: 'dtBefore', value: dT(s) }),
      { type: 'answer', field: 'diag', value: 0 },
      { type: 'toggleCap', target: 'valve.receiver' },
      { type: 'setServiceValve', valve: 'valve.receiver', pos: 'closed' },
      ...(exam
        ? [...waitUntil((s) => vs(s, 'hp').liquidFraction >= FULL_WARN, 1, 40), { type: 'inspect', target: 'comp.receiver' } as Action, { type: 'setUnit', on: false } as Action]
        : waitUntil((s) => !s.running, 5, 20)),
      { type: 'toggleCap', target: 'valve.liquid' },
      { type: 'setServiceValve', valve: 'valve.liquid', pos: 'closed' },
      { type: 'lockout' },
      { type: 'checkVoltage' },
      // recover the section through port.liq
      { type: 'toggleCap', target: 'port.liq' },
      { type: 'connectHose', hose: 'red', end: 'port', socket: 'port.liq' },
      { type: 'connectHose', hose: 'yellow', end: 'port', socket: 'rec.in' },
      { type: 'toggleHoseValve', hose: 'yellow' },
      { type: 'connectHose', hose: 'rec', end: 'manifold', socket: 'rec.out' },
      { type: 'connectHose', hose: 'rec', end: 'port', socket: 'cyl.gas' },
      { type: 'cylValve', valve: 'gas' },
      { type: 'toggleManifold', valve: 'hp' },
      { type: 'device', device: 'recovery', on: true },
      ...waitUntil((s) => P(s, 'filt') <= P_ATM + 0.15, 10, 30),
      { type: 'device', device: 'recovery', on: false },
      { type: 'cylValve', valve: 'gas' },
      { type: 'toggleHoseValve', hose: 'yellow' },
      { type: 'disconnectHose', hose: 'yellow', end: 'port' },
      { type: 'connectHose', hose: 'yellow', end: 'port', socket: 'n2' },
      { type: 'custom', id: 'cut' },
      { type: 'setN2', setpoint: P_ATM + 0.2 },
      { type: 'device', device: 'n2', on: true },
      { type: 'wait', seconds: 20 },
      { type: 'custom', id: 'pick-dml' },
      { type: 'custom', id: 'uncap' },
      { type: 'custom', id: 'place-flow' },
      { type: 'custom', id: 'join' },
      { type: 'setN2', setpoint: P_ATM + TEST },
      ...waitUntil((s) => rel(s, 'filt') >= TEST - 0.5, 10, 30),
      { type: 'device', device: 'n2', on: false },
      { type: 'wait', seconds: HOLD_S + 10 },
      { type: 'setN2', setpoint: P_ATM },
      ...waitUntil((s) => rel(s, 'filt') <= 0.05, 10, 30),
      { type: 'disconnectHose', hose: 'yellow', end: 'port' },
      { type: 'connectHose', hose: 'yellow', end: 'port', socket: 'pump' },
      { type: 'device', device: 'pump', on: true },
      ...waitUntil((s) => P(s, 'filt') <= VAC * 0.8, 30, 40),
      { type: 'toggleManifold', valve: 'hp' },
      { type: 'device', device: 'pump', on: false },
      { type: 'disconnectHose', hose: 'red', end: 'port' },
      { type: 'toggleCap', target: 'port.liq' },
      { type: 'setServiceValve', valve: 'valve.liquid', pos: 'open' },
      { type: 'setServiceValve', valve: 'valve.receiver', pos: 'open' },
      { type: 'toggleCap', target: 'valve.liquid' },
      { type: 'toggleCap', target: 'valve.receiver' },
      { type: 'unlock' },
      { type: 'setUnit', on: true },
      { type: 'wait', seconds: 240 },
      { type: 'measure', tool: 'thermometer', target: 'joint.filterIn' },
      { type: 'measure', tool: 'thermometer', target: 'joint.filterOut' },
      (s) => ({ type: 'answer', field: 'dtAfter', value: dT(s) }),
    ];
    if (!exam) steps.push({ type: 'custom', id: 'later' }, { type: 'inspect', target: 'comp.sightglass' });
    steps.push({ type: 'finish' });
    return steps;
  },
};

export default L09;
