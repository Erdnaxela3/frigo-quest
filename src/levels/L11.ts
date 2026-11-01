import { P_ATM, psat, toRel, tsat } from '../physics/refrigerants';
import { P, SYSTEM_IDS, defaultReading, gaugeP, hoseVol, makePlatine, startUnit, vs } from '../game/platineModel';
import { fmt, isPort, refuse } from '../game/engine';
import type { Action, GameState, Level, Step, Tier } from '../game/types';

const CHARGE = 1.2;
const RUN_RATIO = 1.3; // running: the air is packed into the hot condenser, its partial pressure exceeds the standstill one
// At rest the air-free filter/liquid lines pull liquid out of the condenser and some air leaks to the BP side through the stopped
// compressor. simplification: both measured on the model, so the gap read after ~10 min of forced fan ≈ the tier's target.
const STILL_SHARE = 0.48, AIR_TUNE = 1.4;
const VARIANTS = ['air', 'over', 'dirty', 'fan'] as const;
type Variant = (typeof VARIANTS)[number];
const REMEDY: Record<Variant, number> = { air: 2, over: 2, dirty: 3, fan: 4 };

const variant = (s: GameState) => s.vars.variant as Variant;
const num = (s: GameState, k: string) => (s.vars[k] as number | undefined) ?? 0;
const ok = (s: GameState, ...ids: string[]) => ids.every((id) => s.answers[id]?.ok);
const hpGauge = (s: GameState) =>
  s.hoses.some((h) => h.port === 'port.hp' && h.manifold === 'mf.hp' && h.valve) ? gaugeP(s, 'mf.hp') : NaN;
const runningHP = (s: GameState) => (s.running && s.cycle ? toRel(hpGauge(s)) : NaN);
const psatAmb = (s: GameState) => psat(s.fluid, s.plant.Tamb, 'bubble');
const stillHP = (s: GameState) => (s.running ? NaN : hpGauge(s));
const noop = { type: 'inspect', target: 'comp.condenser' } as const;
// circuit volumes touched by recovery / vacuum: the system and the hoses screwed on its ports
const workVols = (s: GameState) => [...SYSTEM_IDS, ...s.hoses.filter((h) => h.port && isPort(h.port)).map(hoseVol)];

function fixed(s: GameState) {
  const f = s.plant.faults;
  switch (variant(s)) {
    case 'air': case 'over': return !!s.vars.recharged && f.condFouling === 0;
    case 'dirty': return f.condFouling === 0;
    case 'fan': return f.condFanOk;
  }
}

// The air is real mass in the circuit. Running, the cycle model carries it as faults.nonCondBar (so the gauges are not counted twice);
// stopped, it sits in the condenser/receiver volume and adds its partial pressure to Psat(T) (Dalton).
function syncAir(s: GameState) {
  const c = s.circuit.volumes;
  if (s.running) {
    for (const id of SYSTEM_IDS) { s.vars.air = num(s, 'air') + c[id].mAir; c[id].mAir = 0; }
    s.plant.faults.nonCondBar = (RUN_RATIO * num(s, 'air')) / num(s, 'airPerBar');
    s.vars.fan = false;
  } else if (num(s, 'air') > 0) {
    // the running HP already holds the air partial pressure: keep the total, the refrigerant side is that much cooler
    const P0 = P(s, 'hp');
    c.hp.mAir += num(s, 'air');
    s.vars.air = 0;
    c.hp.T = tsat(s.fluid, P0 - vs(s, 'hp').PAir, 'bubble');
  }
  if (!s.running && s.vars.wasRunning) s.vars.stopT = s.t;
  s.vars.wasRunning = s.running;
}

// answers do not toast by themselves: the standstill / stabilisation messages must be seen
const say = (s: GameState, text: string) => { s.toast = { text, kind: 'info', n: (s.toast?.n ?? 0) + 1 }; return text; };
const ptTable = (s: GameState) => {
  const T0 = Math.round(s.plant.Tamb), row = (T: number) => `${T} °C : ${fmt(psat(s.fluid, T, 'bubble'), 2)}`;
  return `Table P/T ${s.fluid} (bar ABSOLU, point de bulle) — ${[-2, -1, 0, 1, 2].map((d) => row(T0 + d)).join(' · ')} · … ${row(T0 + 12)}`;
};

const settled = (s: GameState) => (s.vars.fan ? s.t - num(s, 'fanT') >= 480 : s.t - num(s, 'stopT') >= 1200);

const THEORY = 'Fiche purgeur : sur les grandes installations, un purgeur automatique d\'incondensables monté au point haut du condenseur '
  + 'ou du réservoir refroidit le mélange, condense le fluide et ne rejette que l\'air (A1 7.06). Sur un petit système comme cette platine, '
  + 'pas de purgeur : récupération, tirage au vide et recharge à la balance.';

const L11: Level = {
  id: 'L11',
  title: 'Incondensables',
  skills: ['A1:7.06', 'A1:7.07', 'A1:7.09', 'A1:1.03', 'A1:5.03', 'CAP:UP3'],
  lesson: 'saturation',
  scene: 'PLATINE',
  fluid: 'R32',
  briefing: 'HP anormalement élevée et compresseur chaud après l\'intervention d\'un collègue sur la platine R32. Trouvez la cause et remettez en état. '
    + 'Repères constructeur : condensation ≈ air extérieur + 12 K, sous-refroidissement ≈ 5 K. Contrôlez en marche (HP, ΔT d\'air au condenseur, '
    + 'état du condenseur, ventilateur), puis faites l\'essai à l\'arrêt : compresseur arrêté, ventilateur condenseur en marche forcée ~10 min, '
    + 'comparez la HP (bar abs) à Psat(T air extérieur).',
  tierNotes: {
    guide: 'Air seul : le collègue n\'a pas tiré au vide. Écart net à l\'arrêt (≈ +3 bar).',
    standard: 'Condenseur en partie encrassé ET air : nettoyez, puis trouvez quand même l\'écart à l\'arrêt.',
    examen: 'Cause aléatoire : air, surcharge, condenseur encrassé ou ventilateur HS. Bon diagnostic et bon remède, 2 h.',
  },
  tools: ['hand', 'thermometer', 'clamp'],
  unitControl: true,
  timeLimit: 2 * 3600,

  setup(tier: Tier, rng) {
    const exam = tier === 'examen';
    const v: Variant = exam ? VARIANTS[Math.floor(rng() * 4)] : 'air';
    const Tamb = exam ? Math.round(20 + 5 * rng()) : 30;
    const charge = v === 'over' ? 1.2 * CHARGE : CHARGE;
    const s = makePlatine({
      levelId: 'L11', tier, Tamb, Troom: 25, charge,
      faults: { condFouling: v === 'dirty' ? 0.8 : tier === 'standard' ? 0.5 : 0, condFanOk: v !== 'fan' },
    });
    // air mass per bar of standstill gap
    const hp = s.circuit.volumes.hp, saved = { mRef: hp.mRef, mAir: hp.mAir };
    Object.assign(hp, { mRef: STILL_SHARE * charge, mAir: 1e-3 });
    s.vars.airPerBar = (AIR_TUNE * 1e-3) / vs(s, 'hp').PAir;
    Object.assign(hp, saved);
    const bar = v !== 'air' ? 0 : exam ? 2.5 + 1.5 * rng() : tier === 'standard' ? 3.5 : 3;
    Object.assign(s.vars, { variant: v, air: bar * num(s, 'airPerBar') });
    s.plant.faults.nonCondBar = RUN_RATIO * bar;
    startUnit(s);
    s.vars.wasRunning = true;
    return s;
  },

  objectives: [
    {
      id: 'hp', label: 'Raccorder le flexible HP et relever la HP en marche',
      done: (s) => ok(s, 'HPrun'),
      hints: ['Le flexible rouge va sur la prise HP (refoulement). Comparez à la HP attendue : Psat(air extérieur + 12 K).',
        'Outil main : retirez le bouchon de la prise HP, flexible rouge sur la prise HP, attendez la stabilisation et saisissez la HP lue (bar rel).', ['port.hp']],
    },
    {
      id: 'checks', label: 'Contrôles en marche : ΔT d\'air au condenseur, état du condenseur, ventilateur',
      done: (s) => ok(s, 'dTair') && s.inspected.includes('comp.condenser') && s.inspected.includes('comp.condFan'),
      hints: ['Écartez d\'abord les causes côté air : surface encrassée, ventilateur à l\'arrêt.',
        'Thermomètre sur le ventilateur (air entrant) et sur le condenseur (air soufflé) : ΔT = soufflé − entrant. Inspectez (main) le condenseur et le ventilateur.',
        ['comp.condenser', 'comp.condFan']],
    },
    {
      id: 'clean', label: 'Arrêter l\'unité et nettoyer le condenseur', tiers: ['standard'],
      done: (s) => s.plant.faults.condFouling === 0,
      hints: ['Le condenseur est en partie encrassé : traitez-le, mais ce n\'est peut-être pas la seule cause.',
        'Arrêtez l\'unité puis action « Nettoyer le condenseur ».', ['comp.condenser']],
    },
    {
      id: 'standstill', label: 'Essai à l\'arrêt : comparer la HP (bar abs) à Psat(T air extérieur)',
      done: (s) => !!s.vars.standstill && ok(s, 'Psat'),
      hints: ['Compresseur arrêté, ventilateur condenseur en marche forcée ~10 min : le fluide se met à la température de l\'air. La HP doit alors valoir Psat(T air).',
        'Arrêtez l\'unité, action « Ventilateur condenseur en marche forcée », attendez 10 min. Saisissez Psat(T air extérieur) en bar ABS (bouton « Table P/T ») et la HP lue + 1,013.',
        ['comp.condFan', 'port.hp']],
    },
    {
      id: 'verdict', label: 'Conclure sur la cause',
      done: (s) => ok(s, 'verdict'),
      hints: ['HP abs ≈ Psat → pas d\'incondensables. HP abs > Psat + 0,5 bar → incondensables (Dalton).',
        'À l\'arrêt, l\'écart HP − Psat est la pression partielle de l\'air. Sans écart : regardez le sous-refroidissement (surcharge) et le côté air.'],
    },
    {
      id: 'remedy', label: 'Choisir la remise en état',
      done: (s) => ok(s, 'remedy'),
      hints: ['Purger à l\'air rejette du fluide avec l\'air ; retirer du fluide « à la HP » masque la cause.',
        'Petit système avec de l\'air : récupération de la charge, tirage au vide, recharge à la balance.'],
    },
    {
      id: 'fix', label: 'Effectuer la remise en état',
      done: fixed,
      hints: ['Unité arrêtée, enchaînez les opérations dans l\'ordre.',
        'Actions « Récupérer la charge », « Tirer au vide », « Recharger 1,2 kg » (ou nettoyage / remplacement du ventilateur selon la cause).'],
    },
    {
      id: 'after', label: 'Remettre en marche et relever la HP',
      done: (s) => !!s.vars.after,
      hints: ['Comparez aux relevés du départ : la HP doit retrouver Psat(air + 12 K).',
        'Remettez l\'unité en marche, attendez 2 à 3 min, saisissez la HP lue (bar rel).', ['port.hp']],
    },
  ],

  answers: [
    { id: 'HPrun', label: 'HP en marche', unit: 'bar', tol: 0.3, expected: runningHP },
    { id: 'dTair', label: 'ΔT air condenseur', unit: 'K', tol: 1, expected: (s) => (s.running && s.cycle ? s.cycle.airOutCond - s.plant.Tamb : NaN) },
    { id: 'Psat', label: 'Psat à T air extérieur', unit: 'bar abs', tol: 0.2, expected: psatAmb },
    { id: 'HPstill', label: 'HP à l\'arrêt', unit: 'bar abs', tol: 0.2, expected: stillHP },
    {
      id: 'verdict', label: 'Cause', unit: '', tol: 0, expected: (s) => VARIANTS.indexOf(variant(s)),
      choices: ['Incondensables (air)', 'Surcharge en fluide', 'Condenseur encrassé', 'Ventilateur condenseur HS', 'Fonctionnement normal'],
    },
    {
      id: 'remedy', label: 'Remise en état', unit: '', tol: 0, expected: (s) => REMEDY[variant(s)],
      choices: [
        'Purger au sommet du condenseur (entrouvrir un raccord à l\'air)',
        'Retirer du fluide jusqu\'à retrouver une HP normale',
        'Récupérer la charge, tirer au vide, recharger à la balance',
        'Nettoyer le condenseur',
        'Remplacer le moteur du ventilateur condenseur',
        'Monter un purgeur automatique d\'incondensables',
      ],
    },
    { id: 'HPafter', label: 'HP après remise en état', unit: 'bar', tol: 0.3, expected: runningHP },
  ],

  actions: [
    { id: 'pt', label: 'Table P/T R32 (bar absolu)' },
    { id: 'fan', label: 'Ventilateur condenseur en marche forcée', visible: (s) => !s.running && !s.vars.fan },
    { id: 'clean', label: 'Nettoyer le condenseur', visible: (s) => s.plant.faults.condFouling > 0 },
    { id: 'replace-fan', label: 'Remplacer le moteur du ventilateur condenseur', visible: (s) => !s.plant.faults.condFanOk },
    { id: 'recover', label: 'Récupérer la charge (abrégé, cf. L05)', visible: (s) => s.answers.remedy !== undefined && !s.vars.recovered },
    { id: 'vacuum', label: 'Tirer au vide (abrégé, cf. L04)', visible: (s) => !!s.vars.recovered && !s.vars.vacuumed },
    { id: 'recharge', label: 'Recharger 1,2 kg de R32 à la balance (abrégé, cf. L06)', visible: (s) => !!s.vars.vacuumed && !s.vars.recharged },
  ],

  onAction(s, a) {
    syncAir(s);
    const f = s.plant.faults, vol = s.circuit.volumes;
    const stopped = () => { if (s.unitOn) refuse('Arrêtez d\'abord l\'unité.'); };
    if (a.type === 'answer') {
      const good = s.answers[a.field]?.ok;
      if (a.field === 'HPstill' && good) {
        if (!settled(s)) return say(s, 'Mesure trop tôt : le condenseur n\'est pas encore à la température de l\'air. Laissez le ventilateur tourner ~10 min, puis ressaisissez la HP.');
        s.vars.standstill = true;
        const gap = a.value - psatAmb(s);
        return say(s, `Essai à l'arrêt : HP ${fmt(a.value, 2)} bar abs, Psat(${fmt(s.plant.Tamb)} °C) ${fmt(psatAmb(s), 2)} bar abs, écart ${fmt(gap, 2)} bar.`);
      }
      if (a.field === 'remedy') {
        if (a.value === 0) {
          // cracked fitting at the top of the condenser: some air goes, refrigerant goes with it
          const g = Math.min(0.04, vol.hp.mRef);
          vol.hp.mRef -= g; s.circuit.emitted.ref += g;
          s.circuit.emitted.air += 0.3 * (vol.hp.mAir + num(s, 'air'));
          vol.hp.mAir *= 0.7; s.vars.air = 0.7 * num(s, 'air');
          return say(s, `Purge à l'air : ${fmt(g * 1000, 0)} g de R32 rejetés avec l'air, il reste des incondensables.`);
        }
        if (a.value === 5 || (good && variant(s) === 'air')) return say(s, THEORY);
      }
      if (a.field === 'HPafter' && good && fixed(s)) {
        if (s.t - (s.starts.at(-1) ?? 0) < 120) return say(s, 'Laissez la HP se stabiliser 2 à 3 min, puis ressaisissez-la.');
        s.vars.after = true;
        return say(s, 'HP revenue à la normale après remise en état.');
      }
      return;
    }
    if (a.type !== 'custom') return;
    switch (a.id) {
      case 'pt': return ptTable(s);
      case 'fan':
        if (s.running) refuse('Le ventilateur tourne déjà avec le compresseur.');
        if (!f.condFanOk) refuse('Le moteur du ventilateur ne démarre pas (HS) : équilibre en air calme, comptez ≈ 20 min.');
        Object.assign(s.vars, { fan: true, fanT: s.t });
        return 'Ventilateur condenseur en marche forcée, compresseur arrêté.';
      case 'clean':
        stopped();
        f.condFouling = 0;
        return 'Condenseur nettoyé (brosse douce et soufflage, dans le sens inverse du flux d\'air).';
      case 'replace-fan':
        stopped();
        f.condFanOk = true;
        return 'Moteur du ventilateur condenseur remplacé, rotation contrôlée.';
      case 'recover': {
        stopped();
        let g = 0;
        for (const id of workVols(s)) { g += vol[id].mRef; vol[id].mRef = 0; vol[id].mAir *= 0.1; }
        s.vars.air = 0;
        s.vars.recovered = true;
        jump(s, 20 * 60);
        return `Charge récupérée : ${fmt(g, 2)} kg en bouteille de récupération (air compris : fluide à faire régénérer s'il n'est pas conforme).`;
      }
      case 'vacuum':
        if (!s.vars.recovered) refuse('Récupérez d\'abord la charge.');
        for (const id of workVols(s)) Object.assign(vol[id], { mRef: 0, mAir: 0, mN2: 0, mH2O: 0 });
        s.vars.vacuumed = true;
        jump(s, 45 * 60);
        return 'Tirage au vide : 1,5 mbar atteint, remontée stable sur 10 min.';
      case 'recharge': {
        if (!s.vars.vacuumed) refuse('Tirez d\'abord au vide.');
        const V = SYSTEM_IDS.reduce((x, id) => x + vol[id].V, 0);
        for (const id of SYSTEM_IDS) vol[id].mRef = (CHARGE * vol[id].V) / V;
        f.nonCondBar = 0;
        s.vars.recharged = true;
        jump(s, 10 * 60);
        return 'Recharge : 1,200 kg de R32 en phase liquide, à la balance (charge de la plaque signalétique).';
      }
    }
  },

  onTick(s, dt) {
    syncAir(s);
    if (!s.running && s.vars.fan) {
      const hp = s.circuit.volumes.hp;
      hp.T += (s.plant.Tamb - hp.T) * (1 - Math.exp(-dt / 30));
    }
  },

  inspect(s, t) {
    const f = s.plant.faults;
    if (t === 'comp.condenser') {
      return f.condFouling >= 0.7 ? 'Condenseur : ailettes colmatées (poussière, peluches) sur presque toute la surface.'
        : f.condFouling > 0 ? 'Condenseur : ailettes partiellement encrassées sur une partie de la surface.'
          : 'Condenseur : ailettes propres, surface d\'échange dégagée.';
    }
    if (t === 'comp.condFan') {
      if (!f.condFanOk) return 'Ventilateur condenseur : à l\'arrêt, moteur froid, pas de rotation à la main forcée : moteur HS.';
      if (s.running || s.vars.fan) return 'Ventilateur condenseur : tourne normalement, bon débit d\'air.';
      return 'Ventilateur condenseur : à l\'arrêt (unité arrêtée).';
    }
    return undefined;
  },

  measure(s, p) {
    if (p.tool !== 'thermometer' || p.target !== 'comp.condenser') return undefined;
    const { Tamb } = s.plant;
    const out = s.running && s.cycle ? s.cycle.airOutCond : Tamb + 0.6 * (s.circuit.volumes.hp.T - Tamb) * (s.vars.fan ? 1 : 0.3);
    return { label: 'Air soufflé condenseur', value: out, unit: '°C' };
  },

  rules: [
    {
      id: 'manual-purge', severity: 'critical', skill: 'A1:7.06', lesson: 'reglementation',
      message: 'Purge « au sommet du condenseur » à l\'air : du fluide part avec l\'air, c\'est une émission interdite. Récupérez la charge.',
      when: ({ a }) => a.type === 'answer' && a.field === 'remedy' && a.value === 0,
    },
    {
      id: 'no-standstill', severity: 'major', skill: 'A1:7.07', lesson: 'saturation',
      message: 'Conclusion sans essai à l\'arrêt : impossible de distinguer l\'air d\'une surcharge ou d\'un problème de condenseur.',
      when: ({ a, s }) => a.type === 'answer' && a.field === 'verdict' && !s.vars.standstill,
    },
    {
      id: 'relative-vs-abs', severity: 'minor', skill: 'A1:1.03', lesson: 'saturation',
      message: 'Bar relatif comparé à une table en bar absolu : P abs = P rel + 1,013 bar.',
      when: ({ a, s }) => {
        if (a.type !== 'answer' || (a.field !== 'Psat' && a.field !== 'HPstill') || s.answers[a.field]?.ok) return false;
        const exp = a.field === 'Psat' ? psatAmb(s) : stillHP(s);
        return Math.abs(a.value - (exp - P_ATM)) <= 0.25;
      },
    },
    {
      id: 'remove-charge-guess', severity: 'major', skill: 'A1:7.09', lesson: 'recuperation',
      message: 'Retirer du fluide « jusqu\'à HP normale » masque la cause : l\'air reste et le circuit finit en sous-charge.',
      when: ({ a }) => a.type === 'answer' && a.field === 'remedy' && a.value === 1,
    },
    {
      id: 'wrong-verdict', severity: 'major', skill: 'A1:7.07', lesson: 'saturation',
      message: 'Mauvais diagnostic : recoupez HP abs à l\'arrêt / Psat, sous-refroidissement, ΔT d\'air et état du condenseur et du ventilateur.',
      when: ({ a, s }) => a.type === 'answer' && a.field === 'verdict' && !s.answers.verdict?.ok,
    },
    {
      id: 'wrong-remedy', severity: 'major', skill: 'A1:7.09', lesson: 'vide-pression',
      message: 'Remise en état inadaptée à la cause trouvée.',
      when: ({ a, s }) => a.type === 'answer' && a.field === 'remedy' && a.value !== 0 && a.value !== 1 && !s.answers.remedy?.ok,
    },
  ],

  perfectRun(tier) {
    const r2 = (x: number) => Math.round(x * 100) / 100;
    const temp = (s: GameState, target: 'comp.condenser' | 'comp.condFan') =>
      (L11.measure!(s, { tool: 'thermometer', target }) ?? defaultReading(s, { tool: 'thermometer', target }))!.value;
    const plan = (s: GameState): Action[] => ({
      air: [{ type: 'custom', id: 'recover' }, { type: 'custom', id: 'vacuum' }, { type: 'custom', id: 'recharge' }],
      over: [{ type: 'custom', id: 'recover' }, { type: 'custom', id: 'vacuum' }, { type: 'custom', id: 'recharge' }],
      dirty: [{ type: 'custom', id: 'clean' }],
      fan: [{ type: 'custom', id: 'replace-fan' }],
    } as Record<Variant, Action[]>)[variant(s)];
    const planStep = (i: number): Step => (s) => plan(s)[i] ?? noop;
    return [
      { type: 'toggleCap', target: 'port.hp' },
      { type: 'connectHose', hose: 'red', end: 'port', socket: 'port.hp' },
      { type: 'wait', seconds: 60 },
      (s) => ({ type: 'answer', field: 'HPrun', value: r2(toRel(hpGauge(s))) }),
      { type: 'inspect', target: 'comp.condenser' },
      { type: 'inspect', target: 'comp.condFan' },
      { type: 'measure', tool: 'thermometer', target: 'comp.condFan' },
      { type: 'measure', tool: 'thermometer', target: 'comp.condenser' },
      (s) => ({ type: 'answer', field: 'dTair', value: Math.round((temp(s, 'comp.condenser') - temp(s, 'comp.condFan')) * 10) / 10 }),
      { type: 'setUnit', on: false },
      ...(tier === 'standard' ? [{ type: 'custom', id: 'clean' } as const] : []),
      (s) => (s.plant.faults.condFanOk ? { type: 'custom', id: 'fan' } : noop),
      (s) => ({ type: 'wait', seconds: s.vars.fan ? 600 : 1230 }),
      (s) => ({ type: 'answer', field: 'Psat', value: r2(psat('R32', temp(s, 'comp.condFan'), 'bubble')) }),
      (s) => ({ type: 'answer', field: 'HPstill', value: r2(hpGauge(s)) }),
      (s) => ({ type: 'answer', field: 'verdict', value: VARIANTS.indexOf(variant(s)) }),
      (s) => ({ type: 'answer', field: 'remedy', value: REMEDY[variant(s)] }),
      planStep(0), planStep(1), planStep(2),
      { type: 'setUnit', on: true },
      { type: 'wait', seconds: 180 },
      (s) => ({ type: 'answer', field: 'HPafter', value: r2(toRel(hpGauge(s))) }),
      { type: 'finish' },
    ];
  },
};

// Abbreviated workshop operation: time passes, the circuit ends at ambient temperature.
function jump(s: GameState, sec: number) {
  s.t += sec;
  for (const id of SYSTEM_IDS) s.circuit.volumes[id].T = s.plant.Tamb;
  s.vars.stopT = s.t - 1200;
}

export default L11;
