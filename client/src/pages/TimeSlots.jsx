import { useEffect, useState, useCallback } from 'react';
import { Pencil, Trash2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { handleError } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import Badge from '../components/Badge';
import { TableSkeleton } from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { Field, TextInput, Select, PrimaryButton, SecondaryButton, IconButton } from '../components/FormControls';

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const EMPTY = { order: '', label: '', startTime: '', endTime: '', type: 'period' };

export default function TimeSlots() {
  const [rows, setRows] = useState([]);
  const [settings, setSettings] = useState({ workingDays: ALL_DAYS, collegeStartTime: '09:00', collegeEndTime: '16:00' });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([api.get('/timeslots'), api.get('/timeslots/settings')])
      .then(([slotsRes, settingsRes]) => {
        setRows(slotsRes.data.data);
        setSettings(settingsRes.data.data);
      })
      .catch(handleError)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => load(), [load]);

  const toggleWorkingDay = (day) => {
    setSettings((s) => ({
      ...s,
      workingDays: s.workingDays.includes(day) ? s.workingDays.filter((d) => d !== day) : [...s.workingDays, day],
    }));
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      await api.put('/timeslots/settings', settings);
      toast.success('Working days updated');
    } catch (err) {
      handleError(err);
    } finally {
      setSavingSettings(false);
    }
  };

  const openEdit = (slot) => {
    setForm(slot);
    setModal({ mode: 'edit', id: slot._id });
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, order: Number(form.order) };
    try {
      if (modal.mode === 'create') {
        await api.post('/timeslots', payload);
        toast.success('Time slot created');
      } else {
        await api.put(`/timeslots/${modal.id}`, payload);
        toast.success('Time slot updated');
      }
      setModal(null);
      load();
    } catch (err) {
      handleError(err);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    try {
      await api.delete(`/timeslots/${deleting._id}`);
      toast.success('Time slot deleted');
      setDeleting(null);
      load();
    } catch (err) {
      handleError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Time Slots"
        description="Configure periods, breaks and working days used by the timetable generator"
        action={
          <PrimaryButton
            onClick={() => {
              setForm({ ...EMPTY, order: rows.length + 1 });
              setModal({ mode: 'create' });
            }}
          >
            Add Time Slot
          </PrimaryButton>
        }
      />

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <h2 className="mb-3 text-base font-semibold text-slate-800">Working Days</h2>
        <div className="flex flex-wrap gap-2">
          {ALL_DAYS.map((day) => (
            <button
              key={day}
              onClick={() => toggleWorkingDay(day)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium ${
                settings.workingDays.includes(day) ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {day}
            </button>
          ))}
        </div>
        <div className="mt-4">
          <PrimaryButton onClick={saveSettings} disabled={savingSettings}>
            {savingSettings ? 'Saving...' : 'Save Working Days'}
          </PrimaryButton>
        </div>
      </div>

      {loading ? (
        <TableSkeleton cols={5} />
      ) : rows.length === 0 ? (
        <EmptyState icon={Clock} title="No time slots configured" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Order</th>
                <th className="px-5 py-3">Label</th>
                <th className="px-5 py-3">Start</th>
                <th className="px-5 py-3">End</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((s) => (
                <tr key={s._id} className="hover:bg-slate-50">
                  <td className="px-5 py-3">{s.order}</td>
                  <td className="px-5 py-3 font-medium text-slate-700">{s.label}</td>
                  <td className="px-5 py-3">{s.startTime}</td>
                  <td className="px-5 py-3">{s.endTime}</td>
                  <td className="px-5 py-3">
                    <Badge value={s.type} label={s.type === 'period' ? 'Period' : s.type === 'lunch' ? 'Lunch' : 'Break'} />
                  </td>
                  <td className="px-5 py-3 text-right">
                    <IconButton onClick={() => openEdit(s)}>
                      <Pencil size={16} />
                    </IconButton>
                    <IconButton onClick={() => setDeleting(s)} className="hover:bg-red-50 hover:text-red-600">
                      <Trash2 size={16} />
                    </IconButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'create' ? 'Add Time Slot' : 'Edit Time Slot'}>
        <form onSubmit={submit}>
          <Field label="Order" required hint="Sequential chronological order across the whole day, including breaks">
            <TextInput type="number" min={1} required value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} />
          </Field>
          <Field label="Label" required>
            <TextInput required value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-x-4">
            <Field label="Start Time" required>
              <TextInput type="time" required value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
            </Field>
            <Field label="End Time" required>
              <TextInput type="time" required value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
            </Field>
          </div>
          <Field label="Type" required>
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="period">Teaching Period</option>
              <option value="break">Short Break</option>
              <option value="lunch">Lunch Break</option>
            </Select>
          </Field>
          <div className="flex justify-end gap-2">
            <SecondaryButton type="button" onClick={() => setModal(null)}>
              Cancel
            </SecondaryButton>
            <PrimaryButton type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </PrimaryButton>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={remove} loading={saving} title="Delete time slot" message={`Delete "${deleting?.label}"?`} />
    </div>
  );
}
