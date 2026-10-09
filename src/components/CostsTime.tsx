import { useState } from 'react';
import type { Expense, Member, Project, TimeEntry } from '../types';
import { uid } from '../lib/progress';
import { expenseTotal, hoursEstimated, hoursLogged, isoDay, laborCost } from '../lib/pm';
import { Icon, I, Kpi, MemberSelect, Modal, Who, num } from './ui';

function ExpenseForm({ e, p, cats, onSave, onDelete, onClose, currency }: { e: Expense; p: Project; cats: string[]; onSave: (e: Expense) => void; onDelete?: () => void; onClose: () => void; currency: string }) {
  const [x, setX] = useState(e);
  return (
    <Modal onClose={onClose}>
      <div className="stack">
        <h2>{onDelete ? 'Edit expense' : 'New expense'}</h2>
        <label className="f">Description<input type="text" autoFocus value={x.description} onChange={(ev) => setX({ ...x, description: ev.target.value })} placeholder="e.g. Freight invoice, materials, permit fee" /></label>
        <div className="row">
          <label className="f" style={{ flex: 1 }}>Amount{currency && ` (${currency})`}<input type="number" min={0} value={x.amount || ''} onChange={(ev) => setX({ ...x, amount: Math.max(0, +ev.target.value || 0) })} /></label>
          <label className="f" style={{ flex: 1 }}>Date<input type="date" value={x.date} onChange={(ev) => setX({ ...x, date: ev.target.value })} /></label>
        </div>
        <div className="row">
          <label className="f" style={{ flex: 1 }}>Category<input type="text" list="xcats" value={x.category} onChange={(ev) => setX({ ...x, category: ev.target.value })} /><datalist id="xcats">{cats.map((c) => <option key={c} value={c} />)}</datalist></label>
          {p.stages.length > 0 && <label className="f" style={{ flex: 1 }}>Phase<select value={x.stageId ?? ''} onChange={(ev) => setX({ ...x, stageId: ev.target.value || undefined })}><option value="">None</option>{p.stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>}
        </div>
        <div className="row spread">{onDelete ? <button className="btn danger" onClick={onDelete}>Delete</button> : <span />}
          <div className="row"><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" disabled={!x.description.trim() || !x.amount || !x.date} onClick={() => onSave(x)}>Save</button></div></div>
      </div>
    </Modal>
  );
}

function TimeForm({ t, p, team, onSave, onDelete, onClose }: { t: TimeEntry; p: Project; team: Member[]; onSave: (t: TimeEntry) => void; onDelete?: () => void; onClose: () => void }) {
  const [x, setX] = useState(t);
  return (
    <Modal onClose={onClose}>
      <div className="stack">
        <h2>{onDelete ? 'Edit time entry' : 'Log time'}</h2>
        <div className="row">
          <label className="f" style={{ flex: 1 }}>Hours<input type="number" min={0} step={0.25} autoFocus value={x.hours || ''} onChange={(e) => setX({ ...x, hours: Math.max(0, +e.target.value || 0) })} /></label>
          <label className="f" style={{ flex: 1 }}>Date<input type="date" value={x.date} onChange={(e) => setX({ ...x, date: e.target.value })} /></label>
        </div>
        <label className="f">Who<MemberSelect members={team} value={x.memberId} onChange={(id) => setX({ ...x, memberId: id })} empty="Not specified" /></label>
        {p.backlog.length > 0 && <label className="f">Task<select value={x.itemId ?? ''} onChange={(e) => setX({ ...x, itemId: e.target.value || undefined })}><option value="">General project work</option>{p.backlog.map((i) => <option key={i.id} value={i.id}>{i.title}</option>)}</select></label>}
        <label className="f">Note<input type="text" value={x.note} onChange={(e) => setX({ ...x, note: e.target.value })} /></label>
        <div className="row spread">{onDelete ? <button className="btn danger" onClick={onDelete}>Delete</button> : <span />}
          <div className="row"><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" disabled={!x.hours || !x.date} onClick={() => onSave(x)}>Save</button></div></div>
      </div>
    </Modal>
  );
}

/** Expense ledger and time log. Both feed the project's "spent" figure and its cost index. */
export function CostsTime({ p, team, currency, onSave }: { p: Project; team: Member[]; currency: string; onSave: (p: Project) => void }) {
  const [ex, setEx] = useState<{ e: Expense; isNew: boolean } | null>(null);
  const [tm, setTm] = useState<{ t: TimeEntry; isNew: boolean } | null>(null);
  const today = isoDay(Date.now());
  const exp = expenseTotal(p), labor = laborCost(p, team), lump = p.actualCost ?? 0, hrs = hoursLogged(p), est = hoursEstimated(p);
  const spent = exp + labor + lump, budget = p.budget ?? 0;
  const c = currency ? ` ${currency}` : '';
  const cats = [...new Set(p.expenses.map((e) => e.category).filter(Boolean))];

  const byMonth = new Map<string, number>();
  p.expenses.forEach((e) => byMonth.set(e.date.slice(0, 7), (byMonth.get(e.date.slice(0, 7)) ?? 0) + e.amount));
  const months = [...byMonth].sort(([a], [b]) => a.localeCompare(b)).slice(-6);
  const maxM = Math.max(1, ...months.map(([, v]) => v));
  const byWho = team.map((m) => ({ m, h: p.time.filter((t) => t.memberId === m.id).reduce((s, t) => s + t.hours, 0) })).filter((x) => x.h > 0);
  const unassigned = p.time.filter((t) => !t.memberId || !team.some((m) => m.id === t.memberId)).reduce((s, t) => s + t.hours, 0);

  const saveEx = (e: Expense, isNew: boolean) => { onSave({ ...p, expenses: isNew ? [...p.expenses, e] : p.expenses.map((x) => (x.id === e.id ? e : x)) }); setEx(null); };
  const saveTm = (t: TimeEntry, isNew: boolean) => { onSave({ ...p, time: isNew ? [...p.time, t] : p.time.map((x) => (x.id === t.id ? t : x)) }); setTm(null); };

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="grid kpis">
        <Kpi v={budget ? num(budget) : '—'} l={`Budget${c}`} />
        <Kpi v={spent ? num(spent) : '0'} l={`Spent${c}`} tone={budget && spent > budget ? 'var(--bad)' : undefined} />
        <Kpi v={budget ? num(budget - spent) : '—'} l={`Remaining${c}`} tone={budget && spent > budget ? 'var(--bad)' : undefined} />
        <Kpi v={`${Math.round(hrs * 10) / 10}h`} l={est ? `Logged of ${est}h estimated` : 'Hours logged'} tone={est && hrs > est ? 'var(--warn)' : undefined} />
      </div>
      {budget > 0 && <div className="card"><div className="row spread small muted" style={{ marginBottom: 6 }}><span>Budget used</span><span>{Math.round((spent / budget) * 100)}%</span></div>
        <div className="bar"><i style={{ width: `${Math.min(100, (spent / budget) * 100)}%`, background: spent > budget ? 'var(--bad)' : undefined }} /></div>
        <div className="small faint" style={{ marginTop: 8 }}>Spent = expenses {num(exp)} + time {num(labor)} + other costs {num(lump)}{c}. Set “Other costs” and hourly rates in Schedule &amp; budget and Admin → Team.</div></div>}

      <div className="cols2" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="row spread"><h2>Expenses</h2><button className="btn sm no-print" onClick={() => setEx({ e: { id: uid(), date: today, description: '', amount: 0, category: '' }, isNew: true })}><Icon d={I.plus} size={14} /> Add expense</button></div>
          {p.expenses.length === 0 && <p className="muted">No expenses logged. Record invoices and purchases as they happen.</p>}
          {[...p.expenses].sort((a, b) => b.date.localeCompare(a.date)).map((e) => (
            <div key={e.id} className="row spread" style={{ padding: '9px 0', borderTop: '1px solid var(--line)' }}>
              <div style={{ minWidth: 0 }}><b>{e.description}</b><div className="small faint">{e.date}{e.category && ` · ${e.category}`}{e.stageId && ` · ${p.stages.find((s) => s.id === e.stageId)?.name ?? ''}`}</div></div>
              <div className="row" style={{ gap: 2, flex: 'none' }}><b>{num(e.amount)}</b>
                <span className="row no-print" style={{ gap: 0 }}><button className="btn ghost sm" aria-label="Edit expense" onClick={() => setEx({ e, isNew: false })}><Icon d={I.edit} size={14} /></button>
                  <button className="btn ghost sm danger" aria-label="Delete expense" onClick={() => onSave({ ...p, expenses: p.expenses.filter((x) => x.id !== e.id) })}><Icon d={I.x} size={14} /></button></span></div>
            </div>
          ))}
          {months.length > 1 && (
            <div className="row" style={{ alignItems: 'flex-end', height: 90, gap: 10, marginTop: 14 }}>
              {months.map(([k, v]) => <div key={k} style={{ flex: 1, textAlign: 'center' }}><div style={{ height: Math.max(4, (v / maxM) * 56), background: 'var(--accent)', borderRadius: 6 }} /><div className="small faint">{k.slice(5)}</div></div>)}
            </div>
          )}
        </div>

        <div className="card">
          <div className="row spread"><h2>Time</h2><button className="btn sm no-print" onClick={() => setTm({ t: { id: uid(), date: today, hours: 0, note: '' }, isNew: true })}><Icon d={I.clock} size={14} /> Log time</button></div>
          {byWho.length > 0 && <div className="row wrap" style={{ gap: 6, margin: '8px 0' }}>{byWho.map(({ m, h }) => <span key={m.id} className="tag"><Who members={team} id={m.id} /> {m.name.split(' ')[0]} {Math.round(h * 10) / 10}h{m.rate ? ` · ${num(h * m.rate)}` : ''}</span>)}{unassigned > 0 && <span className="tag">Unspecified {Math.round(unassigned * 10) / 10}h</span>}</div>}
          {p.time.length === 0 && <p className="muted">No time logged yet.</p>}
          {[...p.time].sort((a, b) => b.date.localeCompare(a.date)).map((t) => (
            <div key={t.id} className="row spread" style={{ padding: '9px 0', borderTop: '1px solid var(--line)' }}>
              <div style={{ minWidth: 0 }}><b>{t.hours}h</b> <span className="muted">{p.backlog.find((i) => i.id === t.itemId)?.title ?? 'General work'}</span><div className="small faint">{t.date}{t.note && ` · ${t.note}`}</div></div>
              <div className="row" style={{ gap: 4, flex: 'none' }}><Who members={team} id={t.memberId} />
                <span className="row no-print" style={{ gap: 0 }}><button className="btn ghost sm" aria-label="Edit time entry" onClick={() => setTm({ t, isNew: false })}><Icon d={I.edit} size={14} /></button>
                  <button className="btn ghost sm danger" aria-label="Delete time entry" onClick={() => onSave({ ...p, time: p.time.filter((x) => x.id !== t.id) })}><Icon d={I.x} size={14} /></button></span></div>
            </div>
          ))}
        </div>
      </div>
      {ex && <ExpenseForm e={ex.e} p={p} cats={cats} currency={currency} onClose={() => setEx(null)} onSave={(e) => saveEx(e, ex.isNew)} onDelete={ex.isNew ? undefined : () => { onSave({ ...p, expenses: p.expenses.filter((x) => x.id !== ex.e.id) }); setEx(null); }} />}
      {tm && <TimeForm t={tm.t} p={p} team={team} onClose={() => setTm(null)} onSave={(t) => saveTm(t, tm.isNew)} onDelete={tm.isNew ? undefined : () => { onSave({ ...p, time: p.time.filter((x) => x.id !== tm.t.id) }); setTm(null); }} />}
    </div>
  );
}
