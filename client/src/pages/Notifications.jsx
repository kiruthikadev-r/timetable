import { useEffect, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import api from '../api/axios';
import { handleError } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { TableSkeleton } from '../components/LoadingSkeleton';
import { SecondaryButton } from '../components/FormControls';

export default function Notifications() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api
      .get('/notifications')
      .then((res) => setRows(res.data.data))
      .catch(handleError)
      .finally(() => setLoading(false));
  };

  useEffect(() => load(), []);

  const markRead = async (id) => {
    await api.put(`/notifications/${id}/read`);
    load();
  };

  const markAllRead = async () => {
    await api.put('/notifications/read-all');
    load();
  };

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Updates on timetables, approvals and assignment changes"
        action={
          <SecondaryButton onClick={markAllRead}>
            <CheckCheck size={16} /> Mark all as read
          </SecondaryButton>
        }
      />

      {loading ? (
        <TableSkeleton cols={1} />
      ) : rows.length === 0 ? (
        <EmptyState icon={Bell} title="You're all caught up" message="New notifications will appear here." />
      ) : (
        <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
          {rows.map((n) => (
            <button
              key={n._id}
              onClick={() => !n.isRead && markRead(n._id)}
              className={`flex w-full items-start gap-3 px-5 py-4 text-left hover:bg-slate-50 ${!n.isRead ? 'bg-brand-50/40' : ''}`}
            >
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.isRead ? 'bg-slate-200' : 'bg-brand-600'}`} />
              <div>
                <p className="text-sm font-medium text-slate-800">{n.title}</p>
                <p className="text-sm text-slate-500">{n.message}</p>
                <p className="mt-1 text-xs text-slate-400">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
