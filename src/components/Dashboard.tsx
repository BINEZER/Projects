import { useMemo, useState } from 'react';
import type { Project } from '../types';
import type { Metrics } from '../lib/pm';
import { backlogProgress, HEALTH_LABEL } from '../lib/pm';
import { currentStage, daysLeft, dueLabel, isOverdue } from '../lib/progress';
import { HealthDot, Kpi, KindTag, MethodTag, Pill, Ring } from './ui';

export function ProjectCard({ p, m }: { p: Project; m: Metrics }) {
  const cur = currentStage(p.stages);
  const n = daysLeft(p.due);
  const container = p.kind !== 'project';
  const sub = p.status === 'done' ? 'Completed' : p.status === 'paused' ? 'Paused'
    : container ? `${m.children.length} item${m.children.length === 1 ? '' : 's'} inside`
    : p.method === 'agile' ? `${p.backlog.filter((i) => i.status !== 'done').length} items left` : cur ? `Now: ${cur.name}` : 'No phases yet';
  const done = p.backlog.filter((i) => i.status === 'done').length;
  return (
    <a className="card pcard" href={`#/p/${p.id}`}>
      <div className="row spread" style={{ alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <div className="row wrap" style={{ gap: 6 }}><Pill text={p.category} />{container && <KindTag kind={p.kind} />}{!container && p.method !== 'traditional' && <MethodTag method={p.method} />}</div>
          <h3>{p.title}</h3>
          <div className="small muted" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><HealthDot h={m.health} /> {sub}</div>
        </div>
        <Ring value={m.progress} size={58} stroke={6} />
      </div>
      <div className="bar segs" style={{ marginTop: 16 }}>
        {container ? <i style={{ flex: 1 }}><b style={{ width: `${m.progress}%` }} /></i>
          : p.method === 'agile' ? <i style={{ flex: 1 }}><b style={{ width: `${backlogProgress(p.backlog)}%` }} /></i>
          : p.stages.map((s) => <i key={s.id} style={{ flex: Math.max(s.weight, 0.5) }}><b style={{ width: `${s.source === 'backlog' ? backlogProgress(p.backlog.filter((x) => x.stageId === s.id)) : s.progress}%` }} /></i>)}
      </div>
      <div className="row spread small" style={{ marginTop: 12 }}>
        <span className="faint">{p.ref || (p.method === 'agile' && !container ? `${done}/${p.backlog.length} items` : container ? '' : `${p.stages.length} phases`)}</span>
        {p.due && <span className={`tag ${isOverdue(p) ? 'bad' : n !== null && n <= 7 && p.status === 'active' ? 'warn' : ''}`}>{dueLabel(p.due)}</span>}
      </div>
    </a>
  );
}

export function Dashboard({ projects, metrics, categories, onNew, onSample }: { projects: Project[]; metrics: Map<string, Metrics>; categories: string[]; onNew: () => void; onSample: () => void }) {
  const [cat, setCat] = useState('All');
  const [status, setStatus] = useState<'active' | 'paused' | 'done' | 'all'>('active');
  const [level, setLevel] = useState('all');
  const [method, setMethod] = useState('all');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'due' | 'progress' | 'health' | 'updated'>('due');
  const M = (p: Project) => metrics.get(p.id)!;

  const stats = useMemo(() => {
    const active = projects.filter((p) => p.status === 'active' && p.kind === 'project');
    const avg = active.length ? active.reduce((s, p) => s + metrics.get(p.id)!.progress, 0) / active.length : 0;
    const h = (k: string) => active.filter((p) => metrics.get(p.id)!.health === k).length;
    return { active: active.length, avg, green: h('green'), amber: h('amber'), red: h('red'), overdue: projects.filter(isOverdue).length, done: projects.filter((p) => p.status === 'done').length };
  }, [projects, metrics]);

  const attention = projects.filter((p) => p.status === 'active' && p.kind === 'project' && (M(p).health === 'red' || M(p).health === 'amber' || isOverdue(p)))
    .sort((a, b) => (M(a).health === 'red' ? 0 : 1) - (M(b).health === 'red' ? 0 : 1) || (daysLeft(a.due) ?? 999) - (daysLeft(b.due) ?? 999));
  const hrank = { red: 0, amber: 1, green: 2, none: 3 };

  const list = projects
    .filter((p) => (cat === 'All' || p.category === cat) && (status === 'all' || p.status === status) && (level === 'all' || p.kind === level) && (method === 'all' || (p.kind === 'project' && p.method === method)) && (!q || (p.title + (p.ref ?? '') + p.category).toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => sort === 'progress' ? M(b).progress - M(a).progress : sort === 'updated' ? b.updatedAt - a.updatedAt : sort === 'health' ? hrank[M(a).health] - hrank[M(b).health] : (a.due ?? '9999').localeCompare(b.due ?? '9999'));

  const used = [...new Set(projects.map((p) => p.category))];
  const chips = ['All', ...categories.filter((c) => used.includes(c)), ...used.filter((c) => !categories.includes(c))];
  const sel = { width: 'auto', borderRadius: 999 } as const;

  return (
    <>
      <div className="page-head">
        <div><h1>Dashboard</h1><div className="muted">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div></div>
        <button className="btn primary" onClick={onNew}>+ New</button>
      </div>

      {projects.length === 0 ? (
        <div className="empty">
          <h2>Nothing tracked yet</h2>
          <p className="muted">Create a project (traditional, agile or hybrid), or group them into programs and portfolios. Or explore with samples.</p>
          <div className="row" style={{ justifyContent: 'center' }}><button className="btn primary" onClick={onNew}>New</button><button className="btn" onClick={onSample}>Load samples</button></div>
        </div>
      ) : (
        <div className="stack" style={{ gap: 22 }}>
          <div className="grid kpis">
            <Kpi v={stats.active} l="Active projects" />
            <Kpi v={`${Math.round(stats.avg)}%`} l="Avg. progress" />
            <div className="card kpi"><div className="v row" style={{ gap: 14 }}>
              <span className="hlth"><i className="dot-h green" />{stats.green}</span><span className="hlth"><i className="dot-h amber" />{stats.amber}</span><span className="hlth"><i className="dot-h red" />{stats.red}</span></div><div className="l">Health: on track · at risk · off track</div></div>
            <Kpi v={stats.overdue} l="Overdue" tone={stats.overdue ? 'var(--bad)' : undefined} />
            <Kpi v={stats.done} l="Completed" />
          </div>

          {attention.length > 0 && (
            <div className="card">
              <h2 style={{ marginBottom: 8 }}>Needs attention</h2>
              {attention.slice(0, 6).map((p) => (
                <a key={p.id} href={`#/p/${p.id}`} className="row spread" style={{ padding: '8px 0', color: 'inherit', textDecoration: 'none', borderTop: '1px solid var(--line)' }}>
                  <span><HealthDot h={M(p).health} /> <b>{p.title}</b> <span className="muted small">· {HEALTH_LABEL[M(p).health]}{M(p).openRisks ? ` · ${M(p).openRisks} open risks` : ''}</span></span>
                  {p.due && <span className={`tag ${isOverdue(p) ? 'bad' : 'warn'}`}>{dueLabel(p.due)}</span>}
                </a>
              ))}
            </div>
          )}

          <div className="row wrap spread">
            <div className="row wrap" style={{ gap: 6 }}>{chips.map((c) => <button key={c} className={`chip ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>{c}</button>)}</div>
            <div className="row wrap">
              <select value={level} onChange={(e) => setLevel(e.target.value)} style={sel} aria-label="Level"><option value="all">All levels</option><option value="portfolio">Portfolios</option><option value="program">Programs</option><option value="project">Projects</option></select>
              <select value={method} onChange={(e) => setMethod(e.target.value)} style={sel} aria-label="Method"><option value="all">Any method</option><option value="traditional">Traditional</option><option value="agile">Agile</option><option value="hybrid">Hybrid</option></select>
              <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} style={sel} aria-label="Status filter"><option value="active">Active</option><option value="paused">Paused</option><option value="done">Done</option><option value="all">All</option></select>
              <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} style={sel} aria-label="Sort"><option value="due">Sort: due date</option><option value="health">Sort: health</option><option value="progress">Sort: progress</option><option value="updated">Sort: recent</option></select>
              <input className="search" type="text" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>
          {list.length ? <div className="grid cards">{list.map((p) => <ProjectCard key={p.id} p={p} m={M(p)} />)}</div> : <div className="empty muted">Nothing matches these filters.</div>}
        </div>
      )}
    </>
  );
}
