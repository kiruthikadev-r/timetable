const STYLES = {
  draft: 'bg-slate-100 text-slate-600',
  pending_approval: 'bg-amber-100 text-amber-700',
  approved: 'bg-blue-100 text-blue-700',
  published: 'bg-emerald-100 text-emerald-700',
  archived: 'bg-slate-200 text-slate-500',
  Theory: 'bg-indigo-100 text-indigo-700',
  Practical: 'bg-orange-100 text-orange-700',
  Lab: 'bg-orange-100 text-orange-700',
  success: 'bg-emerald-100 text-emerald-700',
  partial: 'bg-amber-100 text-amber-700',
  skipped: 'bg-slate-100 text-slate-500',
};

export default function Badge({ value, label }) {
  const style = STYLES[value] || 'bg-slate-100 text-slate-600';
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${style}`}>{label || value}</span>;
}
