import { psat, toAbs, toRel, tsat } from '../physics/refrigerants';
import { P, gaugeP, makePlatine } from '../game/platineModel';
import { fmt, refuse } from '../game/engine';
import type { GameState, Level, Socket, Step, Tier } from '../game/types';

const FLUID = 'R449A';
const KVR_FACTORY = 10;
const KVP_FACTORY = 2;
const pEvap = (T: number) => toRel(psat(FLUID, T, 'dew'));
const pCond = (T: number) => toRel(psat(FLUID, T, 'bubble'));
const onPort = (s: GameState, port: Socket, mf: Socket) => s.hoses.some((h) => h.port === port && h.manifold === mf && h.valve);
const rel = (s: GameState, id: 'lp' | 'hp') => toRel(P(s, id));
// what the gauge shows when its hose sits on the port (the hose lags the circuit a little), else the circuit value
const reading = (s: GameState, id: 'lp' | 'hp') => {
  const mf = id === 'lp' ? 'mf.lp' : 'mf.hp';
  return onPort(s, id === 'lp' ? 'port.evap' : 'port.hp', mf) ? toRel(gaugeP(s, mf)) : rel(s, id);
};
const ok = (s: GameState, ...ids: string[]) => ids.every((id) => s.answers[id]?.ok);
const winter = (s: GameState) => s.vars.season === 'hiver';
const tevapT = (s: GameState) => s.vars.tevapTarget as number;
const tcondT = (s: GameState) => s.vars.tcondTarget as number;
const seasonT = (s: GameState, season: string) => s.vars[season === 'hiver' ? 'Twinter' : 'Tsummer'] as number;

const L15: Level = {
  id: 'L15',
  title: 'Régulateurs de pression KVP / KVR',
  skills: ['A1:7.02', 'A1:8.02', 'A1:8.07', 'A1:9.05', 'A1:7.10', 'A1:8.11', 'CAP:UP3'],
  lesson: 'composants',
  scene: 'PLATINE',
  fluid: FLUID,
  briefing: 'La platine est montée ici en chambre positive « produits frais » (air de la chambre ≈ 4 °C), chargée au R449A, '
    + 'avec un condenseur à air extérieur. Un régulateur de pression d\'évaporation (KVP) en sortie d\'évaporateur évite que la chambre '
    + 'n\'évapore trop froid (produits desséchés, givre) ; un régulateur de pression de condensation (KVR) maintient la HP en hiver pour '
    + 'que le détendeur reste correctement alimenté. Réglez-les en lisant le manomètre raccordé à la bonne prise (évaporateur pour le KVP, '
    + 'HP pour le KVR), jamais « à l\'échelle ». Le R449A a du glissement : évaporation en rosée, condensation en bulle.',
  tierNotes: {
    guide: 'Été (+30 °C), KVP seul. Consigne : T évap 0 °C rosée = 3,75 bar. La valeur de réglage est affichée sur le régulateur.',
    standard: 'Hiver (−5 °C) puis été (+30 °C) : KVR (Tcond ≥ 25 °C) et KVP (T évap ≈ 0 °C). Pas d\'échelle sur les régulateurs.',
    examen: 'Saison, températures et consignes aléatoires ; le KVP a été déréglé, la chambre évapore trop froid. 30 min.',
  },
  tools: ['hand', 'wrench', 'screwdriver', 'thermometer'],
  timeLimit: 30 * 60,

  setup(tier: Tier, rng) {
    const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rng() * xs.length)];
    const exam = tier === 'examen';
    const Twinter = exam ? pick([-8, -6, -4]) : -5;
    const Tsummer = exam ? pick([26, 30, 34]) : 30;
    const season = tier === 'guide' ? 'ete' : exam ? pick(['hiver', 'ete']) : 'hiver';
    const s = makePlatine({ levelId: 'L15', tier, fluid: FLUID, Tamb: season === 'hiver' ? Twinter : Tsummer, Troom: 4, running: true });
    s.plant.kvp = { setting: exam ? pick([1, 1.2, 1.4, 1.6]) : KVP_FACTORY, enabled: true };
    if (tier !== 'guide') s.plant.kvr = { setting: KVR_FACTORY, enabled: false };
    s.vars = {
      season, Twinter, Tsummer,
      tevapTarget: exam ? pick([0, 1, 2]) : 0,
      tcondTarget: exam ? pick([22, 25, 28]) : 25,
    };
    return s;
  },

  objectives: [
    {
      id: 'detect', label: 'Relever la température d\'évaporation de la chambre produits frais (prise évaporateur)', tiers: ['examen'],
      done: (s) => ok(s, 'tevapFound'),
      hints: ['Le KVP régule la pression de l\'évaporateur, pas celle du compresseur.', 'Flexible bleu sur la prise évaporateur, lisez la BP et convertissez en rosée.', ['port.evap']],
    },
    {
      id: 'diag', label: 'Hiver, KVR by-passé : relever la HP et diagnostiquer', tiers: ['standard', 'examen'],
      done: (s) => ok(s, 'hpWinter', 'diag'),
      hints: ['Air extérieur froid : la HP s\'effondre. Que devient le débit du détendeur ?',
        'Flexible rouge sur la prise HP, relevez la HP. Le détendeur a besoin d\'un ΔP HP − BP suffisant : sans lui il sous-alimente (surchauffe élevée).', ['port.hp']],
    },
    {
      id: 'kvr', label: 'Mettre le KVR en service et le régler pour la Tcond minimale, vérifier au manomètre HP', tiers: ['standard', 'examen'],
      done: (s) => ok(s, 'kvrTarget') && !!s.vars.kvrOk,
      hints: ['Consigne KVR = pression de bulle à la Tcond minimale voulue.',
        'Fermez le by-pass du KVR, clé sur le KVR : ¼ de tour horaire = +0,25 bar. Attendez la stabilisation, puis relevez la HP au manomètre.', ['comp.kvr', 'port.hp']],
    },
    {
      id: 'kvp', label: 'Régler le KVP pour la T évap visée, vérifier à la prise évaporateur',
      done: (s) => ok(s, 'kvpTarget') && !!s.vars.kvpOk,
      hints: ['Consigne KVP = pression de rosée à la T évap visée (± 0,3 bar), lue côté évaporateur.',
        'Clé sur le KVP : ¼ de tour horaire = +0,1 bar. Lisez la BP sur le flexible bleu raccordé à la prise évaporateur (pas la prise BP du compresseur, en aval du KVP).', ['comp.kvp', 'port.evap']],
    },
    {
      id: 'summer', label: 'Été : vérifier que le KVR est ouvert en grand (HP non pénalisée)', tiers: ['standard', 'examen'],
      done: (s) => ok(s, 'hpSummer', 'summerReg'),
      hints: ['En été la HP naturelle dépasse largement la consigne du KVR.', 'Passez en été, attendez la stabilisation, relevez la HP et comparez-la au réglage du KVR.', ['port.hp']],
    },
    {
      id: 'energy', label: 'Question énergie : KVR réglé plus haut « pour la sécurité » ?', tiers: ['standard', 'examen'],
      done: (s) => ok(s, 'kvrHigh'),
      hints: ['Regardez le COP de l\'analyseur en tournant le KVR.', 'HP plus haute = taux de compression plus élevé = plus de puissance absorbée pour le même froid.'],
    },
    {
      id: 'why', label: 'Pourquoi un KVP sur une chambre produits frais ?',
      done: (s) => ok(s, 'kvpWhy'),
      hints: ['Une chambre à 4 °C n\'a pas besoin d\'un évaporateur à −11 °C.', 'Évaporateur trop froid : l\'air sèche les produits et l\'évaporateur givre.'],
    },
  ],

  answers: [
    { id: 'tevapFound', label: 'T évap chambre produits frais (avant correction)', unit: '°C', tol: 1.5, tiers: ['examen'],
      expected: (s) => tsat(FLUID, toAbs(reading(s, 'lp')), 'dew') },
    { id: 'hpWinter', label: 'HP en hiver, KVR by-passé', unit: 'bar', tol: 0.3, tiers: ['standard', 'examen'], expected: (s) => reading(s, 'hp') },
    { id: 'diag', label: 'Diagnostic hiver', unit: '', tol: 0, tiers: ['standard', 'examen'], expected: () => 1,
      choices: ['Manque de fluide', 'HP trop basse : ΔP insuffisant, le détendeur sous-alimente (surchauffe élevée)', 'Détendeur trop ouvert', 'Excès de fluide'] },
    { id: 'kvrTarget', label: 'Consigne KVR (bulle à la Tcond mini)', unit: 'bar', tol: 0.2, tiers: ['standard', 'examen'], expected: (s) => pCond(tcondT(s)) },
    { id: 'hpKvr', label: 'HP après réglage du KVR', unit: 'bar', tol: 0.3, tiers: ['standard', 'examen'], expected: (s) => reading(s, 'hp') },
    { id: 'kvpTarget', label: 'Consigne KVP (rosée à la T évap visée)', unit: 'bar', tol: 0.2, expected: (s) => pEvap(tevapT(s)) },
    { id: 'bpEvap', label: 'BP évaporateur après réglage du KVP', unit: 'bar', tol: 0.2, expected: (s) => reading(s, 'lp') },
    { id: 'hpSummer', label: 'HP en été', unit: 'bar', tol: 0.3, tiers: ['standard', 'examen'], expected: (s) => reading(s, 'hp') },
    { id: 'summerReg', label: 'En été, le KVR…', unit: '', tol: 0, tiers: ['standard', 'examen'], expected: () => 0,
      choices: ['est ouvert en grand : HP fixée par l\'air extérieur, aucune pénalité', 'maintient la HP à son réglage', 'doit être by-passé à la main chaque été'] },
    { id: 'kvrHigh', label: 'KVR réglé plus haut « pour la sécurité »', unit: '', tol: 0, tiers: ['standard', 'examen'], expected: () => 0,
      choices: ['Taux de compression plus élevé, COP plus faible : énergie gaspillée', 'Aucune conséquence, c\'est plus sûr', 'Le détendeur serait sous-alimenté', 'Le compresseur aspirerait du liquide'] },
    { id: 'kvpWhy', label: 'Rôle du KVP ici', unit: '', tol: 0, expected: () => 1,
      choices: ['Augmenter le COP du groupe', 'Éviter un évaporateur trop froid : produits desséchés, givrage', 'Protéger le compresseur des coups de liquide', 'Maintenir la HP en hiver'] },
  ],

  rules: [
    {
      id: 'kvp-too-low', severity: 'major', skill: 'A1:8.02', lesson: 'composants',
      message: 'La chambre produits frais évapore sous −2 °C : KVP réglé trop bas, les produits se dessèchent et l\'évaporateur givre.',
      when: ({ a, s }) => (a.type === 'finish' || (a.type === 'answer' && a.field === 'bpEvap'))
        && !!s.plant.kvp?.enabled && (s.cycle?.Tevap ?? 99) < -2,
    },
    {
      id: 'kvr-too-high', severity: 'minor', skill: 'A1:7.10', lesson: 'composants',
      message: 'Tcond au-dessus de 35 °C en hiver à cause du KVR : taux de compression et puissance absorbée inutiles, le COP chute.',
      when: ({ s }) => winter(s) && !!s.plant.kvr?.enabled && (s.cycle?.Tcond ?? 0) > 35,
    },
    {
      id: 'scale-only', severity: 'minor', skill: 'A1:9.05', lesson: 'composants',
      message: 'Régulateur réglé sans vérification au manomètre sur sa prise (KVP : prise évaporateur ; KVR : prise HP). L\'échelle d\'un régulateur n\'est qu\'indicative.',
      when: ({ a, s }) => (a.type === 'answer' && ((a.field === 'bpEvap' && !onPort(s, 'port.evap', 'mf.lp'))
        || (a.field === 'hpKvr' && !onPort(s, 'port.hp', 'mf.hp'))))
        || (a.type === 'finish' && ((!!s.vars.kvpAdj && !s.vars.kvpChecked) || (!!s.vars.kvrAdj && !s.vars.kvrChecked))),
    },
  ],

  actions: [
    {
      id: 'season', visible: (s) => s.tier !== 'guide',
      label: (s) => (winter(s) ? `Passer en été (${fmt(seasonT(s, 'ete'), 0)} °C)` : `Passer en hiver (${fmt(seasonT(s, 'hiver'), 0)} °C)`),
    },
    {
      id: 'kvrBypass', visible: (s) => !!s.plant.kvr,
      label: (s) => (s.plant.kvr?.enabled ? 'KVR : ouvrir le by-pass (hors service)' : 'KVR : fermer le by-pass (mise en service)'),
    },
    {
      id: 'meter',
      label: (s) => (s.cycle
        ? `Analyseur : COP ${fmt(s.cycle.COP, 2)} · taux de compression ${fmt(s.cycle.HP / (s.cycle.BPsuction ?? s.cycle.BP))}`
        : 'Analyseur : compresseur à l\'arrêt'),
    },
  ],

  onAction(s, a) {
    if (a.type === 'setRegulator') {
      s.vars[`${a.reg}Adj`] = true;
      s.vars[`${a.reg}Checked`] = s.vars[`${a.reg}Ok`] = false;
    }
    if (a.type === 'answer') {
      if (a.field === 'hpWinter' && !(winter(s) && !s.plant.kvr?.enabled)) refuse('Relevé à faire en hiver, KVR by-passé.');
      if (a.field === 'hpSummer' && winter(s)) refuse('Relevé à faire en été.');
      if (a.field === 'hpKvr') {
        if (!winter(s) || !s.plant.kvr?.enabled) refuse('Vérification à faire en hiver, KVR en service.');
        const checked = (s.vars.kvrChecked = onPort(s, 'port.hp', 'mf.hp'));
        const hp = toRel(s.cycle?.HP ?? 0), target = pCond(tcondT(s));
        s.vars.kvrOk = checked && s.answers.hpKvr.ok && hp >= target - 0.3 && hp <= target + 1.5;
      }
      if (a.field === 'bpEvap') {
        const checked = (s.vars.kvpChecked = onPort(s, 'port.evap', 'mf.lp'));
        s.vars.kvpOk = checked && s.answers.bpEvap.ok && !!s.plant.kvp?.enabled
          && Math.abs(rel(s, 'lp') - pEvap(tevapT(s))) <= 0.3;
      }
    }
    if (a.type !== 'custom') return;
    if (a.id === 'season') {
      s.vars.season = winter(s) ? 'ete' : 'hiver';
      s.plant.Tamb = seasonT(s, s.vars.season as string);
      return `${winter(s) ? 'Hiver' : 'Été'} : air extérieur ${fmt(s.plant.Tamb, 0)} °C`;
    }
    if (a.id === 'kvrBypass') {
      const r = s.plant.kvr!;
      r.enabled = !r.enabled;
      if (r.enabled) {
        s.vars.kvrAdj = true;
        s.vars.kvrChecked = s.vars.kvrOk = false;
      }
      return r.enabled ? 'By-pass du KVR fermé : KVR en service' : 'By-pass du KVR ouvert : KVR hors service';
    }
    if (a.id === 'meter') {
      const c = s.cycle;
      return c ? `Analyseur : COP ${fmt(c.COP, 2)}, puissance frigorifique ${fmt(c.capacityKW, 2)} kW, intensité ${fmt(c.current)} A` : 'Compresseur à l\'arrêt';
    }
  },

  perfectRun(tier) {
    const r2 = (x: number) => Math.round(x * 100) / 100;
    const grid = (from: number, to: number, step: number, up = false) =>
      r2(from + step * (up ? Math.ceil((to - from) / step - 1e-9) : Math.round((to - from) / step)));
    const lpGauge = (s: GameState) => r2(toRel(gaugeP(s, 'mf.lp'))), hpGauge = (s: GameState) => r2(toRel(gaugeP(s, 'mf.hp')));
    const toSeason = (season: string): Step => (s) => (s.vars.season === season ? { type: 'wait', seconds: 1 } : { type: 'custom', id: 'season' });
    const kvp: Step[] = [
      (s) => ({ type: 'answer', field: 'kvpTarget', value: r2(pEvap(tevapT(s))) }),
      (s) => ({ type: 'setRegulator', reg: 'kvp', setting: grid(s.plant.kvp!.setting, pEvap(tevapT(s)), 0.1) }),
      { type: 'wait', seconds: 150 },
      (s) => ({ type: 'answer', field: 'bpEvap', value: lpGauge(s) }),
    ];
    const steps: Step[] = [
      { type: 'toggleCap', target: 'port.evap' },
      { type: 'connectHose', hose: 'blue', end: 'port', socket: 'port.evap' },
    ];
    if (tier === 'guide') return [...steps, { type: 'wait', seconds: 30 }, ...kvp, { type: 'answer', field: 'kvpWhy', value: 1 }, { type: 'finish' }];
    steps.push(
      { type: 'toggleCap', target: 'port.hp' },
      { type: 'connectHose', hose: 'red', end: 'port', socket: 'port.hp' },
      { type: 'wait', seconds: 60 },
    );
    if (tier === 'examen') steps.push((s) => ({ type: 'answer', field: 'tevapFound', value: Math.round(tsat(FLUID, gaugeP(s, 'mf.lp'), 'dew')) }));
    steps.push(
      ...kvp,
      toSeason('hiver'), { type: 'wait', seconds: 150 },
      (s) => ({ type: 'answer', field: 'hpWinter', value: hpGauge(s) }),
      { type: 'answer', field: 'diag', value: 1 },
      (s) => ({ type: 'answer', field: 'kvrTarget', value: r2(pCond(tcondT(s))) }),
      { type: 'custom', id: 'kvrBypass' },
      (s) => ({ type: 'setRegulator', reg: 'kvr', setting: grid(KVR_FACTORY, pCond(tcondT(s)), 0.25, true) }),
      { type: 'wait', seconds: 150 },
      (s) => ({ type: 'answer', field: 'hpKvr', value: hpGauge(s) }),
      { type: 'custom', id: 'meter' },
      { type: 'answer', field: 'kvrHigh', value: 0 },
      { type: 'custom', id: 'season' }, { type: 'wait', seconds: 300 },
      (s) => ({ type: 'answer', field: 'hpSummer', value: hpGauge(s) }),
      { type: 'answer', field: 'summerReg', value: 0 },
      { type: 'answer', field: 'kvpWhy', value: 1 },
      { type: 'finish' },
    );
    return steps;
  },
};

export default L15;
