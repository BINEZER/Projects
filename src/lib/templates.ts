import type { Config, Stage, Template } from '../types';
import { uid } from './progress';

const t = (name: string, category: string, stages: [string, number][]): Template => ({
  id: uid(),
  name,
  category,
  stages: stages.map(([n, w]) => ({ id: uid(), name: n, weight: w })),
});

export const defaultConfig = (): Config => ({
  workspace: 'My Projects',
  categories: ['Personal', 'Shipment', 'IntelMotion', 'IntelTech', 'Nigist LLC', 'Tamar Trading'],
  templates: [
    t('Blank', 'Personal', [['Plan', 20], ['Do', 60], ['Finish', 20]]),
    t('Shipment', 'Shipment', [['Order & payment', 10], ['Production / sourcing', 25], ['Export docs & customs', 15], ['In transit', 30], ['Import clearance', 10], ['Delivered', 10]]),
    t('Coffee export', 'Tamar Trading', [['Contract & buyer', 10], ['Sourcing & quality check', 25], ['Milling & packing', 20], ['Export permits', 15], ['Shipping', 20], ['Payment received', 10]]),
    t('Elevator installation', 'IntelMotion', [['Site survey', 5], ['Order & manufacturing', 25], ['Delivery to site', 10], ['Mechanical install', 30], ['Electrical & commissioning', 20], ['Inspection & handover', 10]]),
    t('Software build', 'IntelTech', [['Discovery', 10], ['Design', 15], ['Build', 45], ['Testing', 15], ['Launch', 15]]),
    t('Home / family', 'Personal', [['Research', 20], ['Budget & decide', 20], ['Execute', 50], ['Wrap up', 10]]),
  ],
});

export const stagesFrom = (tpl: Template): Stage[] =>
  tpl.stages.map((s) => ({ id: uid(), name: s.name, weight: s.weight, progress: 0 }));
