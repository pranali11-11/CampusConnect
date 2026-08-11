import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/common/Sidebar';
import Loader from '../components/common/Loader';
import eventService from '../services/eventService';
import registrationService from '../services/registrationService';
import { formatDate } from '../utils/formatDate';
import { useToast } from '../hooks/useToast';

const EMPTY_FORM = {
  title: '', category: 'Technical', description: '', venue: '',
  date: '', time: '', maxParticipants: '', registrationDeadline: '', bannerUrl: '',
};

const TeacherDashboard = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('events');
  const [loading, setLoading] = useState(true);

  // Data state
  const [myEvents, setMyEvents] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');

  // Form & modal state
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [bannerPreview, setBannerPreview] = useState('');
  const [attendanceStateMap, setAttendanceStateMap] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Gallery upload state
  const [galleryEventId, setGalleryEventId] = useState('');
  const [galleryFile, setGalleryFile] = useState(null);
  const [galleryCategory, setGalleryCategory] = useState('');
  const [uploading, setUploading] = useState(false);

  const fetchMyEvents = useCallback(async () => {
    try {
      const res = await eventService.getTeacherEvents();
      if (res.success) setMyEvents(res.data);
    } catch {
      showToast('Failed to load your events.', 'error');
    }
  }, [showToast]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchMyEvents();
      try {
        const notifRes = await registrationService.getMyNotifications();
        if (notifRes.success) setNotifications(notifRes.data);
      } catch { /* silent */ }
      setLoading(false);
    };
    init();
  }, [fetchMyEvents]);

  // Fetch merged participants+attendance when event selected
  const fetchParticipants = async (eventId) => {
    if (!eventId) return;
    setLoadingParticipants(true);
    try {
      const attRes = await registrationService.getEventAttendance(eventId);
      if (attRes.success) {
        // The new endpoint returns merged data: registrationId, studentId, name, rollNumber, department, status
        setParticipants(attRes.data);
        setAttendance([]); // attendance state no longer needed separately
        setSearchTerm(''); // reset search when switching events
      }
    } catch {
      showToast('Could not load participant list.', 'error');
    } finally {
      setLoadingParticipants(false);
    }
  };

const handleEventSelect = (e) => {
    const id = e.target.value;
    setSelectedEventId(id);

    // Reset event-scoped state when switching events
    setParticipants([]);
    setAttendance([]);
    setAttendanceStateMap({});
    setSearchTerm('');

    if (id) fetchParticipants(id);
  };

  // Form handlers
  const openCreateForm = () => {
    setEditingEvent(null);
    setFormData(EMPTY_FORM);
    setShowForm(true);
  };

  const openEditForm = (event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      category: event.category,
      description: event.description,
      venue: event.venue,
      date: event.date?.split('T')[0] || '',
      time: event.time,
      maxParticipants: event.maxParticipants,
      registrationDeadline: event.registrationDeadline?.split('T')[0] || '',
      bannerUrl: event.bannerUrl || '',
    });
    setShowForm(true);
  };

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    const { name, value, files, type } = e.target;
    if (type === 'file' && files && files[0]) {
      const file = files[0];
      setFormData((f) => ({ ...f, bannerFile: file }));
      setBannerPreview(URL.createObjectURL(file));
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Build multipart form data for banner upload if present
      const payload = new FormData();
      Object.entries(formData).forEach(([k, v]) => {
        if (v !== undefined && v !== null) payload.append(k, v);
      });
      // If there's a banner file in state (attached as bannerFile), append it
      if (formData.bannerFile) {
        payload.append('banner', formData.bannerFile);
      }

      if (editingEvent) {
        await eventService.updateEvent(editingEvent._id, payload);
        showToast('Event updated successfully!', 'success');
      } else {
        await eventService.createEvent(payload);
        showToast('Event created and submitted for HOD approval!', 'success');
      }
      setShowForm(false);
      await fetchMyEvents();
    } catch (err) {
      showToast(err.response?.data?.error || 'Action failed.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Attendance selection toggles
  const toggleAttendance = (registrationId, status) => {
    setAttendanceStateMap((prev) => {
      const next = { ...prev };
      if (next[registrationId] === status) {
        delete next[registrationId]; // toggle off if same status clicked
      } else {
        next[registrationId] = status;
      }
      return next;
    });
  };

  const selectAllPresent = () => {
    const map = {};
    participants.forEach((p) => {
      map[p.registrationId] = 'present';
    });
    setAttendanceStateMap(map);
  };

  const saveBulkAttendance = async () => {
    // Merge existing status with changes from attendanceStateMap
    const changes = Object.entries(attendanceStateMap).map(([registrationId, status]) => ({ registrationId, status }));
    if (changes.length === 0) {
      showToast('No attendance changes to save', 'warning');
      return;
    }
    try {
      await registrationService.markAttendanceBulk(changes);
      showToast('Attendance saved successfully!', 'success');
      setAttendanceStateMap({});
      if (selectedEventId) fetchParticipants(selectedEventId);
    } catch (err) {
      showToast('Failed to save attendance', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    try {
      await eventService.deleteEvent(id);
      showToast('Event deleted.', 'success');
      await fetchMyEvents();
    } catch (err) {
      showToast(err.response?.data?.error || 'Delete failed.', 'error');
    }
  };

  // Gallery upload
  const handleGalleryUpload = async (e) => {
    e.preventDefault();
    if (!galleryFile || !galleryEventId) {
      showToast('Please select an event and a photo.', 'warning');
      return;
    }
    setUploading(true);
    try {
      await registrationService.uploadGallery(galleryEventId, galleryCategory, galleryFile);
      showToast('Photo uploaded to gallery!', 'success');
      setGalleryFile(null);
      setGalleryCategory('');
    } catch (err) {
      showToast(err.response?.data?.error || 'Upload failed.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const statusBadge = (status) => {
    const map = {
      pending: 'bg-amber-100 text-amber-800',
      approved: 'bg-emerald-100 text-emerald-800',
      hod_approved: 'bg-emerald-100 text-emerald-800',
      rejected: 'bg-rose-100 text-rose-800',
    };
    return map[status] || 'bg-slate-100 text-slate-700';
  };

  const tabs = [
    { id: 'events', label: 'My Events', icon: '📋' },
    { id: 'participants', label: 'Participants', icon: '👥' },
    { id: 'gallery', label: 'Upload Gallery', icon: '🖼️' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
  ];

  if (loading) return <Loader />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow flex flex-col md:flex-row gap-8">
      <Sidebar tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-grow bg-white border border-slate-100 rounded-2xl p-6 shadow-sm min-h-[500px]">

        {/* ── MY EVENTS ── */}
        {activeTab === 'events' && (
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <h2 className="text-xl font-bold text-slate-800">📋 My Events</h2>
              <button
                onClick={openCreateForm}
                className="bg-primary hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-md shadow-blue-200"
              >
                + Create New Event
              </button>
            </div>

            {myEvents.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <p className="text-4xl mb-3">📝</p>
                <p className="font-semibold text-sm">No events created yet. Start by clicking "Create New Event".</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {myEvents.map((event) => (
                  <div key={event._id} className="border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-sm transition bg-slate-50/50">
                    <div className="flex-grow">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-xs font-black bg-primary/10 text-primary px-2.5 py-1 rounded-full">{event.category}</span>
                        <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full capitalize ${statusBadge(event.status)}`}>{event.status.replace('_', ' ')}</span>
                      </div>
                      <h3 className="font-extrabold text-slate-900 text-base">{event.title}</h3>
                      <p className="text-xs text-slate-500 mt-1">📍 {event.venue} &nbsp;|&nbsp; 📅 {formatDate(event.date)} &nbsp;|&nbsp; 👥 Max: {event.maxParticipants}</p>
                      {event.status === 'rejected' && event.rejectionReason && (
                        <p className="text-xs text-rose-600 mt-1.5 font-semibold bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100">
                          ❌ Rejection reason: {event.rejectionReason}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => openEditForm(event)} className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl transition">Edit</button>
                      <button onClick={() => handleDelete(event._id)} className="bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-bold px-3 py-2 rounded-xl transition">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── PARTICIPANTS & ATTENDANCE ── */}
        {activeTab === 'participants' && (
          <div>
            <h2 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-4 mb-5">👥 Participants & Attendance</h2>

            {/* Event selector */}
            <div className="mb-5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Select Event</label>
              <select
                value={selectedEventId}
                onChange={handleEventSelect}
                className="w-full md:w-80 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm bg-white"
              >
                <option value="">— Pick an event —</option>
                {myEvents.filter((e) => e.status === 'approved' || e.status === 'hod_approved').map((e) => (
                  <option key={e._id} value={e._id}>{e.title}</option>
                ))}
              </select>
            </div>

            {/* Loading skeleton */}
            {loadingParticipants && (
              <div className="animate-pulse flex flex-col gap-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-4 border border-slate-100 rounded-xl">
                    <div className="w-8 h-4 bg-slate-200 rounded"></div>
                    <div className="flex-1 h-4 bg-slate-200 rounded"></div>
                    <div className="w-20 h-4 bg-slate-200 rounded"></div>
                    <div className="w-24 h-4 bg-slate-200 rounded"></div>
                    <div className="w-32 h-8 bg-slate-200 rounded-lg"></div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty states */}
            {!loadingParticipants && participants.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <p className="text-4xl mb-3">👤</p>
                <p className="text-sm font-semibold">
                  {selectedEventId
                    ? 'No registrations yet for this event.'
                    : 'Select an event to see participants.'}
                </p>
              </div>
            )}

            {/* Attendance table */}
            {!loadingParticipants && participants.length > 0 && (
              <>
                {/* Toolbar: Search + Select All + Save */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
                  <div className="relative flex-grow max-w-xs">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by name or roll no..."
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAllPresent}
                      className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-bold px-3 py-2.5 rounded-xl transition"
                    >
                      ✅ Select All Present
                    </button>
                    <button
                      onClick={saveBulkAttendance}
                      className="bg-primary hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-md shadow-blue-200"
                    >
                      💾 Save Attendance
                    </button>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-xs font-black text-slate-500 uppercase w-10">#</th>
                        <th className="px-4 py-3 text-xs font-black text-slate-500 uppercase">Student Name</th>
                        <th className="px-4 py-3 text-xs font-black text-slate-500 uppercase">Roll No</th>
                        <th className="px-4 py-3 text-xs font-black text-slate-500 uppercase">Department</th>
                        <th className="px-4 py-3 text-xs font-black text-slate-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {participants
                        .filter((p) => {
                          if (!searchTerm.trim()) return true;
                          const q = searchTerm.toLowerCase();
                          return (
                            p.name?.toLowerCase().includes(q) ||
                            p.rollNumber?.toLowerCase().includes(q)
                          );
                        })
                        .map((p, idx) => {
                          const pendingStatus = attendanceStateMap[p.registrationId];
                          const displayStatus = pendingStatus || p.status;
                          const isPendingPresent = pendingStatus === 'present';
                          const isPendingAbsent = pendingStatus === 'absent';
                          const isCurrentPresent = p.status === 'present';
                          const isCurrentAbsent = p.status === 'absent';

                          return (
                            <tr
                              key={p.registrationId}
                              className={`transition ${
                                isPendingPresent
                                  ? 'bg-emerald-50/70 border-l-4 border-l-emerald-500'
                                  : isPendingAbsent
                                  ? 'bg-rose-50/70 border-l-4 border-l-rose-500'
                                  : 'hover:bg-slate-50/60'
                              }`}
                            >
                              <td className="px-4 py-3 text-slate-400 text-xs font-mono">{idx + 1}</td>
                              <td className="px-4 py-3 font-semibold text-slate-800">{p.name}</td>
                              <td className="px-4 py-3 text-slate-600 font-mono text-xs uppercase">{p.rollNumber}</td>
                              <td className="px-4 py-3 text-slate-600">{p.department}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  {/* Present button */}
                                  <button
                                    onClick={() => toggleAttendance(p.registrationId, 'present')}
                                    className={`text-xs font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
                                      isPendingPresent
                                        ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-300 ring-2 ring-emerald-300'
                                        : isCurrentPresent
                                        ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300/50'
                                        : 'bg-slate-100 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700'
                                    }`}
                                  >
                                    ✅ Present
                                  </button>
                                  {/* Absent button */}
                                  <button
                                    onClick={() => toggleAttendance(p.registrationId, 'absent')}
                                    className={`text-xs font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
                                      isPendingAbsent
                                        ? 'bg-rose-500 text-white shadow-sm shadow-rose-300 ring-2 ring-rose-300'
                                        : isCurrentAbsent
                                        ? 'bg-rose-100 text-rose-800 ring-1 ring-rose-300/50'
                                        : 'bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-700'
                                    }`}
                                  >
                                    ❌ Absent
                                  </button>
                                  {/* Not marked badge */}
                                  {displayStatus === 'not_marked' && !pendingStatus && (
                                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                                      Not marked
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>

                {/* Summary bar */}
                <div className="mt-4 flex flex-wrap items-center gap-4 px-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Total: <span className="text-slate-900">{participants.length}</span>
                  </span>
                  <span className="text-sm font-semibold text-emerald-700">
                    ✅ Present:{' '}
                    <span className="text-emerald-900">
                      {participants.filter((p) => {
                        const ps = attendanceStateMap[p.registrationId] || p.status;
                        return ps === 'present';
                      }).length}
                    </span>
                  </span>
                  <span className="text-sm font-semibold text-rose-700">
                    ❌ Absent:{' '}
                    <span className="text-rose-900">
                      {participants.filter((p) => {
                        const ps = attendanceStateMap[p.registrationId] || p.status;
                        return ps === 'absent';
                      }).length}
                    </span>
                  </span>
                  <span className="text-sm font-semibold text-slate-500">
                    ⬜ Not Marked:{' '}
                    <span className="text-slate-600">
                      {participants.filter((p) => {
                        const ps = attendanceStateMap[p.registrationId] || p.status;
                        return ps === 'not_marked';
                      }).length}
                    </span>
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── GALLERY UPLOAD ── */}
        {activeTab === 'gallery' && (
          <div>
            <h2 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-4 mb-6">🖼️ Upload Event Photos</h2>
            <form onSubmit={handleGalleryUpload} className="max-w-lg flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Event</label>
                <select
                  value={galleryEventId}
                  onChange={(e) => setGalleryEventId(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm bg-white"
                >
                  <option value="">— Pick an event —</option>
                  {myEvents.map((e) => (
                    <option key={e._id} value={e._id}>{e.title}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Category / Label</label>
                <input
                  type="text"
                  value={galleryCategory}
                  onChange={(e) => setGalleryCategory(e.target.value)}
                  placeholder="e.g. Highlights, Prize Distribution"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Photo File</label>
                <div className="border-2 border-dashed border-slate-200 hover:border-primary rounded-2xl p-6 text-center cursor-pointer transition">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setGalleryFile(e.target.files[0])}
                    className="hidden"
                    id="gallery-file"
                  />
                  <label htmlFor="gallery-file" className="cursor-pointer flex flex-col items-center gap-2">
                    <span className="text-3xl">{galleryFile ? '🖼️' : '📤'}</span>
                    <span className="text-sm font-semibold text-slate-600">
                      {galleryFile ? galleryFile.name : 'Click to select image (JPG, PNG, WEBP)'}
                    </span>
                    <span className="text-xs text-slate-400">Max 10MB</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={uploading}
                className="bg-primary hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition shadow-md shadow-blue-200 disabled:opacity-50"
              >
                {uploading ? 'Uploading to Cloud...' : 'Upload Photo'}
              </button>
            </form>
          </div>
        )}

        {/* ── NOTIFICATIONS ── */}
        {activeTab === 'notifications' && (
          <div>
            <h2 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-4 mb-5">🔔 Notifications</h2>
            {notifications.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <p className="text-4xl mb-3">📭</p>
                <p className="text-sm font-semibold">No notifications yet.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {notifications.map((n) => (
                  <div key={n._id} className={`p-4 rounded-2xl border flex items-start gap-3 ${n.isRead ? 'bg-slate-50 border-slate-100 text-slate-500' : 'bg-blue-50/40 border-blue-100 text-slate-800 font-medium'}`}>
                    <span className="text-lg">{n.type === 'event_approved' ? '✅' : '🔔'}</span>
                    <div>
                      <p className="text-sm leading-relaxed">{n.message}</p>
                      <span className="text-[10px] text-slate-400 font-semibold mt-1 block">{formatDate(n.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── CREATE / EDIT EVENT MODAL ── */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full border border-slate-100 shadow-2xl my-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-800">{editingEvent ? '✏️ Edit Event' : '✨ Create New Event'}</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 text-2xl font-bold">&times;</button>
            </div>

            <form onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2 flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Event Title</label>
                <input name="title" value={formData.title} onChange={handleFormChange} required placeholder="e.g. National Hackathon 2026" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm" />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Category</label>
                <select name="category" value={formData.category} onChange={handleFormChange} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm bg-white">
                  {['Technical', 'Cultural', 'Sports', 'Workshop'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Venue</label>
                <input name="venue" value={formData.venue} onChange={handleFormChange} required placeholder="e.g. Main Auditorium" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm" />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Event Date</label>
                <input type="date" name="date" value={formData.date} onChange={handleFormChange} required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm" />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Event Time</label>
                <input type="time" name="time" value={formData.time} onChange={handleFormChange} required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm" />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Max Participants</label>
                <input type="number" name="maxParticipants" value={formData.maxParticipants} onChange={handleFormChange} required min="1" placeholder="e.g. 100" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm" />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Registration Deadline</label>
                <input type="date" name="registrationDeadline" value={formData.registrationDeadline} onChange={handleFormChange} required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm" />
              </div>

              <div className="md:col-span-2 flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Banner Image (optional)</label>
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 flex flex-col items-center gap-3">
                  {bannerPreview ? (
                    <img src={bannerPreview} alt="preview" className="w-48 h-28 object-cover rounded-md" />
                  ) : (
                    <div className="text-sm text-slate-500">Drag & drop or click to select an image</div>
                  )}
                  <input type="file" name="banner" accept="image/*" onChange={handleFormChange} className="hidden" id="banner-file" />
                  <label htmlFor="banner-file" className="cursor-pointer text-xs font-semibold text-primary">Choose banner image</label>
                  <input name="bannerUrl" value={formData.bannerUrl} onChange={handleFormChange} placeholder="Or paste image URL (optional)" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm" />
                </div>
              </div>

              <div className="md:col-span-2 flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Description</label>
                <textarea name="description" value={formData.description} onChange={handleFormChange} required rows={4} placeholder="Provide detailed information about the event..." className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm resize-none" />
              </div>

              <div className="md:col-span-2 flex justify-end gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-5 py-3 rounded-xl transition text-sm">Cancel</button>
                <button type="submit" disabled={submitting} className="bg-primary hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl transition shadow-md shadow-blue-200 disabled:opacity-50 text-sm">
                  {submitting ? 'Saving...' : editingEvent ? 'Update Event' : 'Submit for HOD Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;
