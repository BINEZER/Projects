import type { Config, Method, Stage, Template } from '../types';
import { uid } from './progress';

type S = [string, number, ('manual' | 'backlog')?];
const t = (name: string, category: string, method: Method, stages: S[], sprintDays?: number): Template => ({
  id: uid(), name, category, method, sprintDays,
  stages: stages.map(([n, w, source]) => ({ id: uid(), name: n, weight: w, source })),
});

export const builtInTemplates = (): Template[] => [
  t('Blank', 'Personal', 'traditional', [['Plan', 20], ['Do', 60], ['Finish', 20]]),
  // Traditional (predictive)
  t('Waterfall (stage-gate)', 'Uncategorized', 'traditional', [['Requirements', 15], ['Design', 20], ['Build', 30], ['Test', 20], ['Deploy', 10], ['Closure', 5]]),
  t('PMBOK process groups', 'Uncategorized', 'traditional', [['Initiating', 10], ['Planning', 20], ['Executing', 45], ['Monitoring & controlling', 15], ['Closing', 10]]),
  t('Shipment', 'Shipment', 'traditional', [['Order & payment', 10], ['Production / sourcing', 25], ['Export docs & customs', 15], ['In transit', 30], ['Import clearance', 10], ['Delivered', 10]]),
  t('Coffee export', 'Tamar Trading', 'traditional', [['Contract & buyer', 10], ['Sourcing & quality check', 25], ['Milling & packing', 20], ['Export permits', 15], ['Shipping', 20], ['Payment received', 10]]),
  t('Elevator installation', 'IntelMotion', 'traditional', [['Site survey', 5], ['Order & manufacturing', 25], ['Delivery to site', 10], ['Mechanical install', 30], ['Electrical & commissioning', 20], ['Inspection & handover', 10]]),
  t('Home / family', 'Personal', 'traditional', [['Research', 20], ['Budget & decide', 20], ['Execute', 50], ['Wrap up', 10]]),
  // Agile (progress comes from the backlog, so no phases)
  t('Agile – Scrum', 'IntelTech', 'agile', [], 14),
  t('Agile – Kanban', 'Uncategorized', 'agile', [], 0),
  // Hybrid (phase-gated governance, agile delivery inside the build phase)
  t('Hybrid – product launch', 'IntelTech', 'hybrid', [['Initiate & plan', 15], ['Build (agile sprints)', 50, 'backlog'], ['Test & acceptance', 15], ['Launch', 15], ['Close', 5]], 14),
  t('Hybrid – software build', 'IntelTech', 'hybrid', [['Discovery & design', 20], ['Build (agile sprints)', 45, 'backlog'], ['Testing', 15], ['Launch', 20]], 14),
];

export const defaultConfig = (): Config => ({
  workspace: 'My Projects',
  currency: 'ETB',
  categories: ['Personal', 'Shipment', 'IntelMotion', 'IntelTech', 'Nigist LLC', 'Tamar Trading'],
  templates: builtInTemplates(),
});

/** Saved settings from before methods existed get sensible defaults. */
export const normalizeConfig = (c: Partial<Config>): Config => {
  const d = defaultConfig();
  return {
    ...d, ...c,
    currency: c.currency ?? d.currency,
    templates: (c.templates ?? d.templates).map((x) => ({ ...x, method: x.method ?? 'traditional' })),
  };
};

export const stagesFrom = (tpl: Template): Stage[] =>
  tpl.stages.map((s) => ({ id: uid(), name: s.name, weight: s.weight, progress: 0, source: s.source }));
