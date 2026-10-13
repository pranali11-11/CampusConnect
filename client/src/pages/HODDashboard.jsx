import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "../components/common/Sidebar";
import Loader from "../components/common/Loader";
import eventService from "../services/eventService";
import registrationService from "../services/registrationService";
import { formatDate } from "../utils/formatDate";
import { formatDescription } from "../utils/formatDescription";
import { useToast } from "../hooks/useToast";
import useAuth from "../hooks/useAuth";

const HODDashboard = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState("approvals");
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const [pendingEvents, setPendingEvents] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [rejectingEvent, setRejectingEvent] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(null);

  const fetchPendingEvents = useCallback(async () => {
    try {
      const res = await eventService.getPendingEvents();
      if (res.success) setPendingEvents(res.data);
    } catch {
      showToast("Failed to load pending events.", "error");
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

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchPendingEvents(), fetchDashboardStats()]);
      try {
        const notifRes = await registrationService.getMyNotifications();
        if (notifRes.success) setNotifications(notifRes.data);
      } catch {
        /* silent */
      }
      setLoading(false);
    };
    init();
  }, [fetchPendingEvents, fetchDashboardStats]);

  const handleApprove = async (eventId) => {
    setActionLoading(eventId);
    try {
      await eventService.approveEvent(eventId);
      showToast("Event approved successfully!", "success");
      await Promise.all([fetchPendingEvents(), fetchDashboardStats()]);
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
      await eventService.rejectEvent(rejectingEvent._id, rejectionReason);
      showToast("Event rejected.", "success");
      setRejectingEvent(null);
      setRejectionReason("");
      await Promise.all([fetchPendingEvents(), fetchDashboardStats()]);
    } catch (err) {
      showToast(err.response?.data?.error || "Rejection failed.", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "approvals", label: "Pending Approvals", icon: "✅" },
    { id: "notifications", label: "Notifications", icon: "🔔" },
    { id: "profile", label: "My Profile", icon: "👤" },
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
                <span className="text-primary capitalize">HOD Portal</span>
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
        {/* Overview */}
        {activeTab === "overview" && (
          <div>
            <h2 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-4 mb-6">
              📊 HOD Dashboard Overview
            </h2>

            {!dashboardStats ? (
              <div className="text-center py-16 text-slate-400">
                <p className="text-4xl mb-3">⏳</p>
                <p className="font-semibold text-sm">Loading analytics...</p>
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
                  {[
                    {
                      label: "Total Events",
                      value: dashboardStats.totalEvents,
                    },
                    {
                      label: "Pending Reviews",
                      value: dashboardStats.pendingEvents,
                    },
                    {
                      label: "Approved Events",
                      value: dashboardStats.approvedEvents,
                    },
                    {
                      label: "Rejected Events",
                      value: dashboardStats.rejectedEvents,
                    },
                    {
                      label: "Open Registrations",
                      value: dashboardStats.totalRegistrations,
                    },
                    {
                      label: "Attended Students",
                      value: dashboardStats.totalAttended,
                    },
                    {
                      label: "Attendance Rate",
                      value: `${dashboardStats.attendanceRate}%`,
                    },
                    {
                      label: "Teachers Active",
                      value: dashboardStats.totalTeachers,
                    },
                  ].map((card) => (
                    <div
                      key={card.label}
                      className="bg-slate-50 p-5 rounded-3xl border border-slate-200 shadow-sm"
                    >
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-3">
                        {card.label}
                      </p>
                      <p className="text-2xl font-black text-slate-900">
                        {card.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <section className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          Event Categories
                        </p>
                        <p className="text-xs text-slate-500">
                          Distribution of all events by category
                        </p>
                      </div>
                      <span className="text-xs text-slate-400">
                        {dashboardStats.eventsByCategory.length} categories
                      </span>
                    </div>
                    <div className="space-y-3">
                      {dashboardStats.eventsByCategory.map((item) => {
                        const maxCount = Math.max(
                          ...dashboardStats.eventsByCategory.map(
                            (category) => category.count,
                          ),
                          1,
                        );
                        const widthPercentage = Math.round(
                          (item.count / maxCount) * 100,
                        );
                        return (
                          <div key={item.category} className="space-y-2">
                            <div className="flex justify-between text-sm text-slate-600">
                              <span>{item.category}</span>
                              <span className="font-semibold text-slate-800">
                                {item.count}
                              </span>
                            </div>
                            <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
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

                  <section className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          Registration Trend
                        </p>
                        <p className="text-xs text-slate-500">
                          Recent registrations by month
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {dashboardStats.monthlyRegistrations.length === 0 ? (
                        <p className="text-sm text-slate-500">
                          No registration activity in the last 6 months.
                        </p>
                      ) : (
                        dashboardStats.monthlyRegistrations.map((item) => {
                          const maxCount = Math.max(
                            ...dashboardStats.monthlyRegistrations.map(
                              (m) => m.count,
                            ),
                            1,
                          );
                          const widthPercentage = Math.round(
                            (item.count / maxCount) * 100,
                          );
                          return (
                            <div key={item.month} className="space-y-2">
                              <div className="flex justify-between text-sm text-slate-600">
                                <span>{item.month}</span>
                                <span className="font-semibold text-slate-800">
                                  {item.count}
                                </span>
                              </div>
                              <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-slate-800"
                                  style={{ width: `${widthPercentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </section>
                </div>

                <section className="mt-6 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        Top Student Departments
                      </p>
                      <p className="text-xs text-slate-500">
                        Departments with the most registrations
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {dashboardStats.topDepartments.length === 0 ? (
                      <p className="text-sm text-slate-500 col-span-full">
                        No department registration data available.
                      </p>
                    ) : (
                      dashboardStats.topDepartments.map((dept) => (
                        <div
                          key={dept.department}
                          className="rounded-2xl border border-slate-200 p-4 bg-slate-50"
                        >
                          <p className="text-sm text-slate-500">
                            {dept.department || "Unknown"}
                          </p>
                          <p className="mt-2 text-xl font-black text-slate-900">
                            {dept.count}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </>
            )}
          </div>
        )}

        {/* Pending Approvals */}
        {activeTab === "approvals" && (
          <div>
            <h2 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-4 mb-6">
              ✅ Events Awaiting Approval
            </h2>

            {pendingEvents.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <p className="text-4xl mb-3">🎉</p>
                <p className="font-semibold text-sm">
                  No pending events. All caught up!
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {pendingEvents.map((event) => (
                  <div
                    key={event._id}
                    className="border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-start justify-between gap-4 bg-slate-50/50"
                  >
                    <div className="flex-grow">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-xs font-black bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full">
                          {event.category}
                        </span>
                        <span className="text-xs font-extrabold bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full">
                          Pending Review
                        </span>
                      </div>
                      <h3 className="font-extrabold text-slate-900 text-base">
                        {event.title}
                      </h3>
                      <p className="text-sm text-slate-600 mt-2 whitespace-pre-line break-words line-clamp-3">
                        {formatDescription(event.description)}
                      </p>
                      <div className="text-xs text-slate-500 mt-3 flex flex-wrap gap-x-4 gap-y-1">
                        <span>📍 {event.venue}</span>
                        <span>📅 {formatDate(event.date)}</span>
                        <span>👥 Max: {event.maxParticipants}</span>
                        {event.createdBy && (
                          <span>
                            👤 By: {event.createdBy.name} (
                            {event.createdBy.department})
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleApprove(event._id)}
                        disabled={actionLoading === event._id}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition disabled:opacity-50"
                      >
                        {actionLoading === event._id ? "..." : "Approve"}
                      </button>
                      <button
                        onClick={() => {
                          setRejectingEvent(event);
                          setRejectionReason("");
                        }}
                        className="bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-bold px-4 py-2.5 rounded-xl transition"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notifications */}
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

        {/* Profile */}
        {activeTab === "profile" && (
          <div>
            <h2 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-4 mb-5">
              👤 HOD Profile
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-slate-400 uppercase">
                  Full Name
                </span>
                <span className="text-base font-bold text-slate-800">
                  {user.name}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-slate-400 uppercase">
                  Email Address
                </span>
                <span className="text-base font-bold text-slate-800">
                  {user.email}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-slate-400 uppercase">
                  Department
                </span>
                <span className="text-base font-bold text-slate-800">
                  {user.department}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-slate-400 uppercase">
                  Role
                </span>
                <span className="text-base font-bold text-slate-800 capitalize">
                  {user.role}
                </span>
              </div>
            </div>
          </div>
        )}
          </div>
        </main>
      </div>

      {/* Reject Modal */}
      {rejectingEvent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-slate-100 shadow-2xl">
            <h3 className="text-lg font-black text-slate-800 mb-2">
              Reject Event
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Rejecting:{" "}
              <span className="font-semibold text-slate-700">
                {rejectingEvent.title}
              </span>
            </p>
            <form onSubmit={handleReject} className="flex flex-col gap-4">
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                required
                rows={4}
                placeholder="Provide a reason for rejection..."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm resize-none"
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRejectingEvent(null)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-5 py-2.5 rounded-xl transition text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === rejectingEvent._id}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-5 py-2.5 rounded-xl transition text-sm disabled:opacity-50"
                >
                  {actionLoading === rejectingEvent._id
                    ? "Rejecting..."
                    : "Confirm Reject"}
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
