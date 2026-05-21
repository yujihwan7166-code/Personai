import type { CSSProperties } from 'react';
import { resolveSlideBackground, type SlideTheme } from './themes';
import type { Slide } from './types';

function cssUrl(value: string): string {
  return `url("${value.replace(/"/g, '\\"')}")`;
}

export function slideBackgroundStyle(
  slide: Pick<Slide, 'background' | 'backgroundImage'> | undefined,
  theme: SlideTheme,
): CSSProperties {
  const backgroundColor = resolveSlideBackground(slide?.background, theme);
  if (!slide?.backgroundImage) return { background: backgroundColor };
  return {
    backgroundColor,
    backgroundImage: cssUrl(slide.backgroundImage),
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'cover',
  };
}
