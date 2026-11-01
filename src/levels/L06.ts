import { tsat } from '../physics/refrigerants';
import { makeVolume } from '../physics/circuit';
import type { FluidId } from '../physics/types';
import {
  P, SYSTEM_IDS, cylinderLiquid, defaultReading, gasMass, gaugeP, hoseAt, liquidIntoSuction, makePlatine, systemRef, vs,
} from '../game/platineModel';
import { fmt, isPort, refuse } from '../game/engine';
import type { Action, GameState, Level, Step, Tier } from '../game/types';

const PRECHARGE = 1.2; // kg, for 7.5 m of lines
const SLUG = 8; // g/s of liquid at the compressor: about 30 % manifold opening and above
const VACUUM = 0.001; // bar abs left by L04
const BLEND_CHOICES = [
  'Compléter en phase vapeur jusqu\'à retrouver les pressions normales',
  'Compléter en phase liquide jusqu\'à ce que le voyant soit clair',
  'Récupérer tout le fluide, tirer au vide et refaire la charge complète en liquide, à la pesée',
  'Compléter à la pesée la quantité estimée de la fuite',
];

interface Cyl { fluid: FluidId; kg: number; tare: number; short: string; text: string }
const fr = (x: number, d = 1) => fmt(x, d);

function lineup(tier: Tier, rng: () => number, dipTube: boolean): Cyl[] {
  const r32 = dipTube ? 'deux robinets (gaz / liquide, tube plongeur)' : 'un seul robinet (sans tube plongeur)';
  const list: Cyl[] = [
    { fluid: 'R32', kg: 5, tare: 6.5, short: `R32 neuf 5 kg${dipTube ? '' : ', sans tube plongeur'}`, text: `R32 neuf, 5 kg, ${r32}, scellé d'origine.` },
    { fluid: 'R410A', kg: 10, tare: 7.2, short: 'R410A neuf 10 kg', text: 'R410A neuf, 10 kg, deux robinets (tube plongeur).' },
  ];
  if (tier === 'examen') {
    list.push({ fluid: 'R407C', kg: 11.3, tare: 7.4, short: 'R407C neuf 11,3 kg', text: 'R407C neuf, 11,3 kg, deux robinets (tube plongeur).' });
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
  }
  return list;
}

const cyls = (s: GameState): Cyl[] => JSON.parse(s.vars.cyls as string);
const picked = (s: GameState): Cyl | undefined => cyls(s)[s.vars.cyl as number];
const goodIndex = (s: GameState) => cyls(s).findIndex((c) => c.fluid === 'R32');
export const target = (s: GameState) => PRECHARGE + 0.02 * Math.max(0, (s.vars.lineM as number) - 7.5);
/** kg drawn from the cylinder since the tare (or since it was put on the scale). */
export const charged = (s: GameState) => (s.vars.cyl0 as number) - s.circuit.volumes.cyl.mRef;
const cylClosed = (s: GameState) => !s.bench.cylinder?.gas && !s.bench.cylinder?.liq;
const liquidHose = (s: GameState) => (['gas', 'liq'] as const).some((v) => {
  const h = hoseAt(s, `cyl.${v}`);
  return !!h && h.id === 'yellow' && h.valve && !!s.bench.cylinder?.[v] && cylinderLiquid(s, v);
});
const red = (s: GameState) => s.hoses.find((h) => h.id === 'red')!;
const hpRoute = (s: GameState) => red(s).port === 'port.liq' && red(s).valve && s.manifold.valves.hp;
const onBoard = (s: GameState) => s.hoses.some((h) => h.port && isPort(h.port));
const ok = (s: GameState, ...ids: string[]) => ids.every((id) => s.answers[id]?.ok);
const cy = (s: GameState) => s.cycle ?? { SH: NaN, SC: NaN };
const airIn = (s: GameState) => s.circuit.volumes.manifold.mAir > gasMass(0.2, 0.02);

const L06: Level = {
  id: 'L06',
  title: 'Charge en fluide',
  skills: ['A1:5.02', 'A1:5.05', 'A1:5.06', 'A1:5.07', 'CAP:UP3'],
  lesson: 'cap-up3',
  scene: 'PLATINE',
  fluid: 'R32',
  briefing: 'La platine sort du tirage au vide (≈ 1 mbar), manifold resté raccordé : flexible rouge sur la prise liquide, bleu sur la prise BP '
    + '(vanne gaz en position milieu), ouverture manuelle de l\'électrovanne encore posée. Le flexible jaune vient d\'être déposé de la pompe : il est à l\'air. '
    + 'Procédez à la charge en fluide en vous référant à la plaque signalétique : choisissez la bouteille, vérifiez le vide, raccordez-vous en liquide, '
    + 'purgez, tarez, cassez le vide en liquide côté HP unité arrêtée, puis terminez par la BP unité en marche, vanne du manifold à peine ouverte, '
    + 'jusqu\'à la masse cible. Contrôlez voyant, sous-refroidissement et surchauffe, vidangez les flexibles, déposez-les et consignez la charge.',
  tierNotes: {
    guide: 'Liaisons de 7,5 m (précharge suffisante), bouteille de R32 à tube plongeur.',
    standard: 'Liaisons de 12 m : calculez le complément de charge. Bouteille sans tube plongeur.',
    examen: 'Longueur de liaisons et bouteille aléatoires, une question sur une autre installation, 40 min.',
  },
  tools: ['hand', 'wrench', 'thermometer'],
  unitControl: true,
  timeLimit: 40 * 60,

  setup(tier, rng) {
    const exam = tier === 'examen';
    const lineM = exam ? 10 + Math.floor(rng() * 11) : tier === 'standard' ? 12 : 7.5;
    const dipTube = exam ? rng() < 0.5 : tier === 'guide';
    const s = makePlatine({
      levelId: 'L06', tier, charge: 0, Tamb: 20,
      bench: { vacuumGaugeAt: 'comp' },
      volumes: [makeVolume('cyl', 12, { T: 20 })],
      nameplate: 'Plaque signalétique : R32 · charge 1,2 kg (précharge pour 7,5 m de liaisons, complément 20 g/m au-delà) · PS HP 42 bar / BP 25 bar · 230 V 50 Hz'
        + ` · Fiche de mise en service : liaisons de ${fr(lineM)} m`,
    });
    const v = s.circuit.volumes;
    for (const id of [...SYSTEM_IDS, 'hose:red', 'hose:blue']) v[id].mAir = gasMass(VACUUM, v[id].V);
    s.hoses.find((h) => h.id === 'red')!.port = 'port.liq';
    s.hoses.find((h) => h.id === 'blue')!.port = 'port.lp';
    s.caps['port.liq'] = s.caps['port.lp'] = s.caps['valve.gas'] = false;
    s.valves.gas = 'mid';
    s.valves.solenoid = true;
    // simplification: the extra line length is not added as circuit volume; the cycle model sees it through nominalCharge.
    s.plant.nominalCharge = PRECHARGE + 0.02 * Math.max(0, lineM - 7.5);
    s.vars = { lineM, dipTube, cyls: JSON.stringify(lineup(tier, rng, dipTube)), cyl: -1 };
    return s;
  },

  actions: [
    { id: 'look', label: 'Examiner les bouteilles du banc' },
    { id: 'pick', label: 'Poser sur la balance la bouteille n°', input: { unit: '', min: 1, max: 3, step: 1 } },
    { id: 'purge', label: 'Purger le flexible jaune (desserrer brièvement au manifold)', visible: (s) => !!s.bench.cylinder },
    { id: 'record', label: 'Consigner la charge sur la fiche (kg)', input: { unit: 'kg', min: 0, max: 3, step: 0.005 } },
  ],

  onAction(s, a) {
    if (a.type === 'answer' && a.field === 'vac' && s.answers.vac.ok) {
      delete s.bench.vacuumGaugeAt;
      return 'Vide tenu ; vacuomètre isolé et déposé avant l\'arrivée du fluide';
    }
    if (a.type === 'inspect' && a.target === 'comp.sightglass' && s.cycle?.sightGlass === 'clair') s.vars.sightClear = true;
    if (a.type === 'tareScale') {
      // a late tare no longer gives the charged mass: keep the reference taken when the cylinder went on the scale
      if (systemRef(s) < 0.002) { s.vars.cyl0 = s.circuit.volumes.cyl.mRef; s.vars.tared = true; }
      return;
    }
    if (a.type !== 'custom') return;
    if (a.id === 'look') {
      const text = cyls(s).map((c, i) => `n°${i + 1} : ${c.text}`).join(' · ');
      s.toast = { text, kind: 'info', n: (s.toast?.n ?? 0) + 1 };
      return `Bouteilles : ${text}`;
    }
    if (a.id === 'pick') {
      const i = Number(a.value) - 1, c = cyls(s)[i] ?? refuse('Pas de bouteille à ce numéro.');
      if (hoseAt(s, 'cyl.gas') || hoseAt(s, 'cyl.liq')) refuse('Un flexible est raccordé à la bouteille : déposez-le d\'abord.');
      if (picked(s) && Math.abs(charged(s)) > 0.001) refuse('Du fluide a déjà été soutiré de cette bouteille.');
      s.vars.cyl = i;
      s.bench.cylinder = { label: `Bouteille n°${i + 1} : ${c.short}`, gas: false, liq: false, tare: c.tare, dipTube: c.fluid !== 'R32' || !!s.vars.dipTube };
      s.bench.scaleTare = 0;
      Object.assign(s.circuit.volumes.cyl, { mRef: c.kg, mAir: 0, mN2: 0, mH2O: 0, T: s.plant.Tamb });
      s.vars.cyl0 = c.kg;
      delete s.vars.tared;
      return `Bouteille posée sur la balance : n°${i + 1} (${c.short})`;
    }
    if (a.id === 'purge') {
      const y = s.hoses.find((h) => h.id === 'yellow')!, at = y.port?.startsWith('cyl.') ? (y.port.slice(4) as 'gas' | 'liq') : null;
      if (!at || !y.valve || !s.bench.cylinder?.[at]) refuse('Purge : flexible jaune raccordé à la bouteille, vanne à boule et robinet de la bouteille ouverts.');
      const c = s.circuit, e = c.emitted;
      for (const id of ['hose:yellow', 'manifold']) {
        const v = c.volumes[id];
        e.air += v.mAir; e.n2 += v.mN2; v.mAir = v.mN2 = 0;
      }
      const yv = c.volumes['hose:yellow'], g = Math.min(yv.mRef, 0.002);
      yv.mRef -= g; e.ref += g;
      s.vars.purged = true;
      return `Flexible jaune purgé (${fr(g * 1000)} g de fluide chassés avec l'air)`;
    }
    if (a.id === 'record') {
      if (!s.bench.cylinder) refuse('Aucune charge à consigner.');
      s.vars.recorded = Math.abs(Number(a.value));
      return `Fiche d'intervention : ${picked(s)!.fluid} vierge, ${fr(s.vars.recorded, 3)} kg chargés`;
    }
  },

  inspect(s, target) {
    if (target === 'comp.compressor' || target === 'comp.elecBox') return s.nameplate;
    return undefined;
  },

  objectives: [
    {
      id: 'fluid', label: 'Poser sur la balance une bouteille du fluide de la plaque signalétique',
      done: (s) => picked(s)?.fluid === s.fluid,
      hints: ['Le fluide de la bouteille doit être celui de la plaque, sans exception.',
        'Lisez la plaque (outil main sur le compresseur), examinez les bouteilles du banc, puis posez la bouteille de R32 sur la balance.', ['comp.compressor']],
    },
    {
      id: 'vacuum', label: 'Vérifier que le vide a tenu (vacuomètre, mbar)',
      done: (s) => ok(s, 'vac'),
      hints: ['Un vide qui a remonté signale une fuite ou de l\'humidité : on ne charge pas.', 'Lisez le vacuomètre (mbar absolus) et saisissez la valeur.'],
    },
    {
      id: 'target', label: 'Calculer la charge totale selon la longueur des liaisons',
      done: (s) => ok(s, 'target'),
      tiers: ['standard', 'examen'],
      hints: ['La précharge couvre 7,5 m de liaisons ; au-delà, complément de 20 g par mètre.',
        'Charge = 1,2 kg + 0,020 kg/m × (longueur − 7,5 m). La longueur figure sur la fiche de mise en service (plaque).', ['comp.compressor']],
    },
    {
      id: 'blend', label: 'Autre installation (R407C après fuite) : choisir la bonne méthode',
      done: (s) => ok(s, 'r407c'),
      tiers: ['examen'],
    },
    {
      id: 'connect', label: 'Raccorder le flexible jaune sur le robinet qui délivre du liquide, ouvrir la bouteille',
      done: liquidHose,
      hints: ['On charge en phase liquide : tube plongeur (robinet liquide), ou bouteille retournée si elle n\'a qu\'un robinet.',
        'Flexible jaune (extrémité à vanne) sur le robinet liquide, ou bouteille retournée et robinet gaz. Ouvrez la vanne à boule et le robinet.'],
    },
    {
      id: 'purge', label: 'Purger l\'air du flexible jaune',
      done: (s) => !!s.vars.purged,
      hints: ['Le jaune et le corps du manifold sont pleins d\'air : il irait dans le circuit.', 'Commande « Purger le flexible jaune » (½ seconde au raccord du manifold).'],
    },
    {
      id: 'tare', label: 'Tarer la balance',
      done: (s) => !!s.bench.scaleTare,
      hints: ['La balance doit afficher la masse chargée, pas la masse de la bouteille.', 'Bouton TARE de la balance, avant d\'ouvrir le manifold.'],
    },
    {
      id: 'break', label: 'Casser le vide en liquide par la prise liquide (HP), unité arrêtée, jusqu\'à l\'équilibre des pressions',
      // 1.5 bar: the last bar takes minutes to equalise, and once the unit runs this step can no longer be ticked
      done: (s) => !s.running && hpRoute(s) && !s.manifold.valves.lp && systemRef(s) > 0.3 && P(s, 'cyl') - P(s, 'filt') < 1.5,
      hints: ['Le liquide entre côté HP, où il ne peut pas atteindre le compresseur. L\'électrovanne ouverte le laisse aussi passer vers la BP.',
        'Unité arrêtée, ouvrez la vanne HP du manifold (flexible rouge sur la prise liquide) et attendez que la HP rejoigne la pression de la bouteille.', ['port.liq']],
    },
    {
      id: 'start', label: 'Fermer la vanne HP du manifold et mettre l\'unité en marche',
      done: (s) => s.running && !s.manifold.valves.hp,
      hints: ['En marche, la HP dépasse la pression de la bouteille : vanne HP ouverte, le fluide repartirait vers la bouteille.',
        'Fermez la vanne HP du manifold, puis mettez l\'unité en marche. Si le pressostat BP coupe (charge encore faible), entrouvrez sans attendre la vanne BP.'],
    },
    {
      id: 'charge', label: 'Compléter par la BP, vanne BP à peine ouverte, et fermer la bouteille à la masse cible (± 2 %)',
      done: (s) => s.running && cylClosed(s) && Math.abs(charged(s) - target(s)) <= 0.02 * target(s),
      hints: ['Du liquide à pleine ouverture côté BP arrive en masse au compresseur (coup de liquide) : laminez.',
        'Vanne BP du manifold sur « entrouverte (5 %) » (dès 30 % : coup de liquide), surveillez la balance en vitesse ×1 près de la cible et fermez le robinet de la bouteille à la masse cible.'],
    },
    {
      id: 'checks', label: 'Contrôler : voyant clair, sous-refroidissement et surchauffe',
      done: (s) => !!s.vars.sightClear && ok(s, 'SC', 'SH'),
      hints: ['Laissez le fonctionnement se stabiliser quelques minutes.',
        'Inspectez le voyant. SC = T bulle (HP) − T ligne liquide ; SH = T aspiration − T rosée (BP).', ['comp.sightglass', 'comp.txvBulb', 'joint.condOut']],
    },
    {
      id: 'recover', label: 'Vidanger les flexibles vers la BP (unité en marche), isoler et déposer les flexibles',
      done: (s) => s.valves.gas === 'back' && !onBoard(s) && !hoseAt(s, 'cyl.gas') && !hoseAt(s, 'cyl.liq'),
      hints: ['Le rouge est plein de liquide : il se vidange vers l\'aspiration, pas à l\'air.',
        'Fermez la vanne à boule du rouge, ouvrez la vanne HP du manifold (BP entrouverte), attendez, remettez la vanne gaz en contre-siège arrière, '
        + 'fermez le manifold et les vannes à boule, puis déposez les flexibles.', ['valve.gas', 'port.liq']],
    },
    {
      id: 'close', label: 'Remettre bouchons et chapeaux, retirer l\'ouverture manuelle de l\'électrovanne',
      done: (s) => Object.values(s.caps).every(Boolean) && !s.valves.solenoid,
      hints: ['Ouverture manuelle laissée posée : l\'électrovanne ne fermera plus (pas de tirage au vide possible).',
        'Remettez les bouchons des prises et le chapeau de la vanne gaz (outil main) ; retirez l\'ouverture manuelle de l\'électrovanne (clé sur l\'électrovanne).', ['comp.solenoid']],
    },
    {
      id: 'record', label: 'Consigner la masse chargée sur la fiche d\'intervention',
      done: (s) => typeof s.vars.recorded === 'number' && Math.abs(s.vars.recorded - charged(s)) <= 0.01,
      hints: ['La masse chargée est celle lue sur la balance tarée (affichée en négatif : la bouteille s\'allège).',
        'Commande « Consigner la charge », saisissez la masse lue sur la balance.'],
    },
  ],

  answers: [
    { id: 'vac', label: 'Vide', unit: 'mbar', tol: 0.3, expected: (s) => vs(s, 'comp').P * 1000 },
    { id: 'target', label: 'Charge totale', unit: 'kg', tol: 0.005, expected: target, tiers: ['standard', 'examen'] },
    { id: 'r407c', label: 'R407C après fuite', unit: '', tol: 0, expected: () => 2, choices: BLEND_CHOICES, tiers: ['examen'] },
    { id: 'SC', label: 'Sous-refroid.', unit: 'K', tol: 1, expected: (s) => cy(s).SC },
    { id: 'SH', label: 'Surchauffe', unit: 'K', tol: 1, expected: (s) => cy(s).SH },
  ],

  rules: [
    {
      id: 'wrong-fluid', severity: 'critical', skill: 'A1:5.02', lesson: 'substitution',
      message: 'Fluide de la bouteille différent de celui de la plaque : le circuit est contaminé, tout est à récupérer pour destruction.',
      when: ({ s }) => !!picked(s) && picked(s)!.fluid !== s.fluid && systemRef(s) > 0.005,
    },
    {
      id: 'liquid-slug', severity: 'critical', skill: 'A1:5.06', lesson: 'composants',
      message: 'Liquide envoyé en masse à l\'aspiration compresseur en marche : coup de liquide (clapets, bielles). Laminez la vanne BP pour que le liquide se vaporise.',
      when: ({ s }) => liquidIntoSuction(s) > SLUG,
    },
    {
      id: 'no-purge', severity: 'minor', skill: 'A1:5.06', lesson: 'vide-pression',
      message: 'Manifold ouvert vers le circuit avec de l\'air dans le corps ou le flexible jaune : l\'air (incondensable, humide) entre dans le circuit tiré au vide.',
      when: ({ prev, s }) => (s.manifold.valves.lp || s.manifold.valves.hp) && !(prev.manifold.valves.lp || prev.manifold.valves.hp) && airIn(prev),
    },
    {
      id: 'no-tare', severity: 'minor', skill: 'A1:5.07', lesson: 'cap-up3',
      message: 'Balance non tarée avant la charge : la masse chargée doit se lire directement, sinon erreur de calcul et fiche fausse.',
      when: ({ s }) => !s.vars.tared && systemRef(s) > 0.01,
    },
    {
      id: 'overcharge', severity: 'major', skill: 'A1:5.06', lesson: 'cap-up3',
      message: 'Surcharge (> 5 % au-dessus de la charge cible) : condenseur noyé, HP et intensité trop hautes.',
      when: ({ a, s }) => a.type === 'finish' && systemRef(s) > 1.05 * target(s),
    },
    {
      id: 'undercharge', severity: 'major', skill: 'A1:5.06', lesson: 'cap-up3',
      message: 'Charge insuffisante (> 5 % sous la charge cible) : surchauffe élevée, voyant trouble, puissance et retour d\'huile dégradés.',
      when: ({ a, s }) => a.type === 'finish' && systemRef(s) < 0.95 * target(s),
    },
    {
      id: 'charge-by-pressure', severity: 'major', skill: 'A1:5.07', lesson: 'saturation',
      message: 'Charge non pesée ni consignée : la pression indique une température, pas une quantité de fluide. On charge à la balance.',
      when: ({ a, s }) => a.type === 'finish' && typeof s.vars.recorded !== 'number',
    },
    {
      id: 'vent-hose', severity: 'major', skill: 'A1:5.01', lesson: 'recuperation',
      message: 'Flexible déposé plein de fluide : plus de 5 g rejetés. Vidangez-le vers la BP, unité en marche, avant de le déposer.',
      when: ({ a, s }) => a.type === 'disconnectHose' && s.lastVentG > 5,
    },
    {
      id: 'topping-blend', severity: 'major', skill: 'A1:5.05', lesson: 'saturation',
      message: 'Mélange zéotrope (R407C) après une fuite : la composition restante est inconnue (fractionnement). On récupère tout, on tire au vide et on recharge en liquide.',
      when: ({ a, s }) => a.type === 'answer' && a.field === 'r407c' && !s.answers.r407c.ok,
    },
    {
      id: 'vapour-charge-blend', severity: 'major', skill: 'A1:5.05', lesson: 'saturation',
      message: 'Un zéotrope ne se charge jamais en phase vapeur : les composants les plus volatils sortent d\'abord, la composition chargée est fausse.',
      when: ({ a }) => a.type === 'answer' && a.field === 'r407c' && a.value === 0,
    },
  ],

  perfectRun(tier) {
    const noop: Action = { type: 'pickTool', tool: null };
    const waitUntil = (p: (s: GameState) => boolean, seconds: number, n: number): Step[] =>
      Array.from({ length: n }, () => (s: GameState) => (p(s) ? noop : { type: 'wait', seconds }));
    const dip = (s: GameState) => s.bench.cylinder!.dipTube !== false;
    const r1 = (x: number) => Math.round(x * 10) / 10;
    const temp = (s: GameState, t: 'comp.txvBulb' | 'joint.condOut') => defaultReading(s, { tool: 'thermometer', target: t })!.value;
    const lp = (s: GameState) => gaugeP(s, 'mf.lp'), hp = (s: GameState) => gaugeP(s, 'mf.hp');
    return [
      { type: 'inspect', target: 'comp.compressor' },
      { type: 'custom', id: 'look' },
      (s) => ({ type: 'custom', id: 'pick', value: goodIndex(s) + 1 }),
      (s) => ({ type: 'answer', field: 'vac', value: Math.round(vs(s, 'comp').P * 10000) / 10 }),
      ...(tier === 'guide' ? [] : [(s: GameState): Action => ({ type: 'answer', field: 'target', value: Math.round(target(s) * 1000) / 1000 })]),
      ...(tier === 'examen' ? [{ type: 'answer', field: 'r407c', value: 2 } as Action] : []),
      (s) => (dip(s) ? noop : { type: 'invertCylinder' }),
      (s) => ({ type: 'connectHose', hose: 'yellow', end: 'port', socket: dip(s) ? 'cyl.liq' : 'cyl.gas' }),
      { type: 'toggleHoseValve', hose: 'yellow' },
      (s) => ({ type: 'cylValve', valve: dip(s) ? 'liq' : 'gas' }),
      { type: 'custom', id: 'purge' },
      { type: 'tareScale' },
      { type: 'toggleManifold', valve: 'hp' },
      ...waitUntil((s) => P(s, 'cyl') - P(s, 'filt') < 0.8, 10, 30),
      { type: 'toggleManifold', valve: 'hp' },
      { type: 'setUnit', on: true },
      { type: 'wait', seconds: 30 },
      { type: 'setManifoldOpening', valve: 'lp', opening: 0.15 },
      ...waitUntil((s) => charged(s) >= target(s) - 0.03, 10, 60),
      ...waitUntil((s) => charged(s) >= target(s) - 0.004, 1, 30),
      (s) => ({ type: 'cylValve', valve: dip(s) ? 'liq' : 'gas' }),
      { type: 'wait', seconds: 180 },
      { type: 'inspect', target: 'comp.sightglass' },
      { type: 'measure', tool: 'thermometer', target: 'comp.txvBulb' },
      { type: 'measure', tool: 'thermometer', target: 'joint.condOut' },
      (s) => ({ type: 'answer', field: 'SH', value: r1(temp(s, 'comp.txvBulb') - tsat(s.fluid, lp(s), 'dew')) }),
      (s) => ({ type: 'answer', field: 'SC', value: r1(tsat(s.fluid, hp(s), 'bubble') - temp(s, 'joint.condOut')) }),
      { type: 'toggleHoseValve', hose: 'red' },
      { type: 'toggleManifold', valve: 'hp' },
      { type: 'wait', seconds: 60 },
      { type: 'setServiceValve', valve: 'valve.gas', pos: 'back' },
      { type: 'toggleManifold', valve: 'hp' },
      { type: 'setManifoldOpening', valve: 'lp', opening: 0 },
      { type: 'toggleHoseValve', hose: 'blue' },
      { type: 'toggleHoseValve', hose: 'yellow' },
      { type: 'disconnectHose', hose: 'blue', end: 'port' },
      { type: 'disconnectHose', hose: 'red', end: 'port' },
      { type: 'disconnectHose', hose: 'yellow', end: 'port' },
      { type: 'toggleCap', target: 'port.lp' },
      { type: 'toggleCap', target: 'port.liq' },
      { type: 'toggleCap', target: 'valve.gas' },
      { type: 'toggleSolenoid' },
      (s) => ({ type: 'custom', id: 'record', value: Math.round(charged(s) * 1000) / 1000 }),
      { type: 'finish' },
    ];
  },
};
export default L06;
