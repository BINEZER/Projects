import { useMemo } from 'react';
import { daysLeft } from '../lib/progress';

export interface GRow {
  id: string;
  label: string;
  sub?: string;
  indent: number;
  start?: string;
  due?: string;
  progress?: number;
  tone: 'green' | 'amber' | 'red' | 'none' | 'accent';
  kind: 'portfolio' | 'program' | 'project' | 'phase' | 'sprint' | 'task';
  href?: string;
  /** Rendered before the label (expand toggle etc). */
  lead?: React.ReactNode;
  who?: React.ReactNode;
}

const DAY = 86_400_000;
const ms = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d).getTime(); };
const ROW = 38;
const TONE: Record<GRow['tone'], string> = { green: 'var(--accent)', amber: 'var(--warn)', red: 'var(--bad)', none: 'var(--ink-3)', accent: 'var(--accent)' };

/** Gantt-style timeline: one row per item, bars from start to due, progress filled in. */
export function Gantt({ rows, pxPerDay = 5, labelWidth = 260 }: { rows: GRow[]; pxPerDay?: number; labelWidth?: number }) {
  const view = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dates = rows.flatMap((r) => [r.start, r.due]).filter(Boolean).map((d) => ms(d as string));
    if (!dates.length) return null;
    const lo = Math.min(...dates, today.getTime()) - 7 * DAY, hi = Math.max(...dates, today.getTime()) + 14 * DAY;
    const start = new Date(lo); start.setDate(1); // snap to month start
    const days = Math.ceil((hi - start.getTime()) / DAY) + 1;
    const months: { left: number; label: string; width: number }[] = [];
    for (let d = new Date(start); d.getTime() < hi; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
      const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      months.push({ left: ((d.getTime() - start.getTime()) / DAY) * pxPerDay, width: ((next.getTime() - d.getTime()) / DAY) * pxPerDay, label: d.toLocaleDateString(undefined, { month: 'short', year: d.getMonth() === 0 || !months.length ? 'numeric' : undefined }) });
    }
    return { start: start.getTime(), days, months, todayX: ((today.getTime() - start.getTime()) / DAY) * pxPerDay };
  }, [rows, pxPerDay]);

  if (!view) return <div className="empty muted">Nothing to draw yet. Give projects (or phases, sprints and tasks) a start and due date and they appear here.</div>;
  const W = view.days * pxPerDay;
  const x = (s: string) => ((ms(s) - view.start) / DAY) * pxPerDay;

  return (
    <div className="gantt" style={{ ['--row' as string]: `${ROW}px` }}>
      <div className="g-left" style={{ width: labelWidth }}>
        <div className="g-head" />
        {rows.map((r) => (
          <div key={r.id} className={`g-label k-${r.kind}`} style={{ paddingLeft: 8 + r.indent * 16 }}>
            {r.lead}
            {r.href ? <a href={r.href} title={r.label}>{r.label}</a> : <span title={r.label}>{r.label}</span>}
            {r.who}
          </div>
        ))}
      </div>
      <div className="g-scroll">
        <div className="g-chart" style={{ width: W }}>
          <div className="g-head">{view.months.map((m) => <div key={m.left} className="g-month" style={{ left: m.left, width: m.width }}>{pxPerDay >= 3 ? m.label : ''}</div>)}</div>
          {view.months.map((m) => <i key={m.left} className="g-grid" style={{ left: m.left }} />)}
          {rows.map((r, i) => {
            const top = 38 + i * ROW;
            const hasBoth = r.start && r.due;
            const point = r.due && !r.start ? r.due : r.start && !r.due ? r.start : null;
            const overdue = r.due && (daysLeft(r.due) ?? 0) < 0 && (r.progress ?? 0) < 100;
            const color = overdue && r.tone !== 'none' ? 'var(--bad)' : TONE[r.tone];
            return (
              <div key={r.id} className="g-row" style={{ top, height: ROW }}>
                {hasBoth && (
                  <a className={`g-bar k-${r.kind}`} href={r.href} style={{ left: x(r.start as string), width: Math.max(8, x(r.due as string) - x(r.start as string) + pxPerDay), background: `color-mix(in srgb, ${color} 28%, var(--surface))`, borderColor: color }}
                    title={`${r.label}\n${r.start} → ${r.due}${r.progress !== undefined ? `\n${Math.round(r.progress)}% complete` : ''}`}>
                    {r.progress !== undefined && <b style={{ width: `${r.progress}%`, background: color }} />}
                  </a>
                )}
                {point && <a className="g-dot" href={r.href} style={{ left: x(point) - 7, background: color }} title={`${r.label}\n${point}`} />}
              </div>
            );
          })}
          <i className="g-today" style={{ left: view.todayX }}><span>Today</span></i>
        </div>
      </div>
    </div>
  );
}
