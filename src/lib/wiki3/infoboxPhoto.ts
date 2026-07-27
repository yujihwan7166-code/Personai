/**
 * 인포박스 사진 압축.
 *
 * 일기 사진(journalImage)은 1280px · 최대 600KB 로 굽는다. 그건 화면 가득 펼쳐
 * 보는 사진이라 맞는 값이고, 여기엔 너무 크다 — 인포박스 사진이 실제로 그려지는
 * 폭은 240px 남짓이다. 게다가 서재는 통째로 localStorage 한 칸(보통 5MB)에 들어가는데,
 * 600KB 짜리 여덟 장이면 책·문서가 들어갈 자리가 없다.
 *
 * 그래서 긴 변 560px(고해상도 화면에서 2배로 그려도 뭉개지지 않는 선) · 90KB 상한.
 * 넘치면 품질을 먼저 낮추고, 그래도 안 되면 크기를 줄인다 — 사진의 '무엇이 찍혔나'는
 * 크기가, '얼마나 선명한가'는 품질이 지키므로 품질을 먼저 내주는 편이 덜 아프다.
 */

const MAX_PX = 560;
const MAX_BYTES = 90 * 1024;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('이미지를 열 수 없어요'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('파일을 읽을 수 없어요'));
    reader.readAsDataURL(file);
  });
}

function draw(img: HTMLImageElement, scale: number, quality: number): string {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(img.naturalWidth * scale));
  c.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('캔버스를 쓸 수 없어요');
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', quality);
}

const bytesOf = (dataUrl: string): number => Math.floor(((dataUrl.split(',')[1] ?? '').length * 3) / 4);

/** 파일 → 인포박스에 넣을 Base64. 상한을 못 맞추면 예외. */
export async function compressInfoboxPhoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('이미지 파일만 넣을 수 있어요');
  const img = await loadImage(file);
  let scale = Math.min(1, MAX_PX / Math.max(img.naturalWidth, img.naturalHeight));

  for (const quality of [0.82, 0.7, 0.6]) {
    const out = draw(img, scale, quality);
    if (bytesOf(out) <= MAX_BYTES) return out;
  }
  // 품질을 다 내줬는데도 크면 그때 크기를 줄인다
  for (let i = 0; i < 3; i += 1) {
    scale *= 0.75;
    const out = draw(img, scale, 0.6);
    if (bytesOf(out) <= MAX_BYTES) return out;
  }
  throw new Error('사진이 너무 커요 — 더 작은 사진으로 넣어 주세요');
}
