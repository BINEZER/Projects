import type { Member, Project } from '../types';
import { daysLeft } from './progress';
import { stageProgress } from './pm';

export interface Reminder {
  id: string;
  kind: 'project' | 'phase' | 'task' | 'sprint';
  title: string;
  sub: string;
  due: string;
  days: number; // negative = overdue
  href: string;
  /** Person responsible, if any. */
  who?: string;
  level: 'overdue' | 'today' | 'soon';
}

/** Everything overdue or due within `lead` days across projects, phases, tasks and sprint ends. */
export function collectReminders(projects: Project[], lead: number): Reminder[] {
  const out: Reminder[] = [];
  const push = (r: Omit<Reminder, 'days' | 'level'>) => {
    const d = daysLeft(r.due);
    if (d === null || d > lead) return;
    out.push({ ...r, days: d, level: d < 0 ? 'overdue' : d === 0 ? 'today' : 'soon' });
  };
  for (const p of projects) {
    if (p.status !== 'active') continue;
    const href = `#/p/${p.id}`;
    if (p.due) push({ id: `p-${p.id}`, kind: 'project', title: p.title, sub: p.kind === 'project' ? 'Project due' : `${p.kind} due`, due: p.due, href, who: p.ownerId });
    for (const s of p.stages) {
      if (s.due && stageProgress(s, p) < 100) push({ id: `s-${s.id}`, kind: 'phase', title: s.name, sub: `Phase · ${p.title}`, due: s.due, href, who: s.ownerId ?? p.ownerId });
    }
    for (const i of p.backlog) {
      if (i.due && i.status !== 'done') push({ id: `i-${i.id}`, kind: 'task', title: i.title, sub: `Task · ${p.title}`, due: i.due, href, who: i.assigneeId });
    }
    for (const sp of p.sprints) {
      if (p.backlog.some((i) => i.sprintId === sp.id && i.status !== 'done')) push({ id: `sp-${sp.id}`, kind: 'sprint', title: `${sp.name} ends`, sub: `Sprint · ${p.title}`, due: sp.end, href, who: p.ownerId });
    }
  }
  return out.sort((a, b) => a.days - b.days);
}

/** Which team member is the signed-in user, matched by email. */
export const findMe = (team: Member[], email?: string) =>
  email ? team.find((m) => m.email && m.email.toLowerCase() === email.toLowerCase()) : undefined;

export const memberName = (team: Member[], id?: string) => team.find((m) => m.id === id)?.name ?? '';

// ---------- browser notifications (work while the app is open) ----------
const KEY_ON = 'tracker.notify';
const KEY_LAST = 'tracker.notified';
const store = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
};

export const notificationsSupported = () => typeof Notification !== 'undefined';
export const notificationsOn = () => notificationsSupported() && Notification.permission === 'granted' && store.get(KEY_ON) === '1';
export async function enableNotifications(): Promise<'granted' | 'denied' | 'default' | 'unsupported'> {
  if (!notificationsSupported()) return 'unsupported';
  const r = await Notification.requestPermission();
  store.set(KEY_ON, r === 'granted' ? '1' : '0');
  return r;
}
export const disableNotifications = () => store.set(KEY_ON, '0');

/** At most one summary notification per day. */
export function maybeNotify(list: Reminder[], workspace: string) {
  if (!notificationsOn() || !list.length) return;
  const today = new Date().toDateString();
  if (store.get(KEY_LAST) === today) return;
  const overdue = list.filter((r) => r.level === 'overdue').length;
  const body = list.slice(0, 3).map((r) => `• ${r.title} (${r.days < 0 ? `${-r.days}d overdue` : r.days === 0 ? 'today' : `in ${r.days}d`})`).join('\n');
  try {
    new Notification(`${workspace}: ${list.length} deadline${list.length === 1 ? '' : 's'}${overdue ? `, ${overdue} overdue` : ''}`, { body });
    store.set(KEY_LAST, today);
  } catch { /* some browsers only allow notifications from a service worker */ }
}

// ---------- calendar export (.ics): Google Calendar / phone calendars then do the reminding ----------
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
export function deadlinesICS(projects: Project[], workspace: string, lead: number) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', `PRODID:-//${esc(workspace)}//Tracker//EN`, 'CALSCALE:GREGORIAN'];
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const ev = (uid: string, date: string, title: string, desc: string) => {
    const d = date.replace(/-/g, '');
    lines.push('BEGIN:VEVENT', `UID:${uid}@tracker`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${d}`, `SUMMARY:${esc(title)}`, `DESCRIPTION:${esc(desc)}`,
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(title)}`, `TRIGGER:-P${Math.max(0, lead)}D`, 'END:VALARM', 'END:VEVENT');
  };
  for (const p of projects) {
    if (p.status === 'done') continue;
    if (p.due) ev(`p-${p.id}`, p.due, `Due: ${p.title}`, `${p.kind} · ${p.category}`);
    p.stages.forEach((s) => s.due && ev(`s-${s.id}`, s.due, `Phase due: ${s.name}`, p.title));
    p.backlog.forEach((i) => i.due && i.status !== 'done' && ev(`i-${i.id}`, i.due, `Task due: ${i.title}`, p.title));
    p.sprints.forEach((sp) => ev(`sp-${sp.id}`, sp.end, `${sp.name} ends`, `${p.title}${sp.goal ? ` · ${sp.goal}` : ''}`));
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
