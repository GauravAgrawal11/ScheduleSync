import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { Card, CardContent } from '../components/ui/Card';
import { StatusPill } from '../components/ui/StatusPill';
import { ConfidenceBar } from '../components/ui/ConfidenceBar';
import { ArrowLeft, Search, Bot, User, ShieldCheck, Clock, ChevronRight, WifiOff, RefreshCw } from 'lucide-react';
import { getQueuedReports } from './offline/queue';
import { onSyncCompleted, flushQueue } from './offline/syncManager';

export const Submissions: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'matched' | 'pending' | 'rejected'>('all');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Listen for sync completions to automatically refresh queued and server lists
  useEffect(() => {
    const unsub = onSyncCompleted(() => {
      queryClient.invalidateQueries({ queryKey: ['my-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['queued-reports'] });
    });
    return unsub;
  }, [queryClient]);

  // Fetch local IndexedDB queued reports
  const { data: queuedReports = [] } = useQuery({
    queryKey: ['queued-reports'],
    queryFn: () => getQueuedReports(),
    refetchInterval: 4000,
  });

  // Fetch real submissions from server
  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ['my-submissions'],
    queryFn: () => api.getMySubmissions(),
    refetchInterval: 15000, // auto-refresh to pick up planner approvals
  });

  // Map queued reports into compatible shape
  const normalizedQueued = queuedReports.map((q) => ({
    id: q.id as any,
    is_queued: true,
    date: q.queued_at ? q.queued_at.split('T')[0] : 'Today',
    time: q.queued_at ? new Date(q.queued_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
    raw_text: q.text,
    discipline: q.discipline,
    location: q.location,
    status: 'queued',
    confidence: 0,
    match_log: [] as any[],
    is_verified: false,
    verification_type: undefined,
    verified_by: undefined,
    verified_at: undefined,
  }));

  // Merge queued offline items at the top of the submissions list
  const mergedSubmissions = [...normalizedQueued, ...submissions];

  const filtered = mergedSubmissions.filter((sub) => {
    if (filter === 'matched' && (sub.is_queued || sub.status !== 'matched')) return false;
    if (filter === 'pending' && (!sub.is_queued && sub.status !== 'pending review')) return false;
    if (filter === 'rejected' && (sub.is_queued || sub.status !== 'rejected')) return false;
    if (search && !sub.raw_text.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const matchedCount = submissions.filter((s) => s.status === 'matched').length;
  const pendingCount = submissions.filter((s) => s.status === 'pending review').length + queuedReports.length;
  const aiVerified = submissions.filter((s) => s.is_verified && s.verification_type === 'AI').length;
  const manualVerified = submissions.filter((s) => s.is_verified && s.verification_type === 'MANUAL').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/supervisor')}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-base font-bold text-slate-800">My Site Reports &amp; Match Log</h2>
          <p className="text-[11px] text-slate-500">Historical field reports with AI matching &amp; planner verification trail</p>
        </div>
      </div>

      {/* Offline Queue Notification banner if items exist */}
      {queuedReports.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2 text-xs text-amber-900 font-bold">
            <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 animate-pulse" />
            <span>{queuedReports.length} report(s) queued locally for automatic sync</span>
          </div>
          <button
            onClick={() => flushQueue()}
            className="px-2.5 py-1 rounded-lg bg-amber-200/80 hover:bg-amber-300 text-amber-900 font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" /> Sync Now
          </button>
        </div>
      )}

      {/* Verification summary bar */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center gap-2">
          <Bot className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <div>
            <div className="text-xs font-black text-emerald-900">{aiVerified}</div>
            <div className="text-[10px] text-emerald-700 font-medium">AI Auto-Verified</div>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 flex items-center gap-2">
          <User className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <div>
            <div className="text-xs font-black text-blue-900">{manualVerified}</div>
            <div className="text-[10px] text-blue-700 font-medium">Planner Verified</div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search report text..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-oil-600 focus:outline-none bg-white"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              filter === 'all'
                ? 'bg-oil-800 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            All ({mergedSubmissions.length})
          </button>
          <button
            onClick={() => setFilter('matched')}
            className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              filter === 'matched'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Verified &amp; Matched ({matchedCount})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              filter === 'pending'
                ? 'bg-amber-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            In Review / Queued ({pendingCount})
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              filter === 'rejected'
                ? 'bg-rose-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Held / Unmatched
          </button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {isLoading && queuedReports.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading submissions...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
            No submissions found for this filter.
          </div>
        ) : (
          filtered.map((sub: any) => {
            // Distinct visual style for locally queued item
            if (sub.is_queued) {
              return (
                <Card
                  key={sub.id}
                  className="border-amber-300 bg-amber-50/50 shadow-2xs"
                >
                  <CardContent className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-amber-900">
                          Offline Queue
                        </span>
                        <span className="text-[10px] text-slate-400">{sub.date} {sub.time}</span>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                        <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                        Queued — will send when online
                      </span>
                    </div>

                    <p className="text-xs text-slate-800 font-medium leading-relaxed line-clamp-3">
                      "{sub.raw_text}"
                    </p>

                    <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between text-[10px] text-slate-600">
                      <span>Discipline: <strong>{sub.discipline}</strong> · Location: <strong>{sub.location}</strong></span>
                      <span className="text-amber-800 font-semibold italic">Stored in IndexedDB</span>
                    </div>
                  </CardContent>
                </Card>
              );
            }

            const bestMatch = (sub.match_log || []).find((m: any) => m.is_verified) || sub.match_log?.[0];
            return (
              <Card
                key={sub.id}
                onClick={() => navigate(`/supervisor/submissions/${sub.id}`)}
                className="cursor-pointer hover:border-oil-600 transition-all hover:shadow-sm"
              >
                <CardContent className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-oil-800">
                        Report #{sub.id}
                      </span>
                      <span className="text-[10px] text-slate-400">{sub.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Verification badge */}
                      {sub.is_verified ? (
                        sub.verification_type === 'AI' ? (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <Bot className="w-2.5 h-2.5" /> AI
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                            <ShieldCheck className="w-2.5 h-2.5" /> Planner
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          <Clock className="w-2.5 h-2.5" /> Review
                        </span>
                      )}
                      <StatusPill status={sub.status} />
                    </div>
                  </div>

                  <p className="text-xs text-slate-800 font-medium leading-relaxed line-clamp-2">
                    "{sub.raw_text}"
                  </p>

                  {/* Match log summary */}
                  {bestMatch && (
                    <div className="pt-2 border-t border-slate-100 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-500">
                          Matched Activity:
                        </span>
                        <span className="font-mono font-bold text-oil-900 bg-oil-50 px-1 py-0.5 rounded border border-oil-200 text-[10px]">
                          {bestMatch.activity_id}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-700 font-medium truncate">
                        {bestMatch.activity_name}
                      </div>
                      <div className="flex items-center gap-3 text-[9px] text-slate-400 font-mono">
                        <span>Sem: {Math.round(bestMatch.semantic_score * 100)}%</span>
                        <span>Ent: {Math.round(bestMatch.entity_score * 100)}%</span>
                        <span>Meta: {Math.round(bestMatch.metadata_score * 100)}%</span>
                      </div>
                      <ConfidenceBar score={bestMatch.final_confidence} size="sm" />
                      {sub.is_verified && (
                        <div className="text-[10px] text-slate-500">
                          Verified by <strong className="text-slate-700">{sub.verified_by}</strong> on {sub.verified_at}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-end text-[10px] text-oil-700 font-semibold">
                    View full audit log <ChevronRight className="w-3 h-3" />
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
