import React, { useState } from 'react';
import {
  X,
  HelpCircle,
  Phone,
  Mail,
  FileText,
  ShieldAlert,
  Mic,
  CalendarRange,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { Button } from './ui/Button';

interface HelpSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  role?: 'planner' | 'supervisor';
}

export const HelpSupportModal: React.FC<HelpSupportModalProps> = ({
  isOpen,
  onClose,
  role = 'planner',
}) => {
  const [activeTab, setActiveTab] = useState<'GUIDE' | 'CONTACT' | 'FAQ'>('GUIDE');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-[#0a0b0e] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-500">
              <HelpCircle className="w-5 h-5 text-[#9e1218]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight text-white">
                  Help &amp; Support
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/10 text-slate-300 border border-white/20 uppercase">
                  {role === 'supervisor' ? 'Site Terminal Support' : 'Planner Engineering Helpdesk'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Oil India Limited · ScheduleSync Platform Assistance
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-6 pt-2">
          <button
            onClick={() => setActiveTab('GUIDE')}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 ${
              activeTab === 'GUIDE'
                ? 'border-[#9e1218] text-[#9e1218]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Workflow Guide
          </button>
          <button
            onClick={() => setActiveTab('FAQ')}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 ${
              activeTab === 'FAQ'
                ? 'border-[#9e1218] text-[#9e1218]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Frequently Asked Questions
          </button>
          <button
            onClick={() => setActiveTab('CONTACT')}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 ${
              activeTab === 'CONTACT'
                ? 'border-[#9e1218] text-[#9e1218]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Direct Site Contacts
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs text-slate-700 leading-relaxed">
          {activeTab === 'GUIDE' && (
            <div className="space-y-4">
              {role === 'supervisor' ? (
                <>
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                      <Mic className="w-4 h-4 text-[#9e1218]" />
                      Voice &amp; Multi-Modal Progress Logging
                    </div>
                    <p className="text-slate-600">
                      Tap the microphone to speak in English or Hindi, or record audio notes directly from site. Mention the activity description, line or column number, quantity installed, and contractor team.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                      <ShieldAlert className="w-4 h-4 text-amber-600" />
                      Logging Blockers &amp; HSE Issues
                    </div>
                    <p className="text-slate-600">
                      If work is held up due to material delays, permit delays, or safety concerns, use the "Report Blocker" button on your assigned activity card to notify the central planning office immediately.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                      <BookOpen className="w-4 h-4 text-emerald-600" />
                      Offline Mode &amp; Automatic Background Sync
                    </div>
                    <p className="text-slate-600">
                      When working in areas with no cellular network, your submissions are queued safely in your browser (IndexedDB). Once connection is restored, they sync automatically.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                      <Sparkles className="w-4 h-4 text-[#9e1218]" />
                      3-Signal Confidence Fusion Matching
                    </div>
                    <p className="text-slate-600">
                      Incoming field reports are matched against the Primavera P6 schedule baseline using Semantic Vector Similarity (45%), Entity Overlap (35%), and Metadata/Discipline Alignment (20%). Reports with confidence ≥90% are auto-linked, while 70-90% enter the Review Queue.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                      <CalendarRange className="w-4 h-4 text-blue-600" />
                      Sequence Violation &amp; Predecessor Rules
                    </div>
                    <p className="text-slate-600">
                      Out-of-sequence activity alerts trigger when a downstream task is logged as started before its P6 predecessor is completed. Planners can review and acknowledge violations in the Review Queue.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                      <Layers className="w-4 h-4 text-purple-600" />
                      Executive PDF Workflow Reports
                    </div>
                    <p className="text-slate-600">
                      Click "View Report PDF" on the top header or sidebar to preview and download clean executive milestone summary reports for project steering committees.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'FAQ' && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-900 mb-1">How do I change the active running project?</div>
                <p className="text-slate-600">Use the project dropdown selector on the top navigation bar to switch between active refinery units and expansion packages.</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-900 mb-1">What happens when a report is marked as Unmatched?</div>
                <p className="text-slate-600">Reports with &lt;70% confidence are held safely. Planners can manually relink them to the appropriate WBS item or create a novel scope entry.</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-900 mb-1">How can I view the platform on mobile devices (iOS / Android)?</div>
                <p className="text-slate-600">ScheduleSync is a Progressive Web App (PWA). Open in Safari (iOS) and select "Add to Home Screen" or Chrome (Android) and tap "Install App" to install natively.</p>
              </div>
            </div>
          )}

          {activeTab === 'CONTACT' && (
            <div className="space-y-3">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="font-bold text-slate-900 text-sm">Numaligarh Refinery Expansion Project Office</div>
                <div className="space-y-2 text-slate-600">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-[#9e1218]" />
                    <span>Control Room Hotline: <strong>+91 (03776) 265000 / 265001</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#9e1218]" />
                    <span>Engineering Planning Desk: <strong>planner@oilindia.in</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#9e1218]" />
                    <span>Technical Support: <strong>support.schedulesync@oilindia.in</strong></span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900">
                <strong>Emergency Notice:</strong> For immediate site safety emergencies or gas detection alarms, please use the physical red emergency pull stations or radio Channel 1.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            ScheduleSync v2.4 · Oil India Limited Project Control
          </span>
          <Button
            size="sm"
            onClick={onClose}
            className="bg-[#9e1218] hover:bg-[#a51016] text-white font-bold text-xs px-4 py-1.5 rounded-lg"
          >
            Close Help
          </Button>
        </div>
      </div>
    </div>
  );
};
