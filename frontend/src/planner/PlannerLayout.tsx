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
  FolderKanban,
  LogOut,
  Building2,
  Brain,
  Users,
  AlertOctagon,
  ClipboardList,
} from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';

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
    { to: '/planner/schedule',    label: 'Gantt',          icon: CalendarRange },
    { to: '/planner/review',      label: 'Review Queue',   icon: Inbox,        badge: true },
    { to: '/planner/activities',  label: 'Activity Audit', icon: ClipboardList },
    { to: '/planner/analytics',   label: 'Analytics',      icon: Layers },
    { to: '/planner/complaints',  label: 'HSE & Blockers', icon: AlertOctagon, hseCount: true },
    { to: '/planner/workload',    label: 'Assignments',    icon: Users },
    { to: '/planner/historical',  label: 'Historical',     icon: Brain },
    { to: '/planner/setup',       label: 'Baseline Setup', icon: FolderKanban },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">

      {/* ── Single Compact Header Bar ── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center h-12 px-4 gap-0 w-full">

          {/* Brand */}
          <div className="flex items-center gap-2.5 flex-shrink-0 pr-4 border-r border-slate-200">
            <BrandLogo size="sm" inCard={false} />
          </div>

          {/* Project Selector */}
          <div className="flex items-center gap-2 px-4 flex-shrink-0 border-r border-slate-200">
            <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <select
              aria-label="Active Project"
              value={selectedProjectId}
              onChange={handleProjectChange}
              className="bg-transparent text-slate-800 font-medium text-xs rounded border-none py-0.5 focus:outline-none cursor-pointer max-w-[200px] truncate"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Nav Items — left-aligned */}
          <nav className="flex items-center gap-0.5 px-2 overflow-x-auto min-w-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `relative flex items-center gap-1.5 px-3 h-12 text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                      isActive
                        ? 'text-slate-900 font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-amber-500 after:rounded-t'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    }`
                  }
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{item.label}</span>
                  {item.badge && queueCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500 text-white font-bold ml-0.5 leading-none">
                      {queueCount}
                    </span>
                  )}
                  {item.hseCount && openComplaintsCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-bold ml-0.5 leading-none">
                      {openComplaintsCount}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* User + Logout — pushed to far right */}
          <div className="flex items-center gap-2 pl-3 border-l border-slate-200 flex-shrink-0 ml-auto">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-800 leading-none">
                {user?.name && !user.name.toLowerCase().includes('arun') ? user.name : 'Admin'}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">Lead Planner</span>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-transparent hover:border-rose-200 transition-all text-xs font-medium"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto w-full flex-1 p-5 md:p-7">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white px-6 py-3 text-center text-xs text-slate-400">
        © 2026 Oil India Limited · ScheduleSync Project Control Platform
      </footer>
    </div>
  );
};
