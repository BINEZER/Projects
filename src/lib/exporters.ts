import type { Project } from '../types';
import type { Metrics } from './pm';
import { KIND_LABEL, METHOD_LABEL, HEALTH_LABEL, stageProgress } from './pm';
import { currentStage, share } from './progress';

export function download(filename: string, text: string, mime = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type: mime + ';charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const cell = (v: unknown) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const toCSV = (rows: unknown[][]) => '﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n');

const date = (n?: number) => (n ? new Date(n).toISOString().slice(0, 10) : '');
const r1 = (n: number | null) => (n === null ? '' : Math.round(n * 100) / 100);

export const projectsCSV = (ps: Project[], m: Map<string, Metrics>, all: Project[]) =>
  toCSV([
    ['Title', 'Level', 'Method', 'Parent', 'Category', 'Status', 'Health', 'Reference', 'Start', 'Due', 'Progress %', 'SPI', 'CPI', 'Budget', 'Actual cost', 'Open risks', 'Current stage', 'Created', 'Completed', 'Details', 'Notes'],
    ...ps.map((p) => {
      const x = m.get(p.id)!;
      return [
        p.title, KIND_LABEL[p.kind], p.kind === 'project' ? METHOD_LABEL[p.method] : '', all.find((a) => a.id === p.parentId)?.title ?? '',
        p.category, p.status, HEALTH_LABEL[x.health], p.ref ?? '', p.start ?? '', p.due ?? '', Math.round(x.progress), r1(x.spi), r1(x.cpi),
        x.bac || '', x.ac || '', x.openRisks, p.method === 'agile' ? 'Backlog' : currentStage(p.stages)?.name ?? '', date(p.createdAt), date(p.completedAt),
        p.fields.map((f) => `${f.label}: ${f.value}`).join('; '), p.notes,
      ];
    }),
  ]);

export const stagesCSV = (ps: Project[]) =>
  toCSV([
    ['Project', 'Category', 'Stage', 'Weight', 'Share %', 'Stage progress %'],
    ...ps.flatMap((p) => p.stages.map((s) => [p.title, p.category, s.name, s.weight, Math.round(share(s, p.stages) * 10) / 10, Math.round(stageProgress(s, p))])),
  ]);

export const backlogCSV = (ps: Project[]) =>
  toCSV([
    ['Project', 'Item', 'Points', 'Status', 'Sprint'],
    ...ps.flatMap((p) => p.backlog.map((i) => [p.title, i.title, i.points, i.status, p.sprints.find((s) => s.id === i.sprintId)?.name ?? 'Backlog'])),
  ]);

export const risksCSV = (ps: Project[]) =>
  toCSV([
    ['Project', 'Type', 'Title', 'Probability', 'Impact', 'Score', 'Status', 'Owner', 'Response'],
    ...ps.flatMap((p) => p.risks.map((r) => [p.title, r.type, r.title, r.probability, r.impact, r.probability * r.impact, r.status, r.owner, r.response])),
  ]);

export const stamp = () => new Date().toISOString().slice(0, 10);
