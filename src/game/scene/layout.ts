import type { PortId, SegmentId, TargetId } from '../sceneIds';

export type Pt = readonly [number, number];
export interface Box { x: number; y: number; w: number; h: number }
export interface Coil extends Box { rows: number[]; x0: number; x1: number }

const rows = (from: number, n: number, step: number) => Array.from({ length: n }, (_, i) => from + i * step);

const condenser: Coil = { x: 110, y: 98, w: 210, h: 184, rows: rows(110, 9, 20), x0: 100, x1: 330 };
const evaporator: Coil = { x: 760, y: 118, w: 200, h: 184, rows: rows(290, 9, -20), x0: 750, x1: 970 };

// Single source of truth for the PLATINE board geometry (viewBox 0 0 1200 900, ~1 unit = 1 mm).
export const PLATINE_LAYOUT = {
  size: { w: 1200, h: 900 },
  board: { x: 20, y: 20, w: 1160, h: 860 },
  divider: 610,
  condenser,
  evaporator,
  condFan: { cx: 440, cy: 194, r: 70 },
  evapFan: { cx: 1098, cy: 210, r: 60 },
  compressor: { x: 195, y: 505, w: 130, h: 195 },
  crankHeater: { x: 191, y: 662, w: 138, h: 14 },
  terminalBox: { x: 168, y: 560, w: 28, h: 52 },
  receiver: { x: 345, y: 318, w: 40, h: 124 },
  filter: { x: 410, y: 458, w: 62, h: 24 },
  sightglass: [507, 470] as Pt,
  liqValve: [548, 470] as Pt,
  gasValve: [570, 620] as Pt,
  kp5: { x: 112, y: 318, w: 58, h: 96 },
  kp1: { x: 404, y: 506, w: 58, h: 94 },
  solenoid: [628, 470] as Pt,
  txv: [705, 290] as Pt,
  bulb: { x: 1005, y: 296, w: 14, h: 64 },
  bulbLoose: { x: 1032, y: 300, w: 14, h: 64 },
  thermostat: { x: 1056, y: 380, w: 84, h: 110 },
  elecBox: { x: 660, y: 712, w: 380, h: 150 },
  // Flow order matters: the running animation and arrows follow the point order.
  pipes: {
    discharge: [[[282, 512], [282, 465], [70, 465], [70, 110], [100, 110]]],
    condenser: [],
    liquid: [[[330, 270], [365, 270], [365, 318]], [[365, 442], [365, 470], [410, 470]]],
    liquidAfterFilter: [[[472, 470], [655, 470], [655, 290], [688, 290]]],
    evaporator: [[[722, 290], [750, 290]]],
    suction: [[[970, 130], [1000, 130], [1000, 620], [322, 620]]],
  } as Record<SegmentId, Pt[][]>,
  kp5Cap: [[141, 414], [141, 465]] as Pt[],
  kp1Cap: [[433, 600], [433, 620]] as Pt[],
  equaliser: [[1000, 400], [722, 400], [722, 302]] as Pt[],
  bulbCap: [[705, 249], [705, 85], [1012, 85], [1012, 296]] as Pt[],
  hpTee: [215, 465] as Pt,
  arrows: [[70, 290, -90], [365, 296, 90], [600, 470, 0], [655, 380, -90], [1000, 420, 90], [800, 620, 180], [370, 620, 180], [160, 465, 180]] as [number, number, number][],
  clamps: [[70, 200, 'v'], [70, 380, 'v'], [1000, 520, 'v'], [1000, 220, 'v'], [880, 620, 'h'], [720, 620, 'h'], [655, 400, 'v'], [250, 465, 'h']] as [number, number, 'h' | 'v'][],
  hoseEnd: { 'port.hp': [140, 900], 'port.liq': [480, 900], 'port.lp': [596, 900] } as Record<PortId, Pt>,
  anchors: {
    'port.hp': [215, 492],
    'port.lp': [580, 658],
    'port.liq': [536, 506],
    'valve.liquid': [548, 470],
    'valve.gas': [570, 620],
    'comp.compressor': [260, 600],
    'comp.crankHeater': [260, 669],
    'comp.condenser': [215, 190],
    'comp.condFan': [440, 194],
    'comp.receiver': [365, 380],
    'comp.filter': [441, 470],
    'comp.sightglass': [507, 470],
    'comp.solenoid': [628, 450],
    'comp.txv': [705, 285],
    'comp.txvBulb': [1012, 328],
    'comp.evaporator': [860, 210],
    'comp.evapFan': [1098, 210],
    'comp.kp1': [433, 553],
    'comp.kp5': [141, 366],
    'comp.thermostat': [1098, 435],
    'comp.elecBox': [850, 787],
    'joint.compDischarge': [282, 497],
    'joint.compSuction': [336, 620],
    'joint.condIn': [88, 110],
    'joint.condOut': [345, 270],
    'joint.filterIn': [404, 470],
    'joint.filterOut': [479, 470],
    'joint.txvIn': [684, 290],
    'joint.txvOut': [726, 290],
    'joint.evapOut': [985, 130],
    'joint.liqValve': [578, 470],
    'joint.gasValve': [600, 620],
    'joint.kp1Cap': [433, 609],
    'joint.kp5Cap': [141, 456],
  } satisfies Record<TargetId, Pt> as Record<TargetId, Pt>,
};

/** Polyline with rounded corners (copper bends). */
export function roundPath(pts: readonly Pt[], r = 14): string {
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i - 1], [cx, cy] = pts[i], [nx, ny] = pts[i + 1];
    const l1 = Math.hypot(cx - px, cy - py), l2 = Math.hypot(nx - cx, ny - cy);
    const k1 = Math.min(r, l1 / 2) / l1, k2 = Math.min(r, l2 / 2) / l2;
    d += ` L${cx - (cx - px) * k1},${cy - (cy - py) * k1} Q${cx},${cy} ${cx + (nx - cx) * k2},${cy + (ny - cy) * k2}`;
  }
  const [lx, ly] = pts[pts.length - 1];
  return `${d} L${lx},${ly}`;
}

/** Serpentine coil: enters on the left of rows[0], hairpin bends outside the fins. */
export function coilPath(c: Coil): string {
  let d = `M${c.x0},${c.rows[0]}`;
  c.rows.forEach((y, i) => {
    const right = i % 2 === 0;
    d += ` H${right ? c.x1 : c.x0}`;
    const next = c.rows[i + 1];
    if (next === undefined) return;
    const r = Math.abs(next - y) / 2;
    const sweep = right === next > y ? 1 : 0;
    d += ` A${r},${r} 0 0 ${sweep} ${right ? c.x1 : c.x0},${next}`;
  });
  return d;
}
