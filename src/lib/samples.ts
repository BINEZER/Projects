import type { Config, Item, Member, Project, Raid, Sprint } from '../types';
import { stagesFrom } from './templates';
import { uid } from './progress';
import { isoDay } from './pm';

const DAY = 86_400_000;
const day = (n: number) => isoDay(Date.now() + n * DAY);

export const sampleTeam = (): Member[] => [
  { id: uid(), name: 'Hanna (sample)', role: 'Site engineer', rate: 450 },
  { id: uid(), name: 'Dawit (sample)', role: 'Developer', rate: 600 },
  { id: uid(), name: 'Selam (sample)', role: 'Operations', rate: 400 },
];

/** A small, realistic portfolio that demonstrates every level and method. */
export function samples(config: Config, team: Member[] = []): Project[] {
  const [hanna, dawit, selam] = [team[0]?.id, team[1]?.id, team[2]?.id];
  const now = Date.now();
  const tpl = (name: string) => config.templates.find((t) => t.name === name) ?? config.templates[0];
  const base = (title: string, kind: Project['kind'], extra: Partial<Project> = {}): Project => ({
    id: uid(), title, kind, method: 'traditional', category: 'Uncategorized', status: 'active', notes: '', fields: [], stages: [], backlog: [], sprints: [], risks: [], expenses: [], time: [],
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

  // ---- owners, phase dates, tasks, expenses and time (demonstrates teams, timeline and costs) ----
  portfolio.ownerId = selam; progEl.ownerId = hanna; progTech.ownerId = dawit;
  [lift, lift2].forEach((x) => (x.ownerId = hanna)); [app, web].forEach((x) => (x.ownerId = dawit)); [coffee, home].forEach((x) => (x.ownerId = selam));
  const phaseDates = (p: Project, ranges: [number, number][], owner?: string) => p.stages.forEach((s, i) => { if (ranges[i]) { s.start = day(ranges[i][0]); s.due = day(ranges[i][1]); s.ownerId = owner; } });
  phaseDates(lift, [[-45, -40], [-40, -25], [-25, -18], [-18, -5], [-5, 2], [2, 5]], hanna);
  phaseDates(coffee, [[-30, -26], [-26, -15], [-15, -5], [-5, 3], [3, 10], [10, 14]], selam);
  const task = (title: string, status: Item['status'], assigneeId: string | undefined, due: number, est: number, stageId?: string): Item =>
    ({ id: uid(), title, points: 0, status, assigneeId, due: day(due), estimateHours: est, stageId, doneAt: status === 'done' ? now - 5 * DAY : undefined });
  const mech = lift.stages[3];
  mech.source = 'backlog';
  lift.backlog = [task('Install guide rails', 'done', hanna, -12, 24, mech.id), task('Mount car frame', 'done', hanna, -8, 16, mech.id), task('Hoist machine & cabling', 'doing', hanna, -1, 20, mech.id), task('Install landing doors', 'todo', hanna, 2, 16, mech.id)];
  lift.actualCost = 300_000;
  lift.expenses = [
    { id: uid(), date: day(-30), description: 'Motor & controller (import)', amount: 420_000, category: 'Materials' },
    { id: uid(), date: day(-22), description: 'Freight & customs', amount: 135_000, category: 'Logistics' },
  ];
  lift.time = [
    { id: uid(), date: day(-14), hours: 8, memberId: hanna, note: 'Rails alignment', itemId: lift.backlog[0].id },
    { id: uid(), date: day(-9), hours: 12, memberId: hanna, note: '', itemId: lift.backlog[1].id },
    { id: uid(), date: day(-2), hours: 9, memberId: hanna, note: 'Hoisting', itemId: lift.backlog[2].id },
  ];
  app.backlog.forEach((x, i) => { x.assigneeId = i % 2 ? hanna : dawit; if (x.status !== 'done') { x.due = day(3 + i); x.estimateHours = x.points * 3; } });
  app.actualCost = 150_000;
  app.expenses = [{ id: uid(), date: day(-12), description: 'Cloud hosting', amount: 8_000, category: 'Infrastructure' }, { id: uid(), date: day(-5), description: 'Design assets', amount: 15_000, category: 'Design' }];
  app.time = [
    { id: uid(), date: day(-6), hours: 14, memberId: dawit, note: 'Customer dashboard', itemId: app.backlog[2].id },
    { id: uid(), date: day(-3), hours: 10, memberId: dawit, note: 'Service request form', itemId: app.backlog[3].id },
    { id: uid(), date: day(-1), hours: 6, memberId: hanna, note: 'Invoice view' },
  ];
  coffee.actualCost = 1_700_000;
  coffee.expenses = [{ id: uid(), date: day(-10), description: 'Lab quality tests', amount: 12_000, category: 'Quality' }, { id: uid(), date: day(-6), description: 'Export permit fees', amount: 38_000, category: 'Permits' }];
  coffee.backlog = [task('Book container', 'doing', selam, 2, 4, coffee.stages[3].id), task('Prepare bill of lading', 'todo', selam, 4, 3, coffee.stages[3].id), task('Confirm buyer payment terms', 'todo', undefined, 6, 2, coffee.stages[4].id)];
  coffee.time = [{ id: uid(), date: day(-4), hours: 5, memberId: selam, note: 'Permit follow-up' }];

  return [portfolio, progEl, progTech, lift, lift2, app, web, coffee, home, audit];
}
