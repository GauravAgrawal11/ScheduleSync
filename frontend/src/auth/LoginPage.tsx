import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuthStore } from './authStore';
import { api } from '../api/client';
import { Button } from '../components/ui/Button';
import {
  ShieldCheck,
  HardHat,
  BarChart3,
  AlertCircle,
  Building2,
  Lock,
  Mail,
  KeyRound,
  ArrowRight,
  CheckCircle2,
  Wrench,
  Zap,
  Check,
  Radio,
  FileText,
  Clock,
  Flame,
} from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';

interface LoginPageProps {
  defaultPortal?: 'planner' | 'supervisor';
}

export const LoginPage: React.FC<LoginPageProps> = ({ defaultPortal }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryPortal = searchParams.get('portal');
  
  // Determine active portal: 'planner' | 'supervisor'
  const initialPortal =
    defaultPortal ||
    (queryPortal === 'supervisor' || window.location.pathname.includes('/supervisor')
      ? 'supervisor'
      : 'planner');

  const [activePortal, setActivePortal] = useState<'planner' | 'supervisor'>(initialPortal);

  // Form states
  const [username, setUsername] = useState(
    initialPortal === 'supervisor' ? 'piping.sup1@oilindia.in' : 'planner@oilindia.in'
  );
  const [password, setPassword] = useState(
    initialPortal === 'supervisor' ? 'SecureSupervisorPassword123!' : 'SecurePlannerPassword123!'
  );
  const [selectedDiscipline, setSelectedDiscipline] = useState<'PIPING' | 'CIVIL' | 'ELECTRICAL'>('PIPING');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();

  // Sync state if defaultPortal changes or URL changes
  useEffect(() => {
    if (defaultPortal) {
      setActivePortal(defaultPortal);
      if (defaultPortal === 'supervisor') {
        setUsername('piping.sup1@oilindia.in');
        setPassword('SecureSupervisorPassword123!');
      } else {
        setUsername('planner@oilindia.in');
        setPassword('SecurePlannerPassword123!');
      }
    }
  }, [defaultPortal]);

  const handlePortalSwitch = (portal: 'planner' | 'supervisor') => {
    setActivePortal(portal);
    setError(null);
    if (portal === 'planner') {
      setUsername('planner@oilindia.in');
      setPassword('SecurePlannerPassword123!');
    } else {
      setUsername('piping.sup1@oilindia.in');
      setPassword('SecureSupervisorPassword123!');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.login(username.trim(), password);
      setAuth(res.user, res.access_token);

      // Strict role redirection
      if (res.user.role === 'supervisor') {
        navigate('/supervisor');
      } else {
        navigate('/planner/review');
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please verify credentials.');
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
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between text-slate-100 relative overflow-hidden font-sans">
      {/* Background industrial refinery grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-oil-800/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-900/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Enterprise Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-6 py-3.5 z-20">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <BrandLogo roleTag="GATEWAY" inCard={true} size="sm" />

          <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Intranet Secure Channel · SIH26122</span>
          </div>
        </div>
      </header>

      {/* Main Authentication Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10 my-4">
        <div className="max-w-xl w-full">
          {/* Dual Portal Selector Tabs */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-1.5 shadow-2xl mb-4 flex gap-1.5">
            <button
              type="button"
              onClick={() => handlePortalSwitch('planner')}
              className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2.5 ${
                activePortal === 'planner'
                  ? 'bg-slate-800 text-white shadow-lg border border-slate-700/80 text-emerald-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <div className={`w-5 h-5 rounded-md flex items-center justify-center ${activePortal === 'planner' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                <BarChart3 className="w-3.5 h-3.5" />
              </div>
              <div className="text-left">
                <div className="font-bold text-xs leading-tight">Central Planner Cockpit</div>
                <div className="text-[10px] text-slate-400 font-normal">Engineering, Schedule & Workload</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handlePortalSwitch('supervisor')}
              className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2.5 ${
                activePortal === 'supervisor'
                  ? 'bg-slate-800 text-white shadow-lg border border-slate-700/80 text-amber-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <div className={`w-5 h-5 rounded-md flex items-center justify-center ${activePortal === 'supervisor' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>
                <HardHat className="w-3.5 h-3.5" />
              </div>
              <div className="text-left">
                <div className="font-bold text-xs leading-tight">Field Supervisor Terminal</div>
                <div className="text-[10px] text-slate-400 font-normal">Site Progress & Blockers</div>
              </div>
            </button>
          </div>

          {/* Authentication Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-5">
            {/* Context Badge */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${activePortal === 'planner' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  <h2 className="text-base font-bold text-white tracking-tight">
                    {activePortal === 'planner' ? 'Central Engineering & Planning Login' : 'Field Operations Site Terminal Sign-In'}
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {activePortal === 'planner'
                    ? 'Authorized EPC Planners, Lead Engineers, and Project Administrators.'
                    : 'Discipline Site Supervisors (Piping, Civil, Electrical). Restricted site access.'}
                </p>
              </div>

              <span className="hidden sm:inline-flex px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-slate-800/80 text-slate-300 border border-slate-700">
                {activePortal === 'planner' ? 'ROLE: PLANNER / ADMIN' : 'ROLE: SUPERVISOR'}
              </span>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-xs text-rose-200 flex items-start gap-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">Authentication Notice:</strong> {error}
                </div>
              </div>
            )}

            {/* Pre-Configured Official Credentials Selector */}
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                  Click to Auto-Fill Verified Demo Credentials:
                </span>
                <span className="text-[10px] text-slate-500 font-mono">1-Click Fill</span>
              </div>

              {activePortal === 'planner' ? (
                /* Planner Persona */
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => setCredential('planner@oilindia.in', 'SecurePlannerPassword123!')}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                      username === 'planner@oilindia.in'
                        ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-300 ring-1 ring-emerald-500/30'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                        AD
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          Admin
                          {username === 'planner@oilindia.in' && (
                            <span className="text-[10px] text-emerald-400 font-mono font-bold">Selected</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">planner@oilindia.in</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      Full Access
                    </span>
                  </button>
                </div>
              ) : (
                /* Supervisor Personas by Discipline */
                <div className="space-y-2.5">
                  {/* Discipline Tabs */}
                  <div className="grid grid-cols-3 gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setSelectedDiscipline('PIPING')}
                      className={`py-1 text-[11px] font-bold rounded-md transition-all flex items-center justify-center gap-1 ${
                        selectedDiscipline === 'PIPING'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Wrench className="w-3 h-3" /> Piping
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedDiscipline('CIVIL')}
                      className={`py-1 text-[11px] font-bold rounded-md transition-all flex items-center justify-center gap-1 ${
                        selectedDiscipline === 'CIVIL'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <HardHat className="w-3 h-3" /> Civil
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedDiscipline('ELECTRICAL')}
                      className={`py-1 text-[11px] font-bold rounded-md transition-all flex items-center justify-center gap-1 ${
                        selectedDiscipline === 'ELECTRICAL'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Zap className="w-3 h-3" /> Electrical
                    </button>
                  </div>

                  {/* Supervisor 1 & 2 Cards for Selected Discipline */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedDiscipline === 'PIPING' && (
                      <>
                        <button
                          type="button"
                          onClick={() => setCredential('piping.sup1@oilindia.in', 'SecureSupervisorPassword123!')}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            username === 'piping.sup1@oilindia.in'
                              ? 'bg-amber-950/40 border-amber-500/60 text-amber-300 ring-1 ring-amber-500/30'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div className="text-xs font-bold text-white flex items-center justify-between">
                            <span>Supervisor 1 - Piping</span>
                            {username === 'piping.sup1@oilindia.in' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">piping.sup1@oilindia.in</div>
                          <div className="text-[10px] text-amber-400/80 mt-1">Biren Das · Piping Scope</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setCredential('piping.sup2@oilindia.in', 'SecureSupervisorPassword123!')}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            username === 'piping.sup2@oilindia.in'
                              ? 'bg-amber-950/40 border-amber-500/60 text-amber-300 ring-1 ring-amber-500/30'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div className="text-xs font-bold text-white flex items-center justify-between">
                            <span>Supervisor 2 - Piping</span>
                            {username === 'piping.sup2@oilindia.in' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">piping.sup2@oilindia.in</div>
                          <div className="text-[10px] text-amber-400/80 mt-1">Dipak Kalita · Piping Scope</div>
                        </button>
                      </>
                    )}

                    {selectedDiscipline === 'CIVIL' && (
                      <>
                        <button
                          type="button"
                          onClick={() => setCredential('supervisor@oilindia.in', 'SecureSupervisorPassword123!')}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            username === 'supervisor@oilindia.in'
                              ? 'bg-blue-950/40 border-blue-500/60 text-blue-300 ring-1 ring-blue-500/30'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div className="text-xs font-bold text-white flex items-center justify-between">
                            <span>Supervisor 1 - Civil</span>
                            {username === 'supervisor@oilindia.in' && <Check className="w-3.5 h-3.5 text-blue-400" />}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">supervisor@oilindia.in</div>
                          <div className="text-[10px] text-blue-400/80 mt-1">Sanjay Supervisor · Civil Scope</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setCredential('civil.sup2@oilindia.in', 'SecureSupervisorPassword123!')}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            username === 'civil.sup2@oilindia.in'
                              ? 'bg-blue-950/40 border-blue-500/60 text-blue-300 ring-1 ring-blue-500/30'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div className="text-xs font-bold text-white flex items-center justify-between">
                            <span>Supervisor 2 - Civil</span>
                            {username === 'civil.sup2@oilindia.in' && <Check className="w-3.5 h-3.5 text-blue-400" />}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">civil.sup2@oilindia.in</div>
                          <div className="text-[10px] text-blue-400/80 mt-1">Manoj Bora · Civil Scope</div>
                        </button>
                      </>
                    )}

                    {selectedDiscipline === 'ELECTRICAL' && (
                      <>
                        <button
                          type="button"
                          onClick={() => setCredential('electrical.sup1@oilindia.in', 'SecureSupervisorPassword123!')}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            username === 'electrical.sup1@oilindia.in'
                              ? 'bg-purple-950/40 border-purple-500/60 text-purple-300 ring-1 ring-purple-500/30'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div className="text-xs font-bold text-white flex items-center justify-between">
                            <span>Supervisor 1 - Electrical</span>
                            {username === 'electrical.sup1@oilindia.in' && <Check className="w-3.5 h-3.5 text-purple-400" />}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">electrical.sup1@oilindia.in</div>
                          <div className="text-[10px] text-purple-400/80 mt-1">Rajesh Das · Substation Scope</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setCredential('electrical.sup2@oilindia.in', 'SecureSupervisorPassword123!')}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            username === 'electrical.sup2@oilindia.in'
                              ? 'bg-purple-950/40 border-purple-500/60 text-purple-300 ring-1 ring-purple-500/30'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div className="text-xs font-bold text-white flex items-center justify-between">
                            <span>Supervisor 2 - Electrical</span>
                            {username === 'electrical.sup2@oilindia.in' && <Check className="w-3.5 h-3.5 text-purple-400" />}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">electrical.sup2@oilindia.in</div>
                          <div className="text-[10px] text-purple-400/80 mt-1">Kiran Saikia · Electrical Scope</div>
                        </button>
                      </>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 text-center font-mono">
                    Common Password: <span className="text-amber-300 font-bold">SecureSupervisorPassword123!</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>{activePortal === 'planner' ? 'Planner Enterprise User ID' : 'Site Supervisor Email / ID'}</span>
                  <span className="text-[10px] text-slate-500 font-mono">@oilindia.in</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    placeholder="name@oilindia.in"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>Security Password</span>
                  <span className="text-[10px] text-slate-500 font-mono">Encrypted</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter security password"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>

              <Button
                type="submit"
                isLoading={loading}
                className={`w-full py-3 text-xs font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                  activePortal === 'planner'
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-900/30'
                }`}
              >
                <span>{activePortal === 'planner' ? 'Sign In to Central Planner Cockpit' : 'Sign In to Site Mobile Terminal'}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>

            {/* Role Notice */}
            <div className="pt-2 border-t border-slate-800 text-center">
              <p className="text-[11px] text-slate-400">
                {activePortal === 'planner' ? (
                  <>
                    Central Planners &amp; Admins can access and inspect individual field supervisor portals without credentials directly from the Cockpit.
                  </>
                ) : (
                  <>
                    Field Site Supervisors are strictly restricted to the mobile operations terminal and cannot access administrative planning modules.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer with refinery credentials and security declaration */}
      <footer className="border-t border-slate-900 bg-slate-950 px-6 py-4 text-center text-xs text-slate-500 z-10">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            &copy; 2026 Oil India Limited · Numaligarh Refinery Expansion (Unit 3 &amp; Offsites)
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
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
