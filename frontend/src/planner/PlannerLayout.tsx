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
  Clock,
  FileText,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Bell,
  HelpCircle,
  Menu,
  User as UserIcon,
} from 'lucide-react';
import { WorkflowReportModal } from './WorkflowReportModal';
import { HelpSupportModal } from '../components/HelpSupportModal';

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
  const [isHelpModalOpen, setIsHelpModalOpen] = useState<boolean>(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);

  // Sub-menu expansion states
  const [isReportsExpanded, setIsReportsExpanded] = useState<boolean>(true);

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

  // Original feature names restored; Dashboard and Review Queue are ONE section (Review Queue)
  const navItems = [
    { to: '/planner/schedule',   label: 'Gantt',          icon: CalendarRange },
    { to: '/planner/review',     label: 'Review Queue',   icon: Inbox,          badge: true, count: queueCount },
    { to: '/planner/activities', label: 'Activity Audit', icon: ClipboardList },
    { to: '/planner/analytics',  label: 'Analytics',      icon: Layers },
    { to: '/planner/complaints', label: 'HSE & Blockers', icon: AlertOctagon,   hseCount: true, count: openComplaintsCount },
    { to: '/planner/workload',   label: 'Assignments',    icon: Users },
    { to: '/planner/historical', label: 'Historical',     icon: Brain },
    { to: '/planner/setup',      label: 'Baseline Setup', icon: FolderKanban },
  ];

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-[#0a0b0e] text-slate-900 font-sans antialiased select-none">

      {/* ── Left Stationary Navigation Bar (Fixed & Never Moves on Page Scroll) ── */}
      <aside
        className={`bg-[#0a0b0e] text-slate-300 flex flex-col flex-shrink-0 z-40 border-r border-slate-800/80 transition-all duration-300 ease-in-out h-screen ${
          isSidebarCollapsed ? 'w-0 -translate-x-full overflow-hidden' : 'w-64 translate-x-0'
        }`}
      >
        {/* Navigation Bar Header when ON:
            - Logo
            - Name: ScheduleSync
            - Under the name: WHITE color "OIL INDIA LIMITED"
            - Three lines / Menu button to collapse
        */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800/60 flex-shrink-0">
          <div className="flex items-center gap-2.5 overflow-hidden">
            {/* New Logo */}
            <img
              src="/assets/logo.png"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo.png'; }}
              alt="ScheduleSync Logo"
              className="w-8 h-8 rounded-full object-contain bg-white/10 p-0.5 border border-red-900/60 flex-shrink-0"
            />
            <div className="flex flex-col text-left">
              <span className="text-base font-black tracking-tight leading-none flex items-center">
                <span className="text-white">Schedule</span>
                <span className="text-[#9e1218] ml-0.5" style={{ color: '#9e1218' }}>Sync</span>
              </span>
              {/* User requirement: Under the name, the white color OIL INDIA LIMITED */}
              <span className="text-[9px] font-black tracking-widest uppercase text-white leading-none mt-1">
                OIL INDIA LIMITED
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsSidebarCollapsed(true)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer flex-shrink-0"
            title="Collapse Navigation Bar"
            aria-label="Collapse Navigation Bar"
          >
            <Menu className="w-5 h-5 text-slate-300 hover:text-white" />
          </button>
        </div>

        {/* Navigation items list - Internally scrollable, independent of page */}
        <nav className="flex-1 py-3 px-2.5 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isSelected = item.to.startsWith('/') && location.pathname === item.to;

            return (
              <NavLink
                key={index}
                to={item.to}
                end={item.to === '/planner/review'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 relative group cursor-pointer ${
                    isActive
                      ? 'bg-[#9e1218] text-white shadow-md shadow-red-950/50'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                    <span className="truncate flex-1">{item.label}</span>

                    {/* Badge Counters */}
                    {item.badge && item.count !== undefined && item.count > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[#9e1218] border border-red-700 text-white font-bold leading-none ml-auto">
                        {item.count}
                      </span>
                    )}

                    {item.hseCount && item.count !== undefined && item.count > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-700 text-white font-bold leading-none ml-auto">
                        {item.count}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}

          {/* Reports (Expandable) */}
          <div className="pt-1">
            <button
              onClick={() => setIsReportsExpanded(!isReportsExpanded)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer group"
            >
              <FileText className="w-4 h-4 flex-shrink-0 text-slate-400 group-hover:text-white" />
              <span className="truncate flex-1 text-left">Reports</span>
              {isReportsExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 ml-auto flex-shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 ml-auto flex-shrink-0" />
              )}
            </button>

            {isReportsExpanded && (
              <div className="pl-9 pr-2 py-1">
                <button
                  onClick={() => setIsReportModalOpen(true)}
                  className="flex items-center gap-2 text-xs text-slate-400 hover:text-white py-1 transition-colors w-full text-left cursor-pointer"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                  <span>View Report PDF</span>
                </button>
              </div>
            )}
          </div>

          {/* Help & Support */}
          <button
            onClick={() => setIsHelpModalOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer group text-left"
          >
            <HelpCircle className="w-4 h-4 flex-shrink-0 text-slate-400 group-hover:text-white" />
            <span className="truncate flex-1">Help & Support</span>
          </button>
        </nav>

        {/* Sidebar Footer: Energy For a Stronger Tomorrow */}
        <div className="p-4 border-t border-slate-800/60 bg-gradient-to-t from-black/90 to-transparent relative overflow-hidden flex-shrink-0">
          <div className="flex items-end gap-2.5">
            <div className="w-10 h-10 opacity-70 flex-shrink-0">
              <img
                src="/assets/logo.png"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo.png'; }}
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
              <div className="w-8 h-0.5 bg-[#9e1218] mt-1 rounded-full" />
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Layout Column: Only this area scrolls when scrolling down ── */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto min-w-0 bg-slate-50 relative">

        {/* ── Top Header Bar ── */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs flex-shrink-0">
          <div className="flex items-center h-16 px-4 md:px-6 justify-between gap-3 w-full">

            {/* Left Header Area:
                - If sidebar is ON: Show Project Name & Project Switcher
                - If sidebar is OFF: Show Menu Toggle + Logo + ScheduleSync + BLACK "OIL INDIA LIMITED" + Project Name
            */}
            <div className="flex items-center gap-3 md:gap-4 flex-shrink-0">
              {isSidebarCollapsed ? (
                <>
                  {/* Three lines / Menu button to open navigation bar */}
                  <button
                    onClick={() => setIsSidebarCollapsed(false)}
                    className="p-2 rounded-lg hover:bg-slate-100 text-slate-700 hover:text-black border border-slate-200 transition-all cursor-pointer flex items-center justify-center shadow-2xs"
                    title="Open Navigation Bar"
                    aria-label="Open Navigation Bar"
                  >
                    <Menu className="w-5 h-5 text-slate-800" />
                  </button>

                  {/* Logo + Name + BLACK "OIL INDIA LIMITED" when OFF */}
                  <div className="flex items-center gap-2.5 select-none">
                    <img
                      src="/assets/logo.png"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo.png'; }}
                      alt="Oil India Limited"
                      className="w-8 h-8 rounded-full object-contain border border-slate-200 bg-white p-0.5"
                    />
                    <div className="flex flex-col justify-center">
                      <h1 className="text-base font-black tracking-tight leading-none flex items-center">
                        <span className="text-black">Schedule</span>
                        <span className="text-[#9e1218]" style={{ color: '#9e1218' }}>Sync</span>
                      </h1>
                      {/* Under name, black color OIL INDIA LIMITED */}
                      <span
                        className="text-[9px] font-black uppercase tracking-widest leading-none mt-1 text-black"
                        style={{ color: '#000000', fontWeight: 900 }}
                      >
                        OIL INDIA LIMITED
                      </span>
                    </div>
                  </div>

                  <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

                  {/* Project Name when OFF */}
                  <div className="hidden sm:flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <select
                      aria-label="Active Project"
                      value={selectedProjectId}
                      onChange={handleProjectChange}
                      className="bg-slate-50 text-slate-800 font-semibold text-xs rounded border border-slate-200 px-2 py-1 focus:outline-none cursor-pointer max-w-[220px] truncate"
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} ({p.activity_count ?? 0} acts)</option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                /* When Navigation Bar is ON: Show Project Name in the header */
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-4 h-4 text-[#9e1218] flex-shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                      Active Capital Project
                    </span>
                    <span className="text-xs sm:text-sm font-extrabold text-slate-900 truncate max-w-[220px] md:max-w-md">
                      {selectedProjectName || 'Numaligarh Refinery Expansion (Unit 3 & Offsites)'}
                    </span>
                  </div>

                  <select
                    aria-label="Switch Project"
                    value={selectedProjectId}
                    onChange={handleProjectChange}
                    className="ml-2 bg-slate-50 text-slate-700 font-medium text-[11px] rounded border border-slate-200 px-2 py-1 focus:outline-none cursor-pointer hidden md:block"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.activity_count ?? 0} acts)</option>
                    ))}
                  </select>

                  <button
                    onClick={() => setIsReportModalOpen(true)}
                    className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0a0b0e] hover:bg-[#1a1c22] text-white font-bold text-[11px] shadow-2xs transition-colors cursor-pointer flex-shrink-0 border border-slate-800 ml-2"
                    title="View and download Workflow PDF Report for selected project"
                  >
                    <FileDown className="w-3.5 h-3.5 text-red-400" />
                    <span>View Report PDF</span>
                  </button>
                </div>
              )}
            </div>

            {/* Right Header Area:
                - Energy For A Stronger Tomorrow illustration
                - Notification bell with red counter badge
                - User avatar + Admin / Lead Planner
                - Red outlined "Sign Out" button
            */}
            <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
              {/* Energy For A Stronger Tomorrow Graphic */}
              <div className="hidden lg:flex items-center gap-2.5 pr-3 border-r border-slate-200">
                <img
                  src="/assets/logo.png"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo.png'; }}
                  alt="Oilfield"
                  className="w-7 h-7 object-contain opacity-75"
                />
                <div className="flex flex-col text-left">
                  <span className="text-[8px] uppercase tracking-wider text-slate-600 font-bold leading-tight">
                    ENERGY
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-slate-900 font-extrabold leading-tight">
                    FOR A STRONGER
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-slate-900 font-extrabold leading-tight">
                    TOMORROW
                  </span>
                  <div className="w-7 h-0.5 bg-[#9e1218] mt-0.5 rounded-full" />
                </div>
              </div>

              {/* Notification Bell with red badge */}
              <div className="relative">
                <button
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-all cursor-pointer relative"
                  title="Notifications"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5 text-slate-700" />
                  {queueCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#9e1218] text-white font-black text-[10px] flex items-center justify-center ring-2 ring-white">
                      {queueCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {isNotificationsOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-50 space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-xs font-bold text-slate-900">Activity Queue Alerts</span>
                      <span className="text-[10px] font-bold text-[#9e1218] bg-red-50 px-2 py-0.5 rounded">
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

              {/* User Profile Avatar & Info */}
              <div className="flex items-center gap-2 pl-1 sm:pl-2">
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center">
                  <UserIcon className="w-4 h-4 text-white" />
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-900 leading-none">
                    Admin
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium mt-0.5">
                    Lead Planner
                  </span>
                </div>
              </div>

              {/* Red Outlined Sign Out Button with darker red */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-300 text-[#9e1218] hover:bg-red-50 hover:border-[#9e1218] text-xs font-bold transition-all cursor-pointer shadow-2xs"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4 text-[#9e1218]" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </header>

        {/* ── Main Scrollable Content Area with Refinery Wallpaper Background ── */}
        <main
          className="flex-1 w-full p-4 md:p-6 lg:p-8 relative refinery-bg min-h-[calc(100vh-8rem)]"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(248, 250, 252, 0.93), rgba(241, 245, 249, 0.96)), url('/assets/refinery-bg.png')`,
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
        <footer className="border-t border-slate-200 bg-white/95 px-6 py-3 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 flex-shrink-0">
          <div>
            © 2026 Oil India Limited. All rights reserved. &nbsp;|&nbsp; ScheduleSync v1.0
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <button
              onClick={() => setIsHelpModalOpen(true)}
              className="hover:text-slate-700 transition-colors cursor-pointer"
            >
              Privacy
            </button>
            <span>|</span>
            <button
              onClick={() => setIsHelpModalOpen(true)}
              className="hover:text-slate-700 transition-colors cursor-pointer"
            >
              Terms
            </button>
            <span>|</span>
            <button
              onClick={() => setIsHelpModalOpen(true)}
              className="hover:text-slate-700 transition-colors cursor-pointer"
            >
              Support
            </button>
          </div>
        </footer>
      </div>

      {/* Interactive On-Screen Workflow Report PDF Viewer Modal */}
      <WorkflowReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        projectId={selectedProjectId || 1}
        projectName={selectedProjectName || 'Numaligarh Refinery Expansion'}
      />

      {/* Help & Support Interactive Modal */}
      <HelpSupportModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        role="planner"
      />
    </div>
  );
};
