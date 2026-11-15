import { Search, Plus } from 'lucide-react';
import { PrimaryButton } from './FormControls';

export default function Toolbar({ search, onSearch, onAdd, addLabel = 'Add New', filters, placeholder = 'Search...' }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-1 flex-wrap items-center gap-3">
        <div className="relative max-w-xs flex-1 min-w-[220px]">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>
        {filters}
      </div>
      {onAdd && (
        <PrimaryButton onClick={onAdd}>
          <Plus size={16} /> {addLabel}
        </PrimaryButton>
      )}
    </div>
  );
}
