import { useEffect, useState } from 'react';
import { BookOpen, DoorOpen } from 'lucide-react';
import api from '../api/axios';
import { handleError, useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import Badge from '../components/Badge';
import { GridSkeleton } from '../components/LoadingSkeleton';

export default function MyAssignments() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.faculty) {
      setLoading(false);
      return;
    }
    api
      .get(`/faculty/${user.faculty}`)
      .then((res) => setProfile(res.data.data))
      .catch(handleError)
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <GridSkeleton count={4} />;

  if (!user?.faculty) {
    return <EmptyState icon={BookOpen} title="No faculty profile linked" message="Your account is not linked to a faculty record yet. Contact your administrator." />;
  }

  return (
    <div>
      <PageHeader title="My Classes & Subjects" description="Your teaching assignments, profile and the rooms you teach in" />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard label="Designation" value={profile.designation || '—'} />
        <InfoCard label="Specialization" value={profile.specialization || '—'} />
        <InfoCard label="Max Weekly Hours" value={profile.maxWeeklyHours} />
        <InfoCard label="Scheduled This Week" value={profile.weeklyHours} />
      </div>

      <div className="mb-6">
        <h2 className="mb-3 text-base font-semibold text-slate-800">Available Days</h2>
        <div className="flex flex-wrap gap-2">
          {profile.availableDays.map((d) => (
            <span key={d} className="rounded-full bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700">
              {d}
            </span>
          ))}
        </div>
      </div>

      <h2 className="mb-3 text-base font-semibold text-slate-800">Assigned Subjects</h2>
      {profile.assignments.length === 0 ? (
        <EmptyState icon={BookOpen} title="No subjects assigned yet" message="Your administrator hasn't assigned you to any class subjects yet." />
      ) : (
        <div className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Class</th>
                  <th className="px-5 py-3">Subject</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Weekly Periods</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {profile.assignments.map((a, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-700">{a.class.displayName}</td>
                    <td className="px-5 py-3">
                      {a.subject?.name} ({a.subject?.code})
                    </td>
                    <td className="px-5 py-3">
                      <Badge value={a.subject?.type} />
                    </td>
                    <td className="px-5 py-3">{a.subject?.weeklyPeriods}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <h2 className="mb-3 text-base font-semibold text-slate-800">Classrooms You Teach In</h2>
      {profile.classroomsUsed.length === 0 ? (
        <EmptyState icon={DoorOpen} title="No rooms assigned yet" message="Classroom details will appear once your timetable is generated." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profile.classroomsUsed.map((r) => (
            <div key={r._id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
              <p className="font-medium text-slate-800">{r.name}</p>
              <p className="text-sm text-slate-500">
                {r.roomNumber} · {r.type}
              </p>
              <p className="text-xs text-slate-400">
                {r.building} {r.floor && `• Floor ${r.floor}`} · Capacity {r.capacity}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-800">{value}</p>
    </div>
  );
}
