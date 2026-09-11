import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, AdminWorkloadRow, SupervisorWorkloadActivity, AssignmentHistoryItem, Activity } from '../api/client';
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
  UserPlus,
  Search,
  Building2,
  Plus,
  Cpu,
  Settings2,
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

  // Add Supervisor Modal States
  const [isAddSupervisorOpen, setIsAddSupervisorOpen] = useState<boolean>(false);
  const [newSupName, setNewSupName] = useState<string>('');
  const [newSupEmail, setNewSupEmail] = useState<string>('');
  const [newSupDiscipline, setNewSupDiscipline] = useState<string>('Piping');
  const [newSupPassword, setNewSupPassword] = useState<string>('Supervisor123!');
  const [addSupSuccess, setAddSupSuccess] = useState<string | null>(null);
  const [addSupError, setAddSupError] = useState<string | null>(null);

  // Allocate / Transfer Activity Modal States
  const [isAllocateActivityOpen, setIsAllocateActivityOpen] = useState<boolean>(false);
  const [allocateSelectedActivityId, setAllocateSelectedActivityId] = useState<string>('');
  const [allocateTargetSupervisorId, setAllocateTargetSupervisorId] = useState<number | null>(null);
  const [allocateReason, setAllocateReason] = useState<string>('Admin manual task allocation');
  const [activitySearchQuery, setActivitySearchQuery] = useState<string>('');

  // Fetch admin workload view
  const { data: workloadRows = [], isLoading } = useQuery({
    queryKey: ['supervisor-workload', selectedProjectId],
    queryFn: () => api.getAdminWorkloadView(selectedProjectId),
  });

  // Fetch all activities in the project for the allocation picker
  const { data: activitiesData } = useQuery({
    queryKey: ['activities-all', selectedProjectId],
    queryFn: () => api.getActivities(selectedProjectId, 1, 100),
  });
  const allProjectActivities: Activity[] = activitiesData?.activities || [];

  // Fetch all supervisors dynamically
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

  const [disciplineFilter, setDisciplineFilter] = useState<'ALL' | 'PIPING' | 'CIVIL' | 'ELECTRICAL' | 'MECHANICAL' | 'INSTRUMENTATION' | 'GENERAL'>('ALL');

  // Filter and group rows by discipline
  const filteredWorkloadRows = React.useMemo(() => {
    let rows = workloadRows;
    if (disciplineFilter !== 'ALL') {
      rows = rows.filter((r) => (r.discipline || 'General').toUpperCase() === disciplineFilter);
    }
    return rows;
  }, [workloadRows, disciplineFilter]);

  const rowsByDiscipline = React.useMemo(() => {
    const map = new Map<string, typeof workloadRows>();
    const standardOrder = ['Piping', 'Civil', 'Electrical', 'Mechanical', 'Instrumentation', 'General'];
    standardOrder.forEach((d) => {
      if (disciplineFilter === 'ALL' || disciplineFilter === d.toUpperCase()) {
        map.set(d, []);
      }
    });

    filteredWorkloadRows.forEach((r) => {
      const disc = (r.discipline || 'General').charAt(0).toUpperCase() + (r.discipline || 'General').slice(1).toLowerCase();
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
    onSuccess: () => {
      setReassignModalActivity(null);
      setSelectedTargetSupervisorId(null);
      setReassignReason('');
      setIsAllocateActivityOpen(false);
      setAllocateSelectedActivityId('');
      queryClient.invalidateQueries({ queryKey: ['supervisor-workload', selectedProjectId] });
      queryClient.invalidateQueries({ queryKey: ['activities-all', selectedProjectId] });
    },
  });

  // Add supervisor mutation
  const addSupervisorMutation = useMutation({
    mutationFn: () =>
      api.registerUser({
        name: newSupName.trim(),
        email: newSupEmail.trim().toLowerCase(),
        password: newSupPassword || 'Supervisor123!',
        role: 'supervisor',
        discipline: newSupDiscipline,
      }),
    onSuccess: (newUser) => {
      setAddSupSuccess(`Supervisor "${newUser.name}" successfully registered for ${newSupDiscipline} discipline!`);
      setAddSupError(null);
      setNewSupName('');
      setNewSupEmail('');
      setNewSupPassword('Supervisor123!');
      queryClient.invalidateQueries({ queryKey: ['supervisor-workload', selectedProjectId] });
      setTimeout(() => {
        setIsAddSupervisorOpen(false);
        setAddSupSuccess(null);
      }, 1500);
    },
    onError: (err: any) => {
      setAddSupError(err?.message || 'Failed to add supervisor. Please verify details.');
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

  // Filtered activities list for allocate modal
  const filteredActivitiesForAllocation = React.useMemo(() => {
    if (!activitySearchQuery.trim()) return allProjectActivities;
    const q = activitySearchQuery.toLowerCase();
    return allProjectActivities.filter(
      (a) =>
        a.activity_id.toLowerCase().includes(q) ||
        a.activity_name.toLowerCase().includes(q) ||
        (a.discipline || '').toLowerCase().includes(q)
    );
  }, [allProjectActivities, activitySearchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Header with Action Controls */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-oil-900 text-white uppercase tracking-wider">
              Resource Workload Engine
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Project #{selectedProjectId}: {selectedProjectName}
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
            Supervisor Workload &amp; Dynamic Assignment
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Administer discipline-based supervisor task allocations, reassign activities, and register new supervisors for the project.
          </p>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Add Supervisor for Project */}
          <Button
            onClick={() => {
              setAddSupSuccess(null);
              setAddSupError(null);
              setIsAddSupervisorOpen(true);
            }}
            size="sm"
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Supervisor</span>
          </Button>

          {/* Allocate / Transfer Activity */}
          <Button
            onClick={() => {
              setAllocateTargetSupervisorId(allSupervisors[0]?.id || null);
              setAllocateSelectedActivityId(allProjectActivities[0]?.activity_id || '');
              setIsAllocateActivityOpen(true);
            }}
            size="sm"
            variant="outline"
            className="border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5"
          >
            <ArrowRightLeft className="w-4 h-4 text-blue-600" />
            <span>Allocate Activity</span>
          </Button>

          {/* Run Auto-Assignment */}
          <Button
            onClick={() => runAutoAssignMutation.mutate()}
            isLoading={runAutoAssignMutation.isPending}
            size="sm"
            className="bg-oil-800 hover:bg-oil-900 text-white font-bold text-xs flex items-center gap-2 shadow-sm"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Auto-Assign Engine</span>
          </Button>
        </div>
      </div>

      {/* Auto-Assignment Result Alert */}
      {runSummary && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm text-emerald-900">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Auto-Assignment Completed Successfully!
            </div>
            <button
              onClick={() => setRunSummary(null)}
              className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer"
            >
              Dismiss
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1 border-t border-emerald-200">
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
                Flexible Shifts (Discipline Matched)
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4 bg-white border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-slate-500" /> Active Supervisors
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
            {allSupervisors.length}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Discipline assigned</div>
        </Card>

        <Card className="p-4 bg-white border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-500" /> Total Project Activities
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
            {allProjectActivities.length || totalAssignedActivities}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Primavera L6 baseline</div>
        </Card>

        <Card className="p-4 bg-blue-50/70 border-blue-200 shadow-sm">
          <div className="text-xs font-semibold text-blue-800 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-blue-600" /> Active &amp; In Progress
          </div>
          <div className="text-2xl font-black text-blue-950 mt-1 font-mono">
            {totalInProgressActs}
          </div>
          <div className="text-[10px] text-blue-700 mt-0.5">Under field execution</div>
        </Card>

        <Card className="p-4 bg-emerald-50/70 border-emerald-200 shadow-sm">
          <div className="text-xs font-semibold text-emerald-800 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Completed &amp; Verified
          </div>
          <div className="text-2xl font-black text-emerald-950 mt-1 font-mono">
            {totalCompletedActs}
          </div>
          <div className="text-[10px] text-emerald-700 mt-0.5">100% matched site milestones</div>
        </Card>
      </div>

      {/* Main Supervisor Workload Table */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-oil-800" />
                Discipline-Based Supervisor Allocation Matrix
              </CardTitle>
              <CardDescription>
                Supervisors grouped by engineering discipline. Reassign any activity from one supervisor to another, or allocate new activities directly.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        {/* Discipline Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" /> Discipline Options:
            </span>
            <button
              onClick={() => setDisciplineFilter('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                disciplineFilter === 'ALL'
                  ? 'bg-oil-800 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Disciplines ({allSupervisors.length})
            </button>
            <button
              onClick={() => setDisciplineFilter('PIPING')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                disciplineFilter === 'PIPING'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300'
              }`}
            >
              <Wrench className="w-3.5 h-3.5 text-amber-500" />
              Piping
            </button>
            <button
              onClick={() => setDisciplineFilter('CIVIL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                disciplineFilter === 'CIVIL'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-800 hover:border-blue-300'
              }`}
            >
              <HardHat className="w-3.5 h-3.5 text-blue-500" />
              Civil
            </button>
            <button
              onClick={() => setDisciplineFilter('ELECTRICAL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                disciplineFilter === 'ELECTRICAL'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-purple-50 hover:text-purple-800 hover:border-purple-300'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-purple-500" />
              Electrical
            </button>
            <button
              onClick={() => setDisciplineFilter('MECHANICAL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                disciplineFilter === 'MECHANICAL'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-800 hover:border-rose-300'
              }`}
            >
              <Settings2 className="w-3.5 h-3.5 text-rose-500" />
              Mechanical
            </button>
            <button
              onClick={() => setDisciplineFilter('INSTRUMENTATION')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                disciplineFilter === 'INSTRUMENTATION'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-cyan-50 hover:text-cyan-800 hover:border-cyan-300'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-cyan-500" />
              Instrumentation
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
                className="bg-oil-800 text-white"
              >
                Run Auto-Assignment
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {Array.from(rowsByDiscipline.entries()).map(([discipline, rows]) => {
                if (rows.length === 0 && disciplineFilter !== 'ALL') {
                  return (
                    <div key={discipline} className="p-8 text-center text-xs text-slate-400 bg-slate-50/50">
                      No active supervisors currently registered for <strong>{discipline}</strong> discipline.
                      <div className="mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setNewSupDiscipline(discipline);
                            setIsAddSupervisorOpen(true);
                          }}
                          className="text-xs text-slate-700"
                        >
                          <UserPlus className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                          Add {discipline} Supervisor
                        </Button>
                      </div>
                    </div>
                  );
                }
                if (rows.length === 0) return null;

                const getDisciplineBadge = (d: string) => {
                  switch (d.toLowerCase()) {
                    case 'piping':
                      return { bg: 'bg-amber-100 text-amber-900 border-amber-300', icon: <Wrench className="w-3.5 h-3.5 text-amber-600" /> };
                    case 'civil':
                      return { bg: 'bg-blue-100 text-blue-900 border-blue-300', icon: <HardHat className="w-3.5 h-3.5 text-blue-600" /> };
                    case 'electrical':
                      return { bg: 'bg-purple-100 text-purple-900 border-purple-300', icon: <Zap className="w-3.5 h-3.5 text-purple-600" /> };
                    case 'mechanical':
                      return { bg: 'bg-rose-100 text-rose-900 border-rose-300', icon: <Settings2 className="w-3.5 h-3.5 text-rose-600" /> };
                    case 'instrumentation':
                      return { bg: 'bg-cyan-100 text-cyan-900 border-cyan-300', icon: <Cpu className="w-3.5 h-3.5 text-cyan-600" /> };
                    default:
                      return { bg: 'bg-slate-100 text-slate-900 border-slate-300', icon: <Building2 className="w-3.5 h-3.5 text-slate-600" /> };
                  }
                };

                const badge = getDisciplineBadge(discipline);
                const discTotalActivities = rows.reduce((s, r) => s + r.total_activities, 0);

                return (
                  <div key={discipline} className="bg-white">
                    {/* Section Discipline Header */}
                    <div className="bg-slate-100/90 px-5 py-2.5 flex items-center justify-between border-y border-slate-200">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1.5 ${badge.bg}`}>
                          {badge.icon}
                          {discipline} Engineering Discipline
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          ({rows.length} {rows.length === 1 ? 'Supervisor' : 'Supervisors'} · {discTotalActivities} total activities)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setNewSupDiscipline(discipline);
                            setIsAddSupervisorOpen(true);
                          }}
                          className="text-[11px] text-slate-600 hover:text-slate-900 py-1 h-auto"
                        >
                          <Plus className="w-3 h-3 mr-1 text-emerald-600" /> Add {discipline} Supervisor
                        </Button>
                      </div>
                    </div>

                    {/* Supervisor rows list */}
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

                              <div className="flex items-center gap-4 flex-wrap justify-end">
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

                                {/* Progress / Active tasks */}
                                <div className="text-right hidden sm:block">
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

                                {/* Status badge */}
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

                                {/* Allocate Activity Button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAllocateTargetSupervisorId(row.supervisor_id);
                                    setAllocateSelectedActivityId(allProjectActivities[0]?.activity_id || '');
                                    setIsAllocateActivityOpen(true);
                                  }}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                                  title={`Allocate any project activity to ${row.supervisor_name}`}
                                >
                                  <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                                  <span>Allocate Task</span>
                                </button>

                                {/* Dedicated Supervisor Terminal Access */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/supervisor?sup_id=${row.supervisor_id}`);
                                  }}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                                  title={`Open ${row.supervisor_name}'s live mobile terminal`}
                                >
                                  <HardHat className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                  <span>Field View</span>
                                </button>
                              </div>
                            </div>

                            {/* Expandable Activity Details & Reassignment Actions */}
                            {isExpanded && (
                              <div className="px-4 sm:px-10 pb-4 pt-1 bg-slate-50/70 border-t border-slate-100 space-y-3">
                                <div className="text-xs font-bold text-slate-700 flex items-center justify-between pt-2">
                                  <span className="flex items-center gap-1.5">
                                    <Layers className="w-3.5 h-3.5 text-slate-500" />
                                    Assigned Activities for {row.supervisor_name} ({row.activities.length})
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setAllocateTargetSupervisorId(row.supervisor_id);
                                      setAllocateSelectedActivityId(allProjectActivities[0]?.activity_id || '');
                                      setIsAllocateActivityOpen(true);
                                    }}
                                    className="text-[11px] h-7 px-2.5 text-blue-700 border-blue-200 hover:bg-blue-50"
                                  >
                                    <Plus className="w-3 h-3 mr-1" /> Add / Allocate Another Activity
                                  </Button>
                                </div>

                                {row.activities.length === 0 ? (
                                  <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-center text-xs text-slate-500 space-y-2">
                                    <p>No activities currently assigned to {row.supervisor_name}.</p>
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        setAllocateTargetSupervisorId(row.supervisor_id);
                                        setAllocateSelectedActivityId(allProjectActivities[0]?.activity_id || '');
                                        setIsAllocateActivityOpen(true);
                                      }}
                                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                                    >
                                      <ArrowRightLeft className="w-3.5 h-3.5 mr-1" />
                                      Allocate Activity from Another Supervisor
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                                    <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                                      <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                        <tr>
                                          <th className="p-2.5 pl-3">WBS Code</th>
                                          <th className="p-2.5">Activity Description</th>
                                          <th className="p-2.5">Discipline</th>
                                          <th className="p-2.5">Planned Window</th>
                                          <th className="p-2.5">Timeline Status</th>
                                          <th className="p-2.5 text-right pr-3">Planner Actions</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {row.activities.map((act) => (
                                          <tr key={act.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="p-2.5 pl-3 font-mono font-bold text-oil-900">
                                              {act.activity_id}
                                            </td>
                                            <td className="p-2.5 font-medium text-slate-800">
                                              {act.activity_name}
                                            </td>
                                            <td className="p-2.5">
                                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                                {act.discipline}
                                              </span>
                                            </td>
                                            <td className="p-2.5 text-slate-500 font-mono text-[11px]">
                                              {act.planned_start} &rarr; {act.planned_finish} ({act.planned_duration_days}d)
                                            </td>
                                            <td className="p-2.5">
                                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                {act.assignment_timeline_status || 'Assigned (Active)'}
                                              </span>
                                            </td>
                                            <td className="p-2.5 text-right pr-3 space-x-1.5 whitespace-nowrap">
                                              {/* Reassign to another supervisor */}
                                              <button
                                                onClick={() => {
                                                  setReassignModalActivity(act);
                                                  setSelectedTargetSupervisorId(null);
                                                  setReassignReason('');
                                                }}
                                                className="px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-[11px] font-bold transition-colors cursor-pointer"
                                                title="Reassign to another supervisor"
                                              >
                                                <ArrowRightLeft className="w-3 h-3 inline mr-1" />
                                                Reassign
                                              </button>

                                              {/* Audit history */}
                                              <button
                                                onClick={() => setHistoryModalActivityId(act.activity_id)}
                                                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-[11px] font-medium transition-colors cursor-pointer"
                                                title="View assignment audit history"
                                              >
                                                <History className="w-3 h-3 inline mr-1" />
                                                Audit
                                              </button>
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
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* =========================================================================
          MODAL 1: ADD SUPERVISOR FOR PROJECT (ADMIN ACTION)
         ========================================================================= */}
      {isAddSupervisorOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Add Field Supervisor</h3>
                  <p className="text-xs text-slate-500">Register a supervisor for discipline-specific assignments</p>
                </div>
              </div>
            </div>

            {addSupSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{addSupSuccess}</span>
              </div>
            )}

            {addSupError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{addSupError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                addSupervisorMutation.mutate();
              }}
              className="space-y-3.5"
            >
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Supervisor Full Name</label>
                <input
                  type="text"
                  required
                  value={newSupName}
                  onChange={(e) => setNewSupName(e.target.value)}
                  placeholder="e.g. Ramesh Kalita"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Email Address</label>
                <input
                  type="email"
                  required
                  value={newSupEmail}
                  onChange={(e) => setNewSupEmail(e.target.value)}
                  placeholder="e.g. ramesh.kalita@oilindia.in"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Engineering Discipline</label>
                <select
                  value={newSupDiscipline}
                  onChange={(e) => setNewSupDiscipline(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600"
                >
                  <option value="Piping">Piping</option>
                  <option value="Civil">Civil</option>
                  <option value="Electrical">Electrical</option>
                  <option value="Mechanical">Mechanical</option>
                  <option value="Instrumentation">Instrumentation</option>
                  <option value="General">General / Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Assigned Project</label>
                <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-700 font-medium">
                  Project #{selectedProjectId}: {selectedProjectName}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Initial Password</label>
                <input
                  type="text"
                  value={newSupPassword}
                  onChange={(e) => setNewSupPassword(e.target.value)}
                  placeholder="Supervisor123!"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddSupervisorOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  isLoading={addSupervisorMutation.isPending}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
                >
                  Register Supervisor
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: ALLOCATE / TRANSFER ACTIVITY TO SUPERVISOR
         ========================================================================= */}
      {isAllocateActivityOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Allocate Activity to Supervisor</h3>
                  <p className="text-xs text-slate-500">Assign any baseline activity to a chosen supervisor</p>
                </div>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!allocateSelectedActivityId || !allocateTargetSupervisorId) return;
                reassignMutation.mutate({
                  activityId: allocateSelectedActivityId,
                  newSupId: allocateTargetSupervisorId,
                  reason: allocateReason,
                });
              }}
              className="space-y-4"
            >
              {/* Target Supervisor Picker */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Target Supervisor (Assignee)
                </label>
                <select
                  value={allocateTargetSupervisorId || ''}
                  onChange={(e) => setAllocateTargetSupervisorId(Number(e.target.value))}
                  required
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600"
                >
                  <option value="">-- Choose Target Supervisor --</option>
                  {allSupervisors.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.discipline}) — {s.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Activity Selection with Search Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Select Activity to Allocate
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={activitySearchQuery}
                    onChange={(e) => setActivitySearchQuery(e.target.value)}
                    placeholder="Search by activity name or code (e.g. L6-PIP-101)..."
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
                  />
                </div>

                <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 bg-slate-50/50">
                  {filteredActivitiesForAllocation.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      No activities match your search.
                    </div>
                  ) : (
                    filteredActivitiesForAllocation.map((act) => {
                      const isSelected = allocateSelectedActivityId === act.activity_id;
                      return (
                        <div
                          key={act.activity_id}
                          onClick={() => setAllocateSelectedActivityId(act.activity_id)}
                          className={`p-2.5 text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                            isSelected ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'hover:bg-white'
                          }`}
                        >
                          <div>
                            <div className="font-bold font-mono text-slate-900 flex items-center gap-2">
                              <span>{act.activity_id}</span>
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-200 text-slate-700">
                                {act.discipline || 'Piping'}
                              </span>
                              <span className="text-[10px] text-slate-500 font-normal">
                                {act.status || 'PLANNED'}
                              </span>
                            </div>
                            <div className="text-slate-700 mt-0.5 line-clamp-1">{act.activity_name}</div>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            {isSelected ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white">
                                Selected
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">Click to select</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Justification note */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Allocation Reason / Reassignment Note
                </label>
                <input
                  type="text"
                  value={allocateReason}
                  onChange={(e) => setAllocateReason(e.target.value)}
                  placeholder="e.g. Resource balancing for refinery expansion milestones"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
                />
              </div>

              {reassignMutation.isError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg">
                  Allocation failed. Please verify selected activity and supervisor.
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAllocateActivityOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!allocateSelectedActivityId || !allocateTargetSupervisorId}
                  isLoading={reassignMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  Confirm Allocation
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: ROW-LEVEL REASSIGNMENT MODAL
         ========================================================================= */}
      {reassignModalActivity && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-oil-800" />
                Override Supervisor Assignment
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Reassign activity <strong className="text-oil-900 font-mono">{reassignModalActivity.activity_id}</strong> from its current supervisor.
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
                  Select Target Supervisor
                </label>
                <select
                  value={selectedTargetSupervisorId || ''}
                  onChange={(e) => setSelectedTargetSupervisorId(Number(e.target.value))}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-oil-600 focus:outline-none"
                >
                  <option value="">-- Choose Supervisor --</option>
                  {allSupervisors.map((s) => {
                    const isSameDiscipline =
                      s.discipline.toLowerCase() === reassignModalActivity.discipline.toLowerCase();
                    return (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.discipline}) — {s.email} {isSameDiscipline ? '★ (Same Discipline)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reassignment Reason (Optional)
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

      {/* =========================================================================
          MODAL 4: ACTIVITY ASSIGNMENT AUDIT HISTORY MODAL
         ========================================================================= */}
      {historyModalActivityId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-shrink-0">
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
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {loadingHistory ? (
                <div className="p-8 text-center text-xs text-slate-400">Loading audit history...</div>
              ) : activityHistory.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No reassignments recorded yet. Activity remains in its initial auto-assignment state.
                </div>
              ) : (
                activityHistory.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 font-mono">
                        {item.previous_supervisor_name ? (
                          <>
                            {item.previous_supervisor_name} &rarr; {item.supervisor_name}
                          </>
                        ) : (
                          `Assigned to ${item.supervisor_name}`
                        )}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.assignment_source === 'manual'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-blue-100 text-blue-900 border border-blue-300'
                        }`}
                      >
                        {item.assignment_source.toUpperCase()}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-600 italic">
                      &quot;{item.reason || 'Auto-balanced by workload algorithm'}&quot;
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/60">
                      <span>By: {item.assigned_by_name || 'System Auto-Assign'}</span>
                      <span>{item.assigned_at ? new Date(item.assigned_at).toLocaleString() : 'N/A'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100 flex-shrink-0">
              <Button size="sm" variant="outline" onClick={() => setHistoryModalActivityId(null)}>
                Close Audit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
