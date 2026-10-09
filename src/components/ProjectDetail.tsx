import { useState } from 'react';
import type { Config, Kind, Project, Stage } from '../types';
import type { Metrics } from '../lib/pm';
import { HEALTH_LABEL, METHOD_LABEL, ownProgress, stageProgress } from '../lib/pm';
import { currentStage, dueLabel, isOverdue, share, uid } from '../lib/progress';
import { StageEditor, newStage } from './StageEditor';
import { ProjectForm } from './ProjectForm';
import { Agile } from './Agile';
import { RaidLog } from './Raid';
import { Money } from './Money';
import { Tasks } from './Tasks';
import { CostsTime } from './CostsTime';
import { Gantt, type GRow } from './Gantt';
import { detailRows } from './Timeline';
import { Tree } from './Tree';
import { HealthDot, Icon, I, Kpi, KindTag, MethodTag, Pill, Ring, Who, idx } from './ui';

export function ProjectDetail({ project: p, all, metrics, config, categories, onSave, onDelete, onBack, onCreate }: {
  project: Project; all: Project[]; metrics: Map<string, Metrics>; config: Config; categories: string[];
  onSave: (p: Project) => void; onDelete: () => void; onBack: () => void;
  onCreate: (d: { kind: Kind; parentId: string }) => void;
}) {
  const m = metrics.get(p.id)!;
  const container = p.kind !== 'project';
  const team = config.team;
  const openTasks = p.backlog.filter((i) => i.status !== 'done').length;
  const tabs: [string, string][] = container ? [['contents', 'Contents']] : [
    ...(p.method !== 'agile' ? [['plan', 'Phases'] as [string, string]] : []),
    ...(p.method === 'traditional' ? [['tasks', `Tasks${openTasks ? ` (${openTasks})` : ''}`] as [string, string]] : []),
    ...(p.method !== 'traditional' ? [['agile', p.method === 'agile' ? 'Backlog & sprints' : 'Agile work'] as [string, string]] : []),
  ];
  tabs.push(['timeline', 'Timeline']);
  tabs.push(['risks', `Risks${m.openRisks ? ` (${m.openRisks})` : ''}`]);
  if (!container) tabs.push(['costs', 'Costs & time']);
  tabs.push(['money', 'Schedule & budget'], ['activity', 'Activity']);
  const [tab, setTab] = useState(tabs[0][0]);
  const active = tabs.some(([k]) => k === tab) ? tab : tabs[0][0];

  const [editStages, setEditStages] = useState(false);
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState('');
  const [editLog, setEditLog] = useState<string | null>(null);
  const cur = currentStage(p.stages);
  const log = (text: string) => ({ id: uid(), at: Date.now(), text });
  const parent = all.find((x) => x.id === p.parentId);
  const timelineRows: GRow[] = (() => {
    const self: GRow = { id: p.id, label: p.title, indent: 0, start: p.start, due: p.due, progress: m.progress, tone: m.health === 'none' ? 'accent' : m.health, kind: p.kind, who: <Who members={team} id={p.ownerId} /> };
    if (!container) return [self, ...detailRows(p, team, 1)];
    const rows: GRow[] = [self];
    const walk = (id: string, indent: number) => all.filter((c) => c.parentId === id && c.id !== id).forEach((c) => {
      const cm = metrics.get(c.id)!;
      rows.push({ id: c.id, label: c.title, indent, start: c.start, due: c.due, progress: cm.progress, tone: cm.health === 'none' ? 'accent' : cm.health, kind: c.kind, href: `#/p/${c.id}`, who: <Who members={team} id={c.ownerId} /> });
      walk(c.id, indent + 1);
    });
    walk(p.id, 1);
    return rows;
  })();

  /** Apply stage changes; auto-complete / reopen the project and log it. */
  const setStages = (stages: Stage[], text?: string) => {
    const next: Project = { ...p, stages, log: text ? [log(text), ...p.log] : p.log };
    const done = stages.length > 0 && ownProgress(next) >= 99.999;
    if (done && p.status === 'active') { next.status = 'done'; next.completedAt = Date.now(); next.log = [log('All phases complete 🎉'), ...next.log]; }
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
    onSave({ ...p, id: uid(), title: `${p.title} (copy)`, status: 'active', completedAt: undefined, createdAt: now, log: [log('Duplicated')],
      stages: p.stages.map((s) => ({ ...s, id: uid(), progress: 0 })), backlog: p.backlog.map((i) => ({ ...i, id: uid(), status: 'todo', sprintId: undefined, stageId: undefined, doneAt: undefined })), sprints: [], risks: p.risks.map((r) => ({ ...r, id: uid() })), expenses: [], time: [] });
  };
  const confirmDelete = () => window.confirm(`Delete “${p.title}”?${container ? ' Items inside it are kept and moved up a level.' : ''} This can’t be undone.`) && onDelete();

  /** Mark a project done/reopened. */
  const toggleDone = () => onSave(p.status === 'done'
    ? { ...p, status: 'active', completedAt: undefined, log: [log('Reopened'), ...p.log] }
    : { ...p, status: 'done', completedAt: Date.now(), log: [log('Marked complete 🎉'), ...p.log] });

  return (
    <>
      <div className="row spread no-print" style={{ margin: '6px 0 14px' }}>
        <button className="btn ghost" onClick={onBack}><Icon d={I.back} /> Back</button>
        <div className="row wrap"><button className="btn sm" onClick={toggleDone}>{p.status === 'done' ? 'Reopen' : 'Mark complete'}</button><button className="btn sm" onClick={() => window.print()}><Icon d={I.print} size={14} /> Print</button><button className="btn sm" onClick={duplicate}>Duplicate</button><button className="btn sm" onClick={() => setEditing(true)}><Icon d={I.edit} size={14} /> Edit</button><button className="btn sm danger" onClick={confirmDelete}>Delete</button></div>
      </div>

      <div className="card row" style={{ gap: 24, flexWrap: 'wrap' }}>
        <Ring value={m.progress} size={110} stroke={10} />
        <div style={{ flex: 1, minWidth: 220 }}>
          <div className="row wrap"><KindTag kind={p.kind} />{!container && <MethodTag method={p.method} />}<Pill text={p.category} /><span className={`tag ${p.status === 'done' ? 'ok' : p.status === 'paused' ? 'warn' : ''}`}>{p.status}</span>{p.due && <span className={`tag ${isOverdue(p) ? 'bad' : ''}`}>{dueLabel(p.due)}</span>}</div>
          <h1 style={{ margin: '8px 0 2px' }}>{p.title}</h1>
          <div className="muted">
            {p.ownerId && <><Who members={team} id={p.ownerId} name /> · </>}{parent && <>In <a href={`#/p/${parent.id}`}>{parent.title}</a> · </>}{p.ref && <>Ref {p.ref} · </>}
            {container ? `${m.children.length} item${m.children.length === 1 ? '' : 's'} inside` : p.status === 'done' ? 'Completed' : p.method === 'agile' ? `${METHOD_LABEL.agile} delivery` : cur ? `Now: ${cur.name}` : 'Add phases to start tracking'}
          </div>
        </div>
        {p.fields.length > 0 && <div className="stack" style={{ gap: 4, minWidth: 180 }}>{p.fields.map((f) => <div key={f.id} className="small"><span className="faint">{f.label}</span><br /><b>{f.value || '—'}</b></div>)}</div>}
      </div>

      <div className="grid kpis" style={{ marginTop: 16 }}>
        <div className="card kpi"><div className="v"><HealthDot h={m.health} /></div><div className="l">{HEALTH_LABEL[m.health]}{p.healthOverride && ' (set by you)'}</div></div>
        <Kpi v={idx(m.spi)} l="Schedule index (SPI)" /><Kpi v={idx(m.cpi)} l="Cost index (CPI)" /><Kpi v={m.openRisks} l="Open risks & issues" tone={m.riskScore >= 15 ? 'var(--bad)' : undefined} />
      </div>

      <div className="row wrap no-print" style={{ gap: 6, margin: '18px 0 14px' }}>{tabs.map(([k, l]) => <button key={k} className={`chip ${active === k ? 'on' : ''}`} onClick={() => setTab(k)}>{l}</button>)}</div>

      {active === 'contents' && (
        <div className="card">
          <div className="row spread wrap"><h2>Inside this {p.kind}</h2>
            <div className="row no-print">{p.kind === 'portfolio' && <button className="btn sm" onClick={() => onCreate({ kind: 'program', parentId: p.id })}>+ Program</button>}<button className="btn sm" onClick={() => onCreate({ kind: 'project', parentId: p.id })}>+ Project</button></div></div>
          {m.children.length ? <Tree roots={m.children} all={all} m={metrics} currency={config.currency} /> : <p className="muted">Empty. Add the {p.kind === 'portfolio' ? 'programs and projects' : 'projects'} that belong here and progress, budget and risk will roll up automatically.</p>}
          <p className="small faint" style={{ marginBottom: 0 }}>Progress here is the weighted average of what’s inside (set each item’s “weight in parent” when editing it).</p>
        </div>
      )}

      {active === 'plan' && (
        <div className="card">
          <div className="row spread"><h2>Phases</h2>
            <button className="btn sm no-print" onClick={() => setEditStages(!editStages)}>{editStages ? 'Done' : <><Icon d={I.edit} size={14} /> Edit phases & weights</>}</button></div>
          {editStages ? (
            <div style={{ marginTop: 10 }}><StageEditor stages={p.stages} make={newStage} onChange={(s) => setStages(s)} allowBacklog team={team} /></div>
          ) : p.stages.length === 0 ? <p className="muted">No phases yet. Use “Edit phases” to add some.</p> : p.stages.map((s) => {
            const pr = stageProgress(s, p);
            const driven = s.source === 'backlog';
            return (
              <div key={s.id} className={`stage ${cur?.id === s.id ? 'now' : ''}`}>
                <button className={`check ${pr >= 100 ? 'done' : pr > 0 ? 'part' : ''}`} style={{ ['--p' as string]: pr }} aria-label={`Toggle ${s.name}`} disabled={driven} onClick={() => setProgress(s.id, s.progress === 100 ? 0 : 100)}><Icon d={I.check} size={15} /></button>
                <div><div className={`name ${pr >= 100 ? 'done' : ''}`}>{s.name || 'Untitled'} <Who members={team} id={s.ownerId} /></div><div className="small faint">{Math.round(share(s, p.stages))}% of project{driven && ' · driven by tasks'}{s.due && ` · due ${s.due}`}</div></div>
                <div className="slider row no-print" style={{ gap: 8 }}>
                  {driven ? <span className="small muted">From tasks: {Math.round(pr)}%</span> : <>
                    <input type="range" min={0} max={100} step={5} value={s.progress} aria-label={`${s.name} progress`} onChange={(e) => setStages(p.stages.map((x) => (x.id === s.id ? { ...x, progress: +e.target.value } : x)))} />
                    <span className="small muted" style={{ width: 34, textAlign: 'right' }}>{s.progress}%</span></>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {active === 'tasks' && <Tasks p={p} team={team} onSave={onSave} log={log} />}
      {active === 'agile' && <Agile p={p} team={team} onSave={onSave} log={log} />}
      {active === 'timeline' && <div className="card" style={{ padding: 0, overflow: 'hidden' }}><Gantt rows={timelineRows} pxPerDay={container ? 5 : 8} labelWidth={220} /></div>}
      {active === 'risks' && <RaidLog p={p} team={team} onSave={onSave} />}
      {active === 'costs' && <CostsTime p={p} team={team} currency={config.currency} onSave={onSave} />}
      {active === 'money' && <Money p={p} m={m} currency={config.currency} onSave={onSave} />}

      {active === 'activity' && (
        <div className="cols2" style={{ alignItems: 'start' }}>
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
      )}

      {editing && <ProjectForm config={config} categories={categories} all={all} project={p} onClose={() => setEditing(false)} onSave={(x) => { onSave(x); setEditing(false); }} onDelete={confirmDelete} />}
    </>
  );
}
