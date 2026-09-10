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
  ArrowRight,
  CheckCircle2,
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
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();

  // Sync state if defaultPortal changes or URL changes
  useEffect(() => {
    if (defaultPortal) {
      setActivePortal(defaultPortal);
    }
    // Guarantee input fields start clean without browser autofill
    setUsername('');
    setPassword('');
    setError(null);
  }, [defaultPortal]);

  const handlePortalSwitch = (portal: 'planner' | 'supervisor') => {
    setActivePortal(portal);
    setUsername('');
    setPassword('');
    setError(null);
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
            <span>Intranet Secure Channel</span>
          </div>
        </div>
      </header>

      {/* Main Authentication Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10 my-4">
        <div className="max-w-xl w-full">
          {/* Portal Selector Tabs */}
          <div className="bg-slate-900/90 border border-slate-800 p-1.5 rounded-2xl flex gap-1 mb-4 shadow-xl backdrop-blur-md">
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

            {/* Input Form */}
            <form onSubmit={handleLogin} autoComplete="off" className="space-y-4">
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
                    name="portal_user_identifier"
                    id="portal_user_identifier"
                    autoComplete="off"
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
                    name="portal_user_key"
                    id="portal_user_key"
                    autoComplete="new-password"
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
            <span>Enterprise Edition</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
