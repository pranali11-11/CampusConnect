import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "../components/common/Sidebar";
import Loader from "../components/common/Loader";
import eventService from "../services/eventService";
import registrationService from "../services/registrationService";
import { formatDate } from "../utils/formatDate";
import { useToast } from "../hooks/useToast";

const EMPTY_FORM = {
  title: "",
  category: "Technical",
  description: "",
  venue: "",
  date: "",
  time: "",
  maxParticipants: "",
  registrationDeadline: "",
  registrationFee: "",
  paymentNumber: "",
  whatsappGroupLink: "",
  certificateTemplate: "",
  registrationBannerUrl: "",
  registrationType: "individual",
  minTeamSize: "2",
  maxTeamSize: "4",
};

const TeacherDashboard = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState("events");
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Data state
  const [myEvents, setMyEvents] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");

  // Form & modal state
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [registrationBannerPreview, setRegistrationBannerPreview] =
    useState("");
  const [paymentStatusMap, setPaymentStatusMap] = useState({});
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [galleryImageCategory, setGalleryImageCategory] = useState("");
  const [attendanceStateMap, setAttendanceStateMap] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Gallery upload state
  const [galleryEventId, setGalleryEventId] = useState("");
  const [galleryFile, setGalleryFile] = useState(null);
  const [galleryCategory, setGalleryCategory] = useState("");
  const [uploading, setUploading] = useState(false);
  const [myGallery, setMyGallery] = useState([]);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [certificateTemplateFile, setCertificateTemplateFile] = useState(null);
  const [certificateTemplatePreview, setCertificateTemplatePreview] =
    useState("");

  const fetchMyEvents = useCallback(async () => {
    try {
      const res = await eventService.getTeacherEvents();
      if (res.success) setMyEvents(res.data);
    } catch {
      showToast("Failed to load your events.", "error");
    }
  }, [showToast]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchMyEvents();
      try {
        const notifRes = await registrationService.getMyNotifications();
        if (notifRes.success) setNotifications(notifRes.data);
      } catch {
        /* silent */
      }
      try {
        const galleryRes = await registrationService.getMyGallery();
        if (galleryRes.success) setMyGallery(galleryRes.data);
      } catch {
        /* silent */
      }
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
        setSearchTerm(""); // reset search when switching events
      }
    } catch {
      showToast("Could not load participant list.", "error");
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
    setSearchTerm("");

    if (id) fetchParticipants(id);
  };

  // Form handlers
  const closeForm = () => {
    setShowForm(false);
    setEditingEvent(null);
    setFormData(EMPTY_FORM);
    setRegistrationBannerPreview("");
    setCertificateTemplateFile(null);
    setCertificateTemplatePreview("");
    setGalleryFiles([]);
    setGalleryImageCategory("");
  };

  const openCreateForm = () => {
    closeForm();
    setFormData({ ...EMPTY_FORM });
    setShowForm(true);
  };

  const openEditForm = (event) => {
    closeForm();
    setEditingEvent(event);
    setFormData({
      title: event.title,
      category: event.category,
      description: event.description,
      venue: event.venue,
      date: event.date?.split("T")[0] || "",
      time: event.time,
      maxParticipants: event.maxParticipants,
      registrationDeadline: event.registrationDeadline?.split("T")[0] || "",
      registrationFee: event.registrationFee || "",
      paymentNumber: event.paymentNumber || "",
      whatsappGroupLink: event.whatsappGroupLink || "",
      certificateTemplate: event.certificateTemplate || "",
      registrationBannerUrl:
        event.registrationBannerUrl || event.bannerUrl || "",
      registrationType: event.registrationType || "individual",
      minTeamSize: event.minTeamSize || "2",
      maxTeamSize: event.maxTeamSize || "4",
    });
    setShowForm(true);
  };

  const handleFormChange = (e) => {
    const { name, value, files, type } = e.target;
    if (type === "file" && files && files[0]) {
      const file = files[0];
      if (name === "registrationBanner") {
        setFormData((prev) => ({ ...prev, registrationBannerFile: file }));
        setRegistrationBannerPreview(URL.createObjectURL(file));
      } else if (name === "certificateTemplate") {
        setCertificateTemplateFile(file);
        setCertificateTemplatePreview(URL.createObjectURL(file));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const normalizedFormData = { ...formData };
      if (normalizedFormData.registrationType !== "team") {
        normalizedFormData.minTeamSize = "";
        normalizedFormData.maxTeamSize = "";
      }

      const payload = new FormData();
      Object.entries(normalizedFormData).forEach(([k, v]) => {
        if (
          k !== "registrationBannerFile" &&
          k !== "bannerFile" &&
          k !== "banner" &&
          v !== undefined &&
          v !== null &&
          v !== ""
        ) {
          payload.append(k, v);
        }
      });

      // Append banner file under key 'registrationBanner'
      if (formData.registrationBannerFile) {
        payload.append("registrationBanner", formData.registrationBannerFile);
      }

      // Append certificate template file under key 'certificateTemplate'
      if (certificateTemplateFile) {
        payload.append("certificateTemplate", certificateTemplateFile);
      }

      const actionResult = editingEvent
        ? await eventService.updateEvent(editingEvent._id, payload)
        : await eventService.createEvent(payload);

      if (galleryFiles.length > 0) {
        const eventId = editingEvent ? editingEvent._id : actionResult.data._id;
        const uploadCategory =
          galleryImageCategory || formData.category || "Gallery";

        await Promise.all(
          galleryFiles.map((file) =>
            registrationService.uploadGallery(eventId, uploadCategory, file),
          ),
        );
      }

      showToast(
        editingEvent
          ? "Event updated successfully!"
          : "Event created and submitted for HOD approval!",
        "success",
      );
      setShowForm(false);
      await fetchMyEvents();
    } catch (err) {
      showToast(err.response?.data?.error || "Action failed.", "error");
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

  const isCertificateEligible = (registration) => {
    // Must be attended
    if (registration.status !== "attended") return false;

    // Event must have ended
    const eventDate = new Date(registration.eventId?.date);
    const now = new Date();
    if (eventDate > now) return false;

    return true;
  };

  const handleApproveRegistration = async (registrationId) => {
    try {
      const response =
        await registrationService.approveRegistration(registrationId);
      if (response.success) {
        showToast("Registration approved successfully!", "success");
        await fetchParticipants(selectedEventId);
      }
    } catch (error) {
      console.error("Approval error:", error);
      showToast(
        error.response?.data?.error || "Failed to approve registration",
        "error",
      );
    }
  };

  const handleRejectRegistration = async (registrationId) => {
    if (!confirm("Are you sure you want to reject this registration?")) return;

    try {
      const response =
        await registrationService.rejectRegistration(registrationId);
      if (response.success) {
        showToast("Registration rejected.", "success");
        await fetchParticipants(selectedEventId);
      }
    } catch (error) {
      console.error("Rejection error:", error);
      showToast(
        error.response?.data?.error || "Failed to reject registration",
        "error",
      );
    }
  };

  const selectAllPresent = () => {
    const map = {};
    participants.forEach((p) => {
      map[p.participantKey] = "present";
    });
    setAttendanceStateMap(map);
  };

  const saveBulkAttendance = async () => {
    const changes = Object.entries(attendanceStateMap).map(
      ([participantKey, status]) => {
        const participant = participants.find(
          (item) => item.participantKey === participantKey,
        );
        return {
          registrationId: participant.registrationId,
          studentId: participant.studentId,
          status,
        };
      },
    );
    if (changes.length === 0) {
      showToast("No attendance changes to save", "warning");
      return;
    }
    try {
      await registrationService.markAttendanceBulk(changes);
      showToast("Attendance saved successfully!", "success");
      setAttendanceStateMap({});
      if (selectedEventId) fetchParticipants(selectedEventId);
    } catch (err) {
      showToast("Failed to save attendance", "error");
    }
  };

  const handlePaymentStatusUpdate = async (registrationId, paymentStatus) => {
    try {
      await registrationService.updatePaymentStatus(
        registrationId,
        paymentStatus,
      );
      setPaymentStatusMap((prev) => ({
        ...prev,
        [registrationId]: paymentStatus,
      }));
      showToast("Payment status updated.", "success");
      if (selectedEventId) fetchParticipants(selectedEventId);
    } catch (err) {
      showToast(
        err.response?.data?.error || "Payment status update failed.",
        "error",
      );
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this event?")) return;
    try {
      await eventService.deleteEvent(id);
      showToast("Event deleted.", "success");
      await fetchMyEvents();
    } catch (err) {
      showToast(err.response?.data?.error || "Delete failed.", "error");
    }
  };

  // Gallery upload
  const handleGalleryUpload = async (e) => {
    e.preventDefault();
    if (!galleryEventId || !galleryFile) {
      showToast("Please select an event and an image file.", "warning");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("eventId", galleryEventId);
      formData.append("category", galleryCategory);
      formData.append("image", galleryFile);

      const res = await registrationService.uploadGallery(
        galleryEventId,
        galleryCategory,
        galleryFile,
      );
      if (res.success) {
        showToast("Photo uploaded successfully!", "success");
        setGalleryEventId("");
        setGalleryFile(null);
        setGalleryCategory("");
        // Refresh gallery
        const galleryRes = await registrationService.getMyGallery();
        if (galleryRes.success) setMyGallery(galleryRes.data);
      }
    } catch (err) {
      console.error("Gallery upload error:", err);
      const errorMsg =
        err.response?.data?.error ||
        err.message ||
        "Upload failed. Please try again.";
      showToast(errorMsg, "error");
    } finally {
      setUploading(false);
    }
  };

  const handleGalleryDelete = async (galleryId) => {
    if (!confirm("Are you sure you want to delete this image?")) return;

    try {
      const res = await registrationService.deleteGalleryItem(galleryId);
      if (res.success) {
        showToast("Image deleted successfully!", "success");
        setMyGallery((prev) => prev.filter((item) => item._id !== galleryId));
      }
    } catch (err) {
      showToast(err.response?.data?.error || "Delete failed", "error");
    }
  };

  const statusBadge = (status) => {
    const map = {
      pending: "bg-amber-100 text-amber-800",
      approved: "bg-emerald-100 text-emerald-800",
      hod_approved: "bg-emerald-100 text-emerald-800",
      rejected: "bg-rose-100 text-rose-800",
    };
    return map[status] || "bg-slate-100 text-slate-700";
  };

  const tabs = [
    { id: "events", label: "My Events", icon: "📋" },
    { id: "participants", label: "Participants", icon: "👥" },
    { id: "gallery", label: "Upload Gallery", icon: "🖼️" },
    { id: "notifications", label: "Notifications", icon: "🔔" },
  ];

  if (loading) return <Loader />;

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col md:flex-row w-full font-sans antialiased text-slate-800">
      <Sidebar
        tabs={tabs}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
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
                <span className="text-primary capitalize">Faculty Portal</span>
                <span>/</span>
                <span className="text-slate-600 truncate">{tabs.find((t) => t.id === activeTab)?.label}</span>
              </div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight truncate">
                {tabs.find((t) => t.id === activeTab)?.label}
              </h1>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm min-h-[500px]">
        {/* ── MY EVENTS ── */}
        {activeTab === "events" && (
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
                <p className="font-semibold text-sm">
                  No events created yet. Start by clicking "Create New Event".
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {myEvents.map((event) => (
                  <div
                    key={event._id}
                    className="border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-sm transition bg-slate-50/50"
                  >
                    <div className="flex-grow">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-xs font-black bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                          {event.category}
                        </span>
                        <span
                          className={`text-xs font-extrabold px-2.5 py-1 rounded-full capitalize ${statusBadge(event.status)}`}
                        >
                          {event.status.replace("_", " ")}
                        </span>
                      </div>
                      <h3 className="font-extrabold text-slate-900 text-base">
                        {event.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        📍 {event.venue} &nbsp;|&nbsp; 📅{" "}
                        {formatDate(event.date)} &nbsp;|&nbsp; 👥 Max:{" "}
                        {event.maxParticipants}
                      </p>
                      {event.status === "rejected" && event.rejectionReason && (
                        <p className="text-xs text-rose-600 mt-1.5 font-semibold bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100">
                          ❌ Rejection reason: {event.rejectionReason}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => openEditForm(event)}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(event._id)}
                        className="bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-bold px-3 py-2 rounded-xl transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── PARTICIPANTS & ATTENDANCE ── */}
        {activeTab === "participants" && (
          <div>
            <h2 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-4 mb-5">
              👥 Participants & Attendance
            </h2>

            {/* Event selector */}
            <div className="mb-5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Select Event
              </label>
              <select
                value={selectedEventId}
                onChange={handleEventSelect}
                className="w-full md:w-80 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm bg-white"
              >
                <option value="">— Pick an event —</option>
                {myEvents
                  .filter(
                    (e) =>
                      e.status === "approved" || e.status === "hod_approved",
                  )
                  .map((e) => (
                    <option key={e._id} value={e._id}>
                      {e.title}
                    </option>
                  ))}
              </select>
            </div>

            {/* Loading skeleton */}
            {loadingParticipants && (
              <div className="animate-pulse flex flex-col gap-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 p-4 border border-slate-100 rounded-xl"
                  >
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
                    ? "No registrations yet for this event."
                    : "Select an event to see participants."}
                </p>
              </div>
            )}

            {/* Attendance table */}
            {!loadingParticipants && participants.length > 0 && (
              <>
                {/* Toolbar: Search + Select All + Save */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
                  <div className="relative flex-grow max-w-xs">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                      🔍
                    </span>
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
                        <th className="px-4 py-3 text-xs font-black text-slate-500 uppercase w-10">
                          #
                        </th>
                        <th className="px-4 py-3 text-xs font-black text-slate-500 uppercase">
                          Student Name
                        </th>
                        <th className="px-4 py-3 text-xs font-black text-slate-500 uppercase">
                          Roll No
                        </th>
                        <th className="px-4 py-3 text-xs font-black text-slate-500 uppercase">
                          Department
                        </th>
                        <th className="px-4 py-3 text-xs font-black text-slate-500 uppercase min-w-[360px]">
                          Payment & Attendance
                        </th>
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
                          const pendingStatus =
                            attendanceStateMap[p.participantKey];
                          const displayStatus = pendingStatus || p.status;
                          const isPendingPresent = pendingStatus === "present";
                          const isPendingAbsent = pendingStatus === "absent";
                          const isCurrentPresent = p.status === "present";
                          const isCurrentAbsent = p.status === "absent";

                          return (
                            <tr
                              key={p.participantKey}
                              className={`transition ${
                                isPendingPresent
                                  ? "bg-emerald-50/70 border-l-4 border-l-emerald-500"
                                  : isPendingAbsent
                                    ? "bg-rose-50/70 border-l-4 border-l-rose-500"
                                    : "hover:bg-slate-50/60"
                              }`}
                            >
                              <td className="px-4 py-3 text-slate-400 text-xs font-mono">
                                {idx + 1}
                              </td>
                              <td className="px-4 py-3 font-semibold text-slate-800">
                                {p.name}
                              </td>
                              <td className="px-4 py-3 text-slate-600 font-mono text-xs uppercase">
                                {p.rollNumber}
                              </td>
                              <td className="px-4 py-3 text-slate-600">
                                {p.department}
                              </td>
                              <td className="px-4 py-4 align-top min-w-[360px]">
                                <div className="flex flex-col gap-3">
                                  {p.registrationStatus ===
                                    "pending_approval" && (
                                    <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 mr-auto">
                                        Review payment
                                      </span>
                                      <button
                                        onClick={() =>
                                          handleApproveRegistration(
                                            p.registrationId,
                                          )
                                        }
                                        className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition"
                                      >
                                        ✓ Approve
                                      </button>
                                      <button
                                        onClick={() =>
                                          handleRejectRegistration(
                                            p.registrationId,
                                          )
                                        }
                                        className="bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition"
                                      >
                                        ✗ Reject
                                      </button>
                                    </div>
                                  )}
                                  {selectedEventId &&
                                    myEvents.find(
                                      (e) => e._id === selectedEventId,
                                    )?.registrationFee > 0 && (
                                      <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
                                        <div className="flex items-center gap-3">
                                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                            Payment
                                          </span>
                                          <select
                                            value={
                                              paymentStatusMap[
                                                p.registrationId
                                              ] ||
                                              p.paymentStatus ||
                                              "pending"
                                            }
                                            onChange={(e) =>
                                              handlePaymentStatusUpdate(
                                                p.registrationId,
                                                e.target.value,
                                              )
                                            }
                                            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                                          >
                                            <option value="pending">
                                              Pending
                                            </option>
                                            <option value="paid">Paid ✓</option>
                                            <option value="rejected">
                                              Rejected ✗
                                            </option>
                                          </select>
                                        </div>
                                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-500">
                                          {p.transactionId && (
                                            <div>
                                              <span className="font-semibold">
                                                TXN:
                                              </span>{" "}
                                              {p.transactionId}
                                            </div>
                                          )}
                                          {p.paymentAmount > 0 && (
                                            <div>
                                              <span className="font-semibold">
                                                Amount:
                                              </span>{" "}
                                              ₹{p.paymentAmount}
                                            </div>
                                          )}
                                          {p.paymentScreenshot && (
                                            <a
                                              href={
                                                p.paymentScreenshot.startsWith(
                                                  "http",
                                                )
                                                  ? p.paymentScreenshot
                                                  : `${import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000"}${p.paymentScreenshot}`
                                              }
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-[10px] text-blue-600 hover:underline flex items-center gap-1"
                                            >
                                              📸 View Screenshot
                                            </a>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  <div className="flex flex-wrap items-center gap-2 pt-1">
                                    {/* Present button */}
                                    <button
                                      onClick={() =>
                                        toggleAttendance(
                                          p.participantKey,
                                          "present",
                                        )
                                      }
                                      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
                                        isPendingPresent
                                          ? "bg-emerald-500 text-white shadow-sm shadow-emerald-300 ring-2 ring-emerald-300"
                                          : isCurrentPresent
                                            ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300/50"
                                            : "bg-slate-100 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"
                                      }`}
                                    >
                                      ✅ Present
                                    </button>
                                    {/* Absent button */}
                                    <button
                                      onClick={() =>
                                        toggleAttendance(
                                          p.participantKey,
                                          "absent",
                                        )
                                      }
                                      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
                                        isPendingAbsent
                                          ? "bg-rose-500 text-white shadow-sm shadow-rose-300 ring-2 ring-rose-300"
                                          : isCurrentAbsent
                                            ? "bg-rose-100 text-rose-800 ring-1 ring-rose-300/50"
                                            : "bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                                      }`}
                                    >
                                      ❌ Absent
                                    </button>
                                    {/* Not marked badge */}
                                    {displayStatus === "not_marked" &&
                                      !pendingStatus && (
                                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                                          Not marked
                                        </span>
                                      )}
                                  </div>
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
                    Total:{" "}
                    <span className="text-slate-900">
                      {participants.length}
                    </span>
                  </span>
                  <span className="text-sm font-semibold text-emerald-700">
                    ✅ Present:{" "}
                    <span className="text-emerald-900">
                      {
                        participants.filter((p) => {
                          const ps =
                            attendanceStateMap[p.participantKey] || p.status;
                          return ps === "present";
                        }).length
                      }
                    </span>
                  </span>
                  <span className="text-sm font-semibold text-rose-700">
                    ❌ Absent:{" "}
                    <span className="text-rose-900">
                      {
                        participants.filter((p) => {
                          const ps =
                            attendanceStateMap[p.participantKey] || p.status;
                          return ps === "absent";
                        }).length
                      }
                    </span>
                  </span>
                  <span className="text-sm font-semibold text-slate-500">
                    ⬜ Not Marked:{" "}
                    <span className="text-slate-600">
                      {
                        participants.filter((p) => {
                          const ps =
                            attendanceStateMap[p.participantKey] || p.status;
                          return ps === "not_marked";
                        }).length
                      }
                    </span>
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── GALLERY UPLOAD ── */}
        {activeTab === "gallery" && (
          <div>
            <h2 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-4 mb-6">
              🖼️ Upload Event Photos
            </h2>
            <form
              onSubmit={handleGalleryUpload}
              className="max-w-lg flex flex-col gap-5 mb-8"
            >
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Select Event
                </label>
                <select
                  value={galleryEventId}
                  onChange={(e) => setGalleryEventId(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm bg-white"
                >
                  <option value="">— Pick an event —</option>
                  {myEvents.map((e) => (
                    <option key={e._id} value={e._id}>
                      {e.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Category / Label
                </label>
                <input
                  type="text"
                  value={galleryCategory}
                  onChange={(e) => setGalleryCategory(e.target.value)}
                  placeholder="e.g. Highlights, Prize Distribution"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Photo File
                </label>
                <div className="border-2 border-dashed border-slate-200 hover:border-primary rounded-2xl p-6 text-center cursor-pointer transition">
                  <input
                    type="file"
                    name="image"
                    accept="image/*"
                    onChange={(e) => setGalleryFile(e.target.files[0])}
                    className="hidden"
                    id="gallery-file"
                  />
                  <label
                    htmlFor="gallery-file"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <span className="text-3xl">
                      {galleryFile ? "🖼️" : "📤"}
                    </span>
                    <span className="text-sm font-semibold text-slate-600">
                      {galleryFile
                        ? galleryFile.name
                        : "Click to select image (JPG, PNG, WEBP)"}
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
                {uploading ? "Uploading to Cloud..." : "Upload Photo"}
              </button>
            </form>

            {/* My Gallery */}
            <div className="mt-8">
              <h3 className="text-lg font-bold text-slate-800 mb-4">
                📸 My Uploaded Photos
              </h3>
              {myGallery.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-200">
                  <p className="text-slate-500">No photos uploaded yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {myGallery.map((item) => (
                    <div
                      key={item._id}
                      className="relative group rounded-xl overflow-hidden shadow-sm border border-slate-200"
                    >
                      <img
                        src={
                          item.imageUrl.startsWith("http")
                            ? item.imageUrl
                            : `${import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000"}${item.imageUrl}`
                        }
                        alt={item.category || "Gallery image"}
                        className="w-full h-32 object-cover"
                      />
                      <button
                        onClick={() => handleGalleryDelete(item._id)}
                        className="absolute top-2 right-2 bg-rose-500 hover:bg-rose-600 text-white p-2 rounded-lg transition shadow-md z-10"
                        title="Delete image"
                      >
                        🗑️
                      </button>
                      {item.category && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-2 py-1 truncate">
                          {item.category}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── NOTIFICATIONS ── */}
        {activeTab === "notifications" && (
          <div>
            <h2 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-4 mb-5">
              🔔 Notifications
            </h2>
            {notifications.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <p className="text-4xl mb-3">📭</p>
                <p className="text-sm font-semibold">No notifications yet.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {notifications.map((n) => (
                  <div
                    key={n._id}
                    className={`p-4 rounded-2xl border flex items-start gap-3 ${n.isRead ? "bg-slate-50 border-slate-100 text-slate-500" : "bg-blue-50/40 border-blue-100 text-slate-800 font-medium"}`}
                  >
                    <span className="text-lg">
                      {n.type === "event_approved" ? "✅" : "🔔"}
                    </span>
                    <div>
                      <p className="text-sm leading-relaxed">{n.message}</p>
                      <span className="text-[10px] text-slate-400 font-semibold mt-1 block">
                        {formatDate(n.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
          </div>
        </main>
      </div>

      {/* ── CREATE / EDIT EVENT MODAL ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6">
          <div className="mx-auto my-4 w-full max-w-2xl rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-800">
                {editingEvent ? "✏️ Edit Event" : "✨ Create New Event"}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-slate-400 hover:text-slate-600 text-2xl font-bold"
              >
                &times;
              </button>
            </div>

            <form
              onSubmit={handleFormSubmit}
              className="grid grid-cols-1 md:grid-cols-2 gap-5"
            >
              <div className="md:col-span-2 flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Event Title
                </label>
                <input
                  name="title"
                  value={formData.title}
                  onChange={handleFormChange}
                  required
                  placeholder="e.g. National Hackathon 2026"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Category
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleFormChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm bg-white"
                >
                  {["Technical", "Cultural", "Sports", "Workshop"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Venue
                </label>
                <input
                  name="venue"
                  value={formData.venue}
                  onChange={handleFormChange}
                  required
                  placeholder="e.g. Main Auditorium"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Event Date
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleFormChange}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Event Time
                </label>
                <input
                  type="time"
                  name="time"
                  value={formData.time}
                  onChange={handleFormChange}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Max Participants
                </label>
                <input
                  type="number"
                  name="maxParticipants"
                  value={formData.maxParticipants}
                  onChange={handleFormChange}
                  required
                  min="1"
                  placeholder="e.g. 100"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Registration Deadline
                </label>
                <input
                  type="date"
                  name="registrationDeadline"
                  value={formData.registrationDeadline}
                  onChange={handleFormChange}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Registration Fee (₹)
                </label>
                <input
                  type="number"
                  name="registrationFee"
                  min="0"
                  step="1"
                  value={formData.registrationFee || 0}
                  onChange={handleFormChange}
                  placeholder="0 for free"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                />
              </div>

              {(formData.registrationFee > 0 ||
                formData.registrationFee === "") && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Payment Number / UPI ID
                  </label>
                  <input
                    type="text"
                    name="paymentNumber"
                    value={formData.paymentNumber || ""}
                    onChange={handleFormChange}
                    placeholder="e.g. 9876543210 or user@upi"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                  />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  WhatsApp Group Link (optional)
                </label>
                <input
                  type="url"
                  name="whatsappGroupLink"
                  value={formData.whatsappGroupLink || ""}
                  onChange={handleFormChange}
                  placeholder="https://chat.whatsapp.com/..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Registration Type
                </label>
                <select
                  name="registrationType"
                  value={formData.registrationType}
                  onChange={handleFormChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm bg-white"
                >
                  <option value="individual">Individual</option>
                  <option value="team">Team</option>
                </select>
              </div>

              {formData.registrationType === "team" && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Min Team Size
                    </label>
                    <input
                      type="number"
                      name="minTeamSize"
                      min="2"
                      value={formData.minTeamSize}
                      onChange={handleFormChange}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Max Team Size
                    </label>
                    <input
                      type="number"
                      name="maxTeamSize"
                      min="2"
                      value={formData.maxTeamSize}
                      onChange={handleFormChange}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                    />
                  </div>
                </>
              )}

              <div className="md:col-span-2 flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Registration Banner Image (optional)
                </label>
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 flex flex-col items-center gap-3">
                  {registrationBannerPreview ? (
                    <img
                      src={registrationBannerPreview}
                      alt="preview"
                      className="w-48 h-28 object-cover rounded-md"
                    />
                  ) : (
                    <div className="text-sm text-slate-500">
                      Drag & drop or click to select a banner image
                    </div>
                  )}
                  <input
                    type="file"
                    name="registrationBanner"
                    accept="image/*"
                    onChange={handleFormChange}
                    className="hidden"
                    id="registration-banner-file"
                  />
                  <label
                    htmlFor="registration-banner-file"
                    className="cursor-pointer text-xs font-semibold text-primary"
                  >
                    Choose registration banner image
                  </label>
                  <input
                    name="registrationBannerUrl"
                    value={formData.registrationBannerUrl}
                    onChange={handleFormChange}
                    placeholder="Or paste registration banner URL (optional)"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                  />
                </div>
              </div>

              <div className="md:col-span-2 flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Certificate Template (optional)
                </label>
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 flex flex-col items-center gap-3">
                  {certificateTemplatePreview ? (
                    <img
                      src={certificateTemplatePreview}
                      alt="Certificate template preview"
                      className="w-48 h-32 object-cover rounded-md"
                    />
                  ) : (
                    <div className="text-sm text-slate-500">
                      Upload a certificate background template (JPG/PNG) with
                      space for student name
                    </div>
                  )}
                  <input
                    type="file"
                    name="certificateTemplate"
                    accept="image/*"
                    onChange={handleFormChange}
                    className="hidden"
                    id="certificate-template-file"
                  />
                  <label
                    htmlFor="certificate-template-file"
                    className="cursor-pointer text-xs font-semibold text-primary"
                  >
                    Choose certificate template
                  </label>
                  <input
                    name="certificateTemplate"
                    value={formData.certificateTemplate}
                    onChange={handleFormChange}
                    placeholder="Or paste certificate template URL (optional)"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                  />
                </div>
              </div>

              <div className="md:col-span-2 flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Gallery Images (optional)
                </label>
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4">
                  <input
                    type="file"
                    name="galleryImages"
                    accept="image/*"
                    multiple
                    onChange={(e) =>
                      setGalleryFiles(Array.from(e.target.files || []))
                    }
                    className="w-full"
                  />
                  <input
                    type="text"
                    name="galleryImageCategory"
                    value={galleryImageCategory}
                    onChange={(e) => setGalleryImageCategory(e.target.value)}
                    placeholder="Gallery image category (optional)"
                    className="mt-3 w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    You can also add more gallery images later from the Gallery
                    upload tab.
                  </p>
                  {galleryFiles.length > 0 && (
                    <div className="mt-3 text-sm text-slate-600">
                      Selected files: {galleryFiles.length}
                    </div>
                  )}
                </div>
              </div>

              <div className="md:col-span-2 flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  required
                  rows={8}
                  placeholder="Write a clear overview, objectives, activities, eligibility, and what participants should expect. Use a new line for each section."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm resize-y leading-6"
                />
                <p className="text-xs text-slate-500">
                  Use short paragraphs or one bullet per line so students can
                  scan the event details easily.
                </p>
              </div>

              <div className="md:col-span-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-5 py-3 rounded-xl transition text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-primary hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl transition shadow-md shadow-blue-200 disabled:opacity-50 text-sm"
                >
                  {submitting
                    ? "Saving..."
                    : editingEvent
                      ? "Update Event"
                      : "Submit for HOD Approval"}
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
