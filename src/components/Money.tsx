import type { Project } from '../types';
import type { Metrics } from '../lib/pm';
import { Kpi, idx, num } from './ui';

const read = (label: string, v: number | null, good: string, bad: string, warn: string) =>
  v === null ? null : <li><b>{label} {v.toFixed(2)}</b> — {v >= 1 ? good : v >= 0.9 ? warn : bad}</li>;

/** Schedule & budget: earned value management (EVM) in plain language. */
export function Money({ p, m, currency, onSave }: { p: Project; m: Metrics; currency: string; onSave: (p: Project) => void }) {
  const container = p.kind !== 'project';
  const eac = m.cpi && m.cpi > 0 && m.bac ? m.bac / m.cpi : null;
  const c = currency ? ` ${currency}` : '';
  return (
    <div className="stack" style={{ gap: 16 }}>
      {!container && (
        <div className="card row wrap" style={{ gap: 14 }}>
          <label className="f" style={{ flex: '1 1 140px' }}>Start date<input type="date" value={p.start ?? ''} onChange={(e) => onSave({ ...p, start: e.target.value || undefined })} /></label>
          <label className="f" style={{ flex: '1 1 140px' }}>Due date<input type="date" value={p.due ?? ''} onChange={(e) => onSave({ ...p, due: e.target.value || undefined })} /></label>
          <label className="f" style={{ flex: '1 1 140px' }}>Budget{c}<input type="number" min={0} value={p.budget ?? ''} onChange={(e) => onSave({ ...p, budget: e.target.value === '' ? undefined : Math.max(0, +e.target.value) })} /></label>
          <label className="f" style={{ flex: '1 1 140px' }}>Actual cost so far{c}<input type="number" min={0} value={p.actualCost ?? ''} onChange={(e) => onSave({ ...p, actualCost: e.target.value === '' ? undefined : Math.max(0, +e.target.value) })} /></label>
        </div>
      )}
      <div className="grid kpis">
        <Kpi v={`${Math.round(m.progress)}%`} l="Complete (actual)" />
        <Kpi v={m.planned === null ? '—' : `${Math.round(m.planned)}%`} l="Should be complete (plan)" />
        <Kpi v={idx(m.spi)} l="Schedule index (SPI)" tone={m.spi !== null && m.spi < 0.9 ? 'var(--bad)' : undefined} />
        <Kpi v={idx(m.cpi)} l="Cost index (CPI)" tone={m.cpi !== null && m.cpi < 0.95 ? 'var(--bad)' : undefined} />
      </div>
      <div className="grid kpis">
        <Kpi v={m.bac ? num(m.bac) : '—'} l={`Budget${c}`} />
        <Kpi v={m.ac ? num(m.ac) : '—'} l={`Spent${c}`} />
        <Kpi v={m.bac ? num(m.ev) : '—'} l={`Value earned${c}`} />
        <Kpi v={eac ? num(eac) : '—'} l={`Forecast total${c}`} tone={eac && eac > m.bac * 1.05 ? 'var(--bad)' : undefined} />
      </div>
      <div className="card">
        <h2 style={{ marginBottom: 8 }}>What this means</h2>
        {m.spi === null && m.cpi === null ? <p className="muted" style={{ margin: 0 }}>Add a start date, due date and budget, then keep “actual cost” up to date to see schedule and cost performance.</p> : (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {read('SPI', m.spi, 'on or ahead of schedule.', 'significantly behind schedule.', 'slightly behind schedule.')}
            {read('CPI', m.cpi, 'on or under budget.', 'significantly over budget.', 'slightly over budget.')}
            {eac && m.bac > 0 && <li>At the current spending rate the project is forecast to cost <b>{num(eac)}{c}</b> against a budget of {num(m.bac)}{c}.</li>}
          </ul>
        )}
        <p className="small faint" style={{ marginBottom: 0 }}>SPI = value earned ÷ value planned. CPI = value earned ÷ money spent. 1.00 means exactly on plan. Amounts are shown as entered; the app never converts currencies.</p>
      </div>
    </div>
  );
}
