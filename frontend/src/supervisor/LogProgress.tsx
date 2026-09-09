import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ReportSubmissionResponse, ActivityProgressItem } from '../api/client';
import { useAuthStore } from '../auth/authStore';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ConfidenceBar } from '../components/ui/ConfidenceBar';
import {
  Mic,
  MicOff,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  Tag,
  MapPin,
  Lock,
  Layers,
  Play,
  Pause,
  Volume2,
  Trash2,
  Radio,
  Clock,
} from 'lucide-react';
import { queueReport } from './offline/queue';
import { requestBackgroundSync } from './offline/syncManager';

export const LogProgress: React.FC = () => {
  const [searchParams] = useSearchParams();
  const queryActivityId = searchParams.get('activity_id') || '';
  const queryDiscipline = searchParams.get('discipline') || '';
  const queryLocation = searchParams.get('location') || '';

  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [text, setText] = useState('');
  const [selectedActivityId, setSelectedActivityId] = useState<string>(queryActivityId);
  const [discipline, setDiscipline] = useState(queryDiscipline || 'Piping');
  const [location, setLocation] = useState(queryLocation || 'Unit 3');
  const [file, setFile] = useState<File | null>(null);
  const [offlineQueued, setOfflineQueued] = useState<boolean>(false);

  // Fetch supervisor's assigned activities to enforce activity completion locking
  const { data: progressData } = useQuery({
    queryKey: ['supervisor-assigned-activities', user?.id],
    queryFn: () => api.getSupervisorProgress(user?.id || 1),
    enabled: !!user?.id,
  });

  const assignedActivities: ActivityProgressItem[] = progressData?.activities || [];

  const selectedActivity = assignedActivities.find((a) => a.activity_id === selectedActivityId);
  const isSelectedActivityCompleted =
    selectedActivity &&
    (selectedActivity.status?.toUpperCase() === 'COMPLETED' ||
      (selectedActivity.completion_pct !== undefined && selectedActivity.completion_pct >= 100));

  useEffect(() => {
    if (queryActivityId) {
      setSelectedActivityId(queryActivityId);
    }
    if (queryDiscipline) {
      setDiscipline(queryDiscipline);
    }
    if (queryLocation) {
      setLocation(queryLocation);
    }
  }, [queryActivityId, queryDiscipline, queryLocation]);

  const handleActivitySelect = (actId: string) => {
    setSelectedActivityId(actId);
    if (!actId) return;
    const found = assignedActivities.find((a) => a.activity_id === actId);
    if (found) {
      if (found.discipline) setDiscipline(found.discipline);
      if (found.location) setLocation(found.location);
    }
  };

  // Voice recording & Audio retention ("voic rakih" - keep the voice recording)
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [lastDictated, setLastDictated] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioFileName, setAudioFileName] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const speechRecognitionRef = useRef<any>(null);
  const initialTextRef = useRef<string>('');
  const timerRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const audioFileInputRef = useRef<HTMLInputElement | null>(null);

  // Clean up object URL when component unmounts or audio changes
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  // Mutation for submitting progress report
  const submitMutation = useMutation({
    mutationFn: async () => {
      // If user has a document attachment, use that.
      // Otherwise, if they recorded/uploaded a voice note, attach the voice note file!
      let finalAttachment = file;
      if (!finalAttachment && audioBlob) {
        finalAttachment = new File(
          [audioBlob],
          audioFileName || 'site_voice_note.webm',
          { type: audioBlob.type || 'audio/webm' }
        );
      }
      return await api.submitReport(text, finalAttachment, discipline, location);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-submissions'] });
    },
  });

  // Start Voice Recording + Browser SpeechRecognition
  const startRecording = async () => {
    audioChunksRef.current = [];
    initialTextRef.current = text.trim();
    setMicError(null);
    setIsRecording(true);
    setRecordingDuration(0);

    // 1. Try real-time browser Web Speech API for immediate live interim transcription
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-IN'; // Multilingual / Indian English & Hindi accent

        recognition.onresult = (event: any) => {
          let fullSessionTranscript = '';
          for (let i = 0; i < event.results.length; ++i) {
            fullSessionTranscript += event.results[i][0].transcript + ' ';
          }
          const spoken = fullSessionTranscript.trim();
          if (spoken) {
            const combined = initialTextRef.current
              ? `${initialTextRef.current} ${spoken}`
              : spoken;
            setText(combined);
            setLastDictated(spoken);
          }
        };

        recognition.onerror = (e: any) => {
          console.warn('SpeechRecognition notice:', e.error);
        };

        recognition.start();
        speechRecognitionRef.current = recognition;
      } catch (err) {
        console.warn('Web Speech API could not start:', err);
      }
    }

    // 2. Record raw audio with MediaRecorder for backend Faster-Whisper & Audio Playback
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MediaDevices API not supported in this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop audio tracks promptly
        stream.getTracks().forEach((track) => track.stop());

        const recordedBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (recordedBlob.size > 0) {
          if (audioUrl) URL.revokeObjectURL(audioUrl);
          const newUrl = URL.createObjectURL(recordedBlob);
          setAudioUrl(newUrl);
          setAudioBlob(recordedBlob);
          const genName = `voice_${new Date().toLocaleTimeString().replace(/:/g, '-')}.webm`;
          setAudioFileName(genName);

          // Transcribe through Faster-Whisper
          setIsTranscribing(true);
          try {
            const res = await api.transcribeVoice(recordedBlob, genName);
            if (res.text && res.text.trim()) {
              const cleanWhisper = res.text.trim();
              const combined = initialTextRef.current
                ? `${initialTextRef.current} ${cleanWhisper}`
                : cleanWhisper;
              setText(combined);
              setLastDictated(cleanWhisper);
            }
          } catch (err) {
            console.error('Whisper transcription error:', err);
          } finally {
            setIsTranscribing(false);
          }
        }
      };

      mediaRecorder.start();
    } catch (err: any) {
      console.warn('Microphone error:', err);
      setIsRecording(false);
      if (speechRecognitionRef.current) {
        try { speechRecognitionRef.current.stop(); } catch {}
        speechRecognitionRef.current = null;
      }
      setMicError(
        'Microphone access is unavailable or denied. Please check your browser microphone permission, upload an audio file below, or use the quick chips.'
      );
      return;
    }

    timerRef.current = setInterval(() => {
      setRecordingDuration((prev) => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {}
      speechRecognitionRef.current = null;
    }

    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Upload an existing voice note file (WhatsApp audio, .ogg, .mp3, .wav, .m4a, .webm)
  const handleAudioFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const fileItem = e.target.files[0];
    setMicError(null);

    if (audioUrl) URL.revokeObjectURL(audioUrl);
    const newUrl = URL.createObjectURL(fileItem);
    setAudioUrl(newUrl);
    setAudioBlob(fileItem);
    setAudioFileName(fileItem.name);

    setIsTranscribing(true);
    try {
      const res = await api.transcribeVoice(fileItem, fileItem.name);
      if (res.text && res.text.trim()) {
        const cleanWhisper = res.text.trim();
        const combined = text.trim() ? `${text.trim()} ${cleanWhisper}` : cleanWhisper;
        setText(combined);
        setLastDictated(cleanWhisper);
      } else {
        setMicError('Audio file loaded and saved! No clear speech detected by Whisper.');
      }
    } catch (err) {
      console.error('Audio file transcription error:', err);
      setMicError('Audio file loaded! (Whisper offline/transcription unavailable)');
    } finally {
      setIsTranscribing(false);
    }
  };

  const toggleAudioPlayback = () => {
    if (!audioPlayerRef.current) return;
    if (isPlayingAudio) {
      audioPlayerRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  const clearRecordedAudio = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setAudioBlob(null);
    setAudioFileName(null);
    setIsPlayingAudio(false);
  };

  const handleQuickDictate = (sample: string, disc: string, loc: string) => {
    setText(sample.trim());
    setLastDictated(sample.trim());
    setDiscipline(disc);
    setLocation(loc);
    setMicError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !file && !audioBlob) return;
    setOfflineQueued(false);

    let finalAttachment = file;
    if (!finalAttachment && audioBlob) {
      finalAttachment = new File(
        [audioBlob],
        audioFileName || 'site_voice_note.webm',
        { type: audioBlob.type || 'audio/webm' }
      );
    }

    // 1. If currently offline, queue immediately
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      try {
        await queueReport({
          text,
          discipline,
          location,
          file: finalAttachment,
        });
        await requestBackgroundSync();
        setOfflineQueued(true);
        queryClient.invalidateQueries({ queryKey: ['my-submissions'] });
      } catch (err) {
        console.error('Failed to queue offline report:', err);
      }
      return;
    }

    // 2. Online: attempt submit, but fall back to queueReport on network error
    try {
      await submitMutation.mutateAsync();
    } catch (err: any) {
      const isNetworkError =
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        err?.message?.includes('Failed to fetch') ||
        err?.message?.includes('NetworkError') ||
        err?.name === 'TypeError';

      if (isNetworkError) {
        try {
          await queueReport({
            text,
            discipline,
            location,
            file: finalAttachment,
          });
          await requestBackgroundSync();
          setOfflineQueued(true);
          queryClient.invalidateQueries({ queryKey: ['my-submissions'] });
        } catch (qErr) {
          console.error('Failed to queue report after network failure:', qErr);
        }
      }
    }
  };

  const result = submitMutation.data;

  return (
    <div className="space-y-4">
      {/* Header with back button */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/supervisor')}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-base font-bold text-slate-800">Log Site Progress</h2>
          <p className="text-[11px] text-slate-500">Record voice note, type report, or attach photo/DPR</p>
        </div>
      </div>

      {/* Voice Dictation & Audio Capture Card */}
      <Card className={`border transition-all ${isRecording ? 'border-rose-400 bg-rose-50/40 shadow-sm' : 'border-slate-200'}`}>
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-1.5">
              <Radio className={`w-4 h-4 ${isRecording ? 'text-rose-600 animate-pulse' : 'text-slate-600'}`} />
              <span className="text-xs font-bold text-slate-800">Voice Dictation &amp; Audio Note</span>
            </div>
            <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
              Hindi · English · Hinglish
            </span>
          </div>

          {/* Inline Error Notice if Mic fails */}
          {micError && (
            <div className="mb-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start justify-between gap-2">
              <div className="flex items-start gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{micError}</span>
              </div>
              <button
                type="button"
                onClick={() => setMicError(null)}
                className="text-amber-700 hover:text-amber-900 font-bold text-[10px]"
              >
                ✕
              </button>
            </div>
          )}

          {/* Action Center */}
          <div className="text-center py-2">
            <div className="flex items-center justify-center gap-4">
              {/* Mic Record Button */}
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                className={`h-16 w-16 rounded-full flex items-center justify-center transition-all ${
                  isRecording
                    ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-300 ring-4 ring-rose-200 scale-105'
                    : 'bg-oil-800 hover:bg-oil-900 text-white shadow-md shadow-oil-900/20'
                }`}
                title={isRecording ? 'Stop Recording' : 'Start Voice Dictation'}
              >
                {isRecording ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
              </button>

              {/* Upload Audio File Button */}
              <input
                type="file"
                ref={audioFileInputRef}
                onChange={handleAudioFileUpload}
                accept="audio/*,.webm,.wav,.mp3,.ogg,.m4a,.aac,.opus"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => audioFileInputRef.current?.click()}
                disabled={isRecording || isTranscribing}
                className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
                title="Upload WhatsApp voice note or audio recording"
              >
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>Upload Voice Note</span>
              </button>
            </div>

            {/* Recording & Transcribing Status */}
            <div className="text-xs font-semibold text-slate-700 mt-3">
              {isRecording ? (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-rose-600 font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                    Recording: {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}s
                  </span>
                  <span className="text-[11px] text-slate-500">Tap red mic button to finish and transcribe</span>
                </div>
              ) : isTranscribing ? (
                <span className="text-oil-800 flex items-center justify-center gap-1.5 font-bold">
                  <RefreshCw className="w-4 h-4 animate-spin text-oil-700" /> Transcribing with Faster-Whisper AI...
                </span>
              ) : (
                <span className="text-slate-500">Tap mic to speak or upload field voice recording</span>
              )}
            </div>
          </div>

          {/* Voice Note Player Pill ("voic rakih" - saved audio preview) */}
          {audioUrl && (
            <div className="mt-3 p-2.5 rounded-lg bg-emerald-50/80 border border-emerald-200 flex items-center justify-between gap-3">
              <audio
                ref={audioPlayerRef}
                src={audioUrl}
                onEnded={() => setIsPlayingAudio(false)}
                className="hidden"
              />
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={toggleAudioPlayback}
                  className="h-8 w-8 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-sm transition-colors"
                  title={isPlayingAudio ? 'Pause' : 'Play Audio'}
                >
                  {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>
                <div className="truncate">
                  <p className="text-xs font-bold text-emerald-900 truncate">
                    {audioFileName || 'Site Voice Recording'}
                  </p>
                  <p className="text-[10px] text-emerald-700 flex items-center gap-1">
                    <Volume2 className="w-3 h-3" /> Voice note captured · Saved with report
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={clearRecordedAudio}
                className="p-1.5 rounded-md text-emerald-700 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
                title="Remove this voice note"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Quick Voice Demo Chips */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-1.5 text-left">
            <span className="text-[10px] uppercase font-bold text-slate-400">
              Or 1-Tap Quick Dictation Samples:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickDictate("Piping crew completed spool erection for Line 24 in Unit 3 today. 4 joints fitted up, flange bolt-up in progress.", "Piping", "Unit 3")}
                className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 transition-colors"
              >
                🎙️ Line 24 Piping (Unit 3)
              </button>
              <button
                type="button"
                onClick={() => handleQuickDictate("11kv cable pulling done substation side, feeder run complete. Kal termination start karenge.", "Electrical", "Substation")}
                className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-800 border border-slate-200 transition-colors"
              >
                🎙️ 11kV Cable Pulling (Substation)
              </button>
              <button
                type="button"
                onClick={() => handleQuickDictate("Excavation for footing F-12 completed, 18 cum ready for PCC tomorrow morning.", "Civil", "Unit 3")}
                className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-800 border border-slate-200 transition-colors"
              >
                🎙️ Footing F-12 Civil Pour
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form Submission */}
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <span>Daily Work Description</span>
              {lastDictated && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Voice Dictated &amp; Inserted
                </span>
              )}
            </label>
            <div className="flex items-center gap-2">
              {text && (
                <button
                  type="button"
                  onClick={() => {
                    setText('');
                    setLastDictated(null);
                  }}
                  className="text-[10px] font-semibold text-rose-600 hover:text-rose-800 hover:underline"
                >
                  Clear
                </button>
              )}
              <span className="text-[10px] text-slate-400">{text.length} chars</span>
            </div>
          </div>
          <textarea
            rows={4}
            required={!file}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. Completed spool erection for Line 24 in Unit 3 today. 4 joints fitted up, bolt-up in progress..."
            className="w-full text-sm border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-oil-600 focus:outline-none bg-white"
          />
        </div>

        {/* Target Schedule Activity Selector */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-[11px] font-semibold text-slate-700 flex items-center gap-1">
              <Layers className="w-3 h-3 text-slate-500" /> Target Assigned Activity
            </label>
            {selectedActivityId && (
              <button
                type="button"
                onClick={() => setSelectedActivityId('')}
                className="text-[10px] text-slate-500 hover:text-slate-800"
              >
                Clear selection
              </button>
            )}
          </div>
          <select
            value={selectedActivityId}
            onChange={(e) => handleActivitySelect(e.target.value)}
            className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-oil-600 focus:outline-none"
          >
            <option value="">⚡ Auto-Match across my active tasks (AI Engine)</option>
            {assignedActivities.map((act) => {
              const isActCompleted =
                act.status?.toUpperCase() === 'COMPLETED' ||
                (act.completion_pct !== undefined && act.completion_pct >= 100);
              return (
                <option
                  key={act.activity_id}
                  value={act.activity_id}
                  disabled={isActCompleted}
                  className={isActCompleted ? 'text-slate-400 bg-slate-50' : 'text-slate-900'}
                >
                  {act.activity_id} · {act.activity_name} {isActCompleted ? '(Completed · 100% Locked)' : `(${act.completion_pct || 0}%)`}
                </option>
              );
            })}
          </select>
        </div>

        {/* Lock Warning Banner if Activity is Completed */}
        {isSelectedActivityCompleted && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-start gap-2.5 shadow-sm">
            <Lock className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-rose-950">
                Activity Completed &amp; Locked ({selectedActivity?.activity_id})
              </span>
              This activity has reached 100% completion ({selectedActivity?.activity_name}). Additional progress reports cannot be logged for completed activities. Please choose an active scheduled activity.
            </div>
          </div>
        )}

        {/* Optional Metadata Selectors */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
              <Tag className="w-3 h-3 text-slate-400" /> Discipline
            </label>
            <select
              value={discipline}
              onChange={(e) => setDiscipline(e.target.value)}
              className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2 bg-white focus:ring-1 focus:ring-oil-600"
            >
              <option value="Piping">Piping</option>
              <option value="Civil">Civil</option>
              <option value="Electrical">Electrical</option>
              <option value="Instrumentation">Instrumentation</option>
              <option value="HSE">HSE / Safety</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-slate-400" /> Site Location
            </label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2 bg-white focus:ring-1 focus:ring-oil-600"
            >
              <option value="Unit 3">Unit 3</option>
              <option value="Tank Farm">Tank Farm</option>
              <option value="Substation">Substation</option>
              <option value="Pipeline Corridor">Pipeline Corridor</option>
              <option value="Boundary Wall">Boundary Wall</option>
            </select>
          </div>
        </div>

        {/* File / Scan Attachment */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Attach Site Photo, Scan, or DPR File (Optional)
          </label>
          <label className="border-2 border-dashed border-slate-300 rounded-xl p-3 flex flex-col items-center justify-center bg-white hover:border-oil-600 cursor-pointer transition-colors">
            <Upload className="w-5 h-5 text-slate-400 mb-1" />
            <span className="text-xs font-semibold text-slate-600">
              {file ? file.name : 'Tap to upload Photo / CSV / PDF'}
            </span>
            <span className="text-[10px] text-slate-400">Supports .csv, .xlsx, .pdf, .jpg, .png</span>
            <input type="file" onChange={handleFileChange} className="hidden" />
          </label>
        </div>

        {submitMutation.isError && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Submission failed. Please check your network and try again.</span>
          </div>
        )}

        <Button
          type="submit"
          size="lg"
          isLoading={submitMutation.isPending}
          disabled={Boolean(isSelectedActivityCompleted) || (!text.trim() && !file)}
          className={`w-full py-3 text-sm font-bold ${
            isSelectedActivityCompleted
              ? 'bg-slate-300 text-slate-500 cursor-not-allowed hover:bg-slate-300'
              : 'bg-oil-800 hover:bg-oil-900 text-white'
          }`}
        >
          {isSelectedActivityCompleted ? 'Locked — Activity Completed' : 'Submit Report for AI Extraction'}
        </Button>
      </form>

      {/* Instant Result Card when Processed */}
      {result && (
        <Card className="bg-emerald-50/70 border-emerald-300 shadow-md">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-emerald-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div className="text-xs font-bold">Report #{result.report_id} Processed Successfully</div>
            </div>

            {result.suggested_match && (
              <div className="bg-white rounded-lg p-3 border border-emerald-200">
                <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">
                  AI Suggested Baseline Match:
                </div>
                <div className="text-xs font-bold text-oil-900">
                  {result.suggested_match.activity_id}: {result.suggested_match.activity_name}
                </div>
                <div className="mt-2">
                  <ConfidenceBar score={result.suggested_match.confidence} size="sm" />
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setText('');
                  setFile(null);
                  submitMutation.reset();
                }}
                className="w-full text-xs"
              >
                Log Another Task
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/supervisor/submissions')}
                className="w-full text-xs bg-emerald-700 hover:bg-emerald-800"
              >
                View in History
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Offline Queued Confirmation Card */}
      {offlineQueued && (
        <Card className="bg-amber-50/90 border-amber-300 shadow-md">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-amber-900">
              <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 animate-pulse" />
              <div className="text-xs font-bold">Report Queued Locally (Offline Mode)</div>
            </div>
            <p className="text-xs text-amber-900 leading-relaxed font-medium">
              Saved — will send automatically when you're back online.
            </p>
            <div className="p-2.5 rounded-lg bg-white/80 border border-amber-200 text-[11px] text-slate-600 space-y-1">
              <div><strong>Discipline:</strong> {discipline} · <strong>Location:</strong> {location}</div>
              <div className="italic line-clamp-2">"{text}"</div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setText('');
                  setFile(null);
                  clearRecordedAudio();
                  setOfflineQueued(false);
                }}
                className="w-full text-xs"
              >
                Log Another Task
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/supervisor/submissions')}
                className="w-full text-xs bg-amber-700 hover:bg-amber-800 text-white"
              >
                View in Submissions
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
