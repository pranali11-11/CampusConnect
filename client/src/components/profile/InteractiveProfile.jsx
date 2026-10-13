import React, { useState, useEffect } from 'react';
import useAuth from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import authService from '../../services/authService';
import { DEPARTMENTS } from '../../constants/departments';

/**
 * InteractiveProfile Component
 * Supports interactive profile editing, validation, password changes,
 * and role-specific stats for Students, Teachers, and HODs.
 *
 * @param {object} props
 * @param {string} props.role - 'student' | 'teacher' | 'hod'
 * @param {Array} props.stats - Optional array of stat items { label, value, icon, tabId }
 * @param {Function} props.onNavigateTab - Optional callback to switch parent dashboard tab
 */
const InteractiveProfile = ({ role = 'student', stats = [], onNavigateTab }) => {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('details'); // 'details' | 'security'
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Edit form state
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    department: '',
    rollNumber: '',
  });

  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Sync user state into form when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        mobile: user.mobile || '',
        department: user.department || '',
        rollNumber: user.rollNumber || '',
      });
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCancelEdit = () => {
    if (user) {
      setFormData({
        name: user.name || '',
        mobile: user.mobile || '',
        department: user.department || '',
        rollNumber: user.rollNumber || '',
      });
    }
    setIsEditing(false);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();

    if (!formData.name.trim() || formData.name.trim().length < 3) {
      showToast('Name must be at least 3 characters long', 'warning');
      return;
    }

    if (formData.mobile && !/^\d{10}$/.test(formData.mobile.trim())) {
      showToast('Mobile number must be exactly 10 digits', 'warning');
      return;
    }

    if (user.role === 'student' && !formData.rollNumber?.trim()) {
      showToast('Roll number is required for students', 'warning');
      return;
    }

    if (!formData.department?.trim()) {
      showToast('Please select your department', 'warning');
      return;
    }

    try {
      setSavingProfile(true);
      const res = await authService.updateProfile({
        name: formData.name.trim(),
        mobile: formData.mobile.trim(),
        department: formData.department.trim(),
        rollNumber: user.role === 'student' ? formData.rollNumber.trim() : undefined,
      });

      if (res.success) {
        updateUser(res.user, res.token);
        showToast('Profile updated successfully!', 'success');
        setIsEditing(false);
      }
    } catch (err) {
      console.error('Update profile error:', err);
      showToast(err.response?.data?.error || 'Failed to update profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSubmitPassword = async (e) => {
    e.preventDefault();

    if (!passwordData.currentPassword) {
      showToast('Please enter your current password', 'warning');
      return;
    }

    if (!passwordData.newPassword || passwordData.newPassword.length < 6) {
      showToast('New password must be at least 6 characters long', 'warning');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showToast('New passwords do not match', 'warning');
      return;
    }

    try {
      setChangingPassword(true);
      const res = await authService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      if (res.success) {
        showToast('Password changed successfully!', 'success');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      }
    } catch (err) {
      console.error('Change password error:', err);
      showToast(err.response?.data?.error || 'Failed to change password', 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  const roleStyles = {
    student: {
      gradient: 'from-blue-600 via-indigo-600 to-violet-700',
      badgeBg: 'bg-blue-500/20 text-blue-100 border-blue-400/30',
      tag: 'Student Account',
      icon: '🎓',
    },
    teacher: {
      gradient: 'from-emerald-600 via-teal-600 to-cyan-700',
      badgeBg: 'bg-emerald-500/20 text-emerald-100 border-emerald-400/30',
      tag: 'Faculty / Coordinator',
      icon: '👨‍🏫',
    },
    hod: {
      gradient: 'from-purple-700 via-indigo-700 to-blue-800',
      badgeBg: 'bg-purple-500/20 text-purple-100 border-purple-400/30',
      tag: 'Head of Department',
      icon: '🏛️',
    },
  }[role] || {
    gradient: 'from-slate-700 to-slate-900',
    badgeBg: 'bg-slate-500/20 text-slate-100 border-slate-400/30',
    tag: 'CampusConnect User',
    icon: '👤',
  };

  const getInitials = (name) => {
    if (!name) return 'CC';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ──────────────── TOP HERO IDENTITY CARD ──────────────── */}
      <div
        className={`bg-gradient-to-br ${roleStyles.gradient} rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-blue-500/10 relative overflow-hidden`}
      >
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 text-white font-black text-2xl sm:text-3xl flex items-center justify-center shadow-lg shrink-0">
              {getInitials(user?.name)}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">{user?.name}</h2>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${roleStyles.badgeBg}`}>
                  {roleStyles.icon} {roleStyles.tag}
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                  ✓ Active
                </span>
              </div>
              <p className="text-xs text-blue-100 font-medium mt-1">{user?.email}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-xs bg-white/20 backdrop-blur-md px-3 py-1 rounded-full font-bold">
                  🏢 {user?.department || 'Department Not Set'}
                </span>
                {user?.role === 'student' && user?.rollNumber && (
                  <span className="text-xs bg-white/20 backdrop-blur-md px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                    ID: {user.rollNumber}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            {!isEditing ? (
              <button
                type="button"
                onClick={() => {
                  setIsEditing(true);
                  setActiveSubTab('details');
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-slate-900 hover:bg-slate-100 text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-sm active:scale-95"
              >
                <span>✏️</span>
                <span>Edit Profile</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition border border-white/30 active:scale-95"
              >
                <span>✕</span>
                <span>Cancel Editing</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ──────────────── INTERACTIVE STATS ROW ──────────────── */}
      {stats.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              onClick={() => {
                if (stat.tabId && onNavigateTab) {
                  onNavigateTab(stat.tabId);
                }
              }}
              className={`p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between gap-3 transition-all ${
                stat.tabId && onNavigateTab
                  ? 'cursor-pointer hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5'
                  : ''
              }`}
            >
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  {stat.label}
                </p>
                <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                  {stat.value}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-xl shrink-0">
                {stat.icon}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ──────────────── SECTION NAVIGATION TABS ──────────────── */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveSubTab('details')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeSubTab === 'details'
              ? 'bg-primary text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>👤</span>
          <span>Personal Details {isEditing && '(Editing)'}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('security')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeSubTab === 'security'
              ? 'bg-primary text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>🔒</span>
          <span>Security & Password</span>
        </button>
      </div>

      {/* ──────────────── SUBTAB 1: PERSONAL DETAILS ──────────────── */}
      {activeSubTab === 'details' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-sm">
          {!isEditing ? (
            /* VIEW MODE */
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <span>📋</span>
                    <span>Account Profile Information</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Your institutional details and contact preferences
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="bg-primary hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-sm inline-flex items-center gap-1.5"
                >
                  <span>✏️</span>
                  <span>Edit Details</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Full Name
                  </p>
                  <p className="text-sm font-bold text-slate-900 mt-1">{user?.name}</p>
                </div>

                {user?.role === 'student' && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Roll Number
                    </p>
                    <p className="text-sm font-bold text-slate-900 mt-1 uppercase">
                      {user?.rollNumber || 'Not Specified'}
                    </p>
                  </div>
                )}

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Email Address
                  </p>
                  <p className="text-sm font-bold text-slate-900 mt-1 truncate">{user?.email}</p>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">🔒 Login Identifier</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Mobile Number
                  </p>
                  <p className="text-sm font-bold text-slate-900 mt-1">
                    {user?.mobile || 'Not Specified'}
                  </p>
                  {!user?.mobile && (
                    <span className="text-[10px] text-amber-600 font-semibold block mt-0.5">
                      ⚠️ Add mobile for event SMS/WhatsApp notifications
                    </span>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Department
                  </p>
                  <p className="text-sm font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                    <span>🏢</span>
                    <span>{user?.department}</span>
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Role & Permissions
                  </p>
                  <p className="text-sm font-bold text-slate-900 mt-1 capitalize flex items-center gap-1.5">
                    <span>{roleStyles.icon}</span>
                    <span>{user?.role}</span>
                  </p>
                </div>
              </div>

              {role === 'hod' && (
                <div className="mt-6 p-4 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900 flex items-start gap-3">
                  <span className="text-lg">🏛️</span>
                  <div>
                    <strong className="block font-bold">HOD Jurisdiction Scope:</strong>
                    <span>
                      As Head of Department for <strong>{user?.department}</strong>, all event proposals created for your department require your approval before being published to the main dashboard.
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* EDIT MODE */
            <form onSubmit={handleSaveProfile}>
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <span>✏️</span>
                    <span>Edit Profile Details</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Update your display name, contact phone number, and academic department
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3.5 py-2 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="bg-primary hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {savingProfile ? (
                      <>
                        <span className="animate-spin text-sm">⏳</span>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <span>💾</span>
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                    className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
                    required
                  />
                </div>

                {/* Roll Number (for Students) */}
                {user?.role === 'student' && (
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                      Roll / Registration Number *
                    </label>
                    <input
                      type="text"
                      name="rollNumber"
                      value={formData.rollNumber}
                      onChange={handleInputChange}
                      placeholder="e.g. 21CS042"
                      className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition uppercase"
                      required
                    />
                  </div>
                )}

                {/* Mobile Number */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                    Mobile Number (10 Digits)
                  </label>
                  <input
                    type="tel"
                    name="mobile"
                    maxLength={10}
                    value={formData.mobile}
                    onChange={handleInputChange}
                    placeholder="e.g. 9876543210"
                    className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Used for event updates, registration confirmations, and coordinator contact.
                  </p>
                </div>

                {/* Department */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                    Academic Department *
                  </label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition bg-white"
                    required
                  >
                    <option value="">Select your Department</option>
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Email (Readonly) */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                    Email Address (Immutable)
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed outline-none"
                    />
                    <span className="absolute right-3 top-2.5 text-xs">🔒</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Your email address is your verified campus identity and cannot be altered directly.
                  </p>
                </div>

                {/* Role (Readonly) */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                    Assigned Role
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={`${user?.role?.toUpperCase()} (Institutional)`}
                      disabled
                      className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed outline-none"
                    />
                    <span className="absolute right-3 top-2.5 text-xs">🛡️</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-5 py-2.5 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="bg-primary hover:bg-blue-700 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {savingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ──────────────── SUBTAB 2: SECURITY & PASSWORD ──────────────── */}
      {activeSubTab === 'security' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="border-b border-slate-100 pb-4 mb-6">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <span>🔒</span>
              <span>Account Password & Credentials</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Keep your account secure by using a strong, unique password
            </p>
          </div>

          <form onSubmit={handleSubmitPassword} className="max-w-xl space-y-4">
            {/* Current Password */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                Current Password *
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  placeholder="Enter your current password"
                  className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-sm"
                  tabIndex={-1}
                >
                  {showCurrentPassword ? '👁️' : '🙈'}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                New Password (Minimum 6 characters) *
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  placeholder="Enter a strong new password"
                  className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-sm"
                  tabIndex={-1}
                >
                  {showNewPassword ? '👁️' : '🙈'}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                Confirm New Password *
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  placeholder="Re-enter your new password"
                  className={`w-full px-4 py-2.5 text-xs rounded-xl border ${
                    passwordData.confirmPassword &&
                    passwordData.newPassword !== passwordData.confirmPassword
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
                      : 'border-slate-300 focus:border-primary focus:ring-primary/20'
                  } focus:ring-2 outline-none transition pr-10`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-sm"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? '👁️' : '🙈'}
                </button>
              </div>
              {passwordData.confirmPassword &&
                passwordData.newPassword !== passwordData.confirmPassword && (
                  <p className="text-[10px] text-rose-500 font-bold mt-1">
                    ⚠️ New passwords do not match
                  </p>
                )}
            </div>

            <div className="pt-4 flex items-center gap-3">
              <button
                type="submit"
                disabled={changingPassword}
                className="bg-primary hover:bg-blue-700 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2"
              >
                {changingPassword ? (
                  <>
                    <span className="animate-spin text-sm">⏳</span>
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <span>🔐</span>
                    <span>Update Password</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() =>
                  setPasswordData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: '',
                  })
                }
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition"
              >
                Clear
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default InteractiveProfile;
