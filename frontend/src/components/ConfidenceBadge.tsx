import React from "react";

interface ConfidenceBadgeProps {
  score: number; // 0.0 to 1.0
  decision?: "auto" | "review" | "rejected";
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({ score, decision }) => {
  const percentage = Math.round(score * 100);

  if (score >= 0.9) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
        {percentage}% · Auto Suggest
      </span>
    );
  }

  if (score >= 0.7) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
        <span className="h-2 w-2 rounded-full bg-amber-500"></span>
        {percentage}% · Planner Review
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
      <span className="h-2 w-2 rounded-full bg-rose-500"></span>
      {percentage}% · Held / Manual Linking
    </span>
  );
};
