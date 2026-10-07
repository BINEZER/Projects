import { useRef, useState } from 'react';
import type { Config, Method, Project, Template, User } from '../types';
import { uid } from '../lib/progress';
import { builtInTemplates, defaultConfig } from '../lib/templates';
import { METHOD_LABEL, normalize } from '../lib/pm';
import { download, stamp } from '../lib/exporters';
import { samples } from '../lib/samples';
import { StageEditor, newStage } from './StageEditor';
import { Icon, I, Modal } from './ui';

type Tab = 'workspace' | 'categories' | 'templates' | 'guide' | 'data' | 'account';
const TABS: [Tab, string][] = [['workspace', 'Workspace'], ['categories', 'Categories'], ['templates', 'Templates'], ['guide', 'Guide'], ['data', 'Data'], ['account', 'Account']];

interface Props {
  config: Config; projects: Project[]; user: User; mode?: string; theme: string;
  saveConfig: (c: Config) => void; saveProject: (p: Project) => Promise<void>; removeProject: (id: string) => Promise<void>;
  setTheme: (t: string) => void; signOut: () => void;
}

export function Admin(props: Props) {
  const [tab, setTab] = useState<Tab>('workspace');
  return (
    <>
      <div className="page-head"><div><h1>Admin</h1><div className="muted">Everything here is yours to rename, change or delete.</div></div></div>
      <div className="row wrap" style={{ gap: 6, marginBottom: 16 }}>{TABS.map(([k, l]) => <button key={k} className={`chip ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>{l}</button>)}</div>
      {tab === 'workspace' && <Workspace {...props} />}
      {tab === 'categories' && <Categories {...props} />}
      {tab === 'templates' && <Templates {...props} />}
      {tab === 'guide' && <Guide />}
      {tab === 'data' && <Data {...props} />}
      {tab === 'account' && <Account {...props} />}
    </>
  );
}

function Workspace({ config, saveConfig, theme, setTheme }: Props) {
  return (
    <div className="card stack" style={{ maxWidth: 520 }}>
      <label className="f">Workspace name<input type="text" value={config.workspace} onChange={(e) => saveConfig({ ...config, workspace: e.target.value })} /></label>
      <label className="f">Currency label<input type="text" maxLength={8} value={config.currency} onChange={(e) => saveConfig({ ...config, currency: e.target.value })} placeholder="ETB, USD, €…" />
        <span className="small faint">Only a label next to amounts. The app never converts or recalculates money.</span></label>
      <label className="f">Theme<select value={theme} onChange={(e) => setTheme(e.target.value)}><option value="auto">Match system</option><option value="light">Light</option><option value="dark">Dark</option></select></label>
    </div>
  );
}

function Categories({ config, projects, saveConfig, saveProject }: Props) {
  const [name, setName] = useState('');
  const counts = new Map<string, number>();
  projects.forEach((p) => counts.set(p.category, (counts.get(p.category) ?? 0) + 1));
  const all = [...new Set([...config.categories, ...counts.keys()])];
  const reassign = (from: string, to: string) => Promise.all(projects.filter((p) => p.category === from).map((p) => saveProject({ ...p, category: to })));

  const rename = async (from: string) => {
    const to = window.prompt(`Rename “${from}” to:`, from)?.trim();
    if (!to || to === from) return;
    await reassign(from, to);
    saveConfig({ ...config, categories: [...new Set(all.map((c) => (c === from ? to : c)))], templates: config.templates.map((t) => (t.category === from ? { ...t, category: to } : t)) });
  };
  const del = async (c: string) => {
    const n = counts.get(c) ?? 0;
    if (!window.confirm(n ? `Delete “${c}”? Its ${n} project(s) will move to “Uncategorized”.` : `Delete “${c}”?`)) return;
    if (n) await reassign(c, 'Uncategorized');
    saveConfig({ ...config, categories: all.filter((x) => x !== c) });
  };
  const add = () => { const n = name.trim(); if (n && !all.includes(n)) saveConfig({ ...config, categories: [...all, n] }); setName(''); };

  return (
    <div className="card" style={{ maxWidth: 560 }}>
      <div className="row" style={{ marginBottom: 12 }}><input type="text" placeholder="New category…" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} /><button className="btn primary" onClick={add}>Add</button></div>
      {all.map((c) => (
        <div key={c} className="row spread" style={{ padding: '9px 0', borderTop: '1px solid var(--line)' }}>
          <span><b>{c}</b> <span className="faint small">{counts.get(c) ?? 0} projects</span></span>
          <span className="row" style={{ gap: 2 }}><button className="btn ghost sm" onClick={() => rename(c)}><Icon d={I.edit} size={14} /> Rename</button><button className="btn ghost sm danger" onClick={() => del(c)}>Delete</button></span>
        </div>
      ))}
      {!all.length && <p className="muted">No categories. Add one above.</p>}
    </div>
  );
}

function Templates({ config, saveConfig }: Props) {
  const [edit, setEdit] = useState<Template | null>(null);
  const [isNew, setIsNew] = useState(false);
  const addMissing = () => {
    const have = new Set(config.templates.map((t) => t.name));
    const add = builtInTemplates().filter((t) => !have.has(t.name));
    if (add.length) saveConfig({ ...config, templates: [...config.templates, ...add] });
    else window.alert('All built-in templates are already there.');
  };
  const commit = () => {
    if (!edit || !edit.name.trim()) return;
    saveConfig({ ...config, templates: isNew ? [...config.templates, edit] : config.templates.map((t) => (t.id === edit.id ? edit : t)) });
    setEdit(null);
  };
  return (
    <>
      <div className="row spread" style={{ marginBottom: 12 }}><span className="muted">Starting points for new projects: method, sprint length and weighted phases.</span>
        <span className="row"><button className="btn" onClick={addMissing}>Add missing built-ins</button><button className="btn primary" onClick={() => { setIsNew(true); setEdit({ id: uid(), name: '', category: config.categories[0] ?? '', method: 'traditional', stages: [{ id: uid(), name: '', weight: 50 }] }); }}>+ New template</button></span></div>
      <div className="grid cards">
        {config.templates.map((t) => (
          <div className="card" key={t.id}>
            <h3>{t.name}</h3><div className="small muted">{METHOD_LABEL[t.method]} · {t.category} · {t.stages.length} phases{t.sprintDays ? ` · ${t.sprintDays}-day sprints` : ''}</div>
            <div className="small faint" style={{ margin: '8px 0 12px' }}>{t.stages.map((s) => s.name).join(' → ')}</div>
            <div className="row"><button className="btn sm" onClick={() => { setIsNew(false); setEdit(structuredClone(t)); }}><Icon d={I.edit} size={14} /> Edit</button>
              <button className="btn sm" onClick={() => saveConfig({ ...config, templates: [...config.templates, { ...structuredClone(t), id: uid(), name: `${t.name} (copy)` }] })}>Duplicate</button>
              <button className="btn sm danger" onClick={() => window.confirm(`Delete template “${t.name}”? Existing projects are not affected.`) && saveConfig({ ...config, templates: config.templates.filter((x) => x.id !== t.id) })}>Delete</button></div>
          </div>
        ))}
      </div>
      {edit && (
        <Modal onClose={() => setEdit(null)}>
          <div className="stack">
            <h2>{isNew ? 'New template' : 'Edit template'}</h2>
            <label className="f">Name<input type="text" autoFocus value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></label>
            <div className="row">
              <label className="f" style={{ flex: 1 }}>Method<select value={edit.method} onChange={(e) => setEdit({ ...edit, method: e.target.value as Method })}><option value="traditional">Traditional</option><option value="agile">Agile</option><option value="hybrid">Hybrid</option></select></label>
              {edit.method !== 'traditional' && <label className="f" style={{ flex: 1 }}>Sprint length (days, 0 = none)<input type="number" min={0} value={edit.sprintDays ?? 0} onChange={(e) => setEdit({ ...edit, sprintDays: Math.max(0, +e.target.value || 0) })} /></label>}
            </div>
            <label className="f">Default category<input type="text" list="tcats" value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })} /><datalist id="tcats">{config.categories.map((c) => <option key={c} value={c} />)}</datalist></label>
            <StageEditor stages={edit.stages.map((s) => ({ ...s, progress: 0 }))} make={newStage} allowBacklog={edit.method === 'hybrid'} onChange={(s) => setEdit({ ...edit, stages: s.map(({ id, name, weight, source }) => ({ id, name, weight, source })) })} />
            <div className="row" style={{ justifyContent: 'flex-end' }}><button className="btn ghost" onClick={() => setEdit(null)}>Cancel</button><button className="btn primary" onClick={commit}>Save template</button></div>
          </div>
        </Modal>
      )}
    </>
  );
}

function Data({ config, projects, saveConfig, saveProject, removeProject }: Props) {
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');
  const backup = () => download(`tracker-backup-${stamp()}.json`, JSON.stringify({ version: 1, config, projects }, null, 2), 'application/json');
  const restore = async (f: File) => {
    try {
      const d = JSON.parse(await f.text());
      if (!Array.isArray(d.projects)) throw new Error('bad file');
      if (!window.confirm(`Import ${d.projects.length} projects? Matching ids will be overwritten.`)) return;
      if (d.config) saveConfig({ ...defaultConfig(), ...d.config });
      await Promise.all((d.projects as Project[]).map((p) => saveProject(normalize(p))));
      setMsg(`Imported ${d.projects.length} projects.`);
    } catch { setMsg('That file is not a valid backup.'); }
  };
  return (
    <div className="stack" style={{ maxWidth: 560 }}>
      <div className="card stack"><h2>Backup & restore</h2><p className="muted" style={{ margin: 0 }}>Full JSON backup of projects, categories and templates.</p>
        <div className="row"><button className="btn" onClick={backup}><Icon d={I.download} size={15} /> Download backup</button><button className="btn" onClick={() => file.current?.click()}>Import backup…</button>
          <input ref={file} type="file" accept="application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) restore(f); e.target.value = ''; }} /></div>{msg && <div className="small muted">{msg}</div>}</div>
      <div className="card stack"><h2>Sample data</h2><div className="row"><button className="btn" onClick={() => samples(config).forEach(saveProject)}>Add sample projects</button></div></div>
      <div className="card stack"><h2>Danger zone</h2>
        <div className="row"><button className="btn danger" onClick={() => window.confirm(`Delete all ${projects.length} projects permanently?`) && projects.forEach((p) => removeProject(p.id))}>Delete all projects</button>
          <button className="btn danger" onClick={() => window.confirm('Reset categories and templates to defaults?') && saveConfig(defaultConfig())}>Reset categories & templates</button></div></div>
    </div>
  );
}

function Account({ user, mode, signOut }: Props) {
  return (
    <div className="card stack" style={{ maxWidth: 520 }}>
      <div className="row">{user.photo && <img src={user.photo} width={44} height={44} style={{ borderRadius: '50%' }} alt="" referrerPolicy="no-referrer" />}<div><b>{user.name}</b><div className="small muted">{user.email}</div></div></div>
      <div className="small muted">Storage: {mode === 'firebase' ? 'Firebase (synced, private to your account)' : 'This browser only (local mode — deploy to Firebase Hosting to sync)'}</div>
      {mode === 'firebase' && <div><button className="btn" onClick={signOut}>Sign out</button></div>}
    </div>
  );
}

const G: [string, string][] = [
  ['Portfolio → Program → Project', 'A project is one effort with a clear result (a shipment, an install, an app). A program groups related projects that deliver a shared benefit (e.g. “Elevator installations 2026”). A portfolio holds everything you manage for a business goal (e.g. “IntelMotion Group”). Progress, health, budget and risks roll up from projects to programs to portfolios. Set “weight in parent” on an item to say how much it counts.'],
  ['Traditional (predictive / waterfall)', 'You plan the whole scope up front and move through phases in order: requirements, design, build, test, deploy. Here a project is a list of weighted phases. Give a bigger weight to the phases that take more effort; progress is the weighted average of phase completion. Use for shipments, construction, installations, anything with fixed scope.'],
  ['Agile (Scrum / Kanban)', 'Scope is a prioritised backlog of items sized in story points. Work happens in short sprints (Scrum, usually 2 weeks) or as continuous flow (Kanban). Progress = points done ÷ total points. Velocity is points finished per sprint; the burndown shows points remaining against the ideal pace. Use when requirements will change as you learn.'],
  ['Hybrid', 'Phases give governance and a plan stakeholders understand, while one or more phases (usually “Build”) are delivered in sprints. Tick “Agile phase” on a phase and assign backlog items to it; that phase’s progress then comes from those items automatically.'],
  ['Health (green / amber / red)', 'Calculated for you from schedule (SPI), cost (CPI), overdue dates and the worst open risk. You can override it by hand when you know better. Programs and portfolios show the worst health of what’s inside.'],
  ['SPI and CPI (earned value)', 'Value earned = budget × % complete. Schedule index SPI = value earned ÷ value planned to date (below 1.00 = behind). Cost index CPI = value earned ÷ money spent (below 1.00 = over budget). Needs a start date, due date, budget and up-to-date actual cost.'],
  ['RAID log', 'Risks (might happen), Assumptions (you’re counting on), Issues (already happening) and Dependencies (you need from others). Risks and issues are scored probability × impact (1–25). Scores of 10+ turn amber, 15+ red.'],
  ['Money', 'Amounts are plain numbers with a label of your choice (Admin → Workspace). Nothing is ever converted between currencies.'],
];

function Guide() {
  return (
    <div className="stack" style={{ maxWidth: 720 }}>
      {G.map(([h, t]) => <div className="card" key={h}><h2 style={{ marginBottom: 6 }}>{h}</h2><div className="muted">{t}</div></div>)}
    </div>
  );
}
