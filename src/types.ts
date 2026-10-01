export type Status = 'active' | 'paused' | 'done';

export interface Stage {
  id: string;
  name: string;
  /** Relative weight. Shares are normalised, so weights need not add to 100. */
  weight: number;
  /** 0–100 */
  progress: number;
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

export interface Project {
  id: string;
  title: string;
  category: string;
  status: Status;
  due?: string; // yyyy-mm-dd
  ref?: string; // tracking no., PO, order id…
  notes: string;
  fields: Field[]; // any custom details: vendor, container no., budget…
  stages: Stage[];
  log: LogEntry[];
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

export interface Template {
  id: string;
  name: string;
  category: string;
  stages: { id: string; name: string; weight: number }[];
}

/** Admin-managed workspace settings. */
export interface Config {
  workspace: string;
  categories: string[];
  templates: Template[];
}

export interface User {
  uid: string;
  name: string;
  email?: string;
  photo?: string;
}
