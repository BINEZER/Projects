import { useEffect, useMemo, useState } from 'react';
import type { Kind } from './types';
import { useStore } from './lib/useStore';
import { buildMetrics } from './lib/pm';
import { samples } from './lib/samples';
import { Dashboard } from './components/Dashboard';
import { ProjectDetail } from './components/ProjectDetail';
import { ProjectForm } from './components/ProjectForm';
import { Reports } from './components/Reports';
import { Portfolio } from './components/Portfolio';
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

  const metrics = useMemo(() => buildMetrics(projects ?? []), [projects]);

  if (!store.ready) return <div className="hero muted">Loading…</div>;
  if (!store.user) return (
    <div className="hero"><div className="card stack" style={{ alignItems: 'center' }}>
      <Logo /><h1>{config.workspace}</h1><p className="muted" style={{ margin: 0 }}>Track every project, shipment and goal — stage by stage.</p>
      <button className="btn primary" onClick={() => store.signIn()}>Continue with Google</button></div></div>
  );
  if (!projects) return <div className="hero muted">Loading…</div>;

  const route = hash.replace(/^#\/?/, '').split('/');
  const project = route[0] === 'p' ? projects.find((p) => p.id === route[1]) : undefined;
  const tab = route[0] === 'reports' ? 'reports' : route[0] === 'admin' ? 'admin' : route[0] === 'portfolio' ? 'portfolio' : 'dash';
  const loadSamples = () => samples(config).forEach(store.save);

  return (
    <div className="shell">
      <nav className="nav">
        <a className="brand" href="#/"><Logo /><span className="hide-sm">{config.workspace}</span></a>
        <div className="tabs">
          <a className={`tab ${tab === 'dash' ? 'on' : ''}`} href="#/">Dashboard</a>
          <a className={`tab ${tab === 'portfolio' ? 'on' : ''}`} href="#/portfolio">Portfolio</a>
          <a className={`tab ${tab === 'reports' ? 'on' : ''}`} href="#/reports">Reports</a>
          <a className={`tab ${tab === 'admin' ? 'on' : ''}`} href="#/admin">Admin</a>
        </div>
        <button className="btn ghost icon-btn" aria-label="Toggle theme" onClick={() => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark')}><Icon d={I.moon} /></button>
      </nav>
      {store.mode === 'local' && <div className="banner no-print">Local mode — data is saved in this browser only. It syncs to your account once deployed to Firebase Hosting.</div>}

      {route[0] === 'p' ? (
        project ? <ProjectDetail project={project} all={projects} metrics={metrics} config={config} categories={categories} onSave={store.save} onBack={() => history.length > 1 ? history.back() : (location.hash = '#/')} onCreate={setCreating} onDelete={() => { location.hash = '#/'; (projects ?? []).filter((c) => c.parentId === project.id).forEach((c) => store.save({ ...c, parentId: project.parentId })); store.remove(project.id); }} />
          : <div className="empty muted">Project not found. <a href="#/">Back to dashboard</a></div>
      ) : tab === 'portfolio' ? <Portfolio projects={projects} metrics={metrics} config={config} onCreate={setCreating} />
      : tab === 'reports' ? <Reports projects={projects} metrics={metrics} categories={categories} workspace={config.workspace} currency={config.currency} />
      : tab === 'admin' ? <Admin config={config} projects={projects} user={store.user} mode={store.mode} theme={theme} setTheme={setTheme} saveConfig={store.saveConfig} saveProject={store.save} removeProject={store.remove} signOut={() => store.signOut()} />
      : <Dashboard projects={projects} metrics={metrics} categories={categories} onNew={() => setCreating({})} onSample={loadSamples} />}

      {creating && <ProjectForm config={config} categories={categories} all={projects} defaults={creating} onClose={() => setCreating(null)} onSave={(p) => { store.save(p); setCreating(null); location.hash = `#/p/${p.id}`; }} />}
    </div>
  );
}
