import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, AdminWorkloadRow, SupervisorWorkloadActivity, AssignmentHistoryItem } from '../api/client';
import { useProjectStore } from './projectStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRightLeft,
  ChevronDown,
  ChevronRight,
  History,
  ShieldAlert,
  Calendar,
  Layers,
  Check,
  Zap,
  Wrench,
  HardHat,
  Filter,
  ExternalLink,
} from 'lucide-react';

export const SupervisorWorkload: React.FC = () => {
  const { selectedProjectId, selectedProjectName } = useProjectStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [expandedRowKey, setExpandedRowKey] = useState<string | null>(null);
  const [reassignModalActivity, setReassignModalActivity] = useState<SupervisorWorkloadActivity | null>(null);
  const [selectedTargetSupervisorId, setSelectedTargetSupervisorId] = useState<number | null>(null);
  const [reassignReason, setReassignReason] = useState<string>('');
  const [historyModalActivityId, setHistoryModalActivityId] = useState<string | null>(null);
  const [runSummary, setRunSummary] = useState<any | null>(null);

  // Fetch admin workload view
  const { data: workloadRows = [], isLoading } = useQuery({
    queryKey: ['supervisor-workload', selectedProjectId],
    queryFn: () => api.getAdminWorkloadView(selectedProjectId),
  });

  // Fetch all supervisors for the reassignment picker
  const allSupervisors = React.useMemo(() => {
    const map = new Map<number, { id: number; name: string; discipline: string; email: string }>();
    workloadRows.forEach((r) => {
      const formattedDisc = r.discipline.charAt(0).toUpperCase() + r.discipline.slice(1).toLowerCase();
      if (!map.has(r.supervisor_id)) {
        map.set(r.supervisor_id, {
          id: r.supervisor_id,
          name: r.supervisor_name,
          discipline: formattedDisc,
          email: r.supervisor_email,
        });
      }
    });

    const standardSupervisors = [
      { id: 4, name: 'Supervisor 1 - Piping', discipline: 'Piping', email: 'piping.sup1@oilindia.in' },
      { id: 5, name: 'Supervisor 2 - Piping', discipline: 'Piping', email: 'piping.sup2@oilindia.in' },
      { id: 2, name: 'Supervisor 1 - Civil', discipline: 'Civil', email: 'supervisor@oilindia.in' },
      { id: 6, name: 'Supervisor 2 - Civil', discipline: 'Civil', email: 'civil.sup2@oilindia.in' },
      { id: 7, name: 'Supervisor 1 - Electrical', discipline: 'Electrical', email: 'electrical.sup1@oilindia.in' },
      { id: 8, name: 'Supervisor 2 - Electrical', discipline: 'Electrical', email: 'electrical.sup2@oilindia.in' },
    ];

    standardSupervisors.forEach((s) => {
      if (!map.has(s.id)) {
        map.set(s.id, s);
      }
    });

    return Array.from(map.values());
  }, [workloadRows]);

  const [disciplineFilter, setDisciplineFilter] = useState<'ALL' | 'PIPING' | 'CIVIL' | 'ELECTRICAL'>('ALL');

  // Filter and group rows by discipline
  const filteredWorkloadRows = React.useMemo(() => {
    let rows = workloadRows;
    if (disciplineFilter !== 'ALL') {
      rows = rows.filter((r) => r.discipline.toUpperCase() === disciplineFilter);
    }
    return rows;
  }, [workloadRows, disciplineFilter]);

  const rowsByDiscipline = React.useMemo(() => {
    const map = new Map<string, typeof workloadRows>();
    const standardOrder = ['Piping', 'Civil', 'Electrical'];
    standardOrder.forEach((d) => {
      if (disciplineFilter === 'ALL' || disciplineFilter === d.toUpperCase()) {
        map.set(d, []);
      }
    });

    filteredWorkloadRows.forEach((r) => {
      const disc = r.discipline.charAt(0).toUpperCase() + r.discipline.slice(1).toLowerCase();
      if (!map.has(disc)) map.set(disc, []);
      map.get(disc)!.push(r);
    });
    return map;
  }, [filteredWorkloadRows, disciplineFilter]);

  // Run auto-assignment mutation
  const runAutoAssignMutation = useMutation({
    mutationFn: () => api.runAssignment(selectedProjectId),
    onSuccess: (data) => {
      setRunSummary(data);
      queryClient.invalidateQueries({ queryKey: ['supervisor-workload', selectedProjectId] });
      queryClient.invalidateQueries({ queryKey: ['analytics-summary', selectedProjectId] });
    },
  });

  // Manual reassign mutation
  const reassignMutation = useMutation({
    mutationFn: ({ activityId, newSupId, reason }: { activityId: string; newSupId: number; reason?: string }) =>
      api.reassignActivity(activityId, newSupId, reason),
    onSuccess: (data) => {
      setReassignModalActivity(null);
      setSelectedTargetSupervisorId(null);
      setReassignReason('');
      queryClient.invalidateQueries({ queryKey: ['supervisor-workload', selectedProjectId] });
    },
  });

  // History query
  const { data: activityHistory = [], isLoading: loadingHistory } = useQuery<AssignmentHistoryItem[]>({
    queryKey: ['activity-assignment-history', historyModalActivityId],
    queryFn: () => (historyModalActivityId ? api.getActivityAssignmentHistory(historyModalActivityId) : Promise.resolve([])),
    enabled: Boolean(historyModalActivityId),
  });

  const totalAssignedActivities = workloadRows.reduce((sum, r) => sum + r.total_activities, 0);
  const totalCompletedActs = workloadRows.reduce((sum, r) => sum + (r.completed_count || 0), 0);
  const totalInProgressActs = Math.max(0, totalAssignedActivities - totalCompletedActs);

  return (
    <div className="space-y-6">
      {/* Top Header with Auto-Assign Trigger Checkpoint */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-oil-900 text-white uppercase tracking-wider">
              Resource Workload Engine
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Project #{selectedProjectId}
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
            Supervisor Workload &amp; Dynamic Assignment
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Automatic workload distribution by discipline with balanced task scheduling, dynamic timeline queuing, and full planner manual overrides.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => runAutoAssignMutation.mutate()}
            isLoading={runAutoAssignMutation.isPending}
            size="sm"
            className="bg-oil-800 hover:bg-oil-900 text-white font-bold text-xs flex items-center gap-2 shadow-sm"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Auto-Assign Supervisors
          </Button>
        </div>
      </div>

      {/* Auto-Assignment Result Alert */}
      {runSummary && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm text-emerald-900">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Auto-Assignment Completed Successfully!
            </div>
            <button
              onClick={() => setRunSummary(null)}
              className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold"
            >
              Dismiss
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs pt-1 border-t border-emerald-200">
            <div>
              <span className="text-emerald-700">Total Assigned: </span>
              <strong className="text-emerald-950">{runSummary.total_assigned} activities</strong>
            </div>
            <div>
              <span className="text-emerald-700">Unassigned (No Supervisor): </span>
              <strong className="text-emerald-950">{runSummary.unassigned_no_supervisor} activities</strong>
            </div>
            <div>
              <span className="text-emerald-700">Allocation Model: </span>
              <strong className="text-emerald-950 font-bold">
                Flexible Shifts (Balanced)
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <Card className="p-4 bg-white border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-slate-500" /> Active Supervisors
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
            {allSupervisors.length}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Discipline matched</div>
        </Card>

        <Card className="p-4 bg-white border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-500" /> Assigned Activities
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
            {totalAssignedActivities}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Across all project weeks</div>
        </Card>

        <Card className="p-4 bg-blue-50/70 border-blue-200 shadow-sm">
          <div className="text-xs font-semibold text-blue-800 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-blue-600" /> In Progress / Active Tasks
          </div>
          <div className="text-2xl font-black text-blue-950 mt-1 font-mono">
            {totalInProgressActs}
          </div>
          <div className="text-[10px] text-blue-700 mt-0.5">Active site activities</div>
        </Card>

        <Card className="p-4 bg-emerald-50/70 border-emerald-200 shadow-sm">
          <div className="text-xs font-semibold text-emerald-800 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Completed &amp; Verified
          </div>
          <div className="text-2xl font-black text-emerald-950 mt-1 font-mono">
            {totalCompletedActs}
          </div>
          <div className="text-[10px] text-emerald-700 mt-0.5">100% matched site completions</div>
        </Card>
      </div>

      {/* Main Supervisor Workload Table */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-oil-800" />
                Discipline-Based Supervisor Allocation (Piping, Civil, Electrical)
              </CardTitle>
              <CardDescription>
                Workload organized by discipline with primary &amp; secondary supervisors (Supervisor 1 &amp; Supervisor 2). Directly inspect live field views.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        {/* Discipline Filter Tabs & Active Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" /> Discipline Filter:
            </span>
            <button
              onClick={() => setDisciplineFilter('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                disciplineFilter === 'ALL'
                  ? 'bg-oil-800 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Disciplines ({allSupervisors.length})
            </button>
            <button
              onClick={() => setDisciplineFilter('PIPING')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                disciplineFilter === 'PIPING'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300'
              }`}
            >
              <Wrench className="w-3.5 h-3.5 text-amber-500" />
              Piping (Supervisor 1 &amp; 2)
            </button>
            <button
              onClick={() => setDisciplineFilter('CIVIL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                disciplineFilter === 'CIVIL'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-800 hover:border-blue-300'
              }`}
            >
              <HardHat className="w-3.5 h-3.5 text-blue-500" />
              Civil (Supervisor 1 &amp; 2)
            </button>
            <button
              onClick={() => setDisciplineFilter('ELECTRICAL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                disciplineFilter === 'ELECTRICAL'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-purple-50 hover:text-purple-800 hover:border-purple-300'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-purple-500" />
              Electrical (Supervisor 1 &amp; 2)
            </button>
          </div>
        </div>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading workload matrix...</div>
          ) : workloadRows.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500 space-y-3">
              <p>No supervisor assignments created yet for this project.</p>
              <Button
                onClick={() => runAutoAssignMutation.mutate()}
                isLoading={runAutoAssignMutation.isPending}
                size="sm"
                className="bg-oil-800 text-white font-bold text-xs"
              >
                Click to Auto-Assign Baseline
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {Array.from(rowsByDiscipline.entries()).map(([discipline, rows]) => {
                const isPiping = discipline.toLowerCase() === 'piping';
                const isCivil = discipline.toLowerCase() === 'civil';
                const isElectrical = discipline.toLowerCase() === 'electrical';
                const discTotalActivities = rows.reduce((sum, r) => sum + r.total_activities, 0);
                const discTotalDays = rows.reduce((sum, r) => sum + r.total_duration_days, 0);

                const theme = isPiping
                  ? {
                      bg: 'bg-amber-50/70',
                      border: 'border-amber-200',
                      text: 'text-amber-950',
                      badgeBg: 'bg-amber-100',
                      badgeText: 'text-amber-800',
                      badgeBorder: 'border-amber-300',
                      icon: Wrench,
                    }
                  : isCivil
                  ? {
                      bg: 'bg-blue-50/70',
                      border: 'border-blue-200',
                      text: 'text-blue-950',
                      badgeBg: 'bg-blue-100',
                      badgeText: 'text-blue-800',
                      badgeBorder: 'border-blue-300',
                      icon: HardHat,
                    }
                  : {
                      bg: 'bg-purple-50/70',
                      border: 'border-purple-200',
                      text: 'text-purple-950',
                      badgeBg: 'bg-purple-100',
                      badgeText: 'text-purple-800',
                      badgeBorder: 'border-purple-300',
                      icon: Zap,
                    };

                const DiscIcon = theme.icon;

                return (
                  <div key={discipline} className="bg-white">
                    {/* Discipline Section Banner */}
                    <div className={`px-4 py-2.5 ${theme.bg} border-b ${theme.border} flex flex-col sm:flex-row sm:items-center justify-between gap-2`}>
                      <div className="flex items-center gap-2.5">
                        <div className={`w-6 h-6 rounded-md ${theme.badgeBg} border ${theme.badgeBorder} flex items-center justify-center ${theme.text}`}>
                          <DiscIcon className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-black uppercase tracking-wider ${theme.text}`}>
                              {discipline} Discipline
                            </span>
                            <span className={`px-2 py-0.2 rounded text-[10px] font-bold ${theme.badgeBg} ${theme.badgeText} border ${theme.badgeBorder}`}>
                              Supervisor 1 &amp; Supervisor 2
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs">
                        <div className="font-mono">
                          <span className="text-slate-500 font-medium">Assigned: </span>
                          <strong className="text-slate-900 font-bold">{discTotalActivities} activities</strong>
                        </div>
                        <div className="font-mono">
                          <span className="text-slate-500 font-medium">Duration: </span>
                          <strong className="text-slate-900 font-bold">{discTotalDays.toFixed(1)}d</strong>
                        </div>
                      </div>
                    </div>

                    {/* Supervisor Rows for this discipline */}
                    {rows.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400 italic">
                        No active workload records for {discipline} discipline.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {rows.map((row) => {
                          const rowKey = String(row.supervisor_id);
                          const isExpanded = expandedRowKey === rowKey;

                          return (
                            <div key={rowKey} className="transition-colors hover:bg-slate-50/60">
                              <div
                                className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer"
                                onClick={() => setExpandedRowKey(isExpanded ? null : rowKey)}
                              >
                                <div className="flex items-center gap-3">
                                  <button className="text-slate-400 hover:text-slate-700">
                                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                  </button>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-slate-900 text-xs">{row.supervisor_name}</span>
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                                        {row.discipline}
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                      {row.supervisor_email}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-5 flex-wrap justify-end">
                                  {/* Breakdown pills */}
                                  <div className="hidden sm:flex items-center gap-2 text-[11px]">
                                    <span className="text-slate-500 font-medium">Source:</span>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                      {row.auto_assigned_count} Auto
                                    </span>
                                    {row.manual_assigned_count > 0 && (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                        {row.manual_assigned_count} Manual Override
                                      </span>
                                    )}
                                  </div>

                                  {/* Total Duration */}
                                  <div className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <span className="text-sm font-black text-slate-900 font-mono">
                                        {row.total_duration_days}d
                                      </span>
                                      <span className="text-[10px] text-slate-500">duration</span>
                                    </div>
                                    <div className="text-[10px] text-slate-500">
                                      {row.total_activities} {row.total_activities === 1 ? 'activity' : 'activities'}
                                    </div>
                                  </div>

                                  {/* Progress / Remaining Tasks */}
                                  <div className="text-right hidden md:block">
                                    <div className="flex items-center justify-end gap-1">
                                      <span className="text-xs font-black text-slate-800 font-mono">
                                        {row.remaining_count ?? 0}
                                      </span>
                                      <span className="text-[11px] text-slate-500">active</span>
                                      {row.completed_count !== undefined && row.completed_count > 0 && (
                                        <span className="text-[10px] text-emerald-700 font-semibold ml-1">
                                          ({row.completed_count} done)
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-slate-500 truncate max-w-[140px]">
                                      {row.status_detail || 'Active tasks'}
                                    </div>
                                  </div>

                                  {/* Progress Status badge */}
                                  <div className="text-right flex flex-col items-end gap-1">
                                    {row.overall_status === 'delayed' ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                                        {row.status_detail || 'Delayed'}
                                      </span>
                                    ) : row.overall_status === 'completed' ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                        Completed
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                        <Clock className="w-3 h-3 text-emerald-600" />
                                        {row.status_detail || 'On Track'}
                                      </span>
                                    )}
                                  </div>

                                  {/* Dedicated Supervisor Access Button */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/supervisor?sup_id=${row.supervisor_id}`);
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold transition-all shadow-xs"
                                    title={`Open ${row.supervisor_name}'s live mobile terminal`}
                                  >
                                    <HardHat className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                    <span>Supervisor Access</span>
                                  </button>
                                </div>
                              </div>

                              {/* Expandable Activity Details & Reassignment Actions */}
                              {isExpanded && (
                                <div className="px-10 pb-4 pt-1 bg-slate-50/70 border-t border-slate-100 space-y-3">
                                  <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                                    <span>Assigned Activities for {row.supervisor_name} ({row.activities.length}):</span>
                                    <button
                                      onClick={() => navigate(`/supervisor?sup_id=${row.supervisor_id}`)}
                                      className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1 underline"
                                    >
                                      <span>Open in Supervisor Portal</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </button>
                                  </div>

                                  {row.activities.length === 0 ? (
                                    <div className="text-xs text-slate-400 italic">No activities currently assigned to this supervisor.</div>
                                  ) : (
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-left text-xs bg-white rounded-xl border border-slate-200 shadow-sm">
                                        <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                                          <tr>
                                            <th className="p-2.5 pl-4">Activity Code</th>
                                            <th className="p-2.5">Activity Name</th>
                                            <th className="p-2.5">Planned Dates</th>
                                            <th className="p-2.5">Duration</th>
                                            <th className="p-2.5">Schedule Status / Source</th>
                                            <th className="p-2.5 text-right pr-4">Actions</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {row.activities.map((act) => (
                                            <tr key={act.id} className="hover:bg-slate-50">
                                              <td className="p-2.5 pl-4 font-mono font-bold text-oil-900">
                                                {act.activity_id}
                                              </td>
                                              <td className="p-2.5 font-semibold text-slate-800">{act.activity_name}</td>
                                              <td className="p-2.5 text-slate-600 font-mono text-[11px]">
                                                {act.planned_start} &rarr; {act.planned_finish}
                                              </td>
                                              <td className="p-2.5 font-mono font-bold text-slate-700">
                                                {act.planned_duration_days}d
                                              </td>
                                              <td className="p-2.5">
                                                <div className="flex flex-col gap-1 items-start">
                                                  {act.status === 'COMPLETED' || act.schedule_state === 'completed' ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                      Completed
                                                    </span>
                                                  ) : act.schedule_state === 'queued' || (act.starts_in_days && act.starts_in_days > 0) ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300 shadow-xs">
                                                      <Clock className="w-3 h-3 text-amber-700" />
                                                      {act.assignment_timeline_status || `Assigned after ${act.starts_in_days} day${act.starts_in_days === 1 ? '' : 's'}`}
                                                    </span>
                                                  ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-900 border border-blue-300 shadow-xs">
                                                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                                                      {act.assignment_timeline_status || 'Assigned (Active Now)'}
                                                    </span>
                                                  )}

                                                  {act.assignment_source === 'manual' ? (
                                                    <span className="text-[10px] font-semibold text-amber-700">
                                                      Manual ({act.assigned_by_name || 'Planner'})
                                                    </span>
                                                  ) : (
                                                    <span className="text-[10px] font-medium text-slate-400">
                                                      Auto-Assigned
                                                    </span>
                                                  )}
                                                </div>
                                              </td>
                                              <td className="p-2.5 text-right pr-4 space-x-2">
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setHistoryModalActivityId(act.activity_id);
                                                  }}
                                                  className="text-slate-500 hover:text-slate-800 text-[11px] font-semibold underline"
                                                >
                                                  Audit Trail
                                                </button>
                                                <Button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setReassignModalActivity(act);
                                                    setSelectedTargetSupervisorId(null);
                                                  }}
                                                  size="sm"
                                                  variant="outline"
                                                  className="text-[11px] font-bold border-oil-600 text-oil-800 hover:bg-oil-50 py-0.5 px-2.5"
                                                >
                                                  <ArrowRightLeft className="w-3 h-3 mr-1" />
                                                  Reassign
                                                </Button>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Reassignment Modal */}
      {reassignModalActivity && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-oil-800" />
                Override Supervisor Assignment
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Manually reassign activity <strong className="text-oil-900 font-mono">{reassignModalActivity.activity_id}</strong> to a different supervisor.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div>
                <span className="text-slate-500">Activity: </span>
                <strong className="text-slate-800">{reassignModalActivity.activity_name}</strong>
              </div>
              <div>
                <span className="text-slate-500">Discipline: </span>
                <strong className="text-slate-800">{reassignModalActivity.discipline}</strong>
              </div>
              <div>
                <span className="text-slate-500">Planned Duration: </span>
                <strong className="text-slate-800">{reassignModalActivity.planned_duration_days} days</strong>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Select New Supervisor
                </label>
                <select
                  value={selectedTargetSupervisorId || ''}
                  onChange={(e) => setSelectedTargetSupervisorId(Number(e.target.value))}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-oil-600 focus:outline-none"
                >
                  <option value="">-- Choose Supervisor --</option>
                  {['Piping', 'Civil', 'Electrical'].map((disc) => {
                    const sups = allSupervisors.filter((s) => s.discipline.toLowerCase() === disc.toLowerCase());
                    const isSameDiscipline = reassignModalActivity.discipline.toLowerCase() === disc.toLowerCase();
                    return (
                      <optgroup
                        key={disc}
                        label={`${disc} Discipline (${sups.length} Supervisors)${isSameDiscipline ? ' — Recommended Match' : ''}`}
                      >
                        {sups.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} - {s.email} {isSameDiscipline ? '★ (Same Discipline)' : ''}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Operational Justification / Reason (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Primary supervisor on leave / urgent site reallocation"
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-oil-600 focus:outline-none"
                />
              </div>
            </div>

            {reassignMutation.isError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg">
                Reassignment failed. Please try again.
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setReassignModalActivity(null);
                  setSelectedTargetSupervisorId(null);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-oil-800 text-white font-bold"
                disabled={!selectedTargetSupervisorId}
                isLoading={reassignMutation.isPending}
                onClick={() => {
                  if (!selectedTargetSupervisorId) return;
                  reassignMutation.mutate({
                    activityId: reassignModalActivity.activity_id,
                    newSupId: selectedTargetSupervisorId,
                    reason: reassignReason,
                  });
                }}
              >
                Confirm Reassignment
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Activity Assignment Audit History Modal */}
      {historyModalActivityId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-4 h-4 text-oil-800" />
                  Assignment Audit Trail
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Chronological assignment history for activity <strong className="font-mono text-oil-900">{historyModalActivityId}</strong>
                </p>
              </div>
              <button
                onClick={() => setHistoryModalActivityId(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-xs"
              >
                &times; Close
              </button>
            </div>

            {loadingHistory ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading audit history...</div>
            ) : activityHistory.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 italic">No history records found.</div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {activityHistory.map((item, idx) => (
                  <div key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">
                        Step {idx + 1}: Assigned to {item.supervisor_name}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.assignment_source === 'manual'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {item.assignment_source.toUpperCase()}
                      </span>
                    </div>

                    {item.previous_supervisor_name && (
                      <div className="text-[11px] text-slate-500">
                        Previous Supervisor: <span className="font-medium text-slate-700">{item.previous_supervisor_name}</span>
                      </div>
                    )}

                    {item.assigned_by_name && (
                      <div className="text-[11px] text-slate-500">
                        Authorized by: <span className="font-semibold text-slate-700">{item.assigned_by_name}</span>
                      </div>
                    )}

                    {item.reason && (
                      <div className="text-[11px] text-slate-600 italic">
                        Note: &ldquo;{item.reason}&rdquo;
                      </div>
                    )}

                    <div className="text-[10px] text-slate-400 pt-1 font-mono">
                      Timestamp: {new Date(item.assigned_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setHistoryModalActivityId(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
