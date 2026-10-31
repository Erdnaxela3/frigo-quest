import './instruments.css';

const MICRONS_PER_BAR = 750_061.7;
const LO = 1, HI = Math.log10(760_000); // log10 µm: 10 µm … atmosphere
const TICKS: [number, string][] = [[10, '10'], [100, '100'], [1000, '1k'], [10_000, '10k'], [100_000, '100k'], [760_000, 'atm']];
const pos = (um: number) => `${(100 * (Math.log10(Math.max(10, Math.min(760_000, um))) - LO)) / (HI - LO)}%`;

export default function VacuumGauge({ pAbs }: { pAbs: number }) {
  const um = Math.max(0, pAbs) * MICRONS_PER_BAR;
  const over = pAbs > 1.1;
  const mbar = pAbs * 1000;
  const umTxt = over ? 'OL' : Math.round(um).toLocaleString('fr-FR');
  const mbarTxt = over ? '> 1100' : mbar < 10 ? mbar.toFixed(2).replace('.', ',') : Math.round(mbar).toLocaleString('fr-FR');
  return (
    <div className="inst-vac-dev" role="status" aria-label={`Vacuomètre : ${umTxt} microns, ${mbarTxt} mbar`}>
      <div className="inst-vac-head">VACUOMÈTRE</div>
      <div className="inst-lcd-panel">
        <div className="inst-vac-big">{umTxt}<small>µm Hg</small></div>
        <div className="inst-vac-small">{mbarTxt} <small>mbar abs</small></div>
        <div className="inst-vac-bar">
          <div className="inst-vac-fill" style={{ width: over ? '100%' : pos(um) }} />
          {TICKS.map(([v, t]) => <span key={v} className="inst-vac-tick" style={{ left: pos(v) }}>{t}</span>)}
        </div>
      </div>
    </div>
  );
}
