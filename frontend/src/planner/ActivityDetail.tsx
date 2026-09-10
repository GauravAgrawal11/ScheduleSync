import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, Activity } from '../api/client';
import { useProjectStore } from './projectStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { ConfidenceBar } from '../components/ui/ConfidenceBar';
import { Button } from '../components/ui/Button';
import {
  History,
  ShieldCheck,
  UserCheck,
  Calendar,
  Clock,
  ArrowRight,
  Tag,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Wrench,
  HardHat,
  Zap,
  MapPin,
  Check,
  X,
  User,
  Sparkles,
} from 'lucide-react';

export const ActivityDetail: React.FC = () => {
  const { selectedProjectId, selectedProjectName } = useProjectStore();

  const [selectedActivityId, setSelectedActivityId] = useState<string>('L6-PIP-101');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'IN_PROGRESS' | 'DELAYED' | 'PLANNED'>('ALL');
  const [disciplineFilter, setDisciplineFilter] = useState<'ALL' | 'PIPING' | 'CIVIL' | 'ELECTRICAL'>('ALL');

  // Fetch all activities for current project (page 1, size 100 to get all 36)
  const { data: activitiesData, isLoading: loadingActivities } = useQuery({
    queryKey: ['activities-all', selectedProjectId],
    queryFn: () => api.getActivities(selectedProjectId, 1, 100),
  });

  // Fetch historical forecast for currently selected activity
  const { data: forecast } = useQuery({
    queryKey: ['activity-forecast', selectedActivityId],
    queryFn: () => api.getActivityForecast(selectedActivityId),
    enabled: !!selectedActivityId,
  });

  // Fetch workload to get supervisor assignment mapping
  const { data: workloadRows = [] } = useQuery({
    queryKey: ['supervisor-workload', selectedProjectId],
    queryFn: () => api.getAdminWorkloadView(selectedProjectId),
  });

  // Map activity_id to supervisor assignment details
  const activitySupervisorMap = useMemo(() => {
    const map = new Map<string, {
      supervisor_id: number;
      supervisor_name: string;
      supervisor_email: string;
      discipline: string;
      assignment_source: string;
      assigned_by_name?: string;
      starts_in_days?: number;
      schedule_state?: string;
      assignment_timeline_status?: string;
    }>();

    workloadRows.forEach((row) => {
      row.activities?.forEach((act) => {
        if (!map.has(act.activity_id)) {
          map.set(act.activity_id, {
            supervisor_id: row.supervisor_id,
            supervisor_name: row.supervisor_name,
            supervisor_email: row.supervisor_email,
            discipline: row.discipline,
            assignment_source: act.assignment_source,
            assigned_by_name: act.assigned_by_name,
            starts_in_days: act.starts_in_days,
            schedule_state: act.schedule_state,
            assignment_timeline_status: act.assignment_timeline_status,
          });
        }
      });
    });

    return map;
  }, [workloadRows]);

  const rawActivities = activitiesData?.activities || [];

  // Determine enhanced status for each activity
  const activitiesWithMeta = useMemo(() => {
    return rawActivities.map((act) => {
      let computedStatus: 'COMPLETED' | 'IN_PROGRESS' | 'DELAYED' | 'PLANNED' = 'PLANNED';
      const rawStatus = (act.status || '').toUpperCase();

      if (rawStatus === 'COMPLETED' || Boolean(act.actual_finish)) {
        computedStatus = 'COMPLETED';
      } else if (rawStatus === 'IN_PROGRESS' || rawStatus === 'IN PROGRESS') {
        computedStatus = 'IN_PROGRESS';
      } else if (rawStatus === 'DELAYED') {
        computedStatus = 'DELAYED';
      } else {
        computedStatus = 'PLANNED';
      }

      // Check if actual duration or delay reason marked it delayed
      const isDelayed = computedStatus === 'DELAYED' || act.trend === 'worsening';

      return {
        ...act,
        normalizedStatus: isDelayed ? 'DELAYED' : computedStatus,
        supervisor: activitySupervisorMap.get(act.activity_id),
      };
    });
  }, [rawActivities, activitySupervisorMap]);

  // Status counts
  const totalCount = activitiesWithMeta.length;
  const completedCount = activitiesWithMeta.filter((a) => a.normalizedStatus === 'COMPLETED').length;
  const inProgressCount = activitiesWithMeta.filter((a) => a.normalizedStatus === 'IN_PROGRESS').length;
  const delayedCount = activitiesWithMeta.filter((a) => a.normalizedStatus === 'DELAYED').length;
  const plannedCount = activitiesWithMeta.filter((a) => a.normalizedStatus === 'PLANNED').length;

  // Filtered activities for master list
  const filteredActivities = useMemo(() => {
    return activitiesWithMeta.filter((act) => {
      // Search
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        q === '' ||
        act.activity_id.toLowerCase().includes(q) ||
        act.activity_name.toLowerCase().includes(q) ||
        (act.location && act.location.toLowerCase().includes(q)) ||
        (act.wbs_code && act.wbs_code.toLowerCase().includes(q));

      // Status
      const matchesStatus =
        statusFilter === 'ALL' || act.normalizedStatus === statusFilter;

      // Discipline
      const matchesDiscipline =
        disciplineFilter === 'ALL' ||
        (act.discipline && act.discipline.toUpperCase() === disciplineFilter);

      return matchesSearch && matchesStatus && matchesDiscipline;
    });
  }, [activitiesWithMeta, searchQuery, statusFilter, disciplineFilter]);

  // Selected Activity
  const currentAct = useMemo(() => {
    return (
      activitiesWithMeta.find((a) => a.activity_id === selectedActivityId) ||
      filteredActivities[0] ||
      activitiesWithMeta[0]
    );
  }, [activitiesWithMeta, selectedActivityId, filteredActivities]);

  // Fetch history for selected activity
  const { data: history = [], isLoading: loadingHistory } = useQuery({
    queryKey: ['activity-history', currentAct?.activity_id],
    queryFn: () => (currentAct?.activity_id ? api.getActivityHistory(currentAct.activity_id) : Promise.resolve([])),
    enabled: Boolean(currentAct?.activity_id),
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-oil-900 text-white uppercase tracking-wider flex items-center gap-1">
              <History className="w-3 h-3" /> Activity Intelligence
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Project #{selectedProjectId} · {selectedProjectName}
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Schedule Activities &amp; Chronological Audit Timeline
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl">
            Explore all schedule activities (completed, in progress, delayed, planned) with assigned supervisors and immutable chronological site audit events.
          </p>
        </div>

        {/* Quick KPI stats */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-center min-w-[70px]">
            <div className="text-[10px] font-bold uppercase text-slate-400">Total</div>
            <div className="text-base font-black text-slate-900 font-mono">{totalCount}</div>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center min-w-[70px]">
            <div className="text-[10px] font-bold uppercase text-emerald-600">Completed</div>
            <div className="text-base font-black text-emerald-700 font-mono">{completedCount}</div>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-center min-w-[70px]">
            <div className="text-[10px] font-bold uppercase text-blue-600">Active</div>
            <div className="text-base font-black text-blue-700 font-mono">{inProgressCount}</div>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-center min-w-[70px]">
            <div className="text-[10px] font-bold uppercase text-rose-600">Delayed</div>
            <div className="text-base font-black text-rose-700 font-mono">{delayedCount}</div>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Left Master Selector, Right Detail & Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Activity Directory (5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 space-y-2.5">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search 36 activities by ID, name, location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-oil-600 bg-white"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px]">
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-2.5 py-1 rounded-md font-bold transition-all whitespace-nowrap ${
                    statusFilter === 'ALL'
                      ? 'bg-oil-900 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  All ({totalCount})
                </button>
                <button
                  onClick={() => setStatusFilter('COMPLETED')}
                  className={`px-2.5 py-1 rounded-md font-bold transition-all whitespace-nowrap ${
                    statusFilter === 'COMPLETED'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  Completed ({completedCount})
                </button>
                <button
                  onClick={() => setStatusFilter('IN_PROGRESS')}
                  className={`px-2.5 py-1 rounded-md font-bold transition-all whitespace-nowrap ${
                    statusFilter === 'IN_PROGRESS'
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                  }`}
                >
                  In Progress ({inProgressCount})
                </button>
                <button
                  onClick={() => setStatusFilter('DELAYED')}
                  className={`px-2.5 py-1 rounded-md font-bold transition-all whitespace-nowrap ${
                    statusFilter === 'DELAYED'
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                  }`}
                >
                  Delayed ({delayedCount})
                </button>
                <button
                  onClick={() => setStatusFilter('PLANNED')}
                  className={`px-2.5 py-1 rounded-md font-bold transition-all whitespace-nowrap ${
                    statusFilter === 'PLANNED'
                      ? 'bg-slate-700 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Planned ({plannedCount})
                </button>
              </div>

              {/* Discipline Filter Pills */}
              <div className="flex items-center gap-1.5 text-[10px] font-bold">
                <span className="text-slate-400 uppercase tracking-wider">Discipline:</span>
                <button
                  onClick={() => setDisciplineFilter('ALL')}
                  className={`px-2 py-0.5 rounded transition-all ${
                    disciplineFilter === 'ALL'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setDisciplineFilter('PIPING')}
                  className={`px-2 py-0.5 rounded transition-all ${
                    disciplineFilter === 'PIPING'
                      ? 'bg-amber-600 text-white'
                      : 'text-amber-700 hover:bg-amber-100'
                  }`}
                >
                  Piping
                </button>
                <button
                  onClick={() => setDisciplineFilter('CIVIL')}
                  className={`px-2 py-0.5 rounded transition-all ${
                    disciplineFilter === 'CIVIL'
                      ? 'bg-blue-600 text-white'
                      : 'text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  Civil
                </button>
                <button
                  onClick={() => setDisciplineFilter('ELECTRICAL')}
                  className={`px-2 py-0.5 rounded transition-all ${
                    disciplineFilter === 'ELECTRICAL'
                      ? 'bg-purple-600 text-white'
                      : 'text-purple-700 hover:bg-purple-100'
                  }`}
                >
                  Electrical
                </button>
              </div>
            </div>

            {/* Activities Scrollable Directory */}
            <div className="max-h-[700px] overflow-y-auto divide-y divide-slate-100">
              {loadingActivities ? (
                <div className="p-8 text-center text-xs text-slate-400">Loading activities...</div>
              ) : filteredActivities.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 italic">
                  No activities matching current search or filters.
                </div>
              ) : (
                filteredActivities.map((act) => {
                  const isSelected = act.activity_id === currentAct?.activity_id;

                  return (
                    <div
                      key={act.activity_id}
                      onClick={() => setSelectedActivityId(act.activity_id)}
                      className={`p-3.5 cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-oil-50/80 border-l-4 border-l-oil-800 shadow-inner'
                          : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-oil-900 bg-oil-100/70 px-1.5 py-0.2 rounded border border-oil-200">
                            {act.activity_id}
                          </span>
                          <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                            {act.discipline}
                          </span>
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                            act.normalizedStatus === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : act.normalizedStatus === 'IN_PROGRESS'
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : act.normalizedStatus === 'DELAYED'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {act.normalizedStatus.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="text-xs font-bold text-slate-900 line-clamp-1">
                        {act.activity_name}
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-1.5 text-[11px] text-slate-500">
                        <span className="truncate max-w-[160px]">{act.location || 'Unit 3 Site'}</span>
                        {act.supervisor ? (
                          <span className="text-slate-700 font-medium truncate max-w-[140px]">
                            {act.supervisor.supervisor_name}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: Activity Details & Chronological Audit Timeline (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {currentAct ? (
            <>
              {/* Detailed Activity Header Card */}
              <Card className="border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-black text-oil-900 bg-oil-100 px-2.5 py-1 rounded-md border border-oil-300 shadow-xs">
                        {currentAct.activity_id}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">
                        WBS: <strong className="text-slate-700">{currentAct.wbs_code || '1.3.1'}</strong>
                      </span>
                      <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-slate-200/80 text-slate-800">
                        {currentAct.discipline}
                      </span>
                    </div>

                    {/* Status Pill */}
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider self-start sm:self-center ${
                        currentAct.normalizedStatus === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : currentAct.normalizedStatus === 'IN_PROGRESS'
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : currentAct.normalizedStatus === 'DELAYED'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {currentAct.normalizedStatus.replace('_', ' ')}
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-slate-900 tracking-tight leading-snug">
                    {currentAct.activity_name}
                  </h3>

                  <div className="flex items-center gap-4 text-xs text-slate-600 flex-wrap">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      Location: <strong>{currentAct.location || 'Unit 3 & Offsites'}</strong>
                    </span>
                    {currentAct.trend && (
                      <span className="flex items-center gap-1">
                        Trend: <strong className="capitalize">{currentAct.trend}</strong>
                      </span>
                    )}
                  </div>

                  {/* Historical Forecasting Badge */}
                  {forecast && (
                    <div
                      className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs transition-all ${
                        forecast.forecast_status === 'at_risk'
                          ? 'bg-rose-50/90 border-rose-200 text-rose-950 shadow-xs'
                          : 'bg-emerald-50/90 border-emerald-200 text-emerald-950 shadow-xs'
                      }`}
                    >
                      <Sparkles
                        className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                          forecast.forecast_status === 'at_risk' ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap font-bold">
                          <span className="text-slate-800">Historical Forecast:</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide ${
                              forecast.forecast_status === 'at_risk'
                                ? 'bg-rose-200 text-rose-900 border border-rose-300'
                                : 'bg-emerald-200 text-emerald-900 border border-emerald-300'
                            }`}
                          >
                            {forecast.forecast_status === 'at_risk' ? '⚠️ At Risk' : '✓ On Track per History'}
                          </span>
                          <span className="font-mono text-[11px] text-slate-600">
                            Hist Avg: <strong className="text-slate-900">{forecast.historical_average_days}d</strong> ({forecast.matched_historical_count} similar activities)
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-700 leading-relaxed font-medium">
                          {forecast.reason}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Schedule Schedule & Assignment Metadata */}
                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 p-4 text-xs bg-white">
                  {/* Schedule Dates */}
                  <div className="space-y-2 pr-0 sm:pr-4 pb-3 sm:pb-0">
                    <div className="font-bold text-slate-400 uppercase text-[10px]">
                      Schedule Schedule
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Planned Start:</span>
                        <strong className="text-slate-800 font-mono">{currentAct.planned_start || '—'}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Planned Finish:</span>
                        <strong className="text-slate-800 font-mono">{currentAct.planned_finish || '—'}</strong>
                      </div>
                      {currentAct.actual_start && (
                        <div className="flex justify-between text-blue-700 font-semibold">
                          <span>Actual Start:</span>
                          <span className="font-mono">{currentAct.actual_start}</span>
                        </div>
                      )}
                      {currentAct.actual_finish && (
                        <div className="flex justify-between text-emerald-700 font-bold">
                          <span>Actual Finish:</span>
                          <span className="font-mono">{currentAct.actual_finish}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Assigned Supervisor */}
                  <div className="space-y-2 pl-0 sm:pl-4 pt-3 sm:pt-0">
                    <div className="font-bold text-slate-400 uppercase text-[10px]">
                      Assigned Supervisor
                    </div>
                    {currentAct.supervisor ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          <User className="w-3.5 h-3.5 text-oil-800" />
                          <span>{currentAct.supervisor.supervisor_name}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {currentAct.supervisor.supervisor_email}
                        </div>
                        <div className="pt-1 flex flex-col gap-1.5 items-start">
                          {currentAct.supervisor.assignment_timeline_status ? (
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                currentAct.supervisor.schedule_state === 'queued' ||
                                currentAct.supervisor.assignment_timeline_status.startsWith('Assigned after')
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-xs'
                                  : currentAct.supervisor.schedule_state === 'completed' ||
                                    currentAct.normalizedStatus === 'COMPLETED'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-blue-100 text-blue-900 border border-blue-300 shadow-xs'
                              }`}
                            >
                              {currentAct.supervisor.schedule_state === 'queued' ||
                              currentAct.supervisor.assignment_timeline_status.startsWith('Assigned after') ? (
                                <Clock className="w-3 h-3 text-amber-700" />
                              ) : currentAct.supervisor.schedule_state === 'completed' ||
                                currentAct.normalizedStatus === 'COMPLETED' ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                              )}
                              {currentAct.supervisor.assignment_timeline_status}
                            </span>
                          ) : null}

                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              currentAct.supervisor.assignment_source === 'manual'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {currentAct.supervisor.assignment_source === 'manual'
                              ? `Manual Reassigned (${currentAct.supervisor.assigned_by_name || 'Planner'})`
                              : 'Auto-Assigned (Discipline & Workload)'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-slate-400 italic">No supervisor assigned yet.</div>
                    )}
                  </div>
                </div>
              </Card>

              {/* Chronological Audit Trail Timeline Card */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <History className="w-4 h-4 text-oil-800" />
                        Chronological Site Audit Log ({history.length} Events)
                      </CardTitle>
                      <CardDescription>
                        Immutable event history with on-site foreman reports, AI match confidence, and planner verifications.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-6">
                  {loadingHistory ? (
                    <div className="p-8 text-center text-xs text-slate-400">Loading audit history...</div>
                  ) : history.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500 space-y-2 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                      <Clock className="w-6 h-6 text-slate-400 mx-auto" />
                      <p className="font-semibold text-slate-700">No on-site progress events recorded yet for this activity.</p>
                      <p className="text-[11px] text-slate-400">
                        When the assigned supervisor logs progress (via voice, photo, or text) and it passes review, entries will appear chronologically here.
                      </p>
                    </div>
                  ) : (
                    <div className="relative pl-6 border-l-2 border-slate-200 space-y-6">
                      {history.map((event) => (
                        <div key={event.id} className="relative group">
                          {/* Timeline dot */}
                          <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-white border-2 border-oil-800 group-hover:bg-oil-800 transition-colors flex items-center justify-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-oil-800 group-hover:bg-white" />
                          </div>

                          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 hover:border-oil-400 transition-all space-y-2.5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                              <span className="text-xs font-bold text-oil-900 flex items-center gap-1.5">
                                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                {event.event_type}
                              </span>
                              <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {event.event_date}
                              </span>
                            </div>

                            <p className="text-xs text-slate-800 font-medium leading-relaxed bg-white p-3 rounded-lg border border-slate-200/60">
                              "{event.description}"
                            </p>

                            <div className="pt-2 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500">
                              <div className="flex items-center gap-3">
                                <span>
                                  Logged by: <strong>{event.logged_by}</strong>
                                </span>
                                {event.approved_by && (
                                  <span className="text-emerald-700 font-semibold">
                                    Approved by: {event.approved_by}
                                  </span>
                                )}
                              </div>

                              <div className="w-36">
                                <ConfidenceBar score={event.confidence} size="sm" />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="p-12 text-center text-xs text-slate-400">
              Select an activity from the directory on the left to inspect details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
