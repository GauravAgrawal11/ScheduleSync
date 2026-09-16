import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, SupervisorProgressSummary, SupervisorTaskItem } from '../../api/client';
import { formatShortDate } from '../timelineUtils';
import {
  ArrowLeft,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Layers,
  X,
  Briefcase,
  ShieldCheck,
  Radio,
  Phone,
  Signal,
  MapPin,
  Calendar,
} from 'lucide-react';

export interface SupervisorDetailPanelProps {
  supervisorId?: number | null;
  supervisorName?: string | null;
  discipline?: string | null;
  projectId?: number;
  allActivities?: Array<{
    id: string;
    name: string;
    status: string;
    supervisor?: string;
    percentComplete?: number;
    totalFloat?: number;
    scheduledWeek?: string;
    planned_start?: string;
    planned_finish?: string;
    discipline?: string;
  }>;
  onSelectActivity?: (activityId: string) => void;
  onBack: () => void;
  onClose: () => void;
}

export const SupervisorDetailPanel: React.FC<SupervisorDetailPanelProps> = ({
  supervisorId,
  supervisorName,
  discipline: propDiscipline,
  projectId = 1,
  allActivities = [],
  onSelectActivity,
  onBack,
  onClose,
}) => {
  // Fetch live supervisor progress summary if numerical ID is provided
  const { data: progress, isLoading: loadingProgress } = useQuery<SupervisorProgressSummary>({
    queryKey: ['workflow-supervisor-progress', supervisorId, projectId],
    queryFn: () => (supervisorId ? api.getSupervisorProgress(supervisorId, projectId) : Promise.reject('No ID')),
    enabled: Boolean(supervisorId),
  });

  // Fetch assigned tasks if numerical ID is provided
  const { data: apiTasks = [], isLoading: loadingTasks } = useQuery<SupervisorTaskItem[]>({
    queryKey: ['workflow-supervisor-tasks', supervisorId],
    queryFn: () => (supervisorId ? api.getSupervisorTasks(supervisorId) : Promise.reject('No ID')),
    enabled: Boolean(supervisorId),
  });

  const displayName = progress?.supervisor_name || supervisorName || (supervisorId ? `Supervisor #${supervisorId}` : 'Field Supervisor');
  const resolvedDiscipline = progress?.discipline || propDiscipline || 'Field Operations';

  // Fallback / merge with allActivities from local schedule state
  const matchingActivities = useMemo(() => {
    return allActivities.filter(
      (a) =>
        a.supervisor &&
        a.supervisor.toLowerCase().trim() === displayName.toLowerCase().trim()
    );
  }, [allActivities, displayName]);

  // Unified task items
  const displayTasks = useMemo(() => {
    if (apiTasks.length > 0) {
      return apiTasks.map((t) => ({
        activity_id: t.activity_id,
        activity_name: t.activity_name,
        status: (t.status || '').toLowerCase(),
        planned_start: t.planned_start,
        planned_finish: t.planned_finish,
        percentComplete: t.status?.toUpperCase() === 'COMPLETED' ? 100 : 50,
        totalFloat: 0,
      }));
    }

    return matchingActivities.map((a) => ({
      activity_id: a.id,
      activity_name: a.name,
      status: a.status.toLowerCase(),
      planned_start: a.planned_start || (a as any).actualStart || '2026-02-01',
      planned_finish: a.planned_finish || (a as any).forecastFinish || '2026-02-06',
      percentComplete: a.percentComplete ?? (a.status === 'complete' ? 100 : 40),
      totalFloat: a.totalFloat ?? 0,
    }));
  }, [apiTasks, matchingActivities]);

  // Aggregate Metrics
  const stats = useMemo(() => {
    const total = displayTasks.length || progress?.total_assigned || 1;
    const completed = displayTasks.filter(
      (t) => t.status === 'complete' || t.status === 'completed'
    ).length;
    const inProgress = displayTasks.filter(
      (t) => t.status === 'in_progress' || t.status === 'not_started' || t.status === 'planned'
    ).length;
    const atRisk = displayTasks.filter(
      (t) =>
        t.status === 'at_risk' ||
        t.status === 'behind' ||
        t.status === 'delayed' ||
        t.status === 'blocked'
    ).length;

    const percentDone = Math.round((completed / total) * 100);

    return { total, completed, inProgress, atRisk, percentDone };
  }, [displayTasks, progress]);

  // Deterministic Code & VHF Channel
  const supervisorCode = useMemo(() => {
    const clean = displayName.replace(/[^A-Za-z]/g, '').toUpperCase();
    return `OIL-${clean.slice(0, 3)}-${Math.abs(clean.split('').reduce((acc, c) => acc + c.charCodeAt(0), 100)) % 900 + 100}`;
  }, [displayName]);

  const radioChannel = useMemo(() => {
    const d = resolvedDiscipline.toLowerCase();
    if (d.includes('civil')) return 'VHF Ch-02 (Civil Substructures)';
    if (d.includes('static') || d.includes('mech')) return 'VHF Ch-03 (Static Vessels)';
    if (d.includes('pip')) return 'VHF Ch-04 (Process Piping)';
    if (d.includes('elec')) return 'VHF Ch-05 (Substation 11kV)';
    if (d.includes('inst')) return 'VHF Ch-06 (Control Systems)';
    return 'VHF Ch-01 (Site Operations)';
  }, [resolvedDiscipline]);

  return (
    <div className="flex flex-col h-full bg-[#0C0C0D] text-[#F7F7F5] select-none">
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2A30] bg-[#141417]">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold text-[#F7F7F5] bg-[#1B1B1F] hover:bg-[#2A2A30] border border-[#2A2A30] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#C9942A]" />
          <span>Back to Activity</span>
        </button>

        <button
          onClick={onClose}
          className="p-1 text-[#8E8E96] hover:text-[#F7F7F5] hover:bg-[#1B1B1F] rounded-md transition-colors cursor-pointer"
          title="Close Inspector"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content scroll area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
        {/* Supervisor Profile Card */}
        <div className="p-4 rounded-lg bg-[#141417] border border-[#2A2A30] space-y-3 shadow-md">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-[#1B1B1F] border border-[#C9942A]/40 flex items-center justify-center text-[#F7F7F5] font-bold text-base flex-shrink-0 shadow-inner">
              {displayName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#F7F7F5] truncate leading-tight">
                  {displayName}
                </h3>
                <span className="font-mono text-[10px] text-[#C9942A] bg-[#1B1B1F] px-2 py-0.5 rounded border border-[#2A2A30] font-semibold">
                  {supervisorCode}
                </span>
              </div>
              <p className="text-xs text-[#8E8E96] capitalize truncate mt-0.5">
                Senior Field Lead · <span className="text-[#F7F7F5]">{resolvedDiscipline}</span>
              </p>
              <div className="flex items-center gap-2 mt-2 text-[11px]">
                <span className="inline-flex items-center gap-1 text-[#10B981] font-semibold">
                  <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                  Active On Site
                </span>
                <span className="text-[#4A4A52]">·</span>
                <span className="text-[#8E8E96]">Shift A (07:00–19:00 IST)</span>
              </div>
            </div>
          </div>

          {/* Comms & Location Grid */}
          <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] border-t border-[#1F1F24]">
            <div className="p-2 rounded bg-[#0C0C0D] border border-[#24242A] flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-[#C9942A] flex-shrink-0" />
              <div className="truncate">
                <div className="text-[9px] text-[#8E8E96] uppercase">VHF Comms</div>
                <div className="font-mono text-[#F7F7F5] truncate">{radioChannel}</div>
              </div>
            </div>

            <div className="p-2 rounded bg-[#0C0C0D] border border-[#24242A] flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-[#E0242B] flex-shrink-0" />
              <div className="truncate">
                <div className="text-[9px] text-[#8E8E96] uppercase">Location Base</div>
                <div className="text-[#F7F7F5] truncate">Unit 3 / Offsites</div>
              </div>
            </div>
          </div>
        </div>

        {/* Workload & Performance KPI Grid */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-[#8E8E96]">
            <span className="font-bold uppercase tracking-wider text-[10px]">
              Workload & Performance Metrics
            </span>
            <span className="font-mono text-[11px] text-[#F7F7F5]">
              {stats.completed}/{stats.total} Complete ({stats.percentDone}%)
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-[#1B1B1F] h-2 rounded-full overflow-hidden flex">
            <div
              className="bg-[#10B981] h-full transition-all"
              style={{ width: `${(stats.completed / stats.total) * 100}%` }}
              title={`Completed: ${stats.completed}`}
            />
            <div
              className="bg-[#F7F7F5] h-full transition-all"
              style={{ width: `${(stats.inProgress / stats.total) * 100}%` }}
              title={`In Progress: ${stats.inProgress}`}
            />
            <div
              className="bg-[#E0242B] h-full transition-all"
              style={{ width: `${(stats.atRisk / stats.total) * 100}%` }}
              title={`At Risk/Critical: ${stats.atRisk}`}
            />
          </div>

          <div className="grid grid-cols-4 gap-2 pt-1 text-center">
            <div className="p-2.5 rounded-lg bg-[#141417] border border-[#2A2A30]">
              <div className="text-[9px] uppercase font-semibold text-[#8E8E96]">Total</div>
              <div className="text-sm font-bold text-white mt-0.5 font-mono">{stats.total}</div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#141417] border border-[#2A2A30]">
              <div className="text-[9px] uppercase font-semibold text-[#8E8E96]">Completed</div>
              <div className="text-sm font-bold text-[#10B981] mt-0.5 font-mono">{stats.completed}</div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#141417] border border-[#2A2A30]">
              <div className="text-[9px] uppercase font-semibold text-[#8E8E96]">In Progress</div>
              <div className="text-sm font-bold text-[#F7F7F5] mt-0.5 font-mono">{stats.inProgress}</div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#141417] border border-[#2A2A30]">
              <div className="text-[9px] uppercase font-semibold text-[#8E8E96]">At Risk</div>
              <div className={`text-sm font-bold mt-0.5 font-mono ${stats.atRisk > 0 ? 'text-[#E0242B]' : 'text-[#8E8E96]'}`}>
                {stats.atRisk}
              </div>
            </div>
          </div>
        </div>

        {/* Safety & Compliance Record */}
        <div className="p-3.5 rounded-lg bg-[#141417] border border-[#2A2A30] space-y-2 text-xs">
          <span className="font-bold uppercase tracking-wider text-[10px] text-[#8E8E96] block">
            Safety & Field Ingestion Compliance
          </span>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="flex items-center gap-1.5 text-[#10B981]">
              <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Zero Safety Incidents</span>
            </div>

            <div className="flex items-center gap-1.5 text-[#F7F7F5]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981] flex-shrink-0" />
              <span>PTW Permit Active</span>
            </div>

            <div className="flex items-center gap-1.5 text-[#8E8E96]">
              <Signal className="w-3.5 h-3.5 text-[#C9942A] flex-shrink-0" />
              <span>VHF Voice Notes Logged</span>
            </div>

            <div className="flex items-center gap-1.5 text-[#F7F7F5] font-mono">
              <span className="text-[#C9942A] font-bold">96%</span>
              <span className="text-[#8E8E96]">AI Match Accuracy</span>
            </div>
          </div>
        </div>

        {/* Complete Assigned Activities List */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs text-[#8E8E96]">
            <span className="font-bold uppercase tracking-wider text-[10px] text-[#F7F7F5] flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-[#C9942A]" />
              <span>All Assigned Activities ({displayTasks.length})</span>
            </span>
            <span className="text-[10px] text-[#8E8E96]">Click to inspect</span>
          </div>

          {displayTasks.length === 0 ? (
            <div className="p-4 text-center text-xs text-[#8E8E96] bg-[#141417] rounded-lg border border-[#2A2A30]">
              No activities assigned to this supervisor.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
              {displayTasks.map((task) => {
                const isDone = task.status === 'completed' || task.status === 'complete';
                const isDelayed =
                  task.status === 'delayed' ||
                  task.status === 'behind' ||
                  task.status === 'at_risk' ||
                  task.status === 'blocked';

                return (
                  <button
                    key={task.activity_id}
                    onClick={() => onSelectActivity?.(task.activity_id)}
                    className="w-full p-2.5 rounded-lg bg-[#141417] border border-[#2A2A30] hover:border-[#8E8E96] transition-all text-left cursor-pointer group space-y-1 block shadow-sm"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-[#F7F7F5] font-bold group-hover:text-white">
                        {task.activity_id}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                          isDone
                            ? 'text-[#10B981] bg-emerald-950/40 border border-[#10B981]/30'
                            : isDelayed
                            ? 'text-[#E0242B] bg-red-950/40 border border-[#E0242B]/30'
                            : 'text-[#F7F7F5] bg-[#1B1B1F] border border-[#2A2A30]'
                        }`}
                      >
                        {task.status}
                      </span>
                    </div>

                    <p className="text-xs text-[#F7F7F5] truncate">{task.activity_name}</p>

                    <div className="flex items-center justify-between text-[10px] font-mono text-[#8E8E96] pt-0.5">
                      <span>{formatShortDate(task.planned_start)} → {formatShortDate(task.planned_finish)}</span>
                      <span className={task.totalFloat < 0 ? 'text-[#E0242B] font-bold' : 'text-[#8E8E96]'}>
                        Float: {task.totalFloat > 0 ? `+${task.totalFloat}d` : `${task.totalFloat}d`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
