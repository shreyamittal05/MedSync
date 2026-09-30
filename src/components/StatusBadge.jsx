// src/components/StatusBadge.jsx
//
// Renders the small pill used to indicate either triage priority
// (Urgent / Normal) or consultation status (Waiting / In Consultation /
// Completed). Kept as one component since both are "state" badges that
// share the same visual language across the desk console and tracker.

const STATUS_STYLES = {
  urgent: 'bg-signal-50 text-signal-600 border-signal-500/30',
  normal: 'bg-clinical-50 text-clinical-600 border-clinical-500/20',
  waiting: 'bg-clinical-50 text-clinical-600 border-clinical-500/20',
  'in-consultation': 'bg-mint-50 text-mint-600 border-mint-500/30',
  completed: 'bg-ink/5 text-ink/50 border-ink/10',
};

const STATUS_LABELS = {
  urgent: 'Urgent',
  normal: 'Normal',
  waiting: 'Waiting',
  'in-consultation': 'In consultation',
  completed: 'Completed',
};

const STATUS_DOT = {
  urgent: 'bg-signal-500',
  normal: 'bg-clinical-500',
  waiting: 'bg-clinical-500',
  'in-consultation': 'bg-mint-500',
  completed: 'bg-ink/30',
};

export default function StatusBadge({ status, pulse = false, className = '' }) {
  const key = String(status || '').toLowerCase();
  const style = STATUS_STYLES[key] ?? 'bg-ink/5 text-ink/60 border-ink/10';
  const label = STATUS_LABELS[key] ?? status;
  const dot = STATUS_DOT[key] ?? 'bg-ink/30';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${style} ${className}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${dot} ${pulse ? 'animate-pulseSoft' : ''}`}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
