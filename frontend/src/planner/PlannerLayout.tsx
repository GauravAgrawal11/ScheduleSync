import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../auth/authStore';
import { useProjectStore } from './projectStore';
import { api } from '../api/client';
import {
  Layers,
  Inbox,
  CalendarRange,
  BarChart3,
  History,
  FolderKanban,
  LogOut,
  Building2,
  ChevronRight,
  ShieldCheck,
  Brain,
  Users,
  AlertOctagon,
  HardHat,
} from 'lucide-react';

export const PlannerLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const {
    selectedProjectId,
    selectedProjectActivityCount,
    setProject,
  } = useProjectStore();

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.getProjects(),
  });

  const { data: openComplaints = [] } = useQuery({
    queryKey: ['complaints-open-count', selectedProjectId],
    queryFn: () => api.getComplaints(selectedProjectId, 'OPEN'),
  });
  const openComplaintsCount = openComplaints.length;

  const { data: reviewQueue = [] } = useQuery({
    queryKey: ['review-queue'],
    queryFn: () => api.getReviewQueue(),
  });
  const queueCount = reviewQueue.length;

  const projects = projectsData?.projects || [
    {
      id: 1,
      name: 'Numaligarh Refinery Expansion (Unit 3 & Offsites)',
      client: 'Oil India Limited',
      activity_count: 36,
      status: 'RUNNING',
    },
  ];

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    const target = projects.find((p) => p.id === id);
    if (target) {
      setProject({
        id: target.id,
        name: target.name,
        client: target.client,
        activity_count: target.activity_count || (target.id === 1 ? 36 : 40),
      });
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    {
      to: '/planner/review',
      label: 'Review Queue (Hero Screen)',
      icon: Inbox,
      badge: queueCount > 0 ? `${queueCount} Pending` : undefined,
    },
    { to: '/planner/schedule', label: 'Schedule & Gantt', icon: CalendarRange },
    { to: '/planner/workload', label: 'Supervisor Workload', icon: Users },
    {
      to: '/planner/complaints',
      label: 'Field Blockers',
      icon: AlertOctagon,
      badge: openComplaintsCount > 0 ? `${openComplaintsCount} Open` : undefined,
    },
    { to: '/planner/analytics', label: 'Analytics Cockpit', icon: BarChart3 },
    { to: '/planner/historical', label: 'Institutional Memory (RAG)', icon: Brain, badge: 'New' },
    { to: '/planner/setup', label: 'Project Setup & Ingest', icon: FolderKanban },
    { to: '/planner/activities', label: 'Activity Audit Log', icon: History },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-900">
      {/* Top Cockpit Header */}
      <header className="bg-oil-950 text-white border-b border-oil-800 px-6 py-3 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-oil-800 border border-oil-600 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-base font-bold tracking-tight">ScheduleSync</span>
                <span className="text-[10px] text-emerald-400 font-mono ml-2 px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-800">
                  SIH26122
                </span>
              </div>
            </div>

            {/* Interactive Project Context Selector */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-oil-900 border border-oil-700 text-xs shadow-inner">
              <Building2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span className="text-slate-400 font-medium hidden lg:inline">Active Project:</span>
              <select
                aria-label="Active Project"
                value={selectedProjectId}
                onChange={handleProjectChange}
                className="bg-oil-950 text-white font-semibold text-xs rounded border border-oil-700 py-1 px-2 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer max-w-xs truncate"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.activity_count || (p.id === 1 ? 36 : 40)} Acts)
                  </option>
                ))}
              </select>
              <span className="hidden xl:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono whitespace-nowrap">
                {selectedProjectActivityCount || (selectedProjectId === 1 ? 36 : 40)} Activities
              </span>
            </div>
          </div>

          {/* User profile & logout */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <div className="text-xs font-semibold text-slate-200">
                {user?.name && !user.name.toLowerCase().includes('arun') ? user.name : 'Admin'}
              </div>
              <div className="text-[10px] text-slate-400">Admin · Oil India Ltd</div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-oil-900 hover:bg-rose-900/40 text-slate-300 hover:text-rose-300 border border-oil-800 transition-colors text-xs font-medium"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Subnav Navigation Tabs */}
        <div className="max-w-7xl mx-auto mt-3 flex gap-1 overflow-x-auto border-t border-oil-900 pt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-oil-800 text-white shadow-sm font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-oil-900'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-slate-950 font-bold ml-1">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="max-w-7xl mx-auto w-full flex-1 p-6 md:p-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white px-6 py-3 text-center text-xs text-slate-500">
        SIH26122 · Oil India Limited Progress-Linking Layer · Zero LocalStorage in-memory security
      </footer>
    </div>
  );
};
