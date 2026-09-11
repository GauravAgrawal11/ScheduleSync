import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
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
  FileDown,
  Home,
  BarChart3,
  ShieldAlert,
  Clock,
  FileText,
  Sparkles,
  Settings,
  MoreHorizontal,
  ChevronDown,
  Bell,
  CheckCircle2,
} from 'lucide-react';
import { WorkflowReportModal } from './WorkflowReportModal';

export const PlannerLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    selectedProjectId,
    selectedProjectName,
    selectedProjectActivityCount,
    setProject,
  } = useProjectStore();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);

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
        activity_count: target.activity_count ?? 0,
      });
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Nav items matching the reference design in Image 1 & 4
  const navItems = [
    { to: '/planner/review',     label: 'Dashboard',      icon: Home,           exact: true },
    { to: '/planner/schedule',   label: 'Gantt',          icon: CalendarRange },
    { to: '/planner/review',     label: 'Review Queue',   icon: Inbox,          badge: true, count: queueCount },
    { to: '/planner/activities', label: 'Activity Audit', icon: ClipboardList },
    { to: '/planner/analytics',  label: 'Analytics',      icon: BarChart3 },
    { to: '/planner/complaints', label: 'HSE & Blockers', icon: ShieldAlert,    hseCount: true, count: openComplaintsCount },
    { to: '/planner/workload',   label: 'Assignments',    icon: Users },
    { to: '/planner/historical', label: 'History',        icon: Clock },
    {
      to: '#reports',
      label: 'Reports',
      icon: FileText,
      hasDropdown: true,
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        setIsReportModalOpen(true);
      },
    },
    { to: '/planner/review',     label: 'AI Verification',icon: Sparkles,      hasDropdown: true },
    { to: '/planner/setup',      label: 'Settings',       icon: Settings,      hasDropdown: true },
  ];

  return (
    <div className="min-h-screen bg-slate-900 flex text-slate-900 font-sans antialiased overflow-x-hidden">

      {/* ── Left Vertical Dark Sidebar (Matches uploaded theme Image 1 & 4) ── */}
      <aside
        className={`bg-[#0a0b0e] text-slate-300 flex flex-col flex-shrink-0 z-40 border-r border-slate-800/80 transition-all duration-300 ease-in-out select-none ${
          isSidebarCollapsed ? 'w-16' : 'w-64'
        } min-h-screen fixed lg:static top-0 bottom-0 left-0`}
      >
        {/* Top Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800/60 flex-shrink-0">
          {!isSidebarCollapsed ? (
            <div className="flex items-center gap-2.5 overflow-hidden">
              {/* Oil India emblem */}
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center p-1 border border-red-600/40 flex-shrink-0">
                <img
                  src="/logo.png"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/pumpjack-badge.png'; }}
                  alt="Oil India Limited"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[10px] text-slate-300 font-semibold leading-tight font-hindi">
                  ऑयल इंडिया लिमिटेड
                </span>
                <span className="text-[11px] font-black tracking-wider text-white uppercase leading-none mt-0.5">
                  OIL INDIA LIMITED
                </span>
              </div>
            </div>
          ) : (
            <div className="w-full flex justify-center">
              <img
                src="/logo.png"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/pumpjack-badge.png'; }}
                alt="Oil India Limited"
                className="w-8 h-8 object-contain rounded-full bg-white/10 p-1"
                title="OIL INDIA LIMITED"
              />
            </div>
          )}
        </div>

        {/* Navigation items */}
        <nav className="flex-1 py-4 px-2.5 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isSelected = item.to.startsWith('/') && location.pathname === item.to;

            const content = (
              <div
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 relative group cursor-pointer ${
                  isSelected
                    ? 'bg-[#c5161d] text-white shadow-md shadow-red-950/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                } ${isSidebarCollapsed ? 'justify-center px-2' : ''}`}
                title={isSidebarCollapsed ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />

                {!isSidebarCollapsed && (
                  <>
                    <span className="truncate flex-1">{item.label}</span>

                    {/* Badge Count */}
                    {item.badge && item.count !== undefined && item.count > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-red-600 border border-red-500 text-white font-bold leading-none ml-auto">
                        {item.count}
                      </span>
                    )}

                    {item.hseCount && item.count !== undefined && item.count > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-600 text-white font-bold leading-none ml-auto">
                        {item.count}
                      </span>
                    )}

                    {item.hasDropdown && (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500 ml-auto flex-shrink-0" />
                    )}
                  </>
                )}

                {/* Tooltip on collapsed */}
                {isSidebarCollapsed && (
                  <div className="absolute left-full ml-2 px-2.5 py-1 bg-slate-900 text-white text-[11px] rounded shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 border border-slate-700">
                    {item.label}
                    {item.count !== undefined && item.count > 0 && ` (${item.count})`}
                  </div>
                )}
              </div>
            );

            if (item.onClick) {
              return (
                <button
                  key={index}
                  onClick={item.onClick}
                  className="w-full text-left"
                >
                  {content}
                </button>
              );
            }

            return (
              <NavLink key={index} to={item.to} end={item.exact}>
                {content}
              </NavLink>
            );
          })}

          {/* Sign Out Button */}
          <div className="pt-3 border-t border-slate-800/80 mt-2">
            <button
              onClick={handleLogout}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-red-400 hover:bg-red-950/20 transition-all cursor-pointer group ${
                isSidebarCollapsed ? 'justify-center px-2' : ''
              }`}
              title="Sign Out"
            >
              <LogOut className="w-4 h-4 flex-shrink-0 group-hover:text-red-400 text-slate-400" />
              {!isSidebarCollapsed && <span>Sign Out</span>}
            </button>
          </div>
        </nav>

        {/* Sidebar Footer: Energy For a Stronger Tomorrow */}
        {!isSidebarCollapsed && (
          <div className="p-4 border-t border-slate-800/60 bg-gradient-to-t from-black/80 to-transparent relative overflow-hidden flex-shrink-0">
            <div className="flex items-end gap-2.5">
              <div className="w-10 h-10 opacity-70 flex-shrink-0">
                <img
                  src="/assets/pumpjack-badge.png"
                  alt="Oilfield"
                  className="w-full h-full object-contain filter invert opacity-80"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold leading-tight">
                  ENERGY
                </span>
                <span className="text-[10px] uppercase tracking-wider text-white font-extrabold leading-tight">
                  FOR A STRONGER
                </span>
                <span className="text-[10px] uppercase tracking-wider text-white font-extrabold leading-tight">
                  TOMORROW
                </span>
                <div className="w-8 h-0.5 bg-[#c5161d] mt-1 rounded-full" />
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* ── Main Layout Column (Top Bar + Main Work Area with Background) ── */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen bg-slate-50">

        {/* ── Top Header Bar ── */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs flex-shrink-0">
          <div className="flex items-center h-16 px-4 md:px-6 justify-between gap-3 w-full">

            {/* Left: Three Dots Toggle + ScheduleSync + Black "OIL INDIA LIMITED" */}
            <div className="flex items-center gap-3 md:gap-4 flex-shrink-0">
              {/* Three dots navigation bar toggle button */}
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-700 hover:text-black border border-slate-200 transition-all cursor-pointer flex items-center justify-center shadow-2xs"
                title={isSidebarCollapsed ? "Expand Navigation Bar" : "Collapse Navigation Bar"}
                aria-label="Toggle Navigation Sidebar"
              >
                <MoreHorizontal className="w-5 h-5 text-slate-800" />
              </button>

              {/* ScheduleSync Brand & User-requested small "OIL INDIA LIMITED" in black */}
              <div className="flex flex-col justify-center select-none">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-lg md:text-xl font-black tracking-tight leading-none flex items-center">
                    <span className="text-black" style={{ color: '#000000' }}>Schedule</span>
                    <span className="text-[#c5161d]" style={{ color: '#c5161d' }}>Sync</span>
                  </h1>
                </div>
                {/* STRICT USER REQUIREMENT: small "OIL INDIA LIMITED" in black color */}
                <span
                  className="text-[10px] md:text-[11px] font-black uppercase tracking-widest leading-none mt-1 text-black"
                  style={{ color: '#000000', fontWeight: 900 }}
                >
                  OIL INDIA LIMITED
                </span>
              </div>

              {/* Active Project Dropdown & Workflow Report PDF button */}
              <div className="hidden md:flex items-center gap-2 pl-4 border-l border-slate-200">
                <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <select
                  aria-label="Active Project"
                  value={selectedProjectId}
                  onChange={handleProjectChange}
                  className="bg-slate-50 text-slate-800 font-semibold text-xs rounded-md border border-slate-200 px-2.5 py-1.5 focus:outline-none cursor-pointer max-w-[240px] truncate"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.activity_count ?? 0} acts)</option>
                  ))}
                </select>

                <button
                  onClick={() => setIsReportModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#0a0b0e] hover:bg-[#1a1c22] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex-shrink-0 border border-slate-800"
                  title="View and download Workflow PDF Report for selected project"
                >
                  <FileDown className="w-3.5 h-3.5 text-red-400" />
                  <span>View Report PDF</span>
                </button>
              </div>
            </div>

            {/* Right: Notifications & User Profile */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Notification Bell with red badge */}
              <div className="relative">
                <button
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition-all cursor-pointer relative"
                  title="Notifications"
                  aria-label="Notifications"
                >
                  <Bell className="w-4 h-4 text-slate-700" />
                  {queueCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#c5161d] text-white font-black text-[10px] flex items-center justify-center ring-2 ring-white">
                      {queueCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {isNotificationsOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-50 space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-xs font-bold text-slate-900">Activity Queue Alerts</span>
                      <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                        {queueCount} Pending
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 space-y-2 max-h-48 overflow-y-auto">
                      {reviewQueue.slice(0, 3).map((q) => (
                        <div key={q.match_id} className="p-2 bg-slate-50 rounded-lg border border-slate-100 text-[11px]">
                          <div className="font-bold text-slate-900 truncate">Match #{q.match_id}: {q.suggested_activity?.activity_name}</div>
                          <div className="text-slate-500 text-[10px]">Confidence: {Math.round(q.final_confidence * 100)}% · {q.discipline}</div>
                        </div>
                      ))}
                      {queueCount === 0 && (
                        <div className="text-center py-3 text-slate-400 text-xs">No pending notifications</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Avatar & Title */}
              <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
                <div className="w-8 h-8 rounded-full bg-slate-800 text-white font-bold text-xs flex items-center justify-center shadow-xs border border-slate-700">
                  A
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-900 leading-none">
                    {user?.name && !user.name.toLowerCase().includes('arun') ? user.name : 'Admin'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium mt-0.5">
                    Lead Planner
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ── Main Content Area with Refinery Wallpaper Background ── */}
        <main
          className="flex-1 w-full p-4 md:p-6 lg:p-8 relative refinery-bg min-h-[calc(100vh-4rem)]"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(248, 250, 252, 0.92), rgba(241, 245, 249, 0.95)), url('/assets/refinery-bg.png')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
          }}
        >
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-white/95 px-6 py-3 text-center text-xs text-slate-500 flex-shrink-0">
          © 2026 Oil India Limited · ScheduleSync Project Control Platform · Numaligarh Refinery Expansion
        </footer>
      </div>

      {/* Interactive On-Screen Workflow Report PDF Viewer Modal */}
      <WorkflowReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        projectId={selectedProjectId || 1}
        projectName={selectedProjectName || 'Numaligarh Refinery Expansion'}
      />
    </div>
  );
};
