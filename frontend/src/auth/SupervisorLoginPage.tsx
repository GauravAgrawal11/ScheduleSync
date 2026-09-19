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
  Eye,
  EyeOff,
  ExternalLink,
} from 'lucide-react';
import { InstallAppBanner } from '../supervisor/offline/InstallAppBanner';
import { BrandLogo } from '../components/BrandLogo';

export const SupervisorLoginPage: React.FC = () => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const { isAuthenticated, user, setAuth } = useAuthStore();
  const navigate = useNavigate();

  // If already authenticated, redirect straight to supervisor portal without re-login
  React.useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'supervisor') {
        navigate('/supervisor', { replace: true });
      } else {
        navigate('/planner/review', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  // Guarantee fields are completely blank and not auto-filled on mount
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
      navigate('/supervisor');
    } catch (err: any) {
      setError(err?.message || 'Invalid supervisor credentials. Please check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col justify-between text-slate-800 font-sans antialiased bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200"
    >
      {/* Top Header: High-contrast white bar */}
      <header className="bg-white/95 backdrop-blur-xs border-b border-slate-200 px-4 sm:px-5 py-3 sticky top-0 z-20 shadow-xs">
        <div className="max-w-md mx-auto flex items-center justify-between gap-2">
          <BrandLogo roleTag="FIELD" tagColor="slate" size="sm" />

          <div className="flex items-center gap-2">
            <a
              href="/admin/login"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-slate-900 hover:bg-slate-800 text-white transition-all shadow-2xs group"
              title="Open Central Admin / Planner Cockpit in a separate browser window"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Admin Cockpit</span>
              <ExternalLink className="w-3 h-3 text-slate-300 group-hover:translate-x-0.5 transition-transform" />
            </a>

            <div className="flex items-center gap-1 text-[10px] font-mono text-red-700 bg-red-50 px-2 py-0.5 rounded-md border border-red-200 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#9e1218] animate-pulse" />
              <span>Site</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content: Mobile-First Card */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 space-y-3">
        {/* Dual Independent Portals Launcher */}
        <div className="max-w-md w-full bg-white/95 border border-slate-200 rounded-2xl p-3.5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span className="flex items-center gap-1.5 text-slate-900 font-extrabold">
              <ExternalLink className="w-4 h-4 text-[#9e1218]" />
              Independent Portals (Open in New Tab)
            </span>
            <span className="text-[10px] uppercase font-bold text-[#9e1218] bg-red-50 border border-red-200 px-2 py-0.5 rounded-full font-mono">
              Separate Windows
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <a
              href="/supervisor/login"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-950 transition-all shadow-xs group cursor-pointer text-center"
              title="Open Field Supervisor PWA Portal in a separate browser window"
            >
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
              <span>👷 Supervisor Portal</span>
              <ExternalLink className="w-3 h-3 text-amber-700 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
            </a>
            <a
              href="/admin/login"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white transition-all shadow-xs group cursor-pointer text-center"
              title="Open Central Admin / Planner Cockpit in a separate browser window"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
              <span>👔 Admin Cockpit</span>
              <ExternalLink className="w-3 h-3 text-slate-300 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
            </a>
          </div>
        </div>

        <div className="max-w-md w-full">
          <InstallAppBanner />
        </div>

        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-xl p-6 space-y-5">
          {/* Terminal Title & Brief Context */}
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between">
              <h1 className="text-base font-black text-slate-900 tracking-tight">
                Supervisor Sign-In
              </h1>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-red-50 text-[#9e1218] border border-red-200">
                DIRECT FIELD PORTAL
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
          <form onSubmit={handleLogin} autoComplete="off" className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Supervisor Email ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  name="supervisor_work_email"
                  id="supervisor_work_email"
                  autoComplete="off"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="Enter supervisor email or username"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#9e1218] transition-all shadow-2xs"
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
                  type={showPassword ? 'text' : 'password'}
                  name="supervisor_work_key"
                  id="supervisor_work_key"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter supervisor password"
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
              className="w-full py-3 text-xs font-bold rounded-xl bg-[#9e1218] hover:bg-[#a51016] text-white shadow-md shadow-red-950/20 transition-all flex items-center justify-center gap-2 mt-2"
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
