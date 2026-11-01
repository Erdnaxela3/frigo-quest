import { toRel, tsat } from '../physics/refrigerants';
import { kpCutIn, kpCutOut } from '../physics/cycle';
import { P, defaultReading, gaugeP, makePlatine, solenoidOpen, startsWithin } from '../game/platineModel';
import { fmt, refuse } from '../game/engine';
import type { GameState, Level, Step, Tier } from '../game/types';
import type { TargetId } from '../game/sceneIds';

const PS_HP = 42; // bar rel, nameplate
const HEAT_H = 12; // h, crankcase heater before a cold start
const I_NOM = 4.5; // A, nameplate
const LEAK = 6e-5; // kg/s through the leaky solenoid seat (standard): diff 0.7 → restart every ≈ 38 s, diff 1.5 → ≈ 87 s
const SCALE_ERR = [-0.3, -0.15, 0, 0.15, 0.3];

interface Jury { out: number; in: number; kp5?: number; th?: number }
export const jury = (s: GameState): Jury => JSON.parse(s.vars.jury as string);
const r1 = (x: number) => Math.round(x * 10) / 10;
const r2 = (x: number) => Math.round(x * 100) / 100;
const pick = <T>(xs: T[], x: number) => xs[Math.min(xs.length - 1, Math.floor(x * xs.length))];

const ok = (s: GameState, ...ids: string[]) => ids.every((id) => s.answers[id]?.ok);
const hoseOn = (s: GameState, port: string, mf: string) => s.hoses.some((h) => h.port === port && h.manifold === mf && h.valve);
const lpGauge = (s: GameState) => (hoseOn(s, 'port.lp', 'mf.lp') && s.valves.gas !== 'back' ? r2(toRel(gaugeP(s, 'mf.lp'))) : NaN);
const near = (x: unknown, y: number, tol = 0.2) => typeof x === 'number' && Math.abs(x - y) <= tol + 1e-9;
const cy = (s: GameState) => s.cycle ?? { BP: NaN, HP: NaN, Tevap: NaN, Tcond: NaN, SH: NaN, SC: NaN, current: NaN };
const VALVES_TO_SEE: TargetId[] = ['valve.receiver', 'valve.liquid', 'valve.gas'];
const heaterH = (s: GameState) => (s.elec.crankHeaterOnSince === null ? 0 : (s.t - s.elec.crankHeaterOnSince) / 3600);
const exam = (s: GameState) => s.tier === 'examen';

const REMISE = ['vat', 'terminals', 'visual', 'unlock', 'preheat', 'start', 'checks'];
const REMISE_MISTAKES = ['no-consignation-check', 'start-valve-closed', 'no-crankcase-wait'];

function ep3(l: Level, s: GameState) {
  const objs = l.objectives.filter((o) => !o.tiers || o.tiers.includes(s.tier));
  const part = (inRemise: boolean, pts: number, perMistake: number) => {
    const os = objs.filter((o) => REMISE.includes(o.id) === inRemise);
    const done = os.filter((o) => s.done.includes(o.id) || o.done(s)).length;
    const bad = s.mistakes.filter((m) => REMISE_MISTAKES.includes(m.id) === inRemise).length
      + (!inRemise && !ok(s, 'cutOut', 'cutIn') && !s.mistakes.some((m) => m.id === 'unverified') ? 1 : 0);
    return Math.max(0, Math.round((pts * done) / os.length) - perMistake * bad);
  };
  const a = part(true, 15, 5), b = part(false, 30, 10);
  return `Barème EP3 : remise en marche ${a}/15, réglage pressostat BP ${b}/30 (total ${a + b}/45).`;
}

const L07: Level = {
  id: 'L07',
  title: 'Mise en service et réglage des pressostats',
  skills: ['A1:6.03', 'A1:6.06', 'A1:7.04', 'A1:8.04', 'A1:9.04', 'A1:9.06', 'A1:1.05', 'CAP:UP3'],
  lesson: 'cap-up3',
  scene: 'PLATINE',
  fluid: 'R32',
  briefing: 'Épreuve EP3. La platine R32 est chargée, arrêtée et consignée (cadenas sur Q1). Régulation par tirage au vide (pump-down) : '
    + 'le thermostat commande l\'électrovanne, le pressostat BP (KP1) arrête et redémarre le compresseur. Le KP1 a été volontairement déréglé. '
    + '1) Remettez l\'installation en marche en sécurité : VAT et serrage des bornes, contrôle visuel des vannes, déconsignation en présence du jury, '
    + 'démarrage, intensité (pince) et ventilateurs. 2) Réglez le KP1 aux valeurs du jury (fiche jury) : sur le KP1, RANGE = enclenchement, '
    + 'DIFF = différentiel, coupure = RANGE − DIFF. L\'échelle n\'est qu\'indicative : vérifiez la coupure réelle en fermant la vanne liquide '
    + '(tirage au vide, notez la BP à l\'arrêt) puis l\'enclenchement en la rouvrant, à ± 0,2 bar. 3) Remplissez la fiche de relevés. '
    + 'Barème EP3 : remise en marche 15 pts, réglage du pressostat BP 30 pts.',
  tierNotes: {
    guide: 'Manifold déjà raccordé, carter chaud, échelle du KP1 juste. Jury : coupure 0,5 bar, enclenchement 2,0 bar → RANGE 2,0, DIFF 1,5.',
    standard: 'Jury : coupure 0,8 bar, enclenchement 2,3 bar. Échelle du KP1 décalée : mesurez, puis corrigez. Thermostat 22 °C : observez un cycle complet. Attention au court-cycle.',
    examen: 'Valeurs du jury aléatoires, KP5 et thermostat à régler, compresseur froid (résistance de carter coupée depuis 2 jours). 45 min.',
  },
  tools: ['hand', 'wrench', 'screwdriver', 'thermometer', 'clamp'],
  unitControl: true,
  timeLimit: 45 * 60,

  setup(tier: Tier, rng) {
    const ex = tier === 'examen', std = tier === 'standard';
    const Tamb = ex ? Math.round(26 + 8 * rng()) : 30;
    const s = makePlatine({
      levelId: 'L07', tier, Tamb, Troom: ex ? 26 : std ? 26 : 25,
      nameplate: `Plaque signalétique : R32 · charge 1,2 kg · PS HP ${PS_HP} bar / BP 25 bar · 230 V 50 Hz · I nominale ${fmt(I_NOM)} A`,
    });
    s.elec = { locked: true, voltageChecked: false, crankHeaterOnSince: null };
    s.plant.control = 'pumpDown';
    let j: Jury = { out: 0.5, in: 2.0 };
    let err = 0;
    if (std) { j = { out: 0.8, in: 2.3 }; err = 0.3; }
    if (ex) {
      const out = r1(0.3 + 1.2 * rng());
      const lo = Math.max(1, 1.5 - out), hi = Math.min(2.5, 3.5 - out);
      j = { out, in: r1(out + lo + (hi - lo) * rng()), kp5: pick([36, 37, 38, 39], rng()), th: pick([20, 21, 22, 23], rng()) };
      err = pick(SCALE_ERR, rng());
      s.vars.closed = rng() < 0.5 ? 'liquid' : 'receiver';
      if (s.vars.closed === 'liquid') s.valves.liquid = 'closed'; else s.valves.receiver = 'closed';
      s.plant.kp5 = { ...s.plant.kp5, range: 44, diff: 3 };
      s.plant.thermostat = { setpoint: 18, diff: 1, call: true };
    }
    if (std) {
      s.valves.liquid = 'closed';
      s.plant.thermostat = { setpoint: 22, diff: 2, call: true };
    }
    if (!ex) s.vars.warm = true;
    if (s.plant.thermostat) s.plant.box = { UA: 0.25, C: 300 };
    s.plant.kp1 = { ...s.plant.kp1, range: 3.5 - err, diff: 0.7, scaleError: err };
    if (tier === 'guide') {
      s.caps['port.lp'] = s.caps['port.hp'] = false;
      s.hoses.find((h) => h.id === 'blue')!.port = 'port.lp';
      s.hoses.find((h) => h.id === 'red')!.port = 'port.hp';
    }
    s.vars.jury = JSON.stringify(j);
    s.vars.kpT = false;
    return s;
  },

  actions: [
    {
      id: 'jury', label: (s) => {
        const j = jury(s);
        return `Fiche jury : KP1 coupure ${fmt(j.out)} / enclenchement ${fmt(j.in)} bar`
          + (j.kp5 ? ` · KP5 coupure ${fmt(j.kp5)} bar · thermostat ${fmt(j.th!)} °C (diff 2 K)` : '');
      },
    },
    { id: 'terminals', label: 'Coffret : contrôler le serrage des bornes' },
    { id: 'call-jury', label: 'Appeler le jury pour la déconsignation', visible: (s) => s.elec.locked && !s.vars.juryHere },
    { id: 'heat', label: `Attendre le préchauffage du carter (${HEAT_H} h)`, visible: (s) => !s.elec.locked && !s.running && heaterH(s) < HEAT_H },
  ],

  onAction(s, a) {
    if (a.type === 'custom') {
      if (a.id === 'jury') {
        const j = jury(s);
        return `Fiche jury : KP1 coupure ${fmt(j.out)} bar, enclenchement ${fmt(j.in)} bar → RANGE ${fmt(j.in)}, DIFF ${fmt(j.in - j.out)}`
          + (j.kp5 ? ` ; KP5 coupure ${fmt(j.kp5)} bar (réarmement manuel) ; thermostat ${fmt(j.th!)} °C, différentiel 2 K` : '');
      }
      if (a.id === 'terminals') {
        s.vars.terminals = true;
        if (!(s.elec.locked && s.elec.voltageChecked)) s.vars.liveWork = true;
        return 'Bornes du coffret et du compresseur resserrées, rien de desserré';
      }
      if (a.id === 'call-jury') { s.vars.juryHere = true; return 'Le jury est présent pour la déconsignation'; }
      if (a.id === 'heat') {
        const since = s.elec.crankHeaterOnSince ?? refuse('Résistance de carter non alimentée : déconsignez d\'abord.');
        // simplification: heater time is credited without advancing s.t, so the exam clock is not consumed by the 12 h wait
        s.elec.crankHeaterOnSince = since - HEAT_H * 3600;
        return `Résistance de carter sous tension depuis ${HEAT_H} h : huile chaude, fluide chassé du carter`;
      }
    }
    if (a.type === 'unlock' && !s.vars.juryHere) refuse('Déconsignation en présence du jury : appelez-le d\'abord.');
    if (a.type === 'checkVoltage' && s.elec.voltageChecked) s.vars.vat = true;
    if (a.type === 'inspect' && (a.target === 'comp.condFan' || a.target === 'comp.evapFan') && s.running) s.vars[a.target] = true;
    if (a.type === 'setPressostat' && a.kp === 'kp1') {
      for (const k of ['cutOut', 'cutIn']) delete s.answers[k];
      for (const k of ['seenOut', 'seenIn', 'gaugeOut', 'gaugeIn']) delete s.vars[k]; delete s.vars.thOff; delete s.vars.cycleSeen;
    }
    if (a.type === 'setThermostat') { delete s.vars.thOff; delete s.vars.cycleSeen; }
    if (a.type === 'finish') return ep3(L07, s);
  },

  onTick(s, dt) {
    const k1 = s.plant.kp1;
    if (k1.tripped !== s.vars.kpT) {
      // a real KP switches at its set point; the 0.1 s step overshoots, so the reference is the set point itself
      const g = lpGauge(s);
      if (k1.tripped) Object.assign(s.vars, { seenOut: Number.isNaN(g) ? NaN : kpCutOut(k1), gaugeOut: g });
      else Object.assign(s.vars, { seenIn: Number.isNaN(g) ? NaN : kpCutIn(k1), gaugeIn: g });
      s.vars.kpT = k1.tripped;
    }
    if (startsWithin(s) > 6) s.vars.shortCycled = true;
    const th = s.plant.thermostat;
    if (th) {
      if (!th.call) s.vars.thOff = true;
      else if (s.vars.thOff && s.running) s.vars.cycleSeen = true;
    }
    // standard: the solenoid seat passes a little liquid while closed → the stopped low side creeps up to the KP1 cut-in
    if (s.tier === 'standard' && !solenoidOpen(s) && s.valves.liquid === 'open' && P(s, 'liq') > P(s, 'lp') + 1) {
      const m = Math.min(LEAK * dt, s.circuit.volumes.liq.mRef * 0.5);
      s.circuit.volumes.liq.mRef -= m;
      s.circuit.volumes.lp.mRef += m;
    }
  },

  inspect(s, t) {
    if (t === 'comp.crankHeater') {
      if (s.vars.warm) return 'Résistance de carter : carter tiède, l\'installation n\'est consignée que depuis 10 min.';
      if (s.elec.crankHeaterOnSince === null) return 'Résistance de carter : non alimentée (consignée depuis 2 jours), carter froid. Notice : 12 h sous tension avant démarrage.';
      return `Résistance de carter : sous tension depuis ${fmt(heaterH(s))} h (12 h requises après un arrêt prolongé).`;
    }
    if (t === 'comp.condFan' || t === 'comp.evapFan') return `${t === 'comp.condFan' ? 'Ventilateur condenseur' : 'Ventilateur évaporateur'} : `
      + (s.running ? 'tourne, bon sens de rotation, débit d\'air correct.' : 'à l\'arrêt.');
    if (t === 'comp.compressor' && s.running) return `${s.nameplate}. Compresseur en marche : bruit régulier, pas de vibration anormale.`;
    if (t === 'comp.solenoid' && s.tier === 'standard' && !solenoidOpen(s) && !s.running) return 'Électrovanne liquide : bobine hors tension, léger sifflement au siège (passage de fluide).';
    return undefined;
  },

  objectives: [
    {
      id: 'vat', label: 'Vérifier l\'absence de tension au coffret (VAT), installation consignée',
      done: (s) => !!s.vars.vat,
      hints: ['On ne travaille dans un coffret qu\'après consignation ET vérification d\'absence de tension.', 'Outil main sur le coffret électrique : bouton VAT (installation encore consignée).', ['comp.elecBox']],
    },
    {
      id: 'terminals', label: 'Contrôler le serrage des bornes du coffret',
      done: (s) => !!s.vars.terminals,
      hints: ['« Rien de desserré » : connexions électriques comprises.', 'Commande « Coffret : contrôler le serrage des bornes ».'],
    },
    {
      id: 'visual', label: 'Contrôle visuel : vannes ouvertes, vanne gaz décollée pour les manomètres, manifold raccordé',
      done: (s) => VALVES_TO_SEE.every((v) => s.inspected.includes(v)) && s.valves.liquid === 'open' && s.valves.receiver === 'open'
        && s.valves.gas === 'mid' && hoseOn(s, 'port.lp', 'mf.lp') && hoseOn(s, 'port.hp', 'mf.hp'),
      hints: ['Une vanne restée fermée après la dernière intervention et c\'est le démarrage sur vanne fermée.',
        'Inspectez robinet réservoir, vanne liquide et vanne gaz ; ouvrez ce qui est fermé ; flexible bleu sur la prise BP, rouge sur la HP ; vanne gaz en position milieu.',
        VALVES_TO_SEE],
    },
    {
      id: 'unlock', label: 'Déconsigner en présence du jury',
      done: (s) => !s.elec.locked,
      hints: ['La déconsignation se fait devant le jury (le chargé de consignation).', 'Commande « Appeler le jury », puis coffret électrique : déconsigner.', ['comp.elecBox']],
    },
    {
      id: 'preheat', label: `Résistance de carter sous tension ${HEAT_H} h avant de démarrer`,
      done: (s) => heaterH(s) >= HEAT_H, tiers: ['examen'],
      hints: ['Compresseur froid : du fluide s\'est condensé dans l\'huile.', `Commande « Attendre le préchauffage du carter (${HEAT_H} h) ».`, ['comp.crankHeater']],
    },
    {
      id: 'start', label: 'Mettre l\'unité en marche',
      done: (s) => s.running,
      hints: ['Interrupteur de commande.', 'Bouton marche de l\'unité.'],
    },
    {
      id: 'checks', label: 'Contrôler l\'intensité (pince) et les deux ventilateurs',
      done: (s) => s.probes.some((p) => p.tool === 'clamp' && p.target === 'comp.compressor') && !!s.vars['comp.condFan'] && !!s.vars['comp.evapFan'],
      hints: [`Intensité à comparer à la plaque (${fmt(I_NOM)} A).`, 'Pince ampèremétrique sur le compresseur, puis outil main sur les deux ventilateurs, unité en marche.', ['comp.compressor', 'comp.condFan', 'comp.evapFan']],
    },
    {
      id: 'kp1', label: 'Régler le KP1 : RANGE = enclenchement, DIFF = enclenchement − coupure',
      done: (s) => {
        const j = jury(s), k = s.plant.kp1;
        return near(k.diff, j.in - j.out, 0.15) && (near(k.range, j.in) || near(k.range + k.scaleError, j.in));
      },
      hints: ['KP1 : la vis RANGE règle l\'enclenchement, la coupure = RANGE − DIFF.', 'Tournevis sur le KP1 : RANGE à la valeur d\'enclenchement du jury, DIFF à (enclenchement − coupure).', ['comp.kp1']],
    },
    {
      id: 'cutOut', label: 'Vérifier la coupure réelle (tirage au vide) et la noter (± 0,2 bar du jury)',
      done: (s) => ok(s, 'cutOut') && near(s.vars.seenOut, jury(s).out),
      hints: ['Fermez la vanne liquide : la BP chute, le KP1 arrête le compresseur. Notez la BP à cet instant.',
        'Vanne liquide fermée, regardez le manomètre BP au moment de l\'arrêt, saisissez la valeur. Hors tolérance : corrigez RANGE (¼ tour = 0,15 bar) et recommencez.', ['valve.liquid', 'comp.kp1']],
    },
    {
      id: 'cutIn', label: 'Vérifier l\'enclenchement réel en rouvrant la vanne liquide, et le noter',
      done: (s) => ok(s, 'cutIn') && near(s.vars.seenIn, jury(s).in) && s.valves.liquid === 'open',
      hints: ['Rouvrez la vanne liquide : la BP remonte, le KP1 redémarre le compresseur.', 'Notez la BP au redémarrage. Laissez la vanne liquide ouverte.', ['valve.liquid']],
    },
    {
      id: 'kp5', label: `Régler le KP5 (HP, réarmement manuel) à la coupure du jury, sous PS (${PS_HP} bar)`,
      done: (s) => near(kpCutOut(s.plant.kp5), jury(s).kp5 ?? NaN, 0.25), tiers: ['examen'],
      hints: ['KP5 : RANGE = coupure.', 'Tournevis sur le KP5, RANGE à la coupure demandée.', ['comp.kp5']],
    },
    {
      id: 'thermo', label: 'Régler le thermostat (consigne du jury, différentiel 2 K)',
      done: (s) => s.plant.thermostat?.setpoint === jury(s).th && s.plant.thermostat?.diff === 2, tiers: ['examen'],
      hints: ['La consigne est sur la fiche jury.', 'Outil main sur le thermostat d\'ambiance.', ['comp.thermostat']],
    },
    {
      id: 'cycle', label: 'Observer un cycle complet : consigne atteinte, tirage au vide, redémarrage',
      done: (s) => !!s.vars.cycleSeen, tiers: ['standard', 'examen'],
      hints: ['Thermostat satisfait → électrovanne fermée → tirage au vide → arrêt KP1 ; puis demande de froid → redémarrage.', 'Attendez en accéléré (×60) en surveillant le nombre de démarrages.'],
    },
    {
      id: 'sheet', label: 'Remplir la fiche de relevés : BP, HP, T évap, T cond, SH, SC, intensité',
      done: (s) => ok(s, 'BP', 'HP', 'Tevap', 'Tcond', 'SH', 'SC', 'current'),
      hints: ['Relevés compresseur en marche et stabilisé.', 'Manomètres BP/HP, échelles °C (rosée / bulle), thermomètres aspiration et sortie condenseur, pince.', ['comp.txvBulb', 'joint.condOut']],
    },
  ],

  answers: [
    { id: 'cutOut', label: 'Coupure KP1 mesurée', unit: 'bar', tol: 0.2, expected: (s) => (s.vars.gaugeOut as number) ?? NaN },
    { id: 'cutIn', label: 'Enclenchement KP1 mesuré', unit: 'bar', tol: 0.2, expected: (s) => (s.vars.gaugeIn as number) ?? NaN },
    { id: 'BP', label: 'BP', unit: 'bar', tol: 0.2, expected: (s) => (s.cycle && hoseOn(s, 'port.lp', 'mf.lp') ? toRel(gaugeP(s, 'mf.lp')) : NaN) },
    { id: 'HP', label: 'HP', unit: 'bar', tol: 0.3, expected: (s) => (s.cycle && hoseOn(s, 'port.hp', 'mf.hp') ? toRel(gaugeP(s, 'mf.hp')) : NaN) },
    { id: 'Tevap', label: 'T évap', unit: '°C', tol: 1, expected: (s) => cy(s).Tevap },
    { id: 'Tcond', label: 'T cond', unit: '°C', tol: 1, expected: (s) => cy(s).Tcond },
    { id: 'SH', label: 'Surchauffe', unit: 'K', tol: 1, expected: (s) => cy(s).SH },
    { id: 'SC', label: 'Sous-refroid.', unit: 'K', tol: 1, expected: (s) => cy(s).SC },
    { id: 'current', label: 'Intensité', unit: 'A', tol: 0.2, expected: (s) => cy(s).current },
  ],

  rules: [
    {
      id: 'no-consignation-check', severity: 'critical', skill: 'A1:6.03', lesson: 'cap-up3',
      message: 'Intervention dans le coffret sans consignation ni vérification d\'absence de tension (VAT) : risque d\'électrisation. Consigner, VAT, puis travailler.',
      when: ({ s }) => !!s.vars.liveWork,
    },
    {
      id: 'start-valve-closed', severity: 'critical', skill: 'A1:6.06', lesson: 'circuit',
      message: 'Démarrage avec une vanne fermée : ligne liquide fermée = tirage au vide immédiat et compresseur qui tire au vide ; '
        + 'refoulement ou aspiration fermés = surpression ou casse. Toujours contrôler les vannes avant la mise en marche.',
      when: ({ a, prev, s }) => a.type === 'setUnit' && a.on && s.unitOn
        && (prev.valves.liquid === 'closed' || prev.valves.receiver === 'closed' || prev.valves.gas === 'front'),
    },
    {
      id: 'no-crankcase-wait', severity: 'major', skill: 'A1:6.06', lesson: 'composants',
      message: `Compresseur froid démarré sans préchauffage du carter (${HEAT_H} h) : le fluide dissous dans l'huile mousse, graissage dégradé, usure des paliers.`,
      when: ({ a, s }) => a.type === 'setUnit' && a.on && s.unitOn && exam(s) && heaterH(s) < HEAT_H,
    },
    {
      id: 'kp-logic', severity: 'major', skill: 'A1:9.04', lesson: 'composants',
      message: 'RANGE du KP1 réglée sur la coupure : sur un pressostat BP, RANGE = enclenchement et coupure = RANGE − DIFF.',
      when: ({ a, s }) => a.type === 'setPressostat' && a.kp === 'kp1' && a.range !== undefined && near(a.range, jury(s).out, 0.15),
    },
    {
      id: 'short-cycle', severity: 'major', skill: 'A1:9.06', lesson: 'composants',
      message: 'Court-cycle : plus de 6 démarrages en 10 min. Usure du compresseur et du contacteur : augmentez le différentiel du KP1 (et cherchez une fuite d\'électrovanne).',
      when: ({ s }) => !!s.vars.shortCycled,
    },
    {
      id: 'unverified', severity: 'major', skill: 'A1:9.04', lesson: 'cap-up3',
      message: 'Réglage non vérifié : l\'échelle d\'un KP est indicative, seule la mesure au manomètre de la coupure et de l\'enclenchement réels compte.',
      when: ({ a, s }) => a.type === 'finish' && !ok(s, 'cutOut', 'cutIn'),
    },
    {
      id: 'hp-above-ps', severity: 'critical', skill: 'A1:9.04', lesson: 'reglementation',
      message: `Coupure du pressostat HP au-dessus de la PS (${PS_HP} bar) : l'organe de sécurité doit couper avant la pression maximale admissible.`,
      when: ({ a, s }) => ((a.type === 'setPressostat' && a.kp === 'kp5') || (a.type === 'finish' && exam(s))) && kpCutOut(s.plant.kp5) > PS_HP,
    },
  ],

  perfectRun(tier) {
    const lp = (s: GameState) => gaugeP(s, 'mf.lp'), hp = (s: GameState) => gaugeP(s, 'mf.hp');
    const temp = (s: GameState, target: 'comp.txvBulb' | 'joint.condOut') => defaultReading(s, { tool: 'thermometer', target })!.value;
    const ex = tier === 'examen';
    // exam: the scale error is unknown to the player; reading it here stands for one measure-and-correct round
    const setKp1 = (shift: number): Step => (s) => {
      const j = jury(s);
      return { type: 'setPressostat', kp: 'kp1', range: r2(j.in + (ex ? s.plant.kp1.scaleError : shift)), diff: r1(j.in - j.out) };
    };
    const verify: Step[] = [
      { type: 'setServiceValve', valve: 'valve.liquid', pos: 'closed' },
      { type: 'wait', seconds: 60 },
      (s) => ({ type: 'answer', field: 'cutOut', value: s.vars.gaugeOut as number }),
      { type: 'setServiceValve', valve: 'valve.liquid', pos: 'open' },
      { type: 'wait', seconds: 5 },
      (s) => ({ type: 'answer', field: 'cutIn', value: s.vars.gaugeIn as number }),
    ];
    const steps: Step[] = [
      { type: 'custom', id: 'jury' },
      { type: 'checkVoltage' },
      { type: 'custom', id: 'terminals' },
      ...VALVES_TO_SEE.map((target): Step => ({ type: 'inspect', target })),
      { type: 'toggleCap', target: 'valve.liquid' },
      { type: 'toggleCap', target: 'valve.receiver' },
      { type: 'toggleCap', target: 'valve.gas' },
      (s) => (s.valves.liquid === 'closed' ? { type: 'setServiceValve', valve: 'valve.liquid', pos: 'open' } : { type: 'inspect', target: 'comp.receiver' }),
      (s) => (s.valves.receiver === 'closed' ? { type: 'setServiceValve', valve: 'valve.receiver', pos: 'open' } : { type: 'inspect', target: 'comp.sightglass' }),
      ...(tier === 'guide' ? [] : [
        { type: 'toggleCap', target: 'port.lp' },
        { type: 'toggleCap', target: 'port.hp' },
        { type: 'connectHose', hose: 'blue', end: 'port', socket: 'port.lp' },
        { type: 'connectHose', hose: 'red', end: 'port', socket: 'port.hp' },
      ] as Step[]),
      { type: 'setServiceValve', valve: 'valve.gas', pos: 'mid' },
      { type: 'inspect', target: 'comp.crankHeater' },
      { type: 'custom', id: 'call-jury' },
      { type: 'unlock' },
      ...(ex ? [{ type: 'custom', id: 'heat' }] as Step[] : []),
      { type: 'setUnit', on: true },
      { type: 'wait', seconds: 30 },
      { type: 'measure', tool: 'clamp', target: 'comp.compressor' },
      { type: 'inspect', target: 'comp.condFan' },
      { type: 'inspect', target: 'comp.evapFan' },
      setKp1(0),
      ...verify,
    ];
    if (tier === 'standard') steps.push(setKp1(0.3), ...verify);
    steps.push(
      { type: 'wait', seconds: 180 },
      (s) => ({ type: 'answer', field: 'BP', value: r2(toRel(lp(s))) }),
      (s) => ({ type: 'answer', field: 'HP', value: r2(toRel(hp(s))) }),
      (s) => ({ type: 'answer', field: 'Tevap', value: r1(tsat(s.fluid, lp(s), 'dew')) }),
      (s) => ({ type: 'answer', field: 'Tcond', value: r1(tsat(s.fluid, hp(s), 'bubble')) }),
      { type: 'measure', tool: 'thermometer', target: 'comp.txvBulb' },
      { type: 'measure', tool: 'thermometer', target: 'joint.condOut' },
      (s) => ({ type: 'answer', field: 'SH', value: r1(temp(s, 'comp.txvBulb') - tsat(s.fluid, lp(s), 'dew')) }),
      (s) => ({ type: 'answer', field: 'SC', value: r1(tsat(s.fluid, hp(s), 'bubble') - temp(s, 'joint.condOut')) }),
      (s) => ({ type: 'answer', field: 'current', value: r2(cy(s).current) }),
    );
    if (ex) steps.push(
      (s) => ({ type: 'setPressostat', kp: 'kp5', range: jury(s).kp5!, diff: 3 }),
      (s) => ({ type: 'setThermostat', setpoint: jury(s).th!, diff: 2 }),
    );
    // wait for the thermostat to be satisfied and call again (no-op once the cycle is seen)
    if (tier !== 'guide') steps.push(...Array.from({ length: 60 }, (): Step => (s) => (s.vars.cycleSeen
      ? { type: 'setTimeScale', scale: 1 } : { type: 'wait', seconds: 60 })));
    steps.push({ type: 'finish' });
    return steps;
  },
};

export default L07;
