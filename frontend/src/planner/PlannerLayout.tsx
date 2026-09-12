import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../auth/authStore';
import { useProjectStore } from './projectStore';
import { api, notificationsApi } from '../api/client';
import brandLogoImg from '../assets/logo.png';
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
  AlertTriangle,
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
  ShieldAlert,
  TrendingUp,
  Paperclip,
  CheckCircle2,
  ExternalLink,
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
  const [notifFilter, setNotifFilter] = useState<'ALL' | 'BLOCKERS' | 'REVIEWS' | 'RISKS' | 'SYSTEM'>('ALL');
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

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.getProjects(),
  });

  // 1. Open site blockers & HSE issues
  const { data: openComplaints = [] } = useQuery({
    queryKey: ['complaints-open-count', selectedProjectId],
    queryFn: () => api.getComplaints(selectedProjectId, 'OPEN'),
    refetchInterval: 15000,
  });
  const openComplaintsCount = openComplaints.length;

  // 2. Pending match review queue
  const { data: reviewQueue = [] } = useQuery({
    queryKey: ['review-queue'],
    queryFn: () => api.getReviewQueue(),
    refetchInterval: 15000,
  });
  const queueCount = reviewQueue.length;

  // 3. Out-of-sequence schedule violations & risks
  const { data: sequenceViolations = [] } = useQuery({
    queryKey: ['sequence-violations-notif', selectedProjectId],
    queryFn: () => api.getSequenceViolations(selectedProjectId),
    refetchInterval: 15000,
  });
  const sequenceViolationsCount = sequenceViolations.filter((v) => !v.acknowledged).length;

  // 4. System / Push notifications
  const { data: systemNotifications = [] } = useQuery({
    queryKey: ['system-notifications-notif'],
    queryFn: () => notificationsApi.getMyNotifications(15),
    refetchInterval: 20000,
  });
  const unreadSysNotifCount = systemNotifications.filter((n) => !n.is_read).length;

  // Total unified count
  const totalAlertsCount = openComplaintsCount + queueCount + sequenceViolationsCount + unreadSysNotifCount;

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
              src={brandLogoImg}
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo.png'; }}
              alt="ScheduleSync Logo"
              className="w-9 h-9 rounded-full object-contain flex-shrink-0 bg-white p-0.5 shadow-2xs"
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

          {/* Project Ingestion (Right after Dashboard per user instruction) */}
          <NavLink
            to="/planner/ingestion"
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

          {/* Activity Audit Trail (Right after History per user instruction) */}
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
                <span className="truncate flex-1">Activity Audit Trail</span>
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

        {/* ── Top Header Bar with Custom Oilfield Rig Artwork Banner ── */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs flex-shrink-0 relative">
          {/* Custom Oilfield Rig Artwork Panoramic Header Banner */}
          <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden flex items-center">
            <img
              src="/assets/header-bg.png"
              alt="Oilfield Rigs Banner"
              className="w-full h-full object-cover object-center select-none opacity-90"
            />
          </div>

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
                      src={brandLogoImg}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo.png'; }}
                      alt="Oil India Limited"
                      className="w-9 h-9 rounded-full object-contain flex-shrink-0 bg-white p-0.5 shadow-2xs"
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
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-400 hidden sm:block flex-shrink-0" />
                    <select
                      value={selectedProjectId}
                      onChange={handleProjectChange}
                      className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer max-w-[200px] sm:max-w-[280px] md:max-w-[360px] truncate"
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                /* Project Switcher when sidebar is ON */
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-400 hidden sm:block flex-shrink-0" />
                  <select
                    value={selectedProjectId}
                    onChange={handleProjectChange}
                    className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer max-w-[220px] sm:max-w-[320px] md:max-w-[420px] truncate"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Right Header Area:
                - Notification bell with red badge
                - Avatar + Admin Lead Planner
                - Red outlined "Sign Out" button
            */}
            <div className="flex items-center gap-3 sm:gap-3.5 flex-shrink-0">
              {/* Unified Notification Bell with red badge & Auto-closing Popup */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-all cursor-pointer relative"
                  title="Unified Notifications Center"
                  aria-label="Unified Notifications Center"
                >
                  <Bell className="w-5 h-5 text-slate-700" />
                  {totalAlertsCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#9e1218] text-white font-black text-[10px] flex items-center justify-center ring-2 ring-white animate-pulse shadow-sm">
                      {totalAlertsCount > 99 ? '99+' : totalAlertsCount}
                    </span>
                  )}
                </button>

                {/* Invisible full-viewport backdrop so clicking anywhere outside closes the popup */}
                {isNotificationsOpen && (
                  <div
                    className="fixed inset-0 z-40 bg-transparent"
                    onClick={() => setIsNotificationsOpen(false)}
                  />
                )}

                {/* Comprehensive Notifications Popup (Always on top of all pages with z-50 and no clipping) */}
                {isNotificationsOpen && (
                  <div className="absolute right-0 mt-2 w-88 sm:w-[420px] md:w-[460px] bg-white rounded-2xl shadow-2xl border border-slate-200/90 p-3.5 z-50 space-y-3 animate-in fade-in zoom-in-95 duration-150 text-slate-800">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-red-50 text-[#9e1218] flex items-center justify-center">
                          <Bell className="w-4 h-4 text-[#9e1218]" />
                        </div>
                        <div>
                          <h2 className="text-xs font-black text-slate-900 leading-tight">Site Notifications &amp; Alerts</h2>
                          <p className="text-[10px] text-slate-500 font-medium">Real-time blockers, review requests &amp; schedule risks</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {totalAlertsCount > 0 && (
                          <span className="text-[10px] font-black text-[#9e1218] bg-red-100/80 px-2 py-0.5 rounded-full">
                            {totalAlertsCount} Total
                          </span>
                        )}
                        <button
                          onClick={() => setIsNotificationsOpen(false)}
                          className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Close"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Filter Category Tabs */}
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar text-[11px] font-bold">
                      <button
                        onClick={() => setNotifFilter('ALL')}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                          notifFilter === 'ALL'
                            ? 'bg-[#0a0b0e] text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        All ({totalAlertsCount})
                      </button>
                      <button
                        onClick={() => setNotifFilter('BLOCKERS')}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                          notifFilter === 'BLOCKERS'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                        }`}
                      >
                        <AlertOctagon className="w-3 h-3" />
                        Blockers ({openComplaintsCount})
                      </button>
                      <button
                        onClick={() => setNotifFilter('REVIEWS')}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                          notifFilter === 'REVIEWS'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                        }`}
                      >
                        <Inbox className="w-3 h-3" />
                        Reviews ({queueCount})
                      </button>
                      <button
                        onClick={() => setNotifFilter('RISKS')}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                          notifFilter === 'RISKS'
                            ? 'bg-orange-600 text-white shadow-xs'
                            : 'bg-orange-50 text-orange-800 hover:bg-orange-100'
                        }`}
                      >
                        <AlertTriangle className="w-3 h-3" />
                        Risks ({sequenceViolationsCount})
                      </button>
                      {systemNotifications.length > 0 && (
                        <button
                          onClick={() => setNotifFilter('SYSTEM')}
                          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                            notifFilter === 'SYSTEM'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                          }`}
                        >
                          <Bell className="w-3 h-3" />
                          System ({unreadSysNotifCount})
                        </button>
                      )}
                    </div>

                    {/* Scrollable Alerts Feed */}
                    <div className="space-y-2 max-h-72 sm:max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                      {/* 1. Open Site Blockers & Complaints */}
                      {(notifFilter === 'ALL' || notifFilter === 'BLOCKERS') &&
                        openComplaints.slice(0, notifFilter === 'BLOCKERS' ? 15 : 4).map((comp) => (
                          <div
                            key={`comp-${comp.id}`}
                            onClick={() => {
                              setIsNotificationsOpen(false);
                              navigate('/planner/complaints');
                            }}
                            className="p-2.5 bg-rose-50/70 hover:bg-rose-100/70 rounded-xl border border-rose-200 text-left cursor-pointer transition-all hover:shadow-xs space-y-1 group"
                          >
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-rose-800 bg-rose-200/80 px-1.5 py-0.5 rounded">
                                <AlertOctagon className="w-3 h-3 text-rose-700" />
                                Blocker: {comp.category}
                              </span>
                              <span className="text-[10px] font-semibold text-rose-600">
                                {new Date(comp.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-slate-900 line-clamp-2 leading-tight">
                              "{comp.description}"
                            </p>
                            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                              <span className="truncate">
                                By <strong className="text-slate-700">{comp.supervisor_name}</strong> {comp.supervisor_discipline ? `(${comp.supervisor_discipline})` : ''} · {comp.activity_id || 'General Site'}
                              </span>
                              <span className="text-rose-700 font-bold group-hover:underline flex items-center gap-0.5 shrink-0 ml-1">
                                Resolve &rarr;
                              </span>
                            </div>
                          </div>
                        ))}

                      {/* 2. Candidate Match Review Queue Requests */}
                      {(notifFilter === 'ALL' || notifFilter === 'REVIEWS') &&
                        reviewQueue.slice(0, notifFilter === 'REVIEWS' ? 15 : 4).map((q) => (
                          <div
                            key={`review-${q.match_id}`}
                            onClick={() => {
                              setIsNotificationsOpen(false);
                              navigate(`/planner/review/${q.match_id}`);
                            }}
                            className="p-2.5 bg-amber-50/60 hover:bg-amber-100/60 rounded-xl border border-amber-200 text-left cursor-pointer transition-all hover:shadow-xs space-y-1 group"
                          >
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-900 bg-amber-200/80 px-1.5 py-0.5 rounded">
                                <Inbox className="w-3 h-3 text-amber-700" />
                                Review Request #{q.match_id}
                              </span>
                              <span className="text-[10px] font-black text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                                {Math.round(q.final_confidence * 100)}% Match
                              </span>
                            </div>
                            <p className="text-xs font-bold text-slate-900 truncate leading-tight">
                              {q.suggested_activity?.activity_name || 'Daily Progress Match'}
                            </p>
                            <p className="text-[11px] text-slate-600 line-clamp-1 italic">
                              "{q.report_snippet}"
                            </p>
                            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                              <span className="truncate flex items-center gap-1.5">
                                <span>{q.discipline} · {q.suggested_activity?.wbs_code || 'WBS'}</span>
                                {q.has_file && (
                                  <span className="inline-flex items-center gap-0.5 text-blue-700 font-bold bg-blue-100/70 px-1 rounded">
                                    <Paperclip className="w-2.5 h-2.5" /> Media
                                  </span>
                                )}
                              </span>
                              <span className="text-amber-900 font-bold group-hover:underline shrink-0 ml-1">
                                Review &rarr;
                              </span>
                            </div>
                          </div>
                        ))}

                      {/* 3. Out-of-Sequence Schedule Violations & Risks */}
                      {(notifFilter === 'ALL' || notifFilter === 'RISKS') &&
                        sequenceViolations.slice(0, notifFilter === 'RISKS' ? 15 : 4).map((v) => (
                          <div
                            key={`viol-${v.id}`}
                            onClick={() => {
                              setIsNotificationsOpen(false);
                              navigate('/planner/review');
                            }}
                            className="p-2.5 bg-orange-50/70 hover:bg-orange-100/70 rounded-xl border border-orange-200 text-left cursor-pointer transition-all hover:shadow-xs space-y-1 group"
                          >
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-orange-950 bg-orange-200 px-1.5 py-0.5 rounded">
                                <AlertTriangle className="w-3 h-3 text-orange-700" />
                                Sequence Risk
                              </span>
                              <span className="text-[10px] font-bold text-orange-800">
                                {v.predecessor_status || 'Predecessor Incomplete'}
                              </span>
                            </div>
                            <p className="text-xs font-bold text-slate-900 truncate leading-tight">
                              {v.activity_id}: {v.activity_name || 'Activity'}
                            </p>
                            <p className="text-[11px] text-slate-600 line-clamp-1">
                              Started before unfinished predecessor: <strong className="text-slate-800">{v.predecessor_activity_id}</strong> ({v.predecessor_name || 'Predecessor'})
                            </p>
                            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                              <span>Detected {new Date(v.detected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              <span className="text-orange-900 font-bold group-hover:underline shrink-0 ml-1">
                                Inspect &rarr;
                              </span>
                            </div>
                          </div>
                        ))}

                      {/* 4. System / Push Notifications */}
                      {(notifFilter === 'ALL' || notifFilter === 'SYSTEM') &&
                        systemNotifications.slice(0, notifFilter === 'SYSTEM' ? 15 : 3).map((n) => (
                          <div
                            key={`sys-${n.id}`}
                            onClick={() => {
                              notificationsApi.markRead(n.id);
                              setIsNotificationsOpen(false);
                              if (n.link) navigate(n.link);
                            }}
                            className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all hover:shadow-xs space-y-1 group ${
                              n.is_read ? 'bg-slate-50 border-slate-200' : 'bg-blue-50/60 border-blue-200'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-700 bg-slate-200 px-1.5 py-0.5 rounded">
                                <Bell className="w-3 h-3 text-slate-600" />
                                {n.title}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-slate-800 line-clamp-2 leading-tight">
                              {n.message}
                            </p>
                          </div>
                        ))}

                      {/* Empty state */}
                      {totalAlertsCount === 0 && (
                        <div className="text-center py-8 text-slate-400 text-xs space-y-1.5">
                          <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500/80 mb-1" />
                          <p className="font-bold text-slate-700">All caught up!</p>
                          <p className="text-[11px] text-slate-500">No pending site blockers, review requests, or sequence risks.</p>
                        </div>
                      )}
                    </div>

                    {/* Bottom Quick-Action Shortcuts */}
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setIsNotificationsOpen(false);
                          navigate('/planner/complaints');
                        }}
                        className="text-[11px] font-bold text-rose-800 bg-rose-50 hover:bg-rose-100 py-1.5 px-2 rounded-lg text-center transition-colors cursor-pointer border border-rose-200 truncate"
                      >
                        View Blockers ({openComplaintsCount})
                      </button>
                      <button
                        onClick={() => {
                          setIsNotificationsOpen(false);
                          navigate('/planner/review');
                        }}
                        className="text-[11px] font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 py-1.5 px-2 rounded-lg text-center transition-colors cursor-pointer border border-slate-200 truncate"
                      >
                        View Review Queue ({queueCount})
                      </button>
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

        {/* ── Main Scrollable Content Area ── */}
        <main className="flex-1 flex flex-col w-full p-4 md:p-6 lg:p-8 relative bg-slate-50">
          <div className="max-w-7xl mx-auto w-full flex-1">
            <Outlet />
          </div>
        </main>

        {/* Footer */}
        <footer className="mt-auto border-t border-slate-200 bg-white px-4 sm:px-6 py-3 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 flex-shrink-0 z-10 w-full text-center sm:text-left shadow-2xs">
          <div className="leading-tight">
            &copy; 2026 Oil India Limited. All rights reserved. &nbsp;<span className="hidden sm:inline">|</span>&nbsp; ScheduleSync v1.0
          </div>
          <div className="flex items-center justify-center gap-3 sm:gap-4 text-slate-400">
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
