import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { X, Download, ExternalLink, FileText, Loader2, AlertCircle, FileSpreadsheet, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/Button';

interface WorkflowReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  projectName: string;
}

export const WorkflowReportModal: React.FC<WorkflowReportModalProps> = ({
  isOpen,
  onClose,
  projectId,
  projectName,
}) => {
  const navigate = useNavigate();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      if (blobUrl) {
        window.URL.revokeObjectURL(blobUrl);
        setBlobUrl(null);
      }
      setError(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    api
      .getWorkflowReportBlob(projectId)
      .then((blob) => {
        if (!isMounted) return;
        const url = window.URL.createObjectURL(blob);
        setBlobUrl(url);
      })
      .catch((err: any) => {
        if (!isMounted) return;
        setError(err?.message || 'Failed to generate workflow report');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, projectId]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!blobUrl) return;
    const a = document.createElement('a');
    a.href = blobUrl;
    const safeName = projectName.replace(/[^a-zA-Z0-9-_]/g, '_');
    a.download = `${safeName}_workflow_report.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleOpenNewTab = () => {
    if (blobUrl) {
      window.open(blobUrl, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 truncate">
                  Project Workflow Report
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-oil-800 text-white font-mono shrink-0">
                  SIH26122 Executive PDF
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {projectName} · Grouped by Discipline &amp; Interleaved Master Sequence
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {blobUrl && (
              <>
                <Button
                  size="sm"
                  onClick={handleDownload}
                  className="bg-oil-800 hover:bg-oil-900 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="Download PDF to computer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Download PDF</span>
                </Button>

                <button
                  onClick={handleOpenNewTab}
                  className="p-2 rounded-lg hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                  title="Open in new browser tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              </>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              title="Close viewer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 bg-slate-100 flex items-center justify-center min-h-[520px] overflow-hidden relative">
          {isLoading && (
            <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
              <Loader2 className="w-8 h-8 text-oil-800 animate-spin" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-800">Generating Workflow Report PDF...</p>
                <p className="text-xs text-slate-500 max-w-sm">
                  Compiling executive KPIs, per-discipline activity sequences, and cross-discipline timeline table.
                </p>
              </div>
            </div>
          )}

          {error && !isLoading && (
            <div className="flex flex-col items-center justify-center gap-4 p-8 text-center max-w-lg">
              {error.toLowerCase().includes('zero schedule activities') ||
              error.toLowerCase().includes('no schedule activities') ? (
                <>
                  <div className="p-3.5 rounded-2xl bg-amber-100 text-amber-800 ring-8 ring-amber-50">
                    <FileSpreadsheet className="w-8 h-8 text-amber-700" />
                  </div>
                  <div className="space-y-1.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      No Baseline Ingested
                    </span>
                    <h4 className="text-base font-bold text-slate-900 mt-1">
                      No Activities Found for {projectName}
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
                      Workflow reports are dynamically generated from project activities. Upload an Excel (.xlsx / .csv) or Primavera P6 (.xer) file in <strong>Baseline Setup</strong> to generate this project's operational workflow PDF.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        onClose();
                        navigate('/planner/setup');
                      }}
                      className="bg-oil-800 hover:bg-oil-900 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <span>Go to Baseline Setup</span>
                      <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                    </Button>
                    <Button size="sm" onClick={onClose} variant="outline" className="text-xs cursor-pointer">
                      Close
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 rounded-full bg-rose-100 text-rose-600">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-900">Could not generate report</p>
                    <p className="text-xs text-slate-600">{error}</p>
                  </div>
                  <Button size="sm" onClick={onClose} variant="outline" className="text-xs mt-2 cursor-pointer">
                    Close
                  </Button>
                </>
              )}
            </div>
          )}

          {blobUrl && !isLoading && !error && (
            <iframe
              src={blobUrl}
              title={`Workflow Report - ${projectName}`}
              className="w-full h-full min-h-[75vh] border-0"
            />
          )}
        </div>
      </div>
    </div>
  );
};
