import type { Hose, ToolId } from './types';
import { COLOR_FR } from './engine';

export const TOOL_LABELS: Record<string, string> = {
  hand: 'Main : bouchons, inspection',
  wrench: 'Clé de vanne de service',
  thermometer: 'Thermomètre à contact',
  clamp: 'Pince ampèremétrique',
  detector: 'Détecteur électronique',
  soap: 'Produit moussant',
  coreTool: 'Démonte-obus',
};

export const toolLabel = (t: ToolId, hoses: Hose[]) => {
  if (!t.startsWith('hose:')) return TOOL_LABELS[t] ?? t;
  const h = hoses.find((x) => `hose:${x.id}` === t);
  return h ? `Flexible ${COLOR_FR[h.color]}${h.id !== h.color ? ` (${h.id})` : ''}` : t;
};

export default function Toolbox({ tools, hoses, current, onPick }: {
  tools: ToolId[]; hoses: Hose[]; current: ToolId | null; onPick: (t: ToolId | null) => void;
}) {
  const all: ToolId[] = [...tools, ...hoses.map((h) => `hose:${h.id}` as ToolId)];
  return (
    <div className="lv-tools" role="toolbar" aria-label="Caisse à outils">
      {all.map((t) => {
        const h = hoses.find((x) => `hose:${x.id}` === t);
        return (
          <button key={t} type="button" aria-pressed={current === t} className={current === t ? 'active' : ''}
            onClick={() => onPick(current === t ? null : t)} title={toolLabel(t, hoses)}>
            {h && <span className={`lv-chip h-${h.color}`} aria-hidden="true" />}
            {toolLabel(t, hoses)}
          </button>
        );
      })}
    </div>
  );
}
