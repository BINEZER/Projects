import { useState } from 'react';
import type { Item, ItemStatus, Member, Project } from '../types';
import { uid } from '../lib/progress';
import { hoursLogged } from '../lib/pm';
import { daysLeft } from '../lib/progress';
import { Icon, I, MemberSelect, Modal, Who } from './ui';

const STATUS: [ItemStatus, string][] = [['todo', 'To do'], ['doing', 'In progress'], ['done', 'Done']];

export function TaskForm({ item, p, team, onSave, onDelete, onClose }: { item: Item; p: Project; team: Member[]; onSave: (i: Item) => void; onDelete?: () => void; onClose: () => void }) {
  const [i, setI] = useState(item);
  return (
    <Modal onClose={onClose}>
      <div className="stack">
        <h2>{onDelete ? 'Edit task' : 'New task'}</h2>
        <label className="f">Task<input type="text" autoFocus value={i.title} onChange={(e) => setI({ ...i, title: e.target.value })} /></label>
        <div className="row">
          <label className="f" style={{ flex: 1 }}>Assigned to<MemberSelect members={team} value={i.assigneeId} onChange={(id) => setI({ ...i, assigneeId: id })} /></label>
          <label className="f" style={{ flex: 1 }}>Due date<input type="date" value={i.due ?? ''} onChange={(e) => setI({ ...i, due: e.target.value || undefined })} /></label>
        </div>
        <div className="row">
          <label className="f" style={{ flex: 1 }}>Status<select value={i.status} onChange={(e) => setI({ ...i, status: e.target.value as ItemStatus })}>{STATUS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
          <label className="f" style={{ flex: 1 }}>Estimate (hours)<input type="number" min={0} step={0.5} value={i.estimateHours ?? ''} onChange={(e) => setI({ ...i, estimateHours: e.target.value === '' ? undefined : Math.max(0, +e.target.value) })} /></label>
          {p.method !== 'traditional' && <label className="f" style={{ flex: 1 }}>Story points<input type="number" min={0} value={i.points} onChange={(e) => setI({ ...i, points: Math.max(0, +e.target.value || 0) })} /></label>}
        </div>
        {p.sprints.length > 0 && <label className="f">Sprint<select value={i.sprintId ?? ''} onChange={(e) => setI({ ...i, sprintId: e.target.value || undefined })}><option value="">Backlog (not scheduled)</option>{p.sprints.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>}
        {p.stages.length > 0 && <label className="f">Phase<select value={i.stageId ?? ''} onChange={(e) => setI({ ...i, stageId: e.target.value || undefined })}><option value="">None</option>{p.stages.map((s) => <option key={s.id} value={s.id}>{s.name}{s.source === 'backlog' ? ' (progress from tasks)' : ''}</option>)}</select></label>}
        <div className="row spread">{onDelete ? <button className="btn danger" onClick={onDelete}>Delete task</button> : <span />}
          <div className="row"><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" disabled={!i.title.trim()} onClick={() => onSave(i)}>Save</button></div></div>
      </div>
    </Modal>
  );
}

/** Task list for traditional projects: who does what, by when, grouped by phase. */
export function Tasks({ p, team, onSave, log }: { p: Project; team: Member[]; onSave: (p: Project) => void; log: (t: string) => Project['log'][number] }) {
  const [title, setTitle] = useState('');
  const [edit, setEdit] = useState<{ i: Item; isNew: boolean } | null>(null);
  const blank = (): Item => ({ id: uid(), title: '', points: 0, status: 'todo' });
  const logged = (id: string) => p.time.filter((t) => t.itemId === id).reduce((s, t) => s + t.hours, 0);
  const setStatus = (i: Item, status: ItemStatus) =>
    onSave({ ...p, backlog: p.backlog.map((x) => (x.id === i.id ? { ...x, status, doneAt: status === 'done' ? Date.now() : undefined } : x)), log: status === 'done' ? [log(`Done: “${i.title}”`), ...p.log] : p.log });
  const add = () => { if (title.trim()) { onSave({ ...p, backlog: [...p.backlog, { ...blank(), title: title.trim() }] }); setTitle(''); } };
  const save = (i: Item, isNew: boolean) => { onSave({ ...p, backlog: isNew ? [...p.backlog, i] : p.backlog.map((x) => (x.id === i.id ? { ...i, doneAt: i.status === 'done' ? x.doneAt ?? Date.now() : undefined } : x)) }); setEdit(null); };

  const groups: { key: string; name: string; items: Item[] }[] = [
    ...p.stages.map((s) => ({ key: s.id, name: s.name, items: p.backlog.filter((i) => i.stageId === s.id) })),
    { key: '', name: p.stages.length ? 'No phase' : 'All tasks', items: p.backlog.filter((i) => !i.stageId || !p.stages.some((s) => s.id === i.stageId)) },
  ].filter((g) => g.items.length || (g.key === '' && !p.backlog.length));

  const open = p.backlog.filter((i) => i.status !== 'done').length;
  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="card row spread wrap">
        <span className="muted">{open} open · {p.backlog.length - open} done · {Math.round(hoursLogged(p) * 10) / 10}h logged</span>
        <span className="small faint">Tick “progress from tasks” on a phase (Phases → Edit) to let its tasks drive its progress.</span>
      </div>
      <div className="row no-print">
        <input type="text" value={title} placeholder="Add a task…" onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <button className="btn primary" onClick={add}>Add</button>
        <button className="btn" onClick={() => setEdit({ i: blank(), isNew: true })}>Add with details…</button>
      </div>
      {groups.map((g) => (
        <div className="card" key={g.key || 'none'}>
          <h2 style={{ marginBottom: 6 }}>{g.name}</h2>
          {g.items.length === 0 && <p className="muted" style={{ margin: 0 }}>No tasks yet.</p>}
          {g.items.map((i) => {
            const d = i.status !== 'done' ? daysLeft(i.due) : null;
            return (
              <div key={i.id} className="trow2">
                <button className={`check ${i.status === 'done' ? 'done' : i.status === 'doing' ? 'part' : ''}`} style={{ ['--p' as string]: 50 }} aria-label={`Cycle status of ${i.title}`}
                  onClick={() => setStatus(i, i.status === 'todo' ? 'doing' : i.status === 'doing' ? 'done' : 'todo')}><Icon d={I.check} size={15} /></button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className={i.status === 'done' ? 'name done' : 'name'} style={{ fontWeight: 560 }}>{i.title}</div>
                  <div className="small faint">{STATUS.find(([k]) => k === i.status)?.[1]}{i.estimateHours ? ` · est ${i.estimateHours}h` : ''}{logged(i.id) ? ` · ${Math.round(logged(i.id) * 10) / 10}h logged` : ''}</div>
                </div>
                <Who members={team} id={i.assigneeId} name />
                {i.due && <span className={`tag ${d !== null && d < 0 ? 'bad' : d !== null && d <= 3 ? 'warn' : ''}`}>{i.due}</span>}
                <span className="row no-print" style={{ gap: 0 }}>
                  <button className="btn ghost sm" aria-label="Edit task" onClick={() => setEdit({ i, isNew: false })}><Icon d={I.edit} size={14} /></button>
                  <button className="btn ghost sm danger" aria-label="Delete task" onClick={() => onSave({ ...p, backlog: p.backlog.filter((x) => x.id !== i.id) })}><Icon d={I.x} size={14} /></button>
                </span>
              </div>
            );
          })}
        </div>
      ))}
      {edit && <TaskForm item={edit.i} p={p} team={team} onClose={() => setEdit(null)} onSave={(i) => save(i, edit.isNew)} onDelete={edit.isNew ? undefined : () => { onSave({ ...p, backlog: p.backlog.filter((x) => x.id !== edit.i.id) }); setEdit(null); }} />}
    </div>
  );
}
