import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import api from '../api/axios';
import { handleError, useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import Badge from '../components/Badge';
import { TableSkeleton } from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import { Select, Field } from '../components/FormControls';

const STATUS_LABEL = { draft: 'Draft', pending_approval: 'Pending Approval', approved: 'Approved', published: 'Published', archived: 'Archived' };

export default function Timetables() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (status) params.status = status;
    if (user?.role !== 'superadmin') params.department = user?.department;
    api
      .get('/timetables', { params })
      .then((res) => setRows(res.data.data))
      .catch(handleError)
      .finally(() => setLoading(false));
  }, [status, user]);

  useEffect(() => load(), [load]);

  return (
    <div>
      <PageHeader title="Timetables" description="All generated timetables and their current status" />

      <div className="mb-4 max-w-xs">
        <Field label="Filter by status">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {loading ? (
        <TableSkeleton cols={5} />
      ) : rows.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No timetables yet" message="Generate a timetable from the Generate Timetable page." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Class</th>
                <th className="px-5 py-3">Department</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Version</th>
                <th className="px-5 py-3">Unresolved</th>
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
                  <td className="px-5 py-3">
                    <Badge value={t.status} label={STATUS_LABEL[t.status]} />
                  </td>
                  <td className="px-5 py-3">v{t.version}</td>
                  <td className="px-5 py-3">{t.unresolved?.length ? <span className="text-amber-600">{t.unresolved.length}</span> : '—'}</td>
                  <td className="px-5 py-3 text-right">
                    <Link to={`/timetables/${t._id}`} className="text-sm font-medium text-brand-600 hover:text-brand-700">
                      View / Edit
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
