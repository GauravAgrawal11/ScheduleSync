import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../auth/authStore';
import { Home, PlusCircle, ListOrdered, LogOut, HardHat, ShieldCheck, Bell, CheckCheck, ExternalLink, FolderOpen, WifiOff } from 'lucide-react';
import { notificationsApi, AppNotification } from '../api/client';
import { initSyncManager } from './offline/syncManager';
import { useOnlineStatus } from './offline/useOnlineStatus';

import { InstallAppBanner } from './offline/InstallAppBanner';

export const SupervisorLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();

  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifs, setShowNotifs] = useState<boolean>(false);

  const fetchNotifs = async () => {
    try {
      const [count, list] = await Promise.all([
        notificationsApi.getUnreadCount(),
        notificationsApi.getMyNotifications(10),
      ]);
      setUnreadCount(count);
      setNotifications(list);
    } catch {}
  };

  useEffect(() => {
    initSyncManager();
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 10000); // Polling every 10s for real-time alerts
    return () => clearInterval(interval);
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
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col border-x border-slate-200 shadow-xl relative pb-20">
      {/* Top Site Bar: High Contrast White for Outdoor Sunlight */}
      <header className="bg-white text-slate-900 border-b border-slate-200 px-4 py-3 sticky top-0 z-30 shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 font-bold">
            <HardHat className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-slate-900">ScheduleSync Mobile</h1>
            <p className="text-[10px] text-slate-500">
              {user?.name || 'Site Supervisor'} · {user?.discipline ? `${user.discipline.toUpperCase()} Discipline` : 'Field Site'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isOnline && (
            <span className="text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
              <WifiOff className="w-3 h-3 text-amber-700" /> Offline
            </span>
          )}

          {/* Real-time Notification Bell */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifs(!showNotifs);
                if (!showNotifs) fetchNotifs();
              }}
              title="Notifications"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors relative"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifs && (
              <div className="absolute right-0 mt-2 w-72 bg-white text-slate-900 rounded-xl shadow-xl border border-slate-200 z-50 p-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                  <span className="text-xs font-bold text-slate-800">Alerts & Approvals</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5"
                    >
                      <CheckCheck className="w-3 h-3" /> Mark all read
                    </button>
                  )}
                </div>

                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No recent notifications</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
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
                          <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                        </div>
                        <p className="text-[11px] mt-0.5 leading-snug line-clamp-2">{n.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-[10px] font-mono font-semibold text-amber-800 border border-amber-200">
            Field Terminal
          </span>

          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>
      
      {/* PWA Mobile App Install Banner */}
      <InstallAppBanner />

      {/* Main Screen Outlet wrapped in ErrorBoundary */}
      <main className="flex-1 p-4 overflow-y-auto">
        <Outlet />
      </main>

      {/* Persistent Bottom Bar */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-slate-200 px-6 py-2 flex justify-around items-center z-40 shadow-lg">
        <NavLink
          to="/supervisor"
          end
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
              isActive ? 'text-oil-800 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`
          }
        >
          <Home className="w-5 h-5" />
          <span>Home</span>
        </NavLink>

        <NavLink
          to="/supervisor/log"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
              isActive ? 'text-oil-800 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`
          }
        >
          <div className="w-9 h-9 -mt-4 rounded-full bg-oil-800 text-white flex items-center justify-center shadow-md shadow-oil-900/30">
            <PlusCircle className="w-5 h-5" />
          </div>
          <span>Log Work</span>
        </NavLink>

        <NavLink
          to="/supervisor/files"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
              isActive ? 'text-oil-800 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`
          }
        >
          <FolderOpen className="w-5 h-5" />
          <span>Files</span>
        </NavLink>

        <NavLink
          to="/supervisor/submissions"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
              isActive ? 'text-oil-800 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`
          }
        >
          <ListOrdered className="w-5 h-5" />
          <span>My Logs</span>
        </NavLink>
      </nav>
    </div>
  );
};
