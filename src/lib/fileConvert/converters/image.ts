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

// ───── 이미지 색상 효과 — 흑백·세피아·밝기·대비 ─────
export type ImageEffect = 'grayscale' | 'sepia' | 'invert' | 'brighten' | 'darken' | 'contrast-up';

export async function applyImageEffect(
  file: File,
  effect: ImageEffect,
): Promise<{ blob: Blob; suggestedName: string }> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context를 얻지 못했어요.');

  // CSS filter 활용 (createImageBitmap → drawImage with filter)
  switch (effect) {
    case 'grayscale':    ctx.filter = 'grayscale(1)'; break;
    case 'sepia':        ctx.filter = 'sepia(0.85) saturate(1.1)'; break;
    case 'invert':       ctx.filter = 'invert(1)'; break;
    case 'brighten':     ctx.filter = 'brightness(1.25)'; break;
    case 'darken':       ctx.filter = 'brightness(0.75)'; break;
    case 'contrast-up':  ctx.filter = 'contrast(1.3)'; break;
  }
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  ctx.filter = 'none';

  // 원본 포맷 유지 (효과는 PNG/JPG 모두 OK)
  const ext = file.name.toLowerCase().split('.').pop();
  const target: ImageOutputFormat = ext === 'png' ? 'png' : ext === 'webp' ? 'webp' : 'jpeg';
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('효과 적용 실패'))),
      MIME_MAP[target],
      0.92,
    );
  });
  return { blob, suggestedName: `${baseName(file.name)}-${effect}${EXT_MAP[target]}` };
}

// ───── 이미지 워터마크 (텍스트) ─────
export type WatermarkPos = 'center' | 'top-right' | 'bottom-right' | 'bottom-left' | 'tile';
export interface ImageWatermarkOptions {
  text: string;
  position?: WatermarkPos;
  opacity?: number;        // 0~1, 기본 0.3
  fontSizeRatio?: number;  // 이미지 짧은 변 대비 %, 기본 0.06 (6%)
  color?: string;          // CSS color, 기본 white
  shadowColor?: string;    // 가독성용 그림자, 기본 'rgba(0,0,0,0.5)'
}
export async function watermarkImage(
  file: File,
  opts: ImageWatermarkOptions,
): Promise<{ blob: Blob; suggestedName: string }> {
  const text = opts.text.trim();
  if (!text) throw new Error('워터마크 텍스트를 입력해주세요.');
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context를 얻지 못했어요.');
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const minSide = Math.min(canvas.width, canvas.height);
  const fontSize = Math.round(minSide * (opts.fontSizeRatio ?? 0.06));
  const padding = Math.round(fontSize * 0.6);
  ctx.font = `bold ${fontSize}px system-ui, -apple-system, "Noto Sans KR", sans-serif`;
  ctx.fillStyle = opts.color ?? '#ffffff';
  ctx.shadowColor = opts.shadowColor ?? 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = Math.round(fontSize * 0.2);
  ctx.globalAlpha = opts.opacity ?? 0.3;

  const position = opts.position ?? 'bottom-right';
  const metrics = ctx.measureText(text);
  const textW = metrics.width;
  const textH = fontSize;

  if (position === 'tile') {
    // 패턴 반복
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(-Math.PI / 6); // -30도
    const stepX = textW * 1.8;
    const stepY = fontSize * 4;
    const reach = Math.max(canvas.width, canvas.height) * 1.5;
    for (let y = -reach; y < reach; y += stepY) {
      for (let x = -reach; x < reach; x += stepX) {
        ctx.fillText(text, x, y);
      }
    }
    ctx.restore();
  } else {
    let x = padding;
    let y = padding + textH;
    switch (position) {
      case 'top-right':
        x = canvas.width - textW - padding;
        y = padding + textH;
        break;
      case 'bottom-right':
        x = canvas.width - textW - padding;
        y = canvas.height - padding;
        break;
      case 'bottom-left':
        x = padding;
        y = canvas.height - padding;
        break;
      case 'center':
        x = canvas.width / 2 - textW / 2;
        y = canvas.height / 2 + textH / 2;
        break;
    }
    ctx.fillText(text, x, y);
  }

  // 원본 포맷 유지
  const ext = file.name.toLowerCase().split('.').pop();
  const target: ImageOutputFormat = ext === 'png' ? 'png' : ext === 'webp' ? 'webp' : 'jpeg';
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('워터마크 적용 실패'))),
      MIME_MAP[target],
      0.92,
    );
  });
  return { blob, suggestedName: `${baseName(file.name)}-watermark${EXT_MAP[target]}` };
}

// ───── 일괄 처리 — 다중 이미지 → ZIP ─────
let jszipPromise: Promise<typeof import('jszip')> | null = null;
function loadJsZip() {
  if (!jszipPromise) jszipPromise = import('jszip');
  return jszipPromise;
}

export type BatchImageTask =
  | { kind: 'format'; target: ImageOutputFormat; quality?: number }
  | { kind: 'compress'; quality: number; target?: ImageOutputFormat }
  | { kind: 'resize'; opts: ResizeOptions }
  | { kind: 'heic-to-jpg'; quality?: number }
  | { kind: 'transform'; transform: ImageTransform };

export async function batchImageProcess(
  files: File[],
  task: BatchImageTask,
  onProgress?: (current: number, total: number, name: string) => void,
): Promise<{ blob: Blob; suggestedName: string }> {
  const { default: JSZip } = await loadJsZip();
  const zip = new JSZip();
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.(i + 1, files.length, file.name);
    let result: { blob: Blob; suggestedName: string };
    try {
      switch (task.kind) {
        case 'format':
          result = await convertImageFormat(file, task.target, task.quality);
          break;
        case 'compress':
          result = await compressImage(file, task.quality, task.target);
          break;
        case 'resize':
          result = await resizeImage(file, task.opts);
          break;
        case 'heic-to-jpg':
          result = await convertHeicToJpg(file, task.quality);
          break;
        case 'transform':
          result = await transformImage(file, task.transform);
          break;
      }
      const buf = await result.blob.arrayBuffer();
      zip.file(result.suggestedName, buf);
    } catch (err) {
      // 한 파일 실패해도 나머지 진행
      console.warn(`Batch image: ${file.name} 실패`, err);
    }
  }
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  return {
    blob,
    suggestedName: `images-${task.kind}-${files.length}.zip`,
  };
}
