import type { Config, Kind, Project } from '../types';
import type { Metrics } from '../lib/pm';
import { Kpi, idx, num } from './ui';
import { Tree } from './Tree';

/** Portfolio view: the whole hierarchy with rolled-up progress, health and money. */
export function Portfolio({ projects, metrics, config, onCreate }: { projects: Project[]; metrics: Map<string, Metrics>; config: Config; onCreate: (d: { kind: Kind; parentId?: string }) => void }) {
  const ids = new Set(projects.map((p) => p.id));
  const roots = projects.filter((p) => !p.parentId || !ids.has(p.parentId));
  const leaves = projects.filter((p) => p.kind === 'project' && p.status === 'active');
  const bac = leaves.reduce((s, p) => s + metrics.get(p.id)!.bac, 0);
  const ac = leaves.reduce((s, p) => s + metrics.get(p.id)!.ac, 0);
  const ev = leaves.reduce((s, p) => s + metrics.get(p.id)!.ev, 0);
  const health = (h: string) => leaves.filter((p) => metrics.get(p.id)!.health === h).length;
  const c = config.currency ? ` ${config.currency}` : '';

  return (
    <>
      <div className="page-head">
        <div><h1>Portfolio</h1><div className="muted">Portfolios → programs → projects, with everything rolled up.</div></div>
        <div className="row wrap"><button className="btn" onClick={() => onCreate({ kind: 'portfolio' })}>+ Portfolio</button><button className="btn" onClick={() => onCreate({ kind: 'program' })}>+ Program</button><button className="btn primary" onClick={() => onCreate({ kind: 'project' })}>+ Project</button></div>
      </div>
      <div className="stack" style={{ gap: 16 }}>
        <div className="grid kpis">
          <Kpi v={projects.filter((p) => p.kind === 'portfolio').length} l="Portfolios" /><Kpi v={projects.filter((p) => p.kind === 'program').length} l="Programs" /><Kpi v={projects.filter((p) => p.kind === 'project').length} l="Projects" />
          <div className="card kpi"><div className="v row" style={{ gap: 12 }}><span className="hlth"><i className="dot-h green" />{health('green')}</span><span className="hlth"><i className="dot-h amber" />{health('amber')}</span><span className="hlth"><i className="dot-h red" />{health('red')}</span></div><div className="l">Active project health</div></div>
        </div>
        <div className="grid kpis">
          <Kpi v={bac ? num(bac) : '—'} l={`Total budget${c}`} /><Kpi v={ac ? num(ac) : '—'} l={`Spent${c}`} /><Kpi v={bac ? num(ev) : '—'} l={`Value earned${c}`} /><Kpi v={idx(ac > 0 && bac > 0 ? ev / ac : null)} l="Overall cost index (CPI)" />
        </div>
        <div className="card">
          {projects.length === 0 ? <p className="muted">Nothing yet. Create a portfolio, add programs to it, then projects to those.</p>
            : <Tree roots={roots} all={projects} m={metrics} currency={config.currency} onAdd={(kind, parentId) => onCreate({ kind, parentId })} />}
        </div>
      </div>
    </>
  );
}
