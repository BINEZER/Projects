import type { Project, Stage } from '../types';

export const uid = () => Math.random().toString(36).slice(2, 10);

export const totalWeight = (stages: { weight: number }[]) => stages.reduce((s, x) => s + Math.max(0, x.weight), 0);

/** Share of the whole project a stage represents (0–100). */
export const share = (stage: Stage, stages: Stage[]) => {
  const t = totalWeight(stages);
  return t ? (Math.max(0, stage.weight) / t) * 100 : 0;
};

/** Weighted completion of a project (0–100). */
export const progressOf = (stages: Stage[]) => {
  const t = totalWeight(stages);
  if (!t) return 0;
  return stages.reduce((s, x) => s + (Math.max(0, x.weight) * x.progress) / 100, 0) / t * 100;
};

export const currentStage = (stages: Stage[]) => stages.find((s) => s.progress < 100);

const DAY = 86_400_000;
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** Whole days until due (negative = overdue). null when no due date. */
export const daysLeft = (due?: string) => {
  if (!due) return null;
  const [y, m, d] = due.split('-').map(Number);
  return Math.round((new Date(y, m - 1, d).getTime() - startOfToday()) / DAY);
};

export const isOverdue = (p: Project) => p.status === 'active' && (daysLeft(p.due) ?? 0) < 0;

export const dueLabel = (due?: string) => {
  const n = daysLeft(due);
  if (n === null) return '';
  if (n < 0) return `${-n}d overdue`;
  if (n === 0) return 'Due today';
  if (n === 1) return 'Due tomorrow';
  if (n < 14) return `${n} days left`;
  return new Date(due + 'T00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

/** Stable soft hue for a category name. */
export const hueOf = (s: string) => {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
};
