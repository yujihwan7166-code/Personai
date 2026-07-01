/**
 * 브랜드/검색엔진 로고 렌더러 — SVG path / 텍스트 배지 / lucide 아이콘 셋 중 하나.
 * viewBox 은 항상 "0 0 24 24" (simple-icons 규격).
 */
import { Star, Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';

const LUCIDE_MAP = { Star, Bookmark } as const;
type LucideKey = keyof typeof LUCIDE_MAP;

interface Props {
  /** SVG 경로 (simple-icons 규격 viewBox 0 0 24 24). */
  path?: string;
  /** 텍스트 배지 (다음 = 'D' 등). */
  text?: string;
  /** lucide 아이콘 이름. */
  lucide?: LucideKey;
  /** fill 색 (with '#'). */
  fill: string;
  /** 픽셀 크기. */
  size?: number;
  className?: string;
  'aria-hidden'?: boolean;
}

export function BrandLogo({
  path,
  text,
  lucide,
  fill,
  size = 16,
  className,
  'aria-hidden': ariaHidden = true,
}: Props) {
  if (path) {
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        className={className}
        aria-hidden={ariaHidden}
      >
        <path d={path} fill={fill} />
      </svg>
    );
  }
  if (text) {
    return (
      <span
        className={cn('font-bold leading-none select-none', className)}
        style={{ color: fill, fontSize: size * 0.72 }}
        aria-hidden={ariaHidden}
      >
        {text}
      </span>
    );
  }
  if (lucide) {
    const Icon = LUCIDE_MAP[lucide];
    return (
      <Icon
        size={size}
        className={className}
        style={{ color: fill }}
        fill={lucide === 'Star' || lucide === 'Bookmark' ? fill : 'none'}
        aria-hidden={ariaHidden}
      />
    );
  }
  return null;
}
