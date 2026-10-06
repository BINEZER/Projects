import type { Config, Item, Project, Raid, Sprint } from '../types';
import { stagesFrom } from './templates';
import { uid } from './progress';
import { isoDay } from './pm';

const DAY = 86_400_000;
const day = (n: number) => isoDay(Date.now() + n * DAY);

/** A small, realistic portfolio that demonstrates every level and method. */
export function samples(config: Config): Project[] {
  const now = Date.now();
  const tpl = (name: string) => config.templates.find((t) => t.name === name) ?? config.templates[0];
  const base = (title: string, kind: Project['kind'], extra: Partial<Project> = {}): Project => ({
    id: uid(), title, kind, method: 'traditional', category: 'Uncategorized', status: 'active', notes: '', fields: [], stages: [], backlog: [], sprints: [], risks: [],
    log: [{ id: uid(), at: now, text: 'Created from sample data' }], createdAt: now - 30 * DAY, updatedAt: now, ...extra,
  });
  const staged = (name: string, prog: number[]) => stagesFrom(tpl(name)).map((s, i) => ({ ...s, progress: prog[i] ?? 0 }));
  const risk = (type: Raid['type'], title: string, probability: number, impact: number, response = '', status: Raid['status'] = 'open'): Raid => ({ id: uid(), type, title, probability, impact, status, owner: '', response });

  const portfolio = base('IntelMotion Group', 'portfolio', { category: 'IntelMotion', notes: 'Strategic portfolio: elevator business and the new tech arm.' });
  const progEl = base('Elevator Installations 2026', 'program', { category: 'IntelMotion', parentId: portfolio.id });
  const progTech = base('IntelTech Launch', 'program', { category: 'IntelTech', parentId: portfolio.id, weight: 2 });

  const lift = base('Lift install – Bole Tower B', 'project', {
    category: 'IntelMotion', parentId: progEl.id, method: 'traditional', ref: 'IM-0457', start: day(-45), due: day(-3), budget: 1_200_000, actualCost: 1_050_000,
    stages: staged('Elevator installation', [100, 100, 100, 40]), risks: [risk('risk', 'Customs delay on motor imports', 4, 4, 'Pre-clear documents; use broker')],
  });
  const lift2 = base('Lift install – Piassa Mall', 'project', {
    category: 'IntelMotion', parentId: progEl.id, method: 'traditional', start: day(-10), due: day(60), budget: 800_000, actualCost: 150_000,
    stages: staged('Elevator installation', [100, 40]),
  });

  const sprints: Sprint[] = [
    { id: uid(), name: 'Sprint 1', start: day(-28), end: day(-15), goal: 'Auth and onboarding' },
    { id: uid(), name: 'Sprint 2', start: day(-14), end: day(-1), goal: 'Customer portal' },
    { id: uid(), name: 'Sprint 3', start: day(0), end: day(13), goal: 'Quotes and payments' },
  ];
  const it = (title: string, points: number, status: Item['status'], si?: number, doneAgo = 0): Item => ({
    id: uid(), title, points, status, sprintId: si === undefined ? undefined : sprints[si].id, doneAt: status === 'done' ? now - doneAgo * DAY : undefined,
  });
  const app = base('IntelTech customer app', 'project', {
    category: 'IntelTech', parentId: progTech.id, method: 'agile', start: day(-28), due: day(30), budget: 600_000, actualCost: 280_000, sprints,
    backlog: [
      it('Sign-in with Google', 5, 'done', 0, 22), it('Onboarding flow', 8, 'done', 0, 18), it('Customer dashboard', 8, 'done', 1, 8), it('Service request form', 5, 'done', 1, 5),
      it('Invoice view', 5, 'doing', 2), it('Online quote builder', 13, 'todo', 2), it('Payment integration', 8, 'todo', 2), it('Push notifications', 5, 'todo'), it('Admin reports', 8, 'todo'),
    ],
    risks: [risk('risk', 'Payment provider approval takes longer than planned', 3, 4, 'Start the application now'), risk('dependency', 'Needs brand assets from marketing', 2, 2)],
  });

  const hybridTpl = tpl('Hybrid – software build');
  const hs = stagesFrom(hybridTpl);
  const web = base('IntelTech website v1', 'project', {
    category: 'IntelTech', parentId: progTech.id, method: 'hybrid', start: day(-20), due: day(40), budget: 250_000, actualCost: 60_000, stages: hs.map((s, i) => ({ ...s, progress: i === 0 ? 100 : 0 })),
    sprints: [{ id: 'web-s1', name: 'Sprint 1', start: day(-6), end: day(7), goal: 'Home and services pages' }],
  });
  web.backlog = [
    { id: uid(), title: 'Home page', points: 5, status: 'done', sprintId: 'web-s1', stageId: hs[1].id, doneAt: now - 2 * DAY },
    { id: uid(), title: 'Services pages', points: 8, status: 'doing', sprintId: 'web-s1', stageId: hs[1].id },
    { id: uid(), title: 'Contact form', points: 3, status: 'todo', sprintId: 'web-s1', stageId: hs[1].id },
    { id: uid(), title: 'Blog', points: 5, status: 'todo', stageId: hs[1].id },
  ];

  const coffee = base('Green coffee – 2 containers to Hamburg', 'project', {
    category: 'Tamar Trading', ref: 'TT-2026-014', start: day(-30), due: day(12), budget: 3_400_000, actualCost: 1_900_000,
    stages: staged('Coffee export', [100, 100, 60]), fields: [{ id: uid(), label: 'Buyer', value: 'Nordbean GmbH' }, { id: uid(), label: 'Volume', value: '38 tons' }],
    risks: [risk('risk', 'Container availability at Djibouti', 3, 3, 'Book with two carriers')],
  });
  const home = base('Kids’ room renovation', 'project', { category: 'Personal', due: day(45), stages: staged('Home / family', [100, 50]) });
  const audit = base('Q2 supplier audit', 'project', { category: 'Nigist LLC', status: 'done', completedAt: now - 8 * DAY, due: day(-10), stages: staged('Blank', [100, 100, 100]) });

  return [portfolio, progEl, progTech, lift, lift2, app, web, coffee, home, audit];
}
