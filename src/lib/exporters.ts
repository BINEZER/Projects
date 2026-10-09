import type { Member, Project } from '../types';
import type { Metrics } from './pm';
import { KIND_LABEL, METHOD_LABEL, HEALTH_LABEL, expenseTotal, laborCost, stageProgress } from './pm';
import { memberName } from './reminders';
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

export const projectsCSV = (ps: Project[], m: Map<string, Metrics>, all: Project[], team: Member[] = []) =>
  toCSV([
    ['Title', 'Level', 'Method', 'Parent', 'Owner', 'Category', 'Status', 'Health', 'Reference', 'Start', 'Due', 'Progress %', 'SPI', 'CPI', 'Budget', 'Actual cost', 'Hours logged', 'Open risks', 'Current stage', 'Created', 'Completed', 'Details', 'Notes'],
    ...ps.map((p) => {
      const x = m.get(p.id)!;
      return [
        p.title, KIND_LABEL[p.kind], p.kind === 'project' ? METHOD_LABEL[p.method] : '', all.find((a) => a.id === p.parentId)?.title ?? '', memberName(team, p.ownerId),
        p.category, p.status, HEALTH_LABEL[x.health], p.ref ?? '', p.start ?? '', p.due ?? '', Math.round(x.progress), r1(x.spi), r1(x.cpi),
        x.bac || '', x.ac || '', x.hours || '', x.openRisks, p.method === 'agile' ? 'Backlog' : currentStage(p.stages)?.name ?? '', date(p.createdAt), date(p.completedAt),
        p.fields.map((f) => `${f.label}: ${f.value}`).join('; '), p.notes,
      ];
    }),
  ]);

export const stagesCSV = (ps: Project[]) =>
  toCSV([
    ['Project', 'Category', 'Stage', 'Weight', 'Share %', 'Stage progress %'],
    ...ps.flatMap((p) => p.stages.map((s) => [p.title, p.category, s.name, s.weight, Math.round(share(s, p.stages) * 10) / 10, Math.round(stageProgress(s, p))])),
  ]);

export const backlogCSV = (ps: Project[], team: Member[] = []) =>
  toCSV([
    ['Project', 'Item', 'Assignee', 'Due', 'Points', 'Estimate hours', 'Status', 'Sprint', 'Phase'],
    ...ps.flatMap((p) => p.backlog.map((i) => [p.title, i.title, memberName(team, i.assigneeId), i.due ?? '', i.points, i.estimateHours ?? '', i.status, p.sprints.find((s) => s.id === i.sprintId)?.name ?? 'Backlog', p.stages.find((s) => s.id === i.stageId)?.name ?? ''])),
  ]);

export const risksCSV = (ps: Project[]) =>
  toCSV([
    ['Project', 'Type', 'Title', 'Probability', 'Impact', 'Score', 'Status', 'Owner', 'Response'],
    ...ps.flatMap((p) => p.risks.map((r) => [p.title, r.type, r.title, r.probability, r.impact, r.probability * r.impact, r.status, r.owner, r.response])),
  ]);

export const expensesCSV = (ps: Project[]) =>
  toCSV([
    ['Project', 'Date', 'Description', 'Category', 'Amount', 'Phase'],
    ...ps.flatMap((p) => p.expenses.map((e) => [p.title, e.date, e.description, e.category, e.amount, p.stages.find((s) => s.id === e.stageId)?.name ?? ''])),
  ]);

export const timeCSV = (ps: Project[], team: Member[] = []) =>
  toCSV([
    ['Project', 'Date', 'Person', 'Hours', 'Task', 'Note'],
    ...ps.flatMap((p) => p.time.map((t) => [p.title, t.date, memberName(team, t.memberId), t.hours, p.backlog.find((i) => i.id === t.itemId)?.title ?? '', t.note])),
  ]);

export const costSummary = (p: Project, team: Member[]) => ({ expenses: expenseTotal(p), labor: laborCost(p, team) });

export const stamp = () => new Date().toISOString().slice(0, 10);
