import { useState } from 'react';
import type { Config, Project, Stage } from '../types';
import { currentStage, dueLabel, isOverdue, progressOf, share, uid } from '../lib/progress';
import { StageEditor, newStage } from './StageEditor';
import { ProjectForm } from './ProjectForm';
import { Icon, I, Pill, Ring } from './ui';

export function ProjectDetail({ project: p, config, categories, onSave, onDelete, onBack }: {
  project: Project; config: Config; categories: string[];
  onSave: (p: Project) => void; onDelete: () => void; onBack: () => void;
}) {
  const [editStages, setEditStages] = useState(false);
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState('');
  const [editLog, setEditLog] = useState<string | null>(null);
  const pr = progressOf(p.stages);
  const cur = currentStage(p.stages);
  const log = (text: string) => ({ id: uid(), at: Date.now(), text });

  /** Apply stage changes; auto-complete / reopen the project and log it. */
  const setStages = (stages: Stage[], text?: string) => {
    const done = stages.length > 0 && progressOf(stages) >= 99.999;
    const next: Project = { ...p, stages, log: text ? [log(text), ...p.log] : p.log };
    if (done && p.status === 'active') { next.status = 'done'; next.completedAt = Date.now(); next.log = [log('All stages complete 🎉'), ...next.log]; }
    if (!done && p.status === 'done') { next.status = 'active'; next.completedAt = undefined; }
    onSave(next);
  };
  const setProgress = (id: string, value: number) => {
    const s = p.stages.find((x) => x.id === id)!;
    const text = value === 100 ? `Completed “${s.name}”` : value === 0 && s.progress === 100 ? `Reopened “${s.name}”` : undefined;
    setStages(p.stages.map((x) => (x.id === id ? { ...x, progress: value } : x)), text);
  };
  const addNote = () => { if (note.trim()) { onSave({ ...p, log: [log(note.trim()), ...p.log] }); setNote(''); } };
  const duplicate = () => {
    const now = Date.now();
    location.hash = '#/';
    onSave({ ...p, id: uid(), title: `${p.title} (copy)`, status: 'active', completedAt: undefined, createdAt: now, log: [log('Duplicated')], stages: p.stages.map((s) => ({ ...s, id: uid(), progress: 0 })) });
  };
  const confirmDelete = () => window.confirm(`Delete “${p.title}”? This can’t be undone.`) && onDelete();

  return (
    <>
      <div className="row spread no-print" style={{ margin: '6px 0 14px' }}>
        <button className="btn ghost" onClick={onBack}><Icon d={I.back} /> Back</button>
        <div className="row"><button className="btn sm" onClick={() => window.print()}><Icon d={I.print} size={14} /> Print</button><button className="btn sm" onClick={duplicate}>Duplicate</button><button className="btn sm" onClick={() => setEditing(true)}><Icon d={I.edit} size={14} /> Edit</button><button className="btn sm danger" onClick={confirmDelete}>Delete</button></div>
      </div>

      <div className="card row" style={{ gap: 24, flexWrap: 'wrap' }}>
        <Ring value={pr} size={110} stroke={10} />
        <div style={{ flex: 1, minWidth: 220 }}>
          <div className="row wrap"><Pill text={p.category} /><span className={`tag ${p.status === 'done' ? 'ok' : p.status === 'paused' ? 'warn' : ''}`}>{p.status}</span>{p.due && <span className={`tag ${isOverdue(p) ? 'bad' : ''}`}>{dueLabel(p.due)}</span>}</div>
          <h1 style={{ margin: '8px 0 2px' }}>{p.title}</h1>
          <div className="muted">{p.ref && <>Ref {p.ref} · </>}{p.status === 'done' ? 'Completed' : cur ? `Now: ${cur.name}` : 'Add stages to start tracking'}</div>
        </div>
        {p.fields.length > 0 && (
          <div className="stack" style={{ gap: 4, minWidth: 180 }}>
            {p.fields.map((f) => <div key={f.id} className="small"><span className="faint">{f.label}</span><br /><b>{f.value || '—'}</b></div>)}
          </div>
        )}
      </div>

      <div className="cols2" style={{ marginTop: 16, alignItems: 'start' }}>
        <div className="card" style={{ gridColumn: 'span 1' }}>
          <div className="row spread"><h2>Stages</h2>
            <button className="btn sm no-print" onClick={() => setEditStages(!editStages)}>{editStages ? 'Done' : <><Icon d={I.edit} size={14} /> Edit stages & weights</>}</button></div>
          {editStages ? (
            <div style={{ marginTop: 10 }}><StageEditor stages={p.stages} make={newStage} onChange={(s) => setStages(s)} /></div>
          ) : p.stages.length === 0 ? (
            <p className="muted">No stages yet. Use “Edit stages” to add some.</p>
          ) : p.stages.map((s) => (
            <div key={s.id} className={`stage ${cur?.id === s.id ? 'now' : ''}`}>
              <button className={`check ${s.progress === 100 ? 'done' : s.progress > 0 ? 'part' : ''}`} style={{ ['--p' as string]: s.progress }} aria-label={`Toggle ${s.name}`}
                onClick={() => setProgress(s.id, s.progress === 100 ? 0 : 100)}><Icon d={I.check} size={15} /></button>
              <div><div className={`name ${s.progress === 100 ? 'done' : ''}`}>{s.name || 'Untitled'}</div><div className="small faint">{Math.round(share(s, p.stages))}% of project</div></div>
              <div className="slider row no-print" style={{ gap: 8 }}>
                <input type="range" min={0} max={100} step={5} value={s.progress} aria-label={`${s.name} progress`}
                  onChange={(e) => setStages(p.stages.map((x) => (x.id === s.id ? { ...x, progress: +e.target.value } : x)))} />
                <span className="small muted" style={{ width: 34, textAlign: 'right' }}>{s.progress}%</span>
              </div>
            </div>
          ))}
        </div>

        <div className="stack">
          <div className="card">
            <h2 style={{ marginBottom: 10 }}>Activity</h2>
            <div className="row no-print"><input type="text" value={note} placeholder="Add an update…" onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addNote()} /><button className="btn" onClick={addNote}>Add</button></div>
            <ul className="log" style={{ marginTop: 12 }}>
              {p.log.map((l) => (
                <li key={l.id}>
                  {editLog === l.id ? (
                    <input type="text" autoFocus defaultValue={l.text} onBlur={(e) => { onSave({ ...p, log: p.log.map((x) => (x.id === l.id ? { ...x, text: e.target.value } : x)) }); setEditLog(null); }} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
                  ) : (
                    <div className="row spread"><span>{l.text}</span>
                      <span className="row no-print" style={{ gap: 0 }}>
                        <button className="btn ghost sm" onClick={() => setEditLog(l.id)} aria-label="Edit entry"><Icon d={I.edit} size={13} /></button>
                        <button className="btn ghost sm danger" onClick={() => onSave({ ...p, log: p.log.filter((x) => x.id !== l.id) })} aria-label="Delete entry"><Icon d={I.x} size={13} /></button></span></div>
                  )}
                  <div className="small faint">{new Date(l.at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</div>
                </li>
              ))}
            </ul>
          </div>
          {p.notes && <div className="card"><h2 style={{ marginBottom: 6 }}>Notes</h2><div style={{ whiteSpace: 'pre-wrap' }}>{p.notes}</div></div>}
        </div>
      </div>

      {editing && <ProjectForm config={config} categories={categories} project={p} onClose={() => setEditing(false)} onSave={(x) => { onSave(x); setEditing(false); }} onDelete={confirmDelete} />}
    </>
  );
}
