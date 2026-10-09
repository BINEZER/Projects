import type { ReactNode } from 'react';
import type { Health, Kind, Member, Method } from '../types';
import { hueOf } from '../lib/progress';
import { HEALTH_LABEL, KIND_LABEL, METHOD_LABEL } from '../lib/pm';

export const Icon = ({ d, size = 18 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
export const I = {
  plus: 'M12 5v14M5 12h14',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  back: 'M15 18l-6-6 6-6',
  fwd: 'M9 6l6 6-6 6',
  up: 'M6 15l6-6 6 6',
  down: 'M6 9l6 6 6-6',
  x: 'M6 6l12 12M18 6L6 18',
  moon: 'M21 13.5A9 9 0 1110.5 3 7 7 0 0021 13.5z',
  edit: 'M4 20h4L19 9l-4-4L4 16v4z',
  download: 'M12 4v11m0 0l-4-4m4 4l4-4M5 20h14',
  print: 'M7 9V4h10v5M7 17H5v-6h14v6h-2M7 14h10v6H7z',
  bell: 'M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0',
  clock: 'M12 7v5l3 2M12 3a9 9 0 100 18 9 9 0 000-18z',
};

export const Pill = ({ text }: { text: string }) => (
  <span className="pill" style={{ ['--h' as string]: hueOf(text) }}>
    {text}
  </span>
);

/** Circular progress. */
export function Ring({ value, size = 64, stroke = 7, label = true }: { value: number; size?: number; stroke?: number; label?: boolean }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--accent)" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} style={{ transition: 'stroke-dashoffset .5s' }} />
      </svg>
      {label && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: size * 0.27 }}>{Math.round(value)}%</div>
      )}
    </div>
  );
}

export function Modal({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card modal">{children}</div>
    </div>
  );
}

export const Kpi = ({ v, l, tone }: { v: ReactNode; l: string; tone?: string }) => (
  <div className="card kpi">
    <div className="v" style={tone ? { color: tone } : undefined}>{v}</div>
    <div className="l">{l}</div>
  </div>
);

export const HealthDot = ({ h, label = false }: { h: Health; label?: boolean }) => (
  <span className="hlth" title={HEALTH_LABEL[h]}>
    <i className={`dot-h ${h}`} />
    {label && <span className="small muted">{HEALTH_LABEL[h]}</span>}
  </span>
);

export const KindTag = ({ kind }: { kind: Kind }) => <span className={`tag kind-${kind}`}>{KIND_LABEL[kind]}</span>;
export const MethodTag = ({ method }: { method: Method }) => <span className={`tag method-${method}`}>{METHOD_LABEL[method]}</span>;

export const num = (n: number) => Math.round(n).toLocaleString();
export const idx = (n: number | null) => (n === null ? '—' : n.toFixed(2));


/** Small initials avatar for a team member. */
export function Who({ members, id, name = false }: { members: Member[]; id?: string; name?: boolean }) {
  const m = members.find((x) => x.id === id);
  if (!m) return null;
  const ini = (m.name.split(/\s+/).filter((w) => /^\p{L}/u.test(w)).map((w) => w[0]).join('') || m.name[0] || '?').slice(0, 2).toUpperCase();
  return (
    <span className="who" title={m.name}>
      <i style={{ ['--h' as string]: hueOf(m.name) }}>{ini}</i>
      {name && <span className="small">{m.name}</span>}
    </span>
  );
}

export function MemberSelect({ members, value, onChange, empty = 'Unassigned', label }: { members: Member[]; value?: string; onChange: (id?: string) => void; empty?: string; label?: string }) {
  return (
    <select value={value ?? ''} onChange={(e) => onChange(e.target.value || undefined)} aria-label={label ?? 'Person'}>
      <option value="">{empty}</option>
      {members.map((m) => <option key={m.id} value={m.id}>{m.name}{m.role ? ` · ${m.role}` : ''}</option>)}
      {value && !members.some((m) => m.id === value) && <option value={value}>(removed member)</option>}
    </select>
  );
}
