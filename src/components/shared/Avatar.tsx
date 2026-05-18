/**
 * Avatar — 프로필 사진 + initials fallback.
 *
 * src 없거나 onError 시 name 의 initials 표시.
 * 색은 name hash → tailwind class 자동 매핑.
 */

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
}

const COLORS = [
  'bg-rose-500', 'bg-orange-500', 'bg-amber-500',
  'bg-emerald-500', 'bg-cyan-500', 'bg-sky-500',
  'bg-indigo-500', 'bg-violet-500', 'bg-fuchsia-500', 'bg-pink-500',
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ src, name, size = 32, className }: Props) {
  const [errored, setErrored] = useState(false);
  const showImg = src && !errored;
  const color = COLORS[hash(name) % COLORS.length];
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center overflow-hidden rounded-full text-white font-medium select-none',
        !showImg && color,
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(10, size / 2.5) }}
      aria-label={name}
    >
      {showImg ? (
        <img
          src={src!}
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-cover"
          onError={() => setErrored(true)}
        />
      ) : (
        <span>{initials(name)}</span>
      )}
    </span>
  );
}
