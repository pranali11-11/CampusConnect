import React, { useState, useEffect, useCallback, useMemo } from "react";
import Sidebar from "../components/common/Sidebar";
import Loader from "../components/common/Loader";
import InteractiveProfile from "../components/profile/InteractiveProfile";
import eventService from "../services/eventService";
import registrationService from "../services/registrationService";
import { formatDate } from "../utils/formatDate";
import { formatDescription } from "../utils/formatDescription";
import { resolveImageUrl } from "../utils/imageUrl";
import { DEPARTMENTS, DEPARTMENT_ICONS } from "../constants/departments";
import { useToast } from "../hooks/useToast";
import useAuth from "../hooks/useAuth";

const HODDashboard = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState("approvals");
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Data states
  const [pendingEvents, setPendingEvents] = useState([]);
  const [departmentWiseData, setDepartmentWiseData] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);

  // Interaction states
  const [rejectingEvent, setRejectingEvent] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const [viewingEvent, setViewingEvent] = useState(null);
  const [expandedDescMap, setExpandedDescMap] = useState({});

  // Department Tab Filter states
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");
  const [deptSearchQuery, setDeptSearchQuery] = useState("");

  const fetchPendingEvents = useCallback(async () => {
    try {
      const res = await eventService.getPendingEvents();
      if (res.success) setPendingEvents(res.data);
    } catch {
      showToast("Failed to load pending events.", "error");
    }
  }, [showToast]);

  const fetchDepartmentWiseEvents = useCallback(async () => {
    try {
      const res = await eventService.getDepartmentWiseEvents({ status: "all" });
      if (res.success) setDepartmentWiseData(res.data);
    } catch {
      showToast("Failed to load department events.", "error");
    }
  }, [showToast]);

  const fetchDashboardStats = useCallback(async () => {
    try {
      const res = await eventService.getHODDashboardStats();
      if (res.success) setDashboardStats(res.data);
    } catch {
      showToast("Failed to load dashboard analytics.", "error");
    }
  }, [showToast]);

  const refreshAllData = useCallback(async () => {
    await Promise.all([
      fetchPendingEvents(),
      fetchDepartmentWiseEvents(),
      fetchDashboardStats(),
    ]);
  }, [fetchPendingEvents, fetchDepartmentWiseEvents, fetchDashboardStats]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await refreshAllData();
      try {
        const notifRes = await registrationService.getMyNotifications();
        if (notifRes.success) setNotifications(notifRes.data);
      } catch {
        /* silent */
      }
      setLoading(false);
    };
    init();
  }, [refreshAllData]);

  const toggleExpandDesc = (eventId) => {
    setExpandedDescMap((prev) => ({
      ...prev,
      [eventId]: !prev[eventId],
    }));
  };

  const handleApprove = async (eventId) => {
    setActionLoading(eventId);
    try {
      await eventService.approveEvent(eventId);
      showToast("Event approved successfully!", "success");
      if (viewingEvent && viewingEvent._id === eventId) {
        setViewingEvent(null);
      }
      await refreshAllData();
    } catch (err) {
      showToast(err.response?.data?.error || "Approval failed.", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      showToast("Please provide a rejection reason.", "warning");
      return;
    }

    setActionLoading(rejectingEvent._id);
    try {
      await eventService.rejectEvent(rejectingEvent._id, rejectionReason.trim());
      showToast("Event rejected.", "success");
      if (viewingEvent && viewingEvent._id === rejectingEvent._id) {
        setViewingEvent(null);
      }
      setRejectingEvent(null);
      setRejectionReason("");
      await refreshAllData();
    } catch (err) {
      showToast(err.response?.data?.error || "Rejection failed.", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: "📊" },
    {
      id: "approvals",
      label: "Pending Approvals",
      icon: "✅",
      badge: pendingEvents.length > 0 ? pendingEvents.length : null,
    },
    { id: "departments", label: "Department Events", icon: "🏢" },
    { id: "notifications", label: "Notifications", icon: "🔔" },
    { id: "profile", label: "My Profile", icon: "👤" },
  ];

  // Helper stats for Department Events tab
  const totalEventsAcrossAllDepts = useMemo(() => {
    return departmentWiseData.reduce((acc, curr) => acc + curr.totalCount, 0);
  }, [departmentWiseData]);

  const totalApprovedAcrossAllDepts = useMemo(() => {
    return departmentWiseData.reduce((acc, curr) => acc + curr.approvedCount, 0);
  }, [departmentWiseData]);

  const totalPendingAcrossAllDepts = useMemo(() => {
    return departmentWiseData.reduce((acc, curr) => acc + curr.pendingCount, 0);
  }, [departmentWiseData]);

  // Filtered department list for rendering
  const filteredDepartmentList = useMemo(() => {
    return departmentWiseData
      .filter((deptItem) => {
        if (selectedDeptFilter === "all") return true;
        return deptItem.department === selectedDeptFilter;
      })
      .map((deptItem) => {
        let events = deptItem.events || [];

        // Filter by status
        if (selectedStatusFilter !== "all") {
          if (selectedStatusFilter === "approved") {
            events = events.filter((e) =>
              ["approved", "hod_approved"].includes(e.status)
            );
          } else if (selectedStatusFilter === "pending") {
            events = events.filter((e) => e.status === "pending");
          } else if (selectedStatusFilter === "rejected") {
            events = events.filter((e) => e.status === "rejected");
          }
        }

        // Filter by search query
        if (deptSearchQuery.trim()) {
          const q = deptSearchQuery.toLowerCase().trim();
          events = events.filter(
            (e) =>
              e.title?.toLowerCase().includes(q) ||
              e.venue?.toLowerCase().includes(q) ||
              e.description?.toLowerCase().includes(q) ||
              e.category?.toLowerCase().includes(q) ||
              e.createdBy?.name?.toLowerCase().includes(q)
          );
        }

        return {
          ...deptItem,
          filteredEvents: events,
        };
      });
  }, [departmentWiseData, selectedDeptFilter, selectedStatusFilter, deptSearchQuery]);

  const statusBadge = (status) => {
    if (status === "approved" || status === "hod_approved") {
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    }
    if (status === "rejected") {
      return "bg-rose-100 text-rose-800 border-rose-200";
    }
    return "bg-amber-100 text-amber-800 border-amber-200";
  };

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
                <span className="text-primary capitalize">HOD Portal</span>
                <span>/</span>
                <span className="text-slate-600 truncate">{tabs.find((t) => t.id === activeTab)?.label}</span>
              </div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight truncate">
                {tabs.find((t) => t.id === activeTab)?.label}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 text-xs font-bold text-slate-700">
              <span>🏢</span>
              <span>Dept: {user?.department || "General"}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm min-h-[500px]">

            {/* ══════════════════════════════════════════════════════════════
                TAB 1: OVERVIEW
               ══════════════════════════════════════════════════════════════ */}
            {activeTab === "overview" && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">
                      📊 HOD Dashboard Overview
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Department-wise approvals, activity metrics, and registration insights.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab("approvals")}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5"
                    >
                      <span>Review Pending ({pendingEvents.length})</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("departments")}
                      className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5"
                    >
                      <span>Explore All Departments</span>
                    </button>
                  </div>
                </div>

                {!dashboardStats ? (
                  <div className="text-center py-16 text-slate-400">
                    <p className="text-4xl mb-3">⏳</p>
                    <p className="font-semibold text-sm">Loading analytics...</p>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
                      {[
                        { label: "Total Campus Events", value: dashboardStats.totalEvents },
                        { label: "My Dept Pending Reviews", value: pendingEvents.length },
                        { label: "Approved Events", value: dashboardStats.approvedEvents },
                        { label: "Rejected Events", value: dashboardStats.rejectedEvents },
                        { label: "Total Registrations", value: dashboardStats.totalRegistrations },
                        { label: "Attended Students", value: dashboardStats.totalAttended },
                        { label: "Attendance Rate", value: `${dashboardStats.attendanceRate}%` },
                        { label: "Active Faculty", value: dashboardStats.totalTeachers },
                      ].map((card) => (
                        <div
                          key={card.label}
                          className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 shadow-sm"
                        >
                          <p className="text-[11px] uppercase tracking-wider font-bold text-slate-400 mb-2">
                            {card.label}
                          </p>
                          <p className="text-2xl font-black text-slate-900">
                            {card.value}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Department-Wise Event Summary Section */}
                    <section className="mb-6 bg-slate-50/80 border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                        <div>
                          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                            <span>🏢</span>
                            <span>All Departments Event Summary</span>
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Real-time snapshot of events across each college academic department.
                          </p>
                        </div>
                        <button
                          onClick={() => setActiveTab("departments")}
                          className="text-xs font-bold text-primary hover:underline flex items-center gap-1 self-start sm:self-auto"
                        >
                          <span>View detailed department view</span>
                          <span>→</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                        {departmentWiseData.map((d) => (
                          <div
                            key={d.department}
                            onClick={() => {
                              setSelectedDeptFilter(d.department);
                              setActiveTab("departments");
                            }}
                            className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col justify-between gap-2 ${
                              d.department === user?.department
                                ? "bg-blue-50/80 border-blue-300 ring-2 ring-primary/20"
                                : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xl">
                                {DEPARTMENT_ICONS[d.department] || "🏢"}
                              </span>
                              <span className="text-xs font-extrabold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                                {d.totalCount} {d.totalCount === 1 ? "Event" : "Events"}
                              </span>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-800 line-clamp-1">
                                {d.department}
                              </p>
                              {d.department === user?.department && (
                                <span className="text-[10px] text-primary font-black uppercase tracking-wider block mt-0.5">
                                  Your Department
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-slate-500 font-semibold border-t border-slate-100 pt-1.5 mt-0.5">
                              <span className="text-emerald-700">✓ {d.approvedCount}</span>
                              <span>•</span>
                              <span className="text-amber-700">⏳ {d.pendingCount}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    <div className="grid gap-6 lg:grid-cols-2">
                      <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-sm font-bold text-slate-800">
                              Event Categories
                            </p>
                            <p className="text-xs text-slate-500">
                              Distribution of campus events by category
                            </p>
                          </div>
                          <span className="text-xs text-slate-400">
                            {dashboardStats.eventsByCategory.length} categories
                          </span>
                        </div>
                        <div className="space-y-3">
                          {dashboardStats.eventsByCategory.map((item) => {
                            const maxCount = Math.max(
                              ...dashboardStats.eventsByCategory.map((c) => c.count),
                              1
                            );
                            const widthPercentage = Math.round((item.count / maxCount) * 100);
                            return (
                              <div key={item.category} className="space-y-1.5">
                                <div className="flex justify-between text-xs text-slate-600">
                                  <span>{item.category}</span>
                                  <span className="font-bold text-slate-800">
                                    {item.count}
                                  </span>
                                </div>
                                <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-slate-800"
                                    style={{ width: `${widthPercentage}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </section>

                      <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-sm font-bold text-slate-800">
                              Top Student Registrations by Department
                            </p>
                            <p className="text-xs text-slate-500">
                              Departments with the highest participant engagement
                            </p>
                          </div>
                        </div>
                        <div className="space-y-2.5">
                          {dashboardStats.topDepartments.length === 0 ? (
                            <p className="text-xs text-slate-500">
                              No registration data available yet.
                            </p>
                          ) : (
                            dashboardStats.topDepartments.map((dept) => (
                              <div
                                key={dept.department}
                                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/60"
                              >
                                <span className="text-xs font-bold text-slate-700">
                                  {dept.department || "General"}
                                </span>
                                <span className="text-xs font-black bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-900">
                                  {dept.count} registrations
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </section>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                TAB 2: PENDING APPROVALS (DEPARTMENT-WISE)
               ══════════════════════════════════════════════════════════════ */}
            {activeTab === "approvals" && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <span>✅</span>
                      <span>Department Event Approvals</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Events submitted for approval strictly belonging to your department (
                      <span className="font-bold text-primary">{user?.department || "Assigned Department"}</span>
                      ). HODs only receive approval requests for their respective department.
                    </p>
                  </div>
                  <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 text-xs font-extrabold border border-amber-200 self-start sm:self-auto">
                    {pendingEvents.length} Awaiting Approval
                  </span>
                </div>

                {pendingEvents.length === 0 ? (
                  <div className="text-center py-20 text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-5xl mb-3">🎉</p>
                    <h3 className="font-black text-slate-800 text-base">
                      No Pending Approvals for {user?.department || "Your Department"}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                      All event requests belonging to your department have been reviewed. When faculty in your department submit new events, they will appear here.
                    </p>
                    <button
                      onClick={() => setActiveTab("departments")}
                      className="mt-5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition"
                    >
                      Browse All Department Events
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-6">
                    {pendingEvents.map((event) => {
                      const isExpanded = !!expandedDescMap[event._id];
                      return (
                        <div
                          key={event._id}
                          className="border border-slate-200 rounded-2xl p-5 sm:p-6 bg-slate-50/60 hover:bg-white hover:shadow-md hover:border-slate-300 transition-all flex flex-col gap-4"
                        >
                          {/* Card Header & Badges */}
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/60 pb-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-black bg-blue-100 text-blue-800 border border-blue-200 px-3 py-1 rounded-full">
                                🏢 {event.department || user?.department}
                              </span>
                              <span className="text-xs font-black bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1 rounded-full">
                                {event.category}
                              </span>
                              <span className="text-xs font-extrabold bg-amber-50 text-amber-700 border border-amber-200/80 px-2.5 py-1 rounded-full animate-pulse">
                                Pending HOD Review
                              </span>
                              {event.certificateTemplate ? (
                                <span className="text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                                  📜 Template Ready
                                </span>
                              ) : (
                                <span className="text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                                  ⚠️ No Template
                                </span>
                              )}
                            </div>

                            <button
                              onClick={() => setViewingEvent(event)}
                              className="text-xs font-bold text-primary hover:text-blue-700 hover:underline flex items-center gap-1"
                            >
                              <span>🔍 View Full Details & Flyer</span>
                            </button>
                          </div>

                          {/* Event Title */}
                          <h3 className="font-black text-slate-900 text-lg sm:text-xl tracking-tight leading-snug">
                            {event.title}
                          </h3>

                          {/* Complete Event Description */}
                          <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-inner">
                            <p className="text-[11px] uppercase tracking-wider font-black text-slate-400 mb-1.5 flex items-center justify-between">
                              <span>Complete Event Description:</span>
                              {event.description?.length > 220 && (
                                <button
                                  type="button"
                                  onClick={() => toggleExpandDesc(event._id)}
                                  className="text-primary hover:underline text-xs normal-case font-bold"
                                >
                                  {isExpanded ? "Collapse ▲" : "Expand Full Description ▼"}
                                </button>
                              )}
                            </p>
                            <div
                              className={`text-sm text-slate-700 leading-relaxed whitespace-pre-line break-words ${
                                !isExpanded && event.description?.length > 220
                                  ? "line-clamp-3"
                                  : ""
                              }`}
                            >
                              {formatDescription(event.description)}
                            </div>
                            {!isExpanded && event.description?.length > 220 && (
                              <button
                                type="button"
                                onClick={() => toggleExpandDesc(event._id)}
                                className="mt-2 text-xs font-bold text-primary hover:underline"
                              >
                                Read complete description ({event.description.length} characters) →
                              </button>
                            )}
                          </div>

                          {/* Logistics & Faculty Metadata */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3.5 rounded-xl border border-slate-200/60 text-xs">
                            <div>
                              <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                                📍 Venue
                              </span>
                              <span className="font-bold text-slate-800">
                                {event.venue}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                                📅 Date & Time
                              </span>
                              <span className="font-bold text-slate-800">
                                {formatDate(event.date)} at {event.time}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                                👥 Max / Fee
                              </span>
                              <span className="font-bold text-slate-800">
                                {event.maxParticipants} max •{" "}
                                {event.registrationFee > 0
                                  ? `₹${event.registrationFee}`
                                  : "Free"}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                                👤 Submitted By
                              </span>
                              <span className="font-bold text-slate-800 truncate block">
                                {event.createdBy?.name || "Faculty Coordinator"}
                              </span>
                            </div>
                          </div>

                          {/* Action Buttons: Approve & Reject */}
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-200/60">
                            <div className="text-xs text-slate-500">
                              <span>Deadline: </span>
                              <span className="font-bold text-slate-700">
                                {formatDate(event.registrationDeadline)}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleApprove(event._id)}
                                disabled={actionLoading === event._id}
                                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-sm disabled:opacity-50"
                              >
                                {actionLoading === event._id ? (
                                  <span>Approving...</span>
                                ) : (
                                  <>
                                    <span>✓</span>
                                    <span>Approve Event</span>
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => {
                                  setRejectingEvent(event);
                                  setRejectionReason("");
                                }}
                                disabled={actionLoading === event._id}
                                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold px-4 py-2.5 rounded-xl transition"
                              >
                                <span>✕</span>
                                <span>Reject Event</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                TAB 3: DEPARTMENT EVENTS (ALL DEPARTMENTS & THEIR RESPECTIVE EVENTS)
               ══════════════════════════════════════════════════════════════ */}
            {activeTab === "departments" && (
              <div>
                {/* Header Banner */}
                <div className="border-b border-slate-100 pb-5 mb-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <span>🏢</span>
                        <span>All Departments & Respective Events</span>
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
                        View events categorized by academic departments. Track approvals, verify guidelines, and inspect complete descriptions across campus.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold">
                        {DEPARTMENTS.length} Departments
                      </span>
                      <span className="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-primary text-xs font-bold">
                        {totalEventsAcrossAllDepts} Total Events
                      </span>
                    </div>
                  </div>

                  {/* Summary Metric Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Departments
                      </span>
                      <span className="text-lg font-black text-slate-900">
                        {DEPARTMENTS.length}
                      </span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Total Events
                      </span>
                      <span className="text-lg font-black text-slate-900">
                        {totalEventsAcrossAllDepts}
                      </span>
                    </div>
                    <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                        Approved Events
                      </span>
                      <span className="text-lg font-black text-emerald-900">
                        {totalApprovedAcrossAllDepts}
                      </span>
                    </div>
                    <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
                        Pending Reviews
                      </span>
                      <span className="text-lg font-black text-amber-900">
                        {totalPendingAcrossAllDepts}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Filter and Search Controls */}
                <div className="space-y-4 mb-8">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    {/* Search Input */}
                    <div className="relative flex-1">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                        🔍
                      </span>
                      <input
                        type="text"
                        value={deptSearchQuery}
                        onChange={(e) => setDeptSearchQuery(e.target.value)}
                        placeholder="Search events by title, venue, coordinator..."
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                      />
                      {deptSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setDeptSearchQuery("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Status Filter */}
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-slate-500 shrink-0">
                        Status:
                      </label>
                      <select
                        value={selectedStatusFilter}
                        onChange={(e) => setSelectedStatusFilter(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="all">All Statuses</option>
                        <option value="approved">Approved</option>
                        <option value="pending">Pending Review</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>
                  </div>

                  {/* Department Pills Bar */}
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                      Filter by Department:
                    </label>
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
                      <button
                        onClick={() => setSelectedDeptFilter("all")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
                          selectedDeptFilter === "all"
                            ? "bg-slate-900 text-white shadow-sm"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                        }`}
                      >
                        <span>🏢</span>
                        <span>All Departments ({totalEventsAcrossAllDepts})</span>
                      </button>

                      {DEPARTMENTS.map((deptName) => {
                        const deptItem = departmentWiseData.find(
                          (d) => d.department === deptName
                        );
                        const count = deptItem ? deptItem.totalCount : 0;
                        const isCurrentHODDept = deptName === user?.department;

                        return (
                          <button
                            key={deptName}
                            onClick={() => setSelectedDeptFilter(deptName)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
                              selectedDeptFilter === deptName
                                ? "bg-primary text-white shadow-sm"
                                : isCurrentHODDept
                                ? "bg-blue-50 text-primary border border-blue-200 hover:bg-blue-100"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                            }`}
                          >
                            <span>{DEPARTMENT_ICONS[deptName] || "🏢"}</span>
                            <span>{deptName}</span>
                            <span
                              className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                                selectedDeptFilter === deptName
                                  ? "bg-white/20 text-white"
                                  : "bg-slate-200/80 text-slate-700"
                              }`}
                            >
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Listing: Departments & Their Respective Events */}
                <div className="space-y-8">
                  {filteredDepartmentList.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                      <p className="text-4xl mb-2">🔍</p>
                      <p className="font-semibold text-sm">
                        No departments found matching your filters.
                      </p>
                    </div>
                  ) : (
                    filteredDepartmentList.map((deptItem) => {
                      const events = deptItem.filteredEvents || [];
                      const icon = DEPARTMENT_ICONS[deptItem.department] || "🏢";
                      const isHODDepartment = deptItem.department === user?.department;

                      return (
                        <div
                          key={deptItem.department}
                          className="border border-slate-200 rounded-2xl p-5 sm:p-6 bg-slate-50/40"
                        >
                          {/* Department Section Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4 mb-5">
                            <div className="flex items-center gap-3">
                              <span className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-xl shadow-sm">
                                {icon}
                              </span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-black text-slate-900 text-lg sm:text-xl">
                                    {deptItem.department}
                                  </h3>
                                  {isHODDepartment && (
                                    <span className="text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
                                      Your Department
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {events.length} {events.length === 1 ? "Event" : "Events"} recorded in this department
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 text-xs font-bold">
                              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                                ✓ {deptItem.approvedCount} Approved
                              </span>
                              <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                                ⏳ {deptItem.pendingCount} Pending
                              </span>
                            </div>
                          </div>

                          {/* Events under this department */}
                          {events.length === 0 ? (
                            <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-400">
                              <p className="text-2xl mb-1">📅</p>
                              <p className="text-xs font-semibold text-slate-500">
                                No events found for {deptItem.department} under the selected criteria.
                              </p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {events.map((event) => {
                                const bannerUrl = resolveImageUrl(
                                  event.registrationBannerUrl || event.bannerUrl
                                );
                                const isPendingAndMyDept =
                                  event.status === "pending" && isHODDepartment;

                                return (
                                  <div
                                    key={event._id}
                                    className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between gap-3"
                                  >
                                    <div>
                                      {/* Banner Thumbnail (if available) */}
                                      {bannerUrl && (
                                        <div className="relative h-32 w-full rounded-lg overflow-hidden bg-slate-100 mb-3 border border-slate-100">
                                          <img
                                            src={bannerUrl}
                                            alt={event.title}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                              e.target.style.display = "none";
                                            }}
                                          />
                                        </div>
                                      )}

                                      {/* Event Meta Badges */}
                                      <div className="flex items-center gap-2 flex-wrap mb-2">
                                        <span className="text-[11px] font-black bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md">
                                          {event.category}
                                        </span>
                                        <span
                                          className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-md border capitalize ${statusBadge(
                                            event.status
                                          )}`}
                                        >
                                          {event.status === "hod_approved"
                                            ? "Approved"
                                            : event.status.replace("_", " ")}
                                        </span>
                                        {event.registrationFee > 0 ? (
                                          <span className="text-[11px] font-bold text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md">
                                            ₹{event.registrationFee}
                                          </span>
                                        ) : (
                                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                                            Free
                                          </span>
                                        )}
                                      </div>

                                      {/* Title */}
                                      <h4 className="font-extrabold text-slate-900 text-base leading-snug line-clamp-2">
                                        {event.title}
                                      </h4>

                                      {/* Description preview */}
                                      <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed whitespace-pre-line">
                                        {formatDescription(event.description)}
                                      </p>

                                      {/* Event Info Details */}
                                      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                                        <div>
                                          <span>📍 {event.venue}</span>
                                        </div>
                                        <div>
                                          <span>📅 {formatDate(event.date)}</span>
                                        </div>
                                        <div>
                                          <span>👥 Max: {event.maxParticipants}</span>
                                        </div>
                                        <div>
                                          <span>
                                            👤 By:{" "}
                                            {event.createdBy?.name ||
                                              "Faculty"}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Footer Actions */}
                                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                                      <button
                                        onClick={() => setViewingEvent(event)}
                                        className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                                      >
                                        <span>🔍 View Complete Description</span>
                                      </button>

                                      {isPendingAndMyDept && (
                                        <div className="flex items-center gap-1.5">
                                          <button
                                            onClick={() => handleApprove(event._id)}
                                            disabled={actionLoading === event._id}
                                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition disabled:opacity-50"
                                          >
                                            {actionLoading === event._id
                                              ? "..."
                                              : "Approve"}
                                          </button>
                                          <button
                                            onClick={() => {
                                              setRejectingEvent(event);
                                              setRejectionReason("");
                                            }}
                                            className="px-3 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-bold transition"
                                          >
                                            Reject
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                TAB 4: NOTIFICATIONS
               ══════════════════════════════════════════════════════════════ */}
            {activeTab === "notifications" && (
              <div>
                <h2 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-4 mb-5">
                  🔔 Department Notifications
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
                        className={`p-4 rounded-2xl border flex items-start gap-3 ${
                          n.isRead
                            ? "bg-slate-50 border-slate-100 text-slate-500"
                            : "bg-blue-50/40 border-blue-100 text-slate-800 font-medium"
                        }`}
                      >
                        <span className="text-lg">🔔</span>
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

            {/* ══════════════════════════════════════════════════════════════
                TAB 5: PROFILE
               ══════════════════════════════════════════════════════════════ */}
            {activeTab === "profile" && (
              <InteractiveProfile
                role="hod"
                stats={[
                  {
                    label: "Dept Events",
                    value: departmentEvents.length,
                    icon: "📋",
                    tabId: "overview",
                  },
                  {
                    label: "Pending Approvals",
                    value: pendingEvents.length,
                    icon: "⏳",
                    tabId: "approvals",
                  },
                  {
                    label: "Approved in Dept",
                    value: departmentEvents.filter(
                      (e) => e.status === "approved" || e.status === "hod_approved"
                    ).length,
                    icon: "✅",
                    tabId: "overview",
                  },
                  {
                    label: "College Total",
                    value: totalEventsAcrossAllDepts,
                    icon: "🏛️",
                    tabId: "departments",
                  },
                ]}
                onNavigateTab={(tabId) => setActiveTab(tabId)}
              />
            )}

          </div>
        </main>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          MODAL: VIEW COMPLETE EVENT DESCRIPTION & FULL DETAILS
         ══════════════════════════════════════════════════════════════════ */}
      {viewingEvent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full border border-slate-100 shadow-2xl my-8 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-xs font-black bg-blue-100 text-blue-800 border border-blue-200 px-3 py-1 rounded-full">
                    🏢 {viewingEvent.department || viewingEvent.createdBy?.department || "Department Event"}
                  </span>
                  <span className="text-xs font-black bg-slate-100 text-slate-800 px-3 py-1 rounded-full">
                    {viewingEvent.category}
                  </span>
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full border capitalize ${statusBadge(
                      viewingEvent.status
                    )}`}
                  >
                    {viewingEvent.status === "hod_approved"
                      ? "Approved"
                      : viewingEvent.status.replace("_", " ")}
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                  {viewingEvent.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingEvent(null)}
                className="text-slate-400 hover:text-slate-600 text-2xl font-bold p-1 leading-none"
              >
                &times;
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="overflow-y-auto flex-1 pr-1 space-y-5 my-4">
              {/* Event Poster / Banner if present */}
              {resolveImageUrl(
                viewingEvent.registrationBannerUrl || viewingEvent.bannerUrl
              ) && (
                <div className="rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 max-h-64 flex items-center justify-center">
                  <img
                    src={resolveImageUrl(
                      viewingEvent.registrationBannerUrl || viewingEvent.bannerUrl
                    )}
                    alt={viewingEvent.title}
                    className="w-full h-full object-contain max-h-64"
                  />
                </div>
              )}

              {/* Complete Event Description */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                  Complete Event Description
                </h4>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm text-slate-800 leading-relaxed whitespace-pre-line break-words">
                  {formatDescription(viewingEvent.description)}
                </div>
              </div>

              {/* Event Logistics Grid */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                  Event Schedule & Logistics
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs">
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                      📍 Venue
                    </span>
                    <span className="font-bold text-slate-900 mt-0.5 block">
                      {viewingEvent.venue}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                      📅 Date
                    </span>
                    <span className="font-bold text-slate-900 mt-0.5 block">
                      {formatDate(viewingEvent.date)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                      🕒 Time
                    </span>
                    <span className="font-bold text-slate-900 mt-0.5 block">
                      {viewingEvent.time}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                      👥 Max Participants
                    </span>
                    <span className="font-bold text-slate-900 mt-0.5 block">
                      {viewingEvent.maxParticipants} Students
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                      ⏳ Registration Deadline
                    </span>
                    <span className="font-bold text-slate-900 mt-0.5 block">
                      {formatDate(viewingEvent.registrationDeadline)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                      💰 Registration Fee
                    </span>
                    <span className="font-bold text-slate-900 mt-0.5 block">
                      {viewingEvent.registrationFee > 0
                        ? `₹${viewingEvent.registrationFee}`
                        : "Free of charge"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                      🏷️ Participation Type
                    </span>
                    <span className="font-bold text-slate-900 mt-0.5 block capitalize">
                      {viewingEvent.registrationType || "Individual"}
                      {viewingEvent.registrationType === "team" &&
                        ` (${viewingEvent.minTeamSize}-${viewingEvent.maxTeamSize} members)`}
                    </span>
                  </div>
                  {viewingEvent.paymentNumber && (
                    <div>
                      <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                        💳 Payment UPI / Mobile
                      </span>
                      <span className="font-bold text-slate-900 mt-0.5 block">
                        {viewingEvent.paymentNumber}
                      </span>
                    </div>
                  )}
                  {viewingEvent.whatsappGroupLink && (
                    <div>
                      <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                        💬 WhatsApp Group
                      </span>
                      <a
                        href={viewingEvent.whatsappGroupLink}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-primary hover:underline mt-0.5 block truncate"
                      >
                        Join Link ↗
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Faculty & Coordinator Contact Information */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                  Faculty & Coordinator Contact
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs">
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                      Created By (Faculty)
                    </span>
                    <span className="font-bold text-slate-900 block mt-0.5">
                      {viewingEvent.createdBy?.name || "Teacher"}
                    </span>
                    <span className="text-slate-500 block">
                      {viewingEvent.createdBy?.email} • {viewingEvent.createdBy?.department}
                    </span>
                  </div>
                  {viewingEvent.coordinatorId && (
                    <div>
                      <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                        Event Coordinator
                      </span>
                      <span className="font-bold text-slate-900 block mt-0.5">
                        {viewingEvent.coordinatorId.name}
                      </span>
                      <span className="text-slate-500 block">
                        {viewingEvent.coordinatorId.mobile || viewingEvent.coordinatorId.email}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Certificate Template Preview & Status for HOD */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                  Certificate Template Status
                </h4>
                {viewingEvent.certificateTemplate ? (
                  <div className="flex flex-col sm:flex-row items-center gap-4 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4">
                    <img
                      src={resolveImageUrl(viewingEvent.certificateTemplate)}
                      alt="Certificate Template"
                      className="w-48 h-28 object-contain bg-slate-900/5 rounded-lg border border-emerald-300 shadow-sm flex-shrink-0"
                    />
                    <div className="flex-1 text-xs">
                      <div className="inline-flex items-center gap-1.5 font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full mb-1">
                        <span>📜</span> Template Uploaded & Configured
                      </div>
                      <p className="text-slate-600 mt-1">
                        The faculty has uploaded a custom certificate template. Eligible attending students will be able to generate and download their customized certificate upon event completion.
                      </p>
                      <a
                        href={resolveImageUrl(viewingEvent.certificateTemplate)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block mt-2 font-bold text-primary hover:underline text-[11px]"
                      >
                        Open Full Template Image ↗
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs flex items-start gap-3">
                    <span className="text-lg">⚠️</span>
                    <div>
                      <span className="font-bold text-amber-900 block">
                        No Certificate Template Uploaded
                      </span>
                      <p className="text-amber-800/90 mt-0.5">
                        The faculty has not attached a certificate template to this event. Student certificate generation will remain disabled unless a template is uploaded.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Rejection Reason if rejected */}
              {viewingEvent.status === "rejected" && viewingEvent.rejectionReason && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs">
                  <span className="font-black text-rose-800 block uppercase tracking-wider text-[10px]">
                    Rejection Reason
                  </span>
                  <p className="text-rose-700 mt-1 font-semibold">
                    {viewingEvent.rejectionReason}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="border-t border-slate-100 pt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setViewingEvent(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-5 py-2.5 rounded-xl transition text-xs"
              >
                Close
              </button>

              {/* If event is pending and belongs to HOD department, allow Approve/Reject right here */}
              {viewingEvent.status === "pending" &&
                (viewingEvent.department === user?.department ||
                  viewingEvent.createdBy?.department === user?.department) && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApprove(viewingEvent._id)}
                      disabled={actionLoading === viewingEvent._id}
                      className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl transition text-xs shadow-sm disabled:opacity-50"
                    >
                      {actionLoading === viewingEvent._id ? (
                        <span>Approving...</span>
                      ) : (
                        <>
                          <span>✓</span>
                          <span>Approve Event</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setRejectingEvent(viewingEvent);
                        setRejectionReason("");
                      }}
                      disabled={actionLoading === viewingEvent._id}
                      className="inline-flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold px-4 py-2.5 rounded-xl transition text-xs"
                    >
                      <span>✕</span>
                      <span>Reject Event</span>
                    </button>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          MODAL: REJECT EVENT (WITH REASON)
         ══════════════════════════════════════════════════════════════════ */}
      {rejectingEvent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-100 shadow-2xl">
            <h3 className="text-lg font-black text-slate-800 mb-1">
              Reject Event
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Rejecting:{" "}
              <span className="font-bold text-slate-700">
                {rejectingEvent.title}
              </span>{" "}
              ({rejectingEvent.department || user?.department})
            </p>
            <form onSubmit={handleReject} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1.5">
                  Reason for Rejection (Visible to faculty):
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  required
                  rows={4}
                  placeholder="Provide detailed feedback or reasons for rejection..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-xs resize-none"
                />
              </div>
              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setRejectingEvent(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl transition text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === rejectingEvent._id}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-5 py-2.5 rounded-xl transition text-xs disabled:opacity-50"
                >
                  {actionLoading === rejectingEvent._id
                    ? "Rejecting..."
                    : "Confirm Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HODDashboard;
