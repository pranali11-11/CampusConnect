import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import authService from '../services/authService';
import { getDashboardRedirect } from '../utils/roleRedirect';

const ROLES = [
  { value: 'student', label: 'Student', icon: '🎓' },
  { value: 'teacher', label: 'Teacher', icon: '👨‍🏫' },
  { value: 'hod', label: 'HOD', icon: '🏛️' },
];

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const validate = () => {
    const newErrors = {};
    if (!email.trim()) newErrors.email = 'Email is required';
    if (!password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    if (rememberMe) {
      localStorage.setItem('rememberedEmail', email);
    } else {
      localStorage.removeItem('rememberedEmail');
    }

    setSubmitting(true);
    try {
      const response = await login(email, password, role);
      if (response.success) {
        showToast(`Welcome back, ${response.user.name}!`, 'success');
        navigate(getDashboardRedirect(response.user.role), { replace: true });
      }
    } catch (error) {
      const isBackendUnavailable =
        error?.code === 'ERR_CONNECTION_REFUSED' ||
        error?.message === 'Network Error';

      const errorMsg = isBackendUnavailable
        ? 'Backend unavailable (server not reachable). Check the server and try again.'
        : error.response?.data?.error ||
          error.message ||
          'Login failed. Please verify your credentials.';

      showToast(errorMsg, 'error');
    } finally {
      setSubmitting(false);
    }

  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      showToast('Please enter your email address', 'warning');
      return;
    }
    try {
      await authService.forgotPassword(forgotEmail);
      showToast('Password reset link sent to your email!', 'success');
      setShowForgot(false);
    } catch {
      showToast('Password reset feature coming soon!', 'info');
    }
  };

  const inputClass = (field) =>
    `w-full pl-11 pr-4 py-3 rounded-xl border text-sm transition focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-slate-800 dark:text-white ${
      errors[field]
        ? 'border-rose-500 focus:border-rose-500'
        : 'border-slate-200 dark:border-slate-600 focus:border-primary'
    }`;

  return (
    <div className="flex-grow min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 bg-gradient-to-br from-primary/5 via-white to-secondary/10 dark:from-slate-900 dark:via-slate-900 dark:to-primary/10">
      <div className="max-w-md w-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-3xl border border-slate-100 dark:border-slate-700 shadow-2xl p-8 md:p-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent text-white text-2xl mb-3 shadow-lg shadow-primary/30">
            🎓
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            CampusConnect
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Sign in to your account</p>
        </div>

        {/* Role tabs */}
        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-700 rounded-xl mb-6">
          {ROLES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRole(r.value)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition ${
                role === r.value
                  ? 'bg-white dark:bg-slate-600 text-primary dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-300 hover:text-slate-700'
              }`}
            >
              <span>{r.icon}</span>
              {r.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Email */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">📧</span>
              <input
                type="email"
                placeholder="you@college.edu"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: '' })); }}
                className={inputClass('email')}
              />
            </div>
            {errors.email && <p className="text-xs text-rose-500 mt-1">{errors.email}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">
              Password
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔒</span>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: '' })); }}
                className={`${inputClass('password')} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {errors.password && <p className="text-xs text-rose-500 mt-1">{errors.password}</p>}
          </div>

          {/* Remember me + Forgot */}
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-slate-300 text-primary focus:ring-primary"
              />
              Remember Me
            </label>
            <button
              type="button"
              onClick={() => setShowForgot(!showForgot)}
              className="text-primary hover:underline font-semibold text-xs"
            >
              Forgot Password?
            </button>
          </div>

          {showForgot && (
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 border border-slate-200 dark:border-slate-600">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Enter your email to reset password</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="flex-grow px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="bg-secondary hover:bg-cyan-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition shrink-0"
                >
                  Send
                </button>
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl mt-2 transition shadow-md shadow-primary/25 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="border-t border-slate-100 dark:border-slate-700 mt-6 pt-6 text-center text-sm">
          <p className="text-slate-500 dark:text-slate-400">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-primary hover:underline font-bold">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
