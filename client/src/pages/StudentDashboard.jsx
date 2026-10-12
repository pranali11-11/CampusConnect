import React, { useState, useEffect } from 'react';
import Sidebar from '../components/common/Sidebar';
import Loader from '../components/common/Loader';
import registrationService from '../services/registrationService';
import { formatDate } from '../utils/formatDate';
import { useToast } from '../hooks/useToast';
import useAuth from '../hooks/useAuth';

const StudentDashboard = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('registrations');
  const [loading, setLoading] = useState(true);

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
      const errorMsg = error.response?.data?.error || error.message || 'Failed to generate certificate';
      showToast(errorMsg, 'error');
    }
  };

  // Check if student is eligible for certificate
  const isCertificateEligible = (registration) => {
    // Must be attended
    if (registration.status !== 'attended') return false;

    // Event must have ended
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

  if (loading) return <Loader />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow flex flex-col md:flex-row gap-8">
      {/* Sidebar navigation */}
      <Sidebar tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Panel Content */}
      <main className="flex-grow bg-white border border-slate-100 rounded-2xl p-6 shadow-sm min-h-[500px]">
        
        {/* Panel 1: Registered Events */}
        {activeTab === 'registrations' && (
          <div>
            <h2 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-4 mb-5">
              🎟️ Event Registration Passes
            </h2>
            {registrations.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <p className="text-4xl mb-3">🎫</p>
                <p className="font-semibold text-sm">You haven't registered for any events yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {registrations.map((reg) => (
                  <div
                    key={reg._id}
                    className="border border-slate-200 rounded-2xl p-5 flex flex-col gap-4 hover:shadow-md transition bg-slate-50/50"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-black bg-primary/10 text-primary px-2.5 py-1 rounded-full uppercase">
                          {reg.eventId?.category || 'EVENT'}
                        </span>
                        <h3 className="font-extrabold text-slate-900 mt-2 text-base leading-snug">
                          {reg.eventId?.title || 'Registered Event'}
                        </h3>
                      </div>
                      <span
                        className={`text-xs font-extrabold px-3 py-1 rounded-full capitalize ${
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

                    <div className="text-xs text-slate-500 flex flex-col gap-1 border-t border-slate-100 pt-3">
                      <p>📍 Venue: <span className="font-semibold text-slate-700">{reg.eventId?.venue || 'Main Campus'}</span></p>
                      <p>📅 Date: <span className="font-semibold text-slate-700">{reg.eventId?.date ? formatDate(reg.eventId.date) : 'N/A'}</span></p>
                      <p>🕒 Time: <span className="font-semibold text-slate-700">{reg.eventId?.time || 'TBD'}</span></p>
                    </div>

                    <div className="flex gap-2 mt-auto">
                      {reg.status === 'registered' || reg.status === 'attended' ? (
                        <button
                          onClick={() => setSelectedQR(reg)}
                          className="flex-1 bg-slate-800 hover:bg-slate-900 text-white text-xs font-extrabold py-2.5 rounded-xl transition"
                        >
                          Show Entry Pass (QR)
                        </button>
                      ) : reg.status === 'pending_approval' ? (
                        <div className="flex-1 text-center text-xs text-amber-700 font-semibold py-2.5">
                          Awaiting Teacher Approval
                        </div>
                      ) : reg.status === 'rejected' ? (
                        <div className="flex-1 text-center text-xs text-rose-700 font-semibold py-2.5">
                          Registration Rejected
                        </div>
                      ) : null}
                      {isCertificateEligible(reg) && (
                        <button
                          onClick={() => handleGenerateCertificate(reg._id)}
                          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-extrabold py-2.5 rounded-xl transition"
                          title="Generate Certificate"
                        >
                          🎓 Certificate
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Panel 2: Certificates */}
        {activeTab === 'certificates' && (
          <div>
            <h2 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-4 mb-5">
              🎓 Merit & Participation Certificates
            </h2>
            {certificates.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <p className="text-4xl mb-3">📜</p>
                <p className="font-semibold text-sm">No certificates available yet. Attend events to unlock certificates!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {certificates.map((cert) => (
                  <div
                    key={cert._id}
                    className="border border-slate-200 bg-gradient-to-r from-slate-50 to-white rounded-2xl p-5 flex items-center justify-between shadow-sm hover:shadow-md transition"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-400">ISSUED {formatDate(cert.generatedAt)}</span>
                      <h3 className="font-extrabold text-slate-900 mt-1 leading-snug">{cert.eventId?.title}</h3>
                      <p className="text-xs text-primary font-bold mt-1 uppercase tracking-wider">{cert.eventId?.category}</p>
                    </div>
                    <button
                      onClick={() => setSelectedCert(cert)}
                      className="bg-primary hover:bg-blue-700 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl transition shrink-0"
                    >
                      View
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Panel 3: Notifications */}
        {activeTab === 'notifications' && (
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <h2 className="text-xl font-bold text-slate-800">
                🔔 Recent Notifications
              </h2>
              {notifications.some((n) => !n.isRead) && (
                <button
                  onClick={handleMarkNotificationsRead}
                  className="text-xs font-bold text-primary hover:text-blue-800 hover:underline"
                >
                  Mark all as read
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <p className="text-4xl mb-3">📭</p>
                <p className="font-semibold text-sm">Your inbox is currently empty.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {notifications.map((notif) => (
                  <div
                    key={notif._id}
                    className={`p-4 rounded-2xl border transition flex items-start gap-3 ${
                      notif.isRead
                        ? 'bg-slate-50/50 border-slate-100 text-slate-600'
                        : 'bg-blue-50/40 border-blue-100 text-slate-800 font-medium'
                    }`}
                  >
                    <span className="text-lg">
                      {notif.type === 'certificate_ready'
                        ? '📜'
                        : notif.type === 'registration_confirmed'
                        ? '🎟️'
                        : '🔔'}
                    </span>
                    <div className="flex-grow">
                      <p className="text-sm leading-relaxed">{notif.message}</p>
                      <span className="text-[10px] text-slate-400 font-semibold mt-1 block">
                        {formatDate(notif.createdAt)}
                      </span>
                    </div>
                    {!notif.isRead && (
                      <span className="w-2.5 h-2.5 bg-primary rounded-full shrink-0 mt-1"></span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Panel 4: Profile */}
        {activeTab === 'profile' && (
          <div>
            <h2 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-4 mb-5">
              👤 Personal Academic Profile
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-slate-400 uppercase">Full Name</span>
                <span className="text-base font-bold text-slate-800">{user.name}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-slate-400 uppercase">Roll Number</span>
                <span className="text-base font-bold text-slate-800 uppercase">{user.rollNumber || 'N/A'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-slate-400 uppercase">Email Address</span>
                <span className="text-base font-bold text-slate-800">{user.email}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-slate-400 uppercase">Mobile Number</span>
                <span className="text-base font-bold text-slate-800">{user.mobile || 'N/A'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-slate-400 uppercase">Academic Branch / Dept</span>
                <span className="text-base font-bold text-slate-800">{user.department}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-slate-400 uppercase">User Authorization Category</span>
                <span className="text-base font-bold text-slate-800 capitalize">{user.role}</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* QR MODAL TICKET */}
      {selectedQR && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-100 shadow-2xl flex flex-col items-center gap-5 relative">
            <button
              onClick={() => setSelectedQR(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-xl"
            >
              &times;
            </button>
            <div className="text-center">
              <h3 className="text-lg font-black text-slate-800 leading-snug">Event Admission Ticket</h3>
              <p className="text-xs text-slate-400 mt-1 font-semibold">{selectedQR.eventId?.title}</p>
            </div>
            
            {/* Mock QR Drawing layout */}
            <div className="w-52 h-52 bg-slate-50 border-4 border-slate-900 rounded-2xl flex flex-col items-center justify-center p-3 relative shadow-inner">
              <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center text-white rounded-lg">
                <span className="text-3xl mb-1">📱</span>
                <span className="text-[10px] font-black tracking-widest uppercase">SCAN QR CODE</span>
              </div>
            </div>
            
            <div className="text-center bg-slate-50 w-full py-2.5 rounded-xl border border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ticket Reference</p>
              <code className="text-xs font-black text-slate-700">{selectedQR.qrData}</code>
            </div>

            <div className="w-full text-xs text-slate-500 space-y-1 bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
              <p>👤 Holder: <span className="font-semibold text-slate-700">{user?.name}</span></p>
              <p>📍 Venue: <span className="font-semibold text-slate-700">{selectedQR.eventId?.venue || 'Main Campus'}</span></p>
              <p>📅 Schedule: <span className="font-semibold text-slate-700">{selectedQR.eventId?.date ? formatDate(selectedQR.eventId.date) : 'N/A'} @ {selectedQR.eventId?.time || 'TBD'}</span></p>
            </div>

            {selectedQR.eventId?.whatsappGroupLink && selectedQR.paymentStatus !== 'pending' && (
              <a
                href={selectedQR.eventId.whatsappGroupLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-extrabold py-2.5 rounded-xl transition flex items-center justify-center gap-2"
              >
                <span>💬</span>
                <span>Join WhatsApp Group</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* CERTIFICATE VIEWER MODAL */}
      {selectedCert && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full border border-slate-100 shadow-2xl relative">
            <button
              onClick={() => setSelectedCert(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-xl"
            >
              &times;
            </button>
            
            {/* Formal Certificate layout frame */}
            <div className="border-8 border-double border-amber-600 p-8 text-center bg-amber-50/10 rounded-2xl flex flex-col items-center gap-6 relative shadow-inner">
              <span className="text-4xl">📜</span>
              <h2 className="text-xs font-extrabold uppercase tracking-widest text-amber-800">
                Certificate of Attendance
              </h2>
              <p className="text-slate-500 italic text-sm">This certificate is proudly presented to</p>
              <h3 className="text-2xl font-black text-slate-900 underline decoration-amber-600 decoration-wavy py-1">
                {user.name}
              </h3>
              <p className="text-sm text-slate-600 max-w-md leading-relaxed">
                for active participation and completion of the university event{' '}
                <span className="font-extrabold text-slate-900">"{selectedCert.eventId?.title}"</span>{' '}
                conducted by the department of{' '}
                <span className="font-semibold">{selectedCert.eventId?.coordinatorId?.department || user.department}</span>.
              </p>
              <div className="w-full flex justify-between items-end border-t border-slate-200 pt-6 mt-4">
                <div className="text-left">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Verify ID</p>
                  <code className="text-xs font-semibold text-slate-700">{selectedCert._id}</code>
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
                className="bg-primary hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition"
              >
                Print Certificate
              </button>
              <button
                onClick={() => setSelectedCert(null)}
                className="bg-slate-200 hover:bg-slate-350 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
