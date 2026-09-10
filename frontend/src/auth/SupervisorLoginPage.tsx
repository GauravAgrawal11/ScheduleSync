import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from './authStore';
import { api } from '../api/client';
import { Button } from '../components/ui/Button';
import {
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Shield,
} from 'lucide-react';
import { InstallAppBanner } from '../supervisor/offline/InstallAppBanner';
import { BrandLogo } from '../components/BrandLogo';

export const SupervisorLoginPage: React.FC = () => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.login(username.trim(), password);
      setAuth(res.user, res.access_token);
      navigate('/supervisor');
    } catch (err: any) {
      setError(err?.message || 'Invalid supervisor credentials. Please check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between text-slate-800 font-sans antialiased">
      {/* Top Header: High-contrast white bar */}
      <header className="bg-white border-b border-slate-200 px-5 py-3.5 sticky top-0 z-20 shadow-xs">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <BrandLogo roleTag="FIELD" tagColor="amber" size="sm" />

          <div className="flex items-center gap-1 text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Site Link</span>
          </div>
        </div>
      </header>

      {/* Main Content: Mobile-First Card */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 space-y-3">
        <div className="max-w-md w-full">
          <InstallAppBanner />
        </div>

        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">
          {/* Terminal Title & Brief Context */}
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between">
              <h1 className="text-base font-bold text-slate-900 tracking-tight">
                Supervisor Sign-In
              </h1>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                Direct Field Portal
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Log daily progress, inspect site drawings, and report blockers for the refinery project.
            </p>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Access Alert:</strong> {error}
              </div>
            </div>
          )}

          {/* Credentials Form */}
          <form onSubmit={handleLogin} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Supervisor Email ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="name@oilindia.in"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all shadow-2xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Security Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter supervisor password"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all shadow-2xs"
                />
              </div>
            </div>

            <Button
              type="submit"
              isLoading={loading}
              className="w-full py-3 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-sm transition-all flex items-center justify-center gap-2 mt-2"
            >
              <span>Enter Site Terminal</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          {/* Sunlight & Field Advice */}
          <div className="pt-3 border-t border-slate-100 flex items-start gap-2 text-slate-500 text-[11px]">
            <Shield className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
            <span>
              Direct link access for field operations. High-contrast display tuned for direct sunlight readability.
            </span>
          </div>
        </div>
      </main>

      {/* Clean Footer */}
      <footer className="bg-white border-t border-slate-200 px-4 py-3 text-center text-xs text-slate-500">
        <div className="max-w-md mx-auto flex items-center justify-between text-[11px]">
          <span>&copy; 2026 Oil India Limited</span>
          <span className="font-mono text-slate-400">Field Portal</span>
        </div>
      </footer>
    </div>
  );
};
