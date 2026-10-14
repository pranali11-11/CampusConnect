import React from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

/**
 * Reusable, fully responsive sidebar navigation for portal dashboards.
 * Pinned to the left on desktop and responsive slide-over drawer on mobile.
 */
const Sidebar = ({
  tabs,
  activeTab,
  setActiveTab,
  mobileOpen = false,
  setMobileOpen = () => {},
  unreadCount = 0,
  onLogout,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const initials = user.name
    ? user.name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('')
    : 'CC';

  const roleLabel =
    user.role === 'student'
      ? 'Student Portal'
      : user.role === 'teacher'
      ? 'Faculty Portal'
      : user.role === 'hod'
      ? 'HOD Portal'
      : 'User Portal';

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      logout();
    }
    setMobileOpen(false);
  };

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      {/* Main Sidebar (Docked on Desktop, Drawer on Mobile) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white border-r border-slate-200/80 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out md:static md:translate-x-0 md:shadow-none md:h-screen md:sticky md:top-0 shrink-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white font-extrabold flex items-center justify-center text-base shadow-md shadow-blue-500/20">
              CC
            </div>
            <div>
              <p className="text-base font-extrabold text-slate-900 leading-tight tracking-tight">
                Campus<span className="text-primary">Connect</span>
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  {roleLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Mobile close button */}
          <button
            type="button"
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center md:hidden transition"
            onClick={() => setMobileOpen(false)}
            aria-label="Close sidebar"
          >
            ✕
          </button>
        </div>

        {/* User Profile Card */}
        <div className="p-4 mx-4 mt-4 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/40 border border-slate-200/70 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-sm shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
            <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
            <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white border border-slate-200/80 text-primary">
              {user.department || user.role}
            </span>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          <p className="px-3 pb-2 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
            Navigation
          </p>

          <nav>
            <ul className="space-y-1">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const isNotifTab = tab.id === 'notifications';

                return (
                  <li key={tab.id}>
                    <button
                      type="button"
                      onClick={() => handleTabClick(tab.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 translate-x-0.5'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-base shrink-0">{tab.icon}</span>
                        <span className="truncate">{tab.label}</span>
                      </div>

                      {/* Notification Count Badge or Tab Badge */}
                      {isNotifTab && unreadCount > 0 ? (
                        <span
                          className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                            isActive
                              ? 'bg-white text-primary'
                              : 'bg-rose-500 text-white'
                          }`}
                        >
                          {unreadCount}
                        </span>
                      ) : tab.badge !== undefined && tab.badge !== null ? (
                        <span
                          className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                            isActive
                              ? 'bg-white text-primary'
                              : 'bg-amber-500 text-white'
                          }`}
                        >
                          {tab.badge}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        {/* Bottom Section */}
        <div className="p-4 border-t border-slate-100 space-y-2 mt-auto">
          {/* Back to Home Button */}
          <button
            type="button"
            onClick={() => {
              navigate('/');
              setMobileOpen(false);
            }}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
          >
            <span>←</span>
            <span>Back to Website</span>
          </button>

          {/* Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-rose-200/60 bg-rose-50/50 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100/70 hover:border-rose-300 transition"
          >
            <span>🚪</span>
            <span>Logout</span>
          </button>

          <p className="text-center text-[10px] text-slate-400 font-medium pt-1">
            CampusConnect Portal v1.0
          </p>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
