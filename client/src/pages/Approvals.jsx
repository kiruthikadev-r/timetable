import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck } from 'lucide-react';
import api from '../api/axios';
import { handleError, useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import { TableSkeleton } from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';

export default function Approvals() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const params = { status: 'pending_approval' };
    if (user?.role !== 'superadmin') params.department = user?.department;
    api
      .get('/timetables', { params })
      .then((res) => setRows(res.data.data))
      .catch(handleError)
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => load(), [load]);

  return (
    <div>
      <PageHeader title="Approvals" description="Timetables awaiting your review before they can be published" />

      {loading ? (
        <TableSkeleton cols={4} />
      ) : rows.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="Nothing to review" message="All submitted timetables have been reviewed." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Class</th>
                <th className="px-5 py-3">Department</th>
                <th className="px-5 py-3">Submitted</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((t) => (
                <tr key={t._id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-700">
                    {t.class?.programme} Sem {t.class?.semester} {t.class?.section}
                  </td>
                  <td className="px-5 py-3">{t.department?.code}</td>
                  <td className="px-5 py-3">{new Date(t.updatedAt).toLocaleString()}</td>
                  <td className="px-5 py-3 text-right">
                    <Link to={`/timetables/${t._id}`} className="text-sm font-medium text-brand-600 hover:text-brand-700">
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
