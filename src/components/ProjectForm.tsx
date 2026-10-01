import { useState } from 'react';
import type { Config, Field, Project } from '../types';
import { uid } from '../lib/progress';
import { stagesFrom } from '../lib/templates';
import { Icon, I, Modal } from './ui';

/** Create (no `project`) or edit project details. */
export function ProjectForm({ config, categories, project, onSave, onDelete, onClose }: {
  config: Config;
  categories: string[];
  project?: Project;
  onSave: (p: Project) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [tplId, setTplId] = useState(config.templates[0]?.id ?? '');
  const tpl = config.templates.find((t) => t.id === tplId);
  const [title, setTitle] = useState(project?.title ?? '');
  const [category, setCategory] = useState(project?.category ?? tpl?.category ?? categories[0] ?? '');
  const [ref, setRef] = useState(project?.ref ?? '');
  const [due, setDue] = useState(project?.due ?? '');
  const [status, setStatus] = useState(project?.status ?? 'active');
  const [notes, setNotes] = useState(project?.notes ?? '');
  const [fields, setFields] = useState<Field[]>(project?.fields ?? []);

  const pickTemplate = (id: string) => {
    setTplId(id);
    const t = config.templates.find((x) => x.id === id);
    if (t && !project) setCategory(t.category);
  };
  const setField = (i: number, patch: Partial<Field>) => setFields(fields.map((f, j) => (j === i ? { ...f, ...patch } : f)));

  const submit = () => {
    if (!title.trim()) return;
    const now = Date.now();
    const base = project ?? { id: uid(), createdAt: now, log: [{ id: uid(), at: now, text: 'Project created' }], stages: tpl ? stagesFrom(tpl) : [] };
    onSave({
      ...base, title: title.trim(), category: category.trim() || 'Uncategorized', status, notes, updatedAt: now,
      ref: ref.trim() || undefined, due: due || undefined, fields: fields.filter((f) => f.label.trim()),
      completedAt: status === 'done' ? project?.completedAt ?? now : undefined,
    });
  };

  return (
    <Modal onClose={onClose}>
      <div className="stack">
        <div className="row spread"><h2>{project ? 'Edit project' : 'New project'}</h2>
          <button className="btn ghost icon-btn" onClick={onClose} aria-label="Close"><Icon d={I.x} /></button></div>
        {!project && (
          <label className="f">Start from template
            <select value={tplId} onChange={(e) => pickTemplate(e.target.value)}>
              {config.templates.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.stages.length} stages</option>)}
              <option value="">Empty (add stages later)</option>
            </select>
          </label>
        )}
        <label className="f">Title<input type="text" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="e.g. Container #4 to Rotterdam" /></label>
        <div className="row">
          <label className="f" style={{ flex: 1 }}>Category
            <input type="text" list="cats" value={category} onChange={(e) => setCategory(e.target.value)} />
            <datalist id="cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
          </label>
          <label className="f" style={{ flex: 1 }}>Due date<input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></label>
        </div>
        <div className="row">
          <label className="f" style={{ flex: 1 }}>Reference / tracking no.<input type="text" value={ref} onChange={(e) => setRef(e.target.value)} /></label>
          {project && <label className="f" style={{ flex: 1 }}>Status
            <select value={status} onChange={(e) => setStatus(e.target.value as Project['status'])}>
              <option value="active">Active</option><option value="paused">Paused</option><option value="done">Done</option>
            </select></label>}
        </div>
        <div className="stack" style={{ gap: 8 }}>
          <span className="small muted" style={{ fontWeight: 550 }}>Custom details</span>
          {fields.map((f, i) => (
            <div className="row" key={f.id}>
              <input type="text" placeholder="Label (Vendor, Budget…)" value={f.label} onChange={(e) => setField(i, { label: e.target.value })} />
              <input type="text" placeholder="Value" value={f.value} onChange={(e) => setField(i, { value: e.target.value })} />
              <button className="btn ghost icon-btn danger" onClick={() => setFields(fields.filter((_, j) => j !== i))} aria-label="Delete detail"><Icon d={I.x} /></button>
            </div>
          ))}
          <div><button className="btn sm" onClick={() => setFields([...fields, { id: uid(), label: '', value: '' }])}><Icon d={I.plus} size={14} /> Add detail</button></div>
        </div>
        <label className="f">Notes<textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
        <div className="row spread">
          {onDelete ? <button className="btn danger" onClick={onDelete}>Delete project</button> : <span />}
          <div className="row"><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" onClick={submit} disabled={!title.trim()}>{project ? 'Save' : 'Create'}</button></div>
        </div>
      </div>
    </Modal>
  );
}
