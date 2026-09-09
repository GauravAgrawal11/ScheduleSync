import React, { useState } from 'react';
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
} from 'lucide-react';

export const ProjectSetup: React.FC = () => {
  const [name, setName] = useState('Numaligarh Refinery Expansion (Unit 3 & Offsites)');
  const [client, setClient] = useState('Oil India Limited');
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-12-31');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importSuccess, setImportSuccess] = useState<any | null>(null);
  const [assignmentSummary, setAssignmentSummary] = useState<any | null>(null);

  const { selectedProjectId } = useProjectStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: projectsData, isLoading: loadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.getProjects(),
  });

  const runAssignmentMutation = useMutation({
    mutationFn: () => api.runAssignment(selectedProjectId || 1),
    onSuccess: (data) => {
      setAssignmentSummary(data);
      queryClient.invalidateQueries({ queryKey: ['supervisor-workload'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-summary'] });
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: () => api.createProject({ name, client, start_date: startDate, end_date: endDate }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const importScheduleMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error('No file selected');
      return await api.importScheduleFile(1, selectedFile);
    },
    onSuccess: (data) => {
      setImportSuccess(data);
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-summary'] });
    },
  });

  const handleFileDrop = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Project Setup & Schedule Import</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure capital project boundaries and upload baseline WBS schedules (.xlsx or Primavera .xer)
        </p>
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

            <Button
              onClick={() => createProjectMutation.mutate()}
              isLoading={createProjectMutation.isPending}
              variant="outline"
              size="sm"
              className="w-full text-xs mt-2"
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
                <span>Failed to import schedule. Please check file formatting.</span>
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
                    File format: <span className="uppercase font-semibold">{importSuccess.source_type}</span> · Baseline WBS synchronized.
                  </p>
                </div>

                {/* Deliberate Admin Checkpoint: Auto-Assign Supervisors Button */}
                <div className="pt-2 border-t border-emerald-200">
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
        <CardContent className="p-0">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
              <tr>
                <th className="p-3 pl-5">Project Name</th>
                <th className="p-3">Client</th>
                <th className="p-3">Schedule Window</th>
                <th className="p-3">Activities</th>
                <th className="p-3 text-right pr-5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingProjects ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-400">Loading projects...</td>
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
                      {proj.activity_count || 36} activities
                    </td>
                    <td className="p-3 text-right pr-5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Active Baseline
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};
