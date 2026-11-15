import { useEffect, useState, useCallback } from 'react';
import { CalendarCog } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { handleError, useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { Field, Select, PrimaryButton } from '../components/FormControls';
import { GridSkeleton } from '../components/LoadingSkeleton';

const STATUS_STYLE = {
  available: 'bg-white text-slate-500 border-slate-200',
  preferred: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  unavailable: 'bg-red-50 text-red-700 border-red-200',
};
const NEXT_STATUS = { available: 'preferred', preferred: 'unavailable', unavailable: 'available' };

export default function Availability() {
  const { user } = useAuth();
  const [facultyList, setFacultyList] = useState([]);
  const [facultyId, setFacultyId] = useState('');
  const [slots, setSlots] = useState([]);
  const [grid, setGrid] = useState({}); // `${day}|${slotId}` -> status
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const params = { limit: 200 };
    if (user?.role !== 'superadmin') params.department = user?.department;
    api.get('/faculty', { params }).then((res) => setFacultyList(res.data.data)).catch(() => {});
    api.get('/timeslots').then((res) => setSlots(res.data.data.filter((s) => s.type === 'period'))).catch(() => {});
  }, [user]);

  const load = useCallback(() => {
    if (!facultyId) return;
    setLoading(true);
    api
      .get(`/availability/${facultyId}`)
      .then((res) => {
        const g = {};
        res.data.data.forEach((a) => {
          g[`${a.day}|${a.timeSlot._id}`] = a.status;
        });
        setGrid(g);
      })
      .catch(handleError)
      .finally(() => setLoading(false));
  }, [facultyId]);

  useEffect(() => load(), [load]);

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const cycle = (day, slotId) => {
    const key = `${day}|${slotId}`;
    const current = grid[key] || 'available';
    setGrid((g) => ({ ...g, [key]: NEXT_STATUS[current] }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const entries = Object.entries(grid)
        .filter(([, status]) => status !== 'available')
        .map(([key, status]) => {
          const [day, timeSlot] = key.split('|');
          return { day, timeSlot, status };
        });
      await api.put('/availability', { facultyId, entries });
      toast.success('Availability saved');
    } catch (err) {
      handleError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="Faculty Availability" description="Mark unavailable or preferred periods per faculty member. The generator respects these." />

      <div className="mb-5 max-w-xs">
        <Field label="Select Faculty">
          <Select value={facultyId} onChange={(e) => setFacultyId(e.target.value)}>
            <option value="">Choose a faculty member</option>
            {facultyList.map((f) => (
              <option key={f._id} value={f._id}>
                {f.name} ({f.facultyId})
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {!facultyId ? (
        <EmptyState icon={CalendarCog} title="Select a faculty member" message="Choose a faculty member above to view and edit their availability grid." />
      ) : loading ? (
        <GridSkeleton count={6} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-4 shadow-card">
          <div className="mb-3 flex gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded border border-slate-200 bg-white" /> Available
            </span>
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded border border-emerald-200 bg-emerald-50" /> Preferred
            </span>
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded border border-red-200 bg-red-50" /> Unavailable
            </span>
            <span className="text-slate-400">— click a cell to cycle status</span>
          </div>
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-slate-500">Day</th>
                {slots.map((s) => (
                  <th key={s._id} className="px-3 py-2 text-xs font-medium text-slate-500">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS.map((day) => (
                <tr key={day}>
                  <td className="px-3 py-2 font-medium text-slate-700">{day}</td>
                  {slots.map((s) => {
                    const status = grid[`${day}|${s._id}`] || 'available';
                    return (
                      <td key={s._id} className="p-1.5">
                        <button
                          type="button"
                          onClick={() => cycle(day, s._id)}
                          className={`h-10 w-full rounded-lg border text-xs font-medium capitalize ${STATUS_STYLE[status]}`}
                        >
                          {status === 'available' ? '' : status}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4">
            <PrimaryButton onClick={save} disabled={saving}>
              {saving ? 'Saving...' : 'Save Availability'}
            </PrimaryButton>
          </div>
        </div>
      )}
    </div>
  );
}
