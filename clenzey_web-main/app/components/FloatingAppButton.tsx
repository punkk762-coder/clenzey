'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getMobilePlatform, openAppStore, type MobilePlatform } from '../../lib/apps';
import { useNavStore } from '../store/navStore';

export default function FloatingAppButton() {
  const menuOpen = useNavStore((s) => s.menuOpen);
  const [platform, setPlatform] = useState<MobilePlatform>('other');
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    setPlatform(getMobilePlatform());
  }, []);

  const handleClick = () => {
    if (platform === 'other') {
      setShowPicker((prev) => !prev);
      return;
    }
    openAppStore(platform);
  };

  if (menuOpen) return null;

  const label = 'Download App';

  return (
    <div className="fixed bottom-[max(0.875rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-[1050] flex flex-col items-center gap-2">
      <AnimatePresence>
        {showPicker && platform === 'other' && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl bg-white border border-border/60 shadow-[0_8px_32px_rgba(0,0,0,0.14)] p-1.5 min-w-[168px]"
          >
            <button
              type="button"
              onClick={() => openAppStore('ios')}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-ink hover:bg-primary-faint transition-colors"
            >
              <span className="material-symbols-outlined text-[18px] text-primary">phone_iphone</span>
              App Store
            </button>
            <button
              type="button"
              onClick={() => openAppStore('android')}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-ink hover:bg-primary-faint transition-colors"
            >
              <span className="material-symbols-outlined text-[18px] text-primary">android</span>
              Play Store
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={handleClick}
        aria-label="Download Clenzey app"
        className="inline-flex items-center gap-2 rounded-full bg-primary text-white pl-3 pr-4 py-2 text-[13px] font-semibold shadow-[0_6px_20px_rgba(0,119,182,0.45),0_2px_8px_rgba(0,0,0,0.12)] hover:shadow-[0_8px_28px_rgba(0,119,182,0.5),0_4px_12px_rgba(0,0,0,0.15)] hover:bg-primary/90 active:scale-[0.98] transition-all"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        whileTap={{ scale: 0.97 }}
      >
        <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-[16px]">download</span>
        </span>
        <span className="whitespace-nowrap">{label}</span>
      </motion.button>
    </div>
  );
}
