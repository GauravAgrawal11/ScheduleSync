import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ComplaintItem, ComplaintCategory, ComplaintStatus } from '../api/client';
import { useProjectStore } from './projectStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MessageSquare,
  Search,
  Filter,
  User,
  Calendar,
  Send,
  X,
  Check,
  Tag,
  Wrench,
  HardHat,
  Zap,
  Building,
  ArrowRight,
} from 'lucide-react';

export const ComplaintsPanel: React.FC = () => {
  const { selectedProjectId, selectedProjectName } = useProjectStore();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | ComplaintCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Response Modal State
  const [actionModal, setActionModal] = useState<{
    type: 'ACKNOWLEDGE' | 'RESOLVE';
    complaint: ComplaintItem;
  } | null>(null);
  const [responseText, setResponseText] = useState<string>('');

  // Fetch complaints
  const { data: complaints = [], isLoading } = useQuery({
    queryKey: ['complaints', selectedProjectId, statusFilter, categoryFilter],
    queryFn: () => api.getComplaints(selectedProjectId, statusFilter, categoryFilter),
  });

  // Acknowledge Mutation
  const ackMutation = useMutation({
    mutationFn: ({ id, response }: { id: number; response?: string }) =>
      api.acknowledgeComplaint(id, response),
    onSuccess: () => {
      setActionModal(null);
      setResponseText('');
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
    },
  });

  // Resolve Mutation
  const resolveMutation = useMutation({
    mutationFn: ({ id, response }: { id: number; response?: string }) =>
      api.resolveComplaint(id, response),
    onSuccess: () => {
      setActionModal(null);
      setResponseText('');
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
    },
  });

  const handleActionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionModal) return;

    if (actionModal.type === 'ACKNOWLEDGE') {
      ackMutation.mutate({
        id: actionModal.complaint.id,
        response: responseText.trim() || undefined,
      });
    } else {
      resolveMutation.mutate({
        id: actionModal.complaint.id,
        response: responseText.trim() || undefined,
      });
    }
  };

  // Filter complaints locally by search query
  const filteredComplaints = complaints.filter((comp) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      comp.supervisor_name.toLowerCase().includes(q) ||
      (comp.activity_id && comp.activity_id.toLowerCase().includes(q)) ||
      (comp.activity_name && comp.activity_name.toLowerCase().includes(q)) ||
      comp.description.toLowerCase().includes(q) ||
      (comp.planner_response && comp.planner_response.toLowerCase().includes(q))
    );
  });

  // Metric counts
  const totalCount = complaints.length;
  const openCount = complaints.filter((c) => c.status === 'OPEN').length;
  const ackCount = complaints.filter((c) => c.status === 'ACKNOWLEDGED').length;
  const resolvedCount = complaints.filter((c) => c.status === 'RESOLVED').length;

  const getCategoryBadge = (cat: ComplaintCategory) => {
    switch (cat) {
      case 'MATERIAL':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'LABOR':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'ACCESS':
        return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'EQUIPMENT':
        return 'bg-orange-100 text-orange-900 border-orange-300';
      case 'SAFETY':
        return 'bg-rose-100 text-rose-900 border-rose-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-900 text-white uppercase tracking-wider flex items-center gap-1">
              <AlertOctagon className="w-3 h-3" /> Field Blocker Dispatch
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Project #{selectedProjectId} · {selectedProjectName}
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Supervisor Operational Blockers &amp; Complaints
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl">
            Real-time operational obstacles reported by discipline supervisors (piping material holds, crane mobilization delays, permit access issues). Acknowledge receipt and log planner resolution actions.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-center">
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-400">Open Action Items</div>
            <div className="text-2xl font-black text-rose-600 font-mono">{openCount}</div>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 bg-white border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase">Total Logged</div>
          <div className="text-2xl font-black text-slate-900 mt-1 font-mono">{totalCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">All field reports</div>
        </Card>

        <Card className="p-4 bg-amber-50/70 border-amber-200 shadow-xs">
          <div className="text-xs font-bold text-amber-800 uppercase flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Open / Unhandled
          </div>
          <div className="text-2xl font-black text-amber-950 mt-1 font-mono">{openCount}</div>
          <div className="text-[10px] text-amber-700 mt-0.5">Requires acknowledgment</div>
        </Card>

        <Card className="p-4 bg-blue-50/70 border-blue-200 shadow-xs">
          <div className="text-xs font-bold text-blue-800 uppercase flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-blue-600" /> In Progress / Acknowledged
          </div>
          <div className="text-2xl font-black text-blue-950 mt-1 font-mono">{ackCount}</div>
          <div className="text-[10px] text-blue-700 mt-0.5">Planner notified supervisor</div>
        </Card>

        <Card className="p-4 bg-emerald-50/70 border-emerald-200 shadow-xs">
          <div className="text-xs font-bold text-emerald-800 uppercase flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Resolved
          </div>
          <div className="text-2xl font-black text-emerald-950 mt-1 font-mono">{resolvedCount}</div>
          <div className="text-[10px] text-emerald-700 mt-0.5">Bottleneck unblocked</div>
        </Card>
      </div>

      {/* Main Filter & Action Toolbar */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-oil-900 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Blockers ({complaints.length})
            </button>
            <button
              onClick={() => setStatusFilter('OPEN')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                statusFilter === 'OPEN'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-700'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              Open ({openCount})
            </button>
            <button
              onClick={() => setStatusFilter('ACKNOWLEDGED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                statusFilter === 'ACKNOWLEDGED'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-700'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              Acknowledged ({ackCount})
            </button>
            <button
              onClick={() => setStatusFilter('RESOLVED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                statusFilter === 'RESOLVED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Resolved ({resolvedCount})
            </button>
          </div>

          {/* Search & Category Filter */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white focus:ring-2 focus:ring-oil-600 font-semibold"
            >
              <option value="ALL">All Categories</option>
              <option value="MATERIAL">Material Delay</option>
              <option value="LABOR">Labor Shortage</option>
              <option value="ACCESS">Site Access / PTW</option>
              <option value="EQUIPMENT">Equipment Breakdown</option>
              <option value="SAFETY">Safety / Weather</option>
              <option value="OTHER">Other Operational</option>
            </select>

            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search blocker text, supervisor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-oil-600 bg-white"
              />
            </div>
          </div>
        </div>

        {/* Complaints List */}
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading site blockers...</div>
          ) : filteredComplaints.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="font-bold text-slate-700">No active blockers matching filter criteria.</p>
              <p className="text-slate-400">All field issues are cleared or no reports have been submitted.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredComplaints.map((comp) => (
                <div key={comp.id} className="p-4 hover:bg-slate-50/70 transition-colors space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Category Badge */}
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${getCategoryBadge(
                          comp.category
                        )}`}
                      >
                        {comp.category}
                      </span>

                      {/* Status Pill */}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          comp.status === 'RESOLVED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : comp.status === 'ACKNOWLEDGED'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                        }`}
                      >
                        {comp.status}
                      </span>

                      {/* Linked Activity Badge */}
                      {comp.activity_id && (
                        <div className="flex items-center gap-1 font-mono text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          <Tag className="w-3 h-3 text-oil-700" />
                          <strong className="text-slate-900">{comp.activity_id}</strong>
                          {comp.activity_name && (
                            <span className="text-slate-500 font-sans truncate max-w-[220px]">
                              — {comp.activity_name}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(comp.created_at).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Body & Supervisor Info */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-slate-800 flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-oil-800" /> {comp.supervisor_name}
                      </span>
                      {comp.supervisor_discipline && (
                        <span className="text-[10px] font-semibold px-2 py-0.2 rounded bg-oil-50 text-oil-900 border border-oil-200 capitalize">
                          {comp.supervisor_discipline}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-800 leading-relaxed font-medium bg-slate-50/90 p-3 rounded-xl border border-slate-200/80">
                      "{comp.description}"
                    </p>
                  </div>

                  {/* Planner Response Area */}
                  {comp.planner_response && (
                    <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200 text-xs text-slate-800 flex items-start gap-2.5">
                      <MessageSquare className="w-4 h-4 text-blue-700 mt-0.5 flex-shrink-0" />
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-blue-950 text-xs">Planner Resolution / Note:</span>
                          {comp.acknowledged_at && (
                            <span className="text-[10px] text-blue-700">
                              (Acknowledged: {new Date(comp.acknowledged_at).toLocaleDateString()})
                            </span>
                          )}
                        </div>
                        <p className="text-blue-900 text-xs leading-relaxed">{comp.planner_response}</p>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons for Planner */}
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                    {comp.status === 'OPEN' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setResponseText('');
                          setActionModal({ type: 'ACKNOWLEDGE', complaint: comp });
                        }}
                        className="text-xs text-blue-700 hover:bg-blue-50 border-blue-200 font-semibold flex items-center gap-1"
                      >
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        Acknowledge Issue
                      </Button>
                    )}

                    {comp.status !== 'RESOLVED' && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setResponseText('');
                          setActionModal({ type: 'RESOLVE', complaint: comp });
                        }}
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Mark as Resolved
                      </Button>
                    )}

                    {comp.status === 'RESOLVED' && (
                      <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 stroke-[3]" /> Issue Resolved
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Response Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                {actionModal.type === 'ACKNOWLEDGE' ? (
                  <>
                    <Clock className="w-5 h-5 text-blue-600" />
                    <h3 className="font-bold text-slate-900 text-sm">Acknowledge Field Blocker</h3>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-bold text-slate-900 text-sm">Resolve Field Blocker</h3>
                  </>
                )}
              </div>
              <button
                onClick={() => setActionModal(null)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleActionSubmit} className="mt-4 space-y-4">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                <div className="flex items-center justify-between font-semibold text-slate-700">
                  <span>Supervisor: {actionModal.complaint.supervisor_name}</span>
                  <span className="uppercase text-[10px]">{actionModal.complaint.category}</span>
                </div>
                <p className="text-slate-600 italic">"{actionModal.complaint.description}"</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Planner Note / Feedback to Supervisor (Optional)
                </label>
                <textarea
                  rows={3}
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder={
                    actionModal.type === 'ACKNOWLEDGE'
                      ? 'e.g., Procurement has been notified. 24-in spools being dispatched from Central Store...'
                      : 'e.g., Spare crane deployed on site. Work resumed at 14:00.'
                  }
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-oil-600 focus:outline-none leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActionModal(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={ackMutation.isPending || resolveMutation.isPending}
                  isLoading={ackMutation.isPending || resolveMutation.isPending}
                  className={`text-xs text-white font-bold flex items-center gap-1.5 ${
                    actionModal.type === 'ACKNOWLEDGE'
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  {actionModal.type === 'ACKNOWLEDGE' ? 'Confirm Acknowledgment' : 'Confirm Resolution'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
