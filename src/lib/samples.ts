import type { Config, Project } from '../types';
import { stagesFrom } from './templates';
import { uid } from './progress';

const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

export function samples(config: Config): Project[] {
  const tpl = (name: string) => config.templates.find((t) => t.name === name) ?? config.templates[0];
  const mk = (title: string, tplName: string, prog: number[], due: number, extra: Partial<Project> = {}): Project => {
    const t = tpl(tplName);
    const stages = stagesFrom(t).map((s, i) => ({ ...s, progress: prog[i] ?? 0 }));
    const now = Date.now();
    return { id: uid(), title, category: t.category, status: 'active', due: day(due), notes: '', fields: [], stages, log: [{ id: uid(), at: now, text: 'Project created' }], createdAt: now - 20 * 86_400_000, updatedAt: now, ...extra };
  };
  return [
    mk('Green coffee – 2 containers to Hamburg', 'Coffee export', [100, 100, 60], 12, { ref: 'TT-2026-014', fields: [{ id: uid(), label: 'Buyer', value: 'Nordbean GmbH' }, { id: uid(), label: 'Volume', value: '38 tons' }] }),
    mk('Lift install – Bole Tower B', 'Elevator installation', [100, 100, 100, 40], -3, { ref: 'IM-0457' }),
    mk('Spare parts import – Shenzhen', 'Shipment', [100, 100, 100, 50], 6, { ref: 'BL-88231' }),
    mk('IntelTech website v1', 'Software build', [100, 100, 35], 30),
    mk('Kids’ room renovation', 'Home / family', [100, 50], 45),
    mk('Q2 supplier audit', 'Blank', [100, 100, 100], -10, { status: 'done', completedAt: Date.now() - 8 * 86_400_000, category: 'Nigist LLC' }),
  ];
}
