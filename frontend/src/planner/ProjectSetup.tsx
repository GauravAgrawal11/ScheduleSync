import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useProjectStore } from './projectStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  FolderPlus,
  FileUp,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Building,
  Sparkles,
  Zap,
  Users,
  ArrowRight,
  FileDown,
  Trash2,
} from 'lucide-react';
import { WorkflowReportModal } from './WorkflowReportModal';

export const ProjectSetup: React.FC = () => {
  const [name, setName] = useState('');
  const [client, setClient] = useState('Oil India Limited');
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-12-31');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importSuccess, setImportSuccess] = useState<any | null>(null);
  const [assignmentSummary, setAssignmentSummary] = useState<any | null>(null);
  const [isDownloadingReport, setIsDownloadingReport] = useState<boolean>(false);

  const { selectedProjectId, selectedProjectName, setProject } = useProjectStore();
  const [targetProjectId, setTargetProjectId] = useState<number>(selectedProjectId || 1);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: projectsData, isLoading: loadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.getProjects(),
  });

  // Keep targetProjectId in sync if active project changes
  useEffect(() => {
    if (selectedProjectId) {
      setTargetProjectId(selectedProjectId);
    }
  }, [selectedProjectId]);

  const runAssignmentMutation = useMutation({
    mutationFn: () => api.runAssignment(targetProjectId || selectedProjectId || 1),
    onSuccess: (data) => {
      setAssignmentSummary(data);
      queryClient.invalidateQueries({ queryKey: ['supervisor-workload'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-summary'] });
    },
  });

  const [createProjectSuccess, setCreateProjectSuccess] = useState<string | null>(null);
  const [createProjectError, setCreateProjectError] = useState<string | null>(null);

  const createProjectMutation = useMutation({
    mutationFn: () => {
      if (!name.trim()) throw new Error('Project name cannot be empty');
      return api.createProject({
        name: name.trim(),
        client: client.trim() || 'Oil India Limited',
        start_date: startDate,
        end_date: endDate,
      });
    },
    onSuccess: (newProj) => {
      setCreateProjectSuccess(`Project "${newProj.name}" created! Selected for schedule upload in Step 2.`);
      setCreateProjectError(null);
      setTargetProjectId(newProj.id);
      setProject({
        id: newProj.id,
        name: newProj.name,
        client: newProj.client,
        activity_count: 0,
      });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setName('');
    },
    onError: (err: any) => {
      setCreateProjectError(err?.message || 'Failed to create project');
      setCreateProjectSuccess(null);
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (projectId: number) => api.deleteProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
    onError: (err: any) => {
      alert(err?.message || 'Failed to delete project');
    },
  });

  const importScheduleMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error('No file selected');
      return await api.importScheduleFile(targetProjectId, selectedFile);
    },
    onSuccess: (data) => {
      setImportSuccess(data);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-summary'] });
    },
  });

  const handleFileDrop = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const [previewModalProject, setPreviewModalProject] = useState<{ id: number; name: string } | null>(null);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Project Ingestion &amp; Baseline Setup</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure capital project boundaries and upload baseline WBS schedules (.xlsx or Primavera .xer)
          </p>
        </div>
        <Button
          onClick={() => {
            const currentProj = projectsData?.projects.find((p) => p.id === (selectedProjectId || 1));
            setPreviewModalProject({
              id: selectedProjectId || 1,
              name: currentProj?.name || selectedProjectName || 'Project Workflow Report',
            });
          }}
          size="sm"
          className="bg-oil-800 hover:bg-oil-900 text-white font-bold text-xs flex items-center gap-2 shadow-xs shrink-0 cursor-pointer"
        >
          <FileDown className="w-4 h-4 text-emerald-400" />
          View / Download Workflow Report
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Step 1: Project Information */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
              <FolderPlus className="w-4 h-4 text-oil-800" />
              1. Project Definition
            </CardTitle>
            <CardDescription>Enter project metadata and contract lifecycle dates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Project Name</label>
              <input
                type="text"
                placeholder="e.g. Numaligarh Petrochemicals Expansion Phase 2"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-oil-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Client / Owner Organization</label>
              <input
                type="text"
                value={client}
                onChange={(e) => setClient(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-oil-600 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Completion Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                />
              </div>
            </div>

            {createProjectSuccess && (
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{createProjectSuccess}</span>
              </div>
            )}

            {createProjectError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{createProjectError}</span>
              </div>
            )}

            <Button
              onClick={() => createProjectMutation.mutate()}
              isLoading={createProjectMutation.isPending}
              disabled={!name.trim()}
              variant="outline"
              size="sm"
              className="w-full text-xs mt-2 cursor-pointer font-bold bg-slate-50 hover:bg-slate-100 disabled:opacity-50"
            >
              Save Project Parameters
            </Button>
          </CardContent>
        </Card>

        {/* Step 2: Baseline Schedule File Upload */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
              <FileUp className="w-4 h-4 text-oil-800" />
              2. Baseline Schedule Ingestion
            </CardTitle>
            <CardDescription>
              Upload Excel (.xlsx/.csv) or Primavera P6 export (.xer) with L1-L6 WBS hierarchy
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {/* Target Project Dropdown */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>Target Project:</span>
                <span className="text-[11px] font-mono text-oil-800 font-semibold">
                  {projectsData?.projects.find((p) => p.id === targetProjectId)?.activity_count ?? 0} activities
                </span>
              </label>
              <select
                value={targetProjectId}
                onChange={(e) => setTargetProjectId(Number(e.target.value))}
                className="w-full text-xs font-semibold border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 focus:ring-2 focus:ring-oil-800 focus:outline-none cursor-pointer"
              >
                {projectsData?.projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.activity_count ?? 0} activities)
                  </option>
                ))}
              </select>
            </div>

            <label className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center bg-slate-50 hover:border-oil-700 hover:bg-white cursor-pointer transition-all">
              <FileUp className="w-8 h-8 text-oil-700 mb-2" />
              <span className="text-xs font-bold text-slate-800">
                {selectedFile ? selectedFile.name : 'Choose or drop schedule file here'}
              </span>
              <span className="text-[11px] text-slate-500 mt-1 text-center">
                Supports <strong className="text-slate-700">.xlsx</strong>, <strong className="text-slate-700">.csv</strong>, and Primavera P6 <strong className="text-slate-700">.xer</strong>
              </span>
              <input type="file" accept=".xlsx,.xls,.csv,.xer" onChange={handleFileDrop} className="hidden" />
            </label>

            {importScheduleMutation.isError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>
                  {(importScheduleMutation.error as any)?.message || 'Failed to import schedule. Please check file formatting.'}
                </span>
              </div>
            )}

            <Button
              onClick={() => importScheduleMutation.mutate()}
              isLoading={importScheduleMutation.isPending}
              disabled={!selectedFile}
              size="md"
              className="w-full text-xs font-bold bg-oil-800 hover:bg-oil-900"
            >
              Parse & Ingest Baseline Activities
            </Button>

            {importSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Successfully ingested {importSuccess.imported_count} activities!
                  </div>
                  <p className="text-[11px] text-emerald-700">
                    File format: <span className="uppercase font-semibold">{importSuccess.source_type}</span> · Baseline WBS synchronized for project #{targetProjectId}.
                  </p>
                </div>

                {/* Download Workflow PDF & Auto-Assign Checkpoint */}
                <div className="pt-2 border-t border-emerald-200 space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      const activeProj = projectsData?.projects.find((p) => p.id === targetProjectId);
                      setPreviewModalProject({
                        id: targetProjectId,
                        name: activeProj?.name || `Project #${targetProjectId}`,
                      });
                    }}
                    className="w-full text-xs font-bold py-2 px-3 rounded-lg border border-emerald-400 bg-white hover:bg-emerald-100/70 text-emerald-950 flex items-center justify-center gap-2 transition-colors shadow-2xs cursor-pointer"
                  >
                    <FileDown className="w-4 h-4 text-emerald-600" />
                    View Ingested Workflow Report (PDF)
                  </button>

                  <Button
                    onClick={() => runAssignmentMutation.mutate()}
                    isLoading={runAssignmentMutation.isPending}
                    size="sm"
                    className="w-full text-xs font-bold bg-oil-900 hover:bg-oil-950 text-white flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    Auto-Assign Supervisors
                  </Button>
                </div>
              </div>
            )}

            {assignmentSummary && (
              <div className="p-3.5 rounded-xl bg-oil-950 text-white space-y-2.5 border border-oil-800 shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" /> Supervisor Assignment Complete
                  </span>
                  <button
                    onClick={() => navigate('/planner/workload')}
                    className="text-[11px] text-amber-300 hover:text-amber-200 font-semibold flex items-center gap-1 underline"
                  >
                    View Matrix <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-lg bg-oil-900 border border-oil-800">
                    <div className="text-base font-bold font-mono text-emerald-300">
                      {assignmentSummary.total_assigned}
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase">Assigned</div>
                  </div>
                  <div className="p-2 rounded-lg bg-oil-900 border border-oil-800">
                    <div className="text-base font-bold font-mono text-amber-300">
                      {assignmentSummary.unassigned_no_supervisor}
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase">Unassigned</div>
                  </div>
                  <div className="p-2 rounded-lg bg-oil-900 border border-oil-800">
                    <div className="text-base font-bold font-mono text-emerald-300">
                      Balanced
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase">Shift Capacity</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Standalone Quick Assignment Bar for Existing Projects */}
      <Card className="border-slate-200 bg-gradient-to-r from-oil-900 to-oil-950 text-white shadow-sm">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Resource Allocation
              </span>
              <span className="text-xs text-slate-300 font-medium">
                Active Project #{selectedProjectId || 1}
              </span>
            </div>
            <h3 className="text-sm font-bold text-white">
              Supervisor Workload Auto-Distribution
            </h3>
            <p className="text-xs text-slate-300">
              Distribute baseline schedule activities to qualified supervisors by discipline with balanced workload scheduling.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              onClick={() => runAssignmentMutation.mutate()}
              isLoading={runAssignmentMutation.isPending}
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow"
            >
              <Zap className="w-3.5 h-3.5 text-slate-950" />
              Run Auto-Assign
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/planner/workload')}
              className="text-xs text-white border-oil-700 hover:bg-oil-800 hover:text-white"
            >
              <Users className="w-3.5 h-3.5 mr-1" />
              Workload Matrix
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active Projects List */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Building className="w-4 h-4 text-slate-600" />
            Configured Projects on Server
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[650px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
              <tr>
                <th className="p-3 pl-5">Project Name</th>
                <th className="p-3">Client</th>
                <th className="p-3">Schedule Window</th>
                <th className="p-3">Activities</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right pr-5">Workflow Report</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingProjects ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400">Loading projects...</td>
                </tr>
              ) : (
                projectsData?.projects.map((proj) => (
                  <tr key={proj.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 pl-5 font-semibold text-slate-800">{proj.name}</td>
                    <td className="p-3 text-slate-600">{proj.client}</td>
                    <td className="p-3 text-slate-500">
                      {proj.start_date} to {proj.end_date}
                    </td>
                    <td className="p-3 font-mono font-medium text-oil-800">
                      {proj.activity_count !== undefined && proj.activity_count !== null
                        ? proj.activity_count
                        : 0}{' '}
                      activities
                    </td>
                    <td className="p-3">
                      {Number(proj.activity_count || 0) > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Active Baseline
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                          No Schedule Uploaded
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right pr-5">
                      <div className="flex items-center justify-end gap-2">
                        {Number(proj.activity_count || 0) > 0 ? (
                          <button
                            type="button"
                            onClick={() => setPreviewModalProject({ id: proj.id, name: proj.name })}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 transition-colors shadow-2xs cursor-pointer"
                            title={`View workflow PDF for ${proj.name}`}
                          >
                            <FileDown className="w-3.5 h-3.5 text-emerald-600" />
                            View PDF Report
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setTargetProjectId(proj.id);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold rounded-md border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 transition-colors cursor-pointer"
                            title={`Select ${proj.name} to upload schedule in Step 2`}
                          >
                            <FileUp className="w-3 h-3 text-amber-700" />
                            Upload Schedule
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Delete project "${proj.name}" (ID: ${proj.id})?`)) {
                              deleteProjectMutation.mutate(proj.id);
                            }
                          }}
                          disabled={deleteProjectMutation.isPending}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                          title={`Delete project ${proj.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Interactive On-Screen Workflow Report PDF Viewer Modal */}
      <WorkflowReportModal
        isOpen={!!previewModalProject}
        onClose={() => setPreviewModalProject(null)}
        projectId={previewModalProject?.id || 1}
        projectName={previewModalProject?.name || ''}
      />
    </div>
  );
};
