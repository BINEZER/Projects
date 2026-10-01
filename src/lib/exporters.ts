import type { Project } from '../types';
import { currentStage, progressOf, share } from './progress';

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

export const projectsCSV = (ps: Project[]) =>
  toCSV([
    ['Title', 'Category', 'Status', 'Reference', 'Due', 'Progress %', 'Current stage', 'Created', 'Completed', 'Details', 'Notes'],
    ...ps.map((p) => [
      p.title, p.category, p.status, p.ref ?? '', p.due ?? '', Math.round(progressOf(p.stages)),
      currentStage(p.stages)?.name ?? (p.stages.length ? 'All done' : ''), date(p.createdAt), date(p.completedAt),
      p.fields.map((f) => `${f.label}: ${f.value}`).join('; '), p.notes,
    ]),
  ]);

export const stagesCSV = (ps: Project[]) =>
  toCSV([
    ['Project', 'Category', 'Stage', 'Weight', 'Share %', 'Stage progress %'],
    ...ps.flatMap((p) => p.stages.map((s) => [p.title, p.category, s.name, s.weight, Math.round(share(s, p.stages) * 10) / 10, s.progress])),
  ]);

export const stamp = () => new Date().toISOString().slice(0, 10);
