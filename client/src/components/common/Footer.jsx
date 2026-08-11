import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      setSubmitted(false);
      return;
    }
    setError('');
    setSubmitted(true);
    setEmail('');
  };

  return (
    <footer className="bg-slate-900 dark:bg-slate-950 text-slate-400 border-t border-slate-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {/* Quick Links */}
          <div>
            <h4 className="text-white text-sm font-semibold uppercase tracking-wider mb-4">
              Quick Links
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/" className="hover:text-secondary transition">Home</Link>
              </li>
              <li>
                <Link to="/#events" className="hover:text-secondary transition">Events</Link>
              </li>
              <li>
                <Link to="/gallery" className="hover:text-secondary transition">Gallery</Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-secondary transition">Contact</Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-secondary transition">Register</Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-white text-sm font-semibold uppercase tracking-wider mb-4">
              Contact Info
            </h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <span>📍</span>
                <span>Campus Admin Block, Room 101<br />College Campus, India</span>
              </li>
              <li className="flex items-center gap-2">
                <span>📧</span>
                <a href="mailto:support@campusconnect.edu" className="hover:text-white transition">
                  support@campusconnect.edu
                </a>
              </li>
              <li className="flex items-center gap-2">
                <span>📞</span>
                <span>+91 98765 43210</span>
              </li>
            </ul>
          </div>

          {/* Social + Newsletter */}
          <div>
            <h4 className="text-white text-sm font-semibold uppercase tracking-wider mb-4">
              Stay Connected
            </h4>
            <div className="flex gap-3 mb-6">
              {['GitHub', 'Twitter', 'LinkedIn', 'Instagram'].map((social) => (
                <a
                  key={social}
                  href="#"
                  aria-label={social}
                  className="w-9 h-9 rounded-full bg-slate-800 hover:bg-primary flex items-center justify-center text-xs font-bold text-white transition"
                >
                  {social[0]}
                </a>
              ))}
            </div>

            <p className="text-xs text-slate-500 mb-3">Subscribe to our newsletter</p>
            <form onSubmit={handleNewsletterSubmit} className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setSubmitted(false); setError(''); }}
                  placeholder="your@email.com"
                  className="flex-grow px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button
                  type="submit"
                  className="bg-primary hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition shrink-0"
                >
                  Join
                </button>
              </div>
              {error && <p className="text-xs text-rose-400">{error}</p>}
              {submitted && (
                <p className="text-xs text-emerald-400">Thanks for subscribing!</p>
              )}
            </form>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-10 pt-6 text-center text-xs text-slate-500">
          <p>&copy; {currentYear} CampusConnect. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
