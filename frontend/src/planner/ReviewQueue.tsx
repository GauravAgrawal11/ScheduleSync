import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, MatchReviewItem } from '../api/client';
import { useProjectStore } from './projectStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { ConfidenceBar } from '../components/ui/ConfidenceBar';
import { Button } from '../components/ui/Button';
import {
  Inbox,
  ChevronRight,
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  Sparkles,
  Filter,
  Search,
  CheckCircle2,
  Clock,
  Tag,
  FileText,
  User,
  Calendar,
  X,
  Layers,
  HelpCircle,
  ShieldCheck,
  Check,
} from 'lucide-react';


export const ReviewQueue: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { selectedProjectId } = useProjectStore();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [tierFilter, setTierFilter] = useState<'ALL' | 'REVIEW' | 'UNMATCHED' | 'VERIFIED'>('ALL');
  const [disciplineFilter, setDisciplineFilter] = useState<'ALL' | 'PIPING' | 'CIVIL' | 'ELECTRICAL'>('ALL');

  const { data: queue = [], isLoading } = useQuery({
    queryKey: ['review-queue'],
    queryFn: () => api.getReviewQueue(),
    refetchInterval: 15000,
  });

  // Sequence violations alert list
  const { data: sequenceViolations = [] } = useQuery({
    queryKey: ['sequence-violations', selectedProjectId],
    queryFn: () => api.getSequenceViolations(selectedProjectId),
    refetchInterval: 15000,
  });

  const acknowledgeViolationMutation = useMutation({
    mutationFn: (id: number) => api.acknowledgeSequenceViolation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequence-violations'] });
    },
  });

  // Calculate metrics
  const totalCount = queue.length;
  const reviewCount = queue.filter(
    (item) => item.decision === 'review' || (item.final_confidence >= 0.70 && item.final_confidence < 0.90)
  ).length;
  const unmatchedCount = queue.filter(
    (item) => item.decision === 'rejected' || item.decision === 'held' || item.final_confidence < 0.70
  ).length;
  const verifiedCount = queue.filter((item) => item.is_verified).length;

  // Filtered queue items
  const filteredQueue = useMemo(() => {
    return queue.filter((item) => {
      const isUnmatched = item.decision === 'rejected' || item.decision === 'held' || item.final_confidence < 0.70;
      const isReview = !isUnmatched && !item.is_verified;

      // Tier filter
      if (tierFilter === 'REVIEW' && !isReview) return false;
      if (tierFilter === 'UNMATCHED' && !isUnmatched) return false;
      if (tierFilter === 'VERIFIED' && !item.is_verified) return false;

      // Discipline filter
      if (disciplineFilter !== 'ALL' && item.discipline?.toUpperCase() !== disciplineFilter) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesText = item.report_snippet?.toLowerCase().includes(q);
        const matchesSup = item.supervisor?.toLowerCase().includes(q);
        const matchesActId = item.suggested_activity?.activity_id?.toLowerCase().includes(q);
        const matchesActName = item.suggested_activity?.activity_name?.toLowerCase().includes(q);
        const matchesLoc = item.location?.toLowerCase().includes(q);
        if (!matchesText && !matchesSup && !matchesActId && !matchesActName && !matchesLoc) {
          return false;
        }
      }

      return true;
    });
  }, [queue, tierFilter, disciplineFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-oil-900 text-white uppercase tracking-wider flex items-center gap-1">
              <Inbox className="w-3 h-3" /> AI Verification Pipeline
            </span>
            <span className="text-xs text-slate-500 font-mono">
              3-Signal Confidence Fusion (Semantic + Entity + Metadata)
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Review Queue · Candidate Activity Matches &amp; Unmatched Scope
          </h2>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex-wrap">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> &gt;90% Auto-linked
          </span>
          <span className="flex items-center gap-1.5 ml-2 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> 70-90% Review ({reviewCount})
          </span>
          <span className="flex items-center gap-1.5 ml-2 font-bold text-rose-700">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> &lt;70% Unmatched ({unmatchedCount})
          </span>
        </div>
      </div>

      {/* Sequence Violations Alert List */}
      {sequenceViolations.length > 0 && (
        <Card className="border-rose-300 bg-rose-50/80 p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
              <AlertTriangle className="w-4 h-4 text-rose-600 animate-pulse" />
              <span>Out-of-Sequence Activity Alerts ({sequenceViolations.length})</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 bg-rose-200/80 px-2 py-0.5 rounded border border-rose-300">
              Predecessor Unfinished
            </span>
          </div>

          <div className="space-y-2">
            {sequenceViolations.map((v) => (
              <div
                key={v.id}
                className="bg-white p-3 rounded-xl border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="font-mono font-black text-rose-900 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-300">
                      {v.activity_id}
                    </span>
                    <span className="font-bold text-slate-900">{v.activity_name || 'Activity'}</span>
                    <span className="text-slate-500">started before predecessor:</span>
                    <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                      {v.predecessor_activity_id}
                    </span>
                    <span className="text-slate-600">({v.predecessor_name || 'Predecessor'})</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span>
                      Predecessor Status:{' '}
                      <strong className="text-amber-700 uppercase">{v.predecessor_status || 'NOT COMPLETED'}</strong>
                    </span>
                    <span>
                      Detected:{' '}
                      {new Date(v.detected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => acknowledgeViolationMutation.mutate(v.id)}
                  disabled={acknowledgeViolationMutation.isPending}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition-all flex items-center gap-1.5 self-start sm:self-center flex-shrink-0 shadow-xs cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" /> Acknowledge
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4 bg-white border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase">Total in Queue</div>
          <div className="text-2xl font-black text-slate-900 mt-1 font-mono">{totalCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Pending engineering planner action</div>
        </Card>

        <Card className="p-4 bg-amber-50/70 border-amber-200 shadow-xs">
          <div className="text-xs font-bold text-amber-800 uppercase flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> Needs Review (70-90%)
          </div>
          <div className="text-2xl font-black text-amber-950 mt-1 font-mono">{reviewCount}</div>
          <div className="text-[10px] text-amber-700 mt-0.5">High probability candidate matches</div>
        </Card>

        <Card className="p-4 bg-rose-50/70 border-rose-200 shadow-xs">
          <div className="text-xs font-bold text-rose-800 uppercase flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Unmatched / Novel Scope (&lt;70%)
          </div>
          <div className="text-2xl font-black text-rose-950 mt-1 font-mono">{unmatchedCount}</div>
          <div className="text-[10px] text-rose-700 mt-0.5">Discrepancy, new scope, or held reports</div>
        </Card>
      </div>

      {/* Filter & Search Toolbar */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Tier Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setTierFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                tierFilter === 'ALL'
                  ? 'bg-oil-900 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Candidates ({totalCount})
            </button>
            <button
              onClick={() => setTierFilter('VERIFIED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                tierFilter === 'VERIFIED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-emerald-50 hover:text-emerald-800'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Verified ({verifiedCount})
            </button>
            <button
              onClick={() => setTierFilter('REVIEW')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                tierFilter === 'REVIEW'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-amber-50 hover:text-amber-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              Needs Review ({reviewCount})
            </button>
            <button
              onClick={() => setTierFilter('UNMATCHED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                tierFilter === 'UNMATCHED'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-700'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              Unmatched Scope ({unmatchedCount})
            </button>
          </div>

          {/* Discipline Pills & Search */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-1 text-[11px] font-bold">
              <button
                onClick={() => setDisciplineFilter('ALL')}
                className={`px-2 py-1 rounded transition-all ${
                  disciplineFilter === 'ALL'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setDisciplineFilter('PIPING')}
                className={`px-2 py-1 rounded transition-all ${
                  disciplineFilter === 'PIPING'
                    ? 'bg-amber-600 text-white'
                    : 'text-amber-700 hover:bg-amber-100'
                }`}
              >
                Piping
              </button>
              <button
                onClick={() => setDisciplineFilter('CIVIL')}
                className={`px-2 py-1 rounded transition-all ${
                  disciplineFilter === 'CIVIL'
                    ? 'bg-blue-600 text-white'
                    : 'text-blue-700 hover:bg-blue-100'
                }`}
              >
                Civil
              </button>
              <button
                onClick={() => setDisciplineFilter('ELECTRICAL')}
                className={`px-2 py-1 rounded transition-all ${
                  disciplineFilter === 'ELECTRICAL'
                    ? 'bg-purple-600 text-white'
                    : 'text-purple-700 hover:bg-purple-100'
                }`}
              >
                Electrical
              </button>
            </div>

            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search report text, supervisor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-oil-600 bg-white"
              />
            </div>
          </div>
        </div>

        {/* Candidate Match & Unmatched Reports List */}
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading review queue...</div>
          ) : filteredQueue.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500 space-y-2">
              <Sparkles className="w-8 h-8 text-emerald-500 mx-auto" />
              <div className="font-bold text-slate-800 text-sm">No items matching active filter criteria.</div>
              <p className="text-slate-400">
                {totalCount === 0
                  ? 'Review queue is clear. All incoming field reports have been linked.'
                  : 'Try switching filters or clearing your search query.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredQueue.map((item) => {
                const isUnmatched =
                  item.decision === 'rejected' || item.decision === 'held' || item.final_confidence < 0.70;

                return (
                  <div
                    key={item.match_id}
                    onClick={() => navigate(`/planner/review/${item.match_id}`)}
                    className="p-5 hover:bg-slate-50/90 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 text-xs flex-wrap">
                        {/* Status Tier Badge */}
                        {item.is_verified ? (
                          item.verification_type === 'AI' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              AI Auto-Verified (≥90%)
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" />
                              Planner Verified
                            </span>
                          )
                        ) : isUnmatched ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            Unmatched / Novel Scope (&lt;70%)
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Needs Review (70-90%)
                          </span>
                        )}

                        <span className="font-bold text-oil-900 font-mono">Match #{item.match_id}</span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-500">{item.report_date}</span>
                        <span className="text-slate-400">·</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 capitalize">
                          {item.discipline} ({item.location || 'Site Wide'})
                        </span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-500 text-[11px] font-medium">
                          By <strong>{item.supervisor}</strong>
                        </span>
                      </div>

                      {/* Report Snippet */}
                      <p
                        className={`text-xs text-slate-800 font-medium leading-relaxed p-3 rounded-xl border transition-colors ${
                          isUnmatched
                            ? 'bg-rose-50/40 border-rose-200 group-hover:border-rose-300'
                            : 'bg-slate-50/80 border-slate-200 group-hover:border-oil-300'
                        }`}
                      >
                        "{item.report_snippet}"
                      </p>

                      {/* Suggested Activity Linkage */}
                      <div className="text-xs text-slate-600 flex items-center gap-2 pt-0.5 flex-wrap">
                        <span className="text-slate-400 font-medium">
                          {isUnmatched ? 'Nearest Candidate (Low Confidence):' : 'Suggested Activity:'}
                        </span>
                        {item.suggested_activity ? (
                          <div className="flex items-center gap-1.5">
                            <strong className="text-oil-900 font-bold font-mono">
                              {item.suggested_activity.activity_id}
                            </strong>
                            <span className="text-slate-700">— {item.suggested_activity.activity_name}</span>
                            {item.suggested_activity.wbs_code && (
                              <span className="text-[10px] font-mono text-slate-400">
                                ({item.suggested_activity.wbs_code})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-rose-600 italic font-semibold">
                            No matching WBS activity found (Novel Scope)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Confidence bar & action button */}
                    <div className="w-full md:w-60 flex-shrink-0 flex flex-col justify-center space-y-2.5 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-slate-400">AI Confidence</span>
                        <span className="text-xs font-black font-mono text-slate-800">
                          {Math.round(item.final_confidence * 100)}%
                        </span>
                      </div>

                      <ConfidenceBar score={item.final_confidence} size="sm" />

                      <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between">
                        <span>Sem: {Math.round(item.signals.semantic * 100)}%</span>
                        <span>Ent: {Math.round(item.signals.entity * 100)}%</span>
                        <span>Meta: {Math.round(item.signals.metadata * 100)}%</span>
                      </div>

                      <Button
                        size="sm"
                        className={`w-full text-xs font-bold flex items-center justify-center gap-1 py-1.5 ${
                          isUnmatched
                            ? 'bg-rose-600 hover:bg-rose-700 text-white'
                            : 'bg-oil-800 hover:bg-oil-900 text-white'
                        }`}
                      >
                        Hero Review &amp; Relink <ArrowUpRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
