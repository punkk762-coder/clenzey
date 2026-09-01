'use client';

import { useState } from 'react';
import Logo from './Logo';
import { openAppStore } from '../../lib/apps';

const SERVICE_LINKS = [
  'Bathroom Cleaning',
  'Kitchen Cleaning',
  'Deep Home Cleaning',
  'Express Clean',
];

const COMPANY_LINKS = [
  { label: 'Terms of Service', href: '/terms' },
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Safety Guarantee', href: '/safety-guarantee' },
  { label: 'Contact Support', href: '/#support' },
];

const SOCIAL_ICONS = [
  { name: 'LinkedIn', href: 'https://www.linkedin.com/company/clenzey/', icon: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z', color: '#0A66C2' },
  { name: 'Instagram', href: 'https://www.instagram.com/tryclenzey', icon: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z', color: '#E4405F' },
  { name: 'Facebook', href: 'https://www.facebook.com/people/Clenzey/61589435555718/', icon: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z', color: '#1877F2' },
];

export default function Footer() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <footer className="bg-primary-faint">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-12 sm:pt-14 pb-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 lg:gap-8">
          {/* Brand */}
          <div>
            <a href="#" className="inline-flex items-center mb-4">
              <Logo height={32} />
            </a>
            <p className="text-sm text-muted leading-7 mb-5 max-w-[240px]">
              Professional care for your home. Standardizing domestic cleaning through technology and trust.
            </p>
            <div className="flex gap-2">
              {SOCIAL_ICONS.map(({ name, href, icon, color }) => (
                <a
                  key={name}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={name}
                  className="w-8 h-8 rounded-full text-white flex items-center justify-center transition-all hover:opacity-80 shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
                  style={{ backgroundColor: color }}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                    <path d={icon} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Cleaning Services */}
          <div>
            <p className="font-jakarta text-sm font-bold text-ink mb-4">Cleaning Services</p>
            <ul className="space-y-2.5">
              {SERVICE_LINKS.map((link) => (
                <li key={link}>
                  <a href="#services" className="text-sm text-muted transition hover:text-primary">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <p className="font-jakarta text-sm font-bold text-ink mb-4">Company</p>
            <ul className="space-y-2.5">
              {COMPANY_LINKS.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-muted transition hover:text-primary">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Book on the go */}
          <div>
            <p className="font-jakarta text-sm font-bold text-ink mb-2">Book on the go</p>
            <p className="text-sm text-muted leading-6 mb-4 max-w-[220px]">
              Download the Clenzey app for the fastest booking experience.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => openAppStore('ios')}
                className="inline-flex items-center gap-2 bg-[#000000] px-4 py-2 rounded-lg text-white text-sm shadow-[0_4px_14px_rgba(0,0,0,0.2)] transition hover:bg-[#1a1a1a] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">smartphone</span>
                App Store
              </button>
              <button
                type="button"
                onClick={() => openAppStore('android')}
                className="inline-flex items-center gap-2 bg-[#01875f] px-4 py-2 rounded-lg text-white text-sm shadow-[0_4px_14px_rgba(1,135,95,0.3)] transition hover:bg-[#017a56] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">shop</span>
                Play Store
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-border/50">
          <div className="max-w-7xl mx-auto px-6 md:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted">
            <p>&copy; 2026 Clenzey Home Services. Professional care for your home.</p>
            <p>Made with care for your home.</p>
          </div>
        </div>
      </footer>

      {/* Coming Soon Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-[0_20px_60px_rgba(0,0,0,0.15)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex justify-center mb-5">
              <Logo height={36} />
            </div>
            <h3 className="font-jakarta font-bold text-ink text-xl mb-3">
              Coming Soon!
            </h3>
            <p className="text-muted text-sm leading-relaxed mb-6">
              We&apos;re working hard to bring you the Clenzey mobile app. Stay tuned for the easiest way to book cleaning services on the go. We&apos;ll notify you as soon as it&apos;s available!
            </p>
            <button
              onClick={() => setShowModal(false)}
              className="inline-flex items-center justify-center rounded-lg bg-primary-container text-white px-6 py-2.5 text-sm font-semibold hover:opacity-90 transition"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
