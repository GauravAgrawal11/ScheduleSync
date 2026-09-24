import React, { useState, useMemo } from 'react';
import {
  User,
  Layers,
  Radio,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Briefcase,
  Phone,
  Signal,
  Calendar,
} from 'lucide-react';

export interface SupervisorLayerCardProps {
  supervisorName: string;
  discipline: string;
  currentActivityId: string;
  allActivities?: Array<{
    id: string;
    name: string;
    status: string;
    supervisor?: string;
    percentComplete?: number;
    totalFloat?: number;
  }>;
  onSelectActivity?: (activityId: string) => void;
  onClickSupervisor?: () => void;
}

export const SupervisorLayerCard: React.FC<SupervisorLayerCardProps> = ({
  supervisorName,
  discipline,
  currentActivityId,
  allActivities = [],
  onSelectActivity,
  onClickSupervisor,
}) => {
  const [isTasksExpanded, setIsTasksExpanded] = useState<boolean>(false);

  // Compute Layer 2: Workload metrics for this supervisor
  const supervisorTasks = useMemo(() => {
    return allActivities.filter(
      (a) =>
        a.supervisor &&
        a.supervisor.toLowerCase().trim() === supervisorName.toLowerCase().trim()
    );
  }, [allActivities, supervisorName]);

  const stats = useMemo(() => {
    const total = supervisorTasks.length || 1;
    const completed = supervisorTasks.filter(
      (t) => t.status === 'complete' || t.status === 'completed'
    ).length;
    const inProgress = supervisorTasks.filter(
      (t) => t.status === 'in_progress' || t.status === 'not_started'
    ).length;
    const atRisk = supervisorTasks.filter(
      (t) =>
        t.status === 'at_risk' ||
        t.status === 'behind' ||
        t.status === 'delayed' ||
        t.status === 'blocked'
    ).length;

    const percentDone = Math.round((completed / total) * 100);

    return { total, completed, inProgress, atRisk, percentDone };
  }, [supervisorTasks]);

  // Deterministic callsign and ID based on supervisor name
  const supervisorCode = useMemo(() => {
    const clean = supervisorName.replace(/[^A-Za-z]/g, '').toUpperCase();
    return `OIL-${clean.slice(0, 3)}-${Math.abs(clean.split('').reduce((acc, c) => acc + c.charCodeAt(0), 100)) % 900 + 100}`;
  }, [supervisorName]);

  const radioChannel = useMemo(() => {
    const d = discipline.toLowerCase();
    if (d.includes('civil')) return 'VHF Ch-02 (Civil Offsites)';
    if (d.includes('static') || d.includes('mech')) return 'VHF Ch-03 (Static Vessels)';
    if (d.includes('pip')) return 'VHF Ch-04 (Process Piping)';
    if (d.includes('elec')) return 'VHF Ch-05 (Substation 11kV)';
    if (d.includes('inst')) return 'VHF Ch-06 (Control Systems)';
    return 'VHF Ch-01 (Site Operations)';
  }, [discipline]);

  return (
    <div className="rounded-lg bg-[#0C0C0D] border border-[#2A2A30] overflow-hidden space-y-0 shadow-lg">
      {/* Section Title Header */}
      <div className="px-3 py-2 bg-[#141417] border-b border-[#2A2A30] flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#C9942A]">
          <Layers className="w-3.5 h-3.5" />
          <span>Supervisor Intelligence Layers</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
          <span className="text-[9px] font-mono text-[#10B981] font-semibold">ON SITE</span>
        </div>
      </div>

      {/* ================================================================== */}
      {/* LAYER 1: Identity & Credentials Layer                              */}
      {/* ================================================================== */}
      <div className="p-3 border-b border-[#1F1F24] space-y-2">
        <div
          onClick={onClickSupervisor}
          className={`flex items-center gap-2.5 ${
            onClickSupervisor
              ? 'cursor-pointer p-1 -m-1 rounded-md hover:bg-[#1B1B1F] transition-colors group'
              : ''
          }`}
          title={onClickSupervisor ? 'Click to view complete supervisor dossier & all tasks' : undefined}
        >
          <div className="w-8 h-8 rounded-full bg-[#1B1B1F] border border-[#2A2A30] group-hover:border-[#C9942A] flex items-center justify-center text-[#F7F7F5] font-bold text-xs flex-shrink-0 transition-colors">
            {supervisorName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[#F7F7F5] group-hover:text-[#C9942A] truncate leading-tight transition-colors flex items-center gap-1">
                <span>{supervisorName}</span>
                {onClickSupervisor && <span className="text-[10px] text-[#C9942A]">↗</span>}
              </h4>
              <span className="font-mono text-[9px] text-[#8E8E96] bg-[#141417] px-1.5 py-0.5 rounded border border-[#2A2A30]">
                {supervisorCode}
              </span>
            </div>
            <p className="text-[10px] text-[#8E8E96] capitalize truncate">
              Field Execution Lead · <span className="text-[#F7F7F5]">{discipline}</span>
            </p>
          </div>
        </div>

        {onClickSupervisor && (
          <button
            onClick={onClickSupervisor}
            className="w-full py-1 px-2 rounded bg-[#1B1B1F] hover:bg-[#2A2A30] border border-[#2A2A30] text-[10px] font-semibold text-[#C9942A] flex items-center justify-center gap-1 transition-colors cursor-pointer"
          >
            <User className="w-3 h-3" />
            <span>Click to View Full Supervisor Info & Dossier</span>
          </button>
        )}

        {/* Comms & Shift Badge */}
        <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px]">
          <div className="p-1.5 rounded bg-[#141417] border border-[#24242A] flex items-center gap-1.5">
            <Radio className="w-3 h-3 text-[#C9942A] flex-shrink-0" />
            <span className="font-mono text-[#8E8E96] truncate">{radioChannel}</span>
          </div>
          <div className="p-1.5 rounded bg-[#141417] border border-[#24242A] flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-[#8E8E96] flex-shrink-0" />
            <span className="text-[#8E8E96] truncate">Shift A (07:00–19:00 IST)</span>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* LAYER 2: Workload & Active Performance Layer                       */}
      {/* ================================================================== */}
      <div className="p-3 border-b border-[#1F1F24] space-y-2 bg-[#101013]">
        <div className="flex items-center justify-between text-[10px]">
          <span className="font-bold text-[#8E8E96] uppercase tracking-wider">
            Layer 2 · Package Workload
          </span>
          <span className="font-mono text-[#F7F7F5] font-semibold">
            {stats.completed}/{stats.total} Tasks ({stats.percentDone}%)
          </span>
        </div>

        {/* Progress Capacity Bar */}
        <div className="w-full bg-[#1B1B1F] h-1.5 rounded-full overflow-hidden flex">
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

        {/* Stats Pill Matrix */}
        <div className="grid grid-cols-3 gap-1 pt-0.5 text-center">
          <div className="p-1 rounded bg-[#141417] border border-[#24242A]">
            <div className="font-mono text-[11px] font-bold text-[#10B981]">
              {stats.completed}
            </div>
            <div className="text-[9px] text-[#8E8E96]">Complete</div>
          </div>

          <div className="p-1 rounded bg-[#141417] border border-[#24242A]">
            <div className="font-mono text-[11px] font-bold text-[#F7F7F5]">
              {stats.inProgress}
            </div>
            <div className="text-[9px] text-[#8E8E96]">In Progress</div>
          </div>

          <div className="p-1 rounded bg-[#141417] border border-[#24242A]">
            <div className={`font-mono text-[11px] font-bold ${stats.atRisk > 0 ? 'text-[#E0242B]' : 'text-[#8E8E96]'}`}>
              {stats.atRisk}
            </div>
            <div className="text-[9px] text-[#8E8E96]">At Risk / Slipping</div>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* LAYER 3: Field Capture Provenance & HSE Clearance                  */}
      {/* ================================================================== */}
      <div className="p-3 border-b border-[#1F1F24] space-y-1.5 text-[10px]">
        <span className="font-bold text-[#8E8E96] uppercase tracking-wider block">
          Layer 3 · Capture & Compliance
        </span>

        <div className="space-y-1">
          <div className="flex items-center justify-between py-0.5">
            <span className="text-[#8E8E96] flex items-center gap-1">
              <Signal className="w-3 h-3 text-[#C9942A]" />
              <span>Capture Mode</span>
            </span>
            <span className="text-[#F7F7F5] font-medium">VHF Audio & DPR Scans</span>
          </div>

          <div className="flex items-center justify-between py-0.5">
            <span className="text-[#8E8E96] flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-[#10B981]" />
              <span>HSE Clearance</span>
            </span>
            <span className="text-[#10B981] font-semibold">Valid Permit (0 Incidents)</span>
          </div>

          <div className="flex items-center justify-between py-0.5">
            <span className="text-[#8E8E96] flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-[#10B981]" />
              <span>AI Verification Match</span>
            </span>
            <span className="font-mono text-[#F7F7F5] font-bold">94% Confidence</span>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* LAYER 4: Co-Assigned Tasks Accordion (Drilldown)                    */}
      {/* ================================================================== */}
      <div className="p-3 bg-[#0C0C0D]">
        <button
          onClick={() => setIsTasksExpanded(!isTasksExpanded)}
          className="w-full flex items-center justify-between text-[10px] font-bold text-[#8E8E96] hover:text-[#F7F7F5] transition-colors cursor-pointer"
        >
          <span className="uppercase tracking-wider flex items-center gap-1">
            <Briefcase className="w-3 h-3 text-[#C9942A]" />
            <span>Layer 4 · Co-Assigned Tasks ({supervisorTasks.length})</span>
          </span>
          {isTasksExpanded ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>

        {isTasksExpanded && (
          <div className="mt-2 space-y-1.5 max-h-36 overflow-y-auto pr-1 custom-scrollbar animate-in fade-in duration-150">
            {supervisorTasks.length === 0 ? (
              <p className="text-[10px] text-[#4A4A52] italic text-center py-1">
                No other co-assigned tasks in this scope.
              </p>
            ) : (
              supervisorTasks.map((t) => {
                const isCurrent = t.id === currentActivityId;
                return (
                  <button
                    key={t.id}
                    disabled={isCurrent}
                    onClick={() => onSelectActivity?.(t.id)}
                    className={`w-full p-1.5 rounded text-left transition-all flex items-center justify-between text-[10px] border cursor-pointer ${
                      isCurrent
                        ? 'bg-[#1B1B1F] border-[#C9942A]/50 text-[#F7F7F5]'
                        : 'bg-[#141417] border-[#24242A] hover:border-[#8E8E96] text-[#8E8E96] hover:text-[#F7F7F5]'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="font-mono text-[9px] font-bold text-[#8E8E96]">
                        {t.id} {isCurrent && '(This activity)'}
                      </div>
                      <div className="truncate text-[#F7F7F5]">{t.name}</div>
                    </div>
                    <span
                      className={`font-mono text-[9px] font-bold ${
                        t.status === 'complete' || t.status === 'completed'
                          ? 'text-[#10B981]'
                          : t.status === 'at_risk' || t.status === 'behind' || t.status === 'delayed'
                          ? 'text-[#E0242B]'
                          : 'text-[#8E8E96]'
                      }`}
                    >
                      {t.percentComplete !== undefined ? `${t.percentComplete}%` : t.status}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
