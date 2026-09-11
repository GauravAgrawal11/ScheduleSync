import React from 'react';

interface BrandLogoProps {
  roleTag?: string;
  tagColor?: 'emerald' | 'amber' | 'slate';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  inCard?: boolean;
  theme?: 'light' | 'dark';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  roleTag,
  tagColor = 'slate',
  size = 'md',
  className = '',
  inCard = false,
  theme = 'light',
}) => {
  const iconSize = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-11 h-11' : 'w-9 h-9';
  const titleSize = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-base';
  const subSize = size === 'sm' ? 'text-[9px]' : size === 'lg' ? 'text-xs' : 'text-[10px]';

  const tagColorClass =
    tagColor === 'amber'
      ? 'bg-amber-100 text-amber-800 border-amber-300'
      : tagColor === 'slate'
      ? 'bg-slate-100 text-slate-700 border-slate-300'
      : 'bg-emerald-100 text-emerald-800 border-emerald-300';

  const isDark = theme === 'dark';

  const content = (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Brand Logo with pumpjack badge or official logo */}
      <img
        src="/assets/logo.png"
        onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo.png'; }}
        alt="Oil India Limited ScheduleSync Logo"
        className={`${iconSize} rounded-full object-contain shadow-xs border border-slate-200/90 bg-white flex-shrink-0 p-0.5`}
      />
      <div className="flex flex-col justify-center text-left">
        <div className="flex items-center gap-1.5">
          <span className={`${titleSize} font-black tracking-tight leading-tight flex items-center`}>
            <span className={isDark ? 'text-white' : 'text-black'}>SCHEDULE</span>
            <span className="text-[#9e1218] ml-0.5">SYNC</span>
          </span>
          {roleTag && (
            <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold border ${tagColorClass}`}>
              {roleTag}
            </span>
          )}
        </div>
        {/* User requirement: Under schedule sync, small "OIL INDIA LIMITED" */}
        <span
          className={`${subSize} font-black uppercase tracking-widest leading-none mt-0.5 ${
            isDark ? 'text-white' : 'text-black'
          }`}
          style={{ fontWeight: 900 }}
        >
          OIL INDIA LIMITED
        </span>
      </div>
    </div>
  );

  if (inCard) {
    return (
      <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200/90 shadow-xs inline-flex items-center">
        {content}
      </div>
    );
  }

  return content;
};
