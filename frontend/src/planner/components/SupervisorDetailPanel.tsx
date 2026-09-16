import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, SupervisorProgressSummary, SupervisorTaskItem } from '../../api/client';
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
} from 'lucide-react';

interface SupervisorDetailPanelProps {
  supervisorId: number;
  supervisorName?: string | null;
  projectId?: number;
  onBack: () => void;
  onClose: () => void;
}

export const SupervisorDetailPanel: React.FC<SupervisorDetailPanelProps> = ({
  supervisorId,
  supervisorName,
  projectId = 1,
  onBack,
  onClose,
}) => {
  // Fetch live supervisor progress summary
  const { data: progress, isLoading: loadingProgress } = useQuery<SupervisorProgressSummary>({
    queryKey: ['workflow-supervisor-progress', supervisorId, projectId],
    queryFn: () => api.getSupervisorProgress(supervisorId, projectId),
  });

  // Fetch assigned tasks
  const { data: tasks = [], isLoading: loadingTasks } = useQuery<SupervisorTaskItem[]>({
    queryKey: ['workflow-supervisor-tasks', supervisorId],
    queryFn: () => api.getSupervisorTasks(supervisorId),
  });

  const displayName = progress?.supervisor_name || supervisorName || `Supervisor #${supervisorId}`;
  const discipline = progress?.discipline || 'Field Supervisor';

  return (
    <div className="flex flex-col h-full bg-[#0d1117] text-slate-100 select-none">
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#21262d] bg-[#0d1117]">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold text-slate-300 bg-[#161b22] hover:bg-[#21262d] hover:text-white border border-[#30363d] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Activity</span>
        </button>

        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
          title="Close Inspector"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content scroll area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Supervisor Profile Card */}
        <div className="p-3.5 rounded-lg bg-[#161b22] border border-[#30363d] flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold text-sm">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white leading-tight">{displayName}</h3>
            <p className="text-xs text-slate-400 capitalize">{discipline} · Assigned Lead</p>
          </div>
        </div>

        {/* Workload Stats Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3 rounded-lg bg-[#161b22] border border-[#30363d]">
            <div className="text-[10px] uppercase font-semibold text-slate-400">Total Tasks</div>
            <div className="text-lg font-bold text-white mt-1">
              {loadingProgress ? '—' : progress?.total_assigned ?? tasks.length}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#161b22] border border-[#30363d]">
            <div className="text-[10px] uppercase font-semibold text-slate-400">Remaining</div>
            <div className="text-lg font-bold text-amber-400 mt-1">
              {loadingProgress ? '—' : progress?.remaining_count ?? tasks.filter(t => t.status !== 'COMPLETED').length}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#161b22] border border-[#30363d]">
            <div className="text-[10px] uppercase font-semibold text-slate-400">Completed</div>
            <div className="text-lg font-bold text-emerald-400 mt-1">
              {loadingProgress ? '—' : progress?.completed_count ?? tasks.filter(t => t.status === 'COMPLETED').length}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#161b22] border border-[#30363d]">
            <div className="text-[10px] uppercase font-semibold text-slate-400">Pacing</div>
            <div className="text-xs font-bold text-white mt-2 capitalize truncate">
              {loadingProgress ? '—' : progress?.overall_status || 'On Track'}
            </div>
          </div>
        </div>

        {/* Assigned Activities List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider">Assigned Activities</span>
            <span className="font-mono text-[11px]">{tasks.length} total</span>
          </div>

          {loadingTasks ? (
            <div className="p-4 text-center text-xs text-slate-500">Loading tasks...</div>
          ) : tasks.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500">No activities currently assigned.</div>
          ) : (
            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {tasks.map((task) => {
                const isDone = (task.status || '').toUpperCase() === 'COMPLETED';
                const isProg = (task.status || '').toUpperCase() === 'IN_PROGRESS';
                return (
                  <div
                    key={task.activity_id}
                    className="p-2.5 rounded-lg bg-[#161b22] border border-[#30363d] space-y-1 hover:border-slate-600 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-blue-400 font-bold">{task.activity_id}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                          isDone
                            ? 'text-emerald-400 bg-emerald-500/10'
                            : isProg
                            ? 'text-sky-400 bg-sky-500/10'
                            : 'text-slate-400 bg-slate-800'
                        }`}
                      >
                        {task.status || 'PLANNED'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 truncate">{task.activity_name}</p>
                    <div className="text-[10px] font-mono text-slate-500">
                      {task.planned_start || '—'} → {task.planned_finish || '—'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
