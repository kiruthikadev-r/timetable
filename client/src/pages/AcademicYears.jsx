import { useEffect, useState, useCallback } from 'react';
import { Pencil, Trash2, CalendarRange } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { handleError } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import { TableSkeleton } from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { Field, TextInput, PrimaryButton, SecondaryButton, IconButton } from '../components/FormControls';

const EMPTY = { name: '', startDate: '', endDate: '' };

export default function AcademicYears() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get('/academic-years')
      .then((res) => setRows(res.data.data))
      .catch(handleError)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => load(), [load]);

  const openEdit = (y) => {
    setForm({ name: y.name, startDate: y.startDate?.slice(0, 10), endDate: y.endDate?.slice(0, 10) });
    setModal({ mode: 'edit', id: y._id });
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal.mode === 'create') {
        await api.post('/academic-years', form);
        toast.success('Academic year created');
      } else {
        await api.put(`/academic-years/${modal.id}`, form);
        toast.success('Academic year updated');
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
      await api.delete(`/academic-years/${deleting._id}`);
      toast.success('Deleted');
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
        title="Academic Years"
        description="Define academic sessions used across classes and timetables"
        action={
          <PrimaryButton
            onClick={() => {
              setForm(EMPTY);
              setModal({ mode: 'create' });
            }}
          >
            Add Academic Year
          </PrimaryButton>
        }
      />

      {loading ? (
        <TableSkeleton cols={4} />
      ) : rows.length === 0 ? (
        <EmptyState icon={CalendarRange} title="No academic years yet" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Start Date</th>
                <th className="px-5 py-3">End Date</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((y) => (
                <tr key={y._id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-700">{y.name}</td>
                  <td className="px-5 py-3">{new Date(y.startDate).toLocaleDateString()}</td>
                  <td className="px-5 py-3">{new Date(y.endDate).toLocaleDateString()}</td>
                  <td className="px-5 py-3 text-right">
                    <IconButton onClick={() => openEdit(y)}>
                      <Pencil size={16} />
                    </IconButton>
                    <IconButton onClick={() => setDeleting(y)} className="hover:bg-red-50 hover:text-red-600">
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

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'create' ? 'Add Academic Year' : 'Edit Academic Year'}>
        <form onSubmit={submit}>
          <Field label="Name" required hint="e.g. 2026-2027">
            <TextInput required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Start Date" required>
            <TextInput type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </Field>
          <Field label="End Date" required>
            <TextInput type="date" required value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
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

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={remove} loading={saving} title="Delete academic year" message={`Delete "${deleting?.name}"?`} />
    </div>
  );
}
