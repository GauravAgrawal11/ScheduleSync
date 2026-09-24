import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface CopyableTextProps {
  text: string;
  textToCopy?: string;
  className?: string;
  showIcon?: boolean;
  tooltipTitle?: string;
  children?: React.ReactNode;
}

export const CopyableText: React.FC<CopyableTextProps> = ({
  text,
  textToCopy,
  className = '',
  showIcon = false,
  tooltipTitle = 'Click to copy',
  children,
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const payload = textToCopy || text;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(payload);
      } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = payload;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      console.warn('Failed to copy text:', err);
    }
  };

  return (
    <span
      onClick={handleCopy}
      title={copied ? 'Copied to clipboard!' : tooltipTitle}
      className={`relative inline-flex items-center gap-1.5 cursor-pointer rounded transition-all duration-150 group/copy select-text hover:bg-slate-100/80 px-1 -mx-1 ${className}`}
    >
      {children || text}
      {showIcon && (
        <span className="opacity-0 group-hover/copy:opacity-100 transition-opacity text-slate-400">
          <Copy className="w-3 h-3" />
        </span>
      )}
      {copied && (
        <span className="absolute -top-7 left-1/2 -translate-x-1/2 z-50 px-2 py-0.5 rounded-md bg-slate-900 text-white text-[10px] font-bold shadow-lg flex items-center gap-1 animate-in fade-in zoom-in-95 pointer-events-none whitespace-nowrap">
          <Check className="w-3 h-3 text-emerald-400" />
          Copied!
        </span>
      )}
    </span>
  );
};
