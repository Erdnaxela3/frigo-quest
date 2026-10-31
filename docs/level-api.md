# Writing a level

A level is one data object (`Level` in `src/game/types.ts`), default-exported from `src/levels/L0X.ts` and registered in `LEVELS` (`src/levels/index.ts`). **Copy the pattern of `src/levels/L01.ts`** and its test `L01.test.ts`.

## Engine (`src/game/engine.ts`, pure, clones state)
- `dispatch(level, state, action)`, `tick(level, state, simSeconds)` (fixed 0.1 s steps), `play(level, state, steps)` (tests).
- `refuse(msg)`: throw it from `onAction` to reject an action (state unchanged, neutral toast).
- Also exported: `result`, `clickAction`, `socketAction`, `emittedG`, `isPort`, `fmt`, `PENALTY`, `HINT_COST`.

## Level fields
```ts
interface Level {
  id; title; skills: string[]; lesson: string; scene: 'PLATINE'; fluid: FluidId;
  briefing: string; tierNotes: Record<Tier, string>;            // Tier = 'guide' | 'standard' | 'examen'
  tools: ToolId[];       // 'hand'|'wrench'|'thermometer'|'clamp'|'detector'|'soap'|'coreTool' (hose tools are automatic)
  unitControl?: boolean; timeLimit?: number;                       // exam tier, sim s
  setup(tier, rng): GameState;            // makePlatine(...) then mutate
  objectives: Objective[];  // {id,label,done(s),hints?:[nudge,specific,TargetId[]?],tiers?} — sticky + sequential
  rules: Rule[];            // {id,severity,skill,lesson?,message,when({prev,s,a})} — once per mistake; a can be {type:'tick',dt}
  answers: AnswerField[];   // {id,label,unit,tol,expected(s),choices?,tiers?}
  actions?: CustomAction[]; // side-panel buttons → {type:'custom', id, value?}; input?: {unit,min,max,step}
  onAction?(s, a): string | void;  onTick?(s, dt): void;
  inspect?(s, target): string | undefined;  measure?(s, probe): Reading | undefined;
  perfectRun(tier): Step[];        // Step = Action | (s) => Action
}
```

## Scoring
100 − minor 5 / major 15 / critical 40; emissions −1 per 5 g beyond 5 g × port disconnections; hints guidé free / standard −5 / examen none; exam overtime −10. Stars: ★★★ ≥ 90 and no major/critical, ★★ ≥ 70, else ★; 0 if not completed. Critical in examen = immediate fail. Undo only in guidé.

## Actions
`pickTool`, `toggleCap{target}`, `connectHose{hose,end:'manifold'|'port',socket}`, `disconnectHose{hose,end}`, `toggleHoseValve{hose}`, `toggleManifold{valve:'lp'|'hp'|'vac'|'charge'}`, `setScale{fluid}`, `setServiceValve{valve:'valve.gas',pos:'back'|'mid'|'front'}` / `{valve:'valve.liquid',pos:'open'|'closed'}`, `toggleSolenoid`, `toggleCore{port}`, `setUnit{on}`, `device{device:'pump'|'recovery'|'n2',on}`, `setN2{setpoint}` (bar abs), `cylValve{valve:'gas'|'liq'}`, `tareScale`, `measure{tool,target}`, `inspect{target}`, `answer{field,value}`, `custom{id,value?}`, `wait{seconds}`, `setTimeScale`, `requestHint`, `undo`, `finish`.

## Model (`src/game/platineModel.ts`)
- `makePlatine({levelId, tier, fluid?, charge?=1.2, running?, Tamb?, Troom?, faults?, hoses?, bench?, volumes?, nameplate?})` → charged board, service valves back-seated, caps on, 2-way manifold closed, hoses blue on `mf.lp`, red on `mf.hp`, yellow on `mf.center` (ball valve closed).
- Volumes (L): `hp` 1.6, `liq` 0.2, `lp` 1.6, `comp` 0.8, `manifold` 0.02, `hose:<id>` 0.07, plus extras (e.g. `cyl`).
- Links are rebuilt every step by `syncLinks` — never edit `s.circuit.links`; edit masses in `s.circuit.volumes`. `gasMass(Pabs, V, 'air'|'n2', T)` gives a fill mass.
- Sockets: `port.hp`→hp (vapour), `port.liq`→hp (liquid), `port.lp`→comp (open only if gas valve not back-seated), `mf.lp|mf.hp|mf.center|mf.vac` → manifold body, `cyl.gas|cyl.liq` → `cyl`, `pump|rec.in|rec.out|n2` → bench devices acting on the plugged hose volume (recovery blows to ATM if `rec.out` is free = emission).
- Hose ends: a free plain end is open to air; a free port end only if its ball valve is open. Disconnecting vents the hose into `circuit.emitted` and sets `s.lastVentG`.
- Bench `s.bench`: `pump {on,speed:3.4,ultimate:5e-5}`, `recovery {on,speed:0.5,cutoff}`, `n2 {open,setpoint}`, `cylinder {label,gas,liq,tare}` (needs `cyl` volume), `scaleTare` (defined = scale shown, weighs tare + cyl refrigerant), `vacuumGaugeAt` (volume id read by the vacuum gauge).
- Also `s.manifold.fourWay`, `s.leaks: {at,k,joint?}[]` (orifices to ATM, k 1e-7 = slow leak), `s.oilStains`, `s.bulbAttached`, `s.vars` (free level state), `s.inspected`, `s.probes`.
- Helpers: `P(s,id)`, `vs(s,id)`, `refG(s,id)`, `gaugeP(s,'mf.lp'|'mf.hp')`, `hoseAt(s,socket)`, `hoseVol(h)`, `systemRef(s)`, `vent(c,id)`, `defaultReading(s,probe)`, `sceneView(s)`, `startUnit`, `stopUnit`.
- Running: `steadyState` with NO_FAULTS ⊕ `s.plant.faults`, dTevapNominal 15, chargeRatio = system refrigerant / 1.2; `s.cycle` = relaxed output (null when stopped). KP1 trips immediately if the gas valve is front-seated or the liquid valve closed while running (no pump-down transient).
- Circuit k values: hose/valve 4e-4, Schrader core removed 1.6e-3, slow leak 1e-7, venting hose 1e-5.

## Recipe
1. `setup`: `makePlatine(...)` then mutate (N₂ fill via `gasMass`, bench items, `cyl`, leaks, `fourWay`, `vars`). Use `rng` only for examen variations.
2. Objectives = spec procedure steps as state predicates, with hints [nudge, specific, targets].
3. Rules = the spec's mistake table, same ids. `a.type` for "did X", `prev` vs `s` for "became true", `a.type==='finish'` for end checks, `{type:'tick'}` for continuous conditions.
4. Answers for numeric/choice questions (`expected(s)` evaluated when answered).
5. Things the engine doesn't model (registre, detector calibration, record form, choosing a cylinder): `actions` + `onAction` writing `s.vars`; `measure` for detector/soap readings; `inspect` for visual findings.
6. `perfectRun(tier)` with functions reading live instruments. Tests: `play(level, level.setup(tier, mulberry32(7)), level.perfectRun(tier))` → no mistakes, completed, 3 stars, for each tier; plus one test per key mistake via `dispatch`.
