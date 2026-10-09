import { useMemo, useState } from 'react';
import type { Member, Project } from '../types';
import type { Metrics } from '../lib/pm';
import { stageProgress } from '../lib/pm';
import { Gantt, type GRow } from './Gantt';
import { Icon, I, Who } from './ui';

const rank = { portfolio: 0, program: 1, project: 2 };

/** Rows for one project: itself, its phases (with dates), sprints and dated tasks. */
export function detailRows(p: Project, team: Member[], indent: number): GRow[] {
  const rows: GRow[] = [];
  p.stages.filter((s) => s.start || s.due).forEach((s) => rows.push({ id: `s-${s.id}`, label: s.name, sub: 'Phase', indent, start: s.start, due: s.due, progress: stageProgress(s, p), tone: 'accent', kind: 'phase', href: `#/p/${p.id}`, who: <Who members={team} id={s.ownerId} /> }));
  [...p.sprints].sort((a, b) => a.start.localeCompare(b.start)).forEach((s) => {
    const items = p.backlog.filter((i) => i.sprintId === s.id);
    const total = items.reduce((t, i) => t + i.points, 0) || items.length;
    const done = items.filter((i) => i.status === 'done').reduce((t, i) => t + (items.some((x) => x.points) ? i.points : 1), 0);
    rows.push({ id: `sp-${s.id}`, label: s.name, sub: s.goal, indent, start: s.start, due: s.end, progress: total ? (done / total) * 100 : 0, tone: 'accent', kind: 'sprint', href: `#/p/${p.id}` });
  });
  p.backlog.filter((i) => i.due && i.status !== 'done').sort((a, b) => (a.due as string).localeCompare(b.due as string)).slice(0, 12)
    .forEach((i) => rows.push({ id: `t-${i.id}`, label: i.title, sub: 'Task', indent, due: i.due, tone: 'none', kind: 'task', href: `#/p/${p.id}`, who: <Who members={team} id={i.assigneeId} /> }));
  return rows;
}

const hasDetail = (p: Project) => p.kind === 'project' && (p.stages.some((s) => s.start || s.due) || p.sprints.length > 0 || p.backlog.some((i) => i.due && i.status !== 'done'));

/** Portfolio-wide Gantt chart. */
export function Timeline({ projects, metrics, team }: { projects: Project[]; metrics: Map<string, Metrics>; team: Member[] }) {
  const [px, setPx] = useState(5);
  const [scope, setScope] = useState<'active' | 'all'>('active');
  const [level, setLevel] = useState('all');
  const [cat, setCat] = useState('all');
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [undated, setUndated] = useState(false);

  const cats = [...new Set(projects.map((p) => p.category))].sort();
  const toggle = (id: string) => setOpen((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allDetail = projects.filter(hasDetail).map((p) => p.id);

  const { rows, hidden } = useMemo(() => {
    const ids = new Set(projects.map((p) => p.id));
    const kids = (id: string) => projects.filter((p) => p.parentId === id && p.id !== id);
    const span = (p: Project): { start?: string; due?: string } => {
      const k = kids(p.id).map(span);
      const starts = [p.start, ...k.map((x) => x.start)].filter(Boolean) as string[];
      const dues = [p.due, ...k.map((x) => x.due)].filter(Boolean) as string[];
      return { start: p.start ?? (starts.length ? starts.sort()[0] : undefined), due: p.due ?? (dues.length ? dues.sort().reverse()[0] : undefined) };
    };
    const out: GRow[] = [];
    let hidden = 0;
    const visible = (p: Project) => (scope === 'all' || p.status !== 'done') && (level === 'all' || p.kind === level || p.kind !== 'project') && (cat === 'all' || p.category === cat);
    const walk = (p: Project, indent: number) => {
      if (!visible(p)) return;
      const sp = span(p);
      if (!undated && !sp.start && !sp.due && !kids(p.id).length) { hidden++; return; }
      const m = metrics.get(p.id)!;
      const expandable = hasDetail(p);
      out.push({
        id: p.id, label: p.title, sub: p.kind, indent, start: sp.start, due: sp.due, progress: m.progress, tone: p.status === 'active' ? (m.health === 'none' ? 'accent' : m.health) : 'none', kind: p.kind, href: `#/p/${p.id}`,
        lead: expandable ? <button className="btn ghost sm" style={{ padding: '0 4px' }} aria-label={open.has(p.id) ? 'Collapse' : 'Expand'} onClick={() => toggle(p.id)}><Icon d={open.has(p.id) ? I.down : I.fwd} size={14} /></button> : <span style={{ width: 22, flex: 'none' }} />,
        who: <Who members={team} id={p.ownerId} />,
      });
      if (expandable && open.has(p.id)) out.push(...detailRows(p, team, indent + 1));
      [...kids(p.id)].sort((a, b) => rank[a.kind] - rank[b.kind] || (span(a).start ?? '9').localeCompare(span(b).start ?? '9')).forEach((c) => walk(c, indent + 1));
    };
    projects.filter((p) => !p.parentId || !ids.has(p.parentId)).sort((a, b) => rank[a.kind] - rank[b.kind] || (span(a).start ?? '9').localeCompare(span(b).start ?? '9')).forEach((p) => walk(p, 0));
    return { rows: out, hidden };
  }, [projects, metrics, team, scope, level, cat, open, undated]);

  const sel = { width: 'auto', borderRadius: 999 } as const;
  return (
    <>
      <div className="page-head">
        <div><h1>Timeline</h1><div className="muted">Every portfolio, program and project on one calendar. Click a bar to open it.</div></div>
        <div className="row wrap no-print">
          <button className="btn" onClick={() => window.print()}><Icon d={I.print} size={15} /> Print</button>
        </div>
      </div>
      <div className="row wrap no-print" style={{ marginBottom: 14, gap: 8 }}>
        <select style={sel} value={scope} onChange={(e) => setScope(e.target.value as 'active' | 'all')} aria-label="Status"><option value="active">Not finished</option><option value="all">Include finished</option></select>
        <select style={sel} value={level} onChange={(e) => setLevel(e.target.value)} aria-label="Level"><option value="all">All levels</option><option value="project">Projects only</option></select>
        <select style={sel} value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category"><option value="all">All categories</option>{cats.map((c) => <option key={c}>{c}</option>)}</select>
        <select style={sel} value={px} onChange={(e) => setPx(+e.target.value)} aria-label="Zoom"><option value={2.5}>Zoom: year</option><option value={5}>Zoom: quarter</option><option value={10}>Zoom: month</option><option value={20}>Zoom: weeks</option></select>
        <button className="btn sm" onClick={() => setOpen(open.size ? new Set() : new Set(allDetail))}>{open.size ? 'Collapse all' : 'Expand all'}</button>
        <label className="row small muted"><input type="checkbox" checked={undated} onChange={(e) => setUndated(e.target.checked)} /> Show items without dates</label>
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <Gantt rows={rows} pxPerDay={px} />
      </div>
      <div className="row wrap small muted" style={{ marginTop: 10, gap: 16 }}>
        <span><i className="dot-h green" /> On track</span><span><i className="dot-h amber" /> At risk</span><span><i className="dot-h red" /> Off track / overdue</span><span>Filled part = progress · ◆ = single date</span>
        {hidden > 0 && <span>{hidden} item{hidden === 1 ? '' : 's'} hidden (no dates)</span>}
      </div>
    </>
  );
}
