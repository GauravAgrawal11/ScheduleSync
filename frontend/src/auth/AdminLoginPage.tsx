import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from './authStore';
import { api } from '../api/client';
import { Button } from '../components/ui/Button';
import {
  ShieldCheck,
  BarChart3,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';

export const AdminLoginPage: React.FC = () => {
  const [username, setUsername] = useState<string>('planner@oilindia.in');
  const [password, setPassword] = useState<string>('SecurePlannerPassword123!');
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
      navigate('/planner/review');
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please verify admin credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = () => {
    setUsername('planner@oilindia.in');
    setPassword('SecurePlannerPassword123!');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-800 font-sans antialiased">
      {/* Top Enterprise Corporate Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-20 shadow-2xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black tracking-tight text-slate-900">OIL INDIA LIMITED</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  NRL Unit 3 &amp; Offsites
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Central Engineering &amp; Project ScheduleSync Cockpit
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Secure Central Planner Gateway</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
          {/* Header & Role */}
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <BarChart3 className="w-3.5 h-3.5" />
                </div>
                <h1 className="text-base font-bold text-slate-900 tracking-tight">
                  Central Planner Sign-In
                </h1>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
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

          {/* 1-Click Quick Login for Admin */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                Verified Admin Credentials:
              </span>
              <span className="text-[10px] font-mono text-slate-400">1-Click Fill</span>
            </div>

            <button
              type="button"
              onClick={handleQuickFill}
              className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                username === 'planner@oilindia.in'
                  ? 'bg-white border-emerald-500 text-slate-900 shadow-2xs ring-1 ring-emerald-500/20'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                  AD
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    Admin
                    {username === 'planner@oilindia.in' && (
                      <span className="text-[10px] text-emerald-700 font-mono font-bold">Selected</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">planner@oilindia.in</div>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                Full Cockpit
              </span>
            </button>
          </div>

          {/* Input Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span>Enterprise User ID / Email</span>
                <span className="text-[10px] text-slate-400 font-mono">@oilindia.in</span>
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
                  placeholder="planner@oilindia.in"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all shadow-2xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span>Password</span>
                <span className="text-[10px] text-slate-400 font-mono">Encrypted</span>
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
                  placeholder="Enter administrator password"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all shadow-2xs"
                />
              </div>
            </div>

            <Button
              type="submit"
              isLoading={loading}
              className="w-full py-2.5 text-xs font-bold rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm transition-all flex items-center justify-center gap-2 mt-2"
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

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 px-6 py-4 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px]">
          <div>
            &copy; 2026 Oil India Limited · Numaligarh Refinery Expansion (Unit 3 &amp; Offsites)
          </div>
          <div className="flex items-center gap-3 font-mono text-slate-400">
            <span>Zero-LocalStorage Security</span>
            <span>·</span>
            <span>Role-Enforced RBAC</span>
            <span>·</span>
            <span>SIH26122</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
