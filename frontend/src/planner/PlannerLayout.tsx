import React, { useState, useEffect, useRef } from 'react';
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
  FolderInput,
  History,
  ChevronDown,
  ChevronRight,
  Bell,
  HelpCircle,
  Menu,
  User as UserIcon,
  ShieldCheck,
  TrendingUp,
  X,
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
  const notifRef = useRef<HTMLDivElement>(null);

  // Close notifications popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    if (isNotificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotificationsOpen]);

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
    {
      id: 2,
      name: 'Duliajan Central Gas Gathering Station (CGGS-2)',
      client: 'Oil India Limited',
      activity_count: 24,
      status: 'RUNNING',
    },
    {
      id: 3,
      name: 'Guwahati-Siliguri Pipeline Modernization (Phase II)',
      client: 'Oil India Limited',
      activity_count: 18,
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
        className={`text-slate-300 flex flex-col flex-shrink-0 z-40 border-r border-slate-800/90 transition-all duration-300 ease-in-out h-screen relative bg-[#0a0b0e] ${
          isSidebarCollapsed ? 'w-0 -translate-x-full overflow-hidden' : 'w-64 translate-x-0'
        }`}
        style={{
          backgroundImage: "linear-gradient(to bottom, rgba(10, 11, 14, 0.88) 0%, rgba(10, 11, 14, 0.78) 40%, rgba(10, 11, 14, 0.90) 100%), url('/assets/sidebar-nav-bg.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
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
              className="w-9 h-9 rounded-full object-contain flex-shrink-0"
            />
            <div className="flex flex-col justify-between text-left py-0.5 h-9">
              <span className="text-[15px] font-black tracking-tight leading-none flex items-center">
                <span className="text-white">Schedule</span>
                <span className="text-[#9e1218] ml-0.5" style={{ color: '#9e1218' }}>Sync</span>
              </span>
              <span className="text-[9px] font-black tracking-widest uppercase text-white leading-none">
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
          {/* Dashboard / Review Queue (Single merged item) */}
          <NavLink
            to="/planner/review"
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 group cursor-pointer ${
                location.pathname === '/planner/review' || location.pathname === '/planner/dashboard' || isActive
                  ? 'bg-[#9e1218] text-white shadow-md shadow-red-950/50'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Inbox className={`w-4 h-4 flex-shrink-0 ${location.pathname === '/planner/review' ? 'text-white' : 'text-slate-300 group-hover:text-white'}`} />
                <span className="truncate flex-1">Dashboard / Review Queue</span>
                {queueCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[#9e1218] border border-red-700 text-white font-bold leading-none ml-auto">
                    {queueCount}
                  </span>
                )}
              </>
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

          {/* Audit Trail */}
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
                <History className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'}`} />
                <span className="truncate flex-1">Audit Trail</span>
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

          {/* Audit Trail & Verification (Expandable) */}
          <div>
            <button
              onClick={() => setIsAiVerificationExpanded(!isAiVerificationExpanded)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer group"
            >
              <Sparkles className="w-4 h-4 flex-shrink-0 text-slate-300 group-hover:text-white" />
              <span className="truncate flex-1 text-left">Audit &amp; Verification</span>
              {isAiVerificationExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-auto flex-shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 ml-auto flex-shrink-0" />
              )}
            </button>

            {isAiVerificationExpanded && (
              <div className="pl-9 pr-2 py-1 space-y-1">
                <NavLink
                  to="/planner/activities"
                  className="flex items-center gap-2 text-xs text-slate-400 hover:text-white py-1 transition-colors cursor-pointer"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Activity Audit Trail</span>
                </NavLink>
                <NavLink
                  to="/planner/review"
                  className="flex items-center gap-2 text-xs text-slate-400 hover:text-white py-1 transition-colors cursor-pointer"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span>AI Verification Queue</span>
                </NavLink>
              </div>
            )}
          </div>

          {/* Separator line matching image */}
          <div className="border-t border-slate-800/80 my-2 pt-1" />

          {/* Project Ingestion (Baseline Setup) */}
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
                <FolderInput className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'}`} />
                <span className="truncate flex-1">Project Ingestion</span>
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
      </aside>

      {/* ── Main Layout Column: Only this area scrolls when scrolling down ── */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto min-w-0 bg-slate-50 relative">

        {/* ── Top Header Bar with Custom Oilfield Header Artwork ── */}
        <header
          className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs flex-shrink-0 relative overflow-hidden"
          style={{
            backgroundImage: "url('/assets/header-bg.png')",
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
                      className="w-9 h-9 rounded-full object-contain flex-shrink-0"
                    />
                    <div className="flex flex-col justify-between text-left py-0.5 h-9">
                      <h1 className="text-[15px] font-black tracking-tight leading-none flex items-center">
                        <span className="text-black">Schedule</span>
                        <span className="text-[#9e1218]" style={{ color: '#9e1218' }}>Sync</span>
                      </h1>
                      <span
                        className="text-[9px] font-black uppercase tracking-widest leading-none text-black"
                        style={{ color: '#000000', fontWeight: 900 }}
                      >
                        OIL INDIA LIMITED
                      </span>
                    </div>
                  </div>

                  <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

                  {/* Project Switcher when sidebar is OFF */}
                  <div className="hidden sm:flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#9e1218] flex-shrink-0" />
                    <select
                      aria-label="Active Project"
                      value={selectedProjectId}
                      onChange={handleProjectChange}
                      className="bg-slate-50 hover:bg-slate-100 text-slate-900 font-bold text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#9e1218] cursor-pointer max-w-[280px] truncate shadow-2xs"
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} ({p.activity_count ?? 0} acts)</option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                /* When Navigation Bar is ON: Show Project Name & Switcher in the header */
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-4 h-4 text-[#9e1218] flex-shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                      Active Capital Project
                    </span>
                    <span className="text-xs sm:text-sm font-extrabold text-slate-900 truncate max-w-[260px] md:max-w-md lg:max-w-xl">
                      {projects.find((p) => p.id === selectedProjectId)?.name || selectedProjectName || 'Numaligarh Refinery Expansion (Unit 3 & Offsites)'}
                    </span>
                  </div>

                  <select
                    aria-label="Switch Project"
                    value={selectedProjectId}
                    onChange={handleProjectChange}
                    className="ml-2 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-[11px] rounded-lg border border-slate-300 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#9e1218] cursor-pointer shadow-2xs"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.activity_count ?? 0} acts)</option>
                    ))}
                  </select>

                  <button
                    onClick={() => setIsReportModalOpen(true)}
                    className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0a0b0e] hover:bg-[#1a1c22] text-white font-bold text-[11px] shadow-2xs transition-colors cursor-pointer flex-shrink-0 border border-slate-800 ml-2"
                    title="View and download Workflow PDF Report for selected project"
                  >
                    <FileDown className="w-3.5 h-3.5 text-red-400" />
                    <span>View Report PDF</span>
                  </button>
                </div>
              )}
            </div>

            {/* Right Header Area:
                - Notification bell with red badge
                - Avatar + Admin Lead Planner
                - Red outlined "Sign Out" button
            */}
            <div className="flex items-center gap-3 sm:gap-3.5 flex-shrink-0">
              {/* Notification Bell with red badge & Auto-closing Popup */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-all cursor-pointer relative"
                  title="Notifications"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5 text-slate-700" />
                  {queueCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#9e1218] text-white font-black text-[10px] flex items-center justify-center ring-2 ring-white animate-pulse">
                      {queueCount}
                    </span>
                  )}
                </button>

                {/* Notifications Popup (Auto closes on click inside item or outside click) */}
                {isNotificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 p-3 z-50 space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-1.5">
                        <Bell className="w-3.5 h-3.5 text-[#9e1218]" />
                        <span className="text-xs font-bold text-slate-900">Activity Queue Alerts</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-[#9e1218] bg-red-50 px-2 py-0.5 rounded">
                          {queueCount} Pending
                        </span>
                        <button
                          onClick={() => setIsNotificationsOpen(false)}
                          className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                          title="Close"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="text-xs text-slate-600 space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                      {reviewQueue.slice(0, 4).map((q) => (
                        <div
                          key={q.match_id}
                          onClick={() => {
                            setIsNotificationsOpen(false);
                            navigate(`/planner/review/${q.match_id}`);
                          }}
                          className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-100 hover:border-slate-300 text-[11px] cursor-pointer transition-all space-y-1"
                        >
                          <div className="font-bold text-slate-900 truncate flex items-center justify-between">
                            <span className="truncate">Match #{q.match_id}: {q.suggested_activity?.activity_name}</span>
                            <span className="text-[9px] font-bold text-[#9e1218] bg-red-50 px-1 py-0.5 rounded shrink-0 ml-1">
                              {Math.round(q.final_confidence * 100)}%
                            </span>
                          </div>
                          <div className="text-slate-500 text-[10px] flex items-center justify-between">
                            <span>{q.discipline} · {q.suggested_activity?.wbs_code || 'WBS'}</span>
                            <span className="text-[#9e1218] font-semibold text-[10px] hover:underline">Review &rarr;</span>
                          </div>
                        </div>
                      ))}
                      {queueCount === 0 && (
                        <div className="text-center py-5 text-slate-400 text-xs">
                          No pending notifications
                        </div>
                      )}
                    </div>

                    {queueCount > 0 && (
                      <button
                        onClick={() => {
                          setIsNotificationsOpen(false);
                          navigate('/planner/review');
                        }}
                        className="w-full text-center text-xs font-bold text-white bg-[#0a0b0e] hover:bg-[#1a1c22] py-2 rounded-lg transition-colors cursor-pointer shadow-xs"
                      >
                        View All in Review Queue ({queueCount})
                      </button>
                    )}
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
        <main className="flex-1 w-full p-4 md:p-6 lg:p-8 relative min-h-[calc(100vh-8rem)] bg-slate-50">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-white px-6 py-3 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 flex-shrink-0 z-10">
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
