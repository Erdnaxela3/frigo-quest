import { PORTS, TARGET_LABELS, VALVES, type PortId, type TargetId } from './sceneIds';
import type {
  Action, AnswerField, CapId, GameState, Hose, Level, Objective, Reading, Result, RuleAction, Severity, Socket, Step, Tier, ToolId,
} from './types';
import { DT, defaultReading, hoseAt, hoseVol, physicsStep, startUnit, stopUnit, systemRef, vent } from './platineModel';

export const PENALTY: Record<Severity, number> = { minor: 5, major: 15, critical: 40 };
export const HINT_COST: Record<Tier, number | null> = { guide: 0, standard: 5, examen: null };
export const EMISSION_ALLOWANCE_G = 5; // per port disconnection
export const TIERS: { id: Tier; label: string; desc: string }[] = [
  { id: 'guide', label: 'Guidé', desc: 'Checklist visible, indices gratuits, annulation possible' },
  { id: 'standard', label: 'Standard', desc: 'Checklist visible, indice −5 points' },
  { id: 'examen', label: 'Examen', desc: 'Sans checklist ni indice, chronométré, paramètres aléatoires ; erreur critique = échec' },
];
export const SEVERITY_LABEL: Record<Severity, string> = { minor: 'Mineure', major: 'Majeure', critical: 'Critique' };
export const COLOR_FR = { blue: 'bleu', red: 'rouge', yellow: 'jaune' } as const;
export const SOCKET_LABELS: Record<Socket, string> = {
  ...PORTS,
  'mf.lp': 'Manifold, raccord BP', 'mf.hp': 'Manifold, raccord HP', 'mf.center': 'Manifold, raccord central', 'mf.vac': 'Manifold, raccord vide 3/8"',
  pump: 'Pompe à vide', 'rec.in': 'Station de récupération, entrée', 'rec.out': 'Station de récupération, sortie',
  n2: 'Détendeur azote', 'cyl.gas': 'Bouteille, vanne gaz', 'cyl.liq': 'Bouteille, vanne liquide',
};

export class Refusal { constructor(public text: string) {} }
/** Reject an action: state unchanged, the text is shown as a neutral toast. */
export const refuse = (text: string): never => { throw new Refusal(text); };

export const fmt = (v: number, d = 1) => v.toFixed(d).replace('.', ',').replace(/^-(0,?0*)$/, '$1');
export const fmtTime = (t: number) => `${Math.floor(t / 60)} min ${String(Math.floor(t % 60)).padStart(2, '0')} s`;
export const isPort = (x: string): x is PortId => x in PORTS;
const isCap = (x: string): x is CapId => x in PORTS || x in VALVES;
export const hoseName = (h: Hose) => `flexible ${COLOR_FR[h.color]}${h.id !== h.color ? ` (${h.id})` : ''}`;
export const emittedG = (s: GameState) => Math.max(0, s.circuit.emitted.ref - (s.leakedRef ?? 0)) * 1000;
const forTier = <T extends { tiers?: Tier[] }>(xs: T[], tier: Tier) => xs.filter((x) => !x.tiers || x.tiers.includes(tier));
export const objectivesFor = (l: Level, tier: Tier): Objective[] => forTier(l.objectives, tier);
export const answersFor = (l: Level, tier: Tier): AnswerField[] => forTier(l.answers, tier);
export const currentObjective = (l: Level, s: GameState) => objectivesFor(l, s.tier).find((o) => !s.done.includes(o.id));

function getHose(s: GameState, id: string): Hose {
  return s.hoses.find((h) => h.id === id) ?? refuse(`Flexible inconnu : ${id}`);
}

export const scaleGross = (s: GameState) => (s.bench.cylinder ? s.bench.cylinder.tare + s.circuit.volumes.cyl.mRef : 0);

function journal(s: GameState, text: string, kind: 'action' | 'mistake' | 'info' = 'action') {
  if (text) s.journal.push({ t: s.t, text, kind });
}
function toast(s: GameState, text: string, kind: 'info' | 'bad' | 'ok' = 'info') {
  s.toast = { text, kind, n: (s.toast?.n ?? 0) + 1 };
}

export function readingOf(l: Level, s: GameState, p: GameState['probes'][number]): Reading | undefined {
  return l.measure?.(s, p) ?? defaultReading(s, p);
}
export const readings = (l: Level, s: GameState) =>
  s.probes.map((p) => ({ probe: p, r: readingOf(l, s, p) })).filter((x): x is { probe: typeof x.probe; r: Reading } => !!x.r);

function defaultInspect(s: GameState, t: TargetId): string {
  const label = TARGET_LABELS[t];
  if (t === 'comp.compressor' || t === 'comp.elecBox') return s.nameplate;
  if (t === 'comp.sightglass') return `${label} : ${{ clair: 'liquide clair', bulles: 'quelques bulles', mousse: 'mousse', vide: 'vide' }[s.running && s.cycle ? s.cycle.sightGlass : 'clair']}.`;
  if (t === 'valve.gas') return `${label} : ${{ back: 'contre-siège arrière (prise fermée)', mid: 'position milieu (prise ouverte)', front: 'contre-siège avant (ligne fermée)' }[s.valves.gas]}, chapeau ${s.caps[t] ? 'en place' : 'retiré'}.`;
  if (t === 'valve.liquid') return `${label} : ${s.valves.liquid === 'open' ? 'ouverte' : 'fermée'}, chapeau ${s.caps[t] ? 'en place' : 'retiré'}.`;
  if (isPort(t)) {
    const h = hoseAt(s, t);
    return `${label} : ${h ? `${hoseName(h)} raccordé` : s.caps[t] ? 'bouchon en place' : 'bouchon retiré'}.`;
  }
  if (t.startsWith('joint.')) return `${label} : ${s.oilStains.includes(t as never) ? 'trace d\'huile !' : 'propre, rien d\'anormal.'}`;
  return `${label} : rien d'anormal.`;
}

function advance(l: Level, s: GameState, dt: number) {
  const n = Math.max(1, Math.round(dt / DT)), h = dt / n;
  for (let i = 0; i < n; i++) {
    const msg = physicsStep(s, h);
    if (msg) { journal(s, msg, 'info'); toast(s, msg); }
    l.onTick?.(s, h);
  }
}

function apply(l: Level, s: GameState, a: Action): string {
  switch (a.type) {
    case 'pickTool': s.tool = a.tool; return '';
    case 'toggleCap': {
      const on = !s.caps[a.target];
      if (on && isPort(a.target) && hoseAt(s, a.target)) refuse('Un flexible est raccordé : déposez-le avant de remettre le bouchon.');
      s.caps[a.target] = on;
      return `${on ? 'Bouchon remis' : 'Bouchon retiré'} : ${TARGET_LABELS[a.target]}`;
    }
    case 'connectHose': {
      const h = getHose(s, a.hose);
      if (h[a.end]) refuse(`Cette extrémité du ${hoseName(h)} est déjà raccordée.`);
      if (hoseAt(s, a.socket)) refuse(`${SOCKET_LABELS[a.socket]} : raccord déjà occupé.`);
      if (isPort(a.socket)) {
        if (a.end !== 'port') refuse('Sur une prise Schrader, utilisez l\'extrémité du flexible munie du poussoir.');
        if (s.caps[a.socket]) refuse('Bouchon en place : retirez-le d\'abord (outil main).');
      }
      const bench = s.bench;
      const missing = (a.socket === 'pump' && !bench.pump) || (a.socket.startsWith('rec.') && !bench.recovery)
        || (a.socket === 'n2' && !bench.n2) || (a.socket.startsWith('cyl.') && !bench.cylinder)
        || (a.socket === 'mf.vac' && !s.manifold.fourWay);
      if (missing) refuse(`${SOCKET_LABELS[a.socket]} : pas disponible ici.`);
      h[a.end] = a.socket;
      return `${hoseName(h)} raccordé sur ${SOCKET_LABELS[a.socket]}`;
    }
    case 'disconnectHose': {
      const h = getHose(s, a.hose), sock = h[a.end];
      if (!sock) refuse('Cette extrémité est déjà libre.');
      if (isPort(sock!) && s.cores[sock]) refuse('Obus retiré : remettez l\'obus avant de déposer le flexible.');
      h[a.end] = null;
      // a freed plain end, or a depressor end with its ball valve open, lets the hose content out
      s.lastVentG = a.end === 'manifold' || h.valve ? vent(s.circuit, hoseVol(h)) : 0;
      if (isPort(sock!)) s.disconnects++;
      return `${hoseName(h)} déposé de ${SOCKET_LABELS[sock!]}${s.lastVentG >= 0.5 ? ` : ${fmt(s.lastVentG)} g de fluide rejetés` : ''}`;
    }
    case 'toggleHoseValve': {
      const h = getHose(s, a.hose);
      h.valve = !h.valve;
      return `Vanne à boule du ${hoseName(h)} ${h.valve ? 'ouverte' : 'fermée'}`;
    }
    case 'toggleManifold': {
      if ((a.valve === 'vac' || a.valve === 'charge') && !s.manifold.fourWay) refuse('Manifold 2 voies : pas de vanne ' + a.valve + '.');
      const v = s.manifold.valves;
      v[a.valve] = !v[a.valve];
      return `Manifold : vanne ${{ lp: 'BP', hp: 'HP', vac: 'vide', charge: 'charge' }[a.valve]} ${v[a.valve] ? 'ouverte' : 'fermée'}`;
    }
    case 'setScale': s.manifold.scale = a.fluid; return `Échelle du manifold : ${a.fluid}`;
    case 'setServiceValve': {
      if (s.caps[a.valve]) refuse('Chapeau en place : retirez-le d\'abord (outil main).');
      if (a.valve === 'valve.gas') s.valves.gas = a.pos;
      else s.valves.liquid = a.pos;
      const pos = { back: 'contre-siège arrière', mid: 'position milieu', front: 'contre-siège avant', open: 'ouverte', closed: 'fermée' }[a.pos];
      return `${TARGET_LABELS[a.valve]} : ${pos}`;
    }
    case 'toggleSolenoid':
      s.valves.solenoid = !s.valves.solenoid;
      return `Électrovanne : ouverture manuelle ${s.valves.solenoid ? 'posée' : 'retirée'}`;
    case 'toggleCore': {
      if (!hoseAt(s, a.port)) refuse('Démonte-obus : raccordez d\'abord le flexible sur l\'outil (prise équipée d\'un flexible).');
      s.cores[a.port] = !s.cores[a.port];
      return `${TARGET_LABELS[a.port]} : obus ${s.cores[a.port] ? 'retiré' : 'remis'}`;
    }
    case 'setUnit': {
      if (a.on === s.running) refuse(a.on ? 'L\'unité tourne déjà.' : 'L\'unité est déjà arrêtée.');
      if (!a.on) { stopUnit(s); return 'Arrêt de l\'unité'; }
      if (systemRef(s) < 0.3 * s.plant.nominalCharge) return 'Mise en marche : coupure immédiate du pressostat BP (circuit presque vide)';
      startUnit(s);
      return 'Mise en marche de l\'unité';
    }
    case 'device': {
      const d = s.bench[a.device] ?? refuse('Appareil absent du banc.');
      if (a.device === 'n2') (d as { open: boolean }).open = a.on;
      else (d as { on: boolean }).on = a.on;
      const name = { pump: 'Pompe à vide', recovery: 'Station de récupération', n2: 'Bouteille d\'azote' }[a.device];
      return `${name} : ${a.on ? (a.device === 'n2' ? 'ouverte' : 'en marche') : a.device === 'n2' ? 'fermée' : 'arrêt'}`;
    }
    case 'setN2': {
      const n2 = s.bench.n2 ?? refuse('Pas d\'azote sur le banc.');
      n2.setpoint = a.setpoint;
      return `Détendeur azote réglé à ${fmt(a.setpoint - 1.01325)} bar rel`;
    }
    case 'cylValve': {
      const c = s.bench.cylinder ?? refuse('Pas de bouteille sur le banc.');
      c[a.valve] = !c[a.valve];
      return `Bouteille : vanne ${a.valve === 'gas' ? 'gaz' : 'liquide'} ${c[a.valve] ? 'ouverte' : 'fermée'}`;
    }
    case 'tareScale':
      if (s.bench.scaleTare === undefined) refuse('Pas de balance.');
      s.bench.scaleTare = scaleGross(s);
      return `Balance tarée (${fmt(s.bench.scaleTare!, 3)} kg)`;
    case 'measure': {
      const p = { tool: a.tool, target: a.target };
      const r = readingOf(l, s, p) ?? refuse('Rien à mesurer ici avec cet outil.');
      s.probes = s.probes.filter((x) => x.target !== a.target || x.tool !== a.tool);
      // two contact thermometers, one clamp meter, one of anything else
      const max = a.tool === 'thermometer' ? 2 : 1;
      const same = s.probes.filter((x) => x.tool === a.tool);
      if (same.length >= max) s.probes.splice(s.probes.indexOf(same[0]), 1);
      s.probes.push(p);
      return `Mesure (${TARGET_LABELS[a.target]}) : ${r.label} ${fmt(r.value, r.digits ?? 1)} ${r.unit}`;
    }
    case 'inspect': {
      if (!s.inspected.includes(a.target)) s.inspected.push(a.target);
      const text = l.inspect?.(s, a.target) ?? defaultInspect(s, a.target);
      toast(s, text);
      return `Inspection : ${text}`;
    }
    case 'answer': {
      const f = answersFor(l, s.tier).find((x) => x.id === a.field) ?? refuse(`Champ inconnu : ${a.field}`);
      const exp = f.expected(s);
      const ok = f.choices ? a.value === exp : Math.abs(a.value - exp) <= f.tol + 1e-9;
      s.answers[f.id] = { value: a.value, ok };
      return `Relevé ${f.label} : ${f.choices ? f.choices[a.value] : `${fmt(a.value, 2)} ${f.unit}`}`;
    }
    case 'custom': return '';
    case 'wait': advance(l, s, a.seconds); return `Attente ${fmtTime(a.seconds)}`;
    case 'setTimeScale': s.timeScale = a.scale; return '';
    case 'requestHint': {
      if (HINT_COST[s.tier] === null) refuse('Pas d\'indice en examen.');
      const o = currentObjective(l, s);
      if (!o?.hints) refuse('Pas d\'indice pour cette étape.');
      const max = o!.hints![2]?.length ? 3 : 2, lvl = (s.hintLevel[o!.id] ?? 0) + 1;
      if (lvl > max) refuse(hintText(o!, max));
      s.hintLevel[o!.id] = lvl;
      s.hintPenalty += HINT_COST[s.tier]!;
      toast(s, hintText(o!, lvl));
      return `Indice : ${hintText(o!, lvl)}`;
    }
    case 'undo': case 'finish': return '';
  }
}

export const hintText = (o: Objective, lvl: number) =>
  lvl <= 1 ? o.hints![0] : lvl === 2 ? o.hints![1] : `${o.hints![1]} (repère en surbrillance sur la platine)`;

/** Targets to pulse on the board: level-3 hint of the current objective. */
export function highlight(l: Level, s: GameState): TargetId[] {
  const o = currentObjective(l, s);
  return o && (s.hintLevel[o.id] ?? 0) >= 3 ? o.hints?.[2] ?? [] : [];
}

function runRules(l: Level, prev: GameState, s: GameState, a: RuleAction) {
  for (const r of l.rules) {
    if (s.finished || s.mistakes.some((m) => m.id === r.id) || !r.when({ prev, s, a })) continue;
    s.mistakes.push({ id: r.id, severity: r.severity, message: r.message, skill: r.skill, lesson: r.lesson, t: s.t });
    journal(s, `Erreur ${SEVERITY_LABEL[r.severity].toLowerCase()} : ${r.message}`, 'mistake');
    toast(s, r.message, 'bad');
    if (s.tier === 'examen' && r.severity === 'critical') s.finished = result(l, s, `Erreur critique en examen : ${r.message}`);
  }
}

function progress(l: Level, s: GameState) {
  for (const o of objectivesFor(l, s.tier)) {
    if (s.done.includes(o.id)) continue;
    if (!o.done(s)) break;
    s.done.push(o.id);
    s.lastProgressT = s.t;
    journal(s, `✓ ${o.label}`, 'info');
  }
}

export function result(l: Level, s: GameState, failed?: string): Result {
  const breakdown: Result['breakdown'] = s.mistakes.map((m) => ({ label: `${SEVERITY_LABEL[m.severity]} : ${m.message}`, points: -PENALTY[m.severity] }));
  const g = emittedG(s), allowance = EMISSION_ALLOWANCE_G * s.disconnects;
  const ep = Math.floor(Math.max(0, g - allowance) / 5);
  if (ep) breakdown.push({ label: `Émissions : ${fmt(g)} g rejetés (franchise ${allowance} g)`, points: -ep });
  if (s.hintPenalty) breakdown.push({ label: 'Indices', points: -s.hintPenalty });
  if (s.tier === 'examen' && l.timeLimit && s.t > l.timeLimit) breakdown.push({ label: `Temps dépassé (${fmtTime(l.timeLimit)})`, points: -10 });
  const score = Math.max(0, Math.min(100, 100 + breakdown.reduce((n, b) => n + b.points, 0)));
  const completed = !failed && objectivesFor(l, s.tier).every((o) => s.done.includes(o.id));
  const serious = s.mistakes.some((m) => m.severity !== 'minor');
  const stars = !completed ? 0 : score >= 90 && !serious ? 3 : score >= 70 ? 2 : 1;
  return { completed, failed, score, stars, breakdown, emittedG: g };
}

const NOT_UNDOABLE = new Set<Action['type']>(['pickTool', 'setTimeScale', 'requestHint', 'undo', 'finish', 'inspect']);
const SILENT = new Set<Action['type']>(['pickTool', 'setTimeScale', 'requestHint']);

function cloneState(s: GameState): GameState {
  const { undo, ...rest } = s;
  return { ...structuredClone(rest), undo };
}

export function dispatch(l: Level, prev: GameState, a: Action): GameState {
  if (prev.finished) return prev;
  if (a.type === 'undo') {
    if (!prev.undo) return { ...prev, toast: { text: prev.tier === 'guide' ? 'Rien à annuler.' : 'Annulation disponible en mode guidé uniquement.', kind: 'info', n: (prev.toast?.n ?? 0) + 1 } };
    const s = cloneState(prev.undo);
    journal(s, 'Dernière action annulée', 'info');
    toast(s, 'Dernière action annulée.');
    return s;
  }
  const s = cloneState(prev);
  s.undo = null;
  let text: string | void;
  try {
    text = apply(l, s, a);
    if (l.onAction) text = l.onAction(s, a) || text;
  } catch (e) {
    if (e instanceof Refusal) return { ...prev, toast: { text: e.text, kind: 'info', n: (prev.toast?.n ?? 0) + 1 } };
    throw e;
  }
  if (!SILENT.has(a.type)) journal(s, text || '');
  if (a.type === 'finish') {
    // whatever is left in hoses and manifold gets purged at the workshop
    const left = s.hoses.reduce((g, h) => g + (h.port && isPort(h.port) ? 0 : vent(s.circuit, hoseVol(h))), 0)
      + (s.hoses.some((h) => h.port && isPort(h.port)) ? 0 : vent(s.circuit, 'manifold'));
    s.lastVentG = left;
    if (left >= 0.5) journal(s, `Fluide resté dans les flexibles, purgé : ${fmt(left)} g`, 'info');
  }
  progress(l, s);
  runRules(l, prev, s, a);
  if (a.type === 'finish' && !s.finished) {
    s.finished = result(l, s);
    journal(s, `Fin de l'intervention : ${s.finished.score}/100`, 'info');
  }
  if (s.tier === 'guide' && !NOT_UNDOABLE.has(a.type)) s.undo = { ...prev, undo: null };
  return s;
}

export function tick(l: Level, prev: GameState, dt: number): GameState {
  if (prev.finished || dt <= 0) return prev;
  const s = cloneState(prev);
  advance(l, s, dt);
  progress(l, s);
  runRules(l, prev, s, { type: 'tick', dt });
  return s;
}

/** What a click on a board target means with the current tool. 'valveMenu': the UI asks for the position. */
export function clickAction(s: GameState, target: TargetId): Action | 'valveMenu' {
  const t: ToolId | null = s.tool;
  if (!t || t === 'hand') return isCap(target) && !(isPort(target) && hoseAt(s, target)) ? { type: 'toggleCap', target } : { type: 'inspect', target };
  if (t.startsWith('hose:')) {
    const id = t.slice(5), h = s.hoses.find((x) => x.id === id);
    if (h && isPort(target)) return h.port === target ? { type: 'disconnectHose', hose: id, end: 'port' } : { type: 'connectHose', hose: id, end: 'port', socket: target };
    return { type: 'inspect', target };
  }
  if (t === 'wrench') return target.startsWith('valve.') ? 'valveMenu' : { type: 'inspect', target };
  if (t === 'coreTool') return isPort(target) ? { type: 'toggleCore', port: target } : { type: 'inspect', target };
  return { type: 'measure', tool: t, target };
}

/** Hose tool on a manifold / bench socket: disconnect if this hose is there, else connect a free end (plain end first). */
export function socketAction(s: GameState, hoseId: string, sock: Socket): Action {
  const h = s.hoses.find((x) => x.id === hoseId)!;
  if (h.manifold === sock) return { type: 'disconnectHose', hose: hoseId, end: 'manifold' };
  if (h.port === sock) return { type: 'disconnectHose', hose: hoseId, end: 'port' };
  return { type: 'connectHose', hose: hoseId, end: h.manifold ? 'port' : 'manifold', socket: sock };
}

/** Runs a scripted list of steps (functions see the current state). Used by perfect-run tests. */
export function play(l: Level, s: GameState, steps: Step[]): GameState {
  for (const st of steps) s = dispatch(l, s, typeof st === 'function' ? st(s) : st);
  return s;
}
