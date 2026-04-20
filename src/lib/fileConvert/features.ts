// 브라우저 feature detection — 태스크별 가용성 판단·graceful degradation

export const canUseFileSystemAccess = (): boolean =>
  typeof window !== 'undefined' && 'showSaveFilePicker' in window;

export const canUseOffscreenCanvas = (): boolean =>
  typeof OffscreenCanvas !== 'undefined';

export const canEncodeWebP = (): boolean => {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    return canvas.toDataURL('image/webp').startsWith('data:image/webp');
  } catch {
    return false;
  }
};

export const isMobile = (): boolean =>
  typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

export const isIOS = (): boolean =>
  typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);

// 디바이스 메모리 추정 (모바일·저사양은 보수적 제한)
export function getMemoryBudgetMB(): number {
  if (typeof navigator !== 'undefined' && 'deviceMemory' in navigator) {
    const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 4;
    if (mem <= 2) return 200;
    if (mem <= 4) return 400;
    return 600;
  }
  return isMobile() ? 300 : 500;
}

export function estimateMemoryMB(args: {
  fileSize: number;
  pagesOrMultiplier?: number;
  resolutionMpx?: number;
}): number {
  const baseMB = args.fileSize / (1024 * 1024);
  const pages = args.pagesOrMultiplier ?? 1;
  // 기본: 파일 크기 × 3 (원본+버퍼+결과)
  let estimate = baseMB * 3 * pages;
  if (args.resolutionMpx) {
    // 픽셀당 4바이트(RGBA) — 2MP 이미지 한 장 = 8MB
    estimate += args.resolutionMpx * 4;
  }
  return estimate;
}

export type MemoryRisk = 'safe' | 'warn' | 'block';
export function evaluateMemoryRisk(estimatedMB: number): MemoryRisk {
  const budget = getMemoryBudgetMB();
  if (estimatedMB > budget) return 'block';
  if (estimatedMB > budget * 0.6) return 'warn';
  return 'safe';
}
