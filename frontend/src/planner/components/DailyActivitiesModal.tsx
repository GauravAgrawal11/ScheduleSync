import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  api,
  DailySummary,
  DailySummaryCompletedItem,
  DailySummaryRemainingItem,
} from '../../api/client';
import {
  X,
  Calendar,
  CheckCircle2,
  Clock,
  User,
  Search,
  Filter,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  HardHat,
  Layers,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  MapPin,
  GitBranch,
} from 'lucide-react';
import { ActivityDetailModal } from './ActivityDetailModal';

interface DailyActivitiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: number;
  initialDate?: string;
}

export const DailyActivitiesModal: React.FC<DailyActivitiesModalProps> = ({
  isOpen,
  onClose,
  projectId = 1,
  initialDate,
}) => {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || todayStr);
  const [activeTab, setActiveTab] = useState<'ALL' | 'COMPLETED' | 'REMAINING'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [disciplineFilter, setDisciplineFilter] = useState<string>('ALL');
  const [expandedActivityId, setExpandedActivityId] = useState<string | null>(null);
  const [detailModalActivityId, setDetailModalActivityId] = useState<string | null>(null);

  // Fetch Daily Summary for selected date
  const { data: summary, isLoading, isError } = useQuery({
    queryKey: ['daily-summary', projectId, selectedDate],
    queryFn: () => api.getDailySummary(projectId, selectedDate),
    enabled: isOpen,
  });

  // Combine completed and remaining items with a unified tag
  const allItems = useMemo(() => {
    if (!summary) return [];
    const completed = (summary.completed_today || []).map((item) => ({
      ...item,
      category: 'COMPLETED' as const,
      progress_pct: 100,
    }));
    const remaining = (summary.remaining_activities || []).map((item) => ({
      ...item,
      category: 'REMAINING' as const,
      progress_pct: item.progress_percent || (item.status === 'IN_PROGRESS' ? 60 : 0),
    }));
    return [...completed, ...remaining];
  }, [summary]);

  // Filter items
  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      // Tab filter
      if (activeTab === 'COMPLETED' && item.category !== 'COMPLETED') return false;
      if (activeTab === 'REMAINING' && item.category !== 'REMAINING') return false;

      // Discipline filter
      if (disciplineFilter !== 'ALL' && item.discipline?.toLowerCase() !== disciplineFilter.toLowerCase()) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = item.activity_id.toLowerCase().includes(q);
        const matchesName = item.activity_name.toLowerCase().includes(q);
        const matchesSup = item.supervisor?.toLowerCase().includes(q);
        const matchesDisc = item.discipline?.toLowerCase().includes(q);
        if (!matchesId && !matchesName && !matchesSup && !matchesDisc) return false;
      }

      return true;
    });
  }, [allItems, activeTab, disciplineFilter, searchQuery]);

  // Quick date jump handlers
  const handleDateChange = (offsetDays: number) => {
    const curr = new Date(selectedDate || todayStr);
    curr.setDate(curr.getDate() + offsetDays);
    setSelectedDate(curr.toISOString().split('T')[0]);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center justify-center shadow-xs">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">Daily Activities Schedule & Supervisor Matrix</h2>
                  <span className="text-[11px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                    Project #{projectId}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Comprehensive audit of daily completed vs. remaining activities with assigned supervisor details
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-200/80 text-slate-500 hover:text-slate-700 transition-colors"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Calendar Picker & Summary KPI Strip */}
          <div className="px-6 py-3.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
            {/* Calendar Controls */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Date:
              </span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-2.5 py-1 text-xs font-semibold font-mono bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <div className="flex items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => handleDateChange(-1)}
                  className="px-2 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition"
                >
                  Prev Day
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDate(todayStr)}
                  className="px-2.5 py-1 text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-md transition"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => handleDateChange(1)}
                  className="px-2 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition"
                >
                  Next Day
                </button>
              </div>
            </div>

            {/* KPI Cards Strip */}
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <div>
                  <span className="font-bold text-emerald-900 font-mono text-sm">
                    {summary?.completed_today_count ?? 0}
                  </span>
                  <span className="text-[11px] text-emerald-700 ml-1 font-medium">Completed Today</span>
                </div>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
                <Clock className="w-4 h-4 text-amber-600" />
                <div>
                  <span className="font-bold text-amber-900 font-mono text-sm">
                    {summary?.remaining_count ?? 0}
                  </span>
                  <span className="text-[11px] text-amber-700 ml-1 font-medium">Remaining Tasks</span>
                </div>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg">
                <Layers className="w-4 h-4 text-slate-600" />
                <div>
                  <span className="font-bold text-slate-900 font-mono text-sm">
                    {summary?.total_activities ?? 0}
                  </span>
                  <span className="text-[11px] text-slate-600 ml-1 font-medium">Total Scope</span>
                </div>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            {/* Tabs */}
            <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('ALL')}
                className={`px-3 py-1 rounded-md transition-all ${
                  activeTab === 'ALL'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({allItems.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('COMPLETED')}
                className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                  activeTab === 'COMPLETED'
                    ? 'bg-white text-emerald-800 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-emerald-700'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Completed ({summary?.completed_today_count ?? 0})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('REMAINING')}
                className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                  activeTab === 'REMAINING'
                    ? 'bg-white text-amber-800 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-amber-700'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Remaining ({summary?.remaining_count ?? 0})
              </button>
            </div>

            {/* Discipline and Search */}
            <div className="flex items-center gap-2 flex-1 sm:max-w-md justify-end">
              <select
                value={disciplineFilter}
                onChange={(e) => setDisciplineFilter(e.target.value)}
                className="px-2.5 py-1 text-xs font-medium bg-white border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">All Disciplines</option>
                <option value="piping">Piping</option>
                <option value="civil">Civil</option>
                <option value="electrical">Electrical</option>
              </select>

              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  placeholder="Search activity ID, name, or supervisor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Activities List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {isLoading ? (
              <div className="py-16 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                Loading daily activities for {selectedDate}...
              </div>
            ) : isError ? (
              <div className="py-12 text-center text-rose-500 text-xs">
                Failed to load activities for {selectedDate}. Please verify server connection.
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No activities match the selected filter criteria for {selectedDate}.
              </div>
            ) : (
              filteredItems.map((item) => {
                const isExpanded = expandedActivityId === item.activity_id;
                const isCompleted = item.category === 'COMPLETED';

                return (
                  <div
                    key={item.activity_id}
                    className={`border rounded-xl transition-all duration-150 overflow-hidden bg-white shadow-xs ${
                      isCompleted
                        ? 'border-emerald-200 hover:border-emerald-300'
                        : item.status === 'DELAYED'
                        ? 'border-rose-200 hover:border-rose-300'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Activity Header Row */}
                    <div
                      onClick={() => setExpandedActivityId(isExpanded ? null : item.activity_id)}
                      className="p-4 cursor-pointer hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                            {item.activity_id}
                          </span>
                          <span className="text-sm font-bold text-slate-900">
                            {item.activity_name}
                          </span>

                          {/* Discipline badge */}
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            {item.discipline || 'General'}
                          </span>

                          {/* Status pill */}
                          <span
                            className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                              isCompleted
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : item.status === 'IN_PROGRESS'
                                ? 'bg-blue-100 text-blue-800 border-blue-300'
                                : item.status === 'DELAYED'
                                ? 'bg-rose-100 text-rose-800 border-rose-300'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {isCompleted ? 'Completed' : item.status || 'Planned'}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          {item.planned_start && item.planned_finish && (
                            <span>
                              Planned: <strong className="text-slate-700 font-mono">{String(item.planned_start)}</strong> to <strong className="text-slate-700 font-mono">{String(item.planned_finish)}</strong>
                            </span>
                          )}
                          {isCompleted && item.actual_finish && (
                            <span className="text-emerald-700 font-medium">
                              Finished: <strong className="font-mono">{String(item.actual_finish)}</strong>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Prominent Supervisor Attribution Card */}
                      <div className="flex items-center gap-3">
                        <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-oil-700 text-white flex items-center justify-center text-xs font-bold">
                            <HardHat className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                              Assigned Supervisor
                            </div>
                            <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                              {item.supervisor || 'Unassigned'}
                              {item.supervisor_id && (
                                <span className="text-[10px] font-mono text-slate-500 font-normal">
                                  (ID: {item.supervisor_id})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-slate-400">
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                      </div>
                    </div>

                    {/* Expandable Activity & Supervisor Detailed Breakdown */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2 border-t border-slate-100 bg-slate-50/50 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {/* Col 1: WBS & Location */}
                          <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                            <div className="text-[10px] uppercase font-bold text-slate-400">Engineering Work Breakdown</div>
                            <div className="text-xs text-slate-700 flex items-center gap-1.5">
                              <Layers className="w-3.5 h-3.5 text-slate-500" />
                              WBS Code: <span className="font-mono font-bold text-slate-900">{item.wbs_code || item.activity_id}</span>
                            </div>
                            <div className="text-xs text-slate-700 flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-500" />
                              Location: <span className="font-medium text-slate-800">{item.location || 'Unit 3 / Main Process Area'}</span>
                            </div>
                          </div>

                          {/* Col 2: Dependencies & Predecessor */}
                          <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                            <div className="text-[10px] uppercase font-bold text-slate-400">Schedule Dependencies</div>
                            <div className="text-xs text-slate-700 flex items-center gap-1.5">
                              <GitBranch className="w-3.5 h-3.5 text-slate-500" />
                              Predecessor: <span className="font-mono font-bold text-slate-900">{item.predecessor_activity_id || 'None (Initial Activity)'}</span>
                            </div>
                            <div className="text-xs text-slate-700">
                              Progress: <strong className="font-mono text-emerald-700">{item.progress_pct}%</strong>
                            </div>
                          </div>

                          {/* Col 3: Supervisor Actions & Details */}
                          <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                            <div className="text-[10px] uppercase font-bold text-slate-400">Supervisor Profile</div>
                            <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-slate-500" />
                              {item.supervisor || 'Unassigned'}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Discipline: <strong className="text-slate-700">{item.discipline}</strong>
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-between pt-1">
                          <div className="text-[11px] text-slate-500">
                            {isCompleted ? (
                              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                <ShieldCheck className="w-3.5 h-3.5" /> Verified complete on schedule
                              </span>
                            ) : (
                              <span className="text-amber-700 font-medium">
                                Pending field submission from {item.supervisor || 'Supervisor'}
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => setDetailModalActivityId(item.activity_id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 rounded-lg transition shadow-xs"
                          >
                            <span>Open Full Activity Details</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
            <div>
              Showing <strong className="text-slate-800">{filteredItems.length}</strong> of{' '}
              <strong className="text-slate-800">{allItems.length}</strong> activities for {selectedDate}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Embedded Activity Detail Modal */}
      {detailModalActivityId && (
        <ActivityDetailModal
          activityId={detailModalActivityId}
          projectId={projectId}
          onClose={() => setDetailModalActivityId(null)}
        />
      )}
    </>
  );
};
