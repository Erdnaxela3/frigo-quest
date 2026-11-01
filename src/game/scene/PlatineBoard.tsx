import { useMemo } from 'react';
import type { ComponentId, SceneView, SegmentId, TargetId } from '../sceneIds';
import { PLATINE_LAYOUT as L, coilPath, roundPath, type Box } from './layout';
import {
  BoardCtx, Bulb, Clamp, CoilBody, Compressor, CrankHeater, Defs, ElecBox, Fan, Filter, FlowArrow, Hose, Joint, KP,
  OilStain, Pipe, Plate, Receiver, ReceiverValve, Regulator, Schrader, Screw, ServiceValve, SightGlass, Solenoid, Target, Thermostat, Tube, TXV,
} from './parts';
import './platine.css';

export { PLATINE_LAYOUT } from './layout';

const { w: W, h: H } = L.size;

const segPaths = (s: SegmentId): string[] => [
  ...L.pipes[s].map((p) => roundPath(p)),
  ...(s === 'condenser' ? [coilPath(L.condenser)] : s === 'evaporator' ? [coilPath(L.evaporator)] : []),
];

const [txvX, txvY] = L.txv, [sgX, sgY] = L.sightglass, [solX, solY] = L.solenoid;
const FROST_BOX: Partial<Record<ComponentId, Box>> = {
  'comp.evaporator': L.evaporator,
  'comp.condenser': L.condenser,
  'comp.compressor': L.compressor,
  'comp.receiver': L.receiver,
  'comp.filter': L.filter,
  'comp.txv': { x: txvX - 20, y: txvY - 44, w: 40, h: 68 },
  'comp.txvBulb': { x: L.bulb.x - 4, y: L.bulb.y - 4, w: L.bulb.w + 8, h: L.bulb.h + 8 },
  'comp.sightglass': { x: sgX - 16, y: sgY - 16, w: 32, h: 32 },
  'comp.solenoid': { x: solX - 16, y: solY - 12, w: 32, h: 24 },
};

function WoodBoard() {
  const b = L.board;
  return (
    <svg className="pt-bg" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <defs>
        <linearGradient id="pt-wood" x1="0" y1="0" x2="1" y2="0.25">
          <stop offset="0" stopColor="#d7b47c" /><stop offset=".35" stopColor="#c9a26b" /><stop offset=".7" stopColor="#d3ae75" /><stop offset="1" stopColor="#b98f58" />
        </linearGradient>
        <filter id="pt-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.0018 0.055" numOctaves="4" seed="11" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.36  0 0 0 0 0.22  0 0 0 0 0.09  1.5 0 0 0 -0.55" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
        <filter id="pt-grain2" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="turbulence" baseFrequency="0.0009 0.018" numOctaves="2" seed="3" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.3  0 0 0 0 0.14  2.2 0 0 0 -0.75" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
      </defs>
      <rect x={b.x - 4} y={b.y - 4} width={b.w + 8} height={b.h + 8} rx={8} fill="#6b4a26" />
      <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={6} fill="url(#pt-wood)" />
      <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={6} fill="#000" filter="url(#pt-grain2)" />
      <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={6} fill="#000" filter="url(#pt-grain)" />
      <rect x={b.x + 1} y={b.y + 1} width={b.w - 2} height={b.h - 2} rx={6} fill="none" stroke="#f3dcb0" strokeOpacity={0.5} strokeWidth={2} />
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={i} x1={b.x - 3} x2={b.x + b.w + 3} y1={b.y + b.h + 1 + i * 0.7} y2={b.y + b.h + 1 + i * 0.7} stroke={i % 2 ? '#a07a48' : '#4c3418'} strokeWidth={0.6} />
      ))}
    </svg>
  );
}

export interface PlatineBoardProps {
  view: SceneView;
  onTarget: (id: TargetId) => void;
  cursorTool?: string;
}

export default function PlatineBoard({ view, onTarget, cursorTool }: PlatineBoardProps) {
  const ctx = useMemo(() => ({ onTarget, highlight: new Set(view.highlight) }), [onTarget, view.highlight]);
  const { segments: seg, running } = view;
  const pipe = (s: SegmentId) => L.pipes[s].map((p, i) => <Pipe key={`${s}${i}`} d={roundPath(p)} state={seg[s]} running={running} />);
  const frosted = Object.entries(view.frost).filter(([, on]) => on).map(([k]) => k);
  const b = L.board;

  return (
    <div className="pt-wrap" data-tool={cursorTool || undefined}>
      <WoodBoard />
      <svg className="pt-svg" viewBox={`0 0 ${W} ${H}`} role="group" aria-label={view.title ?? 'Platine didactique split R32'}>
        <Defs />
        <BoardCtx.Provider value={ctx}>
          {[[b.x + 16, b.y + 16], [b.x + b.w - 16, b.y + 16], [b.x + 16, b.y + b.h - 16], [b.x + b.w - 16, b.y + b.h - 16], [W / 2, b.y + 16], [W / 2, b.y + b.h - 16]]
            .map(([x, y]) => <Screw key={`${x},${y}`} x={x} y={y} />)}
          <g className="pt-title">
            <rect x={W / 2 - 205} y={34} width={410} height={30} rx={3} fill="url(#pt-brass)" stroke="#6d5216" />
            <text x={W / 2} y={54} textAnchor="middle">{view.title ?? 'PLATINE DIDACTIQUE · SPLIT R32 · 1,2 kg'}</text>
          </g>
          <text x={60} y={62} className="pt-zone">UNITÉ EXTÉRIEURE</text>
          <text x={1140} y={62} className="pt-zone" textAnchor="end">UNITÉ INTÉRIEURE</text>
          <line x1={L.divider} y1={80} x2={L.divider} y2={750} className="pt-divider" />
          <text x={L.divider + 6} y={664} className="pt-tiny pt-engrave" transform={`rotate(90 ${L.divider + 6} 664)`}>LIAISONS FRIGORIFIQUES</text>

          {/* cables, behind everything */}
          <path d={`M${L.terminalBox.x + 14},612 V820 H${L.elecBox.x}`} className="pt-cable" />
          <path d={`M${L.condFan.cx + 40},${L.condFan.cy + 82} V300 H626 V690 H680 V${L.elecBox.y}`} className="pt-cable" />
          <path d={`M${L.evapFan.cx},${L.evapFan.cy + 72} V376 H1046 V${L.elecBox.y}`} className="pt-cable" />
          <path d={`M${solX + 27},${solY - 37} H690 V${L.elecBox.y}`} className="pt-cable thin" />

          {/* thin lines: capillaries and equaliser */}
          <Tube pts={L.kp5Cap} />
          <Tube pts={L.kp1Cap} />
          <Tube pts={L.equaliser} w={3.4} />
          <Tube pts={[[L.hpTee[0], L.hpTee[1]], [L.hpTee[0], L.hpTee[1] + 10]]} w={6} />
          <path d={view.bulbAttached ? roundPath(L.bulbCap, 8)
            : `${roundPath(L.bulbCap.slice(0, 3), 8)} Q1040,200 ${L.bulbLoose.x + 7},${L.bulbLoose.y}`} className="pt-capillary" />
          {[0, 1, 2, 3].map((i) => <circle key={i} cx={830 + i * 9} cy={85} r={8} className="pt-capillary" />)}

          {(['discharge', 'liquid', 'filterLine', 'liquidAfterFilter', 'evaporator', 'suction'] as const).map(pipe)}
          {L.clamps.map(([x, y, d]) => <Clamp key={`${x},${y}`} x={x} y={y} dir={d} />)}
          {L.arrows.map(([x, y, a]) => <FlowArrow key={`${x},${y}`} x={x} y={y} a={a} />)}

          <Target id="comp.condenser">
            <CoilBody c={L.condenser} state={seg.condenser} running={running} />
          </Target>
          <Target id="comp.evaporator">
            <CoilBody c={L.evaporator} state={seg.evaporator} running={running}>
              <rect x={L.evaporator.x - 8} y={L.evaporator.y + L.evaporator.h + 14} width={L.evaporator.w + 16} height={9} rx={2} fill="#9aa1a7" stroke="#5c636a" />
            </CoilBody>
          </Target>
          <Target id="comp.condFan"><Fan {...L.condFan} on={view.fans.cond} /></Target>
          <Target id="comp.evapFan"><Fan {...L.evapFan} on={view.fans.evap} /></Target>
          <Target id="comp.compressor"><Compressor running={running} fluid={view.fluid} /></Target>
          <Target id="comp.crankHeater"><CrankHeater on={!running} /></Target>
          <Target id="comp.receiver"><Receiver /></Target>
          <Target id="comp.filter"><Filter /></Target>
          <Target id="comp.sightglass"><SightGlass state={view.sightGlass} /></Target>
          <Target id="comp.kp5"><KP b={L.kp5} model="KP6" hp /></Target>
          <Target id="comp.kp1"><KP b={L.kp1} model="KP1" /></Target>
          <Target id="comp.solenoid"><Solenoid on={running} /></Target>
          <Target id="comp.txv"><TXV /></Target>
          <Target id="comp.txvBulb"><Bulb attached={view.bulbAttached} /></Target>
          <Target id="comp.thermostat"><Thermostat running={running} troom={view.troom} /></Target>
          <Target id="comp.elecBox"><ElecBox running={running} /></Target>
          {view.kvp && <Target id="comp.kvp"><Regulator c={L.anchors['comp.kvp']} model="KVP" reverse /></Target>}
          {view.kvr && <Target id="comp.kvr"><Regulator c={L.anchors['comp.kvr']} model="KVR" rotate={180} /></Target>}

          <Target id="valve.liquid"><ServiceValve c={L.liqValve} pos={view.valves['valve.liquid']} /></Target>
          <Target id="valve.gas"><ServiceValve c={L.gasValve} pos={view.valves['valve.gas']} big /></Target>
          <Target id="valve.receiver"><ReceiverValve pos={view.valves['valve.receiver']} /></Target>
          <Target id="port.hp"><Schrader from={[L.hpTee[0], L.hpTee[1] + 4]} to={L.anchors['port.hp']} hose={view.hoses['port.hp']} /></Target>
          <Target id="port.liq"><Schrader from={[L.anchors['port.liq'][0], L.liqValve[1] + 13]} to={L.anchors['port.liq']} hose={view.hoses['port.liq']} /></Target>
          <Target id="port.lp"><Schrader from={[L.anchors['port.lp'][0], L.gasValve[1] + 15]} to={L.anchors['port.lp']} hose={view.hoses['port.lp']} /></Target>
          <Target id="port.evap"><Schrader from={L.evapPortFrom} to={L.anchors['port.evap']} hose={view.hoses['port.evap']} right /></Target>

          <Joint id="joint.compDischarge" vertical braze />
          <Joint id="joint.compSuction" braze />
          <Joint id="joint.condIn" braze />
          <Joint id="joint.condOut" braze />
          <Joint id="joint.evapOut" braze />
          <Joint id="joint.filterIn" />
          <Joint id="joint.filterOut" />
          <Joint id="joint.txvIn" />
          <Joint id="joint.txvOut" />
          <Joint id="joint.liqValve" />
          <Joint id="joint.gasValve" />
          <Joint id="joint.kp1Cap" vertical />
          <Joint id="joint.kp5Cap" vertical />

          <g className="pt-frost-layer" pointerEvents="none">
            {frosted.map((k) => k in L.pipes
              ? segPaths(k as SegmentId).map((d, i) => <path key={k + i} d={d} className="pt-frost-seg" />)
              : FROST_BOX[k as ComponentId] && (({ x, y, w, h }: Box) => <rect key={k} x={x - 3} y={y - 3} width={w + 6} height={h + 6} rx={6} className="pt-frost-box" />)(FROST_BOX[k as ComponentId]!))}
          </g>
          {view.oilStains.map((j) => <OilStain key={j} at={L.anchors[j]} />)}

          {/* hoses under the plates so a hose never hides a label */}
          {(Object.keys(view.hoses) as (keyof typeof view.hoses)[]).map((p) => {
            const c = view.hoses[p];
            return c && <Hose key={p} port={p} color={c} />;
          })}
          <Plate x={215} y={316 - 12} text="CONDENSEUR" />
          <Plate x={440} y={292} text="VENTILATEUR COND." small />
          <Plate x={260} y={728} text="COMPRESSEUR SCROLL" />
          <Plate x={260} y={746} text="RÉS. DE CARTER" small />
          <Plate x={365} y={306} text="RÉSERVOIR" small />
          <Plate x={441} y={498} text="FILTRE DÉSHY." small />
          <Plate x={507} y={447} text="VOYANT" small />
          <Plate x={141} y={430} text="HP" small />
          <Plate x={433} y={642} text="BP" small />
          <Plate x={250} y={500} text="PRISE HP" small />
          <Plate x={578} y={522} text="V. LIQUIDE" small />
          <Plate x={365} y={491} text="V. RÉSERVOIR" small />
          <Plate x={1076} y={576} text="PRISE ÉVAP." small />
          <Plate x={655} y={650} text="V. GAZ 3 VOIES" small />
          <Plate x={628} y={502} text="ÉLECTROVANNE" small />
          <Plate x={760} y={260} text="DÉTENDEUR THERMO." small />
          <Plate x={860} y={346} text="ÉVAPORATEUR" />
          <Plate x={1050} y={372} text="BULBE" small />
          <Plate x={1098} y={290} text="VENTILATEUR ÉVAP." small />
          <Plate x={1098} y={506} text="THERMOSTAT" small />
          <Plate x={850} y={703} text="COFFRET ÉLECTRIQUE" />
          {view.kvp && <Plate x={800} y={644} text="KVP" small />}
          {view.kvr && <Plate x={100} y={538} text="KVR" small />}
          <text x={860} y={393} className="pt-tiny pt-engrave" textAnchor="middle">égalisation externe</text>

        </BoardCtx.Provider>
      </svg>
    </div>
  );
}

