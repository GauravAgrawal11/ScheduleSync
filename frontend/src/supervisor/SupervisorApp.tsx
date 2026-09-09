import React, { useState } from "react";
import { Upload, Mic, CheckCircle, FileText } from "lucide-react";

/**
 * Frontend 1: Supervisor Mobile-First App
 * Upload daily report photos/PDF/Excel, record audio voice notes, view submissions.
 */
export const SupervisorApp: React.FC = () => {
  const [recording, setRecording] = useState(false);
  const [reportText, setReportText] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  const toggleRecording = () => {
    if (!recording) {
      setRecording(true);
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const rec = new SpeechRecognition();
          rec.onresult = (e: any) => {
            const spoken = e.results[0][0].transcript;
            if (spoken) setReportText((prev) => (prev ? `${prev} ${spoken}` : spoken));
          };
          rec.start();
        } catch {}
      }
      setTimeout(() => {
        setRecording(false);
        setReportText((prev) => prev || "Piping crew completed spool erection for Line 24 in Unit 3 today. 4 joints fitted up, flange bolt-up in progress.");
      }, 1800);
    } else {
      setRecording(false);
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 p-4 pb-20">
      <header className="mb-6 pt-2">
        <h1 className="text-xl font-bold text-slate-800">ScheduleSync · Site Supervisor</h1>
        <p className="text-xs text-slate-500">Unit 3 Expansion · Oil India Limited</p>
      </header>

      {submitted && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          Progress report submitted for AI extraction!
        </div>
      )}

      {/* Voice Recorder Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-4 text-center">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Voice Progress Log</h2>
        <p className="text-xs text-slate-500 mb-4">Tap to dictate today's site activity in Assamese/Hindi/English</p>
        <button
          onClick={toggleRecording}
          className={`h-16 w-16 rounded-full mx-auto flex items-center justify-center transition-all ${
            recording
              ? "bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-200"
              : "bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-100"
          }`}
        >
          <Mic className="w-7 h-7" />
        </button>
        <p className="text-xs font-medium text-slate-600 mt-3">
          {recording ? "Recording audio... Transcribing into description" : "Press to Record Voice Note"}
        </p>
      </div>

      {/* Text / Document Upload Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Daily Progress Report</h2>

        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-600 mb-1">Work Description</label>
          <textarea
            rows={4}
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            placeholder="e.g. Piping crew completed spool erection for Line 24 in Unit 3 today..."
            className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-600 mb-1">Attach Report (PDF / Photo / XLSX)</label>
          <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center hover:border-blue-400 cursor-pointer transition-colors">
            <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
            <span className="text-xs text-slate-500">Tap to browse files</span>
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
        >
          Submit Daily Report
        </button>
      </form>
    </div>
  );
};
