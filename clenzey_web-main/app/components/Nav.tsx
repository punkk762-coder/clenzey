'use client';

import { useNavStore } from '../store/navStore';
import { btnPrimary } from './ui/buttonStyles';
import { NAV_LINKS } from './navLinks';
import Logo from './Logo';

export default function Nav() {
  const navHidden   = useNavStore((s) => s.navHidden);
  const navScrolled = useNavStore((s) => s.navScrolled);
  const menuOpen    = useNavStore((s) => s.menuOpen);
  const toggleMenu  = useNavStore((s) => s.toggleMenu);

  return (
    <nav
      className={[
        'fixed top-0 left-0 right-0 z-1000',
        'border-b border-black/[0.04]',
        'bg-white/90 backdrop-blur-xl',
        'transition-[transform,box-shadow] duration-300',
        navScrolled ? 'shadow-[0_4px_24px_rgba(0,0,0,0.06)]' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="hidden lg:grid max-w-7xl mx-auto px-8 h-[72px] grid-cols-[1fr_auto_1fr] items-center">
        <a href="#" className="inline-flex items-center justify-self-start">
          <Logo height={34} priority />
        </a>

        <div className="flex items-center gap-0.5">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="font-dm font-medium text-[0.9rem] text-ink px-3 py-2 rounded-lg transition-colors duration-200 hover:text-secondary whitespace-nowrap"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-4 justify-self-end">
          <a href="#support" className={`${btnPrimary} whitespace-nowrap`}>
            Contact Us
          </a>
        </div>
      </div>

      <div className="lg:hidden h-14 px-4 sm:px-5 flex items-center justify-between max-w-7xl mx-auto">
        <a href="#" className="inline-flex items-center">
          <Logo height={28} priority />
        </a>
        <button
          className={`hamburger flex flex-col justify-center gap-1.25 cursor-pointer p-2 shrink-0 w-10 h-10 bg-transparent border-none${menuOpen ? ' open' : ''}`}
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </nav>
  );
}
