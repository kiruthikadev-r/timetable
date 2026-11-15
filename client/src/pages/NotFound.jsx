import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-slate-50 text-center">
      <p className="text-5xl font-bold text-navy-900">404</p>
      <p className="mt-2 text-slate-500">This page doesn't exist.</p>
      <Link to="/dashboard" className="mt-4 text-sm font-medium text-brand-600 hover:text-brand-700">
        Back to dashboard
      </Link>
    </div>
  );
}
