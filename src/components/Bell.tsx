import { useEffect, useRef, useState } from 'react';
import type { Member } from '../types';
import type { Reminder } from '../lib/reminders';
import { Icon, I, Who } from './ui';

const label = (r: Reminder) => (r.days < 0 ? `${-r.days}d overdue` : r.days === 0 ? 'Due today' : r.days === 1 ? 'Due tomorrow' : `In ${r.days} days`);

/** Notification bell: everything overdue or coming up soon. */
export function Bell({ reminders, team, mine, setMine, canFilter, days }: { reminders: Reminder[]; team: Member[]; mine: boolean; setMine: (v: boolean) => void; canFilter: boolean; days: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const f = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', f);
    return () => document.removeEventListener('mousedown', f);
  }, [open]);
  const overdue = reminders.filter((r) => r.level === 'overdue').length;
  return (
    <div className="bell no-print" ref={ref}>
      <button className="btn ghost icon-btn" aria-label={`Reminders (${reminders.length})`} onClick={() => setOpen(!open)}>
        <Icon d={I.bell} />{reminders.length > 0 && <span className={`badge ${overdue ? 'bad' : ''}`}>{reminders.length}</span>}
      </button>
      {open && (
        <div className="card pop">
          <div className="row spread"><h3>Deadlines</h3><span className="small faint">overdue + next {days} days</span></div>
          {canFilter && <label className="row small muted" style={{ margin: '6px 0' }}><input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} /> Only mine</label>}
          {reminders.length === 0 && <p className="muted" style={{ margin: '10px 0 0' }}>Nothing due soon. 🎉</p>}
          <div className="pop-list">
            {reminders.slice(0, 25).map((r) => (
              <a key={r.id} href={r.href} className="pop-row" onClick={() => setOpen(false)}>
                <div style={{ minWidth: 0 }}><b>{r.title}</b><div className="small faint">{r.sub}</div></div>
                <div className="row" style={{ gap: 6, flex: 'none' }}><Who members={team} id={r.who} /><span className={`tag ${r.level === 'overdue' ? 'bad' : r.level === 'today' ? 'warn' : ''}`}>{label(r)}</span></div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
