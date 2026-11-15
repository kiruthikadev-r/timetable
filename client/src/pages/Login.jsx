import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { CalendarClock, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth, handleError } from '../context/AuthContext';
import { TextInput, PrimaryButton, Field } from '../components/FormControls';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-navy-950 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white">
            <CalendarClock size={26} />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Smart College Timetable</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to manage schedules and classes</p>
        </div>

        <form onSubmit={submit}>
          <Field label="Email" required>
            <TextInput
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@college.edu"
            />
          </Field>
          <Field label="Password" required>
            <div className="relative">
              <TextInput
                type={showPassword ? 'text' : 'password'}
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Field>

          <div className="mb-5 flex justify-end">
            <Link to="/forgot-password" className="text-sm font-medium text-brand-600 hover:text-brand-700">
              Forgot password?
            </Link>
          </div>

          <PrimaryButton type="submit" disabled={loading} className="w-full justify-center py-2.5">
            {loading ? 'Signing in...' : 'Sign in'}
          </PrimaryButton>
        </form>
      </div>
    </div>
  );
}
