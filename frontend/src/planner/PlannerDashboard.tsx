import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X, Eye, Calendar, MapPin, Tag, AlertTriangle } from "lucide-react";
import { ConfidenceBadge } from "../components/ConfidenceBadge";
import { BrandLogo } from "../components/BrandLogo";
import { api } from "../api/client";

/**
 * Frontend 2: Planner/Admin Dashboard & The Hero Approval Screen
 * Interactive review queue with 3-signal scores and one-click approve/reject actions.
 */
export const PlannerDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"hero" | "gantt" | "schedule">("hero");
  const queryClient = useQueryClient();

  // Sample hero card state demonstrating 3-signal scoring match
  const [matchStatus, setMatchStatus] = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING");

  const { data: sequenceViolations = [] } = useQuery({
    queryKey: ["sequence-violations-dashboard"],
    queryFn: () => api.getSequenceViolations(),
    refetchInterval: 15000,
  });

  const ackMutation = useMutation({
    mutationFn: (id: number) => api.acknowledgeSequenceViolation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sequence-violations-dashboard"] });
    },
  });

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between">
        <BrandLogo roleTag="PLANNER COCKPIT" tagColor="emerald" size="md" />
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("hero")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === "hero" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Review Queue (Hero Screen)
          </button>
          <button
            onClick={() => setActiveTab("gantt")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === "gantt" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Gantt Baseline vs Actual
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-8 space-y-6">
        {/* Sequence Violations Alert List */}
        {sequenceViolations.length > 0 && (
          <div className="bg-rose-50 border border-rose-300 rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-950 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-rose-600 animate-pulse" />
                <span>Sequence Violations Alert ({sequenceViolations.length})</span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 bg-rose-200/80 px-2 py-0.5 rounded border border-rose-300">
                Predecessor Unfinished
              </span>
            </div>

            <div className="space-y-2">
              {sequenceViolations.map((v) => (
                <div
                  key={v.id}
                  className="bg-white p-3.5 rounded-xl border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className="font-mono font-black text-rose-900 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-300">
                        {v.activity_id}
                      </span>
                      <span className="font-bold text-slate-900">{v.activity_name || "Activity"}</span>
                      <span className="text-slate-500">started before predecessor:</span>
                      <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        {v.predecessor_activity_id}
                      </span>
                      <span className="text-slate-600">({v.predecessor_name || "Predecessor"})</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      <span>
                        Predecessor Status:{" "}
                        <strong className="text-amber-700 uppercase">{v.predecessor_status || "NOT COMPLETED"}</strong>
                      </span>
                      <span>
                        Detected:{" "}
                        {new Date(v.detected_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => ackMutation.mutate(v.id)}
                    disabled={ackMutation.isPending}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition-all flex items-center gap-1.5 self-start sm:self-center flex-shrink-0 shadow-xs cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" /> Acknowledge
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        {activeTab === "hero" && (
          <section>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Pending Match Triage</h2>
                <p className="text-xs text-slate-500">
                  AI extracted site activity events matched against L5/L6 project baseline.
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-white px-3 py-1.5 rounded-md border border-slate-200">
                1 Candidate Awaiting Action
              </span>
            </div>

            {/* THE HERO CARD */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-5">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Source Daily Report #10 · 2026-03-05
                  </span>
                  <p className="text-sm font-medium text-slate-800 italic mt-1 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    "Piping crew completed spool erection for Line 24 in Unit 3 today. 4 joints fitted up."
                  </p>
                </div>
                <ConfidenceBadge score={0.94} decision="auto" />
              </div>

              {/* 3-Signal Score Breakdown */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-xs text-slate-500 block">1. Semantic Similarity</span>
                  <span className="text-base font-bold text-slate-800">0.91 (91%)</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">all-MiniLM-L6-v2 vector match</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-xs text-slate-500 block">2. Entity Verification</span>
                  <span className="text-base font-bold text-emerald-600">1.00 (100%)</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Line 24 ✓ · Piping ✓ · Unit 3 ✓</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-xs text-slate-500 block">3. WBS / Metadata Context</span>
                  <span className="text-base font-bold text-slate-800">0.85 (85%)</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Predecessor civil plinth done</span>
                </div>
              </div>

              {/* Suggested Baseline Activity Match */}
              <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100 mb-6">
                <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide block mb-1">
                  Suggested Baseline Activity Match (WBS Level 6)
                </span>
                <h3 className="text-base font-bold text-blue-950">
                  PIP-L6-001: Erect Line 24 Spool Piping in Unit 3
                </h3>
                <div className="flex gap-4 mt-2 text-xs text-blue-800">
                  <span className="flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-blue-600" /> Discipline: Piping
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" /> Location: Unit 3, Area B
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" /> Planned: 2026-03-01 to 2026-03-10
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-slate-500">
                  Status:{" "}
                  <span
                    className={`font-semibold ${
                      matchStatus === "APPROVED"
                        ? "text-emerald-600"
                        : matchStatus === "REJECTED"
                        ? "text-rose-600"
                        : "text-amber-600"
                    }`}
                  >
                    {matchStatus}
                  </span>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setMatchStatus("REJECTED")}
                    className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
                  >
                    <X className="w-4 h-4 text-rose-500" /> Reject / Hold
                  </button>
                  <button
                    onClick={() => setMatchStatus("APPROVED")}
                    className="px-5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1.5 transition-colors"
                  >
                    <Check className="w-4 h-4" /> One-Click Approve & Update Gantt
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === "gantt" && (
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-2">Project Gantt Chart (Planned vs Actual)</h2>
            <p className="text-xs text-slate-500 mb-6">
              Green bars represent accepted progress events linked from daily site reports.
            </p>
            <div className="h-64 border border-dashed border-slate-200 rounded-lg flex items-center justify-center text-slate-400 text-sm">
              [frappe-gantt container mounted with planned vs actual progress]
            </div>
          </section>
        )}
      </main>
    </div>
  );
};
