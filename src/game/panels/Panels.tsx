import { TARGET_LABELS, type ThreeWay } from '../sceneIds';
import type { Action, GameState } from '../types';
import { fmt, type PanelId } from '../engine';
import { KP_STEP, REG_STEP } from '../platineModel';
import { kpCutIn, kpCutOut } from '../../physics/cycle';

type Act = (a: Action) => void;
const r3 = (x: number) => Math.round(x * 1000) / 1000;

const VALVE_POS: Record<'valve.gas' | 'valve.liquid' | 'valve.receiver', [string, string][]> = {
  'valve.gas': [['back', 'Contre-siège arrière (prise fermée)'], ['mid', 'Milieu (prise ouverte)'], ['front', 'Contre-siège avant (ligne fermée)']],
  'valve.liquid': [['open', 'Ouverte'], ['closed', 'Fermée']],
  'valve.receiver': [['open', 'Ouvert'], ['closed', 'Fermé']],
};

function Dial({ label, value, unit, step, onSet }: { label: string; value: number; unit: string; step: number; onSet: (v: number) => void }) {
  return (
    <div className="row lv-dial">
      <span className="lv-small">{label}</span>
      <button type="button" className="lv-mini" onClick={() => onSet(r3(value - step))} aria-label={`${label} : quart de tour antihoraire`}>↺ ¼</button>
      <span className="mono">{fmt(value, 2)} {unit}</span>
      <button type="button" className="lv-mini" onClick={() => onSet(r3(value + step))} aria-label={`${label} : quart de tour horaire`}>↻ ¼</button>
    </div>
  );
}

function body(id: PanelId, s: GameState, act: Act, close: () => void) {
  switch (id) {
    case 'valve.gas': case 'valve.liquid': case 'valve.receiver': {
      const cur = id === 'valve.gas' ? s.valves.gas : id === 'valve.liquid' ? s.valves.liquid : s.valves.receiver;
      return VALVE_POS[id].map(([pos, label]) => (
        <button key={pos} type="button" aria-pressed={cur === pos} onClick={() => {
          act(id === 'valve.gas' ? { type: 'setServiceValve', valve: id, pos: pos as ThreeWay } : { type: 'setServiceValve', valve: id, pos: pos as 'open' | 'closed' });
          close();
        }}>{label}</button>
      ));
    }
    case 'kp1': case 'kp5': {
      const k = s.plant[id], st = KP_STEP[id];
      return (
        <>
          <p className="lv-small">Contact : {k.tripped ? 'ouvert (compresseur bloqué)' : 'fermé'}</p>
          <Dial label="RANGE" unit="bar" value={k.range + k.scaleError} step={st.range} onSet={(v) => act({ type: 'setPressostat', kp: id, range: v })} />
          <Dial label="DIFF" unit="bar" value={k.diff} step={st.diff} onSet={(v) => act({ type: 'setPressostat', kp: id, diff: v })} />
          {s.tier === 'guide' && (
            <p className="lv-small muted">
              Échelle : coupure {fmt(kpCutOut(k) + k.scaleError, 2)} bar, enclenchement {fmt(kpCutIn(k) + k.scaleError, 2)} bar
            </p>
          )}
          {id === 'kp5' && k.manualReset && <button type="button" onClick={() => act({ type: 'resetKp5' })}>Réarmer (bouton RESET)</button>}
        </>
      );
    }
    case 'thermostat': {
      const th = s.plant.thermostat!;
      return (
        <>
          <p className="lv-small">Affichage : <span className="mono">{fmt(s.plant.Troom)} °C</span> · {th.call ? 'demande de froid' : 'satisfait'}</p>
          <Dial label="Consigne" unit="°C" value={th.setpoint} step={0.5} onSet={(v) => act({ type: 'setThermostat', setpoint: v })} />
          <Dial label="Différentiel" unit="K" value={th.diff} step={0.5} onSet={(v) => act({ type: 'setThermostat', diff: v })} />
        </>
      );
    }
    case 'txv':
      return (
        <>
          <p className="lv-small">Vis de réglage de la surchauffe (sous le capuchon)</p>
          <div className="row">
            <button type="button" onClick={() => act({ type: 'adjustTxv', quarterTurns: -1 })}>↺ ¼ tour</button>
            <button type="button" onClick={() => act({ type: 'adjustTxv', quarterTurns: 1 })}>↻ ¼ tour</button>
          </div>
          {s.tier === 'guide' && <p className="lv-small muted">Sens horaire : ferme le détendeur, la surchauffe augmente (≈ 4 K par tour).</p>}
        </>
      );
    case 'kvp': case 'kvr': {
      const r = s.plant[id]!, step = REG_STEP[id];
      return (
        <>
          <p className="lv-small">{id === 'kvp' ? 'Maintient la pression d\'évaporation au-dessus du réglage.' : 'Maintient la pression de condensation au-dessus du réglage.'}</p>
          <p className="lv-small">Tige de réglage (sous le capuchon){r.enabled ? '' : ' · régulateur hors service'}</p>
          <div className="row">
            <button type="button" onClick={() => act({ type: 'setRegulator', reg: id, setting: r3(r.setting - step) })}>↺ ¼ tour</button>
            <button type="button" onClick={() => act({ type: 'setRegulator', reg: id, setting: r3(r.setting + step) })}>↻ ¼ tour</button>
          </div>
          {s.tier === 'guide'
            ? <p className="lv-small muted">Réglage : {fmt(r.setting, 2)} bar · sens horaire = consigne plus haute (≈ {fmt(step, 2)} bar par ¼ tour)</p>
            : <p className="lv-small muted">Pas d'échelle : réglez en lisant le manomètre {id === 'kvp' ? 'côté évaporateur (prise évap.)' : 'HP'}.</p>}
        </>
      );
    }
    case 'elec': {
      const e = s.elec, on = e.crankHeaterOnSince;
      return (
        <>
          <p className="lv-small">Sectionneur Q1 : {e.locked ? 'ouvert, cadenassé (consigné)' : 'fermé (sous tension)'}</p>
          <p className="lv-small">Résistance de carter : {on === null ? 'hors tension' : s.running ? 'coupée (compresseur en marche)' : `sous tension depuis ${Math.floor((s.t - on) / 60)} min`}</p>
          <button type="button" onClick={() => act({ type: e.locked ? 'unlock' : 'lockout' })}>{e.locked ? 'Déconsigner' : 'Consigner (cadenas)'}</button>
          <button type="button" onClick={() => act({ type: 'checkVoltage' })}>Vérifier la tension (VAT)</button>
          <button type="button" onClick={() => act({ type: 'inspect', target: 'comp.elecBox' })}>Lire la plaque signalétique</button>
        </>
      );
    }
  }
}

const TITLE: Record<PanelId, string> = {
  'valve.gas': TARGET_LABELS['valve.gas'], 'valve.liquid': TARGET_LABELS['valve.liquid'], 'valve.receiver': TARGET_LABELS['valve.receiver'],
  kp1: TARGET_LABELS['comp.kp1'], kp5: TARGET_LABELS['comp.kp5'], thermostat: TARGET_LABELS['comp.thermostat'],
  txv: TARGET_LABELS['comp.txv'], elec: TARGET_LABELS['comp.elecBox'],
  kvp: TARGET_LABELS['comp.kvp'], kvr: TARGET_LABELS['comp.kvr'],
};

/** Popover opened by a board click (clickAction → { panel }). Every control dispatches an engine action. */
export default function Panel({ id, s, act, onClose }: { id: PanelId; s: GameState; act: Act; onClose: () => void }) {
  return (
    <div className="lv-popover card" role="dialog" aria-label={TITLE[id]}>
      <strong>{TITLE[id]}</strong>
      {body(id, s, act, onClose)}
      <button type="button" onClick={onClose}>{id.startsWith('valve.') ? 'Annuler' : 'Fermer'}</button>
    </div>
  );
}
