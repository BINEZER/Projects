import { useMemo, useState } from 'react';
import type { Project } from '../types';
import { currentStage, isOverdue, progressOf } from '../lib/progress';
import { download, projectsCSV, stagesCSV, stamp } from '../lib/exporters';
import { Icon, I, Kpi, Pill } from './ui';

const COLORS = ['var(--accent)', 'var(--warn)', 'var(--ink-3)'];

function Donut({ parts }: { parts: { label: string; v: number; c: string }[] }) {
  const total = parts.reduce((s, p) => s + p.v, 0) || 1;
  let acc = 0;
  const r = 52, C = 2 * Math.PI * r;
  return (
    <div className="row" style={{ gap: 24 }}>
      <svg width="130" height="130" viewBox="0 0 130 130" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="65" cy="65" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="16" />
        {parts.filter((p) => p.v).map((p) => { const len = (p.v / total) * C; const el = <circle key={p.label} cx="65" cy="65" r={r} fill="none" stroke={p.c} strokeWidth="16" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-acc} />; acc += len; return el; })}
      </svg>
      <div className="legend">{parts.map((p) => <div key={p.label}><span className="dot" style={{ background: p.c }} />{p.label} <b>{p.v}</b></div>)}</div>
    </div>
  );
}

function HBars({ rows }: { rows: { name: string; v: number; label?: string }[] }) {
  return <div className="stack" style={{ gap: 10 }}>{rows.map((r) => (
    <div className="hbar" key={r.name}><span className="nm" title={r.name}>{r.name}</span><div className="bar"><i style={{ width: `${Math.min(100, r.v)}%` }} /></div><span className="muted small">{r.label ?? `${Math.round(r.v)}%`}</span></div>
  ))}</div>;
}

export function Reports({ projects, categories, workspace }: { projects: Project[]; categories: string[]; workspace: string }) {
  const [cat, setCat] = useState('All');
  const [status, setStatus] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [title, setTitle] = useState('Project report');
  const [detail, setDetail] = useState(true);

  const list = useMemo(() => projects.filter((p) =>
    (cat === 'All' || p.category === cat) && (status === 'all' || p.status === status) &&
    (!from || (p.due ?? '') >= from) && (!to || (p.due ?? '9999') <= to)), [projects, cat, status, from, to]);

  const m = useMemo(() => {
    const byCat = new Map<string, Project[]>();
    list.forEach((p) => byCat.set(p.category, [...(byCat.get(p.category) ?? []), p]));
    const stage = new Map<string, number>();
    list.filter((p) => p.status === 'active').forEach((p) => { const s = currentStage(p.stages); if (s) stage.set(s.name, (stage.get(s.name) ?? 0) + 1); });
    const months = Array.from({ length: 6 }, (_, i) => { const d = new Date(); d.setMonth(d.getMonth() - (5 - i), 1); return { key: d.toISOString().slice(0, 7), label: d.toLocaleDateString(undefined, { month: 'short' }), n: 0 }; });
    list.forEach((p) => { if (p.completedAt) { const k = new Date(p.completedAt).toISOString().slice(0, 7); const x = months.find((y) => y.key === k); if (x) x.n++; } });
    return {
      avg: list.length ? list.reduce((s, p) => s + progressOf(p.stages), 0) / list.length : 0,
      status: ['active', 'paused', 'done'].map((s, i) => ({ label: s[0].toUpperCase() + s.slice(1), v: list.filter((p) => p.status === s).length, c: COLORS[i] })),
      cats: [...byCat].map(([name, ps]) => ({ name, v: ps.reduce((s, p) => s + progressOf(p.stages), 0) / ps.length, label: `${ps.length} · ${Math.round(ps.reduce((s, p) => s + progressOf(p.stages), 0) / ps.length)}%` })),
      stages: [...stage].sort((a, b) => b[1] - a[1]).slice(0, 6),
      months, maxM: Math.max(1, ...months.map((x) => x.n)),
    };
  }, [list]);

  const sel = { width: 'auto', borderRadius: 999 } as const;
  return (
    <>
      <div className="page-head">
        <div><h1>Reports</h1><div className="muted">Filter, then print or export exactly what you see.</div></div>
        <div className="row wrap no-print">
          <button className="btn" onClick={() => download(`projects-${stamp()}.csv`, projectsCSV(list), 'text/csv')}><Icon d={I.download} size={15} /> Projects CSV</button>
          <button className="btn" onClick={() => download(`stages-${stamp()}.csv`, stagesCSV(list), 'text/csv')}><Icon d={I.download} size={15} /> Stages CSV</button>
          <button className="btn primary" onClick={() => window.print()}><Icon d={I.print} size={15} /> Print / PDF</button>
        </div>
      </div>

      <div className="card no-print" style={{ marginBottom: 16 }}>
        <div className="row wrap" style={{ gap: 12 }}>
          <label className="f" style={{ flex: '1 1 200px' }}>Report title<input type="text" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
          <label className="f">Category<select style={sel} value={cat} onChange={(e) => setCat(e.target.value)}><option>All</option>{categories.map((c) => <option key={c}>{c}</option>)}</select></label>
          <label className="f">Status<select style={sel} value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All</option><option value="active">Active</option><option value="paused">Paused</option><option value="done">Done</option></select></label>
          <label className="f">Due from<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label className="f">Due to<input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
          <label className="row small muted" style={{ alignSelf: 'flex-end', paddingBottom: 10 }}><input type="checkbox" checked={detail} onChange={(e) => setDetail(e.target.checked)} /> Stage detail</label>
        </div>
      </div>

      <div className="stack" style={{ gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 22 }}>{title}</h2>
          <div className="muted small">{workspace} · {new Date().toLocaleDateString(undefined, { dateStyle: 'long' })} · {cat === 'All' ? 'All categories' : cat} · {status === 'all' ? 'All statuses' : status}{(from || to) && ` · due ${from || '…'} → ${to || '…'}`}</div>
        </div>
        <div className="grid kpis">
          <Kpi v={list.length} l="Projects" /><Kpi v={`${Math.round(m.avg)}%`} l="Avg. progress" />
          <Kpi v={list.filter(isOverdue).length} l="Overdue" tone={list.some(isOverdue) ? 'var(--bad)' : undefined} /><Kpi v={list.filter((p) => p.status === 'done').length} l="Completed" />
        </div>
        <div className="cols2">
          <div className="card"><h2 style={{ marginBottom: 14 }}>Status</h2><Donut parts={m.status} /></div>
          <div className="card"><h2 style={{ marginBottom: 14 }}>Completed per month</h2>
            <div className="row" style={{ alignItems: 'flex-end', height: 120, gap: 14, justifyContent: 'space-around' }}>
              {m.months.map((x) => <div key={x.key} style={{ textAlign: 'center', flex: 1 }}><div className="small muted">{x.n || ''}</div><div style={{ height: Math.max(4, (x.n / m.maxM) * 80), background: x.n ? 'var(--accent)' : 'var(--surface-2)', borderRadius: 6 }} /><div className="small faint" style={{ marginTop: 4 }}>{x.label}</div></div>)}
            </div></div>
          <div className="card"><h2 style={{ marginBottom: 14 }}>By category <span className="faint small">(count · avg progress)</span></h2>{m.cats.length ? <HBars rows={m.cats} /> : <span className="muted">No data</span>}</div>
          <div className="card"><h2 style={{ marginBottom: 14 }}>Where active projects are now</h2>{m.stages.length ? <HBars rows={m.stages.map(([name, n]) => ({ name, v: (n / Math.max(...m.stages.map((s) => s[1]))) * 100, label: String(n) }))} /> : <span className="muted">No active projects</span>}</div>
        </div>

        <div className="card" style={{ overflowX: 'auto' }}>
          <h2 style={{ marginBottom: 8 }}>Projects</h2>
          <table className="t"><thead><tr><th>Project</th><th>Category</th><th>Status</th><th>Due</th><th>Progress</th><th>Current stage</th></tr></thead>
            <tbody>{list.map((p) => (<>
              <tr key={p.id}><td><a href={`#/p/${p.id}`} style={{ color: 'inherit', fontWeight: 600 }}>{p.title}</a>{p.ref && <div className="small faint">{p.ref}</div>}</td><td><Pill text={p.category} /></td><td>{p.status}</td><td className={isOverdue(p) ? '' : ''} style={isOverdue(p) ? { color: 'var(--bad)' } : undefined}>{p.due ?? '—'}</td><td><b>{Math.round(progressOf(p.stages))}%</b></td><td>{currentStage(p.stages)?.name ?? '—'}</td></tr>
              {detail && p.stages.length > 0 && <tr key={p.id + 's'}><td colSpan={6} className="small muted" style={{ borderTop: 0, paddingTop: 0 }}>{p.stages.map((s) => `${s.name} (${s.weight}w · ${s.progress}%)`).join('  →  ')}</td></tr>}
            </>))}</tbody></table>
          {!list.length && <p className="muted">No projects match these filters.</p>}
        </div>
      </div>
    </>
  );
}
