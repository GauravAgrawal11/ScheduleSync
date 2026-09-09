import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, MatchReviewItem, Activity } from '../api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ConfidenceBar } from '../components/ui/ConfidenceBar';
import { StatusPill } from '../components/ui/StatusPill';
import {
  Check,
  X,
  RefreshCw,
  ArrowLeft,
  Calendar,
  MapPin,
  Tag,
  Layers,
  Sparkles,
  FileText,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export const MatchReview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isRelinkOpen, setIsRelinkOpen] = useState(false);
  const [searchActivity, setSearchActivity] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Fetch queue items
  const { data: queue = [], isLoading } = useQuery({
    queryKey: ['review-queue'],
    queryFn: () => api.getReviewQueue(),
  });

  // Fetch baseline activities for searchable relink modal
  const { data: activitiesData } = useQuery({
    queryKey: ['activities-all'],
    queryFn: () => api.getActivities(1, 1, 100),
  });

  const matchItem = queue.find((m) => m.match_id === Number(id)) || queue[0];

  // Mutations
  const approveMutation = useMutation({
    mutationFn: () => api.approveMatch(matchItem.match_id),
    onSuccess: () => {
      setActionSuccess('MATCH_APPROVED');
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-summary'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => api.rejectMatch(matchItem.match_id, 'Planner marked as non-qualifying site activity'),
    onSuccess: () => {
      setActionSuccess('MATCH_REJECTED');
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
    },
  });

  const relinkMutation = useMutation({
    mutationFn: (targetActId: string) => api.relinkMatch(matchItem.match_id, targetActId),
    onSuccess: () => {
      setIsRelinkOpen(false);
      setActionSuccess('MATCH_RELINKED');
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });

  if (isLoading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading match details...</div>;
  }

  if (!matchItem) {
    return (
      <div className="p-12 text-center space-y-4 max-w-md mx-auto">
        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800">Match Processed</h3>
        <p className="text-xs text-slate-500">
          This match item has been evaluated and committed to the baseline schedule.
        </p>
        <Button onClick={() => navigate('/planner/review')} variant="outline" size="sm">
          Return to Review Queue
        </Button>
      </div>
    );
  }

  const activities = activitiesData?.activities || [];
  const filteredActivities = activities.filter(
    (a) =>
      a.activity_id.toLowerCase().includes(searchActivity.toLowerCase()) ||
      a.activity_name.toLowerCase().includes(searchActivity.toLowerCase()) ||
      (a.location && a.location.toLowerCase().includes(searchActivity.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header with back */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/planner/review')}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Review Queue
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Candidate Match ID:</span>
          <span className="font-mono text-xs font-bold text-oil-900 bg-white px-2.5 py-1 rounded border border-slate-200">
            #{matchItem.match_id}
          </span>
        </div>
      </div>

      {/* Success Notification Banner */}
      {actionSuccess && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-lg flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-sm font-bold">
                {actionSuccess === 'MATCH_APPROVED' && 'Match Approved & Schedule Updated!'}
                {actionSuccess === 'MATCH_REJECTED' && 'Match Rejected & Placed on Safety Hold'}
                {actionSuccess === 'MATCH_RELINKED' && 'Match Relinked to Selected Baseline Activity!'}
              </div>
              <p className="text-xs text-teal-100 mt-0.5">
                Actual start date written back with confidence score and audit trail. Visible in Gantt chart.
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate('/planner/schedule')}
            size="sm"
            className="bg-white text-emerald-800 hover:bg-emerald-50 text-xs font-bold shadow-sm"
          >
            View Gantt Timeline <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      )}

      {/* ==================== THE HERO CARD ==================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Hero Top Bar */}
        <div className="bg-gradient-to-r from-oil-950 via-oil-900 to-oil-800 px-6 py-4 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                AI Site Activity Match Cockpit
              </span>
            </div>
            <h1 className="text-lg font-bold mt-0.5">
              Triage Site Progress vs Primavera Baseline (L6)
            </h1>
          </div>

          <div className="bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/15 flex items-center gap-3">
            <span className="text-xs text-slate-300">Confidence Score:</span>
            <span className="text-lg font-black text-white font-mono">
              {Math.round(matchItem.final_confidence * 100)}%
            </span>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {/* 1. Raw Report Text */}
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-oil-800" />
              Raw Site Input Log (Logged by {matchItem.supervisor} on {matchItem.report_date})
            </span>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-medium text-slate-800 italic leading-relaxed">
              "{matchItem.report_snippet}"
            </div>
          </div>

          {/* 2. Extracted Structured Fields */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/60 p-4 rounded-xl border border-slate-100">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Action / Scope</span>
              <span className="text-xs font-bold text-slate-800">{matchItem.extracted_fields.action}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Line / Ref</span>
              <span className="text-xs font-bold text-oil-800">{matchItem.extracted_fields.line_ref || 'N/A'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Discipline & Location</span>
              <span className="text-xs font-bold text-slate-800">{matchItem.discipline} · {matchItem.location}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Report Date</span>
              <span className="text-xs font-bold text-slate-800">{matchItem.report_date}</span>
            </div>
          </div>

          {/* 3. 3-Signal Scoring Engine Breakdown */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                3-Signal Explainable Scoring Weights (SIH26122 Architecture)
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Formula: (0.45 × Sem) + (0.35 × Ent) + (0.20 × Meta)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold text-slate-600">1. Semantic Similarity</span>
                  <span className="text-xs font-bold text-oil-900 font-mono">
                    {Math.round(matchItem.signals.semantic * 100)}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mb-1.5">
                  <div
                    className="bg-oil-700 h-full rounded-full"
                    style={{ width: `${Math.round(matchItem.signals.semantic * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400">SentenceTransformer (384-dim vector cosine)</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold text-slate-600">2. Entity Verification</span>
                  <span className="text-xs font-bold text-emerald-600 font-mono">
                    {Math.round(matchItem.signals.entity * 100)}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mb-1.5">
                  <div
                    className="bg-emerald-500 h-full rounded-full"
                    style={{ width: `${Math.round(matchItem.signals.entity * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400">Line number & area entity extraction match</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold text-slate-600">3. WBS / Meta Context</span>
                  <span className="text-xs font-bold text-oil-900 font-mono">
                    {Math.round(matchItem.signals.metadata * 100)}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mb-1.5">
                  <div
                    className="bg-oil-700 h-full rounded-full"
                    style={{ width: `${Math.round(matchItem.signals.metadata * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400">Predecessors & location hierarchy match</span>
              </div>
            </div>
          </div>

          {/* 4. Suggested Baseline Activity Card */}
          <div className="p-5 rounded-2xl bg-blue-50/70 border border-blue-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold text-blue-900 uppercase tracking-wide flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-700" /> Suggested Baseline Activity (WBS Level 6)
              </span>
              <span className="font-mono text-xs font-bold text-blue-800 bg-blue-100 px-2.5 py-0.5 rounded border border-blue-300">
                WBS: {matchItem.suggested_activity.wbs_code}
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              {matchItem.suggested_activity.activity_id}: {matchItem.suggested_activity.activity_name}
            </h3>

            <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-600">
              <span className="flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-blue-600" /> Discipline: <strong>{matchItem.discipline}</strong>
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-blue-600" /> Location: <strong>{matchItem.location}</strong>
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-600" /> Planned: {matchItem.suggested_activity.planned_start} to {matchItem.suggested_activity.planned_finish}
              </span>
            </div>

            <div className="mt-4 pt-3 border-t border-blue-200/80">
              <ConfidenceBar score={matchItem.final_confidence} size="md" />
            </div>
          </div>

          {/* 5. Hero Action Decision Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-100">
            <div className="text-xs text-slate-500">
              Decision Tier: <span className="font-semibold uppercase text-oil-900">{matchItem.decision}</span>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <Button
                variant="outline"
                size="md"
                onClick={() => rejectMutation.mutate()}
                isLoading={rejectMutation.isPending}
                disabled={Boolean(actionSuccess)}
                className="flex-1 sm:flex-none border-rose-200 text-rose-700 hover:bg-rose-50"
              >
                <X className="w-4 h-4 text-rose-500 mr-1" />
                Reject / Hold
              </Button>

              <Button
                variant="secondary"
                size="md"
                onClick={() => setIsRelinkOpen(true)}
                disabled={Boolean(actionSuccess)}
                className="flex-1 sm:flex-none border border-slate-300"
              >
                <RefreshCw className="w-4 h-4 text-slate-600 mr-1" />
                Review / Relink
              </Button>

              <Button
                variant="primary"
                size="md"
                onClick={() => approveMutation.mutate()}
                isLoading={approveMutation.isPending}
                disabled={Boolean(actionSuccess)}
                className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 shadow-md shadow-emerald-600/20"
              >
                <Check className="w-4 h-4 mr-1 stroke-[2.5]" />
                One-Click Approve & Update Gantt
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Searchable Activity Relink Modal */}
      {isRelinkOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Relink to Baseline Activity</h3>
                <p className="text-xs text-slate-500">
                  Select the correct WBS activity to override the AI suggestion
                </p>
              </div>
              <button
                onClick={() => setIsRelinkOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search activities by code, name, or location..."
                  value={searchActivity}
                  onChange={(e) => setSearchActivity(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-oil-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100">
              {filteredActivities.map((act) => (
                <div
                  key={act.id}
                  onClick={() => relinkMutation.mutate(act.activity_id)}
                  className="py-3 px-2 hover:bg-oil-50/60 rounded-lg transition-colors cursor-pointer flex items-center justify-between group"
                >
                  <div>
                    <div className="text-xs font-bold text-oil-900 flex items-center gap-2">
                      <span>{act.activity_id}</span>
                      <span className="text-[10px] font-mono text-slate-400">({act.wbs_code})</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 uppercase font-medium">
                        {act.discipline}
                      </span>
                    </div>
                    <div className="text-xs text-slate-700 mt-0.5">{act.activity_name}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Location: {act.location || 'Unit 3'}</div>
                  </div>
                  <Button size="sm" variant="outline" className="text-xs group-hover:bg-oil-800 group-hover:text-white">
                    Select
                  </Button>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setIsRelinkOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
