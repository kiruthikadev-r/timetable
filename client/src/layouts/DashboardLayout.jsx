import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen w-full bg-slate-50">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className={`flex min-h-screen flex-col transition-all duration-200 ${collapsed ? 'pl-[72px]' : 'pl-64'}`}>
        <Topbar />
        <main className="w-full flex-1 px-6 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
