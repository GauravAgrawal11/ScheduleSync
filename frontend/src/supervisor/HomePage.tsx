import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ComplaintCategory, ComplaintCreatePayload, ActivityProgressItem } from '../api/client';
import { useAuthStore } from '../auth/authStore';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusPill } from '../components/ui/StatusPill';
import { ConfidenceBar } from '../components/ui/ConfidenceBar';
import {
  CheckCircle2,
  Clock,
  XCircle,
  Plus,
  ChevronRight,
  Sparkles,
  Layers,
  Calendar,
  AlertTriangle,
  UserCheck,
  Search,
  AlertOctagon,
  MessageSquare,
  Send,
  X,
  ShieldAlert,
  Wrench,
  HardHat,
  Zap,
  Check,
  HelpCircle,
  Users,
  FolderOpen,
  Filter,
  Mic,
} from 'lucide-react';
import { useLanguageStore, translateActivityName, translateStatus, translateDiscipline, translateLocation, translateTimeline } from './languageStore';

export const HomePage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { language, t } = useLanguageStore();

  // Filter & Search states for assigned activities
  const [activitySearch, setActivitySearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED' | 'PLANNED'>('ALL');

  // Blocker / Complaint modal state
  const [isBlockerModalOpen, setIsBlockerModalOpen] = useState<boolean>(false);
  const [blockerActivityId, setBlockerActivityId] = useState<string>('');
  const [blockerCategory, setBlockerCategory] = useState<ComplaintCategory>('MATERIAL');
  const [blockerDescription, setBlockerDescription] = useState<string>('');
  const [blockerSuccessMsg, setBlockerSuccessMsg] = useState<string | null>(null);

  // STRICT DISCIPLINE & CREDENTIAL ISOLATION:
  // When a site supervisor logs in, they are locked to user.id.
  // If a planner clicks "Supervisor Access" from the workload page (?sup_id=X), it views that supervisor's terminal.
  const querySupId = searchParams.get('sup_id') ? Number(searchParams.get('sup_id')) : null;
  const isSupervisorRole = user?.role === 'supervisor';
  const effectiveSupervisorId = isSupervisorRole ? (user?.id || 2) : (querySupId || user?.id || 2);
  const userDiscipline = user?.discipline
    ? (user.discipline.charAt(0).toUpperCase() + user.discipline.slice(1).toLowerCase())
    : 'Field';

  // Submissions query
  const { data: submissions = [], isLoading: loadingSubmissions } = useQuery({
    queryKey: ['my-submissions'],
    queryFn: () => api.getMySubmissions(),
  });

  // Supervisor Weekly Workload Tasks
  const { data: supervisorTasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ['supervisor-tasks', effectiveSupervisorId],
    queryFn: () => (effectiveSupervisorId ? api.getSupervisorTasks(effectiveSupervisorId) : Promise.resolve([])),
    enabled: Boolean(effectiveSupervisorId),
  });

  // Live Supervisor Progress & Overdue Summary
  const { data: progressSummary, isLoading: loadingProgress } = useQuery({
    queryKey: ['supervisor-progress', effectiveSupervisorId],
    queryFn: () => (effectiveSupervisorId ? api.getSupervisorProgress(effectiveSupervisorId, 1) : Promise.resolve(null)),
    enabled: Boolean(effectiveSupervisorId),
  });

  const currentSupervisorMeta = {
    id: effectiveSupervisorId,
    name: (querySupId && progressSummary?.supervisor_name) ? progressSummary.supervisor_name : (user?.name || 'Site Supervisor'),
    discipline: (querySupId && progressSummary?.discipline) ? progressSummary.discipline : userDiscipline,
    email: user?.email || '',
  };

  // Supervisor's own raised complaints
  const { data: myComplaints = [], isLoading: loadingComplaints } = useQuery({
    queryKey: ['my-complaints', effectiveSupervisorId],
    queryFn: () => (effectiveSupervisorId ? api.getMyComplaints(1) : Promise.resolve([])),
    enabled: Boolean(effectiveSupervisorId),
  });

  // Raise Complaint Mutation
  const raiseComplaintMutation = useMutation({
    mutationFn: (payload: ComplaintCreatePayload) => api.raiseComplaint(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-complaints', user?.id] });
      setBlockerSuccessMsg('Blocker logged successfully! Planner has been notified.');
      setBlockerDescription('');
      setBlockerActivityId('');
      setTimeout(() => {
        setIsBlockerModalOpen(false);
        setBlockerSuccessMsg(null);
      }, 1800);
    },
  });

  const handleOpenBlockerModal = (preselectedActivityId?: string) => {
    if (preselectedActivityId) {
      setBlockerActivityId(preselectedActivityId);
    }
    setBlockerSuccessMsg(null);
    setIsBlockerModalOpen(true);
  };

  const handleBlockerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockerDescription.trim()) return;

    raiseComplaintMutation.mutate({
      project_id: 1,
      activity_id: blockerActivityId.trim() || undefined,
      category: blockerCategory,
      description: blockerDescription.trim(),
    });
  };

  const matchedCount = submissions.filter((s) => s.status === 'matched').length;
  const pendingCount = submissions.filter((s) => s.status === 'pending review').length;
  const rejectedCount = submissions.filter((s) => s.status === 'rejected').length;

  // Combine task information with progress details
  const allActivities: ActivityProgressItem[] =
    (progressSummary?.activities && progressSummary.activities.length > 0 ? progressSummary.activities : null) ||
    (progressSummary?.all_activities && progressSummary.all_activities.length > 0 ? progressSummary.all_activities : null) ||
    supervisorTasks.map((t) => ({
      activity_id: t.activity_id,
      activity_name: t.activity_name,
      discipline: t.discipline,
      status: t.status,
      planned_start: t.planned_start,
      planned_finish: t.planned_finish,
      days_overdue: 0,
      is_delayed: t.status === 'DELAYED',
      completion_pct: t.status === 'COMPLETED' ? 100 : t.status === 'IN_PROGRESS' ? 50 : 0,
      starts_in_days: t.starts_in_days,
      schedule_state: t.schedule_state,
      assignment_timeline_status: t.assignment_timeline_status,
      is_completed: t.status === 'COMPLETED',
    }));

  // Filter activities safely without risk of runtime exception
  const filteredActivities = (allActivities || []).filter((act) => {
    if (!act) return false;
    const actId = (act.activity_id || '').toLowerCase();
    const actName = (act.activity_name || '').toLowerCase();
    const query = activitySearch.trim().toLowerCase();

    const matchesSearch = query === '' || actId.includes(query) || actName.includes(query);

    const actStatus = (act.status || 'PLANNED').toUpperCase();
    const matchesStatus = statusFilter === 'ALL' || actStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Activity status count badges (safely guarded)
  const completedCount = (allActivities || []).filter((a) => (a?.status || '').toUpperCase() === 'COMPLETED').length;
  const inProgressCount = (allActivities || []).filter((a) => (a?.status || '').toUpperCase() === 'IN_PROGRESS').length;
  const delayedCount = (allActivities || []).filter((a) => (a?.status || '').toUpperCase() === 'DELAYED' || a?.is_delayed).length;
  const plannedCount = (allActivities || []).filter((a) => (a?.status || '').toUpperCase() === 'PLANNED').length;

  const overallStatus = (progressSummary?.overall_status || (delayedCount > 0 ? 'delayed' : completedCount === allActivities.length && allActivities.length > 0 ? 'completed' : 'on_track')).toLowerCase();
  const statusDetail = progressSummary?.status_detail || (delayedCount > 0 ? `Delayed by ${delayedCount} task(s)` : 'All assigned schedule activities on track');
  const remainingTasks = progressSummary?.remaining_count ?? (allActivities.length - completedCount);
  const totalAssigned = progressSummary?.total_assigned ?? allActivities.length;
  const countCompleted = progressSummary?.completed_count ?? completedCount;
  const countInProgress = progressSummary?.in_progress_count ?? inProgressCount;
  const countDelayed = progressSummary?.critical_delayed_activities?.length ?? delayedCount;

  // Delayed activities list and auto-popup state
  const [isDelayedModalOpen, setIsDelayedModalOpen] = useState<boolean>(false);
  const [hasAutoOpenedDelayedModal, setHasAutoOpenedDelayedModal] = useState<boolean>(false);

  const delayedActivitiesList = useMemo(() => {
    const list: Array<{
      activity_id: string;
      activity_name: string;
      status?: string;
      progress_percent?: number;
      discipline?: string;
      wbs_code?: string;
      days_overdue?: number;
      planned_finish?: string;
    }> = [];
    const seen = new Set<string>();

    if (progressSummary?.critical_delayed_activities) {
      for (const act of progressSummary.critical_delayed_activities) {
        if (!seen.has(act.activity_id)) {
          seen.add(act.activity_id);
          list.push({
            activity_id: act.activity_id,
            activity_name: act.activity_name,
            status: 'DELAYED',
            days_overdue: act.days_overdue,
            planned_finish: act.planned_finish,
          });
        }
      }
    }

    for (const act of allActivities || []) {
      if ((act?.status || '').toUpperCase() === 'DELAYED' || act?.is_delayed) {
        if (!seen.has(act.activity_id)) {
          seen.add(act.activity_id);
          list.push({
            activity_id: act.activity_id,
            activity_name: act.activity_name,
            status: act.status || 'DELAYED',
            progress_percent: act.completion_pct,
            discipline: act.discipline,
            days_overdue: act.days_overdue,
            planned_finish: act.planned_finish,
          });
        }
      }
    }
    return list;
  }, [allActivities, progressSummary]);

  // Auto-trigger the pop-up notification when supervisor loads the page and delayed activities exist
  useEffect(() => {
    if (delayedActivitiesList.length > 0 && !hasAutoOpenedDelayedModal && !loadingTasks && !loadingProgress) {
      setIsDelayedModalOpen(true);
      setHasAutoOpenedDelayedModal(true);
    }
  }, [delayedActivitiesList.length, hasAutoOpenedDelayedModal, loadingTasks, loadingProgress]);

  return (
    <div className="space-y-5">
      {/* Site Status Banner */}
      <div className="bg-gradient-to-r from-oil-900 via-oil-800 to-slate-900 rounded-2xl p-4 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-white text-[10px] font-medium backdrop-blur-sm">
                <Sparkles className="w-3 h-3 text-amber-300" /> {t('home_expansion_subtitle')}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold uppercase">
                {currentSupervisorMeta.discipline} {language === 'hi' ? 'विभाग' : 'Discipline'}
              </span>

              <div className="inline-flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-full text-[10px] text-slate-300 border border-white/15">
                <HardHat className="w-3 h-3 text-amber-400" />
                <span><strong className="text-white">{user?.name || currentSupervisorMeta.name}</strong></span>
              </div>
            </div>
            <h2 className="text-lg font-bold">{t('home_workspace_title')}</h2>
            <p className="text-xs text-slate-300 mt-0.5">
              {t('home_viewing_tasks_for')} <strong className="text-white">{currentSupervisorMeta.name}</strong> ({currentSupervisorMeta.discipline}). {t('home_viewing_tasks_desc')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenBlockerModal()}
              className="px-3 py-2 text-xs font-bold bg-rose-600/90 hover:bg-rose-600 text-white rounded-xl shadow-sm flex items-center gap-1.5 border border-rose-400/40 transition-all hover:shadow-rose-900/30 active:scale-95 cursor-pointer"
            >
              <AlertOctagon className="w-4 h-4" />
              {t('home_raise_blocker_btn')}
            </button>
          </div>
        </div>
        <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-white/5 rounded-full pointer-events-none" />
      </div>

      {/* Delayed Activities Alert Quick Interactive Banner */}
      {delayedActivitiesList.length > 0 && (
        <button
          onClick={() => setIsDelayedModalOpen(true)}
          className="w-full p-3 rounded-2xl bg-gradient-to-r from-rose-500/10 via-rose-50 to-amber-50 border border-rose-300 flex items-center justify-between text-left transition-all hover:shadow-sm group cursor-pointer animate-fadeIn"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
            </span>
            <div className="min-w-0">
              <div className="text-xs font-black text-rose-950 flex items-center gap-1.5 flex-wrap">
                <span>{language === 'hi' ? 'विलंबित कार्य पॉप-अप सूचना' : 'Delayed Activities Pop-Up Notification'}</span>
                <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white text-[10px] font-extrabold shadow-2xs">
                  {delayedActivitiesList.length} {language === 'hi' ? 'अतिदेय' : 'Overdue'}
                </span>
              </div>
              <p className="text-[11px] text-rose-800 line-clamp-1 mt-0.5">
                {language === 'hi'
                  ? 'अतिदेय गतिविधियों की समीक्षा करने, प्रगति लॉग करने या साइट बाधा दर्ज करने के लिए क्लिक करें।'
                  : 'Click to review overdue activities, log fast progress, or report operational site blockers.'}
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-rose-700 group-hover:translate-x-0.5 transition-transform flex items-center gap-1 shrink-0 ml-2">
            {language === 'hi' ? 'खोलें' : 'View'} &rarr;
          </span>
        </button>
      )}

      {/* FEATURE 1: Live Progress & Schedule Health Card (Guarded against null crashes) */}
      <Card className="border-slate-200 bg-white shadow-sm overflow-hidden">
        <div
          className={`p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            overallStatus === 'delayed'
              ? 'bg-rose-50/80 border-rose-200'
              : overallStatus === 'completed'
              ? 'bg-emerald-50/80 border-emerald-200'
              : 'bg-blue-50/80 border-blue-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                overallStatus === 'delayed'
                  ? 'bg-rose-600 text-white'
                  : overallStatus === 'completed'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-blue-600 text-white'
              }`}
            >
              {overallStatus === 'delayed' ? (
                <AlertTriangle className="w-5 h-5" />
              ) : overallStatus === 'completed' ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <Clock className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  {t('home_live_progress_status')}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    overallStatus === 'delayed'
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : overallStatus === 'completed'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-blue-100 text-blue-800 border border-blue-300'
                  }`}
                >
                  {overallStatus === 'delayed' ? t('status_delayed') : overallStatus === 'completed' ? t('status_completed') : t('status_in_progress')}
                </span>
              </div>
              <div className="text-base font-black text-slate-900 mt-0.5">
                {statusDetail}
              </div>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <div className="text-[11px] font-semibold text-slate-500">{t('home_remaining_tasks')}</div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {remainingTasks}{' '}
              <span className="text-xs font-normal text-slate-500">/ {totalAssigned}</span>
            </div>
          </div>
        </div>

        {/* Quick Metrics Bar */}
        <div className="grid grid-cols-4 divide-x divide-slate-100 p-3 bg-slate-50 text-center">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase">{t('home_total_tasks')}</div>
            <div className="text-base font-extrabold text-slate-800 font-mono">{totalAssigned}</div>
          </div>
          <div>
            <div className="text-xs font-bold text-emerald-600 uppercase">{t('home_completed')}</div>
            <div className="text-base font-extrabold text-emerald-700 font-mono">{countCompleted}</div>
          </div>
          <div>
            <div className="text-xs font-bold text-blue-600 uppercase">{t('home_in_progress')}</div>
            <div className="text-base font-extrabold text-blue-700 font-mono">{countInProgress}</div>
          </div>
          <div>
            <div className="text-xs font-bold text-rose-600 uppercase">{t('home_delayed')}</div>
            <div className="text-base font-extrabold text-rose-700 font-mono">{countDelayed}</div>
          </div>
        </div>

          {/* Critical Delayed Warning Note if any */}
          {(progressSummary?.critical_delayed_activities?.length ?? 0) > 0 && (
            <div className="p-3 bg-rose-50/50 border-t border-rose-100 text-xs text-rose-900 space-y-1">
              <div className="font-bold flex items-center gap-1 text-rose-700">
                <AlertTriangle className="w-3.5 h-3.5" /> Overdue Critical Activities:
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-800">
                {progressSummary?.critical_delayed_activities?.map((act) => (
                  <li key={act.activity_id}>
                    <strong className="font-mono">{act.activity_id}</strong>: {act.activity_name} —{' '}
                    <span className="font-semibold text-rose-950">{act.days_overdue} days overdue</span> (Planned:{' '}
                    {act.planned_finish})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

      {/* 3 Stat Cards for Submissions */}
      <div className="grid grid-cols-3 gap-2.5">
        <Card className="bg-emerald-50/50 border-emerald-200/60 p-3 text-center">
          <div className="flex justify-center text-emerald-600 mb-1">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-xl font-black text-emerald-950">
            {loadingSubmissions ? '...' : matchedCount}
          </div>
          <div className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">
            {t('home_status_matched')}
          </div>
        </Card>

        <Card className="bg-amber-50/50 border-amber-200/60 p-3 text-center">
          <div className="flex justify-center text-amber-600 mb-1">
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-xl font-black text-amber-950">
            {loadingSubmissions ? '...' : pendingCount}
          </div>
          <div className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider">
            {t('home_status_pending')}
          </div>
        </Card>

        <Card className="bg-rose-50/50 border-rose-200/60 p-3 text-center">
          <div className="flex justify-center text-rose-600 mb-1">
            <XCircle className="w-4 h-4" />
          </div>
          <div className="text-xl font-black text-rose-950">
            {loadingSubmissions ? '...' : rejectedCount}
          </div>
          <div className="text-[10px] font-semibold text-rose-700 uppercase tracking-wider">
            {t('home_status_rejected')}
          </div>
        </Card>
      </div>

      {/* Quick Access: Site Files & Field Documents */}
      <div className="p-3.5 bg-gradient-to-r from-oil-900 via-slate-800 to-oil-950 rounded-xl text-white flex items-center justify-between shadow-sm border border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 flex-shrink-0">
            <FolderOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold flex items-center gap-1.5">
              <span>{t('home_site_files')}</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                P&amp;ID · Photos · DPR
              </span>
            </div>
            <div className="text-[11px] text-slate-300">
              {language === 'hi' ? 'इंजीनियरिंग ड्रॉइंग, BBS शीट देखें और साइट फोटो/रिपोर्ट अपलोड करें' : 'Access engineering drawings, BBS sheets, and upload site photos/reports'}
            </div>
          </div>
        </div>
        <button
          onClick={() => navigate('/supervisor/files')}
          className="px-3 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg shadow-sm flex items-center gap-1 transition-all active:scale-95 flex-shrink-0"
        >
          <span>{t('nav_files')}</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Searchable Assigned Activities Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-oil-800" />
            {t('home_assigned_activities_title')} ({allActivities.length})
          </h3>
        </div>

        {/* Search Bar & Status Filter Tabs */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={t('home_search_placeholder')}
              value={activitySearch}
              onChange={(e) => setActivitySearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-oil-600 focus:border-transparent"
            />
            {activitySearch && (
              <button
                onClick={() => setActivitySearch('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded-lg font-bold whitespace-nowrap transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-oil-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t('home_filter_all')} ({allActivities.length})
            </button>
            <button
              onClick={() => setStatusFilter('IN_PROGRESS')}
              className={`px-3 py-1 rounded-lg font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                statusFilter === 'IN_PROGRESS'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
              }`}
            >
              {t('home_filter_in_progress')} ({inProgressCount})
            </button>
            <button
              onClick={() => setStatusFilter('COMPLETED')}
              className={`px-3 py-1 rounded-lg font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                statusFilter === 'COMPLETED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              {t('home_filter_completed')} ({completedCount})
            </button>
            <button
              onClick={() => setStatusFilter('DELAYED')}
              className={`px-3 py-1 rounded-lg font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                statusFilter === 'DELAYED'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              {t('home_filter_delayed')} ({delayedCount})
            </button>
            <button
              onClick={() => setStatusFilter('PLANNED')}
              className={`px-3 py-1 rounded-lg font-bold whitespace-nowrap transition-all ${
                statusFilter === 'PLANNED'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t('home_filter_planned')} ({plannedCount})
            </button>
          </div>
        </div>

        {/* Assigned Activities List */}
        {loadingProgress || loadingTasks ? (
          <div className="p-6 bg-slate-50 rounded-xl text-center text-xs text-slate-400">
            Checking your assigned schedule activities...
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="p-6 bg-white border border-slate-200 rounded-xl text-center text-xs text-slate-500">
            {allActivities.length === 0
              ? 'No schedule activities currently assigned to you for this project.'
              : 'No activities matching the active search or status filter.'}
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredActivities.map((act) => {
              const matchingTask = supervisorTasks.find((t) => t.activity_id === act.activity_id);
              const isManual = matchingTask?.assignment_source === 'manual';

              const safeStatus = (act.status || 'PLANNED').toUpperCase();
              const isTaskCompleted =
                safeStatus === 'COMPLETED' ||
                act.schedule_state === 'completed' ||
                matchingTask?.schedule_state === 'completed' ||
                (act.completion_pct !== undefined && act.completion_pct >= 100);
              return (
                <Card
                  key={act.activity_id}
                  className={`border transition-all bg-white shadow-xs hover:border-oil-500 ${
                    safeStatus === 'COMPLETED'
                      ? 'border-emerald-200/80 bg-emerald-50/10'
                      : safeStatus === 'DELAYED'
                      ? 'border-rose-200 bg-rose-50/10'
                      : 'border-slate-200'
                  }`}
                >
                  <CardContent className="p-3.5 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-xs text-oil-900 bg-oil-50 px-2 py-0.5 rounded border border-oil-200">
                            {act.activity_id}
                          </span>
                          <span className="text-xs font-bold text-slate-900">
                            {translateActivityName(act.activity_id, act.activity_name, language)}
                          </span>
                          {/* Status Badge */}
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              safeStatus === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : safeStatus === 'IN_PROGRESS'
                                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                : safeStatus === 'DELAYED'
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {translateStatus(safeStatus, language)}
                          </span>

                          {/* Dynamic Timeline Assignment Badge */}
                          {(() => {
                            const timelineText =
                              act.assignment_timeline_status ||
                              matchingTask?.assignment_timeline_status ||
                              (safeStatus === 'COMPLETED'
                                ? 'Completed'
                                : (act.starts_in_days && act.starts_in_days > 0) ||
                                  (matchingTask?.starts_in_days && matchingTask.starts_in_days > 0)
                                ? `Assigned after ${act.starts_in_days || matchingTask?.starts_in_days} day${
                                    (act.starts_in_days || matchingTask?.starts_in_days) === 1 ? '' : 's'
                                  }`
                                : 'Assigned (Active Now)');

                            const isQueued =
                              act.schedule_state === 'queued' ||
                              matchingTask?.schedule_state === 'queued' ||
                              String(timelineText || '').startsWith('Assigned after');

                            const isComp = isTaskCompleted;

                            if (isComp) {
                              return (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  {translateTimeline('Completed', undefined, language)}
                                </span>
                              );
                            }

                            if (isQueued) {
                              return (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300 shadow-xs">
                                  <Clock className="w-3 h-3 text-amber-700" />
                                  {translateTimeline(timelineText, act.starts_in_days || matchingTask?.starts_in_days, language)}
                                </span>
                              );
                            }

                            return (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-900 border border-blue-300 shadow-xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                                {translateTimeline(timelineText, undefined, language)}
                              </span>
                            );
                          })()}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                          <span className="font-medium text-slate-700 capitalize">{translateDiscipline(act.discipline, language)}</span>
                          <span>·</span>
                          <span>{language === 'hi' ? 'नियोजित समाप्त:' : 'Planned:'} {act.planned_finish || '—'}</span>
                          {act.actual_finish && (
                            <>
                              <span>·</span>
                              <span className="text-emerald-700 font-medium">{language === 'hi' ? 'वास्तविक समाप्त:' : 'Finished:'} {act.actual_finish}</span>
                            </>
                          )}
                          {act.days_overdue > 0 && (
                            <>
                              <span>·</span>
                              <span className="text-rose-600 font-bold">
                                {act.days_overdue} {language === 'hi' ? 'दिन अतिदेय' : 'd overdue'}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {isManual && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            {language === 'hi' ? 'मैन्युअल पुनः सौंपा गया' : 'Manual Reassigned'}
                          </span>
                        )}

                        {!isTaskCompleted && (
                          <button
                            onClick={() => handleOpenBlockerModal(act.activity_id)}
                            className="px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-1 transition-colors"
                            title="Raise a blocker specifically for this activity"
                          >
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            {t('home_raise_blocker_action')}
                          </button>
                        )}

                        {isTaskCompleted ? (
                          <span
                            className="px-3 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 rounded-lg flex items-center gap-1 cursor-default select-none shadow-xs"
                            title="Activity is completed (100%). Progress cannot be logged again."
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                            {language === 'hi' ? 'पूर्ण · लॉक' : 'Completed · Locked'}
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() =>
                              navigate(
                                `/supervisor/log?activity_id=${act.activity_id}&discipline=${encodeURIComponent(
                                  act.discipline || ''
                                )}&location=${encodeURIComponent(act.location || '')}`
                              )
                            }
                            className="text-xs py-1 px-3 bg-oil-800 hover:bg-oil-900 text-white font-semibold flex items-center gap-1 transition-transform active:scale-95"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            {t('home_log_progress_btn')}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar: Blue for In-Progress, Emerald Green for Completed */}
                    {safeStatus === 'IN_PROGRESS' && (
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-blue-600 h-1.5 rounded-full transition-all"
                          style={{ width: `${Math.max(act.completion_pct || 40, 20)}%` }}
                        />
                      </div>
                    )}
                    {safeStatus === 'COMPLETED' && (
                      <div className="w-full bg-emerald-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-600 h-1.5 rounded-full"
                          style={{ width: '100%' }}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* FEATURE 2: My Blockers & Complaints Section */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <AlertOctagon className="w-4 h-4 text-rose-600" />
              My Raised Blockers &amp; Site Issues ({myComplaints.length})
            </h3>
          </div>

          <button
            onClick={() => handleOpenBlockerModal()}
            className="text-xs text-rose-600 font-bold hover:underline flex items-center gap-1"
          >
            + Raise New Issue
          </button>
        </div>

        {loadingComplaints ? (
          <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400">
            Loading your blockers...
          </div>
        ) : myComplaints.length === 0 ? (
          <div className="p-4 bg-white border border-slate-200 rounded-xl text-center text-xs text-slate-500">
            No blockers currently raised by you. If labor shortage, material delay, or access issues occur, click "Raise Blocker".
          </div>
        ) : (
          <div className="space-y-2">
            {myComplaints.map((comp) => (
              <Card key={comp.id} className="border-slate-200 bg-white shadow-xs">
                <CardContent className="p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-200">
                        {comp.category}
                      </span>
                      {comp.activity_id && (
                        <span className="font-mono text-xs font-bold text-oil-900 bg-oil-50 px-1.5 py-0.2 rounded border border-oil-200">
                          {comp.activity_id}
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400">
                        {new Date(comp.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        comp.status === 'RESOLVED'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : comp.status === 'ACKNOWLEDGED'
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                    >
                      {comp.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-800 font-medium leading-relaxed">
                    "{comp.description}"
                  </p>

                  {/* Planner Response if acknowledged/resolved */}
                  {comp.planner_response && (
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-2 mt-1">
                      <MessageSquare className="w-3.5 h-3.5 text-oil-800 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-bold text-oil-900 text-[11px] block">Planner Response:</span>
                        <span className="text-slate-600 text-xs">{comp.planner_response}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Recent Submissions */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            {t('home_recent_field_logs')}
          </h3>
          <button
            onClick={() => navigate('/supervisor/submissions')}
            className="text-xs text-oil-800 font-semibold hover:underline flex items-center"
          >
            {t('home_view_all_history')} <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-2.5">
          {loadingSubmissions ? (
            <div className="p-6 text-center text-xs text-slate-400">Loading site logs...</div>
          ) : submissions.slice(0, 3).map((sub) => (
            <Card
              key={sub.id}
              onClick={() => navigate(`/supervisor/submissions/${sub.id}`)}
              className="cursor-pointer hover:border-oil-600 transition-all hover:shadow-sm"
            >
              <CardContent className="p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-slate-500">
                    #{sub.id} · {sub.date} · {translateDiscipline(sub.discipline, language)}
                  </span>
                  <StatusPill status={sub.status} />
                </div>
                <p className="text-xs text-slate-800 font-medium line-clamp-2">
                  "{sub.raw_text}"
                </p>
                <div className="pt-1 border-t border-slate-100">
                  <div className="text-[10px] text-slate-500 mb-1 truncate">
                    {language === 'hi' ? 'मैच हुआ:' : 'Matched:'} <span className="font-semibold text-slate-700">{translateActivityName(sub.suggested_activity_id, sub.suggested_activity_name, language) || (language === 'hi' ? 'मैच की प्रतीक्षा है' : 'Awaiting match')}</span>
                  </div>
                  <ConfidenceBar score={sub.confidence} size="sm" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Raise Blocker / Complaint Modal */}
      {isBlockerModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-700">
                <AlertOctagon className="w-5 h-5" />
                <h3 className="font-bold text-slate-900 text-sm">{t('home_modal_blocker_title')}</h3>
              </div>
              <button
                onClick={() => setIsBlockerModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {blockerSuccessMsg ? (
              <div className="py-8 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6 stroke-[3]" />
                </div>
                <div className="font-bold text-slate-900 text-sm">{blockerSuccessMsg}</div>
                <p className="text-xs text-slate-500">{language === 'hi' ? 'खिड़की बंद हो रही है...' : 'Closing window...'}</p>
              </div>
            ) : (
              <form onSubmit={handleBlockerSubmit} className="mt-4 space-y-4">
                <p className="text-xs text-slate-500">
                  {language === 'hi'
                    ? 'सामग्री की कमी, श्रमिकों की अनुपलब्धता या परमिट में देरी जैसी समस्याओं को सीधे प्लानर कॉकपिट में दर्ज करें।'
                    : 'Log operational issues (material delays, labor shortage, access permits) directly to the Planner Cockpit.'}
                </p>

                {/* Blocker Category */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('home_modal_category')} *
                  </label>
                  <select
                    value={blockerCategory}
                    onChange={(e) => setBlockerCategory(e.target.value as ComplaintCategory)}
                    className="w-full text-xs font-semibold border border-slate-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-oil-600 focus:outline-none"
                  >
                    <option value="MATERIAL">{language === 'hi' ? 'सामग्री देरी / कमी (पाइप, फिटिंग, केबल)' : 'Material Delay / Shortage (e.g. pipes, fittings, cable)'}</option>
                    <option value="LABOR">{language === 'hi' ? 'श्रमिकों की कमी / अनुपस्थिति (फिटर, वेल्डर, रिगर)' : 'Labor Shortage / Absenteeism (fitters, welders, riggers)'}</option>
                    <option value="ACCESS">{language === 'hi' ? 'साइट पहुंच / सिविल क्लीयरेंस / परमिट (PTW)' : 'Site Access / Civil Clearance / Permit to Work (PTW)'}</option>
                    <option value="EQUIPMENT">{language === 'hi' ? 'उपकरण खराबी / मोबिलाइज़ेशन (क्रेन, कंप्रेसर)' : 'Equipment Breakdown / Mobilization (cranes, compressors)'}</option>
                    <option value="SAFETY">{language === 'hi' ? 'सुरक्षा रोक / मौसम व्यवधान (HSE रोक, भारी बारिश)' : 'Safety Hold / Weather Stoppage (HSE stop, heavy rain)'}</option>
                    <option value="OTHER">{language === 'hi' ? 'अन्य परिचालन व्यवधान' : 'Other Operational Disruption'}</option>
                  </select>
                </div>

                {/* Linked Activity */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'hi' ? 'विशिष्ट सौंपी गई गतिविधि से लिंक करें (वैकल्पिक)' : 'Link to Specific Assigned Activity (Optional)'}
                  </label>
                  <select
                    value={blockerActivityId}
                    onChange={(e) => setBlockerActivityId(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-oil-600 focus:outline-none"
                  >
                    <option value="">{language === 'hi' ? '-- सामान्य साइट समस्या (कोई विशिष्ट गतिविधि नहीं) --' : '-- General Site Issue (No specific activity) --'}</option>
                    {allActivities.map((act) => (
                      <option key={act.activity_id} value={act.activity_id}>
                        {act.activity_id} — {translateActivityName(act.activity_id, act.activity_name, language)} ({translateStatus(act.status, language)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Detailed Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('home_modal_desc')} *
                  </label>
                  <textarea
                    rows={4}
                    value={blockerDescription}
                    onChange={(e) => setBlockerDescription(e.target.value)}
                    placeholder={t('home_modal_desc_placeholder')}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-oil-600 focus:outline-none leading-relaxed"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsBlockerModalOpen(false)}
                    className="text-xs"
                  >
                    {t('home_modal_cancel')}
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={raiseComplaintMutation.isPending || !blockerDescription.trim()}
                    isLoading={raiseComplaintMutation.isPending}
                    className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {t('home_modal_submit')}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Delayed Activities Notification Pop-Up Modal */}
      {isDelayedModalOpen && delayedActivitiesList.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border-2 border-rose-500 overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp">
            {/* Header */}
            <div className="bg-gradient-to-r from-rose-700 via-rose-600 to-[#9e1218] p-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shadow-inner shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-300 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-black leading-tight flex items-center gap-1.5 flex-wrap">
                    <span>{language === 'hi' ? 'विलंबित कार्य चेतावनी सूचना' : 'Delayed Activities Alert'}</span>
                    <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase shadow-2xs">
                      {delayedActivitiesList.length} {language === 'hi' ? 'कार्य' : 'Tasks'}
                    </span>
                  </h3>
                  <p className="text-xs text-rose-100 mt-0.5">
                    {language === 'hi'
                      ? 'आपकी अनुसूची में निम्नलिखित गतिविधियाँ समय से पीछे हैं।'
                      : 'Activities flagged behind baseline schedule requiring immediate attention.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDelayedModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content List */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1 divide-y divide-slate-100">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 flex items-start gap-2.5">
                <AlertOctagon className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <strong className="font-bold text-amber-900">
                    {language === 'hi' ? 'तत्काल पर्यवेक्षक कार्रवाई आवश्यक:' : 'Immediate Supervisor Action Required:'}
                  </strong>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    {language === 'hi'
                      ? 'यदि कार्य आगे बढ़ गया है तो वास्तविक साइट प्रगति तुरंत लॉग करें, अथवा केंद्रीय योजनाकार को सामग्री, श्रमिक या परमिट बाधा दर्ज करें।'
                      : 'Log progress update if site execution has resumed, or raise an operational blocker so central planners can resequence.'}
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                {delayedActivitiesList.map((act) => (
                  <div
                    key={act.activity_id}
                    className="p-3 bg-rose-50/50 rounded-xl border border-rose-200/80 hover:border-rose-300 transition-all space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-xs font-bold text-rose-950 bg-rose-200/70 px-1.5 py-0.5 rounded">
                            {act.activity_id}
                          </span>
                          {act.discipline && (
                            <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                              {act.discipline}
                            </span>
                          )}
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded uppercase">
                            {act.days_overdue ? `${act.days_overdue}d Overdue` : 'Delayed'}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 mt-1 line-clamp-2">
                          {translateActivityName(act.activity_id, act.activity_name, language)}
                        </h4>
                      </div>
                    </div>

                    {/* Meta & Quick Action Buttons */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-rose-100/70 flex-wrap text-xs">
                      <div className="text-[11px] text-slate-500">
                        {act.progress_percent !== undefined && (
                          <span>Progress: <strong className="text-slate-800">{act.progress_percent}%</strong></span>
                        )}
                        {act.planned_finish && (
                          <span className="ml-2">Planned: <strong className="text-slate-800">{act.planned_finish}</strong></span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 ml-auto">
                        <button
                          onClick={() => {
                            setIsDelayedModalOpen(false);
                            handleOpenBlockerModal(act.activity_id);
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <AlertOctagon className="w-3 h-3 text-rose-700" />
                          {language === 'hi' ? 'बाधा दर्ज करें' : 'Raise Blocker'}
                        </button>
                        <button
                          onClick={() => {
                            setIsDelayedModalOpen(false);
                            navigate(`/supervisor/log?activity_id=${encodeURIComponent(act.activity_id)}`);
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#9e1218] hover:bg-[#830f14] text-white transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                        >
                          <Mic className="w-3 h-3 text-white" />
                          {language === 'hi' ? 'प्रगति लॉग करें' : 'Log Progress'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsDelayedModalOpen(false);
                  setStatusFilter('DELAYED');
                }}
                className="text-xs text-rose-800 border-rose-300 hover:bg-rose-50 font-bold flex items-center gap-1"
              >
                <Filter className="w-3.5 h-3.5 mr-1" />
                {language === 'hi' ? 'विलंबित कार्य फ़िल्टर करें' : 'Filter Delayed Tasks'}
              </Button>

              <Button
                size="sm"
                onClick={() => setIsDelayedModalOpen(false)}
                className="text-xs bg-slate-800 hover:bg-slate-900 text-white font-bold"
              >
                {language === 'hi' ? 'स्वीकार करें और बंद करें' : 'Acknowledge & Close'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
