'use client';

import { useEffect, useRef } from 'react';
import { useNavStore } from '../store/navStore';

/** Wires window scroll → navStore (hide/show/scrolled) and hero visibility */
export function useNavEffect() {
  const setNavHidden   = useNavStore((s) => s.setNavHidden);
  const setNavScrolled = useNavStore((s) => s.setNavScrolled);
  const setHeroVisible = useNavStore((s) => s.setHeroVisible);
  const lastY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (y < 80) {
        setNavHidden(false);
      } else if (y > lastY.current + 4) {
        setNavHidden(true);
      } else if (y < lastY.current - 4) {
        setNavHidden(false);
      }
      lastY.current = y;
      setNavScrolled(y > 30);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [setNavHidden, setNavScrolled]);

  useEffect(() => {
    const hero = document.getElementById('hero');
    if (!hero) return;
    const obs = new IntersectionObserver(
      ([entry]) => setHeroVisible(entry.isIntersecting),
      { threshold: 0.05 }
    );
    obs.observe(hero);
    return () => obs.disconnect();
  }, [setHeroVisible]);
}
