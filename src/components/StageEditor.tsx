import { totalWeight, uid } from '../lib/progress';
import type { Member } from '../types';
import { Icon, I, MemberSelect } from './ui';

type S = { id: string; name: string; weight: number; source?: 'manual' | 'backlog'; ownerId?: string; start?: string; due?: string };

/** Edit name / weight / order of any stage list; add and delete rows. */
export function StageEditor<T extends S>({ stages, onChange, make, allowBacklog, team }: { stages: T[]; onChange: (s: T[]) => void; make: () => T; allowBacklog?: boolean; team?: Member[] }) {
  const total = totalWeight(stages);
  const set = (i: number, patch: Partial<S>) => onChange(stages.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const move = (i: number, d: number) => {
    const a = [...stages];
    const j = i + d;
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]];
    onChange(a);
  };
  const normalise = () => total && onChange(stages.map((s) => ({ ...s, weight: Math.round((s.weight / total) * 1000) / 10 })));
  return (
    <div>
      {stages.map((s, i) => (
        <div className="stage edit" key={s.id}>
          <input type="text" value={s.name} placeholder="Stage name" aria-label="Stage name" onChange={(e) => set(i, { name: e.target.value })} />
          <div className="row" style={{ gap: 6 }}>
            <input type="number" min={0} value={s.weight} aria-label="Weight" onChange={(e) => set(i, { weight: Math.max(0, +e.target.value || 0) })} />
            <span className="small faint" style={{ width: 38 }}>{total ? Math.round((s.weight / total) * 100) : 0}%</span>
          </div>
          <div className="row" style={{ gap: 2 }}>
            <button className="btn ghost icon-btn" onClick={() => move(i, -1)} aria-label="Move up"><Icon d={I.up} /></button>
            <button className="btn ghost icon-btn" onClick={() => move(i, 1)} aria-label="Move down"><Icon d={I.down} /></button>
            <button className="btn ghost icon-btn danger" onClick={() => onChange(stages.filter((_, j) => j !== i))} aria-label="Delete stage"><Icon d={I.x} /></button>
          </div>
          {allowBacklog && (
            <label className="row small muted" style={{ gridColumn: '1 / -1', gap: 6, marginTop: -6 }}>
              <input type="checkbox" checked={s.source === 'backlog'} onChange={(e) => set(i, { source: e.target.checked ? 'backlog' : 'manual' })} />
              Progress comes from the tasks assigned to this phase
            </label>
          )}
          {team && (
            <div className="row wrap" style={{ gridColumn: '1 / -1', gap: 8, marginTop: -4 }}>
              <label className="f" style={{ flex: '1 1 160px' }}>Owner<MemberSelect members={team} value={s.ownerId} onChange={(id) => set(i, { ownerId: id })} empty="No owner" /></label>
              <label className="f" style={{ flex: '1 1 130px' }}>Start<input type="date" value={s.start ?? ''} onChange={(e) => set(i, { start: e.target.value || undefined })} /></label>
              <label className="f" style={{ flex: '1 1 130px' }}>Due<input type="date" value={s.due ?? ''} onChange={(e) => set(i, { due: e.target.value || undefined })} /></label>
            </div>
          )}
        </div>
      ))}
      <div className="row spread" style={{ marginTop: 10 }}>
        <button className="btn sm" onClick={() => onChange([...stages, make()])}><Icon d={I.plus} size={14} /> Add stage</button>
        <span className="small muted">
          Total weight {Math.round(total * 10) / 10}
          {total > 0 && Math.round(total) !== 100 && <> · <button className="btn ghost sm" onClick={normalise}>Rescale to 100</button></>}
        </span>
      </div>
    </div>
  );
}

export const newStage = (): { id: string; name: string; weight: number; progress: number; source?: 'manual' | 'backlog'; ownerId?: string; start?: string; due?: string } => ({ id: uid(), name: '', weight: 10, progress: 0 });
