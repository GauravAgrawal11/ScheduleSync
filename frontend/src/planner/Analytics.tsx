import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, ActivityBreakdownItem } from '../api/client';
import { useProjectStore } from './projectStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  Layers,
  Search,
  Check,
  AlertCircle,
  Calendar,
  Filter,
} from 'lucide-react';

export const Analytics: React.FC = () => {
  const {
    selectedProjectId,
    selectedProjectName,
    setProject,
  } = useProjectStore();

  const [activeTab, setActiveTab] = useState<'ALL' | 'COMPLETED' | 'IN_PROGRESS' | 'DELAYED' | 'PLANNED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [delayViewMode, setDelayViewMode] = useState<'DELAYING_ONLY' | 'ALL_ACTIVITIES'>('DELAYING_ONLY');

  // Fetch all available active running projects (strictly running projects only)
  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.getProjects(),
  });

  const projects = (projectsData?.projects || [
    {
      id: 1,
      name: 'Numaligarh Refinery Expansion (Unit 3 & Offsites)',
      client: 'Oil India Limited',
      activity_count: 36,
      status: 'RUNNING' as const,
    },
  ]).filter((p) => p.status !== 'COMPLETED');

  // Fetch summary for currently selected active running project
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics-summary', selectedProjectId],
    queryFn: () => api.getAnalyticsSummary(selectedProjectId),
  });

  // Calculate statistics across the baseline
  const totalActs = analytics?.total_activities || 36;
  const completedCount = analytics?.completed || 14;
  const inProgressCount = analytics?.in_progress || 11;
  const delayedCount = analytics?.delayed || 6;
  const scheduledCount = Math.max(0, totalActs - completedCount - inProgressCount - delayedCount);
  const reviewCount = analytics?.needs_review || 5;

  const completedPct = ((completedCount / totalActs) * 100).toFixed(1);
  const inProgressPct = ((inProgressCount / totalActs) * 100).toFixed(1);
  const delayedPct = ((delayedCount / totalActs) * 100).toFixed(1);
  const scheduledPct = ((scheduledCount / totalActs) * 100).toFixed(1);

  // Status Distribution Pie Data
  const statusPieData = [
    { name: 'Completed', value: completedCount, color: '#10B981' },
    { name: 'In Progress', value: inProgressCount, color: '#3B82F6' },
    { name: 'Delaying Schedule', value: delayedCount, color: '#EF4444' },
    { name: 'Scheduled Baseline', value: scheduledCount, color: '#94A3B8' },
  ];

  // Activities list for table and charts
  const activities: ActivityBreakdownItem[] = useMemo(() => {
    if (analytics?.activity_breakdown && analytics.activity_breakdown.length > 0) {
      return analytics.activity_breakdown;
    }
    return [];
  }, [analytics]);

  // Chart data for Delay Days assignment
  const delayChartData = useMemo(() => {
    if (delayViewMode === 'DELAYING_ONLY') {
      return activities
        .filter((a) => a.is_delaying || a.status === 'DELAYED' || a.delay_days > 0)
        .map((a) => ({
          activity_id: a.activity_id,
          name: a.name,
          discipline: a.discipline,
          delay_days: a.delay_days,
          bar_height: a.delay_days,
          is_delaying: true,
          status: a.status,
          trend: a.trend,
          reason: a.delay_reason || 'Site delay under investigation',
          fillColor: a.trend === 'recovering' ? '#F59E0B' : '#EF4444',
        }));
    }
    // All 36 activities
    return activities.map((a) => {
      let fillColor = '#94A3B8';
      let bar_height = 0.6; // Baseline upcoming work
      if (a.status === 'COMPLETED') {
        fillColor = '#10B981';
        bar_height = 3.0; // Completed execution bar!
      } else if (a.status === 'IN_PROGRESS') {
        fillColor = '#3B82F6';
        bar_height = 2.0; // In-progress active bar!
      } else if (a.status === 'DELAYED') {
        fillColor = a.trend === 'recovering' ? '#F59E0B' : '#EF4444';
        bar_height = Math.max(1, a.delay_days);
      }

      return {
        activity_id: a.activity_id,
        name: a.name,
        discipline: a.discipline,
        delay_days: a.delay_days,
        bar_height,
        is_delaying: a.is_delaying,
        status: a.status,
        trend: a.trend,
        reason: a.delay_reason || (a.status === 'COMPLETED' ? 'Completed on time' : a.status === 'IN_PROGRESS' ? 'Active on site on schedule' : 'Scheduled baseline upcoming work'),
        fillColor,
      };
    });
  }, [activities, delayViewMode]);

  // Filtered table rows
  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      // Tab filter
      if (activeTab === 'COMPLETED' && act.status !== 'COMPLETED') return false;
      if (activeTab === 'IN_PROGRESS' && act.status !== 'IN_PROGRESS') return false;
      if (activeTab === 'DELAYED' && !act.is_delaying && act.status !== 'DELAYED') return false;
      if (activeTab === 'PLANNED' && act.status !== 'PLANNED') return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = act.activity_id.toLowerCase().includes(q);
        const matchesName = act.name.toLowerCase().includes(q);
        const matchesDisc = act.discipline.toLowerCase().includes(q);
        const matchesReason = (act.delay_reason || '').toLowerCase().includes(q);
        if (!matchesId && !matchesName && !matchesDisc && !matchesReason) return false;
      }

      return true;
    });
  }, [activities, activeTab, searchQuery]);

  if (isLoading || !analytics) {
    return (
      <div className="p-16 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
        <div className="w-6 h-6 border-2 border-oil-600 border-t-transparent rounded-full animate-spin" />
        <span>Loading live project analytics cockpit for Project #{selectedProjectId}...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header with Active Running Project & Switcher (Completed Projects excluded) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Active Running Project
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Project ID: #{selectedProjectId}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
              {analytics.project_name || selectedProjectName}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live site telemetry, discipline productivity curves, and exact delay days assignment for {totalActs} baseline WBS activities.
            </p>
          </div>

          {/* Active Running Project Selector */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 px-2 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-slate-600" /> Active Running Projects ({projects.length}):
            </span>
            {projects.map((proj) => {
              const isSelected = proj.id === selectedProjectId;
              const actCount = proj.activity_count || 36;

              return (
                <button
                  key={proj.id}
                  onClick={() =>
                    setProject({
                      id: proj.id,
                      name: proj.name,
                      client: proj.client,
                      activity_count: actCount,
                    })
                  }
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-oil-900 text-white shadow-sm border border-oil-800'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span className="truncate max-w-[140px] sm:max-w-[200px]">{proj.name}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                      isSelected ? 'bg-emerald-400/20 text-emerald-300' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {actCount} Acts
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Metric Stat Cards - Explicitly totaling all 36 activities */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="p-4 bg-white border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-500" /> Total Activities
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
            {totalActs}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Running Baseline WBS</div>
        </Card>

        <Card className="p-4 bg-emerald-50/70 border-emerald-200 shadow-sm">
          <div className="text-xs font-semibold text-emerald-800 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Completed
          </div>
          <div className="text-2xl font-black text-emerald-950 mt-1 font-mono">
            {completedCount}
          </div>
          <div className="text-[10px] text-emerald-700 mt-0.5">{completedPct}% · 0d delay</div>
        </Card>

        <Card className="p-4 bg-blue-50/70 border-blue-200 shadow-sm">
          <div className="text-xs font-semibold text-blue-800 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-blue-600" /> In Progress
          </div>
          <div className="text-2xl font-black text-blue-950 mt-1 font-mono">
            {inProgressCount}
          </div>
          <div className="text-[10px] text-blue-700 mt-0.5">{inProgressPct}% · Live on site</div>
        </Card>

        <Card className="p-4 bg-rose-50/70 border-rose-200 shadow-sm">
          <div className="text-xs font-semibold text-rose-800 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Delaying Schedule
          </div>
          <div className="text-2xl font-black text-rose-950 mt-1 font-mono">
            {delayedCount}
          </div>
          <div className="text-[10px] text-rose-700 mt-0.5">{delayedPct}% · +1d to +4d delay</div>
        </Card>

        <Card className="p-4 bg-slate-50 border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-700 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-500" /> Scheduled
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
            {scheduledCount}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">{scheduledPct}% · Upcoming</div>
        </Card>
      </div>

      {/* GRAPH 1: Activity Schedule Variance & Delay Days Assignment */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-rose-600" />
                Activity Schedule Variance & Delay Impact Assignment
              </CardTitle>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                6 Activities Delaying Days
              </span>
            </div>
            <CardDescription className="mt-0.5">
              Exact days delayed assigned per activity across baseline WBS ({selectedProjectName})
            </CardDescription>
          </div>

          {/* Toggle View: Delaying Only vs All Activities */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setDelayViewMode('DELAYING_ONLY')}
              className={`px-3 py-1 rounded-md transition-all ${
                delayViewMode === 'DELAYING_ONLY'
                  ? 'bg-white text-slate-900 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Delaying Activities ({delayedCount})
            </button>
            <button
              onClick={() => setDelayViewMode('ALL_ACTIVITIES')}
              className={`px-3 py-1 rounded-md transition-all ${
                delayViewMode === 'ALL_ACTIVITIES'
                  ? 'bg-white text-slate-900 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All WBS Activities ({totalActs})
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={delayChartData}
                margin={{ top: 20, right: 20, left: 0, bottom: 40 }}
              >
                <XAxis
                  dataKey="activity_id"
                  stroke="#64748b"
                  fontSize={10}
                  angle={-45}
                  textAnchor="end"
                  interval={0}
                  tickMargin={8}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  label={{
                    value: delayViewMode === 'DELAYING_ONLY' ? 'Schedule Delay (Days)' : 'Activity Execution & Schedule Impact (Days)',
                    angle: -90,
                    position: 'insideLeft',
                    style: { fontSize: '11px', fill: '#64748b' },
                  }}
                  domain={[0, 5]}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const isDelaying = data.delay_days > 0;
                      const isCompleted = data.status === 'COMPLETED';
                      const isInProg = data.status === 'IN_PROGRESS';
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1 max-w-xs border border-slate-700">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-emerald-400">{data.activity_id}</span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                isCompleted
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                                  : isInProg
                                  ? 'bg-blue-950 text-blue-300 border border-blue-700'
                                  : isDelaying
                                  ? 'bg-rose-950 text-rose-300 border border-rose-700'
                                  : 'bg-slate-800 text-slate-300 border border-slate-700'
                              }`}
                            >
                              {data.status}
                            </span>
                          </div>
                          <div className="font-semibold text-slate-100">{data.name}</div>
                          <div className="text-[11px] text-slate-300">
                            Discipline: <span className="font-semibold text-white">{data.discipline}</span>
                          </div>
                          <div className="pt-1 border-t border-slate-800 flex items-center justify-between">
                            <span className="text-slate-400">Activity State:</span>
                            {isDelaying ? (
                              <span className="font-bold text-rose-400">
                                ⚠️ +{data.delay_days} Days Delay ({data.trend})
                              </span>
                            ) : isCompleted ? (
                              <span className="font-bold text-emerald-400">
                                ✓ 100% Completed on Time (0d Delay)
                              </span>
                            ) : isInProg ? (
                              <span className="font-bold text-blue-400">
                                ⚡ 60% In Progress on Track (0d Delay)
                              </span>
                            ) : (
                              <span className="font-bold text-slate-400">
                                Scheduled Baseline (0d Delay)
                              </span>
                            )}
                          </div>
                          {data.reason && (
                            <div className="text-[10px] text-amber-300/90 italic pt-0.5">
                              Note: {data.reason}
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine y={0} stroke="#cbd5e1" />
                <Bar
                  dataKey="bar_height"
                  name="Activity State"
                  radius={[4, 4, 0, 0]}
                >
                  {delayChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fillColor} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Color Legend for Delay Chart */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-2 border-t border-slate-100 text-xs text-slate-600">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-3 h-3 rounded-sm bg-rose-500" />
              Worsening Delay (+3d to +4d)
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-3 h-3 rounded-sm bg-amber-500" />
              Recovering Delay (+1d)
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-3 h-3 rounded-sm bg-emerald-500" />
              Completed ({completedCount} Acts · 0d delay)
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-3 h-3 rounded-sm bg-blue-500" />
              In Progress on Track ({inProgressCount} Acts · 0d delay)
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-3 h-3 rounded-sm bg-slate-400" />
              Scheduled Baseline ({scheduledCount} Acts · 0d delay)
            </span>
          </div>
        </CardContent>
      </Card>

      {/* GRAPH 2 & 3: Discipline Productivity & Completion Health Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Discipline Productivity Breakdown */}
        <Card className="lg:col-span-2 border-slate-200 shadow-sm">
          <CardHeader className="pb-2 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-oil-800" />
              Discipline-Wise Completed vs In-Progress vs Delaying
            </CardTitle>
            <CardDescription>
              Activity execution status distribution across engineering disciplines
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.discipline_productivity}>
                <XAxis dataKey="discipline" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="completed" name="Completed (0d Delay)" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="in_progress" name="In Progress (Active)" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="delayed" name="Delaying Schedule (+Days)" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution Donut Chart */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-800">
              Activity Completion & Health Ratio
            </CardTitle>
            <CardDescription>
              Across all {totalActs} baseline activities for {selectedProjectName}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 h-72 flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="80%">
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-3 text-[10px] font-semibold text-slate-600">
              {statusPieData.map((d) => (
                <span key={d.name} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                  {d.name}: {d.value}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FULL 36-ACTIVITY STATUS & DELAY ASSIGNMENT MATRIX / TABLE */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-oil-800" />
                Comprehensive Activity Status & Delay Assignment Matrix
              </CardTitle>
              <CardDescription>
                Detailed audit showing completion state, exact schedule delay days, and site observations for each activity
              </CardDescription>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search code, discipline, name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Activity Category Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'ALL'
                  ? 'bg-oil-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Activities ({totalActs})
            </button>
            <button
              onClick={() => setActiveTab('COMPLETED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'COMPLETED'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <Check className="w-3 h-3" />
              Completed ({completedCount})
            </button>
            <button
              onClick={() => setActiveTab('IN_PROGRESS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'IN_PROGRESS'
                  ? 'bg-blue-700 text-white shadow-sm'
                  : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
              }`}
            >
              <Clock className="w-3 h-3" />
              In Progress ({inProgressCount})
            </button>
            <button
              onClick={() => setActiveTab('DELAYED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'DELAYED'
                  ? 'bg-rose-700 text-white shadow-sm'
                  : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              Delaying Schedule (+Days) ({delayedCount})
            </button>
            <button
              onClick={() => setActiveTab('PLANNED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'PLANNED'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Calendar className="w-3 h-3" />
              Scheduled ({scheduledCount})
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="p-3 pl-5">Activity Code</th>
                  <th className="p-3">Activity Description</th>
                  <th className="p-3">Discipline</th>
                  <th className="p-3">Execution Status</th>
                  <th className="p-3">Delaying Days?</th>
                  <th className="p-3">Site Observation / Root Cause</th>
                  <th className="p-3 text-right pr-5">Velocity Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredActivities.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No activities match the current filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredActivities.map((item) => {
                    const isDelaying = item.is_delaying || item.status === 'DELAYED';
                    const isRecovering = item.trend === 'recovering';
                    const isCompleted = item.status === 'COMPLETED';
                    const isInProgress = item.status === 'IN_PROGRESS';

                    return (
                      <tr key={item.activity_id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 pl-5 font-mono font-bold text-oil-900">
                          {item.activity_id}
                        </td>
                        <td className="p-3 font-semibold text-slate-800">
                          {item.name}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              item.discipline.toLowerCase() === 'piping'
                                ? 'bg-amber-100 text-amber-800'
                                : item.discipline.toLowerCase() === 'civil'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {item.discipline}
                          </span>
                        </td>
                        <td className="p-3">
                          {isCompleted ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Completed
                            </span>
                          ) : isInProgress ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                              <Clock className="w-3 h-3 text-blue-600" />
                              In Progress
                            </span>
                          ) : isDelaying ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              Delayed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                              <Calendar className="w-3 h-3 text-slate-500" />
                              Scheduled
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          {isDelaying ? (
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                isRecovering
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : 'bg-rose-100 text-rose-900 border border-rose-300'
                              }`}
                            >
                              ⚠️ YES: +{item.delay_days} {item.delay_days === 1 ? 'Day' : 'Days'} Delayed
                            </span>
                          ) : isCompleted ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              ✓ NO: Completed (0d)
                            </span>
                          ) : isInProgress ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              ✓ NO: On Schedule (0d)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-50 text-slate-600 border border-slate-200">
                              ✓ NO: Upcoming (0d)
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-slate-600 max-w-xs truncate">
                          {item.delay_reason || (isCompleted ? 'Completed on baseline target' : 'Active work proceeding smoothly')}
                        </td>
                        <td className="p-3 text-right pr-5">
                          {isCompleted ? (
                            <span className="text-[10px] font-bold text-emerald-700">Closed</span>
                          ) : isRecovering ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                              Recovering
                            </span>
                          ) : isDelaying ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                              <ArrowDownRight className="w-3 h-3 text-rose-600" />
                              Worsening
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 font-medium">On Track</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
