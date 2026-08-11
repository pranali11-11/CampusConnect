import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import registrationService from '../services/registrationService';

const ContactPage = () => {
  const { showToast } = useToast();

  const initialForm = useMemo(
    () => ({
      name: '',
      email: '',
      subject: '',
      message: '',
    }),
    []
  );

  const [formData, setFormData] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const [openIndex, setOpenIndex] = useState(null); // null = all closed

  const subjectOptions = [
    'General Inquiry',
    'Event Query',
    'Certificate Issue',
    'Technical Support',
    'Other',
  ];

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear field error as user types
    setErrors((prev) => ({
      ...prev,
      [name]: undefined,
    }));
  };

  const validate = () => {
    const nextErrors = {};

    const name = formData.name.trim();
    const email = formData.email.trim();
    const subject = formData.subject;
    const message = formData.message;

    if (!name) nextErrors.name = 'Full Name is required.';

    if (!emailRegex.test(email)) nextErrors.email = 'Please enter a valid email address.';

    if (!subject) nextErrors.subject = 'Please select a subject.';

    if (message.length < 10) nextErrors.message = 'Message must be at least 10 characters.';
    if (message.length > 500) nextErrors.message = 'Message must be at most 500 characters.';

    return nextErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const nextErrors = validate();
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setLoading(true);
    try {
      // Backend expects { name, email, subject, message, submittedAt(optional) }
      const response = await registrationService.submitContact(formData);

      if (response?.success) {
        showToast('Message received! We will get back to you soon.', 'success');
        setErrors({});
        setFormData(initialForm);
      } else {
        showToast('Failed to send message.', 'error');
      }
    } catch (error) {
      const errorMsg =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        'Failed to send message.';
      showToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const faqItems = useMemo(
    () => [
      {
        question: 'How quickly will I receive a response?',
        answer:
          'We typically respond within 24–48 hours during working days. If your query is urgent, choose “Technical Support” or “Event Query” to help us route it faster.',
      },
      {
        question: 'What should I include in my message?',
        answer:
          'Please include relevant details such as event name (if applicable), your role (student/teacher/HOD), and any screenshots or steps to reproduce technical issues.',
      },
      {
        question: 'Where can I raise a certificate-related issue?',
        answer:
          'Select “Certificate Issue” in the Subject dropdown and mention your registration ID or event name for quicker verification.',
      },
      {
        question: 'I’m having trouble registering for an event. Who should I contact?',
        answer:
          'Use “Event Query” for registration problems. Include the event name and what step fails.',
      },
      {
        question: 'Do I need an account to submit this form?',
        answer:
          'No auth is required to send contact messages. You can submit the form publicly.',
      },
      {
        question: 'Can I request changes to event details?',
        answer:
          'Yes. Use “General Inquiry” and include the exact change request. Our team will review it and get back to you.',
      },
      {
        question: 'How do you handle privacy of my message?',
        answer:
          'We store your message in the ContactMessage collection to help respond to your inquiry. Do not share sensitive information beyond what is necessary.',
      },
      {
        question: 'What if my issue is not listed in the subject options?',
        answer:
          'Choose “Other” and describe your issue clearly—we’ll route it to the relevant team.',
      },
    ],
    []
  );

  const messageCharCount = formData.message.length;

  return (
    <div className="flex-grow bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="relative">
        <section className="bg-gradient-to-br from-slate-900 to-secondary text-white py-14 px-4 text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold">Get In Touch</h1>
          <p className="text-slate-300 mt-2 text-sm max-w-lg mx-auto">
            Have questions, feedback, or need support? Send us a message and we’ll get back to you.
          </p>
        </section>

        <div className="absolute left-0 right-0 bottom-[-18px]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white/90 dark:bg-slate-900/60 backdrop-blur rounded-2xl border border-slate-200/70 dark:border-slate-700/60 px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <Link to="/" className="hover:text-primary font-semibold">
                  Home
                </Link>
                <span className="text-slate-400">/</span>
                <span className="font-semibold text-primary">Contact</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-start">
          {/* LEFT 60% */}
          <div className="lg:col-span-3">
            <form
              onSubmit={handleSubmit}
              className="bg-white/95 dark:bg-slate-800/40 backdrop-blur border border-slate-200/70 dark:border-slate-700/60 rounded-3xl p-8 shadow-sm"
            >
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Send a message</h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                  We’ll route your query to the right team.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5">
                {/* Full Name */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="John Doe"
                    className={`mt-2 w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
                      errors.name
                        ? 'border-rose-500'
                        : 'border-slate-200 dark:border-slate-700'
                    } bg-white dark:bg-slate-900`}
                    disabled={loading}
                  />
                  {errors.name && (
                    <p className="mt-2 text-xs text-rose-600 font-semibold">{errors.name}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="john@college.edu"
                    className={`mt-2 w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
                      errors.email
                        ? 'border-rose-500'
                        : 'border-slate-200 dark:border-slate-700'
                    } bg-white dark:bg-slate-900`}
                    disabled={loading}
                  />
                  {errors.email && (
                    <p className="mt-2 text-xs text-rose-600 font-semibold">{errors.email}</p>
                  )}
                </div>

                {/* Subject */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Subject
                  </label>
                  <select
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    className={`mt-2 w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
                      errors.subject
                        ? 'border-rose-500'
                        : 'border-slate-200 dark:border-slate-700'
                    } bg-white dark:bg-slate-900`}
                    disabled={loading}
                  >
                    <option value="" disabled>
                      Select a subject...
                    </option>
                    {subjectOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  {errors.subject && (
                    <p className="mt-2 text-xs text-rose-600 font-semibold">{errors.subject}</p>
                  )}
                </div>

                {/* Message */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Message
                    </label>
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {messageCharCount} / 500
                    </span>
                  </div>

                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={6}
                    maxLength={500}
                    placeholder="Describe your query in detail..."
                    className={`mt-2 w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none ${
                      errors.message
                        ? 'border-rose-500'
                        : 'border-slate-200 dark:border-slate-700'
                    } bg-white dark:bg-slate-900`}
                    disabled={loading}
                  />

                  {errors.message && (
                    <p className="mt-2 text-xs text-rose-600 font-semibold">{errors.message}</p>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 bg-primary hover:bg-blue-700 text-white font-extrabold py-3.5 rounded-xl transition shadow-md shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  {loading ? (
                    <>
                      <span
                        className="inline-block w-5 h-5 border-2 border-white/70 border-t-white rounded-full animate-spin"
                        aria-hidden="true"
                      />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <span>Send Message</span>
                  )}
                </button>
              </div>
            </form>

            {/* FAQ */}
            <div className="mt-10">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-5">FAQ</h3>
              <div className="space-y-3">
                {faqItems.map((item, i) => {
                  const isOpen = openIndex === i;
                  return (
                    <div key={i} className="bg-white/95 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 rounded-2xl overflow-hidden">
                      <button
                        type="button"
                        className="w-full flex items-center justify-between px-5 py-4 text-left"
                        onClick={() => setOpenIndex((prev) => (prev === i ? null : i))}
                      >
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {item.question}
                        </span>
                        <span
                          className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'}`}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 text-primary"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </span>
                      </button>

                      <div
                        className={`transition-all duration-300 ${isOpen ? 'max-h-96' : 'max-h-0'} overflow-hidden`}
                      >
                        <div className="px-5 pb-5">
                          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                            {item.answer}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT 40% */}
          <div className="lg:col-span-2">
            <div className="bg-white/80 backdrop-blur border border-slate-200/70 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-5">Contact Information</h3>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">📍</div>
                  <div>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Address</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      IIT Bombay, Main Admin Block, Room 101
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="text-2xl">📞</div>
                  <div>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Phone</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">+91 98765 43210</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="text-2xl">✉️</div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Email</p>
                    <a
                      href="mailto:support@campusconnect.edu"
                      className="text-sm text-primary font-semibold hover:underline break-all"
                    >
                      support@campusconnect.edu
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="text-2xl">🕒</div>
                  <div>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Working Hours</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">Mon–Fri, 10:00 AM – 5:00 PM</p>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">Follow Us</p>
                <div className="flex flex-col gap-3">
                  {/* LinkedIn */}
                  <a
                    href="#"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200/70 hover:border-primary/60 hover:text-primary transition"
                  >
                    <span className="text-xl">in</span>
                    <span className="font-semibold text-sm">LinkedIn</span>
                  </a>

                  {/* Instagram */}
                  <a
                    href="#"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200/70 hover:border-primary/60 hover:text-primary transition"
                  >
                    <span className="text-xl">📷</span>
                    <span className="font-semibold text-sm">Instagram</span>
                  </a>

                  {/* Twitter/X */}
                  <a
                    href="#"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200/70 hover:border-primary/60 hover:text-primary transition"
                  >
                    <span className="text-xl">𝕏</span>
                    <span className="font-semibold text-sm">Twitter</span>
                  </a>
                </div>
              </div>

              <div className="mt-6">
                <iframe
                  src="https://maps.google.com/maps?q=IIT+Bombay&output=embed"
                  width="100%"
                  height="350"
                  style={{ borderRadius: '12px', border: 'none' }}
                  loading="lazy"
                  title="IIT Bombay Map"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContactPage;

