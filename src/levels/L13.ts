import { P_ATM } from '../physics/refrigerants';
import { makeVolume } from '../physics/circuit';
import {
  P, SYSTEM_IDS, closeSection, concentration, detectorWorks, gasDetector, gasMass, gasReading, hoseAt, hoseVol,
  jointVolume, makePlatine, makeRoom, openSection, torchIgnition,
} from '../game/platineModel';
import { fmt, isPort, refuse, result } from '../game/engine';
import type { JointId, TargetId } from '../game/sceneIds';
import type { Action, GameState, IgnitionSource, Level, Step, Tier } from '../game/types';

const LFL = 0.038; // kg/m³, R290
const ROOM_M3 = 18;
const VAC_ABS = 0.03; // bar abs reached by the A3 vacuum pump during the purge
const LOW_BATTERY_S = 300; // a low battery dies after 5 min of use
const SYS = SYSTEM_IDS;
const OPEN = ['comp', 'hp'];
const JOINTS: JointId[] = ['joint.compSuction', 'joint.compDischarge'];

const SOURCES: IgnitionSource[] = [
  { id: 'heater', label: 'Radiateur électrique soufflant posé au sol (thermostat à contact)', active: true, level: 'floor' },
  { id: 'socket', label: 'Prise de courant au sol avec rallonge (vitrine voisine branchée)', active: true, level: 'floor' },
  { id: 'switch', label: 'Interrupteur d\'éclairage (étincelle à la manœuvre)', active: true, level: 'head' },
  { id: 'smoker', label: 'Client qui fume à l\'entrée de la réserve', active: true, level: 'head' },
];
const CHARGER: IgnitionSource = { id: 'charger', label: 'Chargeur de téléphone d\'un client branché sur la prise au ras du sol, derrière la platine', active: true, level: 'floor' };

// IEC 60335-2-40 comfort AC limit (à vérifier): m_max = 2.5 × LFL^1.25 × h0 × √A
interface Q { what: string; kg: number; h0: number; A: number }
const QUESTIONS: Q[] = [
  { what: 'split R290 de 0,4 kg, unité intérieure murale (h₀ = 1,8 m), chambre de 12 m²', kg: 0.4, h0: 1.8, A: 12 },
  { what: 'console R290 de 0,3 kg posée au sol (h₀ = 0,6 m), séjour de 20 m²', kg: 0.3, h0: 0.6, A: 20 },
  { what: 'cassette R290 de 0,3 kg au plafond (h₀ = 2,2 m), bureau de 25 m²', kg: 0.3, h0: 2.2, A: 25 },
  { what: 'split R290 de 0,25 kg, unité murale (h₀ = 1,8 m), salon de 30 m²', kg: 0.25, h0: 1.8, A: 30 },
];
const q = (s: GameState) => QUESTIONS[s.vars.q as number];
const mMax = (x: Q) => 2.5 * LFL ** 1.25 * x.h0 * Math.sqrt(x.A);
const ALLOWED = ['Oui : charge ≤ m_max', 'Non : charge > m_max'];

const v = (s: GameState, k: string) => !!s.vars[k];
const ok = (s: GameState, ...ids: string[]) => ids.every((id) => s.answers[id]?.ok);
const exam = (s: GameState) => s.tier === 'examen';
const labelG = (s: GameState) => Math.round(s.plant.nominalCharge * 1000);
const sysP = (s: GameState) => Math.max(...SYS.map((id) => P(s, id)));
const gainedKg = (s: GameState) => (s.vars.cyl ? s.circuit.volumes.cyl.mRef : 0);
const onBoard = (s: GameState) => s.hoses.some((h) => h.port && isPort(h.port));
const onCyl = (s: GameState) => !!(hoseAt(s, 'cyl.gas') || hoseAt(s, 'cyl.liq'));
const consigned = (s: GameState) => s.elec.locked && s.elec.voltageChecked;
const liveSource = (s: GameState) => s.vars.charger === 'hidden' || !!s.ignition?.some((x) => x.active);
const detectorReady = (s: GameState) => detectorWorks(s) && gasDetector(s).position === 'floor' && gasDetector(s).battery === 'ok';
const later = (s: GameState, min: number) => { s.t += min * 60; };
const isWork = (a: { type: string; id?: string; device?: string; on?: boolean }) =>
  (a.type === 'device' && a.device === 'recovery' && a.on) || (a.type === 'custom' && ['cut', 'braze'].includes(a.id!));

// Refrigerant leaving the circuit during the purge: outdoors through the vent hose, or into the room.
function release(s: GameState, kg: number) {
  const e = s.circuit.emitted, r = s.room!;
  if (s.vars.ventOut) r.seen = (r.seen ?? e.ref) + kg; // the room model ignores it
  e.ref += kg;
}
function bleedTo(s: GameState, Pabs: number) {
  let kg = 0;
  for (const id of SYS) {
    const vol = s.circuit.volumes[id], p = P(s, id);
    if (p <= Pabs) continue;
    const keep = Pabs / p;
    kg += vol.mRef * (1 - keep);
    vol.mRef *= keep; vol.mN2 *= keep; vol.mAir *= keep; vol.mH2O *= keep;
  }
  release(s, kg);
}
function vacuumCircuit(s: GameState) {
  for (const id of SYS) Object.assign(s.circuit.volumes[id], { mRef: 0, mN2: 0, mH2O: 0, mAir: gasMass(0.0005, s.circuit.volumes[id].V, 'air', s.plant.Tamb) });
}
function chargeCircuit(s: GameState, kg: number) {
  const sysV = SYS.reduce((n, id) => n + s.circuit.volumes[id].V, 0);
  for (const id of SYS) Object.assign(s.circuit.volumes[id], { mRef: (kg * s.circuit.volumes[id].V) / sysV, mAir: 0, mN2: 0 });
}
const say = (s: GameState, text: string, kind: 'info' | 'bad' = 'info') => {
  s.journal.push({ t: s.t, text, kind: kind === 'bad' ? 'mistake' : 'info' });
  s.toast = { text, kind, n: (s.toast?.n ?? 0) + 1 };
};

// An ignition ends the run whatever the tier, with the matching critical mistake in the debrief.
function blowUp(s: GameState) {
  const e = s.ignitionEvent;
  if (!e || s.finished) return;
  const torch = e.source === 'torch';
  const r = L13.rules.find((x) => x.id === (torch ? 'flame-before-purge' : 'ignition-source'))!;
  if (!s.mistakes.some((m) => m.id === r.id)) {
    s.mistakes.push({ id: r.id, severity: r.severity, message: r.message, skill: r.skill, lesson: r.lesson, t: s.t });
    s.journal.push({ t: s.t, text: `Erreur critique : ${r.message}`, kind: 'mistake' });
  }
  const src = torch ? 'la flamme du chalumeau' : `« ${[...(s.ignition ?? []), CHARGER].find((x) => x.id === e.source)?.label ?? e.source} »`;
  const why = `Inflammation du propane (${Math.round(e.lfl)} % LIE) au contact de ${src} : flash, départ de feu, évacuation du magasin. `
    + 'Personne n\'est blessé, mais l\'intervention s\'arrête là.';
  say(s, why, 'bad');
  s.finished = result(L13, s, why);
}

const L13: Level = {
  id: 'L13',
  title: 'Intervention sur R290 (propane)',
  skills: ['A1:12.01', 'A1:12.02', 'A1:12.03', 'A1:12.04', 'A1:12.05', 'A1:12.06', 'A1:12.07', 'A1:12.08', 'A1:12.09', 'A1:12.10',
    'A1:12.11', 'A1:12.12', 'A1:12.13', 'A1:1.07', 'A1:1.08', 'A1:5.09', 'A1:11.03', 'A1:11.05'],
  lesson: 'hydrocarbures',
  scene: 'PLATINE',
  fluid: 'R290',
  briefing: 'Platine R290 (propane, A3 : très inflammable) installée dans la réserve d\'un magasin ouvert au public — elle tient lieu de la '
    + 'vitrine réfrigérée autonome (« plug-in ») à dépanner. Le compresseur est à remplacer. Évaluez les risques (local, sources d\'inflammation, public, '
    + 'extincteur), équipez-vous (détecteur HC au sol, ventilateur ATEX, matériel A3), récupérez la charge dans une bouteille HC, purgez à '
    + 'l\'azote, vérifiez 0 % LIE au détecteur à l\'ouverture, et seulement ensuite brasez. Essai azote, vide, charge au poids à ± 5 g, contrôle au '
    + 'détecteur et rapport. Mini-défi : limites de charge (LIE R290 = 0,038 kg/m³).',
  tierNotes: {
    guide: 'Mise en sécurité seulement : récupération, purge à l\'azote, contrôle au détecteur (pas de remplacement de composant).',
    standard: 'Remplacement complet du compresseur.',
    examen: 'Remplacement complet. Inspectez vraiment la zone, vérifiez votre détecteur. Question de limite de charge différente. 2 h 30.',
  },
  tools: ['hand', 'wrench', 'gasDetector'],
  timeLimit: 2.5 * 3600,

  setup(tier: Tier, rng) {
    const ex = tier === 'examen';
    const charge = ex ? [0.15, 0.18, 0.2][Math.floor(rng() * 3)] : 0.2;
    const s = makePlatine({
      levelId: 'L13', tier, fluid: 'R290', charge, Tamb: 20, Troom: 20,
      nameplate: `Plaque signalétique : R290 · charge ${Math.round(charge * 1000)} g · PS HP 25 bar / BP 15 bar · 230 V 50 Hz`,
      hoses: [
        { id: 'blue', color: 'blue', manifold: 'mf.lp', port: null, valve: true },
        { id: 'red', color: 'red', manifold: 'mf.hp', port: null, valve: true },
        { id: 'yellow', color: 'yellow', manifold: 'mf.center', port: null, valve: false },
        { id: 'rec', color: 'yellow', manifold: null, port: null, valve: true },
      ],
      bench: { recovery: { on: false, speed: 0.5, cutoff: 0.7 } },
      volumes: [makeVolume('cyl', 12, { T: 20 })],
    });
    s.room = makeRoom(ROOM_M3, 0.5, 15);
    s.ignition = SOURCES.map((x) => ({ ...x }));
    s.gasDetector = { on: false, position: 'head', battery: ex ? 'low' : 'ok' };
    s.vars = { q: ex ? 1 + Math.floor(rng() * 3) : 0, purgeN: 0, cyl: '', station: '', ...(ex ? { charger: 'hidden', lowOn: 0 } : {}) };
    return s;
  },

  objectives: [
    {
      id: 'assess', label: 'Analyse de risques : local, sources d\'inflammation, balisage, extincteur',
      done: (s) => v(s, 'aRoom') && v(s, 'aZone') && v(s, 'aSign') && v(s, 'aExt'),
      hints: ['Avant tout : quel volume, quelle ventilation, quelles sources d\'inflammation à moins de 3 m, du public ?',
        'Les quatre commandes « Analyse » : local, inspection de la zone, balisage, extincteur.'],
    },
    {
      id: 'detector', label: 'Détecteur HC en marche, posé au sol, piles bonnes : relevé initial 0 % LIE',
      done: (s) => detectorReady(s) && v(s, 'ambient'),
      hints: ['Le propane est 1,5 fois plus lourd que l\'air : il s\'accumule au ras du sol.',
        'Section « Sécurité fluide inflammable » : détecteur en marche, position « au sol » (« Remplacer les piles » si elles sont faibles), '
        + 'puis prenez l\'outil « Détecteur de gaz HC » et cliquez la platine.',
        ['joint.compSuction']],
    },
    {
      id: 'fan', label: 'Ventilateur ATEX en marche',
      done: (s) => !!s.room?.fan?.on,
      hints: ['Diluer et évacuer toute fuite avant qu\'elle n\'atteigne la LIE.', 'Section « Sécurité fluide inflammable » : bouton « Ventilateur ATEX » en marche.'],
    },
    {
      id: 'sources', label: 'Couper / retirer toutes les sources d\'inflammation de la zone',
      done: (s) => !liveSource(s),
      hints: ['Prises, interrupteurs, radiateur, cigarette… et ce qui ne se voit pas au premier coup d\'œil.',
        'Liste « Sources d\'inflammation » : « Couper / retirer » chacune. L\'inspection de la zone (commande « Analyse ») peut en révéler d\'autres.'],
    },
    {
      id: 'lockout', label: 'Consigner la platine (sectionneur hors zone cadenassé, VAT)',
      done: consigned,
      hints: ['On débranche / sépare hors de la zone, jamais une fiche sous charge dans la zone.', 'Coffret électrique (outil main) : « Consigner (cadenas) » puis « Vérifier la tension (VAT) ».', ['comp.elecBox']],
    },
    {
      id: 'equipment', label: 'Choisir la bouteille de récupération et la station adaptées au R290',
      done: (s) => s.vars.cyl === 'hc' && s.vars.station === 'a3',
      hints: ['Fluide inflammable : bouteille dédiée HC, matériel sans étincelle.',
        'Bouteille « HC » (bande rouge, étiquette inflammable) et station + pompe à vide certifiées A3.'],
    },
    {
      id: 'recover', label: 'Récupérer la charge jusqu\'à la coupure, fermer la bouteille et déposer les flexibles',
      done: (s) => gainedKg(s) > 0.05 && sysP(s) <= P_ATM && !s.bench.recovery!.on && !s.bench.cylinder?.gas && !onBoard(s) && !onCyl(s),
      hints: ['Comme une récupération classique : liquide d\'abord, puis vapeur des deux côtés.',
        'Rouge → prise liquide, bleu → prise BP, jaune → station (entrée) vanne ouverte, flexible « rec » : station (sortie) → vanne gaz bouteille. '
        + 'Ouvrez la bouteille, HP puis BP au manifold (vanne gaz milieu), station en marche jusqu\'à la coupure (manomètres stabilisés vers −0,3 bar), puis arrêt, bouteille fermée, flexibles déposés.',
        ['port.liq', 'port.lp', 'valve.gas']],
    },
    {
      id: 'purge', label: 'Purger à l\'azote (OFN) : au moins 2 cycles pressurisation / évent, évent à l\'extérieur',
      done: (s) => (s.vars.purgeN as number) >= 2,
      hints: ['Il reste du propane gazeux (et dissous dans l\'huile) après la récupération.',
        'Évent dehors, puis : tirage au vide (pompe A3) → azote ≈ 3 bar → évent, deux fois. Sans vide, comptez 4 à 5 cycles.'],
    },
    {
      id: 'inert', label: 'Ouvrir le circuit, détecteur à l\'ouverture : 0 % LIE',
      done: (s) => s.opened.length > 0 && v(s, 'inert'),
      hints: ['On ne fait confiance qu\'à la mesure.', '« Ouvrir le circuit » (coupe-tube), puis cliquez la brasure d\'aspiration du compresseur avec le détecteur.',
        ['joint.compSuction']],
    },
    {
      id: 'replace', label: 'Déposer le compresseur, poser le neuf', tiers: ['standard', 'examen'],
      done: (s) => v(s, 'mounted'),
      hints: ['Compresseur neuf identique (R290, même huile).', 'Commandes « Déposer le compresseur » puis « Poser le compresseur neuf ».'],
    },
    {
      id: 'braze', label: 'Braser sous balayage d\'azote', tiers: ['standard', 'examen'],
      done: (s) => v(s, 'brazed'),
      hints: ['Flamme seulement après le 0 % LIE confirmé.', 'Commande « Braser les raccords ».'],
    },
    {
      id: 'n2test', label: 'Essai de pression à l\'azote', tiers: ['standard', 'examen'],
      done: (s) => v(s, 'n2Test'),
      hints: ['Toute brasure neuve s\'éprouve.', 'Commande « Essai de pression à l\'azote ».'],
    },
    {
      id: 'vacuum', label: 'Tirage au vide et essai de vide', tiers: ['standard', 'examen'],
      done: (s) => v(s, 'vacuum'),
      hints: ['Pompe à vide A3.', 'Commande « Tirage au vide ».'],
    },
    {
      id: 'charge', label: 'Charger au poids la masse de la plaque (± 5 g)', tiers: ['standard', 'examen'],
      done: (s) => v(s, 'charged') && Math.abs((s.vars.chargedG as number) - labelG(s)) <= 5,
      hints: ['Petite charge : 10 g de trop, c\'est 5 % — et du propane en plus dans le local.', 'Inspectez le compresseur (plaque), puis « Charger au poids » en grammes.',
        ['comp.compressor']],
    },
    {
      id: 'leakcheck', label: 'Contrôle d\'étanchéité direct au détecteur sur les brasures neuves', tiers: ['standard', 'examen'],
      done: (s) => JOINTS.every((j) => v(s, `lc:${j}`)),
      hints: ['Détecteur HC électronique, sonde au plus près des brasures.', 'Cliquez les brasures aspiration et refoulement du compresseur avec le détecteur.', JOINTS],
    },
    {
      id: 'limits', label: 'Mini-défi : limites de charge (1.08, 12.03)',
      done: (s) => ok(s, exam(s) ? 'm2' : 'm1', 'mmax', 'allowed'),
      hints: ['Seuils EN 378 : m₁ = 4 m³ × LIE, m₂ = 26 m³ × LIE, m₃ = 130 m³ × LIE.',
        'Lisez l\'énoncé (commande « Mini-défi »). m_max = 2,5 × 0,038^1,25 × h₀ × √A ; comparez à la charge de l\'appareil.'],
    },
    {
      id: 'report', label: 'Rapport d\'intervention (étiquette maintenue)',
      done: (s) => v(s, 'report'),
      hints: ['Fluide, masse récupérée, purge, contrôle, charge.', 'Commande « Rédiger le rapport d\'intervention ».'],
    },
  ],

  answers: [
    { id: 'm1', label: 'm₁ = 4 m³ × LIE', unit: 'kg', tol: 0.002, expected: () => 4 * LFL, tiers: ['guide', 'standard'] },
    { id: 'm2', label: 'm₂ = 26 m³ × LIE', unit: 'kg', tol: 0.005, expected: () => 26 * LFL, tiers: ['examen'] },
    { id: 'mmax', label: 'm_max (IEC 60335-2-40, à vérifier)', unit: 'kg', tol: { rel: 0.03 }, expected: (s) => mMax(q(s)) },
    { id: 'allowed', label: 'Installation possible ?', unit: '', tol: 0, expected: (s) => (q(s).kg <= mMax(q(s)) ? 0 : 1), choices: ALLOWED },
  ],

  actions: [
    { id: 'aRoom', label: 'Analyse : volume et ventilation du local' },
    { id: 'aZone', label: 'Analyse : inspecter la zone (≈ 3 m autour de la platine)' },
    { id: 'aSign', label: 'Baliser la zone, éloigner le public (panneau « flamme interdite »)' },
    { id: 'aExt', label: 'Placer l\'extincteur CO₂ / poudre à portée de main' },
    { id: 'cyl-hc', label: 'Bouteille de récupération HC (bande rouge, étiquette « inflammable »)', visible: (s) => gainedKg(s) < 0.001 },
    { id: 'cyl-hfc', label: 'Bouteille de récupération HFC de l\'atelier (vide)', visible: (s) => gainedKg(s) < 0.001 },
    { id: 'station-a3', label: 'Station de récupération et pompe à vide certifiées A3 (sans étincelle)', visible: (s) => !s.bench.recovery!.on },
    { id: 'station-std', label: 'Station de récupération et pompe à vide standard de l\'atelier', visible: (s) => !s.bench.recovery!.on },
    { id: 'vent-out', label: (s) => (v(s, 'ventOut') ? 'Rentrer le flexible d\'évent' : 'Flexible d\'évent / refoulement de pompe à l\'extérieur') },
    { id: 'evacuate', label: `Purge : tirage au vide (pompe A3, ≈ ${fmt(VAC_ABS * 1000, 0)} mbar)`, visible: (s) => s.done.includes('recover') && !v(s, 'brazed') },
    { id: 'n2-fill', label: 'Purge : pressuriser à l\'azote (OFN)', input: { unit: 'bar', min: 0.5, max: 10, step: 0.5 }, visible: (s) => s.done.includes('recover') && !v(s, 'brazed') },
    { id: 'n2-vent', label: 'Purge : détendre l\'azote à 0 bar rel (évent)', visible: (s) => s.done.includes('recover') && !v(s, 'brazed') },
    { id: 'cut', label: (s) => (s.tier === 'guide' ? 'Ouvrir le circuit : couper le tube de process (coupe-tube)' : 'Ouvrir le circuit : couper les tubes du compresseur (coupe-tube)'), visible: (s) => !s.opened.length && !v(s, 'brazed') },
    { id: 'remove', label: 'Déposer le compresseur', visible: (s) => s.tier !== 'guide' && s.opened.length > 0 && !v(s, 'removed') },
    { id: 'mount', label: 'Poser le compresseur neuf (R290, même huile)', visible: (s) => v(s, 'removed') && !v(s, 'mounted') },
    { id: 'braze', label: 'Braser les raccords (balayage d\'azote)', visible: (s) => v(s, 'mounted') && !v(s, 'brazed') },
    { id: 'n2', label: 'Essai de pression à l\'azote (brasures neuves)', visible: (s) => v(s, 'brazed') && !v(s, 'n2Test') },
    { id: 'vac', label: 'Tirage au vide et essai de vide (pompe A3)', visible: (s) => v(s, 'n2Test') && !v(s, 'vacuum') },
    { id: 'charge', label: 'Charger au poids (bouteille R290 sur balance)', input: { unit: 'g', min: 0, max: 500, step: 1 }, visible: (s) => v(s, 'vacuum') },
    { id: 'limits-q', label: (s) => `Mini-défi : ${q(s).what}` },
    { id: 'report', label: 'Rédiger le rapport d\'intervention' },
  ],

  onAction(s, a) {
    if (a.type === 'device' && a.device === 'recovery' && a.on) {
      if (!s.vars.cyl) refuse('Choisissez d\'abord la bouteille de récupération.');
      if (!s.vars.station) refuse('Choisissez d\'abord la station de récupération.');
    }
    if (a.type === 'measure' && a.tool === 'gasDetector') {
      const r = gasReading(s, a.target).value, zero = r < 0.5;
      if (detectorReady(s) && zero && !s.done.includes('recover')) s.vars.ambient = true;
      const vol = jointVolume(a.target as JointId);
      if (vol && s.opened.includes(vol)) s.vars.inert = zero;
      if (v(s, 'charged') && JOINTS.includes(a.target as JointId) && zero) s.vars[`lc:${a.target}`] = true;
      return `Détecteur ${gasDetector(s).position === 'floor' ? 'au sol' : 'à hauteur de tête'} : ${fmt(Math.min(100, r), 0)} % LIE`;
    }
    if (a.type !== 'custom') return;
    const need = (cond: boolean, msg: string) => { if (!cond) refuse(msg); };
    const purgeReady = () => need(s.done.includes('recover'), 'Récupérez d\'abord la charge (station arrêtée, bouteille fermée, flexibles déposés).');
    switch (a.id) {
      case 'aRoom':
        s.vars.aRoom = true;
        return `Local : réserve 3 × 2,4 m, h 2,5 m = ${ROOM_M3} m³, une porte, pas de VMC (≈ 0,5 vol/h). Le propane descend : `
          + `${labelG(s)} g répartis dans les 50 cm au-dessus du sol (${fmt(0.2 * ROOM_M3)} m³) dépassent la LIE (${fmt(LFL, 3)} kg/m³).`;
      case 'aZone': {
        s.vars.aZone = true;
        if (s.vars.charger === 'hidden') { s.vars.charger = 'found'; s.ignition!.push({ ...CHARGER }); }
        return `Zone de 3 m : ${s.ignition!.map((x) => `${x.label}${x.active ? '' : ' (coupé)'}`).join(' · ')}. Public : clients en rayon, accès à la réserve ouvert.`;
      }
      case 'aSign':
        s.vars.aSign = true;
        return 'Zone balisée (rubalise, panneaux « zone d\'intervention — flamme interdite, ne pas fumer »), public tenu hors zone';
      case 'aExt':
        s.vars.aExt = true;
        return 'Extincteur CO₂ 2 kg posé à portée, hors du passage';
      case 'cyl-hc': case 'cyl-hfc': {
        need(!onCyl(s), 'Un flexible est raccordé à la bouteille : déposez-le d\'abord.');
        const hc = a.id === 'cyl-hc';
        s.vars.cyl = hc ? 'hc' : 'hfc';
        s.bench.cylinder = { label: hc ? 'Récupération HC (R290/R600a) 12 L — bande rouge' : 'Récupération HFC 12 L', gas: false, liq: false, tare: 7.6 };
        Object.assign(s.circuit.volumes.cyl, { mRef: 0, mAir: 0, mN2: 0, mH2O: 0, T: s.plant.Tamb, Tdrive: s.plant.Tamb + 3 });
        return hc ? 'Bouteille de récupération HC sur le banc (bande rouge, étiquette « gaz inflammable »), vide, épreuve valide'
          : 'Bouteille de récupération HFC sur le banc, vide';
      }
      case 'station-a3': case 'station-std':
        s.vars.station = a.id === 'station-a3' ? 'a3' : 'std';
        return a.id === 'station-a3' ? 'Station de récupération et pompe à vide certifiées A3 (moteur sans balais, contacts étanches)'
          : 'Station de récupération et pompe à vide standard (interrupteur et pressostat à contacts ouverts)';
      case 'vent-out':
        s.vars.ventOut = !v(s, 'ventOut');
        return s.vars.ventOut ? 'Flexible d\'évent passé à l\'extérieur, extrémité dégagée de toute source' : 'Flexible d\'évent rentré dans le local';
      case 'evacuate':
        purgeReady();
        need(!s.opened.length, 'Circuit ouvert : on ne tire pas au vide un circuit ouvert.');
        bleedTo(s, VAC_ABS);
        later(s, 5);
        return `Purge : tirage au vide à ${fmt(VAC_ABS * 1000, 0)} mbar (refoulement de la pompe ${v(s, 'ventOut') ? 'dehors' : 'dans le local'})`;
      case 'n2-fill': {
        purgeReady();
        need(!v(s, 'removed'), 'Compresseur déposé : posez le neuf avant toute pressurisation.');
        const bar = Number(a.value);
        need(bar > 0 && bar <= 10, 'Pression de purge : 0,5 à 10 bar rel.');
        if (s.opened.length) { closeSection(s, s.opened); s.vars.inert = false; }
        for (const id of SYS) {
          const vol = s.circuit.volumes[id], add = bar + P_ATM - P(s, id);
          if (add > 0) vol.mN2 += gasMass(add, vol.V, 'n2', s.plant.Tamb);
        }
        s.vars.filled = true;
        later(s, 1);
        return `Purge : azote sec (OFN) jusqu'à ${fmt(bar)} bar rel`;
      }
      case 'n2-vent':
        purgeReady();
        need(sysP(s) > P_ATM + 0.1, 'Circuit déjà à la pression atmosphérique (ou sous vide).');
        bleedTo(s, P_ATM);
        if (v(s, 'filled')) { s.vars.purgeN = (s.vars.purgeN as number) + 1; s.vars.filled = false; }
        later(s, 1);
        return `Purge n°${s.vars.purgeN} : azote détendu à 0 bar rel, évent ${v(s, 'ventOut') ? 'à l\'extérieur' : 'DANS LE LOCAL'}`;
      case 'cut': {
        need(!s.opened.length, 'Circuit déjà ouvert.');
        const p = sysP(s) - P_ATM;
        need(p <= 0.5, 'Le circuit est sous pression : récupérez / détendez avant d\'ouvrir.');
        need(p >= -0.05, 'Circuit sous vide : cassez le vide à l\'azote avant d\'ouvrir (sinon l\'air humide entre).');
        openSection(s, OPEN);
        s.vars.inert = false;
        return s.tier === 'guide' ? 'Tube de process coupé : circuit ouvert' : 'Tubes d\'aspiration et de refoulement coupés au coupe-tube : circuit ouvert';
      }
      case 'remove':
        need(s.opened.length > 0, 'Ouvrez d\'abord le circuit.');
        s.vars.removed = true;
        later(s, 10);
        return 'Compresseur débranché et déposé, tubes obturés provisoirement';
      case 'mount':
        need(v(s, 'removed'), 'Déposez d\'abord l\'ancien compresseur.');
        s.vars.mounted = true;
        later(s, 10);
        return 'Compresseur neuf R290 en place (plots neufs, tubes sans contrainte)';
      case 'braze': {
        need(v(s, 'mounted'), 'Posez d\'abord le compresseur neuf.');
        if (JOINTS.some((j) => torchIgnition(s, j))) { blowUp(s); return 'Chalumeau allumé'; }
        closeSection(s, s.opened);
        s.vars.brazed = true;
        later(s, 10);
        return 'Raccords brasés sous balayage d\'azote, circuit refermé';
      }
      case 'n2':
        need(v(s, 'brazed'), 'Brasez d\'abord.');
        s.vars.n2Test = true;
        later(s, 15);
        return 'Essai azote : 15 min sous pression, pas de chute, brasures contrôlées au produit moussant : étanche. Azote évacué dehors.';
      case 'vac':
        need(v(s, 'n2Test'), 'Faites d\'abord l\'essai azote.');
        vacuumCircuit(s);
        s.vars.vacuum = true;
        later(s, 30);
        return 'Tirage au vide < 2 mbar, essai de remontée 15 min : stable';
      case 'charge': {
        need(v(s, 'vacuum'), 'Tirez d\'abord au vide.');
        const g = Math.round(Number(a.value));
        need(g > 0, 'Masse à charger en grammes.');
        chargeCircuit(s, g / 1000);
        s.vars.charged = true;
        s.vars.chargedG = g;
        later(s, 5);
        return `Charge au poids : ${g} g de R290 en phase liquide (plaque : ${labelG(s)} g)`;
      }
      case 'limits-q': {
        const x = q(s), m = exam(s) ? 'm₂ = 26 m³ × LIE' : 'm₁ = 4 m³ × LIE';
        return `Mini-défi (LIE R290 = ${fmt(LFL, 3)} kg/m³) : 1) calculez ${m}. 2) ${x.what} : calculez m_max = 2,5 × LIE^1,25 × h₀ × √A `
          + '(IEC 60335-2-40, valeurs à vérifier) et dites si l\'installation est possible.';
      }
      case 'report': {
        const work = s.tier === 'guide' ? v(s, 'inert') : v(s, 'charged') && JOINTS.every((j) => v(s, `lc:${j}`));
        need(work, 'Terminez l\'intervention avant de rédiger le rapport.');
        s.vars.report = true;
        return `Rapport : R290, ${fmt(gainedKg(s) * 1000, 0)} g récupérés (bouteille HC), ${s.vars.purgeN} cycles de purge OFN, 0 % LIE à l'ouverture`
          + (s.tier === 'guide' ? '' : `, compresseur remplacé, essai azote et vide OK, ${s.vars.chargedG} g chargés, contrôle au détecteur négatif`)
          + '. Étiquette « R290 — inflammable » maintenue.';
      }
    }
  },

  onTick(s, dt) {
    for (const h of s.hoses) s.circuit.volumes[hoseVol(h)].Tdrive = h.manifold === 'rec.out' || h.port === 'rec.out' ? s.plant.Tamb + 13 : null;
    if (s.vars.charger === 'hidden' && !s.ignitionEvent && concentration(s, 'floor') >= 100)
      s.ignitionEvent = { t: s.t, source: 'charger', lfl: concentration(s, 'floor') };
    const d = s.gasDetector;
    if (d?.on && d.battery === 'low') {
      s.vars.lowOn = ((s.vars.lowOn as number) || 0) + dt;
      if ((s.vars.lowOn as number) > LOW_BATTERY_S) {
        d.battery = 'empty'; d.on = false;
        say(s, 'Détecteur de gaz : piles vides, l\'appareil s\'éteint !', 'bad');
      }
    }
    blowUp(s);
  },

  inspect(s, target: TargetId) {
    if (target === 'comp.compressor')
      return `${s.nameplate}. Étiquette « R290 — gaz inflammable A3 ». ${v(s, 'mounted') ? 'Compresseur neuf posé.' : v(s, 'removed') ? 'Compresseur déposé.' : 'Compresseur HS (bloqué).'}`;
    return undefined;
  },

  rules: [
    {
      id: 'ignition-source', severity: 'critical', skill: 'A1:12.04', lesson: 'hydrocarbures',
      message: 'Source d\'inflammation active dans la zone de travail (prise, interrupteur, radiateur, cigarette, chargeur…) : un nuage de propane '
        + 'au ras du sol au-dessus de la LIE s\'enflamme au contact. Coupez, retirez ou éloignez toutes les sources avant d\'intervenir.',
      when: ({ prev, s, a }) => (!prev.ignitionEvent && !!s.ignitionEvent && s.ignitionEvent.source !== 'torch') || (isWork(a) && liveSource(s)),
    },
    {
      id: 'flame-before-purge', severity: 'critical', skill: 'A1:12.07', lesson: 'hydrocarbures',
      message: 'Chalumeau allumé avant d\'avoir confirmé 0 % LIE au détecteur à l\'ouverture après la purge à l\'azote : le propane résiduel '
        + '(tubes, huile) s\'enflamme. Purgez à l\'OFN, mesurez, puis seulement brasez.',
      when: ({ a, s }) => a.type === 'custom' && a.id === 'braze' && (!v(s, 'inert') || s.ignitionEvent?.source === 'torch'),
    },
    {
      id: 'no-detector', severity: 'critical', skill: 'A1:12.13', lesson: 'hydrocarbures',
      message: 'Circuit ouvert (ou flamme) sans détecteur HC en marche : une fuite de propane est invisible et inodore à faible dose.',
      when: ({ a, s }) => a.type === 'custom' && (a.id === 'cut' || a.id === 'braze') && !detectorWorks(s),
    },
    {
      id: 'non-atex-tools', severity: 'major', skill: 'A1:12.02', lesson: 'hydrocarbures',
      message: 'Station / pompe à vide standard : leurs interrupteurs et pressostats font des étincelles. Avec un HC, matériel certifié A3 uniquement.',
      when: ({ a, s }) => s.vars.station === 'std' && ((a.type === 'device' && a.device === 'recovery' && a.on) || (a.type === 'custom' && a.id === 'evacuate')),
    },
    {
      id: 'hc-into-hfc-cylinder', severity: 'critical', skill: 'A1:12.01', lesson: 'hydrocarbures',
      message: 'R290 récupéré dans une bouteille HFC : mélange inflammable mal étiqueté, dangereux pour tous ceux qui la manipuleront ensuite.',
      when: ({ s }) => s.vars.cyl === 'hfc' && gainedKg(s) > 0.005,
    },
    {
      id: 'charge-error', severity: 'major', skill: 'A1:12.10', lesson: 'hydrocarbures',
      message: 'Charge différente de la plaque de plus de 5 g : sur une petite charge HC, l\'écart dégrade le fonctionnement et une surcharge augmente le risque.',
      when: ({ a, s }) => a.type === 'custom' && a.id === 'charge' && Math.abs((s.vars.chargedG as number) - labelG(s)) > 5,
    },
    {
      id: 'detector-high', severity: 'minor', skill: 'A1:12.13', lesson: 'hydrocarbures',
      message: 'Détecteur à hauteur de tête à l\'ouverture : le propane, plus lourd que l\'air, s\'accumule au sol où il ne le voit pas.',
      when: ({ a, s }) => a.type === 'custom' && a.id === 'cut' && detectorWorks(s) && gasDetector(s).position === 'head',
    },
  ],

  perfectRun(tier) {
    const c = (id: string, value?: number): Action => ({ type: 'custom', id, value });
    const full = tier !== 'guide';
    const steps: Step[] = [
      c('aRoom'), c('aZone'), c('aSign'), c('aExt'),
      ...(tier === 'examen' ? [{ type: 'setGasDetector', battery: 'ok' } as Action] : []),
      { type: 'setGasDetector', on: true, position: 'floor' },
      { type: 'measure', tool: 'gasDetector', target: 'joint.compSuction' },
      { type: 'setRoomFan', on: true },
      ...[...SOURCES, ...(tier === 'examen' ? [CHARGER] : [])].map((x): Action => ({ type: 'setIgnition', id: x.id, active: false })),
      { type: 'lockout' }, { type: 'checkVoltage' },
      c('cyl-hc'), c('station-a3'),
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
      { type: 'setServiceValve', valve: 'valve.gas', pos: 'mid' },
      { type: 'toggleManifold', valve: 'lp' },
      { type: 'device', device: 'recovery', on: true },
      { type: 'wait', seconds: 480 },
      { type: 'device', device: 'recovery', on: false },
      { type: 'cylValve', valve: 'gas' },
      { type: 'toggleHoseValve', hose: 'rec' },
      { type: 'disconnectHose', hose: 'rec', end: 'port' },
      { type: 'disconnectHose', hose: 'red', end: 'port' },
      { type: 'disconnectHose', hose: 'blue', end: 'port' },
      c('vent-out'),
      c('evacuate'), c('n2-fill', 3), c('n2-vent'),
      c('evacuate'), c('n2-fill', 3), c('n2-vent'),
      { type: 'wait', seconds: 300 },
      c('cut'),
      { type: 'measure', tool: 'gasDetector', target: 'joint.compSuction' },
      ...(full ? [
        c('remove'), c('mount'), c('braze'), c('n2'), c('vac'),
        { type: 'inspect', target: 'comp.compressor' },
        (s: GameState) => c('charge', labelG(s)),
        ...JOINTS.map((target): Action => ({ type: 'measure', tool: 'gasDetector', target })),
      ] as Step[] : []),
      c('limits-q'),
      (s) => ({ type: 'answer', field: exam(s) ? 'm2' : 'm1', value: Math.round((exam(s) ? 26 : 4) * LFL * 1000) / 1000 }),
      (s) => ({ type: 'answer', field: 'mmax', value: Math.round(mMax(q(s)) * 1000) / 1000 }),
      (s) => ({ type: 'answer', field: 'allowed', value: q(s).kg <= mMax(q(s)) ? 0 : 1 }),
      c('report'),
      { type: 'finish' },
    ];
    return steps;
  },
};

export default L13;
