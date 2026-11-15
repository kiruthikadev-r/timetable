import { useEffect, useState, useCallback } from 'react';
import { Pencil, Trash2, UserCog } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { handleError } from '../context/AuthContext';
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

const EMPTY = { name: '', email: '', password: '', role: 'faculty', department: '', faculty: '' };
const ROLE_LABEL = { superadmin: 'Super Admin', hod: 'HOD', faculty: 'Faculty' };

export default function Users() {
  const [rows, setRows] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
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
      .get('/users', { params: { search: debouncedSearch, page } })
      .then((res) => {
        setRows(res.data.data);
        setMeta(res.data.pagination);
      })
      .catch(handleError)
      .finally(() => setLoading(false));
  }, [debouncedSearch, page]);

  useEffect(() => load(), [load]);

  useEffect(() => {
    api.get('/departments', { params: { limit: 100 } }).then((res) => setDepartments(res.data.data));
  }, []);

  useEffect(() => {
    if (form.department) api.get('/faculty', { params: { department: form.department, limit: 200 } }).then((res) => setFacultyList(res.data.data));
  }, [form.department]);

  const openCreate = () => {
    setForm(EMPTY);
    setModal({ mode: 'create' });
  };

  const openEdit = (u) => {
    setForm({ name: u.name, email: u.email, password: '', role: u.role, department: u.department?._id || u.department || '', faculty: u.faculty || '', isActive: u.isActive });
    setModal({ mode: 'edit', id: u.id });
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal.mode === 'create') {
        await api.post('/users', form);
        toast.success('User account created');
      } else {
        await api.put(`/users/${modal.id}`, form);
        toast.success('User updated');
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
      await api.delete(`/users/${deleting.id}`);
      toast.success('User deleted');
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
      <PageHeader title="User Accounts" description="Create and manage login accounts for HODs and faculty" />
      <Toolbar search={search} onSearch={setSearch} onAdd={openCreate} addLabel="Add User" placeholder="Search users..." />

      {loading ? (
        <TableSkeleton cols={5} />
      ) : rows.length === 0 ? (
        <EmptyState icon={UserCog} title="No user accounts yet" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Department</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-700">{u.name}</td>
                  <td className="px-5 py-3">{u.email}</td>
                  <td className="px-5 py-3">{ROLE_LABEL[u.role]}</td>
                  <td className="px-5 py-3">{u.department?.code || '—'}</td>
                  <td className="px-5 py-3">
                    <Badge value={u.isActive ? 'success' : 'skipped'} label={u.isActive ? 'Active' : 'Inactive'} />
                  </td>
                  <td className="px-5 py-3 text-right">
                    <IconButton onClick={() => openEdit(u)}>
                      <Pencil size={16} />
                    </IconButton>
                    <IconButton onClick={() => setDeleting(u)} className="hover:bg-red-50 hover:text-red-600">
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

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'create' ? 'Add User' : 'Edit User'}>
        <form onSubmit={submit}>
          <Field label="Full Name" required>
            <TextInput required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Email" required>
            <TextInput type="email" required disabled={modal?.mode === 'edit'} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          {modal?.mode === 'create' && (
            <Field label="Password" required hint="At least 6 characters">
              <TextInput type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </Field>
          )}
          <Field label="Role" required>
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="superadmin">Super Admin</option>
              <option value="hod">HOD</option>
              <option value="faculty">Faculty</option>
            </Select>
          </Field>
          {form.role !== 'superadmin' && (
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
          {form.role === 'faculty' && (
            <Field label="Link to Faculty Record" hint="Lets this user see their own timetable">
              <Select value={form.faculty} onChange={(e) => setForm({ ...form, faculty: e.target.value })}>
                <option value="">Not linked</option>
                {facultyList.map((f) => (
                  <option key={f._id} value={f._id}>
                    {f.name} ({f.facultyId})
                  </option>
                ))}
              </Select>
            </Field>
          )}
          {modal?.mode === 'edit' && (
            <Field label="Status">
              <Select value={form.isActive ? 'active' : 'inactive'} onChange={(e) => setForm({ ...form, isActive: e.target.value === 'active' })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </Field>
          )}
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

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={remove} loading={saving} title="Delete user" message={`Delete "${deleting?.name}"?`} />
    </div>
  );
}
