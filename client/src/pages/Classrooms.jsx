import { useEffect, useState, useCallback } from 'react';
import { Pencil, Trash2, DoorOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { handleError } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import Toolbar from '../components/Toolbar';
import { TableSkeleton } from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { Field, TextInput, Select, PrimaryButton, SecondaryButton, IconButton } from '../components/FormControls';
import useDebounce from '../hooks/useDebounce';

const TYPES = ['Classroom', 'Computer Lab', 'Science Lab', 'Seminar Hall'];

const EMPTY = { name: '', roomNumber: '', building: '', floor: '', capacity: 40, type: 'Classroom', equipment: '' };

export default function Classrooms() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ pages: 1, total: 0 });
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const debouncedSearch = useDebounce(search);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get('/classrooms', { params: { search: debouncedSearch, page } })
      .then((res) => {
        setRows(res.data.data);
        setMeta(res.data.pagination);
      })
      .catch(handleError)
      .finally(() => setLoading(false));
  }, [debouncedSearch, page]);

  useEffect(() => load(), [load]);

  const openCreate = () => {
    setForm(EMPTY);
    setModal({ mode: 'create' });
  };

  const openEdit = (r) => {
    setForm({ ...r, equipment: (r.equipment || []).join(', ') });
    setModal({ mode: 'edit', id: r._id });
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, equipment: form.equipment ? form.equipment.split(',').map((s) => s.trim()).filter(Boolean) : [] };
    try {
      if (modal.mode === 'create') {
        await api.post('/classrooms', payload);
        toast.success('Classroom added');
      } else {
        await api.put(`/classrooms/${modal.id}`, payload);
        toast.success('Classroom updated');
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
      await api.delete(`/classrooms/${deleting._id}`);
      toast.success('Classroom deleted');
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
      <PageHeader title="Classrooms" description="Manage rooms, labs and seminar halls" />
      <Toolbar search={search} onSearch={setSearch} onAdd={openCreate} addLabel="Add Classroom" placeholder="Search classrooms..." />

      {loading ? (
        <TableSkeleton cols={6} />
      ) : rows.length === 0 ? (
        <EmptyState icon={DoorOpen} title="No classrooms yet" message="Add classrooms and labs to use in timetables." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Room No</th>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Capacity</th>
                <th className="px-5 py-3">Building / Floor</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r._id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-700">{r.roomNumber}</td>
                  <td className="px-5 py-3">{r.name}</td>
                  <td className="px-5 py-3">{r.type}</td>
                  <td className="px-5 py-3">{r.capacity}</td>
                  <td className="px-5 py-3 text-slate-500">
                    {r.building} {r.floor && `• Floor ${r.floor}`}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <IconButton onClick={() => openEdit(r)}>
                      <Pencil size={16} />
                    </IconButton>
                    <IconButton onClick={() => setDeleting(r)} className="hover:bg-red-50 hover:text-red-600">
                      <Trash2 size={16} />
                    </IconButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <Pagination page={meta.page || page} pages={meta.pages} total={meta.total} onChange={setPage} />
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'create' ? 'Add Classroom' : 'Edit Classroom'}>
        <form onSubmit={submit}>
          <div className="grid grid-cols-2 gap-x-4">
            <Field label="Room Name" required>
              <TextInput required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Room Number" required>
              <TextInput required value={form.roomNumber} onChange={(e) => setForm({ ...form, roomNumber: e.target.value })} />
            </Field>
            <Field label="Building">
              <TextInput value={form.building} onChange={(e) => setForm({ ...form, building: e.target.value })} />
            </Field>
            <Field label="Floor">
              <TextInput value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} />
            </Field>
            <Field label="Capacity" required>
              <TextInput type="number" min={1} required value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} />
            </Field>
            <Field label="Type" required>
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Equipment" hint="Comma separated">
            <TextInput value={form.equipment} onChange={(e) => setForm({ ...form, equipment: e.target.value })} />
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

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        loading={saving}
        title="Delete classroom"
        message={`Delete "${deleting?.name}"? This cannot be undone.`}
      />
    </div>
  );
}
