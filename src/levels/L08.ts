import { P_ATM, toRel, tsat } from '../physics/refrigerants';
import type { TxvState } from '../physics/types';
import { P, closeSection, defaultReading, gaugeP, hoseAt, makePlatine, openSection, startUnit, vs } from '../game/platineModel';
import { fmt, isPort, refuse } from '../game/engine';
import type { Action, GameState, Level, Step, Tier } from '../game/types';

const SECTION = ['liq', 'lp'];
const TEST = 10, HOLD = 5 * 60, VAC = 0.002; // bar rel, s, bar abs
const SETTLE = 590; // s between TXV adjustments (10 min, float margin)
const GOOD_ORIFICE = 4;
const FACTORY_SH = 8; // static SH of a new valve on this evaporator → measured SH ≈ 10 K
const VARIANTS = ['loose', 'dead', 'big', 'small'] as const;
type Variant = (typeof VARIANTS)[number];
const DIAGS = [
  'Bulbe détaché / mal fixé',
  'Élément thermostatique mort (charge du bulbe perdue)',
  'Orifice trop gros (pompage)',
  'Orifice trop petit',
  'Manque de fluide',
  'Filtre déshydrateur colmaté',
];
const BODIES = {
  R32: 'Détendeur à élément thermostatique R32 (fluide marqué sur l\'élément)',
  N: 'Détendeur à élément R134a (ancienne désignation Danfoss « N »)',
  S: 'Détendeur à élément R404A/R507 (ancienne désignation « S »)',
  X: 'Détendeur à élément R22/R407C (ancienne désignation « X »)',
} as const;
const BULB_POS = {
  ok: 'aspiration horizontale en sortie d\'évaporateur, avant le piquage d\'égalisation, à 1 h',
  after: 'après le piquage d\'égalisation',
  riser: 'sur la remontée verticale',
  six: 'sous le tube, à 6 h',
} as const;
const ORIFICE_TABLE = '00 : 0,5 · 01 : 1,0 · 02 : 1,7 · 03 : 2,6 · 04 : 3,8 · 05 : 5,3 · 06 : 7,2 kW';

const v = (s: GameState) => s.vars;
const variant = (s: GameState) => s.vars.variant as Variant;
const ok = (s: GameState, id: string) => !!s.answers[id]?.ok;
const rel = (s: GameState, id: string) => toRel(P(s, id));
const cy = (s: GameState) => s.cycle ?? { SH: NaN };
const repl = (s: GameState) => variant(s) !== 'loose' || !!v(s).everOpened;
const opened = (s: GameState) => s.opened.length > 0;
const bpGauge = (s: GameState) => !!hoseAt(s, 'port.evap') || (!!hoseAt(s, 'port.lp') && s.valves.gas !== 'back');
const hunting = (s: GameState) => s.running && !!v(s).fitted && (v(s).orifice as number) > GOOD_ORIFICE && s.plant.faults.txv === 'ok';
const bodyOk = (s: GameState) => v(s).pickBody === 'R32' || (v(s).pickBody === 'old' && !v(s).dead);
const pad = (n: number) => `0${n}`;

function txvState(s: GameState): TxvState {
  const x = v(s);
  if (x.dead || (x.body !== 'old' && x.body !== 'R32')) return 'bulbLost';
  if (!x.eq || (x.orifice as number) < GOOD_ORIFICE || !x.bulbPos) return 'tooClosed'; // a dangling bulb lies on the cold coil
  if (x.bulbPos !== 'ok' || !x.insul) return 'bulbLoose'; // warm air on the bulb → overfeed, erratic
  return 'ok';
}
function applyTxv(s: GameState) {
  s.plant.faults.txv = txvState(s);
  s.bulbAttached = !!v(s).bulbPos;
}

function warmText(s: GameState): string {
  const bp = fmt(toRel(gaugeP(s, 'mf.lp')));
  const t = txvState(s);
  if (t === 'bulbLost') return `Bulbe chauffé dans la main 1 min : aucune réaction de la BP (${bp} bar). L'élément thermostatique ne répond plus.`;
  if ((v(s).orifice as number) < GOOD_ORIFICE) return `Bulbe chauffé : la BP monte à peine (+0,2 bar depuis ${bp} bar), la surchauffe reste haute. Le détendeur s'ouvre en grand mais le passage est trop petit.`;
  if (hunting(s)) return `Bulbe chauffé : la BP monte fort (+1,2 bar), l'aspiration se refroidit d'un coup, puis tout repart en oscillation.`;
  return `Bulbe chauffé : la BP monte nettement (+0,8 bar depuis ${bp} bar) puis redescend. L'élément réagit.`;
}

function bulbText(s: GameState): string {
  const x = v(s);
  if (!x.fitted) return 'Bulbe déposé avec le détendeur.';
  if (!x.bulbPos) return 'Bulbe détaché : il pend contre les ailettes froides de l\'évaporateur, collier desserré, manchon isolant tombé.';
  return `Bulbe fixé ${BULB_POS[x.bulbPos as keyof typeof BULB_POS]}, collier serré, ${x.insul ? 'isolé' : 'non isolé'}.`;
}

function txvText(s: GameState): string {
  const x = v(s);
  const dossier = `Dossier technique : évaporateur 3,5 kW. Capacité par orifice en R32 (indicatif, à vérifier dans la documentation du fabricant) : ${ORIFICE_TABLE}.`;
  if (!x.fitted) return `Détendeur déposé. ${dossier}`;
  const body = x.body === 'old' ? 'Détendeur Danfoss d\'origine, élément R32' : BODIES[x.body as keyof typeof BODIES];
  return `${body}, orifice n° ${pad(x.orifice as number)}, égalisation externe ${x.eq ? 'raccordée' : 'NON raccordée'}. ${dossier}`;
}

const L08: Level = {
  id: 'L08',
  title: 'Remplacer un détendeur thermostatique Danfoss',
  skills: ['A1:9.01', 'A1:9.02', 'A1:9.03', 'A1:9.09', 'A1:12.07', 'A1:10.01', 'A1:6.04', 'A1:3.02', 'A1:3.04', 'CAP:UP3'],
  lesson: 'composants',
  scene: 'PLATINE',
  fluid: 'R32',
  briefing: 'Surchauffe élevée et pièce qui ne descend pas. Diagnostiquez le détendeur thermostatique Danfoss à orifice interchangeable (raccords dudgeon, égalisation externe, '
    + 'orifice 00–06 indépendant du fluide, élément thermostatique et bulbe propres au fluide), remplacez-le si nécessaire et réglez la surchauffe entre 5 et 8 K '
    + '(¼ de tour à la fois, sens horaire = fermeture = surchauffe ↑, 10 min d\'attente entre deux réglages). '
    + 'Remplacement : pump-down sur la vanne liquide jusqu\'à la coupure du KP1 (≈ 0,2 bar), vanne gaz en contre-siège avant, consignation ; '
    + `la section intérieure (ligne liquide après la vanne + évaporateur) s'ouvre légèrement au-dessus de 0 bar. Après remontage : essai azote ${TEST} bar `
    + `rel par la prise évaporateur (${HOLD / 60} min), tirage au vide < 2 mbar. Les anciennes lettres de désignation (N, S, X…) ne remplacent pas le fluide marqué sur l'élément.`,
  tierNotes: {
    guide: 'Bulbe tombé de la tuyauterie : on vérifie toujours le simple avant de démonter.',
    standard: 'Élément thermostatique mort : remplacement complet du détendeur.',
    examen: 'Panne aléatoire (bulbe, élément, orifice trop gros ou trop petit), 90 min.',
  },
  tools: ['hand', 'wrench', 'screwdriver', 'thermometer', 'coreTool'],
  unitControl: true,
  timeLimit: 90 * 60,

  setup(tier: Tier, rng) {
    const vr: Variant = tier === 'guide' ? 'loose' : tier === 'standard' ? 'dead' : VARIANTS[Math.floor(rng() * VARIANTS.length)];
    const s = makePlatine({
      levelId: 'L08', tier, Tamb: 30,
      bench: tier === 'guide' ? {} : { n2: { open: false, setpoint: P_ATM }, pump: { on: false, speed: 3.4, ultimate: 5e-5 }, vacuumGaugeAt: 'lp' },
    });
    s.plant.kp1.range = 1.7; // cut-out 0.2 bar rel: pump-down to slightly above 0
    Object.assign(s.vars, {
      variant: vr, body: 'old', dead: vr === 'dead', orifice: vr === 'big' ? 6 : vr === 'small' ? 2 : GOOD_ORIFICE,
      fitted: true, eq: true, bulbPos: vr === 'loose' ? '' : 'ok', insul: vr !== 'loose', pickBody: '', pickOrifice: -1, adjT: -1e9, adjSum: 0,
    });
    // someone "fixed" the high superheat by opening the valve before checking the bulb
    if (vr === 'loose') s.plant.txvSH = 1;
    applyTxv(s);
    startUnit(s);
    return s;
  },

  actions: [
    { id: 'bulb-warm', label: 'Chauffer le bulbe dans la main (test de l\'élément)', visible: (s) => !!v(s).fitted && !!v(s).bulbPos },
    { id: 'open-section', label: 'Déposer le détendeur (ouvrir la section intérieure)', visible: (s) => s.tier !== 'guide' && !opened(s) },
    ...Object.entries(BODIES).map(([k, label]) => ({ id: `body-${k}`, label: `Prendre : ${label}`, visible: (s: GameState) => opened(s) && !v(s).fitted })),
    { id: 'body-old', label: 'Conserver le détendeur déposé (élément d\'origine)', visible: (s) => opened(s) && !v(s).fitted },
    { id: 'orifice', label: 'Choisir l\'orifice (n° 00 à 06)', visible: (s) => opened(s) && !v(s).fitted, input: { unit: 'n°', min: 0, max: 6, step: 1 } },
    { id: 'fit-new', label: 'Monter le détendeur (flèche dans le sens du flux), écrous et joints neufs', visible: (s) => opened(s) && !v(s).fitted },
    { id: 'fit-old', label: 'Monter le détendeur en réutilisant les anciens écrous et joints', visible: (s) => opened(s) && !v(s).fitted },
    { id: 'eq-connect', label: 'Raccorder la ligne d\'égalisation externe', visible: (s) => opened(s) && !!v(s).fitted && !v(s).eq },
    ...Object.entries(BULB_POS).map(([k, label]) => ({
      id: `bulb-pos-${k}`, label: `Fixer le bulbe : ${label}`, visible: (s: GameState) => !!v(s).fitted && v(s).bulbPos !== 'ok',
    })),
    { id: 'bulb-insulate', label: 'Isoler le bulbe (manchon isolant)', visible: (s) => !!v(s).bulbPos && !v(s).insul },
    { id: 'close-section', label: 'Section remontée : refermer', visible: (s) => opened(s) && !!v(s).fitted },
  ],

  onAction(s, a) {
    const x = v(s);
    let text: string | undefined;
    if (a.type === 'adjustTxv') {
      const n = Math.abs(Math.round(a.quarterTurns));
      x.adjSum = s.t - (x.adjT as number) < SETTLE ? (x.adjSum as number) + n : n;
      x.adjT = s.t;
    }
    // a hunting valve swings 0–12 K in 90 s: any reading inside the swing is a fair initial measure
    if (a.type === 'answer' && a.field === 'SH0' && hunting(s) && a.value >= -0.5 && a.value <= 12.5) s.answers.SH0.ok = true;
    if (a.type === 'answer' && a.field === 'SH') {
      const last = Math.max(x.adjT as number, s.starts.at(-1) ?? -1e9);
      const sh = cy(s).SH;
      x.shStable = ok(s, 'SH') && s.running && sh >= 5 && sh <= 8 && s.t - last >= SETTLE && !hunting(s);
    }
    if (a.type === 'custom') {
      const id = a.id;
      if (id === 'bulb-warm') {
        if (!s.running || !s.cycle) refuse('Unité à l\'arrêt : le test du bulbe se fait en fonctionnement.');
        if (!bpGauge(s)) refuse('Branchez d\'abord un manomètre BP pour voir la réaction.');
        x.warmed = true;
        text = warmText(s);
      } else if (id === 'open-section') {
        if (!s.elec.locked) refuse('Consignez l\'installation avant d\'ouvrir le circuit.');
        const pl = rel(s, 'lp');
        const pmax = openSection(s, SECTION);
        // a closed (dead) TXV drains the short liquid line slowly: judge on what the gauge at port.evap shows
        x.openP = pmax < 0 ? pmax : pl;
        Object.assign(x, { everOpened: true, fitted: false, eq: false, bulbPos: '', insul: false, pickBody: '', pickOrifice: -1, n2Ok: false, vacOk: false });
        s.leaks = s.leaks.filter((l) => l.joint !== 'joint.txvIn');
        text = `Détendeur déposé (dudgeons entrée/sortie, égalisation, bulbe) : section à ${fmt(x.openP as number)} bar rel à l'ouverture`;
      } else if (id.startsWith('body-')) {
        x.pickBody = id.slice(5);
        text = id === 'body-old' ? 'Détendeur déposé conservé' : `Pris sur le plateau : ${BODIES[x.pickBody as keyof typeof BODIES]}`;
      } else if (id === 'orifice') {
        const n = Math.round(Number(a.value));
        if (!(n >= 0 && n <= 6)) refuse('Orifices disponibles : 00 à 06.');
        x.pickOrifice = n;
        text = `Orifice n° ${pad(n)} choisi`;
      } else if (id === 'fit-new' || id === 'fit-old') {
        if (!x.pickBody || (x.pickOrifice as number) < 0) refuse('Choisissez d\'abord l\'élément et l\'orifice.');
        if (x.pickBody !== 'old') { x.dead = false; s.plant.txvSH = FACTORY_SH; }
        Object.assign(x, { body: x.pickBody, orifice: x.pickOrifice, fitted: true, newNuts: id === 'fit-new' });
        if (id === 'fit-old') s.leaks.push({ at: 'liq', k: 5e-7, joint: 'joint.txvIn' });
        text = `Détendeur monté, orifice ${pad(x.orifice as number)}, ${id === 'fit-new' ? 'écrous et joints neufs' : 'anciens écrous et joints'}`;
      } else if (id === 'eq-connect') {
        x.eq = true;
        text = 'Égalisation externe raccordée (en aval du bulbe)';
      } else if (id.startsWith('bulb-pos-')) {
        x.bulbPos = id.slice(9);
        x.insul = false;
        text = `Bulbe fixé : ${BULB_POS[x.bulbPos as keyof typeof BULB_POS]}`;
      } else if (id === 'bulb-insulate') {
        x.insul = true;
        text = 'Bulbe isolé';
      } else if (id === 'close-section') {
        closeSection(s, SECTION);
        text = `Section refermée${x.eq ? '' : ' (égalisation non raccordée !)'}`;
      }
    }
    applyTxv(s);
    return text;
  },

  onTick(s) {
    const x = v(s);
    if (s.unitOn && !s.running && s.valves.liquid === 'closed' && s.plant.kp1.tripped) x.pumpedDown = true;
    if (hunting(s) && s.cycle) {
      const sh = 6 + 6 * Math.sin((2 * Math.PI * s.t) / 90);
      Object.assign(s.cycle, { SH: sh, Tsuction: s.cycle.Tevap + sh, floodBack: sh < 1 });
    }
    if (!x.everOpened || opened(s) || !x.fitted) return;
    const pl = rel(s, 'lp'), pq = rel(s, 'liq');
    if (pl >= TEST - 0.3 && pq >= TEST - 0.3 && vs(s, 'lp').PN2 > 5 && !s.manifold.valves.lp) {
      x.holdT0 ??= s.t;
      x.holdP0 ??= pl;
      if (s.t - (x.holdT0 as number) >= HOLD && (x.holdP0 as number) - pl < 0.1) x.n2Ok = true;
    } else { delete x.holdT0; delete x.holdP0; }
    if (x.n2Ok && P(s, 'lp') <= VAC && P(s, 'liq') <= VAC) x.vacOk = true;
  },

  inspect(s, target) {
    if (target === 'comp.txvBulb') return bulbText(s);
    if (target === 'comp.txv') return txvText(s);
    return undefined;
  },

  objectives: [
    {
      id: 'measure', label: 'Mesurer la surchauffe (manomètre BP sur la prise évaporateur, thermomètre au bulbe)',
      done: (s) => ok(s, 'SH0'),
      hints: ['Surchauffe = T aspiration au bulbe − T de rosée lue à la BP.',
        'Retirez le bouchon de la prise évaporateur, raccordez le flexible bleu, thermomètre sur le bulbe, puis saisissez la surchauffe.', ['port.evap', 'comp.txvBulb']],
    },
    {
      id: 'sight', label: 'Contrôler le voyant liquide (écarter le manque de fluide)',
      done: (s) => s.inspected.includes('comp.sightglass'),
      hints: ['Surchauffe haute : manque de fluide ou détendeur qui ne laisse pas passer ?', 'Inspectez le voyant (outil main).', ['comp.sightglass']],
    },
    {
      id: 'bulb-check', label: 'Contrôler le bulbe et le détendeur',
      done: (s) => s.inspected.includes('comp.txvBulb'),
      hints: ['Le simple d\'abord : le bulbe est-il bien fixé et isolé ?', 'Inspectez le bulbe (outil main), puis le détendeur.', ['comp.txvBulb', 'comp.txv']],
    },
    {
      id: 'warm', label: 'Tester l\'élément thermostatique (bulbe chauffé à la main)', tiers: ['standard', 'examen'],
      done: (s) => !!v(s).warmed,
      hints: ['Un élément vivant ouvre le détendeur quand on chauffe le bulbe : la BP monte.', 'Action « Chauffer le bulbe » en surveillant le manomètre BP.', ['comp.txvBulb']],
    },
    {
      id: 'diag', label: 'Poser le diagnostic',
      done: (s) => ok(s, 'diag'),
      hints: ['Voyant plein, surchauffe haute : la panne est au détendeur.', 'Bulbe détaché ? Pas de réaction au bulbe chauffé ? Orifice gravé différent du dossier ?'],
    },
    {
      id: 'pumpdown', label: 'Pump-down : fermer la vanne liquide, attendre la coupure du KP1', tiers: ['standard', 'examen'],
      done: (s) => !repl(s) || !!v(s).pumpedDown,
      hints: ['Le fluide se range dans le réservoir avant d\'ouvrir.', 'Retirez le chapeau de la vanne liquide, fermez-la, laissez tourner jusqu\'à la coupure du pressostat BP.', ['valve.liquid', 'comp.kp1']],
    },
    {
      id: 'isolate', label: 'Vanne gaz en contre-siège avant, consigner et vérifier l\'absence de tension', tiers: ['standard', 'examen'],
      done: (s) => !repl(s) || (s.valves.gas === 'front' && s.elec.locked && s.elec.voltageChecked),
      hints: ['Une unité pump-downée laissée sous tension redémarre toute seule.', 'Clé : vanne gaz en contre-siège avant. Coffret : consigner puis VAT.', ['valve.gas', 'comp.elecBox']],
    },
    {
      id: 'note', label: 'Relever la pression de la section intérieure avant ouverture', tiers: ['standard', 'examen'],
      done: (s) => !repl(s) || ok(s, 'Psection'),
      hints: ['On ouvre légèrement au-dessus de 0 bar : ni sous pression, ni sous vide.', 'Lisez le manomètre BP raccordé sur la prise évaporateur et saisissez la pression.', ['port.evap']],
    },
    {
      id: 'open', label: 'Déposer le détendeur', tiers: ['standard', 'examen'],
      done: (s) => !repl(s) || !!v(s).everOpened,
      hints: ['Section entre 0 et 0,5 bar rel, installation consignée.', 'Action « Déposer le détendeur ».', ['comp.txv']],
    },
    {
      id: 'parts', label: 'Choisir l\'élément thermostatique pour le R32 et l\'orifice adapté', tiers: ['standard', 'examen'],
      done: (s) => !repl(s) || (bodyOk(s) && v(s).pickOrifice === GOOD_ORIFICE),
      hints: ['La charge du bulbe (élément) est propre au fluide ; l\'orifice, indépendant du fluide, se choisit sur la puissance de l\'évaporateur.',
        'Élément marqué R32 ; table du dossier technique (inspecter le détendeur) : 3,5 kW → le plus petit orifice qui couvre 3,5 kW.', ['comp.txv']],
    },
    {
      id: 'fit', label: 'Monter le détendeur avec écrous et joints neufs', tiers: ['standard', 'examen'],
      done: (s) => !repl(s) || (!!v(s).fitted && !!v(s).everOpened),
      hints: ['Flèche dans le sens du flux, dudgeons neufs.', 'Action « Monter le détendeur … écrous et joints neufs ».', ['joint.txvIn', 'joint.txvOut']],
    },
    {
      id: 'eq', label: 'Raccorder l\'égalisation externe', tiers: ['standard', 'examen'],
      done: (s) => !repl(s) || !!v(s).eq,
      hints: ['Sans égalisation, le détendeur ne voit pas la pression de sortie d\'évaporateur.', 'Action « Raccorder la ligne d\'égalisation externe ».', ['comp.txv']],
    },
    {
      id: 'bulb', label: 'Fixer le bulbe au bon endroit',
      done: (s) => v(s).bulbPos === 'ok',
      hints: ['Aspiration horizontale, près de la sortie évaporateur, avant le piquage d\'égalisation.',
        'Sur un petit tube, à 1 h ; jamais dessous (huile) ni sur une remontée.', ['comp.txvBulb']],
    },
    {
      id: 'insulate', label: 'Isoler le bulbe',
      done: (s) => v(s).bulbPos === 'ok' && !!v(s).insul,
      hints: ['Un bulbe à l\'air libre lit l\'air ambiant, pas l\'aspiration.', 'Action « Isoler le bulbe ».', ['comp.txvBulb']],
    },
    {
      id: 'close', label: 'Refermer la section', tiers: ['standard', 'examen'],
      done: (s) => !repl(s) || (!opened(s) && !!v(s).fitted),
      hints: ['Tout est remonté ?', 'Action « Section remontée : refermer ».'],
    },
    {
      id: 'n2', label: `Essai azote de la section (${TEST} bar rel, ${HOLD / 60} min, isolée)`, tiers: ['standard', 'examen'],
      done: (s) => !repl(s) || !!v(s).n2Ok,
      hints: ['Électrovanne fermée hors tension : la ligne liquide n\'est pas reliée à la prise évaporateur.',
          `Clé ou tournevis sur l'électrovanne (ouverture manuelle), flexible jaune sur l'azote (${TEST} bar), manifold BP ouvert, puis isolez et attendez ${HOLD / 60} min.`, ['comp.solenoid', 'port.evap']],
    },
    {
      id: 'vac', label: 'Vidanger l\'azote et tirer la section au vide (< 2 mbar)', tiers: ['standard', 'examen'],
      done: (s) => !repl(s) || !!v(s).vacOk,
      hints: ['Déposez le flexible jaune du détendeur azote (« déposer côté prise ») et ouvrez la vanne BP du manifold : l\'azote s\'échappe jusqu\'à 0 bar.', 'Puis flexible jaune sur la pompe, manifold BP ouvert, pompe en marche jusqu\'à < 2 mbar.', ['port.evap']],
    },
    {
      id: 'reopen', label: 'Rouvrir vanne gaz et vanne liquide, retirer l\'ouverture manuelle', tiers: ['standard', 'examen'],
      done: (s) => !repl(s) || (s.valves.gas !== 'front' && s.valves.liquid === 'open' && !s.valves.solenoid),
      hints: ['Isolez la pompe d\'abord.', 'Vanne gaz en contre-siège arrière, vanne liquide ouverte, ouverture manuelle de l\'électrovanne retirée (clé ou tournevis sur l\'électrovanne).', ['valve.gas', 'valve.liquid', 'comp.solenoid']],
    },
    {
      id: 'start', label: 'Déconsigner et remettre en marche', tiers: ['standard', 'examen'],
      done: (s) => !repl(s) || (!s.elec.locked && s.running),
      hints: ['Coffret électrique.', 'Déconsignez puis mettez l\'unité en marche.', ['comp.elecBox']],
    },
    {
      id: 'adjust', label: 'Régler la surchauffe entre 5 et 8 K (¼ de tour, 10 min entre réglages) et la relever stabilisée',
      done: (s) => !!v(s).shStable,
      hints: ['Sens horaire = fermeture = surchauffe ↑ (≈ 1 K par ¼ de tour).',
        'Tournevis sur le détendeur, ½ tour maxi, attendez 10 min, mesurez, recommencez si besoin, puis saisissez la surchauffe.', ['comp.txv']],
    },
    {
      id: 'end', label: 'Déposer les flexibles, remettre bouchons et chapeaux',
      done: (s) => !s.hoses.some((h) => h.port && isPort(h.port)) && Object.values(s.caps).every(Boolean),
      hints: ['Le bouchon est l\'étanchéité finale.', 'Déposez le flexible bleu, remettez tous les bouchons et chapeaux.', ['port.evap', 'valve.gas', 'valve.liquid']],
    },
  ],

  answers: [
    { id: 'SH0', label: 'Surchauffe initiale', unit: 'K', tol: 1.5, expected: (s) => cy(s).SH },
    { id: 'diag', label: 'Diagnostic', unit: '', tol: 0, choices: DIAGS, expected: (s) => VARIANTS.indexOf(variant(s)) },
    { id: 'Psection', label: 'Pression section intérieure', unit: 'bar', tol: 0.1, expected: (s) => rel(s, 'lp'), tiers: ['standard', 'examen'] },
    { id: 'SH', label: 'Surchauffe réglée', unit: 'K', tol: 1, expected: (s) => cy(s).SH },
  ],

  rules: [
    {
      id: 'open-under-pressure', severity: 'critical', skill: 'A1:5.02', lesson: 'recuperation',
      message: 'Section ouverte à plus de 0,5 bar rel : le fluide part à l\'atmosphère. Pump-down (et récupération du résiduel) avant d\'ouvrir.',
      when: ({ a, s }) => a.type === 'custom' && a.id === 'open-section' && (s.vars.openP as number) > 0.5,
    },
    {
      id: 'open-under-vacuum', severity: 'major', skill: 'A1:3.04', lesson: 'vide-pression',
      message: 'Section ouverte sous vide : de l\'air humide est aspiré dans le circuit. Remontez légèrement au-dessus de 0 bar (azote) avant d\'ouvrir.',
      when: ({ a, s }) => a.type === 'custom' && a.id === 'open-section' && (s.vars.openP as number) < 0,
    },
    {
      id: 'wrong-body', severity: 'major', skill: 'A1:9.02', lesson: 'composants',
      message: 'Élément thermostatique prévu pour un autre fluide : la charge du bulbe n\'a pas la bonne relation pression–température pour le R32, le détendeur alimente mal.',
      when: ({ a }) => a.type === 'custom' && ['body-N', 'body-S', 'body-X'].includes(a.id),
    },
    {
      id: 'bulb-wrong-place', severity: 'major', skill: 'A1:9.03', lesson: 'composants',
      message: 'Bulbe mal placé ou non isolé : il doit être sur l\'aspiration horizontale près de la sortie évaporateur, avant l\'égalisation, à 1 h sur un petit tube, bien serré et isolé. Sinon la régulation est erratique.',
      when: ({ a, s }) => (a.type === 'custom' && a.id.startsWith('bulb-pos-') && a.id !== 'bulb-pos-ok')
        || (((a.type === 'setUnit' && a.on) || a.type === 'finish') && !!s.vars.bulbPos && !s.vars.insul),
    },
    {
      id: 'equaliser-missing', severity: 'major', skill: 'A1:9.03', lesson: 'composants',
      message: 'Égalisation externe non raccordée : le détendeur ne voit pas la pression de sortie d\'évaporateur et alimente mal.',
      when: ({ a, s }) => a.type === 'custom' && a.id === 'close-section' && !s.vars.eq,
    },
    {
      id: 'big-adjust', severity: 'minor', skill: 'A1:9.09', lesson: 'composants',
      message: 'Plus d\'un demi-tour sans attendre la stabilisation : on sur-corrige et le détendeur pompe. ¼ de tour à la fois, 10 à 15 min entre deux réglages.',
      when: ({ a, s }) => a.type === 'adjustTxv' && (s.vars.adjSum as number) > 2,
    },
    {
      id: 'skip-tests', severity: 'major', skill: 'A1:3.02', lesson: 'etancheite',
      message: 'Section remise en service sans essai azote et tirage au vide : fuite non détectée, air et humidité dans le circuit.',
      when: ({ a, s }) => !!s.vars.everOpened && !opened(s) && !(s.vars.n2Ok && s.vars.vacOk) && (
        (a.type === 'setServiceValve' && ((a.valve === 'valve.gas' && a.pos !== 'front') || (a.valve === 'valve.liquid' && a.pos === 'open')))
        || (a.type === 'setUnit' && a.on) || a.type === 'finish'),
    },
    {
      id: 'reuse-gasket', severity: 'minor', skill: 'A1:4.01', lesson: 'etancheite',
      message: 'Anciens écrous dudgeon et joints réutilisés : collet écroui, point de fuite. Toujours neufs au remontage.',
      when: ({ a }) => a.type === 'custom' && a.id === 'fit-old',
    },
    {
      id: 'wrong-diagnosis', severity: 'major', skill: 'A1:9.01', lesson: 'composants',
      message: 'Mauvais diagnostic. Voyant plein + surchauffe haute = détendeur : bulbe détaché ? élément sans réaction au bulbe chauffé ? orifice gravé différent du dossier (trop petit : surchauffe haute ; trop gros : pompage) ?',
      when: ({ a, s }) => a.type === 'answer' && a.field === 'diag' && !s.answers.diag?.ok,
    },
  ],

  perfectRun(tier) {
    const noop: Action = { type: 'pickTool', tool: null };
    const lp = (s: GameState) => gaugeP(s, 'mf.lp');
    const temp = (s: GameState) => defaultReading(s, { tool: 'thermometer', target: 'comp.txvBulb' })!.value;
    const r1 = (x: number) => Math.round(x * 10) / 10;
    const sh: Step = (s) => ({ type: 'answer', field: s.answers.SH0 ? 'SH' : 'SH0', value: r1(temp(s) - tsat(s.fluid, lp(s), 'dew')) });
    const waitUntil = (p: (s: GameState) => boolean, seconds: number, n: number): Step[] =>
      Array.from({ length: n }, () => (s: GameState) => (p(s) ? noop : { type: 'wait', seconds }));
    const R = (s: GameState) => repl(s);
    const when = (p: (s: GameState) => boolean, steps: Action[]): Step[] => steps.map((a) => (s: GameState) => (p(s) ? a : noop));
    const notR = (s: GameState) => !repl(s);
    // initial SH for the loose bulb: txvSH 1 → 3 K once fixed; new body: factory 8 → 10 K
    const adjust = (s: GameState): Action => {
      const delta = Math.max(-2, Math.min(2, 5 - s.plant.txvSH));
      return delta ? { type: 'adjustTxv', quarterTurns: delta } : noop;
    };
    const steps: Step[] = [
      { type: 'toggleCap', target: 'port.evap' },
      { type: 'connectHose', hose: 'blue', end: 'port', socket: 'port.evap' },
      { type: 'wait', seconds: 30 },
      { type: 'measure', tool: 'thermometer', target: 'comp.txvBulb' },
      sh,
      { type: 'inspect', target: 'comp.sightglass' },
      { type: 'inspect', target: 'comp.txvBulb' },
      { type: 'inspect', target: 'comp.txv' },
      ...(tier === 'guide' ? [] : [{ type: 'custom', id: 'bulb-warm' } as Action]),
      (s) => ({ type: 'answer', field: 'diag', value: VARIANTS.indexOf(variant(s)) }),
      ...when(notR, [{ type: 'custom', id: 'bulb-pos-ok' }, { type: 'custom', id: 'bulb-insulate' }]),
      ...when(R, [
        { type: 'toggleCap', target: 'valve.liquid' },
        { type: 'setServiceValve', valve: 'valve.liquid', pos: 'closed' },
      ]),
      ...waitUntil((s) => !R(s) || !!v(s).pumpedDown, 5, 30),
      ...when(R, [
        { type: 'toggleCap', target: 'valve.gas' },
        { type: 'setServiceValve', valve: 'valve.gas', pos: 'front' },
        { type: 'lockout' },
        { type: 'checkVoltage' },
      ]),
      (s) => (R(s) ? { type: 'answer', field: 'Psection', value: Math.round(toRel(lp(s)) * 100) / 100 } : noop),
      ...when(R, [{ type: 'custom', id: 'open-section' }]),
      (s) => (!R(s) ? noop : { type: 'custom', id: variant(s) === 'dead' ? 'body-R32' : 'body-old' }),
      ...when(R, [
        { type: 'custom', id: 'orifice', value: GOOD_ORIFICE },
        { type: 'custom', id: 'fit-new' },
        { type: 'custom', id: 'eq-connect' },
        { type: 'custom', id: 'bulb-pos-ok' },
        { type: 'custom', id: 'bulb-insulate' },
        { type: 'custom', id: 'close-section' },
        { type: 'toggleSolenoid' },
        { type: 'setN2', setpoint: P_ATM + TEST + 0.2 },
        { type: 'connectHose', hose: 'yellow', end: 'port', socket: 'n2' },
        { type: 'toggleHoseValve', hose: 'yellow' },
        { type: 'device', device: 'n2', on: true },
        { type: 'toggleManifold', valve: 'lp' },
      ]),
      ...waitUntil((s) => !R(s) || (rel(s, 'lp') >= TEST && rel(s, 'liq') >= TEST), 10, 60),
      ...when(R, [
        { type: 'toggleManifold', valve: 'lp' },
        { type: 'device', device: 'n2', on: false },
        { type: 'wait', seconds: HOLD + 10 },
        // the test gas carries the residual R32 of the opened section: vent it through the freed yellow hose
        { type: 'disconnectHose', hose: 'yellow', end: 'port' },
        { type: 'toggleManifold', valve: 'lp' },
      ]),
      ...waitUntil((s) => !R(s) || Math.max(rel(s, 'lp'), rel(s, 'liq')) <= 0.02, 10, 60),
      ...when(R, [
        { type: 'toggleManifold', valve: 'lp' },
        { type: 'connectHose', hose: 'yellow', end: 'port', socket: 'pump' },
        { type: 'device', device: 'pump', on: true },
        { type: 'toggleManifold', valve: 'lp' },
      ]),
      ...waitUntil((s) => !R(s) || !!v(s).vacOk, 60, 90),
      ...when(R, [
        { type: 'toggleManifold', valve: 'lp' },
        { type: 'device', device: 'pump', on: false },
        { type: 'toggleSolenoid' },
        { type: 'setServiceValve', valve: 'valve.gas', pos: 'back' },
        { type: 'setServiceValve', valve: 'valve.liquid', pos: 'open' },
        { type: 'unlock' },
        { type: 'setUnit', on: true },
      ]),
      ...waitUntil((s) => s.running, 10, 30),
      adjust, { type: 'wait', seconds: 610 },
      adjust, { type: 'wait', seconds: 610 },
      adjust, { type: 'wait', seconds: 610 },
      sh,
      { type: 'disconnectHose', hose: 'blue', end: 'port' },
      ...when(R, [{ type: 'toggleCap', target: 'valve.liquid' }, { type: 'toggleCap', target: 'valve.gas' }]),
      { type: 'toggleCap', target: 'port.evap' },
      { type: 'finish' },
    ];
    return steps;
  },
};

export default L08;
