import { useState } from 'react';
import type { Item, ItemStatus, Member, Project, Sprint } from '../types';
import { uid } from '../lib/progress';
import { activeSprint, addDays, backlogProgress, burndown, isoDay, sprintPoints, velocity } from '../lib/pm';
import { Icon, I, Kpi, Modal, Who } from './ui';
import { TaskForm } from './Tasks';

const COLS: [ItemStatus, string][] = [['todo', 'To do'], ['doing', 'In progress'], ['done', 'Done']];
const ORDER: ItemStatus[] = ['todo', 'doing', 'done'];

function Burndown({ p, sprint }: { p: Project; sprint: Sprint }) {
  const d = burndown(p, sprint);
  const max = Math.max(1, d[0].ideal);
  const W = 360, H = 150, pad = 24;
  const x = (i: number) => pad + (i / Math.max(1, d.length - 1)) * (W - pad * 2);
  const y = (v: number) => H - pad - (v / max) * (H - pad * 2);
  const line = (k: 'ideal' | 'actual') => d.filter((r) => r[k] !== null).map((r, i) => `${i ? 'L' : 'M'}${x(r.day)},${y(r[k] as number)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Sprint burndown">
      <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="var(--line)" /><line x1={pad} y1={pad} x2={pad} y2={H - pad} stroke="var(--line)" />
      <path d={line('ideal')} fill="none" stroke="var(--ink-3)" strokeDasharray="4 4" strokeWidth="2" />
      <path d={line('actual')} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {d.filter((r) => r.actual !== null).slice(-1).map((r) => <circle key="now" cx={x(r.day)} cy={y(r.actual as number)} r="4.5" fill="var(--accent)" />)}
      <text x={pad} y={12} fontSize="10" fill="var(--ink-3)">{Math.round(max)} pts</text>
      <text x={W - pad} y={H - 6} fontSize="10" fill="var(--ink-3)" textAnchor="end">{sprint.end}</text>
    </svg>
  );
}

function Velocity({ p }: { p: Project }) {
  const v = velocity(p);
  const max = Math.max(1, ...v.map((x) => x.done));
  if (!v.length) return <span className="muted small">Starts once a sprint has begun.</span>;
  return (
    <div className="row" style={{ alignItems: 'flex-end', height: 130, gap: 12, justifyContent: 'space-around' }}>
      {v.map(({ sprint, done }) => (
        <div key={sprint.id} style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
          <div className="small muted">{done}</div>
          <div style={{ height: Math.max(4, (done / max) * 80), background: done ? 'var(--accent)' : 'var(--surface-2)', borderRadius: 6 }} />
          <div className="small faint" style={{ marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sprint.name}</div>
        </div>
      ))}
    </div>
  );
}

function SprintForm({ sprint, onSave, onDelete, onClose }: { sprint: Sprint; onSave: (s: Sprint) => void; onDelete?: () => void; onClose: () => void }) {
  const [s, setS] = useState(sprint);
  return (
    <Modal onClose={onClose}>
      <div className="stack">
        <h2>{onDelete ? 'Edit sprint' : 'New sprint'}</h2>
        <label className="f">Name<input type="text" autoFocus value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} /></label>
        <div className="row"><label className="f" style={{ flex: 1 }}>Start<input type="date" value={s.start} onChange={(e) => setS({ ...s, start: e.target.value })} /></label>
          <label className="f" style={{ flex: 1 }}>End<input type="date" value={s.end} onChange={(e) => setS({ ...s, end: e.target.value })} /></label></div>
        <label className="f">Sprint goal<input type="text" value={s.goal} onChange={(e) => setS({ ...s, goal: e.target.value })} /></label>
        <div className="row spread">{onDelete ? <button className="btn danger" onClick={onDelete}>Delete sprint</button> : <span />}
          <div className="row"><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" disabled={!s.name.trim() || !s.start || !s.end || s.end < s.start} onClick={() => onSave(s)}>Save</button></div></div>
      </div>
    </Modal>
  );
}

/** Backlog, sprint board, burndown and velocity: the agile side of a project. */
export function Agile({ p, team, onSave, log }: { p: Project; team: Member[]; onSave: (p: Project) => void; log: (text: string) => Project['log'][number] }) {
  const cur = activeSprint(p);
  const [scope, setScope] = useState<string>(cur?.id ?? 'all');
  const [title, setTitle] = useState('');
  const [points, setPoints] = useState('3');
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [editSprint, setEditSprint] = useState<{ s: Sprint; isNew: boolean } | null>(null);

  const phases = p.stages.filter((s) => s.source === 'backlog');
  const sprintId = scope !== 'all' && scope !== 'backlog' ? scope : undefined;
  const shown = p.backlog.filter((i) => scope === 'all' ? true : scope === 'backlog' ? !i.sprintId : i.sprintId === scope);
  const sprint = p.sprints.find((s) => s.id === scope) ?? cur;
  const v = velocity(p).filter((x) => x.sprint.end < isoDay(Date.now()));
  const avgV = v.length ? v.reduce((s, x) => s + x.done, 0) / v.length : null;
  const remaining = p.backlog.filter((i) => i.status !== 'done').reduce((s, i) => s + i.points, 0);

  const put = (items: Item[]) => onSave({ ...p, backlog: items });
  const setStatus = (i: Item, status: ItemStatus) => {
    const done = status === 'done';
    onSave({ ...p, backlog: p.backlog.map((x) => (x.id === i.id ? { ...x, status, doneAt: done ? Date.now() : undefined } : x)), log: done ? [log(`Done: “${i.title}”`), ...p.log] : p.log });
  };
  const add = () => {
    if (!title.trim()) return;
    put([...p.backlog, { id: uid(), title: title.trim(), points: Math.max(0, +points || 0), status: 'todo', sprintId, stageId: phases[0]?.id }]);
    setTitle('');
  };
  const nextSprint = (): Sprint => {
    const last = [...p.sprints].sort((a, b) => b.end.localeCompare(a.end))[0];
    const start = last ? addDays(last.end, 1) : isoDay(Date.now());
    return { id: uid(), name: `Sprint ${p.sprints.length + 1}`, start, end: addDays(start, 13), goal: '' };
  };
  const saveSprint = (s: Sprint, isNew: boolean) => { onSave({ ...p, sprints: isNew ? [...p.sprints, s] : p.sprints.map((x) => (x.id === s.id ? s : x)) }); setEditSprint(null); if (isNew) setScope(s.id); };
  const delSprint = (s: Sprint) => {
    if (!window.confirm(`Delete ${s.name}? Its items move back to the backlog.`)) return;
    onSave({ ...p, sprints: p.sprints.filter((x) => x.id !== s.id), backlog: p.backlog.map((i) => (i.sprintId === s.id ? { ...i, sprintId: undefined } : i)) });
    setEditSprint(null); setScope('all');
  };
  const sp = sprint ? sprintPoints(p, sprint.id) : null;

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="grid kpis">
        <Kpi v={`${Math.round(backlogProgress(p.backlog))}%`} l="Of backlog done" />
        <Kpi v={remaining} l="Points remaining" />
        <Kpi v={avgV === null ? '—' : Math.round(avgV * 10) / 10} l="Avg. velocity / sprint" />
        <Kpi v={avgV && remaining ? `~${Math.ceil(remaining / avgV)}` : '—'} l="Sprints to finish" />
      </div>

      <div className="row wrap" style={{ gap: 6 }}>
        <button className={`chip ${scope === 'all' ? 'on' : ''}`} onClick={() => setScope('all')}>All</button>
        <button className={`chip ${scope === 'backlog' ? 'on' : ''}`} onClick={() => setScope('backlog')}>Backlog</button>
        {[...p.sprints].sort((a, b) => a.start.localeCompare(b.start)).map((s) => <button key={s.id} className={`chip ${scope === s.id ? 'on' : ''}`} onClick={() => setScope(s.id)}>{s.name}</button>)}
        <button className="chip" onClick={() => setEditSprint({ s: nextSprint(), isNew: true })}>+ Sprint</button>
      </div>

      {sprint && scope === sprint.id && (
        <div className="card row spread wrap">
          <div><b>{sprint.name}</b> <span className="muted small">{sprint.start} → {sprint.end}</span><div className="muted">{sprint.goal || 'No sprint goal set'}</div></div>
          <div className="row"><span className="tag">{sp?.done}/{sp?.total} pts</span><button className="btn sm" onClick={() => setEditSprint({ s: sprint, isNew: false })}><Icon d={I.edit} size={14} /> Edit sprint</button></div>
        </div>
      )}

      <div className="row no-print">
        <input type="text" value={title} placeholder={sprintId ? 'Add an item to this sprint…' : 'Add a backlog item…'} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <input type="number" min={0} value={points} onChange={(e) => setPoints(e.target.value)} style={{ width: 80 }} aria-label="Story points" title="Story points" />
        <button className="btn primary" onClick={add}>Add</button>
      </div>

      <div className="board">
        {COLS.map(([k, label]) => {
          const col = shown.filter((i) => i.status === k);
          return (
            <div className="col" key={k}>
              <div className="row spread small muted" style={{ fontWeight: 600 }}><span>{label}</span><span>{col.reduce((s, i) => s + i.points, 0)} pts</span></div>
              {col.map((i) => (
                <div className="item" key={i.id}>
                  <div className="row spread" style={{ alignItems: 'flex-start' }}>
                    <span style={{ fontWeight: 560 }}>{i.title}</span><span className="tag">{i.points}</span>
                  </div>
                  <div className="row spread small faint" style={{ marginTop: 6 }}>
                    <span className="row" style={{ gap: 6 }}><Who members={team} id={i.assigneeId} />{p.sprints.find((s) => s.id === i.sprintId)?.name ?? 'Backlog'}{i.stageId && phases.length > 0 && ` · ${p.stages.find((s) => s.id === i.stageId)?.name ?? ''}`}{i.due && ` · due ${i.due.slice(5)}`}</span>
                    <span className="row no-print" style={{ gap: 0 }}>
                      {ORDER.indexOf(k) > 0 && <button className="btn ghost sm" aria-label="Move back" onClick={() => setStatus(i, ORDER[ORDER.indexOf(k) - 1])}><Icon d={I.back} size={13} /></button>}
                      {ORDER.indexOf(k) < 2 && <button className="btn ghost sm" aria-label="Move forward" onClick={() => setStatus(i, ORDER[ORDER.indexOf(k) + 1])}><Icon d={I.fwd} size={13} /></button>}
                      <button className="btn ghost sm" aria-label="Edit item" onClick={() => setEditItem(i)}><Icon d={I.edit} size={13} /></button>
                      <button className="btn ghost sm danger" aria-label="Delete item" onClick={() => put(p.backlog.filter((x) => x.id !== i.id))}><Icon d={I.x} size={13} /></button>
                    </span>
                  </div>
                </div>
              ))}
              {!col.length && <div className="small faint" style={{ padding: 8 }}>Nothing here</div>}
            </div>
          );
        })}
      </div>

      <div className="cols2">
        <div className="card"><h2 style={{ marginBottom: 10 }}>Burndown {sprint && <span className="faint small">· {sprint.name}</span>}</h2>
          {sprint && sp && sp.total > 0 ? <Burndown p={p} sprint={sprint} /> : <span className="muted small">Add points to a sprint to see its burndown.</span>}
          <div className="small faint" style={{ marginTop: 6 }}>Dashed = ideal pace. Solid = actual points remaining.</div></div>
        <div className="card"><h2 style={{ marginBottom: 10 }}>Velocity <span className="faint small">(points done per sprint)</span></h2><Velocity p={p} /></div>
      </div>

      {editItem && <TaskForm item={editItem} p={p} team={team} onClose={() => setEditItem(null)}
        onSave={(i) => { onSave({ ...p, backlog: p.backlog.map((x) => (x.id === i.id ? { ...i, doneAt: i.status === 'done' ? x.doneAt ?? Date.now() : undefined } : x)) }); setEditItem(null); }}
        onDelete={() => { put(p.backlog.filter((x) => x.id !== editItem.id)); setEditItem(null); }} />}
      {editSprint && <SprintForm sprint={editSprint.s} onClose={() => setEditSprint(null)} onSave={(s) => saveSprint(s, editSprint.isNew)} onDelete={editSprint.isNew ? undefined : () => delSprint(editSprint.s)} />}
    </div>
  );
}
