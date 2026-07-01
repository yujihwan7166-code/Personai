/**
 * 브랜드/검색엔진 로고 렌더러 — SVG path / 텍스트 배지 / lucide 아이콘 셋 중 하나.
 * viewBox 은 항상 "0 0 24 24" (simple-icons 규격).
 */
import { Star, Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';

const LUCIDE_MAP = { Star, Bookmark } as const;
type LucideKey = keyof typeof LUCIDE_MAP;

interface Props {
  /** 실제 브랜드 로고 파일 경로 (/logos/*.svg|png). 지정 시 최우선. */
  imgUrl?: string;
  /** SVG 경로 (simple-icons 규격 viewBox 0 0 24 24). */
  path?: string;
  /** 텍스트 배지 (다음 = 'D' 등). */
  text?: string;
  /** lucide 아이콘 이름. */
  lucide?: LucideKey;
  /** fill 색 (with '#'). */
  fill: string;
  /**
   * imgUrl 사용 시 로고를 흰색으로 강제할지. true(기본) 이면
   * `filter: brightness(0) invert(1)` 로 원본 컬러 무시하고 흰색.
   * false 면 로고 원본 컬러 유지 (실제 브랜드색 그대로 렌더).
   */
  forceWhite?: boolean;
  /** 픽셀 크기. */
  size?: number;
  className?: string;
  'aria-hidden'?: boolean;
}

export function BrandLogo({
  imgUrl,
  path,
  text,
  lucide,
  fill,
  forceWhite = true,
  size = 16,
  className,
  'aria-hidden': ariaHidden = true,
}: Props) {
  // 실제 브랜드 로고 파일 (최우선) — 컬러 브랜드 배경 위 흰색 오버라이드는 filter 로.
  if (imgUrl) {
    return (
      <img
        src={imgUrl}
        alt=""
        width={size}
        height={size}
        className={className}
        aria-hidden={ariaHidden}
        draggable={false}
        style={{
          objectFit: 'contain',
          ...(forceWhite ? { filter: 'brightness(0) invert(1)' } : {}),
        }}
      />
    );
  }
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
