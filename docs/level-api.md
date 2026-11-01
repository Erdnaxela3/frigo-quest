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
  tools: ToolId[];       // 'hand'|'wrench'|'screwdriver'|'thermometer'|'clamp'|'detector'|'soap'|'coreTool'|'gasDetector' (hose tools are automatic)
  unitControl?: boolean; timeLimit?: number;                       // exam tier, sim s
  setup(tier, rng): GameState;            // makePlatine(...) then mutate
  objectives: Objective[];  // {id,label,done(s),hints?:[nudge,specific,TargetId[]?],tiers?} — sticky + sequential
  rules: Rule[];            // {id,severity,skill,lesson?,message,when({prev,s,a})} — once per mistake; a can be {type:'tick',dt}
  answers: AnswerField[];   // {id,label,unit,tol,expected(s),choices?,tiers?}; tol: number | { rel: 0.02 } (fraction of |expected|)
  actions?: CustomAction[]; // side-panel buttons → {type:'custom', id, value?}; label: string | (s) => string; input?: {unit,min,max,step}
  onAction?(s, a): string | void;  // text returned for a 'custom' action is journaled AND toasted
  onTick?(s, dt): void;
  inspect?(s, target): string | undefined;  measure?(s, probe): Reading | undefined;
  perfectRun(tier): Step[];        // Step = Action | (s) => Action
}
```

## Scoring
100 − minor 5 / major 15 / critical 40; emissions −1 per 5 g beyond 5 g × port disconnections; hints guidé free / standard −5 / examen none; exam overtime −10. Stars: ★★★ ≥ 90 and no major/critical, ★★ ≥ 70, else ★; 0 if not completed. Critical in examen = immediate fail. Undo only in guidé.

## Actions
`pickTool`, `toggleCap{target}`, `connectHose{hose,end:'manifold'|'port',socket}`, `disconnectHose{hose,end}`, `toggleHoseValve{hose}`, `toggleManifold{valve:'lp'|'hp'|'vac'|'charge'}`, `setManifoldOpening{valve,opening}` (0..1, e.g. 0.05 = cracked), `setScale{fluid}`, `setServiceValve{valve:'valve.gas',pos:'back'|'mid'|'front'}` / `{valve:'valve.liquid'|'valve.receiver',pos:'open'|'closed'}`, `toggleSolenoid` (manual opener; wrench/screwdriver click on `comp.solenoid`), `toggleCore{port}`, `setUnit{on}`, `device{device:'pump'|'recovery'|'n2',on}`, `setN2{setpoint}` (bar abs), `cylValve{valve:'gas'|'liq'}`, `invertCylinder`, `tareScale`, `measure{tool,target}`, `inspect{target}`, `answer{field,value}`, `custom{id,value?}`, `wait{seconds}`, `setTimeScale`, `requestHint`, `undo`, `finish`.

Phase 2: `setPressostat{kp:'kp1'|'kp5', range?, diff?}` (**scale** values, bar rel; true range = scale − `scaleError`; refused past the dial stops `KP_LIMITS`), `resetKp5` (refused if not tripped or HP still above cut-in), `setThermostat{setpoint?, diff?}`, `adjustTxv{quarterTurns}` (+ = clockwise = closes = +1 K static SH per ¼ turn; refused outside 1…15 K), `lockout` (stops the unit, isolator padlocked, heater unpowered), `unlock` (heater powered from now), `checkVoltage` (locked: 0 V and `elec.voltageChecked = true`; else "230 V présents").

Board clicks (`clickAction`) return an action or `{ panel }`: wrench on a service valve → position menu; wrench/screwdriver on `comp.kp1`/`comp.kp5` → dial panel (RANGE/DIFF ¼-turn buttons, scale reading, KP5 reset); on `comp.txv` → ¼-turn panel; hand on `comp.elecBox` → electrical panel (lockout / unlock / VAT / read nameplate); hand on `comp.thermostat` → thermostat panel when `plant.thermostat` is set. Every panel button dispatches one of the actions above, so rules and journal see it. A ¼ turn (`KP_STEP`) is KP1 RANGE 0.15 bar / DIFF 0.1 bar, KP5 RANGE 0.5 bar / DIFF 0.2 bar.

## Model (`src/game/platineModel.ts`)
- `makePlatine({levelId, tier, fluid?, charge?, nominalCharge?, running?, Tamb?, Troom?, faults?, hoses?, bench?, volumes?, system?, nameplate?})` → charged board, service valves back-seated, receiver valve open, caps on, 2-way manifold closed, hoses blue on `mf.lp`, red on `mf.hp`, yellow on `mf.center` (ball valve closed). `system: { hp: 1.2 }` overrides a system volume (e.g. receiver too small). `nominalCharge` (label charge, `s.plant.nominalCharge`): R32 default 1.2; other fluids default to `charge` if given (e.g. `{ fluid: 'R290', charge: 0.2 }` = a 0.2 kg unit at nominal), else 1.2 kg scaled by liquid density. `charge` defaults to `nominalCharge`. System volumes scale with `nominalCharge` / board charge (R32 1.2 kg → unchanged), so small HC charges run at a plausible point; hoses keep 0.07 L (they steal a visible share of a small charge).
- System volumes (L, `SYSTEM` / `SYSTEM_IDS`): `hp` 1.4 (discharge → condenser → receiver), `filt` 0.2 (receiver valve → filter → sight glass → liquid valve), `liq` 0.2 (liquid valve → solenoid → TXV), `lp` 1.6 (evaporator → gas valve), `comp` 0.8 (gas valve → compressor). Plus `manifold` 0.02, `hose:<id>` 0.07, extras (e.g. `cyl`). Stopped links: `hp`⇄`filt` (receiver valve), `filt`⇄`liq` (liquid valve), `liq`→`lp` (TXV, open when the solenoid is), `lp`⇄`comp` (gas valve unless front-seated), `hp`→`comp` (slow back-leak through the stopped compressor).
- Links are rebuilt every step by `syncLinks` — never edit `s.circuit.links`; edit masses in `s.circuit.volumes`. `gasMass(Pabs, V, 'air'|'n2', T)` gives a fill mass.
- Sockets: `port.hp`→hp (vapour), `port.liq`→**filt** (liquid), `port.evap`→lp (Schrader at the evaporator outlet, indoor side), `port.lp`→comp (open only if gas valve not back-seated), `mf.lp|mf.hp|mf.center|mf.vac` → manifold body (scaled by `manifold.opening`), `cyl.gas|cyl.liq` → `cyl`, `pump|rec.in|rec.out|n2` → bench devices acting on the plugged hose volume (recovery blows to ATM if `rec.out` is free = emission). The N₂ regulator is relieving: lowering `setN2` bleeds its hose down to the setpoint.
- Cylinder: `bench.cylinder.dipTube` (default true; `false` = single valve, `cyl.liq` refused) and `inverted` (`invertCylinder`). Liquid comes from `cyl.liq` upright, from `cyl.gas` inverted. `cylinderLiquid(s,'gas'|'liq')` tells which valve delivers liquid (vapour-charge-blend rules).
- Hose ends: a free plain end is open to air; a free port end only if its ball valve is open. Disconnecting vents the hose into `circuit.emitted` and sets `s.lastVentG`.
- Bench `s.bench`: `pump {on,speed:3.4,ultimate:5e-5}`, `recovery {on,speed:0.5,cutoff}`, `n2 {open,setpoint}`, `cylinder {label,gas,liq,tare}` (needs `cyl` volume), `scaleTare` (defined = scale shown, weighs tare + cyl refrigerant), `vacuumGaugeAt` (volume id read by the vacuum gauge).
- Also `s.manifold.fourWay`, `s.manifold.opening`, `s.valves.receiver`, `s.leaks: {at,k,joint?}[]` (orifices to ATM, k 1e-7 = slow leak), `s.oilStains`, `s.bulbAttached`, `s.vars` (free level state), `s.inspected`, `s.probes`.
- Helpers: `P(s,id)`, `vs(s,id)`, `refG(s,id)`, `gaugeP(s,'mf.lp'|'mf.hp')`, `hoseAt(s,socket)`, `hoseVol(h)`, `systemRef(s)`, `vent(c,id)`, `defaultReading(s,probe)`, `sceneView(s)`, `startUnit` (unit on, compressor at its steady point at once — setups), `stopUnit` (unit off), `liquidIntoSuction`, `startsWithin`, `openSection`/`closeSection`, `jointVolume`, `cylinderLiquid`, `solenoidOpen`, `liquidPathOpen`, `transient`.
- Running: `steadyState` with NO_FAULTS ⊕ `s.plant.faults`, dTevapNominal 15, chargeRatio = system refrigerant / `plant.nominalCharge`; `cycle.BP` = evaporator, `cycle.BPsuction` = compressor side (`comp`, `port.lp`, KP1), lower only with a KVP; `s.cycle` = relaxed output (null when stopped **and during a pump-down transient**; guard `s.cycle?.`). Thermometer zones: `joint.filterIn`/`comp.filter` read Tliquid, `joint.filterOut`/sight glass/liquid valve/`liq` read Tliquid − `cycle.filterDT` (set `faults.filterRestriction`).
- Circuit k values: hose/valve 4e-4, Schrader core removed 1.6e-3, gas valve 1e-2, opened section 2e-3, slow leak 1e-7, venting hose 1e-5.

## Controls & safety devices (phase 2)
- `s.unitOn` = command switch (`setUnit`); `s.running` = compressor. Each physics step `control(s)` updates the pressostats and starts/stops the compressor: runs iff `unitOn && !elec.locked && !kp1.tripped && !kp5.tripped && (control === 'pumpDown' || thermostat calling)`. Every start (manual or automatic) pushes `s.t` into `s.starts`; `startsWithin(s, 600) > 6` = short-cycling. Auto stops/starts are journaled + toasted ("Pressostat BP (KP1) : coupure à 0,5 bar…").
- `s.plant.kp1` (senses `comp`) / `kp5` (senses `hp`): `{kind, range, diff, manualReset?, scaleError, tripped}`, bar rel. KP1: range = cut-in, cut-out = range − diff (default 2.0 / 1.5 → cut-out 0.5). KP5: range = cut-out, cut-in = range − diff (default 36 / 4, manual reset). Helpers `kpCutIn/kpCutOut` (physics/cycle). The panel and `inspect` show `range + scaleError`.
- `s.plant.control`: `'direct'` (default; solenoid powered whenever the unit is on) or `'pumpDown'` (thermostat drives the solenoid, KP1 starts/stops the compressor). `solenoidOpen(s)`, `liquidPathOpen(s)`; `faults.solenoidStuck` = stuck closed.
- `s.plant.thermostat?: {setpoint, diff, call}`: stops at setpoint, calls again at setpoint + diff (undefined = always calling). `s.plant.box?: {UA, C}` makes `Troom` dynamic via `boxStep` (heat from `Tamb`, cooling = `cycle.capacityKW`); undefined = Troom fixed (phase-1 behaviour).
- Pump-down transient: running with the liquid path closed (receiver valve, liquid valve or solenoid) or the gas valve front-seated → no cycle; the compressor is a 2 m³/h transfer `comp → hp` on the static circuit, condenser/evaporator fans keep `hp`/`lp` near Tamb/Troom. Nominal board, liquid valve closed: BP 9.4 → 0.5 bar rel in ≈ 30 s (≈ 34 s on the receiver valve), KP1 seen at 0.47 bar (≤ 0.1 bar overshoot), HP ≈ 22 bar, receiver ≈ 90 % full. Reopening: BP climbs ≈ 2 bar/s through the TXV, restart seen within ≈ 0.2 bar of cut-in (2.02 for 2.0), then the cycle relaxes (τ 30 s) from the gauge pressures. A pumped-down unit left on restarts by itself (back-leak through the stopped compressor): every ≈ 265 s with diff 1.5, ≈ 110 s with diff 0.7 (5–6 starts / 10 min, not yet short-cycling), ≈ 90 s if the gas valve is front-seated (> 6 / 10 min) → lock out right after the pump-down. A faster short-cycle trap (L07 "every 30 s") must come from the level, e.g. a leaky solenoid in `onTick` moving a little refrigerant `liq` → `lp` while stopped. `system: { hp: 1.2 }` + receiver valve closed: liquid-full after ≈ 20 s, HP jumps in < 1 s, KP5 trips at ≈ 36.6 bar. `inspect('comp.receiver')` shows the liquid level (warn before it is full).
- `liquidIntoSuction(s)`: g/s of liquid entering `comp` (≈ 2 s average) while running. Charging liquid from a dip-tube cylinder through yellow → `mf.center`, blue → `port.lp`: manifold LP wide open ≈ 15 g/s (slug), 30 % ≈ 9.5 g/s, cracked 5 % ≈ 1.9 g/s.

## Electrical (phase 2)
`s.elec = { locked, voltageChecked, crankHeaterOnSince }`. Default: unlocked, heater on for 24 h (`-86400`). Cold-start variant: `s.elec = { locked: true, voltageChecked: false, crankHeaterOnSince: null }` in setup; the heater gets power at `unlock`, so a rule can check `s.t - s.elec.crankHeaterOnSince` when `a.type === 'setUnit' && a.on`. `setUnit{on:true}` is refused while locked.

## Opening the circuit (phase 2)
- `openSection(s, ids)` (call from `onAction`): from the next step each volume breathes to air through k 2e-3 (refrigerant vented = player emission; under vacuum, air comes in). Returns the highest pressure before opening, bar rel: flag `> 0.5` (open-under-pressure) / `< 0` (open-under-vacuum), or `refuse(...)`. `closeSection(s, ids)` after the new part is fitted; then N₂ test + vacuum through a port (`port.evap` → lp, `port.liq` → filt, `port.lp` → comp, `port.hp` → hp). `s.opened` lists the open volumes.
- `jointVolume(joint)` / `JOINT_VOLUME`: compDischarge, condIn, condOut, kp5Cap → hp; filterIn, filterOut → filt; liqValve, txvIn → liq; txvOut, evapOut, gasValve → lp; compSuction, kp1Cap → comp.

```ts
// L09-style: pumped down on the receiver valve, locked out, liquid valve closed → replace the filter
onAction(s, a) {
  if (a.type === 'custom' && a.id === 'cut-filter') {
    const p = openSection(s, ['filt']);
    if (p > 0.5) s.vars.openedUnderPressure = true;      // rule: critical
    return `Filtre déposé (section à ${fmt(p)} bar)`;
  }
  if (a.type === 'custom' && a.id === 'fit-filter') { closeSection(s, ['filt']); s.plant.faults.filterRestriction = 0; return 'Filtre neuf brasé'; }
},
rules: [{ id: 'short-cycle', severity: 'major', skill: 'A1:9.06', message: '…', when: ({ s }) => startsWithin(s) > 6 }],
```
- Long waits (hours: crankcase heater, 48 h acid test, moisture indicator): `wait` integrates 0.1 s steps (≈ 1 s CPU per sim hour) — instead advance time in a custom action (`s.t += 12 * 3600`) and set the end state directly.

## Recipe
1. `setup`: `makePlatine(...)` then mutate (N₂ fill via `gasMass`, bench items, `cyl`, leaks, `fourWay`, `vars`). Use `rng` only for examen variations.
2. Objectives = spec procedure steps as state predicates, with hints [nudge, specific, targets].
3. Rules = the spec's mistake table, same ids. `a.type` for "did X", `prev` vs `s` for "became true", `a.type==='finish'` for end checks, `{type:'tick'}` for continuous conditions.
4. Answers for numeric/choice questions (`expected(s)` evaluated when answered).
5. Things the engine doesn't model (registre, detector calibration, record form, choosing a cylinder): `actions` + `onAction` writing `s.vars`; `measure` for detector/soap readings; `inspect` for visual findings.
6. `perfectRun(tier)` with functions reading live instruments. Tests: `play(level, level.setup(tier, mulberry32(7)), level.perfectRun(tier))` → no mistakes, completed, 3 stars, for each tier; plus one test per key mistake via `dispatch`.

## Flammable refrigerant (L13)
- `s.room = makeRoom(volume m³, ach = 0.5, fanAch?)` → `{volume, ach, fan?: {on, ach}, floor, head, outside?}`. Every gram reaching `circuit.emitted` (hose vent, `openSection`, `leaks`, recovery outlet free) lands in the floor layer (lower 20 %); layers mix slowly (τ 15 min, 30 s with the fan), ventilation `ach` (+ `fan.ach` when on) removes both. `room.outside = true` (set from `onAction`, e.g. purge hose run outdoors) keeps releases out of the room. Order of magnitude: 0.2 kg R290 vented in 10 m³ → floor > 100 % LFL within 2 min, head < ⅓ of the floor value.
- `concentration(s, 'floor'|'head')` → % LFL (`fluid().lfl`; 0 without room / non-flammable). `TRACE_LFL` = 1 % (detector resolution).
- Gas detector (`'gasDetector'` tool + side panel when listed in `tools`): `s.gasDetector = {on, position: 'floor'|'head', battery: 'ok'|'low'|'empty'}` (undefined = off, floor, ok). Action `setGasDetector{on?, position?, battery?}` (`battery:'ok'` = new batteries; `'empty'` switches it off, `on:true` refused while empty). `gasReading(s, target?)` → Reading in % LIE (0–100, digits 0; label says "batterie faible"); clicking a board target with the tool = `measure` probe = position concentration + what escapes there (`localLFL(s, target)`: content of an opened section, or a leak plume); refused while off. `detectorWorks(s)`.
- Ignition sources: `s.ignition = [{id, label, active, level?: 'floor'|'head'}]` (listed in the side panel with a "Couper / retirer" button). Action `setIgnition{id, active}`. Each step, concentration ≥ 100 % LFL at an active source's level sets `s.ignitionEvent = {t, source, lfl}` once (journaled + toasted "Inflammation : …").
- `torchIgnition(s, target)` (call from a brazing custom action): true and sets `ignitionEvent` (`source: 'torch'`) if floor concentration + `localLFL` > `TRACE_LFL` (unpurged opened section, leak). The level decides the consequence, e.g. `rules: [{ id: 'flame-before-purge', severity: 'critical', when: ({ prev, s }) => !prev.ignitionEvent && !!s.ignitionEvent, … }]`.
- `setRoomFan{on}` (ATEX fan, refused without `room.fan`).

## Pressure regulators (L15)
- `s.plant.kvp` / `s.plant.kvr` = `{ setting /* bar rel */, enabled }`. Defined → drawn on the board (`comp.kvp` on the suction line after `port.evap`, `comp.kvr` on the discharge line) and openable with wrench/screwdriver (panel ¼ turns: KVP 0.1 bar, KVR 0.25 bar, clockwise = higher ⚠ to verify per model; bar value shown in guidé only). `enabled` = regulating (false = by-passed). Limits `REG_LIMITS` KVP 0–5.5, KVR 5–17.5 bar rel (refused beyond).
- Action `setRegulator{reg:'kvp'|'kvr', setting}` (bar rel; journal shows the ¼ turns).
- Physics (`CycleInput.evapPressureFloor` / `condPressureFloor`, bar abs): KVP → `cycle.BP` ≥ floor, `Tevap` = Tsat(floor), capacity drops, `BPsuction` (comp, `port.lp`, KP1) stays at the unregulated value; `port.evap` reads the regulated evaporator. KVR → `cycle.HP` ≥ floor, Tcond raised, extra subcooling, current ↑, COP ↓. TXV starvation when HP − BP < `txvMinDP` (default 0.4 × (Psat 40 °C − Psat 0 °C), R449A ≈ 5 bar): SH ↑, BP ↓, capacity ↓.
- Season: set `s.plant.Tamb` (down to −10 °C). Board (dTevap 15) R449A Troom 2: Tamb −5 without KVR → low HP, SH > 10 K; KVR at Psat(25 °C) → HP held at the floor, SH < 8 K. Blends: a two-phase volume sits between dew and bubble pressure by liquid mass fraction; while running, `forceSystem` picks each system volume's temperature so gauges read `cycle.BP` / `cycle.HP` exactly.
