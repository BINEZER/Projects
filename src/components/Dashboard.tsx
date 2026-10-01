import { useMemo, useState } from 'react';
import type { Project } from '../types';
import { currentStage, daysLeft, dueLabel, isOverdue, progressOf } from '../lib/progress';
import { Kpi, Pill, Ring } from './ui';

export function ProjectCard({ p }: { p: Project }) {
  const pr = progressOf(p.stages);
  const cur = currentStage(p.stages);
  const n = daysLeft(p.due);
  return (
    <a className="card pcard" href={`#/p/${p.id}`}>
      <div className="row spread" style={{ alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <Pill text={p.category} />
          <h3>{p.title}</h3>
          <div className="small muted" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {p.status === 'done' ? 'Completed' : p.status === 'paused' ? 'Paused' : cur ? `Now: ${cur.name}` : 'No stages yet'}
          </div>
        </div>
        <Ring value={pr} size={58} stroke={6} />
      </div>
      <div className="bar segs" style={{ marginTop: 16 }}>
        {p.stages.map((s) => <i key={s.id} style={{ flex: Math.max(s.weight, 0.5) }}><b style={{ width: `${s.progress}%` }} /></i>)}
      </div>
      <div className="row spread small" style={{ marginTop: 12 }}>
        <span className="faint">{p.ref || `${p.stages.length} stages`}</span>
        {p.due && <span className={`tag ${isOverdue(p) ? 'bad' : n !== null && n <= 7 && p.status === 'active' ? 'warn' : ''}`}>{dueLabel(p.due)}</span>}
      </div>
    </a>
  );
}

export function Dashboard({ projects, categories, onNew, onSample }: { projects: Project[]; categories: string[]; onNew: () => void; onSample: () => void }) {
  const [cat, setCat] = useState('All');
  const [status, setStatus] = useState<'active' | 'paused' | 'done' | 'all'>('active');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'due' | 'progress' | 'updated'>('due');

  const stats = useMemo(() => {
    const active = projects.filter((p) => p.status === 'active');
    const avg = active.length ? active.reduce((s, p) => s + progressOf(p.stages), 0) / active.length : 0;
    return { active: active.length, avg, overdue: projects.filter(isOverdue).length, soon: active.filter((p) => { const n = daysLeft(p.due); return n !== null && n >= 0 && n <= 7; }).length, done: projects.filter((p) => p.status === 'done').length };
  }, [projects]);

  const attention = projects.filter((p) => p.status === 'active' && (isOverdue(p) || (daysLeft(p.due) ?? 99) <= 7)).sort((a, b) => (daysLeft(a.due) ?? 0) - (daysLeft(b.due) ?? 0));

  const list = projects
    .filter((p) => (cat === 'All' || p.category === cat) && (status === 'all' || p.status === status) && (!q || (p.title + p.ref + p.category).toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) =>
      sort === 'progress' ? progressOf(b.stages) - progressOf(a.stages)
      : sort === 'updated' ? b.updatedAt - a.updatedAt
      : (a.due ?? '9999').localeCompare(b.due ?? '9999'));

  const used = [...new Set(projects.map((p) => p.category))];
  const chips = ['All', ...categories.filter((c) => used.includes(c)), ...used.filter((c) => !categories.includes(c))];

  return (
    <>
      <div className="page-head">
        <div><h1>Dashboard</h1><div className="muted">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div></div>
        <button className="btn primary" onClick={onNew}>+ New project</button>
      </div>

      {projects.length === 0 ? (
        <div className="empty">
          <h2>Nothing tracked yet</h2>
          <p className="muted">Create your first project from a template, or explore with a few samples.</p>
          <div className="row" style={{ justifyContent: 'center' }}><button className="btn primary" onClick={onNew}>New project</button><button className="btn" onClick={onSample}>Load samples</button></div>
        </div>
      ) : (
        <div className="stack" style={{ gap: 22 }}>
          <div className="grid kpis">
            <Kpi v={stats.active} l="Active projects" />
            <Kpi v={`${Math.round(stats.avg)}%`} l="Avg. progress" />
            <Kpi v={stats.soon} l="Due in 7 days" tone={stats.soon ? 'var(--warn)' : undefined} />
            <Kpi v={stats.overdue} l="Overdue" tone={stats.overdue ? 'var(--bad)' : undefined} />
            <Kpi v={stats.done} l="Completed" />
          </div>

          {attention.length > 0 && (
            <div className="card">
              <h2 style={{ marginBottom: 8 }}>Needs attention</h2>
              {attention.slice(0, 5).map((p) => (
                <a key={p.id} href={`#/p/${p.id}`} className="row spread" style={{ padding: '8px 0', color: 'inherit', textDecoration: 'none', borderTop: '1px solid var(--line)' }}>
                  <span><b>{p.title}</b> <span className="muted small">· {currentStage(p.stages)?.name ?? p.category}</span></span>
                  <span className={`tag ${isOverdue(p) ? 'bad' : 'warn'}`}>{dueLabel(p.due)}</span>
                </a>
              ))}
            </div>
          )}

          <div className="row wrap spread">
            <div className="row wrap" style={{ gap: 6 }}>
              {chips.map((c) => <button key={c} className={`chip ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>{c}</button>)}
            </div>
            <div className="row wrap">
              <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} style={{ width: 'auto', borderRadius: 999 }} aria-label="Status filter">
                <option value="active">Active</option><option value="paused">Paused</option><option value="done">Done</option><option value="all">All</option>
              </select>
              <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} style={{ width: 'auto', borderRadius: 999 }} aria-label="Sort">
                <option value="due">Sort: due date</option><option value="progress">Sort: progress</option><option value="updated">Sort: recent</option>
              </select>
              <input className="search" type="text" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>

          {list.length ? <div className="grid cards">{list.map((p) => <ProjectCard key={p.id} p={p} />)}</div> : <div className="empty muted">No projects match these filters.</div>}
        </div>
      )}
    </>
  );
}
