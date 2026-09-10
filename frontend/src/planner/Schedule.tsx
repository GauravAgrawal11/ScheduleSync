import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, Activity } from '../api/client';
import { useProjectStore } from './projectStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { CalendarRange, Filter, CheckCircle2, Clock, AlertCircle, Layers, FileDown } from 'lucide-react';
import { WorkflowReportModal } from './WorkflowReportModal';

export const Schedule: React.FC = () => {
  const [discipline, setDiscipline] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'Day' | 'Week' | 'Month'>('Day');
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const ganttContainerRef = useRef<HTMLDivElement>(null);

  const { selectedProjectId, selectedProjectName } = useProjectStore();

  const { data: activitiesData, isLoading } = useQuery({
    queryKey: ['activities', selectedProjectId, discipline],
    queryFn: () => api.getActivities(selectedProjectId, 1, 50, discipline === 'all' ? undefined : discipline),
  });

  const activities = activitiesData?.activities || [];

  // Attempt frappe-gantt mounting if container exists
  useEffect(() => {
    if (!ganttContainerRef.current || activities.length === 0) return;

    try {
      // Dynamic import of frappe-gantt if available
      import('frappe-gantt').then((GanttModule) => {
        const Gantt = (GanttModule as any).default || GanttModule;
        if (typeof Gantt === 'function' && ganttContainerRef.current) {
          ganttContainerRef.current.innerHTML = '';
          const tasks = activities.slice(0, 10).map((act) => ({
            id: act.activity_id,
            name: `${act.activity_id}: ${act.activity_name}`,
            start: act.planned_start || '2026-02-01',
            end: act.planned_finish || '2026-02-15',
            progress: act.status === 'COMPLETED' ? 100 : act.status === 'IN_PROGRESS' ? 60 : 0,
            custom_class: act.discipline === 'piping' ? 'bar-piping' : act.discipline === 'civil' ? 'bar-civil' : 'bar-elec',
          }));

          new Gantt(ganttContainerRef.current, tasks, {
            view_mode: viewMode,
            language: 'en',
            date_format: 'YYYY-MM-DD',
          });
        }
      }).catch(() => {
        // Fallback to rich SVG timeline rendered below
      });
    } catch {
      // Fallback
    }
  }, [activities, viewMode]);

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Gantt Schedule View · Planned vs Actuals
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-oil-900 text-emerald-400 border border-oil-700 font-mono">
              Project #{selectedProjectId} ({activities.length} Acts)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Visual comparison of baseline planned durations against AI-linked actual site progress events for <strong className="text-slate-700">{selectedProjectName}</strong>.
          </p>
        </div>

        {/* Discipline Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            {['all', 'piping', 'civil', 'electrical'].map((d) => (
              <button
                key={d}
                onClick={() => setDiscipline(d)}
                className={`px-3 py-1.5 rounded-lg capitalize transition-colors ${
                  discipline === d
                    ? 'bg-oil-800 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            {(['Day', 'Week', 'Month'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                  viewMode === m ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <Button
            onClick={() => setIsReportModalOpen(true)}
            size="sm"
            className="bg-oil-800 hover:bg-oil-900 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
            title="View executive project workflow report as multi-page PDF"
          >
            <FileDown className="w-3.5 h-3.5 text-emerald-400" />
            View Workflow Report (PDF)
          </Button>
        </div>
      </div>

      {/* Gantt Interactive Container */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <CalendarRange className="w-4 h-4 text-oil-800" />
              Schedule Gantt Timeline
            </CardTitle>
            <CardDescription>
              Green bars denote accepted site actuals written back into the baseline schedule
            </CardDescription>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-blue-600" /> Planned Baseline Bar
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500" /> Actual Linked Progress
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {/* Frappe Gantt Hook Container */}
          <div ref={ganttContainerRef} className="overflow-x-auto min-h-[160px]" />

          {/* High-fidelity fallback & detailed tabular timeline */}
          <div className="mt-6 border-t border-slate-100 pt-6">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">
              L5/L6 Activities Baseline vs Actual Progress Matrix
            </h4>

            {isLoading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading activities...</div>
            ) : (
              <div className="space-y-3">
                {activities.map((act) => {
                  const isDone = act.status === 'COMPLETED';
                  const isInProg = act.status === 'IN_PROGRESS';

                  return (
                    <div
                      key={act.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-oil-500 transition-all"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-oil-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                            {act.activity_id}
                          </span>
                          <span className="text-xs font-bold text-slate-800">{act.activity_name}</span>
                          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                            {act.discipline}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-slate-500">
                            Planned: {act.planned_start} → {act.planned_finish}
                          </span>
                          {act.actual_start && (
                            <span
                              className={`font-semibold px-2 py-0.5 rounded border ${
                                isDone
                                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                  : 'text-blue-700 bg-blue-50 border-blue-200'
                              }`}
                            >
                              Actual: {act.actual_start}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Visual Progress Bar representation */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                          <span>WBS: {act.wbs_code} · {act.location}</span>
                          <span
                            className={`font-semibold ${
                              isDone ? 'text-emerald-700 font-bold' : isInProg ? 'text-blue-700 font-bold' : 'text-slate-500'
                            }`}
                          >
                            {isDone ? '100% (Completed)' : isInProg ? '60% (In Progress)' : '0% (Not Started)'}
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden flex">
                          <div
                            className={`h-full transition-all duration-500 ${
                              isDone ? 'bg-emerald-500 w-full' : isInProg ? 'bg-blue-600 w-3/5' : 'w-0'
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Interactive On-Screen Workflow Report PDF Viewer Modal */}
      <WorkflowReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        projectId={selectedProjectId || 1}
        projectName={selectedProjectName || 'Numaligarh Refinery Expansion'}
      />
    </div>
  );
};
