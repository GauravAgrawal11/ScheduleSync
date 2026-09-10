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
  Languages,
} from 'lucide-react';
import { queueReport } from './offline/queue';
import { requestBackgroundSync } from './offline/syncManager';
import { useLanguageStore, translateActivityName, translateDiscipline, translateLocation, translateStatus } from './languageStore';

export const LogProgress: React.FC = () => {
  const [searchParams] = useSearchParams();
  const queryActivityId = searchParams.get('activity_id') || '';
  const queryDiscipline = searchParams.get('discipline') || '';
  const queryLocation = searchParams.get('location') || '';

  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { language, t } = useLanguageStore();

  const [text, setText] = useState('');
  const [selectedActivityId, setSelectedActivityId] = useState<string>(queryActivityId);
  const [discipline, setDiscipline] = useState(queryDiscipline || 'Piping');
  const [location, setLocation] = useState(queryLocation || 'Unit 3');
  const [file, setFile] = useState<File | null>(null);
  const [offlineQueued, setOfflineQueued] = useState<boolean>(false);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [translationSuccess, setTranslationSuccess] = useState<boolean>(false);
  const voiceLang = language === 'hi' ? 'hi-IN' : 'en-IN';
  const whisperCode = language === 'hi' ? 'hi' : 'en';
  const [autoTranslatedNotice, setAutoTranslatedNotice] = useState<string | null>(null);
  const [adminEnglishPreview, setAdminEnglishPreview] = useState<string | null>(null);

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

      // Central Requirement: All responses/reports sent to central admin panel & Primavera P6 must be in English!
      let reportTextForAdmin = text.trim();
      if (reportTextForAdmin && (language === 'hi' || /[\u0900-\u0D7F]/.test(reportTextForAdmin))) {
        try {
          const trans = await api.translateText(reportTextForAdmin, 'en');
          if (trans && trans.translated_text && trans.translated_text.trim()) {
            reportTextForAdmin = trans.translated_text.trim();
            setAdminEnglishPreview(reportTextForAdmin);
          }
        } catch (err) {
          console.warn('Translate to English for Admin warning:', err);
        }
      }

      return await api.submitReport(reportTextForAdmin, finalAttachment, discipline, location);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-submissions'] });
    },
  });

  // Helper: Auto-translate transcribed speech from regional spoken language to the active UI page language (Hindi or English)
  const autoTranslateToPageLanguage = async (spokenText: string, fromVoiceCode?: string): Promise<string> => {
    if (!spokenText.trim()) return spokenText;
    const targetLang = language; // 'hi' or 'en'
    const isTargetHindi = targetLang === 'hi';
    const hasDevanagari = /[\u0900-\u097F]/.test(spokenText);

    // If text script doesn't match active target language, auto-translate
    const needsTranslation = (isTargetHindi && !hasDevanagari) || (!isTargetHindi && hasDevanagari);

    if (needsTranslation) {
      try {
        setIsTranslating(true);
        const res = await api.translateText(spokenText, targetLang);
        if (res && res.translated_text && res.translated_text.trim()) {
          setAutoTranslatedNotice(
            `${t('auto_translated_to_page')} (${hasDevanagari ? 'हिन्दी ➔ English' : 'English ➔ हिन्दी'})`
          );
          setTimeout(() => setAutoTranslatedNotice(null), 4000);
          return res.translated_text.trim();
        }
      } catch (err) {
        console.warn('Auto-translate error:', err);
      } finally {
        setIsTranslating(false);
      }
    }
    return spokenText;
  };

  // 1-Click Translation Handler between Hindi and English
  const handleTranslate = async () => {
    if (!text.trim() || isTranslating) return;
    setIsTranslating(true);
    setTranslationSuccess(false);
    try {
      const targetLang = language === 'hi' ? 'en' : 'hi';
      const res = await api.translateText(text, targetLang);
      if (res && res.translated_text) {
        setText(res.translated_text);
        setTranslationSuccess(true);
        setTimeout(() => setTranslationSuccess(false), 3000);
      }
    } catch (err) {
      console.warn('Translation error:', err);
    } finally {
      setIsTranslating(false);
    }
  };

  // Start Voice Recording + Browser SpeechRecognition with Regional Language
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
        recognition.lang = voiceLang; // Configured with regional spoken language (hi-IN, en-IN, as-IN, bn-IN, mr-IN, etc.)

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

          // Transcribe through Faster-Whisper with language hint
          setIsTranscribing(true);
          try {
            const res = await api.transcribeVoice(recordedBlob, genName, whisperCode);
            if (res.text && res.text.trim()) {
              const cleanWhisper = res.text.trim();
              // Auto-translate to the active UI page language chosen by supervisor
              const translated = await autoTranslateToPageLanguage(cleanWhisper);
              const combined = initialTextRef.current
                ? `${initialTextRef.current} ${translated}`
                : translated;
              setText(combined);
              setLastDictated(translated);
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
      const res = await api.transcribeVoice(fileItem, fileItem.name, whisperCode);
      if (res.text && res.text.trim()) {
        const cleanWhisper = res.text.trim();
        // Auto-translate to the active UI page language chosen by supervisor
        const translated = await autoTranslateToPageLanguage(cleanWhisper);
        const combined = text.trim() ? `${text.trim()} ${translated}` : translated;
        setText(combined);
        setLastDictated(translated);
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

    // Determine English text for admin panel
    let textForAdmin = text.trim();
    if (textForAdmin && (language === 'hi' || /[\u0900-\u0D7F]/.test(textForAdmin))) {
      try {
        const trans = await api.translateText(textForAdmin, 'en');
        if (trans && trans.translated_text && trans.translated_text.trim()) {
          textForAdmin = trans.translated_text.trim();
        }
      } catch {}
    }

    // 1. If currently offline, queue immediately
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      try {
        await queueReport({
          text: textForAdmin,
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
            text: textForAdmin,
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
          <h2 className="text-base font-bold text-slate-800">{t('page_title')}</h2>
          <p className="text-[11px] text-slate-500">{t('page_subtitle')}</p>
        </div>
      </div>

      {/* Voice Dictation & Audio Capture Card */}
      <Card className={`border transition-all ${isRecording ? 'border-rose-400 bg-rose-50/40 shadow-sm' : 'border-slate-200'}`}>
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-2.5">
            <div className="flex items-center gap-1.5">
              <Radio className={`w-4 h-4 ${isRecording ? 'text-rose-600 animate-pulse' : 'text-slate-600'}`} />
              <span className="text-xs font-bold text-slate-800">{t('voice_card_title')}</span>
            </div>
            <span className="text-[10px] font-semibold text-oil-800 bg-oil-50 px-2 py-0.5 rounded-full border border-oil-200 flex items-center gap-1">
              <span>{language === 'hi' ? '🇮🇳 हिन्दी मोड' : '🌐 English Mode'}</span>
            </span>
          </div>


          {/* Auto-translation to Page Language Notice */}
          {autoTranslatedNotice && (
            <div className="mb-3 p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-fadeIn">
              <Languages className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{autoTranslatedNotice}</span>
            </div>
          )}

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
                title={isRecording ? t('mic_recording') : t('mic_idle')}
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
                <span>{t('upload_voice_note')}</span>
              </button>
            </div>

            {/* Recording & Transcribing Status */}
            <div className="text-xs font-semibold text-slate-700 mt-3">
              {isRecording ? (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-rose-600 font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                    {language === 'hi' ? 'रिकॉर्डिंग जारी:' : 'Recording:'} {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}s
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {language === 'hi' ? 'रोकने के लिए लाल माइक बटन दबाएं' : 'Tap red mic button to finish and transcribe'}
                  </span>
                </div>
              ) : isTranscribing ? (
                <span className="text-oil-800 flex items-center justify-center gap-1.5 font-bold">
                  <RefreshCw className="w-4 h-4 animate-spin text-oil-700" /> {t('transcribing')}
                </span>
              ) : (
                <span className="text-slate-500">
                  {language === 'hi' ? 'माइक दबाकर हिन्दी में बोलें या ऑडियो अपलोड करें' : 'Tap mic to speak or upload field voice recording'}
                </span>
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
              {t('quick_templates')}:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {language === 'hi' ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleQuickDictate("यूनिट 3 में लाइन 24 के लिए पाइपिंग क्रू ने आज स्पूल इरेक्शन पूरा किया। 4 जॉइंट्स फिट-अप हो गए, फ्लैंज बोल्टिंग जारी है।", "Piping", "Unit 3")}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 transition-colors"
                  >
                    🎙️ लाइन 24 पाइपिंग (यूनिट 3)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDictate("सबस्टेशन की तरफ 11kv केबल खींचने का काम पूरा हुआ, फीडर रन पूरा। कल टर्मिनेशन शुरू करेंगे।", "Electrical", "Substation")}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-800 border border-slate-200 transition-colors"
                  >
                    🎙️ 11kV केबल पुलिंग (सबस्टेशन)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDictate("फूटिंग F-12 के लिए खुदाई पूरी हुई, कल सुबह PCC के लिए 18 घन मीटर तैयार है।", "Civil", "Unit 3")}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-800 border border-slate-200 transition-colors"
                  >
                    🎙️ फूटिंग F-12 सिविल कार्य
                  </button>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form Submission */}
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <span>{t('label_notes')}</span>
              {lastDictated && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {t('voice_inserted_badge')}
                </span>
              )}
            </label>
            <div className="flex items-center gap-2">
              {/* 1-Click Translation Button */}
              {text.trim() && (
                <button
                  type="button"
                  onClick={handleTranslate}
                  disabled={isTranslating}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors shadow-xs ${
                    translationSuccess
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : isTranslating
                      ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
                      : 'bg-oil-50 text-oil-800 hover:bg-oil-100 border-oil-300'
                  }`}
                  title={language === 'hi' ? t('btn_translate_to_en') : t('btn_translate_to_hi')}
                >
                  <Languages className={`w-3 h-3 ${isTranslating ? 'animate-spin' : 'text-oil-600'}`} />
                  <span>
                    {isTranslating
                      ? t('btn_translating')
                      : translationSuccess
                      ? t('translate_success')
                      : language === 'hi'
                      ? '➔ English (EN)'
                      : '➔ हिन्दी (HI)'}
                  </span>
                </button>
              )}
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
            placeholder={t('placeholder_notes')}
            className="w-full text-sm border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-oil-600 focus:outline-none bg-white"
          />

          {/* Admin Cockpit Sync Notice: All reports forwarded in English for Central Planner P6 WBS */}
          {text.trim() && (
            <div className="mt-1.5 flex items-center justify-between text-[11px] bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse shrink-0" />
                <span className="font-semibold text-slate-700">
                  {language === 'hi' ? 'केंद्रीय एडमिन पैनल सिंक:' : 'Admin Panel Sync:'}
                </span>
                <span className="text-slate-500">
                  {t('submitted_english_notice')}
                </span>
              </span>
              {adminEnglishPreview && (
                <span className="text-[10px] font-bold text-oil-800 bg-oil-100 px-1.5 py-0.5 rounded border border-oil-200 shrink-0">
                  EN Ready
                </span>
              )}
            </div>
          )}
        </div>

        {/* Target Schedule Activity Selector */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-[11px] font-semibold text-slate-700 flex items-center gap-1">
              <Layers className="w-3 h-3 text-slate-500" /> {t('target_assigned_activity')}
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
            <option value="">{t('auto_match_option')}</option>
            {assignedActivities.map((act) => {
              const isActCompleted =
                act.status?.toUpperCase() === 'COMPLETED' ||
                (act.completion_pct !== undefined && act.completion_pct >= 100);
              const transName = translateActivityName(act.activity_id, act.activity_name, language);
              const transDisc = translateDiscipline(act.discipline, language);
              return (
                <option
                  key={act.activity_id}
                  value={act.activity_id}
                  disabled={isActCompleted}
                  className={isActCompleted ? 'text-slate-400 bg-slate-50' : 'text-slate-900'}
                >
                  {act.activity_id} · {transName} ({transDisc}) {isActCompleted ? (language === 'hi' ? '(पूर्ण · 100% लॉक)' : '(Completed · 100% Locked)') : `(${act.completion_pct || 0}%)`}
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
                {language === 'hi' ? 'गतिविधि पूर्ण और लॉक है' : 'Activity Completed & Locked'} ({selectedActivity?.activity_id})
              </span>
              {language === 'hi'
                ? `यह गतिविधि 100% पूर्ण हो चुकी है (${translateActivityName(selectedActivity?.activity_id, selectedActivity?.activity_name, language)})। पूर्ण गतिविधियों के लिए अतिरिक्त प्रगति रिपोर्ट दर्ज नहीं की जा सकती। कृपया एक सक्रिय निर्धारित गतिविधि चुनें।`
                : `This activity has reached 100% completion (${selectedActivity?.activity_name}). Additional progress reports cannot be logged for completed activities. Please choose an active scheduled activity.`}
            </div>
          </div>
        )}

        {/* Optional Metadata Selectors */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
              <Tag className="w-3 h-3 text-slate-400" /> {t('discipline_label')}
            </label>
            <select
              value={discipline}
              onChange={(e) => setDiscipline(e.target.value)}
              className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2 bg-white focus:ring-1 focus:ring-oil-600"
            >
              <option value="Piping">{translateDiscipline('Piping', language)}</option>
              <option value="Civil">{translateDiscipline('Civil', language)}</option>
              <option value="Electrical">{translateDiscipline('Electrical', language)}</option>
              <option value="Instrumentation">{translateDiscipline('Instrumentation', language)}</option>
              <option value="HSE">{translateDiscipline('HSE', language)}</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-slate-400" /> {t('location_label')}
            </label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2 bg-white focus:ring-1 focus:ring-oil-600"
            >
              <option value="Unit 3">{translateLocation('Unit 3', language)}</option>
              <option value="Tank Farm">{translateLocation('Tank Farm', language)}</option>
              <option value="Substation">{translateLocation('Substation', language)}</option>
              <option value="Pipeline Corridor">{translateLocation('Pipeline Corridor', language)}</option>
              <option value="Boundary Wall">{translateLocation('Boundary Wall', language)}</option>
            </select>
          </div>
        </div>

        {/* File / Scan Attachment */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            {t('attach_file_label')}
          </label>
          <label className="border-2 border-dashed border-slate-300 rounded-xl p-3 flex flex-col items-center justify-center bg-white hover:border-oil-600 cursor-pointer transition-colors">
            <Upload className="w-5 h-5 text-slate-400 mb-1" />
            <span className="text-xs font-semibold text-slate-600">
              {file ? file.name : (language === 'hi' ? 'फ़ोटो / CSV / PDF अपलोड करने के लिए टैप करें' : 'Tap to upload Photo / CSV / PDF')}
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
          {isSelectedActivityCompleted
            ? (language === 'hi' ? 'लॉक्ड — गतिविधि पूर्ण हो चुकी है' : 'Locked — Activity Completed')
            : submitMutation.isPending
            ? t('btn_submitting')
            : t('btn_submit')}
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
