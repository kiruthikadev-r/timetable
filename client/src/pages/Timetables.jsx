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
  const [semester, setSemester] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (status) params.status = status;
    if (semester) params.semester = semester;
    if (academicYear) params.academicYear = academicYear;
    if (user?.role !== 'superadmin') params.department = user?.department;
    api
      .get('/timetables', { params })
      .then((res) => setRows(res.data.data))
      .catch(handleError)
      .finally(() => setLoading(false));
  }, [status, semester, academicYear, user]);

  useEffect(() => load(), [load]);

  useEffect(() => {
    api.get('/academic-years').then((res) => setYears(res.data.data)).catch(() => {});
  }, []);

  return (
    <div>
      <PageHeader title="Timetables" description="All generated timetables and their current status" />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="w-48">
          <Field label="Academic Year">
            <Select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}>
              <option value="">All</option>
              {years.map((y) => (
                <option key={y._id} value={y._id}>
                  {y.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="w-40">
          <Field label="Semester">
            <Select value={semester} onChange={(e) => setSemester(e.target.value)}>
              <option value="">All</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((s) => (
                <option key={s} value={s}>
                  Semester {s}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="w-56">
          <Field label="Status">
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
      </div>

      {loading ? (
        <TableSkeleton cols={5} />
      ) : rows.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No timetables yet" message="Generate a timetable from the Generate Timetable page." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
          <div className="overflow-x-auto">
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
        </div>
      )}
    </div>
  );
}
