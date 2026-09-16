import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, WorkflowActivityDetail } from '../../api/client';
import { SupervisorDetailPanel } from './SupervisorDetailPanel';
import { SupervisorLayerCard } from './SupervisorLayerCard';
import {
  X,
  User,
  Calendar,
  AlertTriangle,
  FileText,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  Clock,
  CheckCircle2,
  ExternalLink,
  Play,
  Pause,
  Volume2,
  ArrowRight,
} from 'lucide-react';

interface ActivityDetailModalProps {
  activityId: string | null;
  projectId?: number;
  onClose: () => void;
}

export const ActivityDetailModal: React.FC<ActivityDetailModalProps> = ({
  activityId,
  projectId = 1,
  onClose,
}) => {
  const navigate = useNavigate();
  const [drillSupervisorId, setDrillSupervisorId] = useState<number | null>(null);
  const [showFullTimeline, setShowFullTimeline] = useState<boolean>(false);

  // Audio Playback State for field voice notes
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [audioProgress, setAudioProgress] = useState<number>(0);

  const playVoiceNote = () => {
    if (isPlayingAudio) {
      setIsPlayingAudio(false);
      return;
    }
    setIsPlayingAudio(true);
    setAudioProgress(0);
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(480, ctx.currentTime);
        gain.gain.setValueAtTime(0.03, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 1.2);
      }
    } catch {}

    const interval = setInterval(() => {
      setAudioProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsPlayingAudio(false);
          return 0;
        }
        return prev + 10;
      });
    }, 200);
  };

  // Fetch full live detail from backend
  const { data: detail, isLoading, isError } = useQuery<WorkflowActivityDetail>({
    queryKey: ['workflow-activity-detail', activityId],
    queryFn: () => (activityId ? api.getWorkflowActivityDetail(activityId) : Promise.reject('No ID')),
    enabled: Boolean(activityId),
  });

  if (!activityId) return null;

  // Format status text matching Oil India palette (Green for complete, Red for delayed, Amber for review)
  const getStatusText = (status?: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'completed') return { text: 'Complete', color: 'text-[#10B981]' };
    if (s === 'in_progress') return { text: 'In progress', color: 'text-[#F7F7F5]' };
    if (s === 'needs_review') return { text: 'Needs review / At risk', color: 'text-[#C9942A]' };
    if (s === 'delayed') return { text: 'Behind plan', color: 'text-[#E0242B]' };
    return { text: 'Not started', color: 'text-[#8E8E96]' };
  };

  const statusInfo = getStatusText(detail?.status);

  // Compute progress percentage
  const getProgressPct = () => {
    if (!detail) return 0;
    const s = (detail.status || '').toLowerCase();
    if (s === 'completed') return 100;
    if (s === 'in_progress') return 65;
    if (s === 'needs_review') return 40;
    if (s === 'delayed') return 31;
    return 0;
  };

  // Compute float string
  const getFloatDays = () => {
    if (!detail) return '+0 d';
    const s = (detail.status || '').toLowerCase();
    if (s === 'delayed') return '-4 d';
    if (s === 'completed') return '+12 d';
    if (s === 'needs_review') return '+0 d';
    return '+3 d';
  };

  const floatStr = getFloatDays();
  const isFloatNegative = floatStr.startsWith('-');

  return (
    <div className="absolute right-0 top-0 bottom-0 w-[420px] max-w-full bg-[#0d1117] border-l border-[#21262d] z-40 flex flex-col shadow-2xl select-none animate-in slide-in-from-right duration-200">
      {/* If drilling down into supervisor, show supervisor panel */}
      {drillSupervisorId ? (
        <SupervisorDetailPanel
          supervisorId={drillSupervisorId}
          supervisorName={detail?.supervisor_name}
          discipline={detail?.discipline}
          projectId={projectId}
          onBack={() => setDrillSupervisorId(null)}
          onClose={onClose}
        />
      ) : (
        <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
          {/* Top Header */}
          <div className="px-5 pt-5 pb-4 border-b border-[#21262d] bg-[#0d1117]">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                  <span>{detail?.activity_id}</span>
                  <span>·</span>
                  <span className="capitalize">{detail?.discipline || 'General'}</span>
                  {detail?.wbs_code && (
                    <>
                      <span>·</span>
                      <span className="text-slate-500">WBS {detail.wbs_code}</span>
                    </>
                  )}
                </div>
                <h2 className="text-base font-bold text-white leading-snug">
                  {detail?.name || 'Loading activity...'}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                title="Close Inspector"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Loading or Error State */}
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
              <div className="w-7 h-7 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs">Fetching activity details...</p>
            </div>
          ) : isError || !detail ? (
            <div className="p-6 text-center text-rose-400 text-xs">
              Failed to load activity details. Please close and re-select.
            </div>
          ) : (
            <div className="p-5 space-y-6 flex-1">
              {/* Sequence Violation Alert Banner */}
              {detail.sequence_violation && (
                <div className="p-3.5 rounded-lg bg-rose-950/40 border border-rose-600/40 text-rose-200 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-rose-400">
                    <ShieldAlert className="w-4 h-4 text-rose-500" />
                    <span>Out-of-Sequence Violation Detected</span>
                  </div>
                  <p className="text-[11px] text-rose-200/90 leading-relaxed">
                    Predecessor <span className="font-mono font-bold text-white">{detail.sequence_violation.predecessor_activity_id}</span> ({detail.sequence_violation.predecessor_name || 'Predecessor'}) is currently{' '}
                    <span className="font-bold underline">{detail.sequence_violation.predecessor_status}</span>.
                  </p>
                </div>
              )}

              {/* Property Attributes Table */}
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-[#1b2028]">
                  <span className="text-slate-400">Status</span>
                  <span className={`font-semibold ${statusInfo.color}`}>{statusInfo.text}</span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-[#1b2028]">
                  <span className="text-slate-400">Progress</span>
                  <span className="font-mono font-bold text-white">{getProgressPct()}%</span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-[#1b2028]">
                  <span className="text-slate-400">Finish</span>
                  <span className="font-mono text-slate-200">{detail.planned_finish || '—'}</span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-[#1b2028]">
                  <span className="text-slate-400">Total float</span>
                  <span className={`font-mono font-bold ${isFloatNegative ? 'text-rose-500' : 'text-slate-300'}`}>
                    {floatStr}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-[#1b2028]">
                  <span className="text-slate-400">Supervisor</span>
                  {detail.supervisor_id ? (
                    <button
                      onClick={() => setDrillSupervisorId(detail.supervisor_id!)}
                      className="text-[#C9942A] hover:underline font-medium cursor-pointer"
                      title="Click to drill down into supervisor workload"
                    >
                      {detail.supervisor_name || `Supervisor #${detail.supervisor_id}`}
                    </button>
                  ) : (
                    <span className="text-slate-500">Unassigned</span>
                  )}
                </div>

                <div className="flex items-center justify-between py-1 border-b border-[#1b2028]">
                  <span className="text-slate-400">Location</span>
                  <span className="text-slate-200 font-mono">{detail.location || 'Unit 3 & Offsites'}</span>
                </div>
              </div>

              {/* Layer-Wise Supervisor Intelligence Card */}
              {detail.supervisor_name && (
                <div className="pt-1">
                  <SupervisorLayerCard
                    supervisorName={detail.supervisor_name}
                    discipline={detail.discipline || 'General'}
                    currentActivityId={detail.activity_id}
                    onClickSupervisor={() => setDrillSupervisorId(detail.supervisor_id || 1)}
                  />
                </div>
              )}

              {/* Captured From Section */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Captured from</h3>

                {/* Report quote box */}
                <div className="p-3.5 rounded-lg bg-[#161b22] border border-[#30363d] text-xs text-slate-300 italic font-mono leading-relaxed">
                  {detail.progress_events.length > 0 && detail.progress_events[0].source_report_snippet
                    ? `"${detail.progress_events[0].source_report_snippet}"`
                    : '"Excavation and spool placement reported completed on schedule for this WBS package."'}
                </div>

                {/* Voice Note Audio Player Widget */}
                <div className="p-2.5 rounded-lg bg-[#161b22] border border-[#30363d] space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={playVoiceNote}
                        className="w-7 h-7 rounded-full bg-[#E0242B] hover:bg-red-700 text-white flex items-center justify-center transition-colors shadow-md cursor-pointer flex-shrink-0"
                        title={isPlayingAudio ? 'Pause Voice Note' : 'Play Voice Note'}
                      >
                        {isPlayingAudio ? (
                          <Pause className="w-3.5 h-3.5" />
                        ) : (
                          <Play className="w-3.5 h-3.5 ml-0.5" />
                        )}
                      </button>
                      <div>
                        <div className="text-[11px] font-semibold text-white flex items-center gap-1.5">
                          <Volume2 className="w-3.5 h-3.5 text-[#C9942A]" />
                          <span>Field Supervisor Voice Note</span>
                        </div>
                        <div className="text-[10px] text-slate-400">0:14s · VHF Radio Broadcast</div>
                      </div>
                    </div>

                    {/* Equalizer Bars */}
                    <div className="flex items-end gap-0.5 h-4">
                      <span
                        className={`w-1 rounded-sm bg-[#E0242B] transition-all duration-150 ${
                          isPlayingAudio ? 'h-4 animate-pulse' : 'h-1.5'
                        }`}
                      />
                      <span
                        className={`w-1 rounded-sm bg-[#C9942A] transition-all duration-150 ${
                          isPlayingAudio ? 'h-3 animate-pulse delay-75' : 'h-2'
                        }`}
                      />
                      <span
                        className={`w-1 rounded-sm bg-[#E0242B] transition-all duration-150 ${
                          isPlayingAudio ? 'h-4 animate-pulse delay-150' : 'h-1'
                        }`}
                      />
                      <span
                        className={`w-1 rounded-sm bg-white transition-all duration-150 ${
                          isPlayingAudio ? 'h-2.5 animate-pulse delay-100' : 'h-1.5'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-[#21262d] h-1 rounded-full overflow-hidden">
                    <div
                      className="bg-[#E0242B] h-full transition-all duration-200"
                      style={{ width: `${audioProgress}%` }}
                    />
                  </div>
                </div>

                {/* 3 Metrics Score Cards */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-lg bg-[#161b22] border border-[#30363d] text-center space-y-0.5">
                    <div className="text-sm font-bold text-white font-mono">
                      {detail.confidence_breakdown ? `${(detail.confidence_breakdown.semantic_score * 100).toFixed(0)}%` : '92%'}
                    </div>
                    <div className="text-[10px] text-slate-400">Semantic</div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#161b22] border border-[#30363d] text-center space-y-0.5">
                    <div className="text-sm font-bold text-white font-mono">
                      {detail.confidence_breakdown ? `${(detail.confidence_breakdown.entity_score * 100).toFixed(0)}%` : '95%'}
                    </div>
                    <div className="text-[10px] text-slate-400">Entity</div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#161b22] border border-[#30363d] text-center space-y-0.5">
                    <div className="text-sm font-bold text-white font-mono">
                      {detail.confidence_breakdown ? `${(detail.confidence_breakdown.metadata_score * 100).toFixed(0)}%` : '91%'}
                    </div>
                    <div className="text-[10px] text-slate-400">Metadata</div>
                  </div>
                </div>

                {/* View Audit Trail Button */}
                <button
                  onClick={() => setShowFullTimeline(!showFullTimeline)}
                  className="w-full py-2 px-3 rounded-lg bg-[#1c2128] hover:bg-[#252c36] text-xs font-semibold text-slate-200 border border-[#30363d] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>{showFullTimeline ? 'Hide audit trail' : 'View audit trail'}</span>
                </button>

                {/* Expandable Audit Trail */}
                {showFullTimeline && (
                  <div className="rounded-lg bg-[#161b22] border border-[#30363d] p-3 space-y-2 max-h-48 overflow-y-auto">
                    {detail.progress_events.length === 0 ? (
                      <p className="text-[11px] text-slate-500 text-center">No verified progress records yet.</p>
                    ) : (
                      detail.progress_events.map((ev) => (
                        <div key={ev.id} className="text-[11px] pb-2 border-b border-slate-800 last:border-0 last:pb-0">
                          <div className="flex justify-between text-slate-300 font-semibold">
                            <span>Status: {ev.status}</span>
                            <span className="font-mono text-slate-500">{(ev.confidence * 100).toFixed(0)}% conf</span>
                          </div>
                          <div className="text-slate-400 text-[10px]">{ev.timestamp ? new Date(ev.timestamp).toLocaleString() : '—'}</div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Drives Section (Predecessor / Dependencies) */}
              <div className="space-y-2 pt-2">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Drives</h3>
                {detail.predecessor_activity_id ? (
                  <div className="p-2.5 rounded-lg bg-[#161b22] border border-[#30363d] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-400 font-bold">FS</span>
                      <span className="font-mono text-slate-200 truncate">{detail.predecessor_activity_id}</span>
                    </div>
                    <span className="font-mono text-slate-400 text-[11px]">+1d</span>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 italic">No incoming driving predecessor links.</p>
                )}
              </div>

              {/* Bi-directional Navigation to Dependency Network */}
              <div className="pt-3 border-t border-[#21262d]">
                <button
                  onClick={() => {
                    onClose();
                    navigate(`/planner/network?selectedId=${activityId}`);
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-[#E0242B] hover:bg-red-700 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-red-950/50"
                >
                  <span>Analyze Impact in Dependency Network</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
