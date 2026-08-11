import React from 'react';
import useAuth from '../../hooks/useAuth';

/**
 * Reusable sidebar/tab selector component for dashboard pages.
 * Supports mobile slide-in behavior and logout button.
 */
const Sidebar = ({
  tabs,
  activeTab,
  setActiveTab,
  mobileOpen = false,
  setMobileOpen = () => {},
  onLogout,
}) => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const initials = user.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      logout();
    }
    setMobileOpen(false);
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-30 md:hidden bg-slate-900/50 transition-opacity duration-300 ${
          mobileOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
        }`}
        onClick={() => setMobileOpen(false)}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 max-w-full bg-white border-r border-slate-200 p-6 flex flex-col gap-6 shadow-2xl transition-transform duration-300 ease-in-out md:static md:translate-x-0 md:shadow-none ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary font-black flex items-center justify-center text-lg">
              CC
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">CampusConnect</p>
              <p className="text-xs text-slate-500">Student Portal</p>
            </div>
          </div>
          <button
            type="button"
            className="text-slate-500 hover:text-slate-700 md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close sidebar"
          >
            ×
          </button>
        </div>

        <div className="rounded-3xl border border-slate-100 p-4 bg-slate-50 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary font-black flex items-center justify-center text-lg">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">{user.name}</p>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
          </div>
        </div>

        <nav className="flex-1">
          <ul className="flex flex-col gap-2">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <li key={tab.id}>
                  <button
                    onClick={() => {
                      setActiveTab(tab.id);
                      setMobileOpen(false);
                    }}
                    className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition ${
                      isActive
                        ? 'bg-primary text-white shadow-md shadow-blue-200'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-base">{tab.icon}</span>
                    <span className="truncate">{tab.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="pt-4 border-t border-slate-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <span>🚪</span>
            Logout
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
