import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from './authStore';
import { api } from '../api/client';
import { Button } from '../components/ui/Button';
import {
  BarChart3,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';

import { BrandLogo } from '../components/BrandLogo';

export const AdminLoginPage: React.FC = () => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();

  React.useEffect(() => {
    setUsername('');
    setPassword('');
    setError(null);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.login(username.trim(), password);
      setAuth(res.user, res.access_token);
      navigate('/planner/review');
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please verify admin credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col justify-between text-slate-800 font-sans antialiased bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200"
    >
      {/* Top Enterprise Corporate Header */}
      <header className="bg-white/95 backdrop-blur-xs border-b border-slate-200 px-6 py-4 sticky top-0 z-20 shadow-2xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <BrandLogo roleTag="ADMIN COCKPIT" tagColor="slate" size="md" />

          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-[#9e1218] animate-pulse" />
            <span>Secure Central Planner Gateway</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-xl p-6 sm:p-8 space-y-6">
          {/* Header & Role */}
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-red-50 text-[#9e1218] border border-red-200 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <h1 className="text-base font-black text-slate-900 tracking-tight">
                  Central Planner Sign-In
                </h1>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-red-50 text-[#9e1218] border border-red-200">
                ADMIN ACCESS
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Primavera P6 schedule control, automated event matching review, and contractor workload analytics.
            </p>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Authentication Notice:</strong> {error}
              </div>
            </div>
          )}

          {/* Input Form */}
          <form onSubmit={handleLogin} autoComplete="off" className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Email / Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  name="admin_work_identifier"
                  id="admin_work_identifier"
                  autoComplete="off"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="Enter administrator email or username"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#9e1218] transition-all shadow-2xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="admin_work_secret"
                  id="admin_work_secret"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter administrator password"
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#9e1218] transition-all shadow-2xs"
                />
                {/* Seen Eye Password Toggle */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              isLoading={loading}
              className="w-full py-2.5 text-xs font-bold rounded-xl bg-[#9e1218] hover:bg-[#a51016] text-white shadow-md shadow-red-950/20 transition-all flex items-center justify-center gap-2 mt-2"
            >
              <span>Sign In to Central Planner Cockpit</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          {/* Security & Access Notice */}
          <div className="pt-3 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-500">
              Restricted to authorized EPC planning managers, lead engineers, and schedule controllers.
            </p>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 px-6 py-4 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px]">
          <div>
            &copy; 2026 Oil India Limited
          </div>
          <div className="flex items-center gap-3 font-mono text-slate-400">
            <span>Zero-LocalStorage Security</span>
            <span>·</span>
            <span>Role-Enforced RBAC</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
