/**
 * 일기 사진 — 클라이언트 압축 + Base64 변환.
 *
 * v1: Base64 LocalStorage (인증 X, 백엔드 X). 사진 1-3장, 각 ~500KB 압축.
 * v2: Supabase Storage 마이그.
 *
 * 압축 전략:
 * - 캔버스로 리사이즈 (max 1280px)
 * - JPEG 품질 0.82
 * - 결과가 600KB 초과면 더 작게 재압축
 */

const MAX_DIMENSION = 1280;
const TARGET_QUALITY = 0.82;
const MAX_SIZE_BYTES = 600 * 1024;

const fileToImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const drawCanvas = (img: HTMLImageElement, scale: number, quality: number): string => {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
};

const dataUrlSize = (dataUrl: string): number => {
  // base64: 매 4 문자 = 3 바이트
  const head = 'data:image/jpeg;base64,';
  const body = dataUrl.startsWith(head) ? dataUrl.slice(head.length) : dataUrl;
  return Math.floor((body.length * 3) / 4);
};

export const compressImage = async (file: File): Promise<{ src: string; size: number }> => {
  const img = await fileToImage(file);
  const baseScale = Math.min(1, MAX_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight));

  let scale = baseScale;
  let quality = TARGET_QUALITY;
  let dataUrl = drawCanvas(img, scale, quality);
  let size = dataUrlSize(dataUrl);

  // 너무 크면 재압축 (최대 3회)
  for (let i = 0; i < 3 && size > MAX_SIZE_BYTES; i++) {
    quality = Math.max(0.5, quality - 0.15);
    scale = scale * 0.85;
    dataUrl = drawCanvas(img, scale, quality);
    size = dataUrlSize(dataUrl);
  }

  return { src: dataUrl, size };
};

export const newImageId = (): string =>
  `jrimg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
