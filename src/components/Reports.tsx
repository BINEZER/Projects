import { Fragment, useMemo, useState } from 'react';
import type { Member, Project } from '../types';
import type { Metrics } from '../lib/pm';
import { HEALTH_LABEL, KIND_LABEL, METHOD_LABEL, stageProgress } from '../lib/pm';
import { currentStage, isOverdue } from '../lib/progress';
import { backlogCSV, download, expensesCSV, projectsCSV, risksCSV, stagesCSV, stamp, timeCSV } from '../lib/exporters';

import { HealthDot, Icon, I, Kpi, Pill, Who, idx, num } from './ui';

const COLORS = ['var(--accent)', 'var(--warn)', 'var(--ink-3)'];
const HCOL = { green: 'var(--accent)', amber: 'var(--warn)', red: 'var(--bad)' };

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

export function Reports({ projects, metrics, categories, workspace, currency, team }: { projects: Project[]; metrics: Map<string, Metrics>; categories: string[]; workspace: string; currency: string; team: Member[] }) {
  const [cat, setCat] = useState('All');
  const [status, setStatus] = useState('all');
  const [level, setLevel] = useState('all');
  const [method, setMethod] = useState('all');
  const [owner, setOwner] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [title, setTitle] = useState('Project report');
  const [detail, setDetail] = useState(true);
  const M = (p: Project) => metrics.get(p.id)!;

  const list = useMemo(() => projects.filter((p) =>
    (cat === 'All' || p.category === cat) && (status === 'all' || p.status === status) && (level === 'all' || p.kind === level) &&
    (method === 'all' || (p.kind === 'project' && p.method === method)) && (owner === 'all' || p.ownerId === owner) && (!from || (p.due ?? '') >= from) && (!to || (p.due ?? '9999') <= to)), [projects, cat, status, level, method, owner, from, to]);

  const m = useMemo(() => {
    const leaves = list.filter((p) => p.kind === 'project'); // money is summed at project level only, so nothing is counted twice
    const sum = (f: (x: Metrics) => number) => leaves.reduce((s, p) => s + f(metrics.get(p.id)!), 0);
    const byCat = new Map<string, Project[]>();
    list.forEach((p) => byCat.set(p.category, [...(byCat.get(p.category) ?? []), p]));
    const stage = new Map<string, number>();
    list.filter((p) => p.status === 'active' && p.kind === 'project' && p.method !== 'agile').forEach((p) => { const s = currentStage(p.stages); if (s) stage.set(s.name, (stage.get(s.name) ?? 0) + 1); });
    const months = Array.from({ length: 6 }, (_, i) => { const d = new Date(); d.setMonth(d.getMonth() - (5 - i), 1); return { key: d.toISOString().slice(0, 7), label: d.toLocaleDateString(undefined, { month: 'short' }), n: 0 }; });
    list.forEach((p) => { if (p.completedAt) { const k = new Date(p.completedAt).toISOString().slice(0, 7); const x = months.find((y) => y.key === k); if (x) x.n++; } });
    const avg = (xs: Project[]) => (xs.length ? xs.reduce((s, p) => s + metrics.get(p.id)!.progress, 0) / xs.length : 0);
    const bac = sum((x) => x.bac), ac = sum((x) => x.ac), ev = sum((x) => x.ev);
    return {
      avg: avg(list), bac, ac, ev,
      status: ['active', 'paused', 'done'].map((s, i) => ({ label: s[0].toUpperCase() + s.slice(1), v: list.filter((p) => p.status === s).length, c: COLORS[i] })),
      health: (['green', 'amber', 'red'] as const).map((h) => ({ label: HEALTH_LABEL[h], v: list.filter((p) => p.status === 'active' && M(p).health === h).length, c: HCOL[h] })),
      cats: [...byCat].map(([name, ps]) => ({ name, v: avg(ps), label: `${ps.length} · ${Math.round(avg(ps))}%` })),
      methods: (['traditional', 'agile', 'hybrid'] as const).map((k) => { const ps = leaves.filter((p) => p.method === k); return { name: METHOD_LABEL[k], v: avg(ps), label: `${ps.length} · ${Math.round(avg(ps))}%` }; }).filter((x) => x.label[0] !== '0'),
      stages: [...stage].sort((a, b) => b[1] - a[1]).slice(0, 6),
      months, maxM: Math.max(1, ...months.map((x) => x.n)),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, metrics]);

  const sel = { width: 'auto', borderRadius: 999 } as const;
  const c = currency ? ` ${currency}` : '';
  return (
    <>
      <div className="page-head">
        <div><h1>Reports</h1><div className="muted">Filter, then print or export exactly what you see.</div></div>
        <div className="row wrap no-print">
          <button className="btn" onClick={() => download(`projects-${stamp()}.csv`, projectsCSV(list, metrics, projects, team), 'text/csv')}><Icon d={I.download} size={15} /> Projects CSV</button>
          <button className="btn" onClick={() => download(`stages-${stamp()}.csv`, stagesCSV(list), 'text/csv')}><Icon d={I.download} size={15} /> Phases CSV</button>
          <button className="btn" onClick={() => download(`backlog-${stamp()}.csv`, backlogCSV(list, team), 'text/csv')}><Icon d={I.download} size={15} /> Backlog CSV</button>
          <button className="btn" onClick={() => download(`risks-${stamp()}.csv`, risksCSV(list), 'text/csv')}><Icon d={I.download} size={15} /> Risks CSV</button>
          <button className="btn" onClick={() => download(`expenses-${stamp()}.csv`, expensesCSV(list), 'text/csv')}><Icon d={I.download} size={15} /> Expenses CSV</button>
          <button className="btn" onClick={() => download(`time-${stamp()}.csv`, timeCSV(list, team), 'text/csv')}><Icon d={I.download} size={15} /> Time CSV</button>
          <button className="btn primary" onClick={() => window.print()}><Icon d={I.print} size={15} /> Print / PDF</button>
        </div>
      </div>

      <div className="card no-print" style={{ marginBottom: 16 }}>
        <div className="row wrap" style={{ gap: 12 }}>
          <label className="f" style={{ flex: '1 1 200px' }}>Report title<input type="text" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
          <label className="f">Level<select style={sel} value={level} onChange={(e) => setLevel(e.target.value)}><option value="all">All</option><option value="portfolio">Portfolios</option><option value="program">Programs</option><option value="project">Projects</option></select></label>
          <label className="f">Method<select style={sel} value={method} onChange={(e) => setMethod(e.target.value)}><option value="all">All</option><option value="traditional">Traditional</option><option value="agile">Agile</option><option value="hybrid">Hybrid</option></select></label>
          {team.length > 0 && <label className="f">Owner<select style={sel} value={owner} onChange={(e) => setOwner(e.target.value)}><option value="all">Anyone</option>{team.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>}
          <label className="f">Category<select style={sel} value={cat} onChange={(e) => setCat(e.target.value)}><option>All</option>{categories.map((x) => <option key={x}>{x}</option>)}</select></label>
          <label className="f">Status<select style={sel} value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All</option><option value="active">Active</option><option value="paused">Paused</option><option value="done">Done</option></select></label>
          <label className="f">Due from<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label className="f">Due to<input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
          <label className="row small muted" style={{ alignSelf: 'flex-end', paddingBottom: 10 }}><input type="checkbox" checked={detail} onChange={(e) => setDetail(e.target.checked)} /> Phase detail</label>
        </div>
      </div>

      <div className="stack" style={{ gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 22 }}>{title}</h2>
          <div className="muted small">{workspace} · {new Date().toLocaleDateString(undefined, { dateStyle: 'long' })} · {cat === 'All' ? 'All categories' : cat} · {status === 'all' ? 'All statuses' : status}{level !== 'all' && ` · ${KIND_LABEL[level as 'project']}s`}{method !== 'all' && ` · ${method}`}{(from || to) && ` · due ${from || '…'} → ${to || '…'}`}</div>
        </div>
        <div className="grid kpis">
          <Kpi v={list.length} l="Items" /><Kpi v={`${Math.round(m.avg)}%`} l="Avg. progress" />
          <Kpi v={list.filter(isOverdue).length} l="Overdue" tone={list.some(isOverdue) ? 'var(--bad)' : undefined} /><Kpi v={list.filter((p) => p.status === 'done').length} l="Completed" />
        </div>
        {m.bac > 0 && <div className="grid kpis"><Kpi v={num(m.bac)} l={`Budget${c}`} /><Kpi v={num(m.ac)} l={`Spent${c}`} /><Kpi v={num(m.ev)} l={`Value earned${c}`} /><Kpi v={idx(m.ac > 0 ? m.ev / m.ac : null)} l="Cost index (CPI)" /></div>}
        <div className="cols2">
          <div className="card"><h2 style={{ marginBottom: 14 }}>Health <span className="faint small">(active)</span></h2><Donut parts={m.health} /></div>
          <div className="card"><h2 style={{ marginBottom: 14 }}>Status</h2><Donut parts={m.status} /></div>
          <div className="card"><h2 style={{ marginBottom: 14 }}>By method <span className="faint small">(count · avg progress)</span></h2>{m.methods.length ? <HBars rows={m.methods} /> : <span className="muted">No projects</span>}</div>
          <div className="card"><h2 style={{ marginBottom: 14 }}>By category <span className="faint small">(count · avg progress)</span></h2>{m.cats.length ? <HBars rows={m.cats} /> : <span className="muted">No data</span>}</div>
          <div className="card"><h2 style={{ marginBottom: 14 }}>Completed per month</h2>
            <div className="row" style={{ alignItems: 'flex-end', height: 120, gap: 14, justifyContent: 'space-around' }}>
              {m.months.map((x) => <div key={x.key} style={{ textAlign: 'center', flex: 1 }}><div className="small muted">{x.n || ''}</div><div style={{ height: Math.max(4, (x.n / m.maxM) * 80), background: x.n ? 'var(--accent)' : 'var(--surface-2)', borderRadius: 6 }} /><div className="small faint" style={{ marginTop: 4 }}>{x.label}</div></div>)}
            </div></div>
          <div className="card"><h2 style={{ marginBottom: 14 }}>Where phased projects are now</h2>{m.stages.length ? <HBars rows={m.stages.map(([name, n]) => ({ name, v: (n / Math.max(...m.stages.map((s) => s[1]))) * 100, label: String(n) }))} /> : <span className="muted">No active phased projects</span>}</div>
        </div>

        <div className="card" style={{ overflowX: 'auto' }}>
          <h2 style={{ marginBottom: 8 }}>Detail</h2>
          <table className="t"><thead><tr><th>Name</th><th>Level</th><th>Owner</th><th>Health</th><th>Due</th><th>Progress</th><th>SPI</th><th>CPI</th><th>Hours</th><th>Now</th></tr></thead>
            <tbody>{list.map((p) => { const x = M(p); return (
              <Fragment key={p.id}>
                <tr><td><a href={`#/p/${p.id}`} style={{ color: 'inherit', fontWeight: 600 }}>{p.title}</a>{p.ref && <div className="small faint">{p.ref}</div>}</td>
                  <td>{KIND_LABEL[p.kind]}{p.kind === 'project' && <div className="small faint">{METHOD_LABEL[p.method]}</div>}</td><td>{team.length ? <Who members={team} id={p.ownerId} name /> : <Pill text={p.category} />}</td>
                  <td>{p.status === 'active' ? <HealthDot h={x.health} label /> : p.status}</td>
                  <td style={isOverdue(p) ? { color: 'var(--bad)' } : undefined}>{p.due ?? '—'}</td><td><b>{Math.round(x.progress)}%</b></td><td>{idx(x.spi)}</td><td>{idx(x.cpi)}</td><td>{x.hours ? `${Math.round(x.hours * 10) / 10}${x.estHours ? ` / ${x.estHours}` : ''}h` : '—'}</td>
                  <td>{p.kind !== 'project' ? `${x.children.length} inside` : p.method === 'agile' ? 'Backlog' : currentStage(p.stages)?.name ?? '—'}</td></tr>
                {detail && p.kind === 'project' && p.stages.length > 0 && <tr><td colSpan={10} className="small muted" style={{ borderTop: 0, paddingTop: 0 }}>{p.stages.map((s) => `${s.name} (${s.weight}w · ${Math.round(stageProgress(s, p))}%)`).join('  →  ')}</td></tr>}
                {detail && p.kind === 'project' && p.backlog.length > 0 && <tr><td colSpan={10} className="small muted" style={{ borderTop: 0, paddingTop: 0 }}>Backlog: {p.backlog.filter((i) => i.status === 'done').length}/{p.backlog.length} items done · {p.backlog.filter((i) => i.status === 'done').reduce((s, i) => s + i.points, 0)}/{p.backlog.reduce((s, i) => s + i.points, 0)} pts</td></tr>}
              </Fragment>); })}</tbody></table>
          {!list.length && <p className="muted">Nothing matches these filters.</p>}
        </div>
      </div>
    </>
  );
}
