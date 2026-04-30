// QR 코드 생성 — 텍스트/URL → PNG
// 라이브러리: qrcode (lazy import)

let qrcodePromise: Promise<typeof import('qrcode')> | null = null;
function loadQrcode() {
  if (!qrcodePromise) qrcodePromise = import('qrcode');
  return qrcodePromise;
}

export interface QrCodeOptions {
  text: string;
  size?: number;          // px, 기본 512
  margin?: number;        // 모듈, 기본 4
  errorLevel?: 'L' | 'M' | 'Q' | 'H';
  darkColor?: string;     // 기본 #000000
  lightColor?: string;    // 기본 #ffffff
}

export async function generateQrCode(
  opts: QrCodeOptions,
): Promise<{ blob: Blob; suggestedName: string; previewText: string }> {
  if (!opts.text || opts.text.trim().length === 0) {
    throw new Error('QR 코드로 만들 텍스트나 URL을 입력해주세요.');
  }
  const QRCode = await loadQrcode();
  const canvas = document.createElement('canvas');
  await QRCode.toCanvas(canvas, opts.text, {
    width: opts.size ?? 512,
    margin: opts.margin ?? 4,
    errorCorrectionLevel: opts.errorLevel ?? 'M',
    color: {
      dark: opts.darkColor ?? '#000000',
      light: opts.lightColor ?? '#ffffff',
    },
  });
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('PNG 생성 실패'))),
      'image/png',
    );
  });
  // 파일명 — 텍스트 첫 단어 또는 'qr'
  const slug = opts.text
    .replace(/^https?:\/\//, '')
    .replace(/[^\w가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30) || 'qr';
  return {
    blob,
    suggestedName: `${slug}.png`,
    previewText: `QR 코드 — ${opts.text}`,
  };
}
