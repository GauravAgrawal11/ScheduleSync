import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../auth/authStore';
import { Home, PlusCircle, ListOrdered, LogOut, ShieldCheck, Bell, CheckCheck, ExternalLink, FolderOpen, WifiOff, Languages, HelpCircle, Download } from 'lucide-react';
import { notificationsApi, AppNotification } from '../api/client';
import { initSyncManager } from './offline/syncManager';
import { useOnlineStatus } from './offline/useOnlineStatus';
import { useLanguageStore } from './languageStore';

import { InstallAppBanner } from './offline/InstallAppBanner';
import { BrandLogo } from '../components/BrandLogo';
import { HelpSupportModal } from '../components/HelpSupportModal';

export const SupervisorLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { language, toggleLanguage, t } = useLanguageStore();
  const isOnline = useOnlineStatus();
  const navigate = useNavigate();

  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifs, setShowNotifs] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Detect if running in installed mobile app / standalone mode
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');
    setIsStandalone(isStandaloneMode);
  }, []);

  // Auto-close notifications dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifs(false);
      }
    };

    if (showNotifs) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showNotifs]);

  const fetchNotifs = async () => {
    try {
      const [count, list] = await Promise.all([
        notificationsApi.getUnreadCount(),
        notificationsApi.getMyNotifications(10),
      ]);
      setUnreadCount(count);
      setNotifications(list);
    } catch {
      // Offline fallback
    }
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 10000); // Polling every 10s for real-time alerts
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    initSyncManager();
  }, []);

  const handleMarkAllRead = async () => {
    await notificationsApi.markAllRead();
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handleLogout = () => {
    logout();
    navigate('/supervisor/login');
  };

  return (
    <div
      className="min-h-screen flex justify-center text-slate-900 font-sans antialiased touch-manipulation"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(248, 250, 252, 0.88), rgba(241, 245, 249, 0.92)), url('/assets/pwa-bg.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="max-w-md w-full min-h-[100dvh] bg-slate-50/85 backdrop-blur-xs flex flex-col border-x border-slate-200 shadow-2xl relative pb-[max(5.5rem,env(safe-area-inset-bottom))]">
        {/* Top Site Bar: High Contrast White for Outdoor Sunlight */}
        {/* Top Site Bar: High Contrast White for Outdoor Sunlight & Responsive Layout */}
        <header className="bg-white/95 backdrop-blur-xs text-slate-900 border-b border-slate-200 px-2.5 sm:px-4 py-2.5 sm:py-3 sticky top-0 z-30 shadow-2xs flex items-center justify-between gap-1 sm:gap-2">
          <BrandLogo roleTag="SUPERVISOR" tagColor="slate" size="sm" className="shrink min-w-0" />

          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Help & Support Button */}
            <button
              onClick={() => setIsHelpOpen(true)}
              title="Help & Support"
              className="p-1 sm:p-1.5 rounded-lg text-slate-500 hover:text-[#9e1218] hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Help & Support"
            >
              <HelpCircle className="w-4 h-4 text-[#9e1218]" />
            </button>

            {/* Language Switcher Pill EN | हिन्दी */}
            <button
              onClick={toggleLanguage}
              title={language === 'en' ? 'हिन्दी में बदलें (Switch to Hindi)' : 'Switch to English'}
              className="flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 transition-all shadow-2xs cursor-pointer shrink-0"
            >
              <Languages className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <span>{language === 'en' ? 'हिन्दी' : 'English'}</span>
            </button>

            {/* Install Mobile PWA Button: Visible when opened in browser, hidden when in standalone app */}
            {!isStandalone && (
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('trigger-pwa-install'))}
                title={language === 'hi' ? 'मोबाइल ऐप इंस्टॉल करें (PWA)' : 'Install Mobile App (PWA)'}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-black bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
              >
                <Download className="w-3.5 h-3.5 text-slate-950" />
                <span>{language === 'hi' ? 'ऐप इंस्टॉल' : 'Install App'}</span>
              </button>
            )}

            {!isOnline && (
              <span className="text-[9px] sm:text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-1.5 sm:px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs shrink-0">
                <WifiOff className="w-3 h-3 text-amber-700 shrink-0" /> <span className="hidden xs:inline">{t('status_offline')}</span>
              </span>
            )}

            {/* Real-time Notification Bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => {
                  setShowNotifs(!showNotifs);
                  if (!showNotifs) fetchNotifs();
                }}
                title={t('alerts_approvals')}
                className="p-1 sm:p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors relative cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#9e1218] text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifs && (
                <div className="absolute right-0 mt-2 w-64 sm:w-72 max-w-[calc(100vw-1.5rem)] bg-white text-slate-900 rounded-xl shadow-xl border border-slate-200 z-50 p-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                    <span className="text-xs font-bold text-slate-800">{t('alerts_approvals')}</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5 cursor-pointer"
                      >
                        <CheckCheck className="w-3 h-3" /> {t('mark_all_read')}
                      </button>
                    )}
                  </div>

                  {notifications.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">{t('no_notifications')}</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                      {notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            notificationsApi.markRead(n.id);
                            setShowNotifs(false);
                            if (n.link) navigate(n.link);
                          }}
                          className={`p-2 rounded-lg text-left cursor-pointer transition-colors border ${
                            n.is_read
                              ? 'bg-slate-50 border-slate-100 text-slate-600'
                              : 'bg-blue-50/70 border-blue-200 text-slate-900 font-medium'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px]">
                            <span
                              className={`font-bold ${
                                n.type === 'APPROVAL'
                                  ? 'text-emerald-600'
                                  : n.type === 'REJECTION'
                                  ? 'text-rose-600'
                                  : 'text-blue-600'
                              }`}
                            >
                              {n.title}
                            </span>
                            <ExternalLink className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                          </div>
                          <p className="text-[11px] mt-0.5 leading-snug line-clamp-2">{n.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sign Out Button */}
            <button
              onClick={handleLogout}
              title={t('sign_out')}
              className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>
        
        {/* PWA Mobile App Install Banner */}
        <InstallAppBanner />

        {/* Main Screen Outlet wrapped in ErrorBoundary with smooth momentum scrolling */}
        <main className="flex-1 p-4 overflow-y-auto -webkit-overflow-scrolling-touch">
          <Outlet />
        </main>

        {/* Persistent Bottom Bar (Safe-Area compliant for iOS home bar) */}
        <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-xs border-t border-slate-200 px-6 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex justify-around items-center z-40 shadow-lg">
          <NavLink
            to="/supervisor"
            end
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
                isActive ? 'text-[#9e1218] font-bold' : 'text-slate-500 hover:text-slate-800'
              }`
            }
          >
            <Home className="w-5 h-5" />
            <span>{t('nav_home')}</span>
          </NavLink>

          <NavLink
            to="/supervisor/log"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
                isActive ? 'text-[#9e1218] font-bold' : 'text-slate-500 hover:text-slate-800'
              }`
            }
          >
            <div className="w-11 h-11 -mt-5 rounded-full bg-[#9e1218] hover:bg-[#a51016] text-white flex items-center justify-center shadow-md shadow-red-950/40 active:scale-95 transition-transform">
              <PlusCircle className="w-6 h-6" />
            </div>
            <span>{t('nav_log')}</span>
          </NavLink>

          <NavLink
            to="/supervisor/files"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
                isActive ? 'text-[#9e1218] font-bold' : 'text-slate-500 hover:text-slate-800'
              }`
            }
          >
            <FolderOpen className="w-5 h-5" />
            <span>{t('nav_files')}</span>
          </NavLink>

          <NavLink
            to="/supervisor/submissions"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
                isActive ? 'text-[#9e1218] font-bold' : 'text-slate-500 hover:text-slate-800'
              }`
            }
          >
            <ListOrdered className="w-5 h-5" />
            <span>{t('nav_history')}</span>
          </NavLink>
        </nav>
      </div>

      {/* Help & Support Interactive Modal for Field Supervisors */}
      <HelpSupportModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        role="supervisor"
      />
    </div>
  );
};
