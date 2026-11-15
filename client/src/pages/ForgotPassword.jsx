import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { handleError } from '../context/AuthContext';
import { TextInput, PrimaryButton, Field } from '../components/FormControls';

export default function ForgotPassword() {
  const [step, setStep] = useState('request');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const requestReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      toast.success(res.data.message);
      if (res.data.resetToken) {
        setToken(res.data.resetToken);
        setStep('reset');
      }
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      toast.success('Password updated. You can sign in now.');
      setStep('done');
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
          <h1 className="text-xl font-semibold text-slate-900">Reset your password</h1>
          <p className="mt-1 text-sm text-slate-500">
            {step === 'request' && 'Enter your account email to receive a reset token.'}
            {step === 'reset' && 'Set a new password using the issued token.'}
            {step === 'done' && 'Your password has been updated.'}
          </p>
        </div>

        {step === 'request' && (
          <form onSubmit={requestReset}>
            <Field label="Email" required>
              <TextInput type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@college.edu" />
            </Field>
            <PrimaryButton type="submit" disabled={loading} className="w-full justify-center py-2.5">
              {loading ? 'Sending...' : 'Send reset token'}
            </PrimaryButton>
          </form>
        )}

        {step === 'reset' && (
          <form onSubmit={resetPassword}>
            <Field label="Reset token" required hint="This app has no email service configured, so the token is shown here directly.">
              <TextInput required value={token} onChange={(e) => setToken(e.target.value)} />
            </Field>
            <Field label="New password" required>
              <TextInput type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            <PrimaryButton type="submit" disabled={loading} className="w-full justify-center py-2.5">
              {loading ? 'Updating...' : 'Update password'}
            </PrimaryButton>
          </form>
        )}

        {step === 'done' && (
          <Link to="/login">
            <PrimaryButton className="w-full justify-center py-2.5">Back to sign in</PrimaryButton>
          </Link>
        )}

        <p className="mt-5 text-center text-sm text-slate-500">
          <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
