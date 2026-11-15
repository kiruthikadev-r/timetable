import { useEffect, useState } from 'react';
import { Building2, Users, GraduationCap, BookOpen, DoorOpen, CalendarCheck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '../api/axios';
import { handleError } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import { GridSkeleton } from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/dashboard/summary')
      .then((res) => setData(res.data.data))
      .catch(handleError)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="Dashboard" description={`Overview for ${user?.role === 'superadmin' ? 'the entire college' : 'your department'}`} />

      {loading ? (
        <GridSkeleton count={6} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {user?.role === 'superadmin' && <StatCard label="Departments" value={data.departments} icon={Building2} accent="navy" />}
            <StatCard label="Faculty" value={data.faculty} icon={Users} accent="brand" />
            <StatCard label="Classes" value={data.classes} icon={GraduationCap} accent="emerald" />
            <StatCard label="Subjects" value={data.subjects} icon={BookOpen} accent="amber" />
            {user?.role === 'superadmin' && <StatCard label="Classrooms" value={data.classrooms} icon={DoorOpen} accent="navy" />}
            <StatCard label="Published Timetables" value={data.publishedTimetables} icon={CalendarCheck} accent="brand" hint={`${data.completionPercent}% complete`} />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card lg:col-span-2">
              <h2 className="mb-4 text-base font-semibold text-slate-800">Department-wise Timetable Status</h2>
              {data.byDepartment?.length ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.byDepartment}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="department" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="total" name="Total classes" fill="#b9c4f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="published" name="Published" fill="#4c64dc" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState title="No data yet" message="Add departments and classes to see statistics here." />
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
              <h2 className="mb-4 text-base font-semibold text-slate-800">Recent Activity</h2>
              {data.recentActivity?.length ? (
                <ul className="space-y-3">
                  {data.recentActivity.map((a) => (
                    <li key={a._id} className="text-sm">
                      <p className="text-slate-700">
                        <span className="font-medium">{a.user?.name || 'System'}</span> {a.action}
                      </p>
                      <p className="text-xs text-slate-400">{new Date(a.createdAt).toLocaleString()}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState title="No activity yet" />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
