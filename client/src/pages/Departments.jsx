import { useEffect, useState, useCallback } from 'react';
import { Pencil, Trash2, Building2 } from 'lucide-react';
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
import { Field, TextInput, Textarea, Select, PrimaryButton, SecondaryButton, IconButton } from '../components/FormControls';
import useDebounce from '../hooks/useDebounce';

const EMPTY = { name: '', code: '', description: '', hod: '' };

export default function Departments() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ pages: 1, total: 0 });
  const [modal, setModal] = useState(null); // { mode, data }
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [hods, setHods] = useState([]);
  const debouncedSearch = useDebounce(search);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get('/departments', { params: { search: debouncedSearch, page } })
      .then((res) => {
        setRows(res.data.data);
        setMeta(res.data.pagination);
      })
      .catch(handleError)
      .finally(() => setLoading(false));
  }, [debouncedSearch, page]);

  useEffect(() => load(), [load]);

  useEffect(() => {
    api.get('/users', { params: { role: 'hod', limit: 200 } }).then((res) => setHods(res.data.data)).catch(() => {});
  }, []);

  const openCreate = () => {
    setForm(EMPTY);
    setModal({ mode: 'create' });
  };

  const openEdit = (dept) => {
    setForm({ name: dept.name, code: dept.code, description: dept.description || '', hod: dept.hod?._id || dept.hod || '' });
    setModal({ mode: 'edit', id: dept._id });
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal.mode === 'create') {
        await api.post('/departments', form);
        toast.success('Department created');
      } else {
        await api.put(`/departments/${modal.id}`, form);
        toast.success('Department updated');
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
      await api.delete(`/departments/${deleting._id}`);
      toast.success('Department deleted');
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
      <PageHeader title="Departments" description="Manage academic departments across the college" />
      <Toolbar search={search} onSearch={setSearch} onAdd={openCreate} addLabel="Add Department" placeholder="Search departments..." />

      {loading ? (
        <TableSkeleton cols={6} />
      ) : rows.length === 0 ? (
        <EmptyState icon={Building2} title="No departments yet" message="Create your first department to get started." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Code</th>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">HOD</th>
                <th className="px-5 py-3">Classes</th>
                <th className="px-5 py-3">Faculty</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((d) => (
                <tr key={d._id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-700">{d.code}</td>
                  <td className="px-5 py-3">{d.name}</td>
                  <td className="px-5 py-3 text-slate-500">{d.hod?.name || '—'}</td>
                  <td className="px-5 py-3">{d.classCount}</td>
                  <td className="px-5 py-3">{d.facultyCount}</td>
                  <td className="px-5 py-3 text-right">
                    <IconButton onClick={() => openEdit(d)}>
                      <Pencil size={16} />
                    </IconButton>
                    <IconButton onClick={() => setDeleting(d)} className="hover:bg-red-50 hover:text-red-600">
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

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'create' ? 'Add Department' : 'Edit Department'}>
        <form onSubmit={submit}>
          <Field label="Department Name" required>
            <TextInput required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Department Code" required>
            <TextInput required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
          </Field>
          <Field label="Description">
            <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Field label="HOD" hint="Create the HOD's login first from User Accounts, then assign here.">
            <Select value={form.hod} onChange={(e) => setForm({ ...form, hod: e.target.value })}>
              <option value="">Not assigned</option>
              {hods.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.email})
                </option>
              ))}
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

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        loading={saving}
        title="Delete department"
        message={`Delete "${deleting?.name}"? This cannot be undone.`}
      />
    </div>
  );
}
