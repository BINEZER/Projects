export type Status = 'active' | 'paused' | 'done';
/** Organisational level: portfolios contain programs, programs contain projects. */
export type Kind = 'portfolio' | 'program' | 'project';
/** Delivery approach for a project. */
export type Method = 'traditional' | 'agile' | 'hybrid';
export type Health = 'green' | 'amber' | 'red' | 'none';

export interface Stage {
  id: string;
  name: string;
  /** Relative weight. Shares are normalised, so weights need not add to 100. */
  weight: number;
  /** 0–100, set by hand. Ignored when `source` is 'backlog'. */
  progress: number;
  /** 'backlog' = progress is driven by the tasks / backlog items assigned to this phase. */
  source?: 'manual' | 'backlog';
  ownerId?: string;
  start?: string; // yyyy-mm-dd
  due?: string;
}

export interface LogEntry {
  id: string;
  at: number;
  text: string;
}

export interface Field {
  id: string;
  label: string;
  value: string;
}

export type ItemStatus = 'todo' | 'doing' | 'done';

/** Agile backlog item (story / task). */
export interface Item {
  id: string;
  title: string;
  points: number;
  status: ItemStatus;
  sprintId?: string;
  stageId?: string; // which phase this work belongs to
  doneAt?: number;
  assigneeId?: string;
  due?: string; // yyyy-mm-dd
  estimateHours?: number;
}

export interface Sprint {
  id: string;
  name: string;
  start: string; // yyyy-mm-dd
  end: string;
  goal: string;
}

export type RaidType = 'risk' | 'assumption' | 'issue' | 'dependency';
export interface Raid {
  id: string;
  type: RaidType;
  title: string;
  probability: number; // 1–5
  impact: number; // 1–5
  status: 'open' | 'mitigating' | 'closed';
  owner: string; // free-text name (kept for older entries)
  ownerId?: string;
  response: string;
}

export interface Member {
  id: string;
  name: string;
  email?: string;
  role?: string;
  /** Cost per hour, used to cost logged time. Same currency label as the rest of the app. */
  rate?: number;
}

export interface Expense {
  id: string;
  date: string; // yyyy-mm-dd
  description: string;
  amount: number;
  category: string;
  stageId?: string;
}

export interface TimeEntry {
  id: string;
  date: string; // yyyy-mm-dd
  hours: number;
  memberId?: string;
  note: string;
  itemId?: string; // the task it was spent on
}

export interface Project {
  id: string;
  title: string;
  kind: Kind;
  method: Method; // meaningful for kind 'project'
  parentId?: string;
  /** Relative importance among its siblings when progress rolls up. */
  weight?: number;
  category: string;
  status: Status;
  start?: string; // yyyy-mm-dd
  due?: string; // yyyy-mm-dd
  ref?: string; // tracking no., PO, order id…
  budget?: number; // budget at completion
  actualCost?: number;
  healthOverride?: Health;
  ownerId?: string;
  notes: string;
  fields: Field[]; // any custom details: vendor, container no., budget…
  stages: Stage[];
  backlog: Item[];
  sprints: Sprint[];
  risks: Raid[];
  expenses: Expense[];
  time: TimeEntry[];
  log: LogEntry[];
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

export interface Template {
  id: string;
  name: string;
  category: string;
  method: Method;
  /** Agile/hybrid: creates a first sprint of this many days (0 = continuous flow / Kanban). */
  sprintDays?: number;
  stages: { id: string; name: string; weight: number; source?: 'manual' | 'backlog' }[];
}

/** Admin-managed workspace settings. */
export interface Config {
  workspace: string;
  /** Label shown next to money amounts. Display only: no conversion is ever done. */
  currency: string;
  categories: string[];
  templates: Template[];
  team: Member[];
  /** Items due within this many days appear in reminders. */
  reminderDays: number;
}

export interface User {
  uid: string;
  name: string;
  email?: string;
  photo?: string;
}
