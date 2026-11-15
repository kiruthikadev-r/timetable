import { NavLink } from 'react-router-dom';
import { CalendarClock, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { NAV } from './navConfig';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ collapsed, onToggle }) {
  const { user } = useAuth();
  const items = NAV.filter((n) => n.roles.includes(user?.role));

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-200 bg-navy-950 text-slate-200 transition-all duration-200 ${
        collapsed ? 'w-[72px]' : 'w-64'
      }`}
    >
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-white/10 px-4">
        <CalendarClock className="shrink-0 text-brand-400" size={26} />
        {!collapsed && <span className="truncate text-sm font-semibold text-white">Smart Timetable</span>}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`
            }
            title={collapsed ? label : undefined}
          >
            <Icon size={18} className="shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      <button
        onClick={onToggle}
        className="flex h-12 shrink-0 items-center justify-center border-t border-white/10 text-slate-300 hover:bg-white/5 hover:text-white"
      >
        {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
      </button>
    </aside>
  );
}
