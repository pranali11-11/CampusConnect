import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Toast from '../components/common/Toast';
import SkeletonCard from '../components/common/SkeletonCard';
import useCountUp from '../hooks/useCountUp';
import { formatDate } from '../utils/formatDate';

const STATS = [
  { label: 'Students', value: 5000, suffix: '+' },
  { label: 'Events', value: 200, suffix: '+' },
  { label: 'Coordinators', value: 50, suffix: '+' },
  { label: 'Departments', value: 20, suffix: '' },
];

const TESTIMONIALS = [
  {
    name: 'Priya Sharma',
    department: 'Computer Science',
    initials: 'PS',
    rating: 5,
    review: 'CampusConnect made registering for hackathons effortless. I never miss a deadline now!',
  },
  {
    name: 'Arjun Mehta',
    department: 'Mechanical Engineering',
    initials: 'AM',
    rating: 5,
    review: 'As an event coordinator, managing participants and attendance has never been this smooth.',
  },
  {
    name: 'Dr. Kavitha Nair',
    department: 'Head of Department',
    initials: 'KN',
    rating: 5,
    review: 'Approving events and tracking department activities is streamlined. A must-have for every college.',
  },
  {
    name: 'Rahul Verma',
    department: 'Electronics & Communication',
    initials: 'RV',
    rating: 4,
    review: 'The gallery feature lets us relive every fest moment. Students love browsing past event photos.',
  },
];

const StatCard = ({ label, value, suffix, animate }) => {
  const count = useCountUp(value, 2000, animate);
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 text-center shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
      <p className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
        {count.toLocaleString()}{suffix}
      </p>
      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-2 uppercase tracking-wider">
        {label}
      </p>
    </div>
  );
};

const LandingPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statsVisible, setStatsVisible] = useState(false);
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const statsRef = useRef(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await api.get('/events', {
          params: { limit: 3, status: 'approved' },
        });
        if (response.data.success) {
          setEvents(response.data.data.slice(0, 3));
        }
      } catch (err) {
        console.error('Error fetching events:', err);
        const isBackendUnavailable =
          err?.code === 'ERR_CONNECTION_REFUSED' ||
          err?.message === 'Network Error';
        setError(
          isBackendUnavailable
            ? 'Backend unavailable (server not reachable). Please try again in a moment.'
            : 'Failed to load upcoming events. Please try again later.'
        );
      } finally {
        setLoading(false);
      }

    };

    fetchEvents();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setStatsVisible(true);
      },
      { threshold: 0.3 }
    );

    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const getTargetDate = () => {
      if (events.length > 0 && events[0].date) {
        return new Date(events[0].date);
      }
      const fallback = new Date();
      fallback.setDate(fallback.getDate() + 30);
      return fallback;
    };

    const updateCountdown = () => {
      const target = getTargetDate();
      const now = new Date();
      const diff = target - now;

      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      setCountdown({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [events]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTestimonialIndex((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const countdownUnits = [
    { label: 'Days', value: countdown.days },
    { label: 'Hours', value: countdown.hours },
    { label: 'Minutes', value: countdown.minutes },
    { label: 'Seconds', value: countdown.seconds },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-white to-secondary/10 dark:from-slate-900 dark:via-slate-900 dark:to-primary/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 lg:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="flex flex-col gap-6 z-10">
              <span className="inline-flex w-fit items-center gap-2 bg-primary/10 dark:bg-primary/20 text-primary dark:text-secondary text-xs font-bold tracking-widest px-4 py-1.5 rounded-full uppercase">
                College Event Platform
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white leading-tight">
                Manage College Events{' '}
                <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  Smarter
                </span>
              </h1>
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-lg">
                Discover, register, and participate in technical hackathons, cultural fests, sports meets, and workshops — all in one place built for students, teachers, and departments.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href="#events"
                  className="inline-flex justify-center items-center bg-primary hover:bg-blue-700 text-white font-semibold px-8 py-3.5 rounded-full transition shadow-lg shadow-primary/25"
                >
                  Explore Events
                </a>
                <Link
                  to="/register"
                  className="inline-flex justify-center items-center border-2 border-primary text-primary dark:text-secondary dark:border-secondary hover:bg-primary hover:text-white dark:hover:bg-secondary dark:hover:text-slate-900 font-semibold px-8 py-3.5 rounded-full transition"
                >
                  Register Now
                </Link>
              </div>
            </div>

            {/* Floating blobs */}
            <div className="relative h-72 sm:h-80 lg:h-96 flex items-center justify-center">
              <svg className="blob blob-1 absolute w-48 h-48 sm:w-64 sm:h-64 text-primary/30 dark:text-primary/20" viewBox="0 0 200 200">
                <path fill="currentColor" d="M44.7,-76.4C55.9,-69.2,62.7,-54.1,70.3,-39.6C77.9,-25.1,86.3,-11.2,85.8,2.5C85.3,16.2,75.9,29.7,66.1,42.1C56.3,54.5,46.1,65.8,33.2,73.4C20.3,81,-0.2,84.9,-19.8,80.5C-39.4,76.1,-58.1,63.4,-68.8,46.8C-79.5,30.2,-82.2,9.7,-78.1,-8.9C-74,-27.5,-63.1,-44.2,-49.3,-52.8C-35.5,-61.4,-18.8,-61.9,-2.1,-58.5C14.6,-55.1,33.5,-83.6,44.7,-76.4Z" transform="translate(100 100)" />
              </svg>
              <svg className="blob blob-2 absolute w-40 h-40 sm:w-52 sm:h-52 text-secondary/40 dark:text-secondary/25" viewBox="0 0 200 200">
                <path fill="currentColor" d="M37.1,-63.2C47.8,-55.8,55.8,-43.2,63.1,-30.5C70.4,-17.8,77,-5,76.3,7.4C75.6,19.8,67.6,31.8,57.8,42.4C48,53,36.4,62.2,23.1,67.1C9.8,72,-5.2,72.6,-19.5,68.8C-33.8,65,-47.4,56.8,-57.8,45.2C-68.2,33.6,-75.4,18.6,-76.1,2.9C-76.8,-12.8,-71,-28.2,-61.2,-40.8C-51.4,-53.4,-37.6,-63.2,-22.8,-67.8C-8,-72.4,8,-71.8,22.4,-66.2C36.8,-60.6,26.4,-70.6,37.1,-63.2Z" transform="translate(100 100)" />
              </svg>
              <svg className="blob blob-3 absolute w-32 h-32 sm:w-44 sm:h-44 text-accent/35 dark:text-accent/25" viewBox="0 0 200 200">
                <path fill="currentColor" d="M39.5,-65.8C50.4,-58.9,57.8,-45.2,64.5,-31.3C71.2,-17.4,77.2,-3.3,75.8,10.2C74.4,23.7,65.6,36.6,55.3,47.8C45,59,33.2,68.5,19.8,72.8C6.4,77.1,-8.6,76.2,-22.8,71.1C-37,66,-50.4,56.7,-60.1,44.2C-69.8,31.7,-75.8,16,-75.2,0.6C-74.6,-14.8,-67.4,-29.6,-57.1,-41.1C-46.8,-52.6,-33.4,-60.8,-19.2,-65.1C-5,-69.4,9.9,-69.8,23.5,-65.5C37.1,-61.2,28.6,-72.7,39.5,-65.8Z" transform="translate(100 100)" />
              </svg>
              <div className="relative z-10 w-48 h-48 sm:w-56 sm:h-56 rounded-3xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-2xl shadow-primary/30">
                <span className="text-6xl sm:text-7xl">🎓</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section ref={statsRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {STATS.map((stat) => (
            <StatCard key={stat.label} {...stat} animate={statsVisible} />
          ))}
        </div>
      </section>

      {/* Countdown */}
      <section className="bg-gradient-to-r from-primary to-accent py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
            Next Big Event Starts In
          </h2>
          <p className="text-white/70 text-sm mb-8">
            {events.length > 0 ? events[0].title : 'Upcoming Campus Fest'}
          </p>
          <div className="grid grid-cols-4 gap-3 sm:gap-6 max-w-lg mx-auto">
            {countdownUnits.map((unit) => (
              <div key={unit.label} className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 sm:p-4 border border-white/20">
                <p className="text-2xl sm:text-4xl font-bold text-white tabular-nums">
                  {String(unit.value).padStart(2, '0')}
                </p>
                <p className="text-[10px] sm:text-xs font-semibold text-white/70 uppercase tracking-wider mt-1">
                  {unit.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Upcoming Events */}
      <section id="events" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white">
            Upcoming Events
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm sm:text-base">
            Don&apos;t miss out on the latest happenings around campus
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : error ? (
          <div className="text-center py-16 bg-white dark:bg-slate-800 border border-rose-100 dark:border-rose-900/50 rounded-2xl">
            <p className="text-4xl mb-3">⚠️</p>
            <p className="text-rose-600 dark:text-rose-400 font-semibold">{error}</p>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl">
            <p className="text-4xl mb-3">📅</p>
            <p className="text-slate-600 dark:text-slate-400 font-semibold">No upcoming events right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {events.map((event) => (
              <div
                key={event._id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col group hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                <div className="relative h-44 sm:h-48 overflow-hidden bg-slate-200 dark:bg-slate-700">
                  <img
                    src={event.bannerUrl || "/placeholder.jpg"}
                    alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  <span className="absolute top-3 left-3 bg-white/95 dark:bg-slate-900/90 text-slate-800 dark:text-white text-xs font-bold px-3 py-1 rounded-full">
                    {event.category}
                  </span>
                </div>
                <div className="p-5 flex flex-col flex-grow gap-3">
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-snug group-hover:text-primary transition-colors">
                    {event.title}
                  </h3>
                  <div className="flex flex-col gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                    <span>📅 {formatDate(event.date)}</span>
                    <span>📍 {event.venue}</span>
                  </div>
                  <Link
                    to={`/events/${event._id}`}
                    className="mt-auto w-full text-center bg-primary hover:bg-blue-700 text-white text-sm font-semibold py-2.5 rounded-xl transition"
                  >
                    Register
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Testimonials */}
      <section className="bg-white dark:bg-slate-800/50 py-16 md:py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-10">
            What Our Community Says
          </h2>

          <div className="bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-8 sm:p-10 shadow-sm min-h-[220px] flex flex-col items-center justify-center transition-all duration-500">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-lg mb-4">
              {TESTIMONIALS[testimonialIndex].initials}
            </div>
            <div className="flex gap-0.5 mb-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className={i < TESTIMONIALS[testimonialIndex].rating ? 'text-amber-400' : 'text-slate-300 dark:text-slate-600'}
                >
                  ★
                </span>
              ))}
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed italic max-w-lg">
              &ldquo;{TESTIMONIALS[testimonialIndex].review}&rdquo;
            </p>
            <p className="mt-4 font-bold text-slate-900 dark:text-white">
              {TESTIMONIALS[testimonialIndex].name}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {TESTIMONIALS[testimonialIndex].department}
            </p>
          </div>

          <div className="flex justify-center gap-2 mt-6">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                onClick={() => setTestimonialIndex(i)}
                aria-label={`Go to testimonial ${i + 1}`}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  i === testimonialIndex
                    ? 'bg-primary w-6'
                    : 'bg-slate-300 dark:bg-slate-600 hover:bg-slate-400'
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      <Toast />
    </div>
  );
};

export default LandingPage;
