import { useEffect, useState, useCallback } from 'react';
import { Pencil, Trash2, GraduationCap, Plus, X } from 'lucide-react';
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

const emptyForm = (deptId, yearId) => ({
  department: deptId || '',
  academicYear: yearId || '',
  semester: 1,
  programme: '',
  section: '',
  strength: 0,
  classTeacher: '',
  subjects: [],
});

export default function Classes() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'superadmin';
  const [rows, setRows] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [years, setYears] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
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
    const params = { page };
    if (!isSuperAdmin) params.department = user?.department;
    api
      .get('/classes', { params })
      .then((res) => {
        setRows(res.data.data);
        setMeta(res.data.pagination);
      })
      .catch(handleError)
      .finally(() => setLoading(false));
  }, [page, isSuperAdmin, user]);

  useEffect(() => load(), [load]);

  useEffect(() => {
    api.get('/academic-years').then((res) => setYears(res.data.data)).catch(() => {});
    if (isSuperAdmin) api.get('/departments', { params: { limit: 100 } }).then((res) => setDepartments(res.data.data)).catch(() => {});
  }, [isSuperAdmin]);

  useEffect(() => {
    const dept = form.department;
    if (!dept) return;
    api.get('/subjects', { params: { department: dept, semester: form.semester, limit: 100 } }).then((res) => setSubjects(res.data.data)).catch(() => {});
    api.get('/faculty', { params: { department: dept, limit: 200 } }).then((res) => setFacultyList(res.data.data)).catch(() => {});
  }, [form.department, form.semester]);

  const openCreate = () => {
    setForm(emptyForm(user?.department, years[0]?._id));
    setModal({ mode: 'create' });
  };

  const openEdit = (c) => {
    setForm({
      department: c.department?._id || c.department,
      academicYear: c.academicYear?._id || c.academicYear,
      semester: c.semester,
      programme: c.programme,
      section: c.section,
      strength: c.strength,
      classTeacher: c.classTeacher?._id || '',
      subjects: c.subjects.map((s) => ({ subject: s.subject?._id || s.subject, faculty: s.faculty?._id || s.faculty })),
    });
    setModal({ mode: 'edit', id: c._id });
  };

  const addSubjectRow = () => setForm((f) => ({ ...f, subjects: [...f.subjects, { subject: '', faculty: '' }] }));
  const removeSubjectRow = (idx) => setForm((f) => ({ ...f, subjects: f.subjects.filter((_, i) => i !== idx) }));
  const updateSubjectRow = (idx, key, value) =>
    setForm((f) => ({ ...f, subjects: f.subjects.map((s, i) => (i === idx ? { ...s, [key]: value } : s)) }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal.mode === 'create') {
        await api.post('/classes', form);
        toast.success('Class created');
      } else {
        await api.put(`/classes/${modal.id}`, form);
        toast.success('Class updated');
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
      await api.delete(`/classes/${deleting._id}`);
      toast.success('Class deleted');
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
      <PageHeader title="Classes" description="Define classes, sections and their subject-faculty mapping" />
      <Toolbar search={search} onSearch={setSearch} onAdd={openCreate} addLabel="Add Class" placeholder="Search classes..." />

      {loading ? (
        <TableSkeleton cols={6} />
      ) : rows.length === 0 ? (
        <EmptyState icon={GraduationCap} title="No classes yet" message="Create a class and assign subjects and faculty." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Class</th>
                <th className="px-5 py-3">Department</th>
                <th className="px-5 py-3">Strength</th>
                <th className="px-5 py-3">Class Teacher</th>
                <th className="px-5 py-3">Subjects</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((c) => (
                <tr key={c._id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-700">{c.displayName}</td>
                  <td className="px-5 py-3">{c.department?.code}</td>
                  <td className="px-5 py-3">{c.strength}</td>
                  <td className="px-5 py-3">{c.classTeacher?.name || '—'}</td>
                  <td className="px-5 py-3">{c.subjects?.length || 0}</td>
                  <td className="px-5 py-3 text-right">
                    <IconButton onClick={() => openEdit(c)}>
                      <Pencil size={16} />
                    </IconButton>
                    <IconButton onClick={() => setDeleting(c)} className="hover:bg-red-50 hover:text-red-600">
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

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'create' ? 'Add Class' : 'Edit Class'} width="max-w-2xl">
        <form onSubmit={submit}>
          <div className="grid grid-cols-2 gap-x-4">
            {isSuperAdmin && (
              <Field label="Department" required>
                <Select required value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value, subjects: [] })}>
                  <option value="">Select department</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            <Field label="Academic Year" required>
              <Select required value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })}>
                <option value="">Select year</option>
                {years.map((y) => (
                  <option key={y._id} value={y._id}>
                    {y.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Programme" required hint="e.g. B.Sc Computer Science">
              <TextInput required value={form.programme} onChange={(e) => setForm({ ...form, programme: e.target.value })} />
            </Field>
            <Field label="Section" required>
              <TextInput required value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value.toUpperCase() })} />
            </Field>
            <Field label="Semester" required>
              <TextInput type="number" min={1} max={12} required value={form.semester} onChange={(e) => setForm({ ...form, semester: Number(e.target.value), subjects: [] })} />
            </Field>
            <Field label="Student Strength" required>
              <TextInput type="number" min={0} required value={form.strength} onChange={(e) => setForm({ ...form, strength: Number(e.target.value) })} />
            </Field>
            <Field label="Class Teacher">
              <Select value={form.classTeacher} onChange={(e) => setForm({ ...form, classTeacher: e.target.value })}>
                <option value="">Not assigned</option>
                {facultyList.map((f) => (
                  <option key={f._id} value={f._id}>
                    {f.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Assigned Subjects & Faculty">
            <div className="space-y-2 rounded-lg border border-slate-200 p-3">
              {form.subjects.length === 0 && <p className="text-sm text-slate-400">No subjects added yet.</p>}
              {form.subjects.map((row, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Select value={row.subject} onChange={(e) => updateSubjectRow(idx, 'subject', e.target.value)} className="flex-1">
                    <option value="">Subject</option>
                    {subjects.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </Select>
                  <Select value={row.faculty} onChange={(e) => updateSubjectRow(idx, 'faculty', e.target.value)} className="flex-1">
                    <option value="">Faculty</option>
                    {facultyList.map((f) => (
                      <option key={f._id} value={f._id}>
                        {f.name}
                      </option>
                    ))}
                  </Select>
                  <IconButton type="button" onClick={() => removeSubjectRow(idx)} className="hover:bg-red-50 hover:text-red-600">
                    <X size={16} />
                  </IconButton>
                </div>
              ))}
              <SecondaryButton type="button" onClick={addSubjectRow} className="mt-1">
                <Plus size={14} /> Add Subject
              </SecondaryButton>
            </div>
          </Field>

          <div className="mt-4 flex justify-end gap-2">
            <SecondaryButton type="button" onClick={() => setModal(null)}>
              Cancel
            </SecondaryButton>
            <PrimaryButton type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </PrimaryButton>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={remove} loading={saving} title="Delete class" message={`Delete "${deleting?.displayName}"?`} />
    </div>
  );
}
