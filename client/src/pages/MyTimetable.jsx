import { useEffect, useState } from 'react';
import { CalendarDays, Flag } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { handleError, useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { GridSkeleton } from '../components/LoadingSkeleton';
import Modal from '../components/Modal';
import { Field, Textarea, PrimaryButton, SecondaryButton } from '../components/FormControls';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TYPE_STYLE = { Theory: 'bg-indigo-50 border-indigo-200 text-indigo-800', Practical: 'bg-orange-50 border-orange-200 text-orange-800', Lab: 'bg-orange-50 border-orange-200 text-orange-800' };

export default function MyTimetable() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportMessage, setReportMessage] = useState('');
  const [sending, setSending] = useState(false);

  const sendReport = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await api.post('/notifications/report-conflict', { message: reportMessage });
      toast.success('Reported to your HOD and the administrator');
      setReportOpen(false);
      setReportMessage('');
    } catch (err) {
      handleError(err);
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (!user?.faculty) {
      setLoading(false);
      return;
    }
    Promise.all([api.get(`/timetables/faculty/${user.faculty}`), api.get('/timeslots')])
      .then(([entriesRes, slotRes]) => {
        setEntries(entriesRes.data.data);
        setSlots(slotRes.data.data.sort((a, b) => a.order - b.order));
      })
      .catch(handleError)
      .finally(() => setLoading(false));
  }, [user]);

  const gridMap = new Map(entries.map((e) => [`${e.day}|${e.timeSlot._id}`, e]));
  const totalHours = entries.length;

  if (loading) return <GridSkeleton count={4} />;

  if (!user?.faculty) {
    return <EmptyState icon={CalendarDays} title="No faculty profile linked" message="Your account is not linked to a faculty record yet. Contact your administrator." />;
  }

  if (!entries.length) {
    return <EmptyState icon={CalendarDays} title="No published timetable yet" message="Your weekly schedule will appear here once a timetable is published." />;
  }

  return (
    <div>
      <PageHeader
        title="My Timetable"
        description={`Weekly teaching schedule • ${totalHours} periods this week`}
        action={
          <SecondaryButton onClick={() => setReportOpen(true)}>
            <Flag size={16} /> Report a Conflict
          </SecondaryButton>
        }
      />

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-card">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-28 border-b border-slate-200 px-3 py-3 text-left text-xs font-semibold uppercase text-slate-500">Period</th>
              {DAYS.map((d) => (
                <th key={d} className="border-b border-slate-200 px-3 py-3 text-center text-xs font-semibold uppercase text-slate-500">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slots.map((slot) =>
              slot.type !== 'period' ? (
                <tr key={slot._id} className="bg-slate-50">
                  <td colSpan={DAYS.length + 1} className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {slot.label} ({slot.startTime} - {slot.endTime})
                  </td>
                </tr>
              ) : (
                <tr key={slot._id} className="border-b border-slate-100">
                  <td className="px-3 py-3 align-top text-xs font-medium text-slate-500">
                    {slot.label}
                    <br />
                    {slot.startTime}-{slot.endTime}
                  </td>
                  {DAYS.map((day) => {
                    const entry = gridMap.get(`${day}|${slot._id}`);
                    return (
                      <td key={day} className="p-1.5 align-top">
                        {entry ? (
                          <div className={`w-full rounded-lg border p-2 text-left text-xs leading-tight ${TYPE_STYLE[entry.subject.type] || 'bg-slate-50 border-slate-200'}`}>
                            <p className="font-semibold">{entry.subject.code}</p>
                            <p className="truncate">{entry.class?.programme} {entry.class?.section}</p>
                            <p className="truncate text-[11px] opacity-70">{entry.classroom.roomNumber}</p>
                          </div>
                        ) : (
                          <div className="flex h-16 items-center justify-center rounded-lg border border-dashed border-slate-200 text-xs text-slate-300">Free</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      <Modal open={reportOpen} onClose={() => setReportOpen(false)} title="Report a Scheduling Conflict">
        <form onSubmit={sendReport}>
          <Field label="What's wrong?" required hint="This goes to your HOD and the administrator">
            <Textarea rows={4} required value={reportMessage} onChange={(e) => setReportMessage(e.target.value)} placeholder="e.g. I'm double-booked on Monday Period 3 with another class..." />
          </Field>
          <div className="flex justify-end gap-2">
            <SecondaryButton type="button" onClick={() => setReportOpen(false)}>
              Cancel
            </SecondaryButton>
            <PrimaryButton type="submit" disabled={sending}>
              {sending ? 'Sending...' : 'Send Report'}
            </PrimaryButton>
          </div>
        </form>
      </Modal>
    </div>
  );
}
