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
  User,
  UserPlus,
  CheckCircle2,
  Briefcase,
  Layers,
} from 'lucide-react';

import { BrandLogo } from '../components/BrandLogo';

export const AdminLoginPage: React.FC = () => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Login states
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Register states
  const [regName, setRegName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regRole, setRegRole] = useState<'planner' | 'admin' | 'supervisor'>('planner');
  const [regDiscipline, setRegDiscipline] = useState<string>('Piping');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regConfirmPassword, setRegConfirmPassword] = useState<string>('');
  const [regSuccessMsg, setRegSuccessMsg] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();

  React.useEffect(() => {
    setUsername('');
    setPassword('');
    setError(null);
  }, [authMode]);

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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setRegSuccessMsg(null);

    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    setLoading(true);
    try {
      await api.registerUser({
        name: regName.trim(),
        email: regEmail.trim().toLowerCase(),
        password: regPassword,
        role: regRole,
        discipline: regDiscipline,
      });

      // Auto login after successful registration
      try {
        const loginRes = await api.login(regEmail.trim().toLowerCase(), regPassword);
        setAuth(loginRes.user, loginRes.access_token);
        navigate(regRole === 'supervisor' ? '/supervisor' : '/planner/review');
      } catch {
        setRegSuccessMsg(`Account registered successfully for ${regName}! You can now sign in.`);
        setAuthMode('login');
        setUsername(regEmail.trim().toLowerCase());
      }
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Email may already be registered.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col justify-between text-slate-800 font-sans antialiased bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200"
    >
      {/* Top Enterprise Corporate Header */}
      <header className="bg-white/95 backdrop-blur-xs border-b border-slate-200 px-4 sm:px-6 py-3.5 sticky top-0 z-20 shadow-2xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <BrandLogo roleTag="ADMIN COCKPIT" tagColor="slate" size="md" />

          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-[#9e1218] animate-pulse" />
            <span>Secure Central Planner Gateway</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-xl p-6 sm:p-8 space-y-5">

          {/* Mode Switcher Tabs */}
          <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => { setAuthMode('login'); setError(null); }}
              className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                authMode === 'login'
                  ? 'bg-[#9e1218] text-white shadow-sm shadow-red-950/30'
                  : 'text-slate-600 hover:text-[#9e1218] hover:bg-red-50/70'
              }`}
            >
              <BarChart3 className={`w-3.5 h-3.5 ${authMode === 'login' ? 'text-white' : 'text-[#9e1218]'}`} />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('register'); setError(null); }}
              className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                authMode === 'register'
                  ? 'bg-[#9e1218] text-white shadow-sm shadow-red-950/30'
                  : 'text-slate-600 hover:text-[#9e1218] hover:bg-red-50/70'
              }`}
            >
              <UserPlus className={`w-3.5 h-3.5 ${authMode === 'register' ? 'text-white' : 'text-[#9e1218]'}`} />
              <span>Register Account</span>
            </button>
          </div>

          {/* Header & Role Info */}
          <div className="border-b border-slate-100 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-red-50 text-[#9e1218] border border-red-200 flex items-center justify-center">
                  {authMode === 'login' ? <BarChart3 className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                </div>
                <h1 className="text-base font-black text-slate-900 tracking-tight">
                  {authMode === 'login' ? 'Central Planner Sign-In' : 'Register New Team Member'}
                </h1>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-red-50 text-[#9e1218] border border-red-200">
                {authMode === 'login' ? 'ADMIN ACCESS' : 'NEW REGISTRATION'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {authMode === 'login'
                ? 'Primavera P6 schedule control, automated event matching review, and contractor workload analytics.'
                : 'Register EPC planners, lead engineers, or site supervisors with discipline allocation.'}
            </p>
          </div>

          {/* Success Notification */}
          {regSuccessMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>{regSuccessMsg}</div>
            </div>
          )}

          {/* Error Notice */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Notice:</strong> {error}
              </div>
            </div>
          )}

          {/* SIGN IN FORM */}
          {authMode === 'login' ? (
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
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#9e1218] caret-[#9e1218] transition-all shadow-2xs"
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
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#9e1218] caret-[#9e1218] transition-all shadow-2xs"
                  />
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
          ) : (
            /* REGISTER NEW USER FORM */
            <form onSubmit={handleRegister} autoComplete="off" className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    required
                    placeholder="e.g. Ramesh Kalita"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#9e1218] caret-[#9e1218] transition-all shadow-2xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Work Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    required
                    placeholder="name@oilindia.in"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#9e1218] caret-[#9e1218] transition-all shadow-2xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Assigned Role
                  </label>
                  <div className="relative">
                    <select
                      value={regRole}
                      onChange={(e) => setRegRole(e.target.value as any)}
                      className="w-full px-2.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#9e1218] transition-all shadow-2xs"
                    >
                      <option value="planner">Central Planner</option>
                      <option value="admin">Lead Admin</option>
                      <option value="supervisor">Field Supervisor</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Discipline
                  </label>
                  <div className="relative">
                    <select
                      value={regDiscipline}
                      onChange={(e) => setRegDiscipline(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#9e1218] transition-all shadow-2xs"
                    >
                      <option value="Piping">Piping</option>
                      <option value="Civil">Civil</option>
                      <option value="Electrical">Electrical</option>
                      <option value="Mechanical">Mechanical</option>
                      <option value="Instrumentation">Instrumentation</option>
                      <option value="Planning">General / Planning</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Password (min 6)
                  </label>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#9e1218] transition-all shadow-2xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#9e1218] transition-all shadow-2xs"
                  />
                </div>
              </div>

              <Button
                type="submit"
                isLoading={loading}
                className="w-full py-2.5 text-xs font-bold rounded-xl bg-[#9e1218] hover:bg-[#a51016] text-white shadow-md shadow-red-950/20 transition-all flex items-center justify-center gap-2 mt-2"
              >
                <span>Complete Registration &amp; Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          )}

          {/* Toggle footer link */}
          <div className="pt-2 border-t border-slate-100 text-center">
            {authMode === 'login' ? (
              <p className="text-xs text-slate-500">
                New administrator or supervisor?{' '}
                <button
                  type="button"
                  onClick={() => { setAuthMode('register'); setError(null); }}
                  className="font-bold text-[#9e1218] hover:underline cursor-pointer"
                >
                  Register an account
                </button>
              </p>
            ) : (
              <p className="text-xs text-slate-500">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => { setAuthMode('login'); setError(null); }}
                  className="font-bold text-[#9e1218] hover:underline cursor-pointer"
                >
                  Sign in here
                </button>
              </p>
            )}
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 px-4 sm:px-6 py-3.5 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px]">
          <div>
            &copy; 2026 Oil India Limited. All rights reserved.
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
