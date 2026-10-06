import { useState } from 'react';
import type { Project, Raid, RaidType } from '../types';
import { uid } from '../lib/progress';
import { isLive, riskScore, scoreTone } from '../lib/pm';
import { Icon, I, Modal } from './ui';

const TYPES: [RaidType, string][] = [['risk', 'Risk'], ['issue', 'Issue'], ['assumption', 'Assumption'], ['dependency', 'Dependency']];
const LEVELS = [1, 2, 3, 4, 5];
const tone = (s: number) => (s >= 15 ? 'bad' : s >= 10 ? 'warn' : s >= 5 ? '' : 'ok');

function RaidForm({ r, onSave, onDelete, onClose }: { r: Raid; onSave: (r: Raid) => void; onDelete?: () => void; onClose: () => void }) {
  const [x, setX] = useState(r);
  const scored = x.type === 'risk' || x.type === 'issue';
  return (
    <Modal onClose={onClose}>
      <div className="stack">
        <h2>{onDelete ? 'Edit entry' : 'New entry'}</h2>
        <div className="row">
          <label className="f" style={{ flex: 1 }}>Type<select value={x.type} onChange={(e) => setX({ ...x, type: e.target.value as RaidType })}>{TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
          <label className="f" style={{ flex: 1 }}>Status<select value={x.status} onChange={(e) => setX({ ...x, status: e.target.value as Raid['status'] })}><option value="open">Open</option><option value="mitigating">Mitigating</option><option value="closed">Closed</option></select></label>
        </div>
        <label className="f">What is it?<input type="text" autoFocus value={x.title} onChange={(e) => setX({ ...x, title: e.target.value })} /></label>
        {scored && (
          <div className="row">
            <label className="f" style={{ flex: 1 }}>Probability (1 unlikely – 5 near certain)<select value={x.probability} onChange={(e) => setX({ ...x, probability: +e.target.value })}>{LEVELS.map((n) => <option key={n}>{n}</option>)}</select></label>
            <label className="f" style={{ flex: 1 }}>Impact (1 minor – 5 severe)<select value={x.impact} onChange={(e) => setX({ ...x, impact: +e.target.value })}>{LEVELS.map((n) => <option key={n}>{n}</option>)}</select></label>
          </div>
        )}
        <label className="f">Owner<input type="text" value={x.owner} onChange={(e) => setX({ ...x, owner: e.target.value })} /></label>
        <label className="f">Response / mitigation<textarea value={x.response} onChange={(e) => setX({ ...x, response: e.target.value })} style={{ minHeight: 70 }} /></label>
        <div className="row spread">{onDelete ? <button className="btn danger" onClick={onDelete}>Delete</button> : <span />}
          <div className="row"><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" disabled={!x.title.trim()} onClick={() => onSave(x)}>Save</button></div></div>
      </div>
    </Modal>
  );
}

/** RAID log: Risks, Assumptions, Issues, Dependencies, with a probability × impact heat map. */
export function RaidLog({ p, onSave }: { p: Project; onSave: (p: Project) => void }) {
  const [edit, setEdit] = useState<{ r: Raid; isNew: boolean } | null>(null);
  const [showClosed, setShowClosed] = useState(false);
  const blank = (): Raid => ({ id: uid(), type: 'risk', title: '', probability: 3, impact: 3, status: 'open', owner: '', response: '' });
  const list = [...p.risks].filter((r) => showClosed || r.status !== 'closed').sort((a, b) => (isLive(b) ? riskScore(b) : 0) - (isLive(a) ? riskScore(a) : 0));
  const live = p.risks.filter(isLive);
  const save = (r: Raid, isNew: boolean) => { onSave({ ...p, risks: isNew ? [...p.risks, r] : p.risks.map((x) => (x.id === r.id ? r : x)) }); setEdit(null); };

  return (
    <div className="cols2" style={{ alignItems: 'start' }}>
      <div className="card" style={{ gridColumn: 'span 1' }}>
        <div className="row spread"><h2>Risks, assumptions, issues & dependencies</h2><button className="btn sm no-print" onClick={() => setEdit({ r: blank(), isNew: true })}><Icon d={I.plus} size={14} /> Add</button></div>
        <label className="row small muted no-print" style={{ margin: '8px 0' }}><input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} /> Show closed</label>
        {list.length === 0 && <p className="muted">Nothing logged. Capture what could go wrong, what you are assuming, and what you depend on.</p>}
        {list.map((r) => (
          <div key={r.id} className="row spread" style={{ padding: '10px 0', borderTop: '1px solid var(--line)', opacity: r.status === 'closed' ? 0.55 : 1, alignItems: 'flex-start' }}>
            <div style={{ minWidth: 0 }}>
              <div><span className="tag" style={{ marginRight: 6 }}>{TYPES.find(([k]) => k === r.type)?.[1]}</span><b>{r.title}</b></div>
              <div className="small muted">{r.status}{r.owner && ` · ${r.owner}`}{r.response && ` · ${r.response}`}</div>
            </div>
            <div className="row no-print" style={{ gap: 4, flex: 'none' }}>
              {(r.type === 'risk' || r.type === 'issue') && <span className={`tag ${tone(riskScore(r))}`} title="Probability × impact">{riskScore(r)}</span>}
              <button className="btn ghost sm" aria-label="Edit entry" onClick={() => setEdit({ r, isNew: false })}><Icon d={I.edit} size={14} /></button>
              <button className="btn ghost sm danger" aria-label="Delete entry" onClick={() => onSave({ ...p, risks: p.risks.filter((x) => x.id !== r.id) })}><Icon d={I.x} size={14} /></button>
            </div>
          </div>
        ))}
      </div>
      <div className="card">
        <h2 style={{ marginBottom: 10 }}>Heat map <span className="faint small">(open risks & issues)</span></h2>
        <div className="heat">
          {[5, 4, 3, 2, 1].map((imp) => LEVELS.map((pr) => {
            const n = live.filter((r) => r.probability === pr && r.impact === imp).length;
            return <div key={`${pr}-${imp}`} className={`cell ${scoreTone(pr * imp)}`}>{n || ''}</div>;
          }))}
        </div>
        <div className="row spread small faint" style={{ marginTop: 6 }}><span>Probability →</span><span>Impact ↑</span></div>
      </div>
      {edit && <RaidForm r={edit.r} onClose={() => setEdit(null)} onSave={(r) => save(r, edit.isNew)} onDelete={edit.isNew ? undefined : () => { onSave({ ...p, risks: p.risks.filter((x) => x.id !== edit.r.id) }); setEdit(null); }} />}
    </div>
  );
}
