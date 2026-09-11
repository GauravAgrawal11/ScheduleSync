import React from 'react';
import brandLogoImg from '../assets/logo.png';

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
  const iconSize = size === 'sm' ? 'w-7 h-7 sm:w-8 sm:h-8' : size === 'lg' ? 'w-10 h-10' : 'w-8 h-8 sm:w-9 sm:h-9';
  const textHeight = size === 'sm' ? 'h-7 sm:h-8' : size === 'lg' ? 'h-10' : 'h-8 sm:h-9';
  const titleSize = size === 'sm' ? 'text-xs sm:text-sm' : size === 'lg' ? 'text-base' : 'text-xs sm:text-[15px]';
  const subSize = size === 'sm' ? 'text-[7px] sm:text-[8.5px]' : size === 'lg' ? 'text-[10px]' : 'text-[8px] sm:text-[9px]';

  const tagColorClass =
    tagColor === 'amber'
      ? 'bg-amber-100 text-amber-800 border-amber-300'
      : tagColor === 'slate'
      ? 'bg-slate-100 text-slate-700 border-slate-300'
      : 'bg-emerald-100 text-emerald-800 border-emerald-300';

  const isDark = theme === 'dark';

  const content = (
    <div className={`flex items-center gap-1.5 sm:gap-2.5 select-none min-w-0 ${className}`}>
      {/* Brand Logo with official Oil India insignia */}
      <img
        src={brandLogoImg}
        onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo.png'; }}
        alt="Oil India Limited ScheduleSync Logo"
        className={`${iconSize} rounded-full object-contain flex-shrink-0 bg-white p-0.5 shadow-2xs`}
      />
      <div className={`flex flex-col justify-between text-left py-0.5 ${textHeight} min-w-0`}>
        <div className="flex items-center gap-1 sm:gap-1.5 leading-none">
          <span className={`${titleSize} font-black tracking-tight leading-none flex items-center whitespace-nowrap`}>
            <span className={isDark ? 'text-white' : 'text-black'}>Schedule</span>
            <span className="text-[#9e1218] ml-0.5">Sync</span>
          </span>
          {roleTag && (
            <span className={`hidden sm:inline-block text-[8.5px] font-mono px-1 sm:px-1.5 py-0.2 rounded font-bold border ${tagColorClass} whitespace-nowrap`}>
              {roleTag}
            </span>
          )}
        </div>
        {/* User requirement: Under schedule sync, small "OIL INDIA LIMITED" */}
        <span
          className={`${subSize} font-black uppercase tracking-wider sm:tracking-widest leading-none truncate whitespace-nowrap ${
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
