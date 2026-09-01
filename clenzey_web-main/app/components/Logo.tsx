import Image from 'next/image';
import { LOGO_ALT, LOGO_SRC } from '../../lib/seo';

type LogoProps = {
  className?: string;
  height?: number;
  priority?: boolean;
};

export default function Logo({ className = '', height = 36, priority = false }: LogoProps) {
  const width = Math.round(height * 3.16);

  return (
    <Image
      src={LOGO_SRC}
      alt={LOGO_ALT}
      width={width}
      height={height}
      className={`w-auto object-contain object-left ${className}`}
      style={{ height }}
      priority={priority}
    />
  );
}
