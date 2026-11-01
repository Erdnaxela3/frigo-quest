import { toRel, tsat } from '../physics/refrigerants';
import type { FluidId } from '../physics/types';
import { defaultReading, gaugeP, makePlatine } from '../game/platineModel';
import { isPort } from '../game/engine';
import type { GameState, Level, Socket, Step, Tier } from '../game/types';

const mfOpen = (s: GameState, sock: Socket) => {
  const v = s.manifold.valves;
  return sock === 'mf.lp' ? v.lp : sock === 'mf.hp' ? v.hp : sock === 'mf.center' ? !s.manifold.fourWay || v.charge : sock === 'mf.vac' && v.vac;
};
// a port is in communication with the manifold body
const reaches = (s: GameState, ports: Socket[]) =>
  s.hoses.some((h) => h.port && ports.includes(h.port) && h.valve && h.manifold?.startsWith('mf.') && mfOpen(s, h.manifold));
const bypass = (s: GameState) => s.running && s.valves.gas !== 'back' && reaches(s, ['port.lp']) && reaches(s, ['port.hp', 'port.liq']);
const hoseOn = (s: GameState, port: Socket, mf: Socket) => s.hoses.some((h) => h.port === port && h.manifold === mf);
const ok = (s: GameState, ...ids: string[]) => ids.every((id) => s.answers[id]?.ok);
const cy = (s: GameState) => s.cycle ?? { BP: NaN, HP: NaN, Tevap: NaN, Tcond: NaN, SH: NaN, SC: NaN };
const TEMPS = ['Tevap', 'Tcond', 'SH', 'SC'];

const L01: Level = {
  id: 'L01',
  title: 'Raccorder le manifold et lire l\'installation',
  skills: ['A1:5.01', 'A1:1.03', 'A1:1.04', 'A1:6.04', 'CAP:UP3'],
  lesson: 'saturation',
  scene: 'PLATINE',
  fluid: 'R32',
  briefing: 'Contrôle de fonctionnement de la platine split R32 en marche. Raccordez le manifold, relevez BP, HP, températures '
    + 'd\'évaporation et de condensation, surchauffe et sous-refroidissement, puis déconnectez-vous sans émission et remettez les bouchons.',
  tierNotes: {
    guide: 'Point de fonctionnement nominal (air extérieur 30 °C).',
    standard: 'Journée chaude : air extérieur 35 °C, les valeurs changent.',
    examen: 'Point de fonctionnement et échelle du manifold aléatoires, 20 min.',
  },
  tools: ['hand', 'wrench', 'thermometer', 'clamp'],
  timeLimit: 20 * 60,

  setup(tier: Tier, rng) {
    const r = (a: number, b: number) => Math.round((a + (b - a) * rng()) * 2) / 2;
    const exam = tier === 'examen';
    const s = makePlatine({
      levelId: 'L01', tier, running: true,
      Tamb: exam ? r(24, 38) : tier === 'standard' ? 35 : 30,
      Troom: exam ? r(20, 30) : tier === 'standard' ? 27 : 25,
      charge: exam ? 1.2 * (0.92 + 0.12 * rng()) : 1.2,
    });
    const scales: FluidId[] = ['R410A', 'R134a', 'R449A'];
    s.manifold.scale = exam ? scales[Math.floor(rng() * scales.length)] : 'R410A';
    return s;
  },

  objectives: [
    {
      id: 'scale', label: 'Régler l\'échelle du manifold sur le fluide de la plaque signalétique',
      done: (s) => s.manifold.scale === s.fluid,
      hints: ['Quel fluide ? Regardez la plaque signalétique.', 'Inspectez le compresseur (outil main), puis choisissez R32 dans le sélecteur d\'échelle du manifold.', ['comp.compressor']],
    },
    {
      id: 'connect', label: 'Raccorder le flexible bleu sur la prise BP et le rouge sur la prise HP',
      done: (s) => hoseOn(s, 'port.lp', 'mf.lp') && hoseOn(s, 'port.hp', 'mf.hp'),
      hints: ['Bleu côté BP (vanne gaz 3 voies), rouge côté HP (refoulement). Les prises ont un bouchon.',
        'Outil main : retirez les bouchons des prises BP et HP. Prenez le flexible bleu et cliquez la prise BP, puis le rouge sur la prise HP.', ['port.lp', 'port.hp']],
    },
    {
      id: 'open', label: 'Décoller la vanne gaz du contre-siège arrière (position milieu)',
      done: (s) => s.valves.gas === 'mid',
      hints: ['Les vannes de service sont en contre-siège arrière : la prise de pression est fermée.',
        'Outil main : retirez le chapeau de la vanne gaz. Clé de vanne : position milieu (¼ à ½ tour).', ['valve.gas']],
    },
    {
      id: 'read', label: 'Relever BP, HP, T évaporation (rosée) et T condensation (bulle)',
      done: (s) => ok(s, 'BP', 'HP', 'Tevap', 'Tcond'),
      hints: ['BP → température de rosée (évaporation), HP → température de bulle (condensation).',
        'Lisez les afficheurs des manomètres (bar relatif) et l\'échelle °C de chaque cadran, puis saisissez les quatre valeurs.'],
    },
    {
      id: 'shsc', label: 'Mesurer la surchauffe et le sous-refroidissement',
      done: (s) => ok(s, 'SH', 'SC'),
      hints: ['Surchauffe = T tube aspiration − T évaporation (rosée). Sous-refroidissement = T condensation (bulle) − T ligne liquide.',
        'Thermomètre sur l\'aspiration près du bulbe, puis sur la ligne liquide en sortie du condenseur.', ['comp.txvBulb', 'joint.condOut']],
    },
    {
      id: 'disconnect', label: 'Transférer le flexible HP vers la BP, isoler la prise BP et déposer les flexibles',
      done: (s) => s.valves.gas === 'back' && !s.hoses.some((h) => h.port && isPort(h.port)),
      hints: ['Ne dévissez jamais un flexible plein de fluide HP : vidangez-le d\'abord vers l\'aspiration, unité en marche.',
        'Fermez la vanne à boule du flexible rouge, ouvrez HP puis BP au manifold, attendez, remettez la vanne gaz en contre-siège arrière, fermez le manifold et déposez les flexibles.', ['valve.gas']],
    },
    {
      id: 'caps', label: 'Remettre bouchons et chapeaux',
      done: (s) => Object.values(s.caps).every(Boolean),
      hints: ['Le bouchon est l\'étanchéité finale de la prise.', 'Outil main : remettez les bouchons des prises et le chapeau de la vanne gaz.', ['port.lp', 'port.hp', 'valve.gas']],
    },
  ],

  answers: [
    { id: 'BP', label: 'BP', unit: 'bar rel', tol: 0.2, expected: (s) => toRel(cy(s).BP) },
    // HP gauge flickers up to −0.65 bar (hose condensing at ambient); ±0.7 ≈ class 1 accuracy of a 50 bar gauge
    { id: 'HP', label: 'HP', unit: 'bar rel', tol: 0.7, expected: (s) => toRel(cy(s).HP) },
    { id: 'Tevap', label: 'T évap', unit: '°C', tol: 1, expected: (s) => cy(s).Tevap },
    { id: 'Tcond', label: 'T cond', unit: '°C', tol: 1, expected: (s) => cy(s).Tcond },
    { id: 'SH', label: 'Surchauffe', unit: 'K', tol: 1, expected: (s) => cy(s).SH },
    { id: 'SC', label: 'Sous-refroid.', unit: 'K', tol: 1, expected: (s) => cy(s).SC },
  ],

  rules: [
    {
      id: 'hose-swap', severity: 'major', skill: 'A1:5.01', lesson: 'saturation',
      message: 'Flexible BP sur une prise HP : le manomètre BP est exposé à la haute pression (hors échelle, risque de casse).',
      when: ({ a, s }) => a.type === 'connectHose' && (a.socket === 'port.hp' || a.socket === 'port.liq')
        && s.hoses.some((h) => h.id === a.hose && (h.color === 'blue' || h.manifold === 'mf.lp')),
    },
    {
      id: 'open-manifold-both', severity: 'major', skill: 'A1:5.01', lesson: 'circuit',
      message: 'Vannes BP et HP du manifold ouvertes, unité en marche : vous court-circuitez la HP vers l\'aspiration (gaz chaud au compresseur).',
      when: ({ prev, s }) => bypass(s) && !bypass(prev),
    },
    {
      id: 'front-seat', severity: 'critical', skill: 'A1:6.04', lesson: 'circuit',
      message: 'Vanne gaz en contre-siège avant compresseur en marche : l\'aspiration est fermée, le compresseur tire au vide.',
      when: ({ a, prev }) => a.type === 'setServiceValve' && a.valve === 'valve.gas' && a.pos === 'front' && prev.running,
    },
    {
      id: 'vent-hose', severity: 'major', skill: 'A1:5.01', lesson: 'saturation',
      message: 'Flexible déposé plein de fluide : plus de 5 g rejetés. Vidangez le flexible HP vers la BP avant de le déposer.',
      when: ({ a, s }) => (a.type === 'disconnectHose' || a.type === 'finish') && s.lastVentG > 5,
    },
    {
      id: 'no-caps', severity: 'minor', skill: 'A1:4.01', lesson: 'etancheite',
      message: 'Bouchons ou chapeaux non remis : ils assurent l\'étanchéité finale des prises et des tiges de vanne.',
      when: ({ a, s }) => a.type === 'finish' && !Object.values(s.caps).every(Boolean),
    },
    {
      id: 'wrong-scale', severity: 'minor', skill: 'A1:1.03', lesson: 'saturation',
      message: 'Températures lues sur l\'échelle d\'un autre fluide : chaque fluide a sa propre relation pression/température.',
      when: ({ a, s }) => a.type === 'answer' && TEMPS.includes(a.field) && s.manifold.scale !== s.fluid,
    },
    {
      id: 'bubble-dew', severity: 'minor', skill: 'A1:1.02', lesson: 'saturation',
      message: 'Glissement : la température d\'évaporation se lit en rosée, celle de condensation en bulle.',
      when: ({ a, s }) => {
        if (a.type !== 'answer' || !s.cycle) return false;
        const { BP, HP, Tevap, Tcond } = s.cycle;
        if (a.field === 'Tevap') return Math.abs(a.value - tsat(s.fluid, BP, 'bubble')) <= 1 && Math.abs(a.value - Tevap) > 1;
        if (a.field === 'Tcond') return Math.abs(a.value - tsat(s.fluid, HP, 'dew')) <= 1 && Math.abs(a.value - Tcond) > 1;
        return false;
      },
    },
  ],

  perfectRun() {
    const r2 = (x: number) => Math.round(x * 100) / 100;
    const r1 = (x: number) => Math.round(x * 10) / 10;
    const lp = (s: GameState) => gaugeP(s, 'mf.lp'), hp = (s: GameState) => gaugeP(s, 'mf.hp');
    const temp = (s: GameState, target: 'comp.txvBulb' | 'joint.condOut') => defaultReading(s, { tool: 'thermometer', target })!.value;
    const steps: Step[] = [
      { type: 'inspect', target: 'comp.compressor' },
      { type: 'setScale', fluid: 'R32' },
      { type: 'toggleCap', target: 'port.lp' },
      { type: 'toggleCap', target: 'port.hp' },
      { type: 'toggleCap', target: 'valve.gas' },
      { type: 'connectHose', hose: 'blue', end: 'port', socket: 'port.lp' },
      { type: 'connectHose', hose: 'red', end: 'port', socket: 'port.hp' },
      { type: 'setServiceValve', valve: 'valve.gas', pos: 'mid' },
      { type: 'wait', seconds: 60 },
      (s) => ({ type: 'answer', field: 'BP', value: r2(toRel(lp(s))) }),
      (s) => ({ type: 'answer', field: 'HP', value: r2(toRel(hp(s))) }),
      (s) => ({ type: 'answer', field: 'Tevap', value: r1(tsat(s.manifold.scale, lp(s), 'dew')) }),
      (s) => ({ type: 'answer', field: 'Tcond', value: r1(tsat(s.manifold.scale, hp(s), 'bubble')) }),
      { type: 'measure', tool: 'thermometer', target: 'comp.txvBulb' },
      { type: 'measure', tool: 'thermometer', target: 'joint.condOut' },
      (s) => ({ type: 'answer', field: 'SH', value: r1(temp(s, 'comp.txvBulb') - tsat(s.fluid, lp(s), 'dew')) }),
      (s) => ({ type: 'answer', field: 'SC', value: r1(tsat(s.fluid, hp(s), 'bubble') - temp(s, 'joint.condOut')) }),
      { type: 'toggleHoseValve', hose: 'red' },
      { type: 'toggleManifold', valve: 'hp' },
      { type: 'toggleManifold', valve: 'lp' },
      { type: 'wait', seconds: 30 },
      { type: 'setServiceValve', valve: 'valve.gas', pos: 'back' },
      { type: 'toggleManifold', valve: 'hp' },
      { type: 'toggleManifold', valve: 'lp' },
      { type: 'disconnectHose', hose: 'blue', end: 'port' },
      { type: 'disconnectHose', hose: 'red', end: 'port' },
      { type: 'toggleCap', target: 'valve.gas' },
      { type: 'toggleCap', target: 'port.lp' },
      { type: 'toggleCap', target: 'port.hp' },
      { type: 'finish' },
    ];
    return steps;
  },
};

export default L01;
