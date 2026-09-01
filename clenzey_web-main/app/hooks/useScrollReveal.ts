'use client';

import { useEffect, useCallback } from 'react';

/** Toggles .revealed on elements with .reveal / .reveal-left / .reveal-right on scroll */
export function useScrollReveal() {
  const reveal = useCallback(() => {
    const els = document.querySelectorAll<HTMLElement>('.reveal, .reveal-left, .reveal-right');
    const h = window.innerHeight;
    els.forEach((el) => {
      if (el.getBoundingClientRect().top < h - 60) el.classList.add('revealed');
    });
  }, []);

  useEffect(() => {
    reveal();
    window.addEventListener('scroll', reveal, { passive: true });
    return () => window.removeEventListener('scroll', reveal);
  }, [reveal]);
}
