import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, RefreshCw, CheckCircle2, AlertTriangle, MinusCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { handleError, useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import { Field, Select, PrimaryButton } from '../components/FormControls';
import EmptyState from '../components/EmptyState';

const ICONS = { success: CheckCircle2, partial: AlertTriangle, skipped: MinusCircle };
const ICON_COLOR = { success: 'text-emerald-600', partial: 'text-amber-600', skipped: 'text-slate-400' };

export default function Generate() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'superadmin';
  const [years, setYears] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [scope, setScope] = useState('class');
  const [academicYear, setAcademicYear] = useState('');
  const [department, setDepartment] = useState(user?.department || '');
  const [classId, setClassId] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);

  useEffect(() => {
    api.get('/academic-years').then((res) => {
      setYears(res.data.data);
      if (res.data.data[0]) setAcademicYear(res.data.data[0]._id);
    });
    if (isSuperAdmin) api.get('/departments', { params: { limit: 100 } }).then((res) => setDepartments(res.data.data));
  }, [isSuperAdmin]);

  useEffect(() => {
    const params = { limit: 200 };
    if (department) params.department = department;
    if (academicYear) params.academicYear = academicYear;
    api.get('/classes', { params }).then((res) => setClasses(res.data.data));
  }, [department, academicYear]);

  const generate = async () => {
    if (!academicYear) return toast.error('Select an academic year');
    setLoading(true);
    setReport(null);
    try {
      const body = { academicYear };
      if (scope === 'class') body.classId = classId;
      if (scope === 'department') body.departmentId = department;
      if (scope === 'all') body.all = true;
      const res = await api.post('/timetables/generate', body);
      setReport(res.data.data);
      toast.success('Generation complete');
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="Generate Timetable" description="Run the constraint-based scheduling engine for one class, a department, or the whole college" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card lg:col-span-1">
          <Field label="Academic Year" required>
            <Select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}>
              {years.map((y) => (
                <option key={y._id} value={y._id}>
                  {y.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Scope" required>
            <Select value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value="class">Single Class</option>
              {isSuperAdmin ? <option value="department">Entire Department</option> : null}
              {isSuperAdmin ? <option value="all">All Departments</option> : null}
              {!isSuperAdmin ? <option value="department">My Department</option> : null}
            </Select>
          </Field>

          {isSuperAdmin && (scope === 'class' || scope === 'department') && (
            <Field label="Department" required>
              <Select value={department} onChange={(e) => setDepartment(e.target.value)}>
                <option value="">Select department</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          {scope === 'class' && (
            <Field label="Class" required>
              <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
                <option value="">Select class</option>
                {classes.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.displayName}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          <PrimaryButton onClick={generate} disabled={loading} className="mt-2 w-full justify-center">
            <CalendarCheck size={16} /> {loading ? 'Generating...' : 'Generate Timetable'}
          </PrimaryButton>
        </div>

        <div className="lg:col-span-2">
          {!report ? (
            <EmptyState icon={RefreshCw} title="No generation run yet" message="Configure a scope on the left and run the generator to see results here." />
          ) : (
            <div className="space-y-3">
              {report.map((r) => {
                const Icon = ICONS[r.status] || CheckCircle2;
                return (
                  <div key={r.classId} className="flex items-start justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-card">
                    <div className="flex items-start gap-3">
                      <Icon size={20} className={`mt-0.5 shrink-0 ${ICON_COLOR[r.status] || 'text-emerald-600'}`} />
                      <div>
                        <p className="font-medium text-slate-800">{r.displayName}</p>
                        {r.reason && <p className="text-sm text-slate-500">{r.reason}</p>}
                        {r.entriesCreated !== undefined && <p className="text-sm text-slate-500">{r.entriesCreated} periods scheduled</p>}
                        {r.unresolved?.length > 0 && (
                          <ul className="mt-1 list-inside list-disc text-sm text-amber-700">
                            {r.unresolved.map((u, i) => (
                              <li key={i}>{u}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                    {r.timetableId && (
                      <Link to={`/timetables/${r.timetableId}`} className="text-sm font-medium text-brand-600 hover:text-brand-700">
                        View
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
