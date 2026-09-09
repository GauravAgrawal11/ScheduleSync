import React, { useState, useEffect } from 'react';
import { Download, X, Share2, Smartphone, Check } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const InstallAppBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isAlreadyInstalled, setIsAlreadyInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [installedSuccessfully, setInstalledSuccessfully] = useState(false);

  useEffect(() => {
    // 1. Strictly enforce: ONLY display on supervisor panel routes
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/supervisor')) {
      return;
    }

    // 2. Check if already installed in localStorage
    const savedInstallState = localStorage.getItem('schedulesync_pwa_installed');
    if (savedInstallState === 'true') {
      setIsAlreadyInstalled(true);
      return;
    }

    // 3. Check if currently running as installed standalone app
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandaloneMode) {
      setIsStandalone(true);
      localStorage.setItem('schedulesync_pwa_installed', 'true');
      return;
    }

    // 4. Check if iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // 5. Listen for Android/Chrome/Edge beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // 6. When app finishes installing, auto-remove download banner permanently
    const handleAppInstalled = () => {
      localStorage.setItem('schedulesync_pwa_installed', 'true');
      setInstalledSuccessfully(true);
      setDeferredPrompt(null);
      // Auto-remove banner from DOM after brief confirmation
      setTimeout(() => {
        setIsAlreadyInstalled(true);
      }, 2500);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Strict check: Only supervisor panel
  if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/supervisor')) {
    return null;
  }

  // Auto-remove: Don't render if already installed, in standalone mode, or dismissed
  if (isStandalone || isAlreadyInstalled || dismissed) {
    return null;
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Trigger native browser install dialog
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        localStorage.setItem('schedulesync_pwa_installed', 'true');
        setInstalledSuccessfully(true);
        setTimeout(() => {
          setIsAlreadyInstalled(true);
        }, 2500);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      // Show iOS specific instruction
      setShowIOSPrompt(true);
    }
  };

  const handleIOSGotIt = () => {
    // Save to localStorage so iOS users who added to home screen won't see it again
    localStorage.setItem('schedulesync_pwa_installed', 'true');
    setShowIOSPrompt(false);
    setIsAlreadyInstalled(true);
  };

  return (
    <div className="mx-3 my-2 bg-gradient-to-r from-slate-900 to-oil-900 text-white rounded-2xl p-3.5 shadow-lg border border-oil-700/50 relative animate-fadeIn">
      {/* Success state */}
      {installedSuccessfully ? (
        <div className="flex items-center gap-2.5 py-1">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Check className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-emerald-300">App Installed to Home Screen!</div>
            <p className="text-[11px] text-slate-300">You can now launch ScheduleSync directly from your mobile apps.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              {/* High-res App Icon */}
              <img
                src="/pwa-192x192.png"
                alt="ScheduleSync Icon"
                className="w-10 h-10 rounded-xl shadow-md border border-white/20 flex-shrink-0 bg-oil-800 object-cover"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black tracking-tight text-white">ScheduleSync Field</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                    PWA APP
                  </span>
                </div>
                <p className="text-[10px] text-slate-300 leading-tight mt-0.5">
                  Install to home screen for 1-tap offline site progress logging
                </p>
              </div>
            </div>

            <button
              onClick={() => setDismissed(true)}
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
              <span>Full-screen · Zero lag · Works offline</span>
            </div>

            <button
              onClick={handleInstallClick}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install App</span>
            </button>
          </div>

          {/* iOS Specific Instructions Modal / Drawer */}
          {showIOSPrompt && (
            <div className="mt-3 p-3 rounded-xl bg-slate-800/90 border border-slate-700 text-xs space-y-2">
              <div className="font-bold text-amber-300 flex items-center gap-1.5">
                <Share2 className="w-4 h-4" /> How to install on iPhone / iPad:
              </div>
              <ol className="list-decimal list-inside text-[11px] text-slate-200 space-y-1">
                <li>Tap the <strong>Share</strong> button (box with upward arrow <span className="font-mono text-amber-400">⎋</span>) at the bottom of Safari.</li>
                <li>Scroll down and tap <strong>"Add to Home Screen"</strong> (<span className="font-mono text-amber-400">⊞</span>).</li>
                <li>Tap <strong>Add</strong> in the top-right corner.</li>
              </ol>
              <button
                onClick={handleIOSGotIt}
                className="w-full py-1 rounded bg-slate-700 hover:bg-slate-600 text-[10px] font-bold text-slate-200 transition-colors"
              >
                Got It
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
