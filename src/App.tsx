import { useEffect, useMemo, useState } from 'react';
import type { Kind } from './types';
import { useStore } from './lib/useStore';
import { buildMetrics } from './lib/pm';
import { collectReminders, findMe, maybeNotify } from './lib/reminders';
import { sampleTeam } from './lib/samples';
import { samples } from './lib/samples';
import { Dashboard } from './components/Dashboard';
import { ProjectDetail } from './components/ProjectDetail';
import { ProjectForm } from './components/ProjectForm';
import { Reports } from './components/Reports';
import { Portfolio } from './components/Portfolio';
import { Timeline } from './components/Timeline';
import { Work } from './components/Work';
import { Bell } from './components/Bell';
import { Admin } from './components/Admin';
import { Icon, I } from './components/ui';

const useHash = () => {
  const [h, setH] = useState(location.hash || '#/');
  useEffect(() => {
    const f = () => { setH(location.hash || '#/'); window.scrollTo(0, 0); };
    addEventListener('hashchange', f);
    return () => removeEventListener('hashchange', f);
  }, []);
  return h;
};

const Logo = () => <span className="logo"><Icon d={I.check} size={17} /></span>;

export default function App() {
  const store = useStore();
  const hash = useHash();
  const [creating, setCreating] = useState<{ kind?: Kind; parentId?: string } | null>(null);
  const [theme, setThemeState] = useState(() => { try { return localStorage.getItem('tracker.theme') || 'auto'; } catch { return 'auto'; } });
  const setTheme = (t: string) => { setThemeState(t); try { localStorage.setItem('tracker.theme', t); } catch { /* ignore */ } };
  useEffect(() => {
    const dark = theme === 'dark' || (theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  }, [theme]);

  const { config, projects } = store;
  useEffect(() => { document.title = config.workspace || 'Tracker'; }, [config.workspace]);
  const categories = useMemo(() => [...new Set([...config.categories, ...(projects ?? []).map((p) => p.category)])], [config.categories, projects]);

  const metrics = useMemo(() => buildMetrics(projects ?? [], config.team), [projects, config.team]);
  const me = findMe(config.team, store.user?.email);
  const [mine, setMine] = useState(false);
  const allReminders = useMemo(() => collectReminders(projects ?? [], config.reminderDays), [projects, config.reminderDays]);
  const reminders = mine && me ? allReminders.filter((r) => r.who === me.id) : allReminders;
  useEffect(() => { if (projects) maybeNotify(allReminders, config.workspace); }, [projects, allReminders, config.workspace]);

  if (!store.ready) return <div className="hero muted">Loading…</div>;
  if (!store.user) return (
    <div className="hero"><div className="card stack" style={{ alignItems: 'center' }}>
      <Logo /><h1>{config.workspace}</h1><p className="muted" style={{ margin: 0 }}>Track every project, shipment and goal — stage by stage.</p>
      <button className="btn primary" onClick={() => store.signIn()}>Continue with Google</button></div></div>
  );
  if (!projects) return <div className="hero muted">Loading…</div>;

  const route = hash.replace(/^#\/?/, '').split('/');
  const project = route[0] === 'p' ? projects.find((p) => p.id === route[1]) : undefined;
  const tab = ['reports', 'admin', 'portfolio', 'timeline', 'work'].includes(route[0]) ? route[0] : 'dash';
  const loadSamples = () => {
    const team = config.team.length ? config.team : sampleTeam();
    if (!config.team.length) store.saveConfig({ ...config, team });
    samples(config, team).forEach(store.save);
  };

  return (
    <div className="shell">
      <nav className="nav">
        <a className="brand" href="#/"><Logo /><span className="hide-sm">{config.workspace}</span></a>
        <div className="tabs">
          <a className={`tab ${tab === 'dash' ? 'on' : ''}`} href="#/">Dashboard</a>
          <a className={`tab ${tab === 'portfolio' ? 'on' : ''}`} href="#/portfolio">Portfolio</a>
          <a className={`tab ${tab === 'timeline' ? 'on' : ''}`} href="#/timeline">Timeline</a>
          <a className={`tab ${tab === 'work' ? 'on' : ''}`} href="#/work">Work</a>
          <a className={`tab ${tab === 'reports' ? 'on' : ''}`} href="#/reports">Reports</a>
          <a className={`tab ${tab === 'admin' ? 'on' : ''}`} href="#/admin">Admin</a>
        </div>
        <Bell reminders={reminders} team={config.team} mine={mine} setMine={setMine} canFilter={!!me} days={config.reminderDays} />
        <button className="btn ghost icon-btn" aria-label="Toggle theme" onClick={() => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark')}><Icon d={I.moon} /></button>
      </nav>
      {store.mode === 'local' && <div className="banner no-print">Local mode — data is saved in this browser only. It syncs to your account once deployed to Firebase Hosting.</div>}

      {route[0] === 'p' ? (
        project ? <ProjectDetail project={project} all={projects} metrics={metrics} config={config} categories={categories} onSave={store.save} onBack={() => history.length > 1 ? history.back() : (location.hash = '#/')} onCreate={setCreating} onDelete={() => { location.hash = '#/'; (projects ?? []).filter((c) => c.parentId === project.id).forEach((c) => store.save({ ...c, parentId: project.parentId })); store.remove(project.id); }} />
          : <div className="empty muted">Project not found. <a href="#/">Back to dashboard</a></div>
      ) : tab === 'timeline' ? <Timeline projects={projects} metrics={metrics} team={config.team} />
      : tab === 'work' ? <Work projects={projects} team={config.team} me={me} onSave={store.save} />
      : tab === 'portfolio' ? <Portfolio projects={projects} metrics={metrics} config={config} onCreate={setCreating} />
      : tab === 'reports' ? <Reports projects={projects} metrics={metrics} categories={categories} workspace={config.workspace} currency={config.currency} team={config.team} />
      : tab === 'admin' ? <Admin config={config} projects={projects} user={store.user} mode={store.mode} theme={theme} setTheme={setTheme} saveConfig={store.saveConfig} saveProject={store.save} removeProject={store.remove} signOut={() => store.signOut()} />
      : <Dashboard projects={projects} metrics={metrics} categories={categories} onNew={() => setCreating({})} onSample={loadSamples} />}

      {creating && <ProjectForm config={config} categories={categories} all={projects} defaults={creating} onClose={() => setCreating(null)} onSave={(p) => { store.save(p); setCreating(null); location.hash = `#/p/${p.id}`; }} />}
    </div>
  );
}
