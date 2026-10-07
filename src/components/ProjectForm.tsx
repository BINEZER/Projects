import { useState } from 'react';
import type { Config, Field, Health, Kind, Method, Project } from '../types';
import { uid } from '../lib/progress';
import { stagesFrom } from '../lib/templates';
import { addDays, isoDay, KIND_LABEL, METHOD_LABEL, parentOptions } from '../lib/pm';
import { Icon, I, Modal } from './ui';

/** Create (no `project`) or edit an item at any level: portfolio, program or project. */
export function ProjectForm({ config, categories, all, project, defaults, onSave, onDelete, onClose }: {
  config: Config;
  categories: string[];
  all: Project[];
  project?: Project;
  defaults?: { kind?: Kind; parentId?: string };
  onSave: (p: Project) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<Kind>(project?.kind ?? defaults?.kind ?? 'project');
  const templates = config.templates;
  const [tplId, setTplId] = useState(templates[0]?.id ?? '');
  const tpl = templates.find((t) => t.id === tplId);
  const [method, setMethod] = useState<Method>(project?.method ?? tpl?.method ?? 'traditional');
  const [parentId, setParentId] = useState(project?.parentId ?? defaults?.parentId ?? '');
  const [title, setTitle] = useState(project?.title ?? '');
  const [category, setCategory] = useState(project?.category ?? tpl?.category ?? categories[0] ?? '');
  const [ref, setRef] = useState(project?.ref ?? '');
  const [start, setStart] = useState(project?.start ?? '');
  const [due, setDue] = useState(project?.due ?? '');
  const [weight, setWeight] = useState(String(project?.weight ?? 1));
  const [budget, setBudget] = useState(project?.budget !== undefined ? String(project.budget) : '');
  const [status, setStatus] = useState(project?.status ?? 'active');
  const [health, setHealth] = useState<Health | ''>(project?.healthOverride ?? '');
  const [notes, setNotes] = useState(project?.notes ?? '');
  const [fields, setFields] = useState<Field[]>(project?.fields ?? []);

  const parents = parentOptions(kind, all, project?.id);
  const pickTemplate = (id: string) => {
    setTplId(id);
    const t = templates.find((x) => x.id === id);
    if (t) { setMethod(t.method); if (!project && t.category !== 'Uncategorized') setCategory(t.category); }
  };
  const setField = (i: number, patch: Partial<Field>) => setFields(fields.map((f, j) => (j === i ? { ...f, ...patch } : f)));

  const submit = () => {
    if (!title.trim()) return;
    const now = Date.now();
    const isProject = kind === 'project';
    let base: Project;
    if (project) base = project;
    else {
      const today = isoDay(now);
      const sprints = isProject && method !== 'traditional' && (tpl?.sprintDays ?? 0) > 0
        ? [{ id: uid(), name: 'Sprint 1', start: today, end: addDays(today, (tpl?.sprintDays ?? 14) - 1), goal: '' }] : [];
      base = {
        id: uid(), createdAt: now, kind, method, title, category, status: 'active', notes: '', fields: [], backlog: [], risks: [], sprints,
        stages: isProject && tpl && method !== 'agile' ? stagesFrom(tpl) : [],
        log: [{ id: uid(), at: now, text: `${KIND_LABEL[kind]} created` }], updatedAt: now,
      };
    }
    onSave({
      ...base, title: title.trim(), method, category: category.trim() || 'Uncategorized', status, notes, updatedAt: now,
      parentId: parentId || undefined, weight: Math.max(0.1, +weight || 1), ref: ref.trim() || undefined, start: start || undefined, due: due || undefined,
      budget: isProject && budget !== '' ? Math.max(0, +budget || 0) : undefined, healthOverride: health || undefined,
      fields: fields.filter((f) => f.label.trim()), completedAt: status === 'done' ? project?.completedAt ?? now : undefined,
    });
  };

  return (
    <Modal onClose={onClose}>
      <div className="stack">
        <div className="row spread"><h2>{project ? `Edit ${KIND_LABEL[kind].toLowerCase()}` : `New ${KIND_LABEL[kind].toLowerCase()}`}</h2>
          <button className="btn ghost icon-btn" onClick={onClose} aria-label="Close"><Icon d={I.x} /></button></div>

        {!project && (
          <label className="f">Level
            <select value={kind} onChange={(e) => { setKind(e.target.value as Kind); setParentId(''); }}>
              <option value="project">Project — a temporary effort with a clear result</option>
              <option value="program">Program — a group of related projects</option>
              <option value="portfolio">Portfolio — everything you manage for a goal or business</option>
            </select>
          </label>
        )}
        {!project && kind === 'project' && (
          <label className="f">Start from template
            <select value={tplId} onChange={(e) => pickTemplate(e.target.value)}>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name} · {METHOD_LABEL[t.method]}</option>)}
              <option value="">Empty (add stages later)</option>
            </select>
          </label>
        )}
        <label className="f">Title<input type="text" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder={kind === 'project' ? 'e.g. Container #4 to Rotterdam' : kind === 'program' ? 'e.g. Elevator installations 2026' : 'e.g. IntelMotion Group'} /></label>

        {kind === 'project' && (
          <label className="f">Delivery method
            <select value={method} onChange={(e) => setMethod(e.target.value as Method)}>
              <option value="traditional">Traditional — plan up front, weighted phases (waterfall)</option>
              <option value="agile">Agile — backlog and sprints (Scrum / Kanban)</option>
              <option value="hybrid">Hybrid — phases for governance, sprints for the build</option>
            </select>
          </label>
        )}
        {kind !== 'portfolio' && (
          <div className="row">
            <label className="f" style={{ flex: 2 }}>{kind === 'project' ? 'Belongs to (program or portfolio)' : 'Belongs to (portfolio)'}
              <select value={parentId} onChange={(e) => setParentId(e.target.value)}>
                <option value="">— Standalone —</option>
                {parents.map((p) => <option key={p.id} value={p.id}>{KIND_LABEL[p.kind]}: {p.title}</option>)}
              </select></label>
            {parentId && <label className="f" style={{ flex: 1 }}>Weight in parent<input type="number" min={0.1} step={0.5} value={weight} onChange={(e) => setWeight(e.target.value)} /></label>}
          </div>
        )}
        <div className="row">
          <label className="f" style={{ flex: 1 }}>Category
            <input type="text" list="cats" value={category} onChange={(e) => setCategory(e.target.value)} />
            <datalist id="cats">{categories.map((c) => <option key={c} value={c} />)}</datalist></label>
          <label className="f" style={{ flex: 1 }}>Reference / tracking no.<input type="text" value={ref} onChange={(e) => setRef(e.target.value)} /></label>
        </div>
        <div className="row">
          <label className="f" style={{ flex: 1 }}>Start date<input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></label>
          <label className="f" style={{ flex: 1 }}>Due date<input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></label>
          {kind === 'project' && <label className="f" style={{ flex: 1 }}>Budget ({config.currency || 'amount'})<input type="number" min={0} value={budget} onChange={(e) => setBudget(e.target.value)} /></label>}
        </div>
        {project && (
          <div className="row">
            <label className="f" style={{ flex: 1 }}>Status
              <select value={status} onChange={(e) => setStatus(e.target.value as Project['status'])}><option value="active">Active</option><option value="paused">Paused</option><option value="done">Done</option></select></label>
            <label className="f" style={{ flex: 1 }}>Health
              <select value={health} onChange={(e) => setHealth(e.target.value as Health | '')}><option value="">Automatic</option><option value="green">On track (green)</option><option value="amber">At risk (amber)</option><option value="red">Off track (red)</option></select></label>
          </div>
        )}
        <div className="stack" style={{ gap: 8 }}>
          <span className="small muted" style={{ fontWeight: 550 }}>Custom details</span>
          {fields.map((f, i) => (
            <div className="row" key={f.id}>
              <input type="text" placeholder="Label (Vendor, Sponsor…)" value={f.label} onChange={(e) => setField(i, { label: e.target.value })} />
              <input type="text" placeholder="Value" value={f.value} onChange={(e) => setField(i, { value: e.target.value })} />
              <button className="btn ghost icon-btn danger" onClick={() => setFields(fields.filter((_, j) => j !== i))} aria-label="Delete detail"><Icon d={I.x} /></button>
            </div>
          ))}
          <div><button className="btn sm" onClick={() => setFields([...fields, { id: uid(), label: '', value: '' }])}><Icon d={I.plus} size={14} /> Add detail</button></div>
        </div>
        <label className="f">Notes<textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
        <div className="row spread">
          {onDelete ? <button className="btn danger" onClick={onDelete}>Delete</button> : <span />}
          <div className="row"><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" onClick={submit} disabled={!title.trim()}>{project ? 'Save' : 'Create'}</button></div>
        </div>
      </div>
    </Modal>
  );
}
