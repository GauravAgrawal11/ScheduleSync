import React, { useState, useEffect, useRef } from 'react';
import { Download, X, Share2, Smartphone, Check, MoreVertical, PlusSquare, Apple, Laptop } from 'lucide-react';
import { useLanguageStore } from '../languageStore';
import brandLogoImg from '../../assets/logo.png';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const InstallAppBanner: React.FC = () => {
  const { language, t } = useLanguageStore();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isAlreadyInstalled, setIsAlreadyInstalled] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('android');
  const [activeTab, setActiveTab] = useState<'ios' | 'android' | 'desktop'>('android');
  const [showInstructionModal, setShowInstructionModal] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem('schedulesync_pwa_dismissed') === 'true';
    } catch {
      return false;
    }
  });
  const [installedSuccessfully, setInstalledSuccessfully] = useState(false);

  useEffect(() => {
    // 1. Strictly enforce: ONLY display on supervisor panel routes
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/supervisor')) {
      return;
    }

    // 2. Check if currently running INSIDE the installed standalone PWA app
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://') ||
        window.location.search.includes('source=pwa');
      return isStandaloneMode;
    };

    if (checkStandalone()) {
      setIsStandalone(true);
      return;
    }

    // 3. Platform detection (iPhone/iPad vs Android vs Desktop)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice =
      /iphone|ipad|ipod/.test(userAgent) ||
      (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
    const isAndroidDevice = /android/.test(userAgent);

    if (isIosDevice) {
      setPlatform('ios');
      setActiveTab('ios');
    } else if (isAndroidDevice) {
      setPlatform('android');
      setActiveTab('android');
    } else {
      setPlatform('desktop');
      setActiveTab('desktop');
    }

    // 4. Listen for Android/Chrome/Edge beforeinstallprompt
    if ((window as any).deferredPWAPrompt) {
      setDeferredPrompt((window as any).deferredPWAPrompt);
      deferredPromptRef.current = (window as any).deferredPWAPrompt;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      (window as any).deferredPWAPrompt = promptEvent;
      deferredPromptRef.current = promptEvent;
      setDeferredPrompt(promptEvent);
    };

    // 5. When app finishes installing in this session
    const handleAppInstalled = () => {
      setInstalledSuccessfully(true);
      setDeferredPrompt(null);
      deferredPromptRef.current = null;
      (window as any).deferredPWAPrompt = null;
      setTimeout(() => {
        setIsAlreadyInstalled(true);
      }, 3000);
    };

    // 6. External trigger listener (e.g. clicked from Top Header)
    const handleExternalTrigger = () => {
      setDismissed(false);
      triggerInstallOrInstructions();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('trigger-pwa-install', handleExternalTrigger);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('trigger-pwa-install', handleExternalTrigger);
    };
  }, []);

  // Keep deferredPromptRef synchronized
  useEffect(() => {
    if (deferredPrompt) {
      deferredPromptRef.current = deferredPrompt;
    }
  }, [deferredPrompt]);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem('schedulesync_pwa_dismissed', 'true');
    } catch {}
  };

  const triggerInstallOrInstructions = async () => {
    const promptToUse = deferredPromptRef.current || deferredPrompt || (window as any).deferredPWAPrompt;
    if (promptToUse) {
      try {
        await promptToUse.prompt();
        const choiceResult = await promptToUse.userChoice;
        if (choiceResult.outcome === 'accepted') {
          setInstalledSuccessfully(true);
          try {
            localStorage.setItem('schedulesync_pwa_installed', 'true');
          } catch {}
          setTimeout(() => {
            setIsAlreadyInstalled(true);
          }, 3000);
        }
      } catch (err) {
        console.warn('Install error, opening guide:', err);
        setShowInstructionModal(true);
      } finally {
        setDeferredPrompt(null);
        deferredPromptRef.current = null;
        (window as any).deferredPWAPrompt = null;
      }
    } else {
      // Show device-specific instruction modal
      setShowInstructionModal(true);
    }
  };

  const showInlineBanner =
    !isStandalone &&
    !isAlreadyInstalled &&
    !dismissed &&
    (typeof window === 'undefined' || window.location.pathname.startsWith('/supervisor'));

  return (
    <>
      {/* Inline Banner (shown unless user dismissed banner this session or running in standalone app) */}
      {showInlineBanner && (
        <div className="mx-3 my-2 bg-gradient-to-r from-slate-900 to-oil-900 text-white rounded-2xl p-3.5 shadow-lg border border-oil-700/50 relative animate-fadeIn">
          {installedSuccessfully ? (
            <div className="flex items-center gap-2.5 py-1">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-emerald-300">{t('pwa_banner_installed_title')}</div>
                <p className="text-[11px] text-slate-300">{t('pwa_banner_installed_desc')}</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <img
                    src={brandLogoImg}
                    alt="ScheduleSync Icon"
                    className="w-10 h-10 rounded-xl shadow-md border border-white/20 flex-shrink-0 bg-white p-0.5 object-contain"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black tracking-tight text-white">{t('pwa_banner_app_title')}</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                        {t('pwa_banner_tag')}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-300 leading-tight mt-0.5">
                      {t('pwa_banner_desc')}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleDismiss}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="Dismiss banner"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Action Row */}
              <div className="mt-2.5 pt-2.5 border-t border-white/10 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-300">
                  <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t('pwa_banner_offline_tag')}</span>
                </div>

                <button
                  onClick={triggerInstallOrInstructions}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t('pwa_banner_install_btn')}</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Global Installation Guide Modal (Supports iPhone, Android & Desktop) */}
      {showInstructionModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-xs p-3 sm:p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 text-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-4 space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <img
                  src={brandLogoImg}
                  alt="ScheduleSync App Logo"
                  className="w-9 h-9 rounded-xl border border-white/20 bg-white p-0.5 object-contain"
                />
                <div>
                  <div className="text-sm font-black text-white flex items-center gap-1.5">
                    ScheduleSync Field App
                    <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono font-bold">
                      OIL INDIA
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {language === 'hi' ? 'मोबाइल होम स्क्रीन पर इंस्टॉल करें' : 'Install to Mobile Home Screen'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowInstructionModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Platform Selector Tabs */}
            <div className="flex rounded-xl bg-slate-800/80 p-1 border border-slate-700/60 text-xs">
              <button
                onClick={() => setActiveTab('android')}
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 font-bold transition-all ${
                  activeTab === 'android'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Android</span>
              </button>
              <button
                onClick={() => setActiveTab('ios')}
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 font-bold transition-all ${
                  activeTab === 'ios'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Apple className="w-3.5 h-3.5" />
                <span>iPhone / iPad</span>
              </button>
              <button
                onClick={() => setActiveTab('desktop')}
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 font-bold transition-all ${
                  activeTab === 'desktop'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Laptop className="w-3.5 h-3.5" />
                <span>Desktop</span>
              </button>
            </div>

            {/* Step-by-step Guides */}
            {activeTab === 'ios' && (
              <div className="space-y-3 bg-slate-950/60 rounded-xl p-3.5 border border-slate-800">
                <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Apple className="w-4 h-4 text-amber-400" />
                  <span>{t('pwa_modal_title_ios')}</span>
                </div>
                <div className="space-y-2.5 text-xs text-slate-200">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-[11px] shrink-0">
                      1
                    </span>
                    <div className="leading-snug">
                      {t('pwa_ios_step1')}
                      <span className="inline-flex items-center gap-1 ml-1 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-amber-300">
                        <Share2 className="w-3 h-3" /> Share
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-[11px] shrink-0">
                      2
                    </span>
                    <div className="leading-snug">
                      {t('pwa_ios_step2')}
                      <span className="inline-flex items-center gap-1 ml-1 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-amber-300">
                        <PlusSquare className="w-3 h-3" /> Add to Home Screen
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-[11px] shrink-0">
                      3
                    </span>
                    <div className="leading-snug">
                      {t('pwa_ios_step3')}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'android' && (
              <div className="space-y-3 bg-slate-950/60 rounded-xl p-3.5 border border-slate-800">
                <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-amber-400" />
                  <span>{t('pwa_modal_title_android')}</span>
                </div>
                <div className="space-y-2.5 text-xs text-slate-200">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-[11px] shrink-0">
                      1
                    </span>
                    <div className="leading-snug">
                      {t('pwa_android_step1')}
                      <span className="inline-flex items-center gap-1 ml-1 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-amber-300">
                        <MoreVertical className="w-3 h-3" /> Menu
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-[11px] shrink-0">
                      2
                    </span>
                    <div className="leading-snug">
                      {t('pwa_android_step2')}
                      <span className="inline-flex items-center gap-1 ml-1 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-amber-300">
                        <Download className="w-3 h-3" /> Install
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-[11px] shrink-0">
                      3
                    </span>
                    <div className="leading-snug">
                      {t('pwa_android_step3')}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'desktop' && (
              <div className="space-y-3 bg-slate-950/60 rounded-xl p-3.5 border border-slate-800">
                <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Laptop className="w-4 h-4 text-amber-400" />
                  <span>{t('pwa_modal_title_desktop')}</span>
                </div>
                <div className="space-y-2.5 text-xs text-slate-200">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-[11px] shrink-0">
                      1
                    </span>
                    <div className="leading-snug">
                      {t('pwa_desktop_step1')}
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-[11px] shrink-0">
                      2
                    </span>
                    <div className="leading-snug">
                      {t('pwa_desktop_step2')}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Close Button */}
            <button
              onClick={() => setShowInstructionModal(false)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition-all shadow-md active:scale-98 cursor-pointer"
            >
              {t('pwa_modal_close')}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
