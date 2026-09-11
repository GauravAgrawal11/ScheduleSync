import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api, HistoricalDurationStatsResponse, HistoricalAskResponse, HistoricalMatchRow, HistoricalProjectItem } from '../api/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  Brain,
  Sparkles,
  Search,
  Database,
  History,
  AlertCircle,
  Clock,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
  Building2,
  FolderArchive,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

export const HistoricalMemoryPanel: React.FC = () => {
  const [question, setQuestion] = useState<string>('why did Line 24-type activities historically delay?');
  const [activeActivityType, setActiveActivityType] = useState<string>('erect_line');

  // Query duration stats
  const { data: durationStats, isLoading: isStatsLoading } = useQuery<HistoricalDurationStatsResponse>({
    queryKey: ['historical-duration-stats', activeActivityType],
    queryFn: () => api.getHistoricalDurationStats(activeActivityType),
  });

  // Query completed historical projects
  const { data: historicalProjects = [], isLoading: isProjectsLoading } = useQuery<HistoricalProjectItem[]>({
    queryKey: ['historical-projects'],
    queryFn: () => api.getHistoricalProjects(),
  });

  // Ask mutation
  const askMutation = useMutation<HistoricalAskResponse, Error, string>({
    mutationFn: (q: string) => api.askHistoricalMemory(q, 5),
  });

  const handleAsk = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!question.trim()) return;
    askMutation.mutate(question.trim());
  };

  const handleSampleQuery = (sampleQ: string) => {
    setQuestion(sampleQ);
    askMutation.mutate(sampleQ);
  };

  // Format Recharts data
  const chartData = durationStats?.stats?.map((s) => ({
    diameter: `${s.pipe_diameter_in}"`,
    actual: s.avg_actual_duration_days,
    planned: s.avg_planned_duration_days || 0,
    instances: s.instances || s.count,
    delay: s.avg_delay_days || 0,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-neutral-900 via-[#1f2125] to-neutral-900 rounded-xl p-5 text-white border border-neutral-700/80 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mt-1">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Institutional Memory: Closed-Project Knowledge Capture
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 font-mono">
                  Member C · RAG
                </span>
              </div>
              <p className="text-xs text-zinc-300 mt-1 max-w-2xl leading-relaxed">
                Aggregated empirical actuals from closed historical projects (HIST-P1: Kaziranga Tank Farm Expansion &amp; HIST-P2: Dhemaji Pipeline Corridor Upgrade).
                Empowered with 384-dimensional dense semantic vectors (all-MiniLM-L6-v2) for root-cause query retrieval.
              </p>
            </div>
          </div>

          {/* Quick metric stats */}
          <div className="flex items-center gap-3 self-start sm:self-center text-xs">
            <div className="px-3 py-2 rounded-lg bg-neutral-800/90 border border-neutral-700 text-center">
              <div className="text-[10px] text-zinc-400 uppercase font-semibold">Completed Projects</div>
              <div className="text-sm font-bold text-emerald-400 font-mono">2 Closed Archive</div>
            </div>
            <div className="px-3 py-2 rounded-lg bg-neutral-800/90 border border-neutral-700 text-center">
              <div className="text-[10px] text-zinc-400 uppercase font-semibold">Memory (Not Running)</div>
              <div className="text-sm font-bold text-white font-mono">36 Historical Acts</div>
            </div>
            <div className="px-3 py-2 rounded-lg bg-neutral-800/90 border border-neutral-700 text-center">
              <div className="text-[10px] text-zinc-400 uppercase font-semibold">Vector Column</div>
              <div className="text-sm font-bold text-cyan-400 font-mono">pgvector 384-d</div>
            </div>
          </div>
        </div>
      </div>

      {/* Completed & Archived Projects Repository */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FolderArchive className="w-4 h-4 text-emerald-600" />
                Completed &amp; Archived Capital Projects Repository
              </CardTitle>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                {historicalProjects.length} Projects Closed
              </span>
            </div>
            <CardDescription className="mt-0.5">
              Decommissioned and archived projects providing empirical actuals for AI vector matching and duration benchmarks (isolated from live running projects)
            </CardDescription>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-200 text-slate-700 self-start sm:self-center font-medium">
            GET /analytics/historical/projects
          </span>
        </CardHeader>
        <CardContent className="p-0">
          {isProjectsLoading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading archived projects...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <tr>
                    <th className="p-3 pl-5">Project Identifier</th>
                    <th className="p-3">Site Scope &amp; Region</th>
                    <th className="p-3">Schedule Window</th>
                    <th className="p-3">WBS Activities</th>
                    <th className="p-3">Empirical Delay Root Causes &amp; Insights</th>
                    <th className="p-3 text-right pr-5">Archive Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historicalProjects.map((proj) => (
                    <tr key={proj.project_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 pl-5">
                        <div className="font-mono font-bold text-oil-950 flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-oil-100 text-oil-800 text-[11px]">
                            {proj.project_id}
                          </span>
                          <span>{proj.project_name}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-slate-800 font-medium">{proj.site_type}</div>
                        <div className="text-[11px] text-slate-400">{proj.region}</div>
                      </td>
                      <td className="p-3 font-mono text-slate-600 text-[11px]">
                        {proj.start_date} &rarr; {proj.end_date}
                      </td>
                      <td className="p-3">
                        <div className="font-bold font-mono text-oil-900">
                          {proj.activity_count} Activities
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {proj.disciplines.map((d, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 text-slate-600 border border-slate-200"
                            >
                              {d}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 max-w-xs text-slate-600">
                        <p className="text-[11px] line-clamp-2">
                          {proj.key_delay_factors}
                        </p>
                        <button
                          onClick={() => {
                            const queryText = `what caused delays in ${proj.project_name} (${proj.project_id})?`;
                            setQuestion(queryText);
                            askMutation.mutate(queryText);
                          }}
                          className="text-[10px] text-oil-800 hover:text-oil-950 font-bold underline mt-1 flex items-center gap-1"
                        >
                          Query RAG Memory <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                      <td className="p-3 text-right pr-5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          {proj.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grid: Left = Duration Stats Chart, Right = Summary Stats Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Duration Stats Chart */}
        <Card className="lg:col-span-2 border-slate-200 shadow-sm">
          <CardHeader className="pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                Duration Benchmark by Pipe Diameter (Erect Line Actuals)
              </CardTitle>
              <CardDescription>
                Empirical average actual duration (days) vs planned baseline across {durationStats?.total_instances || 14} piping instances
              </CardDescription>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
              GET /analytics/historical/duration-stats
            </span>
          </CardHeader>

          <CardContent className="p-4">
            {isStatsLoading ? (
              <div className="h-72 flex items-center justify-center text-xs text-slate-400">
                Loading historical duration benchmarks...
              </div>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="diameter"
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      unit=" d"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#1e293b',
                        borderRadius: '0.5rem',
                        color: '#f8fafc',
                        fontSize: '11px',
                      }}
                      formatter={(val: any, name: string) => [
                        `${Number(val).toFixed(1)} days`,
                        name === 'actual' ? 'Actual Duration' : 'Planned Duration',
                      ]}
                      labelFormatter={(label) => `Pipe Diameter: ${label}`}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                      formatter={(val) => (val === 'actual' ? 'Average Actual Duration' : 'Average Planned Duration')}
                    />
                    <Bar
                      dataKey="actual"
                      name="actual"
                      fill="#2563eb"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="planned"
                      name="planned"
                      fill="#94a3b8"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Verified against worked example table: 6" (5.5d) → 24" (16.0d) progression</span>
              <span className="font-semibold text-blue-600">Trend: Duration scales non-linearly with pipe bore</span>
            </div>
          </CardContent>
        </Card>

        {/* Worked Example Comparison Table */}
        <Card className="border-slate-200 shadow-sm flex flex-col">
          <CardHeader className="pb-2 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Database className="w-4 h-4 text-slate-600" />
              Historical Ground Truth
            </CardTitle>
            <CardDescription>
              README_historical.md verification matrix
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold sticky top-0">
                <tr>
                  <th className="p-2.5 pl-4">Diameter</th>
                  <th className="p-2.5 text-center">Instances</th>
                  <th className="p-2.5 text-right pr-4">Avg Actual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {durationStats?.stats?.map((row) => (
                  <tr key={row.pipe_diameter_in} className="hover:bg-slate-50 transition-colors">
                    <td className="p-2.5 pl-4 font-bold text-slate-800 font-mono">
                      {row.pipe_diameter_in} in
                    </td>
                    <td className="p-2.5 text-center text-slate-600">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[11px]">
                        {row.instances} {row.instances === 1 ? 'task' : 'tasks'}
                      </span>
                    </td>
                    <td className="p-2.5 text-right pr-4 font-bold font-mono text-blue-600">
                      {row.avg_actual_duration_days.toFixed(1)} days
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* RAG Q&A Assistant: "Ask Historical Memory" */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Ask Historical Memory (Dense Vector Search &amp; Grounded Synthesis)
              </CardTitle>
              <CardDescription>
                Query the institutional knowledge base using natural language. Retrieves relevant past actuals and synthesizes root cause patterns.
              </CardDescription>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 self-start sm:self-center">
              POST /analytics/historical/ask
            </span>
          </div>

          {/* Quick Query Suggestion Chips */}
          <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2 border-t border-slate-200/60">
            <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-500" /> Quick Ask:
            </span>
            <button
              type="button"
              onClick={() => handleSampleQuery('why did Line 24-type activities historically delay?')}
              className="text-[11px] px-2.5 py-1 rounded-full bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-200 hover:border-amber-300 transition-colors"
            >
              "why did Line 24-type activities historically delay?"
            </button>
            <button
              type="button"
              onClick={() => handleSampleQuery('what caused delays during rainy weather?')}
              className="text-[11px] px-2.5 py-1 rounded-full bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-200 hover:border-amber-300 transition-colors"
            >
              "what caused delays during rainy weather?"
            </button>
            <button
              type="button"
              onClick={() => handleSampleQuery('civil foundation excavation and concrete delays')}
              className="text-[11px] px-2.5 py-1 rounded-full bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-200 hover:border-amber-300 transition-colors"
            >
              "civil foundation excavation &amp; concrete delays"
            </button>
            <button
              type="button"
              onClick={() => handleSampleQuery('hydrotest water and pump delays')}
              className="text-[11px] px-2.5 py-1 rounded-full bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-200 hover:border-amber-300 transition-colors"
            >
              "hydrotest water &amp; pump delays"
            </button>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-5">
          {/* Query Form */}
          <form onSubmit={handleAsk} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask any question about historical project delays (e.g. why did 16in lines delay?)"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-oil-800 text-xs font-medium placeholder:text-slate-400 shadow-sm"
              />
            </div>
            <button
              type="submit"
              disabled={askMutation.isPending || !question.trim()}
              className="px-5 py-2.5 rounded-lg bg-oil-900 hover:bg-oil-800 disabled:bg-slate-300 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              {askMutation.isPending ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Ask Knowledge Base</span>
                </>
              )}
            </button>
          </form>

          {/* Results Area */}
          {askMutation.isPending && (
            <div className="p-8 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2 animate-pulse">
              <div className="w-6 h-6 border-2 border-oil-800 border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="text-xs font-semibold text-slate-700">Embedding question &amp; searching 384-d vector space...</div>
              <div className="text-[10px] text-slate-400">Synthesizing strictly grounded executive summary across top matches</div>
            </div>
          )}

          {askMutation.isError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>Failed to execute RAG search: {askMutation.error.message}</span>
            </div>
          )}

          {askMutation.data && (
            <div className="space-y-4">
              {/* Grounded LLM Summary Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50/90 via-orange-50/50 to-amber-50/80 border border-amber-200 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-700 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                        Grounded AI Pattern Synthesis
                      </span>
                      <span className="text-[10px] text-amber-700 font-medium flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" /> Grounded in {askMutation.data.matches.length} retrieved rows
                      </span>
                    </div>
                    <p className="text-xs text-slate-800 font-medium leading-relaxed">
                      {askMutation.data.summary}
                    </p>
                  </div>
                </div>
              </div>

              {/* Retrieved Matching Activities List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
                  <span>Top-{askMutation.data.matches.length} Matching Historical Records</span>
                  <span className="text-slate-400 text-[10px] font-normal">Ranked by cosine similarity</span>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {askMutation.data.matches.map((item, idx) => {
                    const isDelayed = item.delay_days > 0;

                    return (
                      <div
                        key={idx}
                        className="p-3.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900">{item.activity_name}</span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                              {item.discipline}
                            </span>
                            {item.pipe_diameter_in && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200">
                                {item.pipe_diameter_in}" dia
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="text-slate-400 text-[11px]">{item.project_name}</span>
                            {item.delay_reason && (
                              <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-medium border border-amber-200/60">
                                Cause: {item.delay_reason}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-center flex-shrink-0">
                          <div className="text-right">
                            <div className="text-[10px] text-slate-400">Actual Duration</div>
                            <div className="text-xs font-bold font-mono text-slate-800">
                              {item.actual_duration_days ? `${item.actual_duration_days} days` : 'N/A'}
                            </div>
                          </div>

                          <div className="text-right min-w-[75px]">
                            {isDelayed ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                +{item.delay_days}d delay
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                On schedule
                              </span>
                            )}
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {(item.similarity_score * 100).toFixed(0)}% match
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Initial state placeholder when not yet asked */}
          {!askMutation.data && !askMutation.isPending && (
            <div className="p-6 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-400">
              Type a question above or click one of the suggested query chips to retrieve empirical delay history from past projects.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
