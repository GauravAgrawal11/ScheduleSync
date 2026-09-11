import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../auth/authStore';
import { useProjectStore } from './projectStore';
import { api } from '../api/client';
import {
  Home,
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
  Settings,
  ChevronDown,
  ChevronRight,
  Bell,
  HelpCircle,
  Menu,
  User as UserIcon,
  ShieldCheck,
  TrendingUp,
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
  const [isAiVerificationExpanded, setIsAiVerificationExpanded] = useState<boolean>(false);

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

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-[#0a0b0e] text-slate-900 font-sans antialiased select-none">

      {/* ── Left Stationary Navigation Bar (Fixed & Never Moves on Page Scroll) ── */}
      <aside
        className={`text-slate-300 flex flex-col flex-shrink-0 z-40 border-r border-slate-800/90 transition-all duration-300 ease-in-out h-screen relative ${
          isSidebarCollapsed ? 'w-0 -translate-x-full overflow-hidden' : 'w-64 translate-x-0'
        }`}
        style={{
          backgroundColor: '#0a0b0e',
          backgroundImage: "linear-gradient(to bottom, rgba(10, 11, 14, 0.96) 0%, rgba(10, 11, 14, 0.90) 65%, rgba(10, 11, 14, 0.20) 100%), url('/assets/sidebar-bg.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'bottom center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* Navigation Bar Header when ON:
            - Logo
            - Name: ScheduleSync
            - Under the name: WHITE color "OIL INDIA LIMITED"
            - Menu toggle to collapse
        */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800/80 flex-shrink-0 bg-[#0a0b0e]/90 backdrop-blur-xs">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <img
              src="/assets/logo.png"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo.png'; }}
              alt="ScheduleSync Logo"
              className="w-10 h-10 rounded-full object-contain flex-shrink-0"
            />
            <div className="flex flex-col text-left">
              <span className="text-base font-black tracking-tight leading-none flex items-center">
                <span className="text-white">Schedule</span>
                <span className="text-[#9e1218] ml-0.5" style={{ color: '#9e1218' }}>Sync</span>
              </span>
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

        {/* Navigation items list - Internally scrollable, independent of page scroll */}
        <nav className="flex-1 py-3 px-2.5 space-y-1 overflow-y-auto custom-scrollbar">
          {/* Dashboard */}
          <NavLink
            to="/planner/review"
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 group cursor-pointer ${
                location.pathname === '/planner/dashboard' || (location.pathname === '/planner/review' && false)
                  ? 'bg-[#9e1218] text-white shadow-md shadow-red-950/50'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`
            }
          >
            <Home className="w-4 h-4 flex-shrink-0 text-slate-300 group-hover:text-white" />
            <span className="truncate flex-1">Dashboard</span>
          </NavLink>

          {/* Review Queue (Highlighted active with solid red pill) */}
          <NavLink
            to="/planner/review"
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 group cursor-pointer ${
                location.pathname === '/planner/review'
                  ? 'bg-[#9e1218] text-white shadow-md shadow-red-950/50'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`
            }
          >
            <Inbox className={`w-4 h-4 flex-shrink-0 ${location.pathname === '/planner/review' ? 'text-white' : 'text-slate-300 group-hover:text-white'}`} />
            <span className="truncate flex-1">Review Queue</span>
            {queueCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[#9e1218] border border-red-700 text-white font-bold leading-none ml-auto">
                {queueCount}
              </span>
            )}
          </NavLink>

          {/* Gantt */}
          <NavLink
            to="/planner/schedule"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 group cursor-pointer ${
                isActive
                  ? 'bg-[#9e1218] text-white shadow-md shadow-red-950/50'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <CalendarRange className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'}`} />
                <span className="truncate flex-1">Gantt</span>
              </>
            )}
          </NavLink>

          {/* Activity Audit */}
          <NavLink
            to="/planner/activities"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 group cursor-pointer ${
                isActive
                  ? 'bg-[#9e1218] text-white shadow-md shadow-red-950/50'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <ClipboardList className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'}`} />
                <span className="truncate flex-1">Activity Audit</span>
              </>
            )}
          </NavLink>

          {/* Analytics */}
          <NavLink
            to="/planner/analytics"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 group cursor-pointer ${
                isActive
                  ? 'bg-[#9e1218] text-white shadow-md shadow-red-950/50'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <TrendingUp className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'}`} />
                <span className="truncate flex-1">Analytics</span>
              </>
            )}
          </NavLink>

          {/* HSE & Blockers */}
          <NavLink
            to="/planner/complaints"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 group cursor-pointer ${
                isActive
                  ? 'bg-[#9e1218] text-white shadow-md shadow-red-950/50'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <ShieldCheck className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'}`} />
                <span className="truncate flex-1">HSE &amp; Blockers</span>
                {openComplaintsCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-700 text-white font-bold leading-none ml-auto">
                    {openComplaintsCount}
                  </span>
                )}
              </>
            )}
          </NavLink>

          {/* Assignments */}
          <NavLink
            to="/planner/workload"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 group cursor-pointer ${
                isActive
                  ? 'bg-[#9e1218] text-white shadow-md shadow-red-950/50'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Users className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'}`} />
                <span className="truncate flex-1">Assignments</span>
              </>
            )}
          </NavLink>

          {/* History */}
          <NavLink
            to="/planner/historical"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 group cursor-pointer ${
                isActive
                  ? 'bg-[#9e1218] text-white shadow-md shadow-red-950/50'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Clock className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'}`} />
                <span className="truncate flex-1">History</span>
              </>
            )}
          </NavLink>

          {/* Separator line matching image */}
          <div className="border-t border-slate-800/80 my-2 pt-1" />

          {/* Reports (Expandable) */}
          <div>
            <button
              onClick={() => setIsReportsExpanded(!isReportsExpanded)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer group"
            >
              <FileText className="w-4 h-4 flex-shrink-0 text-slate-300 group-hover:text-white" />
              <span className="truncate flex-1 text-left">Reports</span>
              {isReportsExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-auto flex-shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 ml-auto flex-shrink-0" />
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

          {/* AI Verification (Expandable) */}
          <div>
            <button
              onClick={() => setIsAiVerificationExpanded(!isAiVerificationExpanded)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer group"
            >
              <Sparkles className="w-4 h-4 flex-shrink-0 text-slate-300 group-hover:text-white" />
              <span className="truncate flex-1 text-left">AI Verification</span>
              {isAiVerificationExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-auto flex-shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 ml-auto flex-shrink-0" />
              )}
            </button>

            {isAiVerificationExpanded && (
              <div className="pl-9 pr-2 py-1 space-y-1">
                <NavLink
                  to="/planner/review"
                  className="flex items-center gap-2 text-xs text-slate-400 hover:text-white py-1 transition-colors cursor-pointer"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                  <span>Verification Pipeline</span>
                </NavLink>
                <NavLink
                  to="/planner/review"
                  className="flex items-center gap-2 text-xs text-slate-400 hover:text-white py-1 transition-colors cursor-pointer"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                  <span>Candidate Matches</span>
                </NavLink>
              </div>
            )}
          </div>

          {/* Separator line matching image */}
          <div className="border-t border-slate-800/80 my-2 pt-1" />

          {/* Settings (Baseline Setup) */}
          <NavLink
            to="/planner/setup"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 group cursor-pointer ${
                isActive
                  ? 'bg-[#9e1218] text-white shadow-md shadow-red-950/50'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Settings className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'}`} />
                <span className="truncate flex-1">Settings</span>
              </>
            )}
          </NavLink>

          {/* Help & Support */}
          <button
            onClick={() => setIsHelpModalOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer group text-left"
          >
            <HelpCircle className="w-4 h-4 flex-shrink-0 text-slate-300 group-hover:text-white" />
            <span className="truncate flex-1">Help &amp; Support</span>
          </button>
        </nav>

        {/* Sidebar Footer: Exact Oilfield Pumpjack photo artwork with ENERGY FOR A STRONGER TOMORROW */}
        <div
          className="w-full h-44 bg-cover bg-bottom flex-shrink-0 relative overflow-hidden flex flex-col justify-end p-4 border-t border-slate-800/80"
          style={{
            backgroundImage: "url('/assets/sidebar-bottom-energy.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'bottom center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          {/* Overlay to ensure ultra-clear typography */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
          <div className="relative z-10 flex flex-col text-left pl-14">
            <span className="text-[10px] uppercase tracking-wider text-slate-300 font-bold leading-tight">
              ENERGY
            </span>
            <span className="text-[11px] uppercase tracking-wider text-white font-extrabold leading-tight">
              FOR A STRONGER
            </span>
            <span className="text-[11px] uppercase tracking-wider text-white font-extrabold leading-tight">
              TOMORROW
            </span>
            <div className="w-8 h-0.5 bg-[#9e1218] mt-1 rounded-full" />
          </div>
        </div>
      </aside>

      {/* ── Main Layout Column: Only this area scrolls when scrolling down ── */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto min-w-0 bg-slate-50 relative">

        {/* ── Top Header Bar with header-bg background ── */}
        <header
          className="border-b border-slate-200 sticky top-0 z-30 shadow-xs flex-shrink-0 relative overflow-hidden"
          style={{
            backgroundColor: '#ffffff',
            backgroundImage: "linear-gradient(to right, rgba(255,255,255,1) 0%, rgba(255,255,255,0.96) 45%, rgba(255,255,255,0.45) 85%, rgba(255,255,255,0.92) 100%), url('/assets/header-bg.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'right center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <div className="flex items-center h-16 px-4 md:px-6 justify-between gap-3 w-full relative z-10">

            {/* Left Header Area:
                - If sidebar is ON: Show Project Name & Project Switcher
                - If sidebar is OFF: Show Menu Toggle + Logo + ScheduleSync + BLACK "OIL INDIA LIMITED" + Project Name
            */}
            <div className="flex items-center gap-3 md:gap-4 flex-shrink-0">
              {isSidebarCollapsed ? (
                <>
                  {/* Menu button to open navigation bar */}
                  <button
                    onClick={() => setIsSidebarCollapsed(false)}
                    className="p-2 rounded-lg hover:bg-slate-100 text-slate-700 hover:text-black border border-slate-200 transition-all cursor-pointer flex items-center justify-center shadow-2xs bg-white/90"
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
                      className="w-10 h-10 rounded-full object-contain flex-shrink-0"
                    />
                    <div className="flex flex-col justify-center">
                      <h1 className="text-base font-black tracking-tight leading-none flex items-center">
                        <span className="text-black">Schedule</span>
                        <span className="text-[#9e1218]" style={{ color: '#9e1218' }}>Sync</span>
                      </h1>
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
                    <Building2 className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    <select
                      aria-label="Active Project"
                      value={selectedProjectId}
                      onChange={handleProjectChange}
                      className="bg-white/90 text-slate-800 font-semibold text-xs rounded border border-slate-200 px-2 py-1 focus:outline-none cursor-pointer max-w-[220px] truncate shadow-2xs"
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
                    className="ml-2 bg-white/90 text-slate-700 font-medium text-[11px] rounded border border-slate-200 px-2 py-1 focus:outline-none cursor-pointer hidden md:block shadow-2xs"
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

            {/* Right Header Area matching media_1789137169776.png:
                - Oil Rigs artwork + Energy For A Stronger Tomorrow
                - Divider |
                - Notification bell with red badge (4)
                - Divider |
                - Avatar + Admin Lead Planner
                - Divider |
                - Red outlined "Sign Out" button
            */}
            <div className="flex items-center gap-3 sm:gap-3.5 flex-shrink-0">
              {/* Energy For A Stronger Tomorrow with Oil Rig Towers background graphic */}
              <div className="hidden lg:flex items-center gap-3 pr-2">
                <img
                  src="/assets/oil-rigs-header.png"
                  alt="Oilfield Rigs"
                  className="h-10 object-contain opacity-85"
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

              {/* Vertical divider line */}
              <div className="h-6 w-px bg-slate-300/80 hidden sm:block" />

              {/* Notification Bell with red badge */}
              <div className="relative">
                <button
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-all cursor-pointer relative"
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

              {/* Vertical divider line */}
              <div className="h-6 w-px bg-slate-300/80 hidden sm:block" />

              {/* User Profile Avatar & Info */}
              <div className="flex items-center gap-2 pl-0.5">
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

              {/* Vertical divider line */}
              <div className="h-6 w-px bg-slate-300/80 hidden sm:block" />

              {/* Red Outlined Sign Out Button matching image */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-300 text-[#9e1218] hover:bg-red-50 hover:border-[#9e1218] text-xs font-bold transition-all cursor-pointer shadow-2xs bg-white/90"
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
