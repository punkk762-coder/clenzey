'use client';

import { useRef } from 'react';
import Image from 'next/image';
import Toaster, { type ToasterRef } from '@/components/ui/toast';

export default function PlatformBadges() {
  const toasterRef = useRef<ToasterRef>(null);

  const showToast = () => {
    toasterRef.current?.show({
      title: 'Launching soon!',
      message: "We'll notify you when we're live.",
      variant: 'default',
      position: 'bottom-right',
      duration: 3000,
    });
  };

  return (
    <>
      <Toaster ref={toasterRef} defaultPosition="bottom-right" />

      {/* Badges */}
      <div className="flex items-center gap-3 mt-4 animate-[fadeUp_0.65s_ease_0.26s_both]">
        {/* App Store */}
        <button
          onClick={showToast}
          className="bg-black rounded-xl py-2 px-4 select-none block transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.32)] cursor-pointer border-none"
        >
          <Image
            src="/icons/apple-app-store.svg"
            alt="Download on the App Store"
            unoptimized
            width={119}
            height={40}
            style={{ height: '40px', width: 'auto', display: 'block' }}
          />
        </button>
        {/* Google Play */}
        <button
          onClick={showToast}
          className="bg-black rounded-xl py-2.5 px-4 select-none block transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.32)] cursor-pointer border-none"
        >
          <Image
            src="/icons/google-play.svg"
            alt="Get it on Google Play"
            unoptimized
            width={115}
            height={34}
            style={{ height: '34px', width: 'auto', display: 'block' }}
          />
        </button>
      </div>
    </>
  );
}
