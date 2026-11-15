import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, Send, CheckCircle2, XCircle, Globe, Archive, RefreshCw, Trash2, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { apiError } from '../api/axios';
import { handleError, useAuth } from '../context/AuthContext';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { Field, Select, PrimaryButton, SecondaryButton, Textarea } from '../components/FormControls';
import { GridSkeleton } from '../components/LoadingSkeleton';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TYPE_STYLE = { Theory: 'bg-indigo-50 border-indigo-200 text-indigo-800', Practical: 'bg-orange-50 border-orange-200 text-orange-800', Lab: 'bg-orange-50 border-orange-200 text-orange-800' };
const STATUS_LABEL = { draft: 'Draft', pending_approval: 'Pending Approval', approved: 'Approved', published: 'Published', archived: 'Archived' };

export default function TimetableDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = user?.role === 'superadmin' || user?.role === 'hod';

  const [timetable, setTimetable] = useState(null);
  const [entries, setEntries] = useState([]);
  const [slots, setSlots] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editEntry, setEditEntry] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([api.get(`/timetables/${id}`), api.get('/timeslots')])
      .then(([ttRes, slotRes]) => {
        setTimetable(ttRes.data.data.timetable);
        setEntries(ttRes.data.data.entries);
        setSlots(slotRes.data.data.sort((a, b) => a.order - b.order));
        const deptId = ttRes.data.data.timetable.department._id;
        api.get('/faculty', { params: { department: deptId, limit: 200 } }).then((r) => setFaculty(r.data.data));
        api.get('/classrooms', { params: { limit: 200 } }).then((r) => setClassrooms(r.data.data));
      })
      .catch(handleError)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => load(), [load]);

  const gridMap = new Map(entries.map((e) => [`${e.day}|${e.timeSlot._id}`, e]));

  const openEdit = (entry) => {
    setEditEntry(entry);
    setEditForm({ day: entry.day, timeSlot: entry.timeSlot._id, faculty: entry.faculty._id, classroom: entry.classroom._id });
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/timetables/entries/${editEntry._id}`, { ...editForm, subject: editEntry.subject._id });
      toast.success('Entry updated');
      setEditEntry(null);
      load();
    } catch (err) {
      handleError(err);
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async () => {
    setSaving(true);
    try {
      await api.delete(`/timetables/entries/${editEntry._id}`);
      toast.success('Entry removed');
      setEditEntry(null);
      load();
    } catch (err) {
      handleError(err);
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (action, payload) => {
    setSaving(true);
    try {
      await api.post(`/timetables/${id}/${action}`, payload || {});
      toast.success('Done');
      setConfirmAction(null);
      setRejectOpen(false);
      load();
    } catch (err) {
      handleError(err);
    } finally {
      setSaving(false);
    }
  };

  const regenerate = async () => {
    setSaving(true);
    try {
      const res = await api.post(`/timetables/${id}/regenerate`);
      toast.success(`Regenerated: ${res.data.data.entriesCreated} periods scheduled`);
      setConfirmAction(null);
      load();
    } catch (err) {
      handleError(err);
    } finally {
      setSaving(false);
    }
  };

  const exportPdf = async () => {
    try {
      const res = await api.get(`/timetables/${id}/export-pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `timetable-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(apiError(err));
    }
  };

  if (loading) return <GridSkeleton count={4} />;
  if (!timetable) return null;

  return (
    <div>
      <button onClick={() => navigate('/timetables')} className="mb-3 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={14} /> Back to timetables
      </button>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {timetable.class.programme} - Sem {timetable.class.semester} - {timetable.class.section}
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <Badge value={timetable.status} label={STATUS_LABEL[timetable.status]} />
            <span className="text-sm text-slate-400">v{timetable.version}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <SecondaryButton onClick={exportPdf}>
            <Download size={16} /> Export PDF
          </SecondaryButton>

          {canManage && ['draft'].includes(timetable.status) && (
            <SecondaryButton onClick={() => setConfirmAction('regenerate')}>
              <RefreshCw size={16} /> Regenerate
            </SecondaryButton>
          )}
          {canManage && timetable.status === 'draft' && (
            <PrimaryButton onClick={() => setConfirmAction('submit')}>
              <Send size={16} /> Submit for Approval
            </PrimaryButton>
          )}
          {canManage && timetable.status === 'pending_approval' && (
            <>
              <SecondaryButton onClick={() => setRejectOpen(true)}>
                <XCircle size={16} /> Request Changes
              </SecondaryButton>
              <PrimaryButton onClick={() => setConfirmAction('approve')}>
                <CheckCircle2 size={16} /> Approve
              </PrimaryButton>
            </>
          )}
          {user?.role === 'superadmin' && timetable.status === 'approved' && (
            <PrimaryButton onClick={() => setConfirmAction('publish')}>
              <Globe size={16} /> Publish
            </PrimaryButton>
          )}
          {user?.role === 'superadmin' && timetable.status === 'published' && (
            <SecondaryButton onClick={() => setConfirmAction('unpublish')}>Unpublish</SecondaryButton>
          )}
          {user?.role === 'superadmin' && timetable.status !== 'archived' && (
            <SecondaryButton onClick={() => setConfirmAction('archive')}>
              <Archive size={16} /> Archive
            </SecondaryButton>
          )}
        </div>
      </div>

      {timetable.unresolved?.length > 0 && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="mb-1 font-medium">Unresolved scheduling constraints ({timetable.unresolved.length})</p>
          <ul className="list-inside list-disc">
            {timetable.unresolved.map((u, i) => (
              <li key={i}>{u}</li>
            ))}
          </ul>
        </div>
      )}

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
                          <button
                            onClick={() => canManage && openEdit(entry)}
                            className={`w-full rounded-lg border p-2 text-left text-xs leading-tight ${TYPE_STYLE[entry.subject.type] || 'bg-slate-50 border-slate-200'} ${canManage ? 'hover:brightness-95' : ''}`}
                          >
                            <p className="font-semibold">{entry.subject.code}</p>
                            <p className="truncate">{entry.faculty.name}</p>
                            <p className="truncate text-[11px] opacity-70">{entry.classroom.roomNumber}</p>
                          </button>
                        ) : (
                          <div className="flex h-16 items-center justify-center rounded-lg border border-dashed border-slate-200 text-xs text-slate-300">—</div>
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

      <Modal open={!!editEntry} onClose={() => setEditEntry(null)} title="Edit Session">
        {editForm && (
          <form onSubmit={saveEdit}>
            <p className="mb-3 text-sm text-slate-500">
              {editEntry?.subject.name} ({editEntry?.subject.code})
            </p>
            <div className="grid grid-cols-2 gap-x-4">
              <Field label="Day" required>
                <Select value={editForm.day} onChange={(e) => setEditForm({ ...editForm, day: e.target.value })}>
                  {DAYS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Period" required>
                <Select value={editForm.timeSlot} onChange={(e) => setEditForm({ ...editForm, timeSlot: e.target.value })}>
                  {slots.filter((s) => s.type === 'period').map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Faculty" required>
                <Select value={editForm.faculty} onChange={(e) => setEditForm({ ...editForm, faculty: e.target.value })}>
                  {faculty.map((f) => (
                    <option key={f._id} value={f._id}>
                      {f.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Classroom" required>
                <Select value={editForm.classroom} onChange={(e) => setEditForm({ ...editForm, classroom: e.target.value })}>
                  {classrooms.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.name} ({r.roomNumber})
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="mt-2 flex justify-between">
              <SecondaryButton type="button" onClick={deleteEntry} className="text-red-600 hover:bg-red-50">
                <Trash2 size={14} /> Remove
              </SecondaryButton>
              <div className="flex gap-2">
                <SecondaryButton type="button" onClick={() => setEditEntry(null)}>
                  Cancel
                </SecondaryButton>
                <PrimaryButton type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </PrimaryButton>
              </div>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={rejectOpen} onClose={() => setRejectOpen(false)} title="Request Changes">
        <Field label="Note for the preparer" required>
          <Textarea rows={3} value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder="Explain what needs to change..." />
        </Field>
        <div className="flex justify-end gap-2">
          <SecondaryButton onClick={() => setRejectOpen(false)}>Cancel</SecondaryButton>
          <PrimaryButton onClick={() => runAction('reject', { note: rejectNote })} disabled={saving || !rejectNote}>
            Send Back
          </PrimaryButton>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => (confirmAction === 'regenerate' ? regenerate() : runAction(confirmAction))}
        loading={saving}
        danger={confirmAction === 'archive'}
        title="Confirm action"
        message={`Are you sure you want to ${confirmAction} this timetable?`}
        confirmLabel="Yes, continue"
      />
    </div>
  );
}
