import { useEffect, useState, useCallback } from 'react';
import { Pencil, Trash2, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { handleError, useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import Toolbar from '../components/Toolbar';
import { TableSkeleton } from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { Field, TextInput, Select, PrimaryButton, SecondaryButton, IconButton } from '../components/FormControls';
import useDebounce from '../hooks/useDebounce';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const emptyForm = (deptId) => ({
  facultyId: '',
  name: '',
  email: '',
  phone: '',
  department: deptId || '',
  designation: '',
  specialization: '',
  maxWeeklyHours: 20,
  maxConsecutivePeriods: 3,
  availableDays: [...DAYS],
});

export default function Faculty() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'superadmin';
  const [rows, setRows] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ pages: 1, total: 0 });
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm(user?.department));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const debouncedSearch = useDebounce(search);

  const load = useCallback(() => {
    setLoading(true);
    const params = { search: debouncedSearch, page };
    if (!isSuperAdmin) params.department = user?.department;
    api
      .get('/faculty', { params })
      .then((res) => {
        setRows(res.data.data);
        setMeta(res.data.pagination);
      })
      .catch(handleError)
      .finally(() => setLoading(false));
  }, [debouncedSearch, page, isSuperAdmin, user]);

  useEffect(() => load(), [load]);

  useEffect(() => {
    if (isSuperAdmin) api.get('/departments', { params: { limit: 100 } }).then((res) => setDepartments(res.data.data)).catch(() => {});
  }, [isSuperAdmin]);

  const openCreate = () => {
    setForm(emptyForm(user?.department));
    setModal({ mode: 'create' });
  };

  const openEdit = (f) => {
    setForm({
      facultyId: f.facultyId,
      name: f.name,
      email: f.email,
      phone: f.phone || '',
      department: f.department?._id || f.department,
      designation: f.designation || '',
      specialization: f.specialization || '',
      maxWeeklyHours: f.maxWeeklyHours,
      maxConsecutivePeriods: f.maxConsecutivePeriods,
      availableDays: f.availableDays,
    });
    setModal({ mode: 'edit', id: f._id });
  };

  const toggleDay = (day) => {
    setForm((f) => ({
      ...f,
      availableDays: f.availableDays.includes(day) ? f.availableDays.filter((d) => d !== day) : [...f.availableDays, day],
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal.mode === 'create') {
        await api.post('/faculty', form);
        toast.success('Faculty added');
      } else {
        await api.put(`/faculty/${modal.id}`, form);
        toast.success('Faculty updated');
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
      await api.delete(`/faculty/${deleting._id}`);
      toast.success('Faculty deleted');
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
      <PageHeader title="Faculty" description="Manage faculty members, workload limits and availability" />
      <Toolbar search={search} onSearch={setSearch} onAdd={openCreate} addLabel="Add Faculty" placeholder="Search faculty..." />

      {loading ? (
        <TableSkeleton cols={6} />
      ) : rows.length === 0 ? (
        <EmptyState icon={Users} title="No faculty members yet" message="Add faculty to start assigning them to subjects." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">ID</th>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Department</th>
                <th className="px-5 py-3">Designation</th>
                <th className="px-5 py-3">Max Hrs/Week</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((f) => (
                <tr key={f._id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-700">{f.facultyId}</td>
                  <td className="px-5 py-3">
                    <p>{f.name}</p>
                    <p className="text-xs text-slate-400">{f.email}</p>
                  </td>
                  <td className="px-5 py-3">{f.department?.code}</td>
                  <td className="px-5 py-3">{f.designation}</td>
                  <td className="px-5 py-3">{f.maxWeeklyHours}</td>
                  <td className="px-5 py-3 text-right">
                    <IconButton onClick={() => openEdit(f)}>
                      <Pencil size={16} />
                    </IconButton>
                    <IconButton onClick={() => setDeleting(f)} className="hover:bg-red-50 hover:text-red-600">
                      <Trash2 size={16} />
                    </IconButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={meta.page || page} pages={meta.pages} total={meta.total} onChange={setPage} />
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'create' ? 'Add Faculty' : 'Edit Faculty'} width="max-w-xl">
        <form onSubmit={submit}>
          <div className="grid grid-cols-2 gap-x-4">
            <Field label="Faculty ID" required>
              <TextInput required value={form.facultyId} onChange={(e) => setForm({ ...form, facultyId: e.target.value })} />
            </Field>
            <Field label="Full Name" required>
              <TextInput required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Email" required>
              <TextInput type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Phone">
              <TextInput value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Department" required>
              {isSuperAdmin ? (
                <Select required value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                  <option value="">Select department</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name}
                    </option>
                  ))}
                </Select>
              ) : (
                <TextInput disabled value="Your department" />
              )}
            </Field>
            <Field label="Designation">
              <TextInput value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
            </Field>
            <Field label="Specialization">
              <TextInput value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} />
            </Field>
            <Field label="Max Weekly Hours" required>
              <TextInput
                type="number"
                min={1}
                required
                value={form.maxWeeklyHours}
                onChange={(e) => setForm({ ...form, maxWeeklyHours: Number(e.target.value) })}
              />
            </Field>
            <Field label="Max Consecutive Periods" required>
              <TextInput
                type="number"
                min={1}
                required
                value={form.maxConsecutivePeriods}
                onChange={(e) => setForm({ ...form, maxConsecutivePeriods: Number(e.target.value) })}
              />
            </Field>
          </div>

          <Field label="Available Days">
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day) => (
                <button
                  type="button"
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    form.availableDays.includes(day) ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </Field>

          <div className="mt-2 flex justify-end gap-2">
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
        title="Delete faculty"
        message={`Delete "${deleting?.name}"? This cannot be undone.`}
      />
    </div>
  );
}
