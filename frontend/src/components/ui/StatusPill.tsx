import React from 'react';
import { useLanguageStore } from '../../supervisor/languageStore';

export type StatusType = 'matched' | 'pending' | 'review' | 'pending review' | 'rejected' | 'held' | 'auto' | 'approved';

interface StatusPillProps {
  status: StatusType | string;
  className?: string;
}

export const StatusPill: React.FC<StatusPillProps> = ({ status, className = '' }) => {
  const norm = (status || '').toLowerCase();
  const { language } = useLanguageStore();

  if (norm === 'matched' || norm === 'auto' || norm === 'approved') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        {language === 'hi' ? 'मैच हुआ' : 'Matched'}
      </span>
    );
  }

  if (norm === 'pending' || norm === 'review' || norm === 'pending review' || norm === 'queued') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        {norm === 'queued'
          ? (language === 'hi' ? 'कतार में' : 'Queued')
          : (language === 'hi' ? 'समीक्षा लंबित' : 'Pending Review')}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
      {norm === 'rejected'
        ? (language === 'hi' ? 'अस्वीकृत' : 'Rejected')
        : (language === 'hi' ? 'होल्ड' : 'Held')}
    </span>
  );
};

