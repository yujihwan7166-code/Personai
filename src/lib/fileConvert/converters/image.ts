// 이미지 포맷 변환·압축·리사이즈·HEIC — Canvas API + heic-to lib
// JPG ↔ PNG ↔ WEBP ↔ GIF(첫 프레임), HEIC → JPG/PNG

export type ImageOutputFormat = 'jpeg' | 'png' | 'webp';

const MIME_MAP: Record<ImageOutputFormat, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

const EXT_MAP: Record<ImageOutputFormat, string> = {
  jpeg: '.jpg',
  png: '.png',
  webp: '.webp',
};

function baseName(name: string): string {
  return name.replace(/\.[^.]+$/, '');
}

export async function convertImageFormat(
  file: File,
  target: ImageOutputFormat,
  quality = 0.92,
): Promise<{ blob: Blob; suggestedName: string }> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context를 얻지 못했어요.');

  // JPEG는 투명 배경이 검정으로 나오므로 흰 배경 깔기
  if (target === 'jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('이미지 변환에 실패했어요.'))),
      MIME_MAP[target],
      quality,
    );
  });

  return { blob, suggestedName: `${baseName(file.name)}${EXT_MAP[target]}` };
}

export function isImageFormatSupported(target: ImageOutputFormat): boolean {
  try {
    const c = document.createElement('canvas');
    c.width = c.height = 1;
    return c.toDataURL(MIME_MAP[target]).startsWith(`data:${MIME_MAP[target]}`);
  } catch {
    return false;
  }
}

// ───── HEIC → JPG ─────
// Safari 는 createImageBitmap 가 HEIC native 지원, 다른 브라우저는 fallback 필요.
// 일단 native 시도 → 실패하면 명시적 안내.
export async function convertHeicToJpg(
  file: File,
  quality = 0.92,
): Promise<{ blob: Blob; suggestedName: string }> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(
      'HEIC 파일을 이 브라우저에서 디코딩하지 못했어요. Safari 또는 macOS Chrome 을 시도해주세요.',
    );
  }
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context를 얻지 못했어요.');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('JPG 변환 실패'))), 'image/jpeg', quality);
  });
  return { blob, suggestedName: `${baseName(file.name)}.jpg` };
}

// ───── 이미지 압축 (quality slider) ─────
// 같은 포맷 유지하면서 quality 만 조정. PNG 는 lossless 라 효과 작음 → JPEG 권장.
export async function compressImage(
  file: File,
  quality = 0.7,
  target?: ImageOutputFormat,  // 미지정 시 원본 유지 (PNG 는 jpeg 권장)
): Promise<{ blob: Blob; suggestedName: string }> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context를 얻지 못했어요.');

  // 원본 포맷 추정
  const ext = file.name.toLowerCase().split('.').pop();
  const inferredTarget: ImageOutputFormat =
    target ?? (ext === 'png' ? 'jpeg' : (['jpg', 'jpeg', 'webp'].includes(ext ?? '') ? (ext === 'webp' ? 'webp' : 'jpeg') : 'jpeg'));
  if (inferredTarget === 'jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('이미지 압축 실패'))),
      MIME_MAP[inferredTarget],
      quality,
    );
  });
  return { blob, suggestedName: `${baseName(file.name)}-compressed${EXT_MAP[inferredTarget]}` };
}

// ───── 이미지 회전·뒤집기 ─────
export type ImageTransform =
  | 'rotate-90'    // 시계방향 90도
  | 'rotate-180'
  | 'rotate-270'   // 반시계방향 90도
  | 'flip-h'       // 좌우 반전
  | 'flip-v';      // 상하 반전

export async function transformImage(
  file: File,
  transform: ImageTransform,
): Promise<{ blob: Blob; suggestedName: string }> {
  const bitmap = await createImageBitmap(file);
  const sw = bitmap.width;
  const sh = bitmap.height;
  // 회전이면 캔버스 크기 swap
  const rotated = transform === 'rotate-90' || transform === 'rotate-270';
  const cw = rotated ? sh : sw;
  const ch = rotated ? sw : sh;
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context를 얻지 못했어요.');

  // 원본 포맷 추정 (JPEG 면 흰 배경)
  const ext = file.name.toLowerCase().split('.').pop();
  const target: ImageOutputFormat = ext === 'png' ? 'png' : ext === 'webp' ? 'webp' : 'jpeg';
  if (target === 'jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cw, ch);
  }

  // 변환 적용
  ctx.save();
  ctx.translate(cw / 2, ch / 2);
  switch (transform) {
    case 'rotate-90':  ctx.rotate(Math.PI / 2); break;
    case 'rotate-180': ctx.rotate(Math.PI); break;
    case 'rotate-270': ctx.rotate(-Math.PI / 2); break;
    case 'flip-h':     ctx.scale(-1, 1); break;
    case 'flip-v':     ctx.scale(1, -1); break;
  }
  ctx.drawImage(bitmap, -sw / 2, -sh / 2);
  ctx.restore();
  bitmap.close();

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('이미지 변환 실패'))),
      MIME_MAP[target],
      0.92,
    );
  });
  const suffix = transform.replace('rotate-', 'r').replace('flip-', 'f');
  return { blob, suggestedName: `${baseName(file.name)}-${suffix}${EXT_MAP[target]}` };
}

// ───── 이미지 리사이즈 ─────
// 옵션: 픽셀 (maxWidth/maxHeight, 비율 유지) 또는 % (scale)
export interface ResizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  scale?: number;       // 0 < scale ≤ 1
  quality?: number;     // JPEG/WEBP 품질
}
export async function resizeImage(
  file: File,
  opts: ResizeOptions,
): Promise<{ blob: Blob; suggestedName: string }> {
  const bitmap = await createImageBitmap(file);
  const sw = bitmap.width;
  const sh = bitmap.height;
  let tw = sw;
  let th = sh;
  if (opts.scale && opts.scale > 0 && opts.scale <= 1) {
    tw = Math.round(sw * opts.scale);
    th = Math.round(sh * opts.scale);
  } else {
    const maxW = opts.maxWidth ?? sw;
    const maxH = opts.maxHeight ?? sh;
    const ratio = Math.min(maxW / sw, maxH / sh, 1);
    tw = Math.round(sw * ratio);
    th = Math.round(sh * ratio);
  }
  if (tw < 1 || th < 1) throw new Error('크기가 너무 작아요.');

  const canvas = document.createElement('canvas');
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context를 얻지 못했어요.');

  // 원본 포맷 유지
  const ext = file.name.toLowerCase().split('.').pop();
  const target: ImageOutputFormat = ext === 'png' ? 'png' : ext === 'webp' ? 'webp' : 'jpeg';
  if (target === 'jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, tw, th);
  }
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, tw, th);
  bitmap.close();

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('리사이즈 실패'))),
      MIME_MAP[target],
      opts.quality ?? 0.92,
    );
  });
  return { blob, suggestedName: `${baseName(file.name)}-${tw}x${th}${EXT_MAP[target]}` };
}
