import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

import Loader from "../components/common/Loader";
import { useToast } from "../hooks/useToast";
import useAuth from "../hooks/useAuth";
import eventService from "../services/eventService";
import registrationService from "../services/registrationService";
import { formatDate } from "../utils/formatDate";
import { formatDescription } from "../utils/formatDescription";

const resolveEventBannerUrl = (url) => {
  if (!url) return "/default-poster.svg";

  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:")
  ) {
    return url;
  }

  if (url.startsWith("/uploads/") || url.startsWith("uploads/")) {
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
    const backendBase = apiUrl.replace(/\/api\/?$/, "");
    return `${backendBase}${url.startsWith("/") ? url : `/${url}`}`;
  }

  return url;
};

const EventDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registrationCount, setRegistrationCount] = useState(0);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [registrationData, setRegistrationData] = useState(null);
  const [countdown, setCountdown] = useState("");
  const [teamMembers, setTeamMembers] = useState([{ name: "", email: "" }]);
  const [transactionId, setTransactionId] = useState("");
  const [paymentScreenshot, setPaymentScreenshot] = useState(null);
  const [paymentScreenshotPreview, setPaymentScreenshotPreview] = useState("");
  const [paymentPending, setPaymentPending] = useState(false);

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
              if (
                user &&
                regRes.data.registrations?.some(
                  (r) =>
                    String(r.studentId?._id || r.studentId) === String(user.id),
                )
              ) {
                setIsRegistered(true);
              }
            }
          } catch (err) {
            console.error("Failed to fetch registration count:", err);
          }
        }
      } catch (err) {
        showToast("Failed to load event details", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [id, user, showToast]);

  useEffect(() => {
    if (event?.registrationType === "team") {
      const desiredCount = Math.max(1, (event.minTeamSize || 2) - 1);
      setTeamMembers(
        Array.from({ length: desiredCount }, () => ({ name: "", email: "" })),
      );
    } else {
      setTeamMembers([{ name: "", email: "" }]);
    }
  }, [event?._id, event?.registrationType, event?.minTeamSize]);

  // Countdown timer
  useEffect(() => {
    if (!event?.date) return;

    const updateCountdown = () => {
      const eventTime = new Date(event.date).getTime();
      const now = new Date().getTime();
      const diff = eventTime - now;

      if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor(
          (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
        );
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setCountdown(`${days}d ${hours}h ${minutes}m`);
      } else {
        setCountdown("Event Started");
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [event?.date]);

  const handleTeamMemberChange = (index, field, value) => {
    setTeamMembers((prev) =>
      prev.map((member, i) =>
        i === index ? { ...member, [field]: value } : member,
      ),
    );
  };

  const addTeamMemberField = () => {
    if (!event || event.registrationType !== "team") return;
    const maxAllowed = event.maxTeamSize || 4;
    if (teamMembers.length >= Math.max(0, maxAllowed - 1)) return;
    setTeamMembers((prev) => [...prev, { name: "", email: "" }]);
  };

  const handleRegister = async () => {
    if (!user) {
      showToast("Please log in to register", "warning");
      navigate("/login");
      return;
    }

    if (isRegistered) {
      showToast("You are already registered for this event", "info");
      return;
    }

    const fee = event?.registrationFee || 0;

    // Paid registrations remain pending until the organizer verifies the proof.
    if (fee > 0 && !transactionId.trim()) {
      showToast(
        "Please enter transaction ID for payment verification",
        "warning",
      );
      return;
    }

    if (fee > 0 && !/^\d{12}$/.test(transactionId.trim())) {
      showToast("Transaction ID must contain exactly 12 digits.", "warning");
      return;
    }

    if (fee > 0 && !paymentScreenshot) {
      showToast(
        "Upload a payment screenshot so the organizer can verify it.",
        "warning",
      );
      return;
    }

    if (event?.registrationType === "team") {
      const validMembers = teamMembers.filter(
        (member) => member.name.trim() || member.email.trim(),
      );
      if (
        validMembers.length + 1 < (event.minTeamSize || 2) ||
        validMembers.length + 1 > (event.maxTeamSize || 4)
      ) {
        showToast(
          `Team size must be between ${event.minTeamSize || 2} and ${event.maxTeamSize || 4} members.`,
          "warning",
        );
        return;
      }

      const invalidMember = validMembers.find(
        (member) => !member.name.trim() || !member.email.trim(),
      );
      if (invalidMember) {
        showToast(
          "Please enter both name and email for each teammate.",
          "warning",
        );
        return;
      }
    }

    setRegistering(true);
    try {
      const res = await registrationService.registerForEvent(
        id,
        event?.registrationType === "team"
          ? teamMembers.filter(
              (member) => member.name.trim() && member.email.trim(),
            )
          : [],
        transactionId,
        paymentScreenshot,
      );
      if (res.success) {
        setRegistrationData(res.data);
        setShowQRModal(true);
        setIsRegistered(fee === 0);
        setPaymentPending(fee > 0);
        setRegistrationCount((prev) => prev + 1);
        if (fee > 0) {
          showToast(
            "Registration submitted! Payment verification pending.",
            "success",
          );
        } else {
          showToast("Successfully registered!", "success");
        }
      }
    } catch (err) {
      showToast(err.response?.data?.error || "Registration failed", "error");
    } finally {
      setRegistering(false);
    }
  };

  const shareEvent = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      showToast("Link copied to clipboard!", "success");
    });
  };

  if (loading) return <Loader />;
  if (!event) return <div className="text-center py-12">Event not found</div>;

  const seatsRemaining = Math.max(0, event.maxParticipants - registrationCount);
  const seatsColor =
    seatsRemaining > 20
      ? "text-green-600"
      : seatsRemaining >= 5
        ? "text-yellow-500"
        : "text-red-500";

  const now = new Date();
  const deadline = event.registrationDeadline
    ? new Date(event.registrationDeadline)
    : null;
  if (deadline && !isNaN(deadline.getTime())) {
    deadline.setHours(23, 59, 59, 999);
  }
  const isDeadlinePassed =
    deadline &&
    !isNaN(deadline.getTime()) &&
    now.getTime() > deadline.getTime();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Prominent Event Poster Header */}
      <div className="max-w-6xl mx-auto px-4 pt-8">
        <div className="relative w-full h-64 sm:h-80 md:h-96 rounded-3xl overflow-hidden shadow-xl bg-slate-900 border border-slate-200 dark:border-slate-700">
          <img
            src={resolveEventBannerUrl(
              event.registrationBannerUrl ||
                event.bannerUrl ||
                "/default-poster.svg",
            )}
            alt={event.title}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = "/default-poster.svg";
            }}
            className="w-full h-full object-contain bg-white dark:bg-slate-800 p-2"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>
          <div className="absolute bottom-6 left-6 right-6 text-white flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <span className="px-3.5 py-1 bg-blue-600/90 text-white rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                  {event.category || "Event"}
                </span>
                {(event.department || event.createdBy?.department) && (
                  <span className="px-3.5 py-1 bg-indigo-600/90 text-white rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                    🏢 {event.department || event.createdBy?.department}
                  </span>
                )}
                {isDeadlinePassed && (
                  <span className="px-3.5 py-1 bg-rose-600/90 text-white rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                    Registration Closed
                  </span>
                )}
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black leading-tight drop-shadow-md">
                {event.title}
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Info Bar */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40 mt-6 shadow-sm">
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
              <p className="font-semibold">{event.time || "9:00 AM"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">📍</span>
            <div>
              <p className="text-xs text-slate-500">Venue</p>
              <p className="font-semibold text-sm">{event.venue || "TBD"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🪑</span>
            <div>
              <p className="text-xs text-slate-500">Seats Available</p>
              <p className={`font-semibold ${seatsColor}`}>
                {seatsRemaining} / {event.maxParticipants}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-8">
            <div>
              <h2 className="text-2xl font-bold mb-4">About this Event</h2>
              <div className="text-slate-700 dark:text-slate-300 mb-6 leading-7 whitespace-pre-line break-words">
                {formatDescription(
                  event.description || "No description available",
                )}
              </div>
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
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {event.createdBy.department}
                      </p>
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
          </div>
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
                  <span>{event.venue || "TBD"}</span>
                </div>
                {event.registrationDeadline && (
                  <div className="flex items-center gap-2">
                    <span>⏰</span>
                    <span>
                      Register by: {formatDate(event.registrationDeadline)}
                    </span>
                  </div>
                )}
              </div>

              {/* Seats Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-2">
                  <span>Registered</span>
                  <span>
                    {registrationCount} / {event.maxParticipants}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{
                      width: `${(registrationCount / event.maxParticipants) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* Countdown */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-slate-700 dark:to-slate-600 rounded-lg p-4 text-center mb-4">
                <p className="text-xs text-slate-600 dark:text-slate-300 mb-1">
                  Starts In
                </p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {countdown}
                </p>
              </div>
            </div>

            {event?.registrationType === "team" && (
              <div className="space-y-3 border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-700/30">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Team Details
                  </p>
                  <button
                    type="button"
                    onClick={addTeamMemberField}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    + Add teammate
                  </button>
                </div>

                {teamMembers.map((member, index) => (
                  <div key={index} className="space-y-2">
                    <input
                      type="text"
                      value={member.name}
                      placeholder={`Teammate ${index + 1} name`}
                      onChange={(e) =>
                        handleTeamMemberChange(index, "name", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <input
                      type="email"
                      value={member.email}
                      placeholder={`Teammate ${index + 1} email`}
                      onChange={(e) =>
                        handleTeamMemberChange(index, "email", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                ))}
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Team size: {event.minTeamSize || 2} - {event.maxTeamSize || 4}{" "}
                  members
                </p>
              </div>
            )}

            {/* Payment Info for Paid Events */}
            {event?.registrationFee > 0 && (
              <div className="space-y-3 border border-amber-200 dark:border-amber-700 rounded-xl p-3 bg-amber-50 dark:bg-amber-950/30">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                  💰 Payment Required
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Registration Fee:{" "}
                  <span className="font-bold text-amber-700 dark:text-amber-300">
                    ₹{event.registrationFee}
                  </span>
                </p>
                {event.paymentNumber ? (
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border-2 border-amber-300 dark:border-amber-600">
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                      📱 Pay to this number/UPI ID:
                    </p>
                    <p className="text-lg font-mono font-bold text-amber-700 dark:text-amber-300">
                      {event.paymentNumber}
                    </p>
                  </div>
                ) : (
                  <div className="bg-rose-50 dark:bg-rose-950/30 rounded-lg p-3 border border-rose-200 dark:border-rose-700">
                    <p className="text-xs text-rose-700 dark:text-rose-300">
                      ⚠️ Payment contact not set by event organizer. Please
                      contact them for payment details.
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <input
                    type="text"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="Enter Transaction ID / UPI Reference *"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                  <div className="border-2 border-dashed border-slate-200 rounded-lg p-2 text-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setPaymentScreenshot(file);
                          setPaymentScreenshotPreview(
                            URL.createObjectURL(file),
                          );
                        }
                      }}
                      className="hidden"
                      id="payment-screenshot"
                    />
                    <label
                      htmlFor="payment-screenshot"
                      className="cursor-pointer"
                    >
                      {paymentScreenshotPreview ? (
                        <img
                          src={paymentScreenshotPreview}
                          alt="Payment proof"
                          className="w-full h-24 object-cover rounded"
                        />
                      ) : (
                        <div className="text-xs text-slate-500">
                          <span className="text-lg">📸</span>
                          <p>Upload payment screenshot (optional)</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Register Button */}
            <button
              onClick={handleRegister}
              disabled={
                isRegistered ||
                paymentPending ||
                registering ||
                seatsRemaining === 0 ||
                isDeadlinePassed
              }
              className={`w-full py-3 rounded-lg font-semibold transition ${
                isRegistered
                  ? "bg-slate-300 dark:bg-slate-700 text-slate-600 cursor-not-allowed"
                  : isDeadlinePassed
                    ? "bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 cursor-not-allowed"
                    : seatsRemaining === 0
                      ? "bg-slate-300 dark:bg-slate-700 text-slate-600 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {registering
                ? "Registering..."
                : paymentPending
                  ? "Payment Verification Pending"
                  : isRegistered
                    ? "✓ Already Registered"
                    : isDeadlinePassed
                      ? "❌ Registration Closed"
                      : seatsRemaining === 0
                        ? "Seats Full"
                        : event?.registrationType === "team"
                          ? "Register Team"
                          : "Register Now"}
            </button>

            {/* Share Buttons */}
            <div className="flex gap-2">
              <button
                onClick={shareEvent}
                className="flex-1 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition text-sm font-semibold"
              >
                📋 Copy Link
              </button>
              {event.whatsappGroupLink ? (
                <a
                  href={event.whatsappGroupLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition text-sm font-semibold text-center"
                >
                  💬 Join WhatsApp Group
                </a>
              ) : (
                <button
                  disabled
                  title="The teacher has not added a WhatsApp group link yet"
                  className="flex-1 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-400 dark:text-slate-500 text-sm font-semibold cursor-not-allowed"
                >
                  💬 WhatsApp Group Unavailable
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Registration confirmation modal */}
      {showQRModal && registrationData && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-8 max-w-sm w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">
                {registrationData.paymentStatus === "pending"
                  ? "Registration Submitted! ⏳"
                  : "Registration Successful! 🎉"}
              </h2>
              <button
                onClick={() => setShowQRModal(false)}
                className="text-2xl hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {registrationData.paymentStatus === "pending" ? (
              <div className="text-center mb-6">
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700 rounded-lg p-4 mb-4">
                  <p className="text-amber-800 dark:text-amber-200 font-semibold mb-2">
                    ⏳ Payment Pending
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Your registration has been submitted and is pending payment
                    verification. You will receive your QR code once the payment
                    is confirmed by the event coordinator.
                  </p>
                </div>
                <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-4 text-sm">
                  <p className="text-slate-600 dark:text-slate-300 mb-1">
                    <strong>Name:</strong> {user?.name}
                  </p>
                  <p className="text-slate-600 dark:text-slate-300">
                    <strong>Event:</strong> {event.title}
                  </p>
                  <p className="text-slate-600 dark:text-slate-300">
                    <strong>Transaction ID:</strong> {transactionId}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center mb-6">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  You are registered for this event.
                </p>
              </div>
            )}

            {registrationData.paymentStatus !== "pending" && (
              <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-4 mb-6 text-sm">
                <p className="text-slate-600 dark:text-slate-300 mb-1">
                  <strong>Name:</strong> {user?.name}
                </p>
                <p className="text-slate-600 dark:text-slate-300">
                  <strong>Event:</strong> {event.title}
                </p>
              </div>
            )}

            {event.whatsappGroupLink &&
              registrationData.paymentStatus !== "pending" && (
                <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-4 mb-6 text-sm">
                  <p className="text-emerald-800 dark:text-emerald-200 font-semibold mb-2">
                    📱 Join the WhatsApp Group
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 mb-3">
                    Stay updated with event announcements and connect with other
                    participants.
                  </p>
                  <a
                    href={event.whatsappGroupLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-4 py-2 rounded-lg transition"
                  >
                    <span>💬</span>
                    <span>Join WhatsApp Group</span>
                  </a>
                </div>
              )}

            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowQRModal(false);
                  navigate("/#events");
                }}
                className="w-full border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 py-3 px-4 rounded-lg font-semibold transition flex items-center justify-start gap-2"
              >
                <span aria-hidden="true" className="text-sm">
                  🏠
                </span>
                <span>Back to Home / Upcoming Events</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventDetailsPage;
