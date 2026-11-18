import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';

import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Departments from './pages/Departments';
import Faculty from './pages/Faculty';
import Classes from './pages/Classes';
import Subjects from './pages/Subjects';
import Classrooms from './pages/Classrooms';
import TimeSlots from './pages/TimeSlots';
import AcademicYears from './pages/AcademicYears';
import Availability from './pages/Availability';
import Generate from './pages/Generate';
import Timetables from './pages/Timetables';
import TimetableDetail from './pages/TimetableDetail';
import Approvals from './pages/Approvals';
import MyTimetable from './pages/MyTimetable';
import MyAssignments from './pages/MyAssignments';
import Reports from './pages/Reports';
import Notifications from './pages/Notifications';
import Users from './pages/Users';
import NotFound from './pages/NotFound';

const ADMIN_HOD = ['superadmin', 'hod'];

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/departments" element={<ProtectedRoute roles={['superadmin']}><Departments /></ProtectedRoute>} />
        <Route path="/faculty" element={<ProtectedRoute roles={ADMIN_HOD}><Faculty /></ProtectedRoute>} />
        <Route path="/classes" element={<ProtectedRoute roles={ADMIN_HOD}><Classes /></ProtectedRoute>} />
        <Route path="/subjects" element={<ProtectedRoute roles={ADMIN_HOD}><Subjects /></ProtectedRoute>} />
        <Route path="/classrooms" element={<ProtectedRoute roles={['superadmin']}><Classrooms /></ProtectedRoute>} />
        <Route path="/time-slots" element={<ProtectedRoute roles={['superadmin']}><TimeSlots /></ProtectedRoute>} />
        <Route path="/academic-years" element={<ProtectedRoute roles={['superadmin']}><AcademicYears /></ProtectedRoute>} />
        <Route path="/availability" element={<ProtectedRoute roles={ADMIN_HOD}><Availability /></ProtectedRoute>} />
        <Route path="/generate" element={<ProtectedRoute roles={ADMIN_HOD}><Generate /></ProtectedRoute>} />
        <Route path="/timetables" element={<ProtectedRoute roles={ADMIN_HOD}><Timetables /></ProtectedRoute>} />
        <Route path="/timetables/:id" element={<ProtectedRoute roles={ADMIN_HOD}><TimetableDetail /></ProtectedRoute>} />
        <Route path="/approvals" element={<ProtectedRoute roles={ADMIN_HOD}><Approvals /></ProtectedRoute>} />
        <Route path="/my-timetable" element={<ProtectedRoute roles={['faculty']}><MyTimetable /></ProtectedRoute>} />
        <Route path="/my-assignments" element={<ProtectedRoute roles={['faculty']}><MyAssignments /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute roles={ADMIN_HOD}><Reports /></ProtectedRoute>} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/users" element={<ProtectedRoute roles={['superadmin']}><Users /></ProtectedRoute>} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
