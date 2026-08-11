import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { getDashboardRedirect } from '../../utils/roleRedirect';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem('theme') === 'dark'
  );

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
      document.documentElement.classList.add('dark');
      setDarkMode(true);
    }
  }, []);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate('/');
  };

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  const activeStyle = ({ isActive }) =>
    `text-sm font-semibold transition-colors duration-200 pb-0.5 border-b-2 ${
      isActive
        ? 'text-primary border-primary'
        : 'text-slate-600 dark:text-slate-300 border-transparent hover:text-primary dark:hover:text-primary'
    }`;

  const navLinks = [
    { to: '/', label: 'Home', end: true },
    { to: '/#events', label: 'Events', end: false },
    { to: '/gallery', label: 'Gallery', end: false },
    { to: '/contact', label: 'Contact', end: false },
  ];

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-300 border-b ${
        scrolled
          ? 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-slate-200/60 dark:border-slate-700/60 shadow-sm'
          : 'bg-transparent border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 lg:h-18">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent tracking-tight">
                CampusConnect
              </span>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <NavLink
                key={link.label}
                to={link.to}
                end={link.end}
                className={activeStyle}
              >
                {link.label}
              </NavLink>
            ))}

            <button
              onClick={toggleDarkMode}
              aria-label="Toggle dark mode"
              className="p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              {darkMode ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>

            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  to={getDashboardRedirect(user.role)}
                  className="bg-primary hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-full transition shadow-sm"
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-semibold"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="bg-primary hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2 rounded-full transition shadow-md shadow-blue-200/50 dark:shadow-none"
              >
                Login
              </Link>
            )}
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={toggleDarkMode}
              aria-label="Toggle dark mode"
              className="p-2 rounded-full text-slate-600 dark:text-slate-300"
            >
              {darkMode ? '🌞' : '🌙'}
            </button>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="text-slate-600 dark:text-slate-300 p-2"
              aria-label="Toggle menu"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 px-4 pt-2 pb-4 flex flex-col gap-2">
          {navLinks.map((link) => (
            <NavLink
              key={link.label}
              to={link.to}
              end={link.end}
              onClick={() => setMenuOpen(false)}
              className="text-sm font-medium text-slate-600 dark:text-slate-300 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              {link.label}
            </NavLink>
          ))}
          <div className="border-t border-slate-100 dark:border-slate-700 pt-3 mt-1">
            {user ? (
              <div className="flex flex-col gap-2">
                <Link
                  to={getDashboardRedirect(user.role)}
                  onClick={() => setMenuOpen(false)}
                  className="bg-primary text-white text-center text-sm font-semibold py-2 rounded-xl"
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-rose-600 text-center text-sm font-semibold py-2"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                onClick={() => setMenuOpen(false)}
                className="block bg-primary text-white text-center text-sm font-semibold py-2.5 rounded-xl"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
