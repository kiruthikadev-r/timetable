import { useEffect, useState, useCallback } from 'react';
import { Pencil, Trash2, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { handleError, useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import Toolbar from '../components/Toolbar';
import Badge from '../components/Badge';
import { TableSkeleton } from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { Field, TextInput, Select, PrimaryButton, SecondaryButton, IconButton } from '../components/FormControls';
import useDebounce from '../hooks/useDebounce';

const emptyForm = (deptId) => ({
  name: '',
  code: '',
  department: deptId || '',
  semester: 1,
  type: 'Theory',
  weeklyPeriods: 3,
  durationSlots: 1,
});

export default function Subjects() {
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
      .get('/subjects', { params })
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

  const openEdit = (s) => {
    setForm({
      name: s.name,
      code: s.code,
      department: s.department?._id || s.department,
      semester: s.semester,
      type: s.type,
      weeklyPeriods: s.weeklyPeriods,
      durationSlots: s.durationSlots,
    });
    setModal({ mode: 'edit', id: s._id });
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal.mode === 'create') {
        await api.post('/subjects', form);
        toast.success('Subject created');
      } else {
        await api.put(`/subjects/${modal.id}`, form);
        toast.success('Subject updated');
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
      await api.delete(`/subjects/${deleting._id}`);
      toast.success('Subject deleted');
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
      <PageHeader title="Subjects" description="Define subjects, periods per week and lab requirements" />
      <Toolbar search={search} onSearch={setSearch} onAdd={openCreate} addLabel="Add Subject" placeholder="Search subjects..." />

      {loading ? (
        <TableSkeleton cols={6} />
      ) : rows.length === 0 ? (
        <EmptyState icon={BookOpen} title="No subjects yet" message="Add subjects before assigning them to classes." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Code</th>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Department</th>
                <th className="px-5 py-3">Semester</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Periods/Week</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((s) => (
                <tr key={s._id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-700">{s.code}</td>
                  <td className="px-5 py-3">{s.name}</td>
                  <td className="px-5 py-3">{s.department?.code}</td>
                  <td className="px-5 py-3">{s.semester}</td>
                  <td className="px-5 py-3">
                    <Badge value={s.type} />
                  </td>
                  <td className="px-5 py-3">{s.weeklyPeriods}</td>
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
          <Pagination page={meta.page || page} pages={meta.pages} total={meta.total} onChange={setPage} />
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'create' ? 'Add Subject' : 'Edit Subject'}>
        <form onSubmit={submit}>
          <Field label="Subject Name" required>
            <TextInput required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Subject Code" required>
            <TextInput required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
          </Field>
          {isSuperAdmin && (
            <Field label="Department" required>
              <Select required value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                <option value="">Select department</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <div className="grid grid-cols-2 gap-x-4">
            <Field label="Semester" required>
              <TextInput type="number" min={1} max={12} required value={form.semester} onChange={(e) => setForm({ ...form, semester: Number(e.target.value) })} />
            </Field>
            <Field label="Type" required>
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="Theory">Theory</option>
                <option value="Practical">Practical</option>
                <option value="Lab">Lab</option>
              </Select>
            </Field>
            <Field label="Weekly Periods" required>
              <TextInput
                type="number"
                min={1}
                max={20}
                required
                value={form.weeklyPeriods}
                onChange={(e) => setForm({ ...form, weeklyPeriods: Number(e.target.value) })}
              />
            </Field>
            <Field label="Consecutive Slots" required hint="2+ for lab blocks">
              <TextInput
                type="number"
                min={1}
                max={4}
                required
                value={form.durationSlots}
                onChange={(e) => setForm({ ...form, durationSlots: Number(e.target.value) })}
              />
            </Field>
          </div>
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
        title="Delete subject"
        message={`Delete "${deleting?.name}"? This cannot be undone.`}
      />
    </div>
  );
}
