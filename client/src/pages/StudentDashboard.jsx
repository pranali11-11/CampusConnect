import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/common/Sidebar';
import Loader from '../components/common/Loader';
import registrationService from '../services/registrationService';
import { formatDate } from '../utils/formatDate';
import { useToast } from '../hooks/useToast';
import useAuth from '../hooks/useAuth';

const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('registrations');
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  // States
  const [registrations, setRegistrations] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // Modal states
  const [selectedQR, setSelectedQR] = useState(null);
  const [selectedCert, setSelectedCert] = useState(null);

  // Fetch all student dashboard datasets
  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        setLoading(true);
        const [regRes, certRes, notifRes] = await Promise.all([
          registrationService.getStudentRegistrations(),
          registrationService.getMyCertificates(),
          registrationService.getMyNotifications(),
        ]);

        if (regRes.success) setRegistrations(regRes.data);
        if (certRes.success) setCertificates(certRes.data);
        if (notifRes.success) setNotifications(notifRes.data);
      } catch (error) {
        console.error('Error fetching student dashboard details:', error);
        showToast('Failed to load dashboard data.', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [showToast]);

  // Mark all notifications as read
  const handleMarkNotificationsRead = async () => {
    try {
      const response = await registrationService.readAllNotifications();
      if (response.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        showToast('All notifications marked as read', 'success');
      }
    } catch (error) {
      console.error(error);
      showToast('Could not clear notifications', 'error');
    }
  };

  // Generate certificate for a registration
  const handleGenerateCertificate = async (registrationId) => {
    try {
      const response = await registrationService.generateCertificate(registrationId);
      if (response.success) {
        showToast('Certificate generated successfully!', 'success');
        // Refresh certificates list
        const certRes = await registrationService.getMyCertificates();
        if (certRes.success) setCertificates(certRes.data);
      }
    } catch (error) {
      console.error('Certificate generation error:', error);
      const errorMsg =
        error.response?.data?.error || error.message || 'Failed to generate certificate';
      showToast(errorMsg, 'error');
    }
  };

  // Check if student is eligible for certificate
  const isCertificateEligible = (registration) => {
    if (registration.status !== 'attended') return false;
    const eventDate = new Date(registration.eventId?.date);
    const now = new Date();
    if (eventDate > now) return false;
    return true;
  };

  const tabs = [
    { id: 'registrations', label: 'Registered Events', icon: '🎟️' },
    { id: 'certificates', label: 'Certificates', icon: '🎓' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'profile', label: 'My Profile', icon: '👤' },
  ];

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const attendedCount = registrations.filter((r) => r.status === 'attended').length;

  if (loading) return <Loader />;

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col md:flex-row w-full font-sans antialiased text-slate-800">
      {/* Docked Left Sidebar */}
      <Sidebar
        tabs={tabs}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        unreadCount={unreadCount}
      />

      {/* Right Content Panel */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Header / App Bar */}
        <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition shrink-0"
              aria-label="Open sidebar"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                <span>CampusConnect</span>
                <span>/</span>
                <span className="text-primary capitalize">Student Portal</span>
                <span>/</span>
                <span className="text-slate-600 truncate">
                  {tabs.find((t) => t.id === activeTab)?.label}
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight truncate">
                {tabs.find((t) => t.id === activeTab)?.label}
              </h1>
            </div>
          </div>

          {/* User Quick Chip & Notification Bell */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-2 bg-slate-100/80 border border-slate-200/60 px-3 py-1.5 rounded-full text-xs font-bold text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Welcome, {user?.name?.split(' ')[0]}</span>
            </div>

            <button
              onClick={() => setActiveTab('notifications')}
              className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
              title="Notifications"
            >
              <span className="text-lg">🔔</span>
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white"></span>
              )}
            </button>
          </div>
        </header>

        {/* Main Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {/* ──────────────── TAB 1: REGISTERED EVENTS ──────────────── */}
          {activeTab === 'registrations' && (
            <div className="space-y-6">
              {/* Header Box */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🎟️</span>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                      Event Passes & Registrations
                    </h2>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Manage your event admission passes, QR verification codes, and attendance certificates.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 text-xs font-extrabold border border-blue-100">
                    {registrations.length} Registered
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-extrabold border border-emerald-100">
                    {attendedCount} Attended
                  </span>
                </div>
              </div>

              {/* Registrations List or Rich Empty State */}
              {registrations.length === 0 ? (
                <div className="bg-white border border-slate-200/80 rounded-3xl p-8 sm:p-14 text-center max-w-xl mx-auto my-6 shadow-sm">
                  <div className="w-20 h-20 mx-auto rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center text-4xl shadow-inner border border-blue-100/80 mb-5">
                    🎫
                  </div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">
                    No Registered Events Yet
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed max-w-md mx-auto">
                    You haven't registered for any events or workshops yet. Browse the campus event catalog to find upcoming hackathons, guest lectures, cultural nights, and seminars!
                  </p>
                  <button
                    onClick={() => navigate('/')}
                    className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/35 hover:-translate-y-0.5 transition-all"
                  >
                    <span>Browse Campus Events</span>
                    <span>→</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {registrations.map((reg) => (
                    <div
                      key={reg._id}
                      className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between gap-4"
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0">
                          <span className="inline-block text-[11px] font-black bg-primary/10 text-primary px-2.5 py-1 rounded-lg uppercase tracking-wider">
                            {reg.eventId?.category || 'CAMPUS EVENT'}
                          </span>
                          <h3 className="font-black text-slate-900 mt-2 text-base sm:text-lg leading-snug">
                            {reg.eventId?.title || 'Registered Event'}
                          </h3>
                        </div>

                        <span
                          className={`text-xs font-black px-3 py-1 rounded-full capitalize shrink-0 ${
                            reg.status === 'attended'
                              ? 'bg-emerald-100 text-emerald-800'
                              : reg.status === 'cancelled'
                              ? 'bg-slate-200 text-slate-600'
                              : reg.status === 'pending_approval'
                              ? 'bg-amber-100 text-amber-800'
                              : reg.status === 'rejected'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {reg.status === 'pending_approval' ? 'Pending Approval' : reg.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 py-3 border-y border-slate-100 text-xs">
                        <div className="flex items-center gap-2 text-slate-500">
                          <span>📍</span>
                          <span className="font-semibold text-slate-800 truncate">
                            {reg.eventId?.venue || 'Campus Main'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500">
                          <span>📅</span>
                          <span className="font-semibold text-slate-800 truncate">
                            {reg.eventId?.date ? formatDate(reg.eventId.date) : 'TBA'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500">
                          <span>🕒</span>
                          <span className="font-semibold text-slate-800 truncate">
                            {reg.eventId?.time || 'TBD'}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        {reg.status === 'registered' || reg.status === 'attended' ? (
                          <button
                            onClick={() => setSelectedQR(reg)}
                            className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
                          >
                            <span>📱</span>
                            <span>Show Entry Pass</span>
                          </button>
                        ) : reg.status === 'pending_approval' ? (
                          <div className="flex-1 text-center text-xs text-amber-700 bg-amber-50 font-bold py-2.5 px-3 rounded-xl border border-amber-200">
                            Awaiting Faculty Approval
                          </div>
                        ) : reg.status === 'rejected' ? (
                          <div className="flex-1 text-center text-xs text-rose-700 bg-rose-50 font-bold py-2.5 px-3 rounded-xl border border-rose-200">
                            Registration Rejected
                          </div>
                        ) : null}

                        {isCertificateEligible(reg) && (
                          <button
                            onClick={() => handleGenerateCertificate(reg._id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-500/20"
                            title="Generate Official Certificate"
                          >
                            <span>🎓</span>
                            <span>Certificate</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ──────────────── TAB 2: CERTIFICATES ──────────────── */}
          {activeTab === 'certificates' && (
            <div className="space-y-6">
              {/* Header Box */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🎓</span>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                      Merit & Participation Certificates
                    </h2>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Official digital credentials unlocked by attending completed university events.
                  </p>
                </div>

                <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 text-xs font-extrabold border border-amber-100 self-start sm:self-auto">
                  {certificates.length} Issued
                </span>
              </div>

              {certificates.length === 0 ? (
                <div className="bg-white border border-slate-200/80 rounded-3xl p-8 sm:p-14 text-center max-w-xl mx-auto my-6 shadow-sm">
                  <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center text-4xl shadow-inner border border-amber-100/80 mb-5">
                    📜
                  </div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">
                    No Certificates Earned Yet
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed max-w-md mx-auto">
                    Certificates are automatically issued when faculty confirms your attendance at completed campus events.
                  </p>
                  <button
                    onClick={() => setActiveTab('registrations')}
                    className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 text-white font-bold text-xs shadow-md hover:bg-slate-800 transition"
                  >
                    <span>View Registered Events</span>
                    <span>→</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {certificates.map((cert) => (
                    <div
                      key={cert._id}
                      className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md hover:border-amber-300 transition-all flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                          ISSUED {formatDate(cert.generatedAt)}
                        </span>
                        <h3 className="font-black text-slate-900 mt-1 text-base leading-snug truncate">
                          {cert.eventId?.title}
                        </h3>
                        <p className="text-xs text-primary font-bold mt-1 uppercase tracking-wider">
                          {cert.eventId?.category || 'CAMPUS EVENT'}
                        </p>
                      </div>

                      <button
                        onClick={() => setSelectedCert(cert)}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-sm shrink-0"
                      >
                        View & Print
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ──────────────── TAB 3: NOTIFICATIONS ──────────────── */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              {/* Header Box */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🔔</span>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                      Recent Alerts & Updates
                    </h2>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Stay notified about registration status, certificate releases, and reminders.
                  </p>
                </div>

                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkNotificationsRead}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 transition self-start sm:self-auto"
                  >
                    <span>✓</span>
                    <span>Mark all as read</span>
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div className="bg-white border border-slate-200/80 rounded-3xl p-8 sm:p-14 text-center max-w-xl mx-auto my-6 shadow-sm">
                  <div className="w-20 h-20 mx-auto rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center text-4xl shadow-inner border border-blue-100/80 mb-5">
                    📭
                  </div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">
                    All Caught Up!
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-sm mx-auto">
                    You have no new alerts. Important notifications about your events will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notif) => (
                    <div
                      key={notif._id}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all flex items-start gap-4 ${
                        notif.isRead
                          ? 'bg-white border-slate-200/80 text-slate-600'
                          : 'bg-gradient-to-r from-blue-50/70 to-indigo-50/50 border-blue-200/80 text-slate-900 font-medium shadow-sm'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center text-lg shadow-xs shrink-0">
                        {notif.type === 'certificate_ready'
                          ? '📜'
                          : notif.type === 'registration_confirmed'
                          ? '🎟️'
                          : '🔔'}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm leading-relaxed">{notif.message}</p>
                        <span className="text-[11px] text-slate-400 font-semibold mt-1 block">
                          {formatDate(notif.createdAt)}
                        </span>
                      </div>

                      {!notif.isRead && (
                        <span className="w-2.5 h-2.5 bg-primary rounded-full shrink-0 mt-1.5"></span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ──────────────── TAB 4: MY PROFILE ──────────────── */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Student Identity Card */}
              <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 text-white font-black text-2xl flex items-center justify-center shadow-lg">
                      {user?.name
                        ? user.name
                            .split(' ')
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase()
                        : 'ST'}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl sm:text-2xl font-black tracking-tight">{user.name}</h2>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                          ✓ Verified
                        </span>
                      </div>
                      <p className="text-xs text-blue-100 font-medium mt-0.5">{user.email}</p>
                      <p className="text-xs text-blue-200 font-semibold mt-1 uppercase tracking-wider">
                        {user.department} Department
                      </p>
                    </div>
                  </div>

                  <div className="bg-white/15 backdrop-blur-md border border-white/20 px-4 py-2.5 rounded-2xl text-right self-stretch sm:self-auto">
                    <p className="text-[10px] uppercase tracking-wider font-extrabold text-blue-200">
                      Roll Number
                    </p>
                    <p className="text-base font-black tracking-wider uppercase">
                      {user.rollNumber || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Profile Details Grid */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-sm">
                <h3 className="text-base font-black text-slate-900 border-b border-slate-100 pb-4 mb-6">
                  📋 Academic & Contact Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Full Name</p>
                    <p className="text-sm font-bold text-slate-900 mt-1">{user.name}</p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Roll Number</p>
                    <p className="text-sm font-bold text-slate-900 mt-1 uppercase">{user.rollNumber || 'N/A'}</p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Email Address</p>
                    <p className="text-sm font-bold text-slate-900 mt-1 truncate">{user.email}</p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Mobile Number</p>
                    <p className="text-sm font-bold text-slate-900 mt-1">{user.mobile || 'Not Specified'}</p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Branch / Dept</p>
                    <p className="text-sm font-bold text-slate-900 mt-1">{user.department}</p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Account Role</p>
                    <p className="text-sm font-bold text-slate-900 mt-1 capitalize">{user.role}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ──────────────── MODAL: QR ENTRY PASS ──────────────── */}
      {selectedQR && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full border border-slate-100 shadow-2xl flex flex-col items-center gap-5 relative animate-scale-in">
            <button
              onClick={() => setSelectedQR(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center text-lg font-bold transition"
            >
              &times;
            </button>

            <div className="text-center">
              <span className="text-2xl">🎟️</span>
              <h3 className="text-lg font-black text-slate-900 mt-1">Admission Pass</h3>
              <p className="text-xs text-slate-500 mt-0.5 font-semibold">{selectedQR.eventId?.title}</p>
            </div>

            {/* QR Scanner Display Box */}
            <div className="w-52 h-52 bg-slate-900 rounded-2xl flex flex-col items-center justify-center p-4 text-white shadow-lg">
              <span className="text-4xl mb-2">📱</span>
              <span className="text-[10px] font-black tracking-widest uppercase text-blue-300">
                OFFICIAL ENTRY PASS
              </span>
              <p className="text-[10px] text-slate-400 text-center mt-2">
                Present this pass at the gate for QR barcode scanning
              </p>
            </div>

            <div className="text-center bg-slate-50 w-full py-2.5 rounded-xl border border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pass Token</p>
              <code className="text-xs font-black text-slate-800">{selectedQR.qrData}</code>
            </div>

            <div className="w-full text-xs text-slate-600 space-y-1.5 bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
              <p>
                👤 <span className="font-semibold text-slate-800">{user?.name}</span>
              </p>
              <p>
                📍 <span className="font-semibold text-slate-800">{selectedQR.eventId?.venue || 'Campus Main'}</span>
              </p>
              <p>
                📅 <span className="font-semibold text-slate-800">
                  {selectedQR.eventId?.date ? formatDate(selectedQR.eventId.date) : 'TBA'} @ {selectedQR.eventId?.time || 'TBD'}
                </span>
              </p>
            </div>

            {selectedQR.eventId?.whatsappGroupLink && selectedQR.paymentStatus !== 'pending' && (
              <a
                href={selectedQR.eventId.whatsappGroupLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
              >
                <span>💬</span>
                <span>Join Official WhatsApp Group</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* ──────────────── MODAL: CERTIFICATE VIEWER ──────────────── */}
      {selectedCert && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full border border-slate-100 shadow-2xl relative animate-scale-in">
            <button
              onClick={() => setSelectedCert(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center text-lg font-bold transition"
            >
              &times;
            </button>

            {/* Formal Certificate Layout */}
            <div className="border-8 border-double border-amber-600/80 p-6 sm:p-8 text-center bg-amber-50/20 rounded-2xl flex flex-col items-center gap-5 shadow-inner">
              <span className="text-4xl">📜</span>
              <h2 className="text-xs font-extrabold uppercase tracking-widest text-amber-800">
                Certificate of Attendance & Completion
              </h2>
              <p className="text-slate-500 italic text-xs sm:text-sm">This certificate is proudly awarded to</p>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 underline decoration-amber-600 decoration-wavy py-1">
                {user.name}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md leading-relaxed">
                for active participation and completion of the university event{' '}
                <span className="font-extrabold text-slate-900">"{selectedCert.eventId?.title}"</span>{' '}
                conducted by the department of{' '}
                <span className="font-semibold text-slate-900">
                  {selectedCert.eventId?.coordinatorId?.department || user.department}
                </span>.
              </p>

              <div className="w-full flex justify-between items-end border-t border-slate-200 pt-5 mt-2">
                <div className="text-left">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Verification ID</p>
                  <code className="text-[11px] font-semibold text-slate-700">{selectedCert._id}</code>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date Issued</p>
                  <p className="text-xs font-semibold text-slate-700">{formatDate(selectedCert.generatedAt)}</p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-3 justify-end">
              <button
                onClick={() => window.print()}
                className="bg-primary hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-sm"
              >
                🖨️ Print Certificate
              </button>
              <button
                onClick={() => setSelectedCert(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
