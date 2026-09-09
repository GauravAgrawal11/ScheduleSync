import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from './authStore';
import { api } from '../api/client';
import { Button } from '../components/ui/Button';
import {
  HardHat,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Wrench,
  Zap,
  Check,
  Building,
  Shield,
  Smartphone,
} from 'lucide-react';
import { InstallAppBanner } from '../supervisor/offline/InstallAppBanner';

export const SupervisorLoginPage: React.FC = () => {
  const [username, setUsername] = useState<string>('piping.sup1@oilindia.in');
  const [password, setPassword] = useState<string>('SecureSupervisorPassword123!');
  const [selectedDiscipline, setSelectedDiscipline] = useState<'PIPING' | 'CIVIL' | 'ELECTRICAL'>('PIPING');
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

  const setCredential = (email: string, pass: string) => {
    setUsername(email);
    setPassword(pass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between text-slate-800 font-sans antialiased">
      {/* Top Header: High-contrast white bar */}
      <header className="bg-white border-b border-slate-200 px-5 py-3.5 sticky top-0 z-20 shadow-xs">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 font-bold">
              <HardHat className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                <span>OIL INDIA LIMITED</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold border border-amber-200">
                  NRL Unit 3
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-none mt-0.5">
                Field Operations · Site Mobile Terminal
              </p>
            </div>
          </div>

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
              Log daily progress, inspect site drawings, and report blockers for Numaligarh Refinery expansion.
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

          {/* Quick Select Pre-Assigned Supervisor Personas */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-amber-600" />
                Select Your Discipline:
              </span>
              <span className="text-[10px] font-mono text-slate-400">1-Tap Select</span>
            </div>

            {/* Discipline Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setSelectedDiscipline('PIPING')}
                className={`py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                  selectedDiscipline === 'PIPING'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" /> Piping
              </button>
              <button
                type="button"
                onClick={() => setSelectedDiscipline('CIVIL')}
                className={`py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                  selectedDiscipline === 'CIVIL'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Building className="w-3.5 h-3.5" /> Civil
              </button>
              <button
                type="button"
                onClick={() => setSelectedDiscipline('ELECTRICAL')}
                className={`py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                  selectedDiscipline === 'ELECTRICAL'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Zap className="w-3.5 h-3.5" /> Electrical
              </button>
            </div>

            {/* Supervisor Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {selectedDiscipline === 'PIPING' && (
                <>
                  <button
                    type="button"
                    onClick={() => setCredential('piping.sup1@oilindia.in', 'SecureSupervisorPassword123!')}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      username === 'piping.sup1@oilindia.in'
                        ? 'bg-amber-50/80 border-amber-400 text-slate-900 ring-1 ring-amber-400/50'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                      <span>Supervisor 1 - Piping</span>
                      {username === 'piping.sup1@oilindia.in' && <Check className="w-3.5 h-3.5 text-amber-600" />}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">piping.sup1@oilindia.in</div>
                    <div className="text-[10px] text-amber-700 font-medium mt-1">Biren Das · Piping Scope</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCredential('piping.sup2@oilindia.in', 'SecureSupervisorPassword123!')}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      username === 'piping.sup2@oilindia.in'
                        ? 'bg-amber-50/80 border-amber-400 text-slate-900 ring-1 ring-amber-400/50'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                      <span>Supervisor 2 - Piping</span>
                      {username === 'piping.sup2@oilindia.in' && <Check className="w-3.5 h-3.5 text-amber-600" />}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">piping.sup2@oilindia.in</div>
                    <div className="text-[10px] text-amber-700 font-medium mt-1">Dipak Kalita · Piping Scope</div>
                  </button>
                </>
              )}

              {selectedDiscipline === 'CIVIL' && (
                <>
                  <button
                    type="button"
                    onClick={() => setCredential('supervisor@oilindia.in', 'SecureSupervisorPassword123!')}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      username === 'supervisor@oilindia.in'
                        ? 'bg-blue-50/80 border-blue-400 text-slate-900 ring-1 ring-blue-400/50'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                      <span>Supervisor 1 - Civil</span>
                      {username === 'supervisor@oilindia.in' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">supervisor@oilindia.in</div>
                    <div className="text-[10px] text-blue-700 font-medium mt-1">Sanjay Supervisor · Civil</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCredential('civil.sup2@oilindia.in', 'SecureSupervisorPassword123!')}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      username === 'civil.sup2@oilindia.in'
                        ? 'bg-blue-50/80 border-blue-400 text-slate-900 ring-1 ring-blue-400/50'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                      <span>Supervisor 2 - Civil</span>
                      {username === 'civil.sup2@oilindia.in' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">civil.sup2@oilindia.in</div>
                    <div className="text-[10px] text-blue-700 font-medium mt-1">Manoj Bora · Civil</div>
                  </button>
                </>
              )}

              {selectedDiscipline === 'ELECTRICAL' && (
                <>
                  <button
                    type="button"
                    onClick={() => setCredential('electrical.sup1@oilindia.in', 'SecureSupervisorPassword123!')}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      username === 'electrical.sup1@oilindia.in'
                        ? 'bg-purple-50/80 border-purple-400 text-slate-900 ring-1 ring-purple-400/50'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                      <span>Supervisor 1 - Electrical</span>
                      {username === 'electrical.sup1@oilindia.in' && <Check className="w-3.5 h-3.5 text-purple-600" />}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">electrical.sup1@oilindia.in</div>
                    <div className="text-[10px] text-purple-700 font-medium mt-1">Rajesh Das · Substation</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCredential('electrical.sup2@oilindia.in', 'SecureSupervisorPassword123!')}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      username === 'electrical.sup2@oilindia.in'
                        ? 'bg-purple-50/80 border-purple-400 text-slate-900 ring-1 ring-purple-400/50'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                      <span>Supervisor 2 - Electrical</span>
                      {username === 'electrical.sup2@oilindia.in' && <Check className="w-3.5 h-3.5 text-purple-600" />}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">electrical.sup2@oilindia.in</div>
                    <div className="text-[10px] text-purple-700 font-medium mt-1">Kiran Saikia · Substation</div>
                  </button>
                </>
              )}
            </div>
          </div>

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
          <span className="font-mono text-slate-400">Numaligarh Field Link</span>
        </div>
      </footer>
    </div>
  );
};
