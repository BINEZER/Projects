import { useMemo, useState } from 'react';
import type { ItemStatus, Member, Project } from '../types';
import { daysLeft } from '../lib/progress';
import { hoursLogged, stageProgress } from '../lib/pm';
import { Icon, I, Kpi, Who } from './ui';

interface Row {
  key: string;
  type: 'task' | 'phase';
  title: string;
  project: Project;
  who?: string;
  due?: string;
  status: ItemStatus;
  est: number;
  logged: number;
  itemId?: string;
}

const NEXT: Record<ItemStatus, ItemStatus> = { todo: 'doing', doing: 'done', done: 'todo' };

/** Everyone's tasks and phases across all projects: who is doing what, and who is overloaded. */
export function Work({ projects, team, me, onSave }: { projects: Project[]; team: Member[]; me?: Member; onSave: (p: Project) => void }) {
  const [who, setWho] = useState<string>(me ? me.id : 'all');
  const [state, setState] = useState<'open' | 'all' | 'done'>('open');
  const [window_, setWindow] = useState<'any' | 'overdue' | 'week'>('any');
  const [q, setQ] = useState('');

  const rows = useMemo(() => {
    const out: Row[] = [];
    for (const p of projects) {
      if (p.status === 'done' && state === 'open') continue;
      for (const i of p.backlog) out.push({ key: i.id, type: 'task', title: i.title, project: p, who: i.assigneeId, due: i.due, status: i.status, est: i.estimateHours ?? 0, logged: p.time.filter((t) => t.itemId === i.id).reduce((s, t) => s + t.hours, 0), itemId: i.id });
      for (const s of p.stages) if (s.ownerId) { const pr = stageProgress(s, p); out.push({ key: s.id, type: 'phase', title: s.name, project: p, who: s.ownerId, due: s.due, status: pr >= 100 ? 'done' : pr > 0 ? 'doing' : 'todo', est: 0, logged: 0 }); }
    }
    return out;
  }, [projects, state]);

  const shown = rows.filter((r) => {
    if (who === 'none' ? !!r.who && team.some((m) => m.id === r.who) : who !== 'all' && r.who !== who) return false;
    if (state === 'open' && r.status === 'done') return false;
    if (state === 'done' && r.status !== 'done') return false;
    const d = daysLeft(r.due);
    if (window_ === 'overdue' && !(d !== null && d < 0 && r.status !== 'done')) return false;
    if (window_ === 'week' && !(d !== null && d <= 7 && r.status !== 'done')) return false;
    return !q || (r.title + r.project.title).toLowerCase().includes(q.toLowerCase());
  });

  const open = rows.filter((r) => r.status !== 'done');
  const overdue = open.filter((r) => (daysLeft(r.due) ?? 1) < 0);
  const load = team.map((m) => {
    const mine = open.filter((r) => r.who === m.id);
    return { m, n: mine.length, od: mine.filter((r) => (daysLeft(r.due) ?? 1) < 0).length, h: mine.reduce((s, r) => s + Math.max(0, r.est - r.logged), 0) };
  });
  const maxN = Math.max(1, ...load.map((l) => l.n));
  const groups = [...team.map((m) => ({ id: m.id as string | undefined, name: m.name })), { id: undefined, name: 'Unassigned' }]
    .map((g) => ({ ...g, items: shown.filter((r) => (g.id ? r.who === g.id : !r.who || !team.some((m) => m.id === r.who))).sort((a, b) => (a.due ?? '9').localeCompare(b.due ?? '9')) }))
    .filter((g) => g.items.length);
  const loggedWeek = projects.reduce((s, p) => s + p.time.filter((t) => (daysLeft(t.date) ?? 99) >= -7).reduce((x, t) => x + t.hours, 0), 0);
  const sel = { width: 'auto', borderRadius: 999 } as const;

  const cycle = (r: Row) => {
    if (r.type !== 'task' || !r.itemId) return;
    const st = NEXT[r.status];
    onSave({ ...r.project, backlog: r.project.backlog.map((i) => (i.id === r.itemId ? { ...i, status: st, doneAt: st === 'done' ? Date.now() : undefined } : i)) });
  };

  return (
    <>
      <div className="page-head"><div><h1>Work</h1><div className="muted">Who is doing what, across every project.</div></div></div>
      <div className="stack" style={{ gap: 16 }}>
        <div className="grid kpis">
          <Kpi v={open.length} l="Open tasks & phases" /><Kpi v={overdue.length} l="Overdue" tone={overdue.length ? 'var(--bad)' : undefined} />
          <Kpi v={open.filter((r) => !r.who).length} l="Unassigned" tone={open.some((r) => !r.who) ? 'var(--warn)' : undefined} /><Kpi v={`${Math.round(loggedWeek * 10) / 10}h`} l="Logged, last 7 days" />
        </div>

        {team.length > 0 && (
          <div className="card"><h2 style={{ marginBottom: 12 }}>Workload</h2>
            <div className="stack" style={{ gap: 10 }}>
              {load.map(({ m, n, od, h }) => (
                <div className="hbar" key={m.id} style={{ gridTemplateColumns: '170px 1fr 210px' }}>
                  <span className="nm"><Who members={team} id={m.id} name /></span>
                  <div className="bar"><i style={{ width: `${(n / maxN) * 100}%`, background: od ? 'var(--warn)' : undefined }} /></div>
                  <span className="muted small">{n} open{od ? ` · ${od} overdue` : ''}{h ? ` · ~${Math.round(h)}h left` : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="row wrap no-print" style={{ gap: 8 }}>
          <select style={sel} value={who} onChange={(e) => setWho(e.target.value)} aria-label="Person"><option value="all">Everyone</option>{me && <option value={me.id}>Me ({me.name})</option>}{team.filter((m) => m.id !== me?.id).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}<option value="none">Unassigned</option></select>
          <select style={sel} value={state} onChange={(e) => setState(e.target.value as typeof state)} aria-label="State"><option value="open">Open</option><option value="all">All</option><option value="done">Done</option></select>
          <select style={sel} value={window_} onChange={(e) => setWindow(e.target.value as typeof window_)} aria-label="Due"><option value="any">Any date</option><option value="overdue">Overdue</option><option value="week">Due within 7 days</option></select>
          <input className="search" type="text" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        {team.length === 0 && <div className="banner">Add your team in Admin → Team, then assign owners on projects, phases and tasks. You can already see all tasks here.</div>}
        {groups.length === 0 && <div className="empty muted">Nothing matches. Add tasks in a project’s Tasks (traditional) or Backlog (agile) tab.</div>}
        {groups.map((g) => (
          <div className="card" key={g.name}>
            <h2 style={{ marginBottom: 6 }}>{g.id ? <Who members={team} id={g.id} name /> : g.name} <span className="faint small">{g.items.length}</span></h2>
            {g.items.map((r) => {
              const d = r.status !== 'done' ? daysLeft(r.due) : null;
              return (
                <div key={r.key} className="trow2">
                  <button className={`check ${r.status === 'done' ? 'done' : r.status === 'doing' ? 'part' : ''}`} style={{ ['--p' as string]: 50 }} disabled={r.type === 'phase'} aria-label={`Cycle status of ${r.title}`} onClick={() => cycle(r)}><Icon d={I.check} size={15} /></button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className={r.status === 'done' ? 'name done' : 'name'} style={{ fontWeight: 560 }}>{r.title}</div>
                    <div className="small faint"><a href={`#/p/${r.project.id}`}>{r.project.title}</a> · {r.type === 'phase' ? 'Phase' : 'Task'}{r.est ? ` · est ${r.est}h` : ''}{r.logged ? ` · ${Math.round(r.logged * 10) / 10}h logged` : ''}{hoursLogged(r.project) && r.type === 'phase' ? '' : ''}</div>
                  </div>
                  {r.due && <span className={`tag ${d !== null && d < 0 ? 'bad' : d !== null && d <= 3 ? 'warn' : ''}`}>{r.due}</span>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
}
