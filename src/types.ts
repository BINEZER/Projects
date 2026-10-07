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
  /** Hybrid: 'backlog' = progress is driven by the backlog items assigned to this stage. */
  source?: 'manual' | 'backlog';
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
  stageId?: string; // hybrid: which phase this work belongs to
  doneAt?: number;
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
  owner: string;
  response: string;
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
  notes: string;
  fields: Field[]; // any custom details: vendor, container no., budget…
  stages: Stage[];
  backlog: Item[];
  sprints: Sprint[];
  risks: Raid[];
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
}

export interface User {
  uid: string;
  name: string;
  email?: string;
  photo?: string;
}
