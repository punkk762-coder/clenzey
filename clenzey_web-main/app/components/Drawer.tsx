'use client';

import { useNavStore } from '../store/navStore';
import { btnPrimary } from './ui/buttonStyles';
import { NAV_LINKS } from './navLinks';
import Logo from './Logo';

export default function Drawer() {
  const open      = useNavStore((s) => s.menuOpen);
  const closeMenu = useNavStore((s) => s.closeMenu);

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/40 z-1100 transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={closeMenu}
      />

      <div
        className={`fixed top-0 right-0 bottom-0 w-[min(100vw,20rem)] bg-white z-1101 px-5 sm:px-7 py-8 flex flex-col shadow-[-12px_0_48px_rgba(0,0,0,0.14)] transition-transform duration-360 ease-in-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between mb-11">
          <Logo height={30} />
          <button
            onClick={closeMenu}
            className="w-9.5 h-9.5 rounded-full border-none bg-surface cursor-pointer flex items-center justify-center text-primary text-[1.2rem] leading-none transition-colors hover:bg-primary-light"
          >
            ✕
          </button>
        </div>

        <nav className="flex flex-col flex-1">
          {NAV_LINKS.map(({ href, label }) => (
            <a
              key={label}
              href={href}
              onClick={closeMenu}
              className="font-jakarta text-[1.05rem] font-semibold text-ink py-3.75 block transition-colors border-b border-border hover:text-primary"
            >
              {label}
            </a>
          ))}
          <a
            href="#support"
            onClick={closeMenu}
            className="font-jakarta text-[1.05rem] font-semibold text-muted py-3.75 block transition-colors border-b border-border hover:text-primary"
          >
            Contact Us
          </a>
        </nav>

        <a
          href="#book"
          onClick={closeMenu}
          className={`${btnPrimary} mt-8 w-full py-3 font-jakarta font-bold text-[0.95rem] text-center`}
        >
          Book Now
        </a>
      </div>
    </>
  );
}
