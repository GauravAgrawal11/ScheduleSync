import React from 'react';

interface ConfidenceBarProps {
  score: number; // 0.0 to 1.0 or 0 to 100
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ConfidenceBar: React.FC<ConfidenceBarProps> = ({
  score,
  showLabel = true,
  size = 'md',
  className = '',
}) => {
  // Normalize to 0 - 100
  const percentage = score <= 1.0 ? Math.round(score * 100) : Math.round(score);

  // Safety-critical confidence tiers
  let colorClass = 'bg-rose-500';
  let trackClass = 'bg-rose-100';
  let textClass = 'text-rose-700';
  let tierLabel = 'Held / Manual';

  if (percentage >= 90) {
    colorClass = 'bg-emerald-500';
    trackClass = 'bg-emerald-100';
    textClass = 'text-emerald-700';
    tierLabel = 'High (>90%) · Auto';
  } else if (percentage >= 70) {
    colorClass = 'bg-amber-500';
    trackClass = 'bg-amber-100';
    textClass = 'text-amber-700';
    tierLabel = 'Medium (70-90%) · Review';
  }

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center text-xs font-semibold mb-1">
          <span className={textClass}>{tierLabel}</span>
          <span className="text-slate-700">{percentage}%</span>
        </div>
      )}
      <div className={`w-full rounded-full overflow-hidden ${trackClass} ${heightClasses[size]}`}>
        <div
          className={`${colorClass} ${heightClasses[size]} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
      </div>
    </div>
  );
};
