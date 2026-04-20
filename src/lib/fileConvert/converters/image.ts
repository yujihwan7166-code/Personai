// 이미지 포맷 변환 — Canvas API
// JPG ↔ PNG ↔ WEBP ↔ GIF(첫 프레임)

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

  const baseName = file.name.replace(/\.[^.]+$/, '');
  return { blob, suggestedName: `${baseName}${EXT_MAP[target]}` };
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
