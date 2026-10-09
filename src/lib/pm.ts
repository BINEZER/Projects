import type { Health, Item, Kind, Member, Method, Project, Raid, Sprint, Stage } from '../types';
import { daysLeft, totalWeight } from './progress';

export const KIND_LABEL: Record<Kind, string> = { portfolio: 'Portfolio', program: 'Program', project: 'Project' };
export const METHOD_LABEL: Record<Method, string> = { traditional: 'Traditional', agile: 'Agile', hybrid: 'Hybrid' };

/** Fill in fields that older saved data doesn't have yet. */
export function normalize(p: Partial<Project> & { id: string }): Project {
  return {
    title: '', category: 'Uncategorized', status: 'active', notes: '', createdAt: 0, updatedAt: 0,
    ...p,
    kind: p.kind ?? 'project',
    method: p.method ?? 'traditional',
    fields: p.fields ?? [], stages: p.stages ?? [], backlog: p.backlog ?? [], sprints: p.sprints ?? [],
    risks: p.risks ?? [], expenses: p.expenses ?? [], time: p.time ?? [], log: p.log ?? [],
  } as Project;
}

// ---------- dates ----------
const DAY = 86_400_000;
const ymd = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d).getTime(); };
const today0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
export const isoDay = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const addDays = (iso: string, n: number) => isoDay(ymd(iso) + n * DAY);

// ---------- agile ----------
const pts = (i: Item) => Math.max(0, i.points || 0);

/** Share of work done (0–100): by points, or by count when nothing is estimated. */
export function backlogProgress(items: Item[]): number {
  if (!items.length) return 0;
  const total = items.reduce((s, i) => s + pts(i), 0);
  if (!total) return (items.filter((i) => i.status === 'done').length / items.length) * 100;
  return (items.filter((i) => i.status === 'done').reduce((s, i) => s + pts(i), 0) / total) * 100;
}

export const stageProgress = (s: Stage, p: Project) =>
  s.source === 'backlog' ? backlogProgress(p.backlog.filter((i) => i.stageId === s.id)) : s.progress;

/** Weighted completion of a project's own plan (0–100). */
export function ownProgress(p: Project): number {
  if (p.method === 'agile') return backlogProgress(p.backlog);
  const t = totalWeight(p.stages);
  if (!t) return 0;
  return (p.stages.reduce((s, x) => s + Math.max(0, x.weight) * stageProgress(x, p), 0) / t);
}

export const activeSprint = (p: Project): Sprint | undefined => {
  const t = isoDay(today0());
  const sorted = [...p.sprints].sort((a, b) => a.start.localeCompare(b.start));
  return sorted.find((s) => s.start <= t && t <= s.end) ?? [...sorted].reverse().find((s) => s.start <= t) ?? sorted[0];
};

export const sprintPoints = (p: Project, sprintId: string) => {
  const items = p.backlog.filter((i) => i.sprintId === sprintId);
  return { total: items.reduce((s, i) => s + pts(i), 0), done: items.filter((i) => i.status === 'done').reduce((s, i) => s + pts(i), 0) };
};

/** Points completed in each sprint that has started (for the velocity chart). */
export const velocity = (p: Project) =>
  [...p.sprints].sort((a, b) => a.start.localeCompare(b.start)).filter((s) => s.start <= isoDay(today0()))
    .map((s) => ({ sprint: s, done: sprintPoints(p, s.id).done }));

export function burndown(p: Project, sprint: Sprint) {
  const { total } = sprintPoints(p, sprint.id);
  const items = p.backlog.filter((i) => i.sprintId === sprint.id);
  const n = Math.max(1, Math.round((ymd(sprint.end) - ymd(sprint.start)) / DAY));
  const t = today0();
  return Array.from({ length: n + 1 }, (_, i) => {
    const dayEnd = ymd(sprint.start) + (i + 1) * DAY - 1;
    const actual = ymd(sprint.start) + i * DAY <= t
      ? total - items.filter((x) => x.status === 'done' && (x.doneAt ?? 0) <= dayEnd).reduce((s, x) => s + pts(x), 0)
      : null;
    return { day: i, ideal: total * (1 - i / n), actual };
  });
}

// ---------- risk ----------
export const riskScore = (r: Raid) => r.probability * r.impact;
export const isLive = (r: Raid) => r.status !== 'closed' && (r.type === 'risk' || r.type === 'issue');
export const scoreTone = (s: number) => (s >= 15 ? 'bad' : s >= 10 ? 'warn' : 'ok');

// ---------- costs & time ----------
export const hoursLogged = (p: Project) => p.time.reduce((s, t) => s + Math.max(0, t.hours || 0), 0);
export const hoursEstimated = (p: Project) => p.backlog.reduce((s, i) => s + Math.max(0, i.estimateHours || 0), 0);
export const expenseTotal = (p: Project) => p.expenses.reduce((s, e) => s + Math.max(0, e.amount || 0), 0);
export const laborCost = (p: Project, members: Member[]) =>
  p.time.reduce((s, t) => s + Math.max(0, t.hours || 0) * (members.find((m) => m.id === t.memberId)?.rate ?? 0), 0);
/** Everything spent: lump-sum "other costs" + expense ledger + logged time at each person's rate. */
export const spentOf = (p: Project, members: Member[]) => Math.max(0, p.actualCost ?? 0) + expenseTotal(p) + laborCost(p, members);

// ---------- rollups ----------
export interface Metrics {
  progress: number;
  /** % of the schedule that has elapsed (0–100), null without start+due dates. */
  planned: number | null;
  spi: number | null; // schedule performance index = EV / PV
  cpi: number | null; // cost performance index = EV / AC
  bac: number; // budget at completion
  ac: number; // actual cost
  ev: number; // earned value = BAC × progress
  health: Health;
  riskScore: number;
  openRisks: number;
  hours: number;
  estHours: number;
  children: Project[];
}

const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
const RANK: Record<Health, number> = { none: 0, green: 1, amber: 2, red: 3 };

function plannedPct(p: Project, progress: number): number | null {
  if (p.status === 'done') return 100;
  if (!p.start || !p.due) return null;
  const s = ymd(p.start), e = ymd(p.due);
  if (e <= s) return null;
  void progress;
  return clamp((today0() - s) / (e - s), 0, 1) * 100;
}

function autoHealth(p: Project, m: Omit<Metrics, 'health'>): Health {
  if (p.status !== 'active') return 'none';
  const late = (daysLeft(p.due) ?? 1) < 0 && m.progress < 100;
  if (late || (m.spi !== null && m.spi < 0.75) || (m.cpi !== null && m.cpi < 0.8) || m.riskScore >= 15) return 'red';
  const soon = daysLeft(p.due) !== null && (daysLeft(p.due) as number) <= 7 && m.progress < 70;
  if (soon || (m.spi !== null && m.spi < 0.9) || (m.cpi !== null && m.cpi < 0.95) || m.riskScore >= 10) return 'amber';
  return 'green';
}

/** Metrics for every item; portfolios and programs roll up their children. */
export function buildMetrics(projects: Project[], members: Member[] = []): Map<string, Metrics> {
  const byId = new Map(projects.map((p) => [p.id, p]));
  const kids = new Map<string, Project[]>();
  projects.forEach((p) => {
    if (p.parentId && p.parentId !== p.id && byId.has(p.parentId)) kids.set(p.parentId, [...(kids.get(p.parentId) ?? []), p]);
  });
  const out = new Map<string, Metrics>();
  const visiting = new Set<string>();

  const calc = (p: Project): Metrics => {
    const hit = out.get(p.id);
    if (hit) return hit;
    const children = visiting.has(p.id) ? [] : kids.get(p.id) ?? [];
    visiting.add(p.id);
    const own = p.risks;
    const live = own.filter(isLive);
    let m: Omit<Metrics, 'health'>;

    if (p.kind !== 'project' || children.length) {
      const cm = children.map((c) => ({ c, m: calc(c) }));
      const w = (c: Project) => Math.max(0.0001, c.weight ?? 1);
      const tw = cm.reduce((s, x) => s + w(x.c), 0);
      const progress = tw ? cm.reduce((s, x) => s + w(x.c) * x.m.progress, 0) / tw : 0;
      const withPlan = cm.filter((x) => x.m.planned !== null);
      const pv = withPlan.reduce((s, x) => s + w(x.c) * (x.m.planned as number), 0);
      const ev = withPlan.reduce((s, x) => s + w(x.c) * x.m.progress, 0);
      const bac = cm.reduce((s, x) => s + x.m.bac, 0), ac = cm.reduce((s, x) => s + x.m.ac, 0), evm = cm.reduce((s, x) => s + x.m.ev, 0);
      m = {
        progress, planned: withPlan.length ? pv / withPlan.reduce((s, x) => s + w(x.c), 0) : null,
        spi: pv > 0 ? ev / pv : null, bac, ac, ev: evm, cpi: ac > 0 && bac > 0 ? evm / ac : null,
        riskScore: Math.max(0, ...live.map(riskScore), ...cm.map((x) => x.m.riskScore)),
        openRisks: live.length + cm.reduce((s, x) => s + x.m.openRisks, 0), hours: hoursLogged(p) + cm.reduce((s, x) => s + x.m.hours, 0),
        estHours: hoursEstimated(p) + cm.reduce((s, x) => s + x.m.estHours, 0), children,
      };
      const hs = cm.filter((x) => x.c.status === 'active' && x.m.health !== 'none').map((x) => x.m.health);
      const worst = hs.reduce<Health>((a, b) => (RANK[b] > RANK[a] ? b : a), 'none');
      const h = p.status !== 'active' ? 'none' : p.healthOverride ?? (worst === 'none' && live.length ? autoHealth(p, { ...m }) : worst);
      const r = { ...m, health: h };
      out.set(p.id, r);
      visiting.delete(p.id);
      return r;
    }

    const progress = p.status === 'done' ? 100 : ownProgress(p);
    const planned = plannedPct(p, progress);
    const bac = Math.max(0, p.budget ?? 0), ac = spentOf(p, members), ev = (bac * progress) / 100;
    m = {
      progress, planned, spi: planned && planned > 0 ? progress / planned : null, bac, ac, ev,
      cpi: ac > 0 && bac > 0 ? ev / ac : null, riskScore: Math.max(0, ...live.map(riskScore)), openRisks: live.length,
      hours: hoursLogged(p), estHours: hoursEstimated(p), children: [],
    };
    const r = { ...m, health: p.healthOverride && p.status === 'active' ? p.healthOverride : autoHealth(p, m) };
    out.set(p.id, r);
    visiting.delete(p.id);
    return r;
  };
  projects.forEach(calc);
  return out;
}

export const HEALTH_LABEL: Record<Health, string> = { green: 'On track', amber: 'At risk', red: 'Off track', none: '—' };

/** Valid parents for a given level: programs sit under portfolios; projects under programs or portfolios. */
export const parentOptions = (kind: Kind, all: Project[], selfId?: string) =>
  all.filter((p) => p.id !== selfId && (kind === 'program' ? p.kind === 'portfolio' : kind === 'project' ? p.kind !== 'project' : false));
