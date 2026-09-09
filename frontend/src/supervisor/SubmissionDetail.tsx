import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, MatchLogEntry } from '../api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { StatusPill } from '../components/ui/StatusPill';
import { ConfidenceBar } from '../components/ui/ConfidenceBar';
import {
  ArrowLeft, CheckCircle2, FileText, Calendar, Tag, ShieldCheck,
  Bot, User, Layers, Activity, AlertTriangle, Clock, Info
} from 'lucide-react';

const VerificationBadge: React.FC<{ entry: MatchLogEntry }> = ({ entry }) => {
  if (!entry.is_verified) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
        <Clock className="w-3 h-3" /> Awaiting Planner Review
      </span>
    );
  }
  if (entry.verification_type === 'AI') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
        <Bot className="w-3 h-3" /> AI Auto-Verified (&gt;90%)
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
      <User className="w-3 h-3" /> Planner Verified
    </span>
  );
};

const SignalBar: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className="flex items-center gap-2 text-[11px]">
    <span className="text-slate-500 w-20 flex-shrink-0">{label}</span>
    <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
      <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${Math.round(value * 100)}%` }} />
    </div>
    <span className="font-mono font-bold text-slate-700 w-8 text-right">{Math.round(value * 100)}%</span>
  </div>
);

export const SubmissionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: sub, isLoading } = useQuery({
    queryKey: ['submission-detail', id],
    queryFn: () => api.getSubmissionDetail(Number(id)),
    refetchInterval: 10000, // refresh every 10s to pick up planner approvals
  });

  if (isLoading) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading submission details...</div>;
  }

  if (!sub) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-xs text-slate-500">Submission not found.</p>
        <button
          onClick={() => navigate('/supervisor/submissions')}
          className="text-xs text-oil-800 font-semibold underline"
        >
          Return to My Submissions
        </button>
      </div>
    );
  }

  const matchLog = sub.match_log || [];
  const bestMatch = matchLog.find(m => m.is_verified) || matchLog[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/supervisor/submissions')}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-base font-bold text-slate-800">Report #{sub.id} — Match Log & Audit</h2>
          <p className="text-[11px] text-slate-500">Field report submitted {sub.date} · Full verification trail</p>
        </div>
      </div>

      {/* Verification Status Banner */}
      <Card className={`border ${sub.is_verified ? (sub.verification_type === 'AI' ? 'border-emerald-300 bg-emerald-50/60' : 'border-blue-300 bg-blue-50/60') : 'border-amber-300 bg-amber-50/60'}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${sub.is_verified ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'}`}>
                {sub.is_verified ? <ShieldCheck className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Verification Status
                </div>
                <div className="text-sm font-black text-slate-900">
                  {sub.is_verified
                    ? sub.verification_type === 'AI'
                      ? 'AI Auto-Verified (High Confidence)'
                      : `Planner Verified — ${sub.verified_by || 'Central Planning Engineer'}`
                    : 'Pending Engineering Planner Review'}
                </div>
                {sub.verified_at && (
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Verified: {sub.verified_at}
                  </div>
                )}
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] font-bold text-slate-500 uppercase">Activity Status</div>
              <div className={`text-sm font-black ${sub.activity_status === 'COMPLETED' ? 'text-emerald-700' : sub.activity_status === 'IN_PROGRESS' ? 'text-blue-700' : 'text-amber-700'}`}>
                {sub.activity_status || 'PLANNED'}
              </div>
              <StatusPill status={sub.status} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Raw Field Input */}
      <Card className="border-slate-200">
        <CardHeader className="p-3.5 pb-2">
          <CardTitle className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-oil-800" /> Raw Site Report Text
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3.5 pt-0">
          <p className="text-xs text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed italic">
            "{sub.raw_text}"
          </p>
          <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" /> Submitted by field terminal
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" /> {sub.date}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Match Log — all candidate matches */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-oil-800" />
            AI Confidence Match Log ({matchLog.length} candidate{matchLog.length !== 1 ? 's' : ''})
          </h3>
        </div>

        {matchLog.length === 0 ? (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 text-center">
            No candidate matches generated yet. The AI pipeline is extracting entities from your report.
          </div>
        ) : (
          matchLog.map((entry, idx) => (
            <Card
              key={entry.match_id}
              className={`border ${
                entry.is_verified
                  ? entry.verification_type === 'AI'
                    ? 'border-emerald-300 bg-emerald-50/40'
                    : 'border-blue-300 bg-blue-50/40'
                  : entry.decision === 'rejected'
                  ? 'border-rose-200 bg-rose-50/30'
                  : 'border-amber-200 bg-amber-50/30'
              }`}
            >
              <CardContent className="p-4 space-y-3">
                {/* Match header */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                      #{entry.match_id}
                    </span>
                    <span className="font-mono text-xs font-bold text-oil-900 bg-oil-50 px-2 py-0.5 rounded border border-oil-200">
                      {entry.activity_id}
                    </span>
                    {idx === 0 && <span className="text-[10px] font-bold text-white bg-oil-800 px-1.5 py-0.5 rounded">Best Match</span>}
                  </div>
                  <VerificationBadge entry={entry} />
                </div>

                {/* Activity name & WBS */}
                <div>
                  <div className="text-sm font-bold text-slate-900">{entry.activity_name}</div>
                  {entry.wbs_code && (
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">WBS: {entry.wbs_code}</div>
                  )}
                </div>

                {/* 3-Signal Confidence Fusion */}
                <div className="bg-white rounded-lg border border-slate-200 p-3 space-y-2">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    3-Signal AI Confidence Fusion
                  </div>
                  <SignalBar label="Semantic" value={entry.semantic_score} color="bg-violet-500" />
                  <SignalBar label="Entity/Tag" value={entry.entity_score} color="bg-amber-500" />
                  <SignalBar label="WBS Context" value={entry.metadata_score} color="bg-blue-500" />
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                      <span className="text-slate-600">Final Fusion Score</span>
                      <span className={entry.final_confidence >= 0.9 ? 'text-emerald-700' : entry.final_confidence >= 0.7 ? 'text-amber-700' : 'text-rose-600'}>
                        {Math.round(entry.final_confidence * 100)}%
                      </span>
                    </div>
                    <ConfidenceBar score={entry.final_confidence} size="md" />
                    <div className="mt-1 text-[10px] text-slate-400 font-mono">
                      {entry.final_confidence >= 0.9
                        ? '▶ ≥90%: AI Auto-Link to Schedule'
                        : entry.final_confidence >= 0.7
                        ? '▶ 70-90%: Routes to Planner Review Queue'
                        : '▶ <70%: Low confidence — Unmatched Scope'}
                    </div>
                  </div>
                </div>

                {/* Verification audit row */}
                {entry.is_verified && (
                  <div className="bg-white rounded-lg border border-emerald-200 p-3">
                    <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Verification & Schedule Commit
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                      <div className="text-slate-500">Verified By:</div>
                      <div className="font-semibold text-slate-800">{entry.verified_by}</div>
                      <div className="text-slate-500">Method:</div>
                      <div className="font-semibold text-slate-800">
                        {entry.verification_type === 'AI' ? 'AI Auto-Match (≥90% Confidence)' : 'Manual Planner Sign-Off'}
                      </div>
                      <div className="text-slate-500">Date:</div>
                      <div className="font-semibold text-slate-800">{entry.verified_at}</div>
                      <div className="text-slate-500">Activity Status:</div>
                      <div className={`font-bold ${entry.activity_status === 'COMPLETED' ? 'text-emerald-700' : 'text-blue-700'}`}>
                        {entry.activity_status}
                      </div>
                    </div>
                  </div>
                )}

                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Matched: {entry.matched_at}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Info on how it works */}
      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 flex items-start gap-2">
        <Info className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
        <span>
          Reports with <strong>≥90% confidence</strong> are auto-linked to the baseline schedule by AI.
          Reports between <strong>70–90%</strong> are sent to the Central Planner for manual verification.
          Below 70% are flagged as <em>Unmatched / Novel Scope</em>.
        </span>
      </div>
    </div>
  );
};
