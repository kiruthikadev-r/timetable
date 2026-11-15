import { useEffect, useState } from 'react';
import { Download, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '../api/axios';
import { handleError } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import { TableSkeleton } from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import { SecondaryButton } from '../components/FormControls';

const TABS = [
  { key: 'faculty-workload', label: 'Faculty Workload', exportable: true },
  { key: 'classroom-utilization', label: 'Classroom Utilization', exportable: true },
  { key: 'subject-allocation', label: 'Subject Allocation', exportable: true },
  { key: 'unassigned-subjects', label: 'Unassigned Subjects', exportable: false },
  { key: 'timetable-completion', label: 'Timetable Completion', exportable: false },
];

export default function Reports() {
  const [tab, setTab] = useState('faculty-workload');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const endpoint = tab === 'unassigned-subjects' ? 'unassigned-subjects' : tab;
    api
      .get(`/reports/${endpoint}`)
      .then((res) => setData(res.data.data))
      .catch(handleError)
      .finally(() => setLoading(false));
  }, [tab]);

  const exportExcel = async () => {
    const res = await api.get('/reports/export', { params: { report: tab }, responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tab}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const currentTab = TABS.find((t) => t.key === tab);

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        description="Workload, utilization and allocation insights across the college"
        action={
          currentTab?.exportable && (
            <SecondaryButton onClick={exportExcel}>
              <Download size={16} /> Export Excel
            </SecondaryButton>
          )
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${tab === t.key ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <TableSkeleton cols={4} />
      ) : (
        <ReportBody tab={tab} data={data} />
      )}
    </div>
  );
}

function ReportBody({ tab, data }) {
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return <EmptyState icon={BarChart3} title="No data available" message="This report will populate once timetables are generated." />;
  }

  if (tab === 'faculty-workload') {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="periods" name="Periods/Week" fill="#4c64dc" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (tab === 'classroom-utilization') {
    return (
      <SimpleTable
        columns={['Room', 'Type', 'Periods Used', 'Utilization %']}
        rows={data.map((r) => [r.name, r.type, r.periods, `${r.utilizationPercent}%`])}
      />
    );
  }

  if (tab === 'subject-allocation') {
    return <SimpleTable columns={['Subject', 'Code', 'Required/Week', 'Scheduled/Week']} rows={data.map((s) => [s.name, s.code, s.required, s.scheduled])} />;
  }

  if (tab === 'unassigned-subjects') {
    return <SimpleTable columns={['Class', 'Department', 'Subject']} rows={data.map((u) => [u.class, u.department, u.subject])} />;
  }

  if (tab === 'timetable-completion') {
    return (
      <div>
        <p className="mb-3 text-sm text-slate-500">{data.completionPercent}% of classes have a published timetable</p>
        <SimpleTable columns={['Class', 'Department', 'Status', 'Unresolved']} rows={data.classes.map((c) => [c.displayName, c.department, c.status, c.unresolvedCount])} />
      </div>
    );
  }

  return null;
}

function SimpleTable({ columns, rows }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {columns.map((c) => (
              <th key={c} className="px-5 py-3">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50">
              {row.map((cell, j) => (
                <td key={j} className="px-5 py-3">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
