import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';



import Loader from '../components/common/Loader';
import { useToast } from '../hooks/useToast';
import useAuth from '../hooks/useAuth';
import eventService from '../services/eventService';
import registrationService from '../services/registrationService';
import { formatDate } from '../utils/formatDate';

const EventDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [registrationCount, setRegistrationCount] = useState(0);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [registrationData, setRegistrationData] = useState(null);
  const [countdown, setCountdown] = useState('');
  const [relatedEvents, setRelatedEvents] = useState([]);
  const qrRef = useRef();

  // Sample data for schedule, speakers
  const scheduleItems = [
    { time: '9:00 AM', activity: 'Registration & Breakfast' },
    { time: '9:30 AM', activity: 'Opening Ceremony' },
    { time: '10:00 AM', activity: 'Keynote Address' },
    { time: '11:00 AM', activity: 'Breakout Sessions' },
    { time: '1:00 PM', activity: 'Lunch Break' },
  ];

  const speakers = [
    { name: 'Dr. Sarah Johnson', designation: 'Tech Lead at TechCorp', bio: 'Expert in cloud architecture' },
    { name: 'Mr. Rajesh Kumar', designation: 'Senior Developer', bio: 'Full-stack development specialist' },
    { name: 'Ms. Priya Sharma', designation: 'Product Manager', bio: 'Product strategy innovator' },
  ];

  // Fetch event details
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await eventService.getEventById(id);
        if (res.success) {
          setEvent(res.data);
          // Fetch registration count
          try {
            const regRes = await eventService.getEventRegistrations(id);
            if (regRes.success) {
              setRegistrationCount(regRes.data.count || 0);
              // Check if user is registered
              if (user && regRes.data.registrations?.some(r => String(r.studentId?._id || r.studentId) === String(user.id))) {
                setIsRegistered(true);
              }
            }

          } catch (err) {
            console.error('Failed to fetch registration count:', err);
          }

          // Fetch related events
          try {
            const relatedRes = await eventService.getEventsByCategory(res.data.category, 3);
            if (relatedRes.success) {
              setRelatedEvents(relatedRes.data.filter(e => e._id !== id));
            }
          } catch (err) {
            console.error('Failed to fetch related events:', err);
          }
        }
      } catch (err) {
        showToast('Failed to load event details', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [id, user, showToast]);

  // Countdown timer
  useEffect(() => {
    if (!event?.date) return;

    const updateCountdown = () => {
      const eventTime = new Date(event.date).getTime();
      const now = new Date().getTime();
      const diff = eventTime - now;

      if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setCountdown(`${days}d ${hours}h ${minutes}m`);
      } else {
        setCountdown('Event Started');
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [event?.date]);

  const handleRegister = async () => {
    if (!user) {
      showToast('Please log in to register', 'warning');
      navigate('/login');
      return;
    }

    if (isRegistered) {
      showToast('You are already registered for this event', 'info');
      return;
    }

    setRegistering(true);
    try {
      const res = await registrationService.registerForEvent(id);
      if (res.success) {
        setRegistrationData(res.data);
        setShowQRModal(true);
        setIsRegistered(true);
        setRegistrationCount(prev => prev + 1);
        showToast('Successfully registered!', 'success');
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Registration failed', 'error');
    } finally {
      setRegistering(false);
    }
  };

  const downloadQR = () => {
    if (qrRef.current) {
      const canvas = qrRef.current.querySelector('canvas');
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = url;
      link.download = `registration-${registrationData._id}.png`;
      link.click();
    }
  };

  const shareEvent = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      showToast('Link copied to clipboard!', 'success');
    });
  };

  const shareWhatsApp = () => {
    const text = `Check out this event: ${event?.title}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text + ' ' + window.location.href)}`;
    window.open(url, '_blank');
  };

  if (loading) return <Loader />;
  if (!event) return <div className="text-center py-12">Event not found</div>;

  const seatsRemaining = event.maxParticipants - registrationCount;
  const seatsColor =
    seatsRemaining > 20 ? 'text-green-600' : seatsRemaining >= 5 ? 'text-yellow-500' : 'text-red-500';

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📋' },
    { id: 'schedule', label: 'Schedule', icon: '🕐' },
    { id: 'speakers', label: 'Speakers', icon: '🎤' },
    { id: 'gallery', label: 'Gallery', icon: '🖼️' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Hero Banner */}
      <div
        className="relative h-72 bg-cover bg-center"
        style={{
          backgroundImage: event.bannerUrl
            ? `url(${event.bannerUrl})`
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60"></div>
        <div className="absolute bottom-6 left-6 text-white">
          <h1 className="text-4xl font-bold mb-2">{event.title}</h1>
          <span className="inline-block px-3 py-1 bg-blue-500 rounded-full text-sm font-semibold">
            {event.category || 'Event'}
          </span>
        </div>
      </div>

      {/* Info Bar */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📅</span>
            <div>
              <p className="text-xs text-slate-500">Date</p>
              <p className="font-semibold">{formatDate(event.date)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🕐</span>
            <div>
              <p className="text-xs text-slate-500">Time</p>
              <p className="font-semibold">{event.time || '9:00 AM'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">📍</span>
            <div>
              <p className="text-xs text-slate-500">Venue</p>
              <p className="font-semibold text-sm">{event.venue || 'TBD'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🪑</span>
            <div>
              <p className="text-xs text-slate-500">Seats Available</p>
              <p className={`font-semibold ${seatsColor}`}>{seatsRemaining} / {event.maxParticipants}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Tab Navigation */}
          <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 mb-8 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 font-semibold whitespace-nowrap transition border-b-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-8">
            {activeTab === 'overview' && (
              <div>
                <h2 className="text-2xl font-bold mb-4">About this Event</h2>
                <p className="text-slate-700 dark:text-slate-300 mb-6 leading-relaxed">
                  {event.description || 'No description available'}
                </p>
                {event.tags && event.tags.length > 0 && (
                  <div className="mb-8">
                    <h3 className="font-semibold mb-3">Tags:</h3>
                    <div className="flex flex-wrap gap-2">
                      {event.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {event.createdBy && (
                  <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-6">
                    <h3 className="font-semibold mb-3">Organized By</h3>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                        {event.createdBy.name?.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">{event.createdBy.name}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{event.createdBy.department}</p>
                      </div>
                      <a
                        href={`mailto:${event.createdBy.email}`}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition"
                      >
                        Contact
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'schedule' && (
              <div>
                <h2 className="text-2xl font-bold mb-6">Event Schedule</h2>
                <div className="relative">
                  <div className="absolute left-6 top-0 bottom-0 w-1 bg-blue-500"></div>
                  <div className="space-y-6 pl-20">
                    {scheduleItems.map((item, i) => (
                      <div key={i} className="relative">
                        <div className="absolute -left-[3.25rem] top-1 w-4 h-4 bg-blue-500 rounded-full border-4 border-white dark:border-slate-800"></div>
                        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                          <p className="font-semibold text-blue-600 dark:text-blue-400">{item.time}</p>
                          <p className="text-slate-700 dark:text-slate-300">{item.activity}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'speakers' && (
              <div>
                <h2 className="text-2xl font-bold mb-6">Meet the Speakers</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {speakers.map((speaker, i) => (
                    <div key={i} className="bg-slate-50 dark:bg-slate-700 rounded-xl overflow-hidden hover:shadow-lg transition">
                      <div className="w-full h-48 bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-4xl">
                        🎤
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-lg mb-1">{speaker.name}</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{speaker.designation}</p>
                        <p className="text-sm text-slate-700 dark:text-slate-300">{speaker.bio}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'gallery' && (
              <div>
                <h2 className="text-2xl font-bold mb-6">Event Gallery</h2>
                <div className="flex gap-4 overflow-x-auto pb-4">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="flex-shrink-0 w-48 h-32 bg-gradient-to-br from-pink-400 to-purple-400 rounded-lg cursor-pointer hover:shadow-lg transition"
                    >
                      📸
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Related Events */}
          {relatedEvents.length > 0 && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold mb-6">Similar Events</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedEvents.map(rel => (
                  <div
                    key={rel._id}
                    className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition cursor-pointer"
                    onClick={() => navigate(`/events/${rel._id}`)}
                  >
                    <div className="h-32 bg-gradient-to-br from-blue-400 to-purple-400"></div>
                    <div className="p-4">
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1">{rel.category}</p>
                      <h3 className="font-bold mb-2 line-clamp-2">{rel.title}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">📅 {formatDate(rel.date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sticky Sidebar */}
        <div className="lg:sticky lg:top-32 h-fit">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 space-y-6">
            {/* Event Details Card */}
            <div>
              <h3 className="font-bold text-lg mb-4">{event.title}</h3>
              <div className="space-y-3 text-sm mb-4">
<div className="flex items-center gap-2">
                  <span>📅</span>
                  <span>{formatDate(event.date)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>📍</span>
                  <span>{event.venue || 'TBD'}</span>
                </div>
                {event.registrationDeadline && (
                  <div className="flex items-center gap-2">
                    <span>⏰</span>
                    <span>Register by: {formatDate(event.registrationDeadline)}</span>
                  </div>
                )}
              </div>

              {/* Seats Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-2">
                  <span>Registered</span>
                  <span>{registrationCount} / {event.maxParticipants}</span>
                </div>
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{ width: `${(registrationCount / event.maxParticipants) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Countdown */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-slate-700 dark:to-slate-600 rounded-lg p-4 text-center mb-4">
                <p className="text-xs text-slate-600 dark:text-slate-300 mb-1">Starts In</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{countdown}</p>
              </div>
            </div>

            {/* Register Button */}
            <button
              onClick={handleRegister}
              disabled={isRegistered || registering || seatsRemaining === 0}
              className={`w-full py-3 rounded-lg font-semibold transition ${
                isRegistered
                  ? 'bg-slate-300 dark:bg-slate-700 text-slate-600 cursor-not-allowed'
                  : seatsRemaining === 0
                    ? 'bg-slate-300 dark:bg-slate-700 text-slate-600 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {registering ? 'Registering...' : isRegistered ? '✓ Already Registered' : seatsRemaining === 0 ? 'Seats Full' : 'Register Now'}
            </button>

            {/* Share Buttons */}
            <div className="flex gap-2">
              <button
                onClick={shareEvent}
                className="flex-1 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition text-sm font-semibold"
              >
                📋 Copy Link
              </button>
              <button
                onClick={shareWhatsApp}
                className="flex-1 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition text-sm font-semibold"
              >
                💬 WhatsApp
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* QR Modal */}
      {showQRModal && registrationData && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-8 max-w-sm w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Registration Successful! 🎉</h2>
              <button
                onClick={() => setShowQRModal(false)}
                className="text-2xl hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="text-center mb-6">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Your QR Code</p>
              <div ref={qrRef} className="flex justify-center">
                <QRCodeCanvas

                  value={JSON.stringify({
                    registrationId: registrationData._id,
                    studentId: user?.id,
                    eventId: event._id,
                  })}
                  size={200}
                  level="H"
                  includeMargin
                />
              </div>
            </div>

            <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-4 mb-6 text-sm">
              <p className="text-slate-600 dark:text-slate-300 mb-1">
                <strong>Name:</strong> {user?.name}
              </p>
              <p className="text-slate-600 dark:text-slate-300">
                <strong>Event:</strong> {event.title}
              </p>
            </div>

            <button
              onClick={downloadQR}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition"
            >
              📥 Download QR Code
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventDetailsPage;

