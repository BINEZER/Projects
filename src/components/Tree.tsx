import type { Project } from '../types';
import type { Metrics } from '../lib/pm';
import { dueLabel, isOverdue } from '../lib/progress';
import { HealthDot, KindTag, MethodTag, num } from './ui';

/** Indented hierarchy: portfolio → program → project, each row showing its rolled-up numbers. */
export function Tree({ roots, all, m, currency, onAdd }: {
  roots: Project[]; all: Project[]; m: Map<string, Metrics>; currency: string;
  onAdd?: (kind: Project['kind'], parentId: string) => void;
}) {
  const kids = (id: string) => all.filter((p) => p.parentId === id && p.id !== id);
  const rank = { portfolio: 0, program: 1, project: 2 };
  const sort = (a: Project[]) => [...a].sort((x, y) => rank[x.kind] - rank[y.kind] || x.title.localeCompare(y.title));

  const Row = ({ p, depth }: { p: Project; depth: number }) => {
    const x = m.get(p.id)!;
    return (
      <>
        <div className="trow" style={{ paddingLeft: depth * 22 }}>
          <a href={`#/p/${p.id}`} className="tcell title">
            <HealthDot h={x.health} /> <KindTag kind={p.kind} />{p.kind === 'project' && <MethodTag method={p.method} />}
            <b>{p.title}</b>{p.status !== 'active' && <span className="tag">{p.status}</span>}
          </a>
          <div className="tcell bar-cell"><div className="bar"><i style={{ width: `${x.progress}%` }} /></div><span className="small muted">{Math.round(x.progress)}%</span></div>
          <div className="tcell small muted hide-sm">{x.bac ? `${num(x.bac)} ${currency}` : ''}</div>
          <div className={`tcell small hide-sm ${isOverdue(p) ? 'bad-text' : 'muted'}`}>{p.due && p.status !== 'done' ? dueLabel(p.due) : ''}</div>
          {onAdd && (
            <div className="tcell addc no-print">
              {p.kind === 'portfolio' && <button className="btn ghost sm" onClick={() => onAdd('program', p.id)}>+ Program</button>}
              {p.kind !== 'project' && <button className="btn ghost sm" onClick={() => onAdd('project', p.id)}>+ Project</button>}
            </div>
          )}
        </div>
        {sort(kids(p.id)).map((c) => <Row key={c.id} p={c} depth={depth + 1} />)}
      </>
    );
  };
  return <div className="tree">{sort(roots).map((p) => <Row key={p.id} p={p} depth={0} />)}</div>;
}
